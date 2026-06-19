import { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { getAuth } from "@clerk/express";
import { pool } from "../lib/db";
import { fireMetaCapi } from "./cards";
import { getPaymentMode } from "../lib/appConfig";

const router = Router();

const KEY_ID = process.env["RAZORPAY_KEY_ID"];
const KEY_SECRET = process.env["RAZORPAY_KEY_SECRET"];
const WEBHOOK_SECRET = process.env["RAZORPAY_WEBHOOK_SECRET"];

type Kind = "card" | "bundle" | "template" | "watermark";

interface OrderRow {
  order_id: string;
  kind: Kind;
  card_id: string | null;
  clerk_user_id: string | null;
  amount: number;
  status: string;
  event_id: string | null;
}

/** Razorpay client, or null when keys aren't configured yet. */
function getClient(): Razorpay | null {
  if (!KEY_ID || !KEY_SECRET) return null;
  return new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}

/**
 * Server-authoritative occasion → price (mirrors the frontend priceArm.ts
 * PRICE_BY_OCCASION map — keep the two in lockstep):
 * birthday, sorry & fathers_day → ₹99, everything else → ₹49.
 */
function occasionPrice(occasion: string | null | undefined): 49 | 99 {
  return occasion === "birthday" || occasion === "sorry" || occasion === "fathers_day" ? 99 : 49;
}

/**
 * Normalise a SERVER-STORED card price to a valid amount (or null).
 * ₹29 is included because it is only ever written server-side (the viral-reply
 * tier, minted via POST /api/cards/reply) — a stored 29 is trustworthy, so a
 * reply card is charged ₹29 here rather than being bumped to the occasion price.
 */
function normPrice(p: unknown): 29 | 49 | 99 | null {
  if (p === 29 || p === "29") return 29;
  if (p === 49 || p === "49") return 49;
  if (p === 99 || p === "99") return 99;
  return null;
}

/** Constant-time hex string compare (returns false on length mismatch). */
function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Verify the checkout signature: HMAC_SHA256(order_id|payment_id, secret). */
function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return timingSafeEqualHex(expected, signature);
}

/**
 * GET /api/payment-mode
 * Public, unauthenticated. The client calls this right before opening a paywall
 * to decide whether to render the manual UPI flow or Razorpay checkout.
 */
router.get("/payment-mode", async (_req, res) => {
  const mode = await getPaymentMode();
  // Razorpay only counts as "active" when keys are actually configured, so a
  // mis-flip can never strand users on a checkout that can't create orders.
  const razorpayReady = Boolean(KEY_ID && KEY_SECRET);
  res.json({ mode: mode === "razorpay" && razorpayReady ? "razorpay" : "upi" });
});

/**
 * Unlock a single card from a verified Razorpay payment. Mirrors the existing
 * /cards/:id/auto-unlock effect (card row + unlock submission + card_paid event
 * + Meta CAPI) so downstream lock/analytics/CAPI are unchanged. The unlock is
 * retry-safe (runs every call); the one-time analytics event + CAPI are gated by
 * `fireOnce` so the webhook and the client verify call can't double-fire.
 */
async function fulfillCardUnlock(
  cardId: string,
  amountRupees: number,
  paymentId: string,
  opts: { fbp?: string | null; fbc?: string | null; eventId?: string; clientIp?: string; userAgent?: string },
  fireOnce: boolean,
): Promise<void> {
  await pool.query(
    `UPDATE hs_received_payments SET used_at = NOW(), card_id = $2, unlock_method = 'razorpay'
     WHERE utr = $1 AND used_at IS NULL`,
    [paymentId, cardId],
  );

  await pool.query(
    `INSERT INTO hs_cards (id, is_watermarked, is_premium, fbp, fbc, price)
     VALUES ($1, FALSE, TRUE, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET is_watermarked = FALSE, is_premium = TRUE,
       fbp = COALESCE(EXCLUDED.fbp, hs_cards.fbp),
       fbc = COALESCE(EXCLUDED.fbc, hs_cards.fbc),
       price = COALESCE(EXCLUDED.price, hs_cards.price)`,
    [cardId, opts.fbp ?? null, opts.fbc ?? null, amountRupees],
  );

  // Bookkeeping submission row (idempotent on full_utr).
  await pool.query(
    `INSERT INTO hs_card_unlock_submissions (card_id, utr_last4, full_utr, unlock_method)
     SELECT $1, $2, $3, 'razorpay'
     WHERE NOT EXISTS (SELECT 1 FROM hs_card_unlock_submissions WHERE full_utr = $3)`,
    [cardId, paymentId.slice(-4), paymentId],
  );

  // Fire the CAPI Purchase on EVERY fulfillment path (webhook AND verify), not
  // only the first to claim the order. Meta deduplicates on the shared event_id,
  // so this is safe — and it fixes the race where Razorpay's webhook wins first
  // but carries NO fbp/fbc/ip/ua (it has none of the buyer's cookies), firing an
  // empty event that Meta rejects (2804050). That empty event is rejected (never
  // enters Meta's dedup pool), while the slightly-later /verify call DOES carry
  // fbp/fbc/ip/ua and now fires its own event with the same id — so the
  // data-rich event lands instead of being suppressed by the one-shot gate.
  const capiEventId = opts.eventId ?? `hs_${cardId}_${Date.now()}`;
  void fireMetaCapi(capiEventId, cardId, opts.clientIp ?? "", opts.userAgent ?? "", amountRupees);

  if (fireOnce) {
    // card_paid analytics is NOT event_id-deduped, so it stays one-shot to avoid
    // double-counting a single sale across the webhook + verify paths.
    const cardRow = await pool.query<{ occasion: string | null }>(
      `SELECT occasion FROM hs_cards WHERE id = $1`,
      [cardId],
    );
    await pool.query(
      `INSERT INTO hs_card_events (event, card_id, occasion, fingerprint, channel, price)
       VALUES ('card_paid', $1, $2, $3, 'razorpay', $4)`,
      [cardId, cardRow.rows[0]?.occasion ?? null, `srv_${cardId}`, amountRupees],
    );
    console.log(`[razorpay] card unlocked card=${cardId} payment=${paymentId}`);
  }
}

/** Create (or fetch existing) bundle from a verified payment. Returns the token. */
async function fulfillBundle(paymentId: string): Promise<string | null> {
  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO hs_card_bundles (utr, cards_remaining) VALUES ($1, 2)
     ON CONFLICT (utr) DO NOTHING RETURNING id`,
    [paymentId],
  );
  await pool.query(
    `UPDATE hs_received_payments SET used_at = NOW(), unlock_method = 'bundle_purchase'
     WHERE utr = $1 AND used_at IS NULL`,
    [paymentId],
  );
  if (inserted.rows[0]?.id) {
    console.log(`[razorpay] bundle created token=${inserted.rows[0].id} payment=${paymentId}`);
    return inserted.rows[0].id;
  }
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM hs_card_bundles WHERE utr = $1`,
    [paymentId],
  );
  return existing.rows[0]?.id ?? null;
}

/** Remove the watermark on a single card from a verified ₹29 payment. */
async function fulfillWatermark(clerkUserId: string | null, cardId: string, paymentId: string): Promise<void> {
  await pool.query(
    `INSERT INTO hs_watermark_payments (clerk_user_id, card_id, utr)
     VALUES ($1, $2, $3) ON CONFLICT (utr) DO NOTHING`,
    [clerkUserId, cardId, paymentId],
  );
  await pool.query(`UPDATE hs_cards SET is_watermarked = FALSE WHERE id = $1`, [cardId]);
  await pool.query(
    `UPDATE hs_received_payments SET used_at = NOW(), card_id = $2, unlock_method = 'razorpay_watermark'
     WHERE utr = $1 AND used_at IS NULL`,
    [paymentId, cardId],
  );
  console.log(`[razorpay] watermark removed card=${cardId} payment=${paymentId}`);
}

/** Unlock all 3 premium templates for a Clerk user from a verified payment. */
async function fulfillTemplate(clerkUserId: string, paymentId: string): Promise<void> {
  await pool.query(
    `INSERT INTO hs_clerk_users (clerk_user_id) VALUES ($1) ON CONFLICT (clerk_user_id) DO NOTHING`,
    [clerkUserId],
  );
  await pool.query(
    `INSERT INTO hs_template_unlock_payments (clerk_user_id, utr, plan)
     VALUES ($1, $2, 'bundle') ON CONFLICT (utr) DO NOTHING`,
    [clerkUserId, paymentId],
  );
  await pool.query(
    `UPDATE hs_clerk_users SET unlocked_templates = ARRAY(
       SELECT DISTINCT unnest(unlocked_templates || ARRAY['cosmic','crystal','vinyl']::text[])
     ) WHERE clerk_user_id = $1`,
    [clerkUserId],
  );
  console.log(`[razorpay] templates unlocked user=${clerkUserId} payment=${paymentId}`);
}

/**
 * Shared fulfillment for a verified order. Writes the confirmed
 * hs_received_payments row (idempotent), marks the order paid, then dispatches
 * to the kind-specific unlock. Used by both the client verify call and the
 * webhook backstop.
 */
async function fulfillOrder(
  order: OrderRow,
  paymentId: string,
  opts: { fbp?: string | null; fbc?: string | null; eventId?: string; clientIp?: string; userAgent?: string } = {},
): Promise<{ kind: Kind; cardId?: string | null; token?: string | null }> {
  // Confirmed payment row (idempotent).
  await pool.query(
    `INSERT INTO hs_received_payments (utr, amount, raw_sms) VALUES ($1, $2, $3)
     ON CONFLICT (utr) DO NOTHING`,
    [paymentId, String(order.amount), `razorpay ${order.kind}`],
  );

  // Atomically claim this order. Only the first caller (client verify OR the
  // webhook backstop) to flip status -> paid gets fireOnce=true; it alone runs
  // the non-idempotent one-time side effects (card_paid analytics event + Meta
  // CAPI). The kind-specific unlock below still runs on EVERY call — every path
  // is idempotent (ON CONFLICT / re-derivable) — so a retry after a partial
  // failure always completes the actual fulfillment instead of being skipped.
  const claim = await pool.query(
    `UPDATE hs_razorpay_orders SET status = 'paid', payment_id = $2
     WHERE order_id = $1 AND status <> 'paid'`,
    [order.order_id, paymentId],
  );
  const fireOnce = (claim.rowCount ?? 0) > 0;

  if (order.kind === "card" && order.card_id) {
    // Prefer the client-supplied eventId (verify path); fall back to the id
    // persisted at create-order (webhook path) so the server CAPI event shares
    // the browser Pixel's event id and Meta deduplicates instead of doubling.
    await fulfillCardUnlock(
      order.card_id,
      order.amount,
      paymentId,
      { ...opts, eventId: opts.eventId ?? order.event_id ?? undefined },
      fireOnce,
    );
    return { kind: "card", cardId: order.card_id };
  }
  if (order.kind === "bundle") {
    const token = await fulfillBundle(paymentId);
    return { kind: "bundle", token };
  }
  if (order.kind === "template" && order.clerk_user_id) {
    await fulfillTemplate(order.clerk_user_id, paymentId);
    return { kind: "template" };
  }
  if (order.kind === "watermark" && order.card_id) {
    await fulfillWatermark(order.clerk_user_id, order.card_id, paymentId);
    return { kind: "watermark", cardId: order.card_id };
  }
  return { kind: order.kind };
}

/**
 * POST /api/razorpay/create-order
 * Body: { kind: 'card' | 'bundle' | 'template' | 'watermark', cardId?, occasion? }
 * Amount is derived server-side (never trusted from the client). Returns the
 * order id, amount (paise), currency and the public key id for checkout.js.
 *
 * Gated on the active payment mode: only works while Razorpay is the live mode.
 * (Verify + webhook are intentionally NOT gated, so a payment that is already
 * in flight when the owner flips back to UPI can still be fulfilled.)
 */
router.post("/razorpay/create-order", async (req, res) => {
  const mode = await getPaymentMode();
  if (mode !== "razorpay") {
    res.status(409).json({ error: "razorpay_inactive", message: "Online checkout is not active right now." });
    return;
  }

  const client = getClient();
  if (!client || !KEY_ID) {
    res.status(503).json({ error: "payment_unavailable", message: "Payments are temporarily unavailable. Please try again shortly." });
    return;
  }

  const { kind, cardId, occasion, fbp: bodyFbp, fbc: bodyFbc, eventId: bodyEventId } = (req.body ?? {}) as {
    kind?: unknown;
    cardId?: unknown;
    occasion?: unknown;
    fbp?: unknown;
    fbc?: unknown;
    eventId?: unknown;
  };

  // Meta CAPI match cookies. The webhook backstop is server-to-server (no
  // browser cookies) and often wins the fireOnce race, so it would fire the
  // Purchase event before the client's /verify call writes fbp/fbc — yielding
  // empty user_data that Meta rejects (subcode 2804050). Persisting these onto
  // the card NOW (the browser has them at order-creation) guarantees the event
  // is well-matched whichever path fulfils it. Prefer the explicit body values,
  // falling back to the first-party _fbp/_fbc cookies (covers stale clients).
  const cookieHeader = String(req.headers["cookie"] ?? "");
  const readCookie = (name: string): string | null => {
    const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    if (!m?.[1]) return null;
    // Malformed percent-encoding in an attacker-controlled header must never
    // throw and fail the request — fall back to the raw value.
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  };
  const fbp = typeof bodyFbp === "string" && bodyFbp ? bodyFbp : readCookie("_fbp");
  const fbc = typeof bodyFbc === "string" && bodyFbc ? bodyFbc : readCookie("_fbc");

  // The browser generates the Pixel event id BEFORE create-order and fires its
  // Purchase Pixel with it. Persisting it on the order lets the server CAPI
  // (webhook OR verify) reuse the SAME id, so Meta deduplicates browser+server
  // instead of double-counting when the webhook wins the fulfillment race.
  const orderEventId =
    typeof bodyEventId === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(bodyEventId) ? bodyEventId : null;

  let amountRupees: number;
  let resolvedCardId: string | null = null;
  let clerkUserId: string | null = null;

  try {
    if (kind === "card") {
      if (typeof cardId !== "string" || !/^[a-z0-9]{4,20}$/.test(cardId)) {
        res.status(400).json({ error: "validation_error", message: "Missing card reference." });
        return;
      }
      resolvedCardId = cardId;
      const stored = await pool.query<{ price: number | null; occasion: string | null }>(
        `SELECT price, occasion FROM hs_cards WHERE id = $1`,
        [cardId],
      );
      const storedPrice = normPrice(stored.rows[0]?.price);
      const occ = stored.rows[0]?.occasion ?? (typeof occasion === "string" ? occasion : null);
      amountRupees = storedPrice ?? occasionPrice(occ);
      // Stamp the CAPI cookies onto the card up-front (COALESCE keeps any
      // existing values) so the webhook backstop can match the Purchase event.
      if (fbp || fbc) {
        await pool.query(
          `UPDATE hs_cards SET fbp = COALESCE($2, fbp), fbc = COALESCE($3, fbc) WHERE id = $1`,
          [cardId, fbp, fbc],
        );
      }
    } else if (kind === "watermark") {
      if (typeof cardId !== "string" || !/^[a-z0-9]{4,20}$/.test(cardId)) {
        res.status(400).json({ error: "validation_error", message: "Missing card reference." });
        return;
      }
      const auth = getAuth(req);
      if (!auth?.userId) {
        res.status(401).json({ error: "unauthorized", message: "Sign in to remove the watermark." });
        return;
      }
      clerkUserId = auth.userId;
      resolvedCardId = cardId;
      amountRupees = 29;
    } else if (kind === "bundle") {
      amountRupees = 49;
    } else if (kind === "template") {
      const auth = getAuth(req);
      if (!auth?.userId) {
        res.status(401).json({ error: "unauthorized", message: "Sign in to unlock premium templates." });
        return;
      }
      clerkUserId = auth.userId;
      amountRupees = 49;
    } else {
      res.status(400).json({ error: "validation_error", message: "Invalid request." });
      return;
    }

    const order = await client.orders.create({
      amount: amountRupees * 100,
      currency: "INR",
      receipt: `hs_${String(kind)}_${Date.now()}`,
      notes: { kind: String(kind), ...(resolvedCardId ? { card_id: resolvedCardId } : {}) },
    });

    await pool.query(
      `INSERT INTO hs_razorpay_orders (order_id, kind, card_id, clerk_user_id, amount, status, event_id)
       VALUES ($1, $2, $3, $4, $5, 'created', $6)
       ON CONFLICT (order_id) DO NOTHING`,
      [order.id, kind, resolvedCardId, clerkUserId, amountRupees, orderEventId],
    );

    res.json({ orderId: order.id, amount: amountRupees * 100, currency: "INR", keyId: KEY_ID });
  } catch (err) {
    console.error("[razorpay] create-order error", err);
    res.status(500).json({ error: "internal_error", message: "Something went wrong. Please try again." });
  }
});

/**
 * POST /api/razorpay/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId?, fbp?, fbc? }
 * Verifies the signature, then fulfils the stored order. Returns kind-specific
 * result (cardId / bundle token) so the client can route the user onward.
 * Not mode-gated: an in-flight payment must always be fulfillable.
 */
router.post("/razorpay/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId, fbp, fbc } = (req.body ?? {}) as {
    razorpay_order_id?: unknown;
    razorpay_payment_id?: unknown;
    razorpay_signature?: unknown;
    eventId?: string;
    fbp?: string | null;
    fbc?: string | null;
  };

  if (
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string"
  ) {
    res.status(400).json({ error: "validation_error", message: "Invalid payment response." });
    return;
  }

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    res.status(400).json({ error: "signature_invalid", message: "Payment could not be verified." });
    return;
  }

  try {
    const orderRow = await pool.query<OrderRow>(
      `SELECT order_id, kind, card_id, clerk_user_id, amount, status, event_id
       FROM hs_razorpay_orders WHERE order_id = $1`,
      [razorpay_order_id],
    );
    const order = orderRow.rows[0];
    if (!order) {
      res.status(404).json({ error: "order_not_found", message: "Order not found." });
      return;
    }

    // For template orders, fall back to the live auth context if the order row
    // somehow has no stored user (defensive — create-order always stores it).
    if (order.kind === "template" && !order.clerk_user_id) {
      order.clerk_user_id = getAuth(req)?.userId ?? null;
      if (!order.clerk_user_id) {
        res.status(401).json({ error: "unauthorized", message: "Sign in to unlock premium templates." });
        return;
      }
    }

    const clientIp = ((req.headers["x-forwarded-for"] as string) ?? req.socket.remoteAddress ?? "")
      .split(",")[0]!
      .trim();
    const userAgent = String(req.headers["user-agent"] ?? "");

    const result = await fulfillOrder(order, razorpay_payment_id, {
      fbp: fbp ?? null,
      fbc: fbc ?? null,
      eventId,
      clientIp,
      userAgent,
    });

    res.json({
      ok: true,
      ...result,
      ...(result.kind === "template" ? { unlocked_templates: ["cosmic", "crystal", "vinyl"] } : {}),
    });
  } catch (err) {
    console.error("[razorpay] verify error", err);
    res.status(500).json({ error: "internal_error", message: "Something went wrong. Please try again." });
  }
});

/**
 * POST /api/razorpay/webhook
 * Server-to-server backstop. Verifies the webhook HMAC against the raw body
 * (captured in app.ts) and calls fulfillOrder (the sole idempotency authority).
 * Always returns 200 on handled errors so Razorpay doesn't enter a retry storm.
 */
router.post("/razorpay/webhook", async (req, res) => {
  if (!WEBHOOK_SECRET) {
    console.warn("[razorpay] webhook received but RAZORPAY_WEBHOOK_SECRET is not set — skipping");
    res.status(200).json({ ok: true });
    return;
  }

  const signature = req.headers["x-razorpay-signature"];
  const raw = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));

  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
  if (typeof signature !== "string" || !timingSafeEqualHex(expected, signature)) {
    res.status(400).json({ error: "invalid_signature" });
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    res.status(400).json({ error: "bad_json" });
    return;
  }

  try {
    const event = (payload as { event?: string })?.event;
    const entity = (payload as { payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } } })
      ?.payload?.payment?.entity;
    const paymentId = entity?.id;
    const orderId = entity?.order_id;
    // Only fulfil on an actually-successful (captured) payment. A signed but
    // non-success event (payment.failed / payment.authorized) must never unlock.
    const isCaptured = event === "payment.captured" || entity?.status === "captured";

    if (paymentId && orderId && isCaptured) {
      const orderRow = await pool.query<OrderRow>(
        `SELECT order_id, kind, card_id, clerk_user_id, amount, status, event_id
         FROM hs_razorpay_orders WHERE order_id = $1`,
        [orderId],
      );
      const order = orderRow.rows[0];
      if (order) {
        await fulfillOrder(order, paymentId);
        console.log(`[razorpay] webhook processed order=${orderId} payment=${paymentId}`);
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[razorpay] webhook error", err);
    res.status(200).json({ ok: true });
  }
});

export default router;
