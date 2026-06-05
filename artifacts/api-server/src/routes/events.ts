import { Router, type Request, type Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { pool } from "../lib/db";

const router = Router();

const SUPERUSER_EMAILS = ["jainitisha93@gmail.com", "itisha.a.jain.93@gmail.com"];

/**
 * Recipient names to exclude from analytics entirely. Matched case-insensitively
 * on a *whole-word* basis using Postgres regex word boundaries (`\y…\y`).
 * That means "Itisha", "ITISHA 🌸", and "itisha jain" all match, but innocent
 * names that merely contain these letters ("Nitisha", "Pratisha") do NOT.
 *
 * Two layers of defence:
 *  1. POST /events/card silently drops new inserts that match.
 *  2. GET /events/analytics filters them out of every aggregate query.
 *
 * On first analytics request after server start, any pre-existing matching
 * rows are also DELETEd from the database (one-shot, idempotent).
 */
const EXCLUDED_RECIPIENT_NAMES = ["itisha"] as const;
/** Postgres regex patterns ( ~* operator, case-insensitive, word-bounded). */
const EXCLUDED_RECIPIENT_PATTERNS = EXCLUDED_RECIPIENT_NAMES.map((n) => `\\y${n}\\y`);
/** Equivalent JS regex for the insert-time guard. */
const EXCLUDED_RECIPIENT_REGEX = new RegExp(
  `\\b(?:${EXCLUDED_RECIPIENT_NAMES.join("|")})\\b`,
  "i",
);

function isExcludedRecipient(name: unknown): boolean {
  if (typeof name !== "string") return false;
  return EXCLUDED_RECIPIENT_REGEX.test(name);
}

/**
 * The site owner (Itisha Jain) makes test payments from her own UPI, which
 * pollute every analytics metric. Identify those payments by the payer name or
 * her UPI VPA as they appear in the raw bank SMS/email (`hs_received_payments.raw_sms`).
 *
 * CRITICAL: match her full name or VPA only — never a bare surname like "Jain",
 * because real paying customers (e.g. "Somya Jain", VPA 800573821) must NOT be
 * excluded. These are Postgres `~*` (case-insensitive regex) patterns.
 *
 * Two layers of defence:
 *  1. ensureExcludedPayersPurged() deletes her existing payments + the cards
 *     they unlocked + every event on those cards (one-shot per server start).
 *  2. buildEventFilter() drops events whose card_id ties to one of her payments
 *     from every analytics aggregate.
 *
 * Limitation: the newest payment emails are stored as a redirect URL with no
 * readable payer name/VPA, so name/VPA matching only covers plaintext records.
 */
const EXCLUDED_PAYER_PATTERNS: string[] = [
  "Sender:\\s*ITISHA JAIN",
  "VPA:\\s*8905158970",
];

/**
 * The owner's newest test payments arrive as opaque redirect-URL emails with no
 * readable payer name/VPA, so EXCLUDED_PAYER_PATTERNS can never match them. The
 * only stable handle on those is the exact UPI reference number (UTR). List the
 * owner's own test-payment UTRs here to drop them from BOTH sales and analytics.
 *
 * Each value MUST be digits only — they are validated and then inlined directly
 * into SQL (no bind params), which is safe precisely because they are trusted,
 * hardcoded, digit-only constants. Never put user-supplied input here.
 */
const EXCLUDED_PAYMENT_UTRS: string[] = [
  "207656468448", // ₹99 owner test payment, 4 Jun 2026 (opaque redirect-URL email)
  "307422714787", // ₹49 owner test payment, 5 Jun 2026 (opaque redirect-URL email)
  "207706692345", // ₹99 owner test payment, 5 Jun 2026 (opaque redirect-URL email)
  "307430706481", // ₹49 owner test payment, 5 Jun 2026 (opaque redirect-URL email)
  "900000000001", // owner manual share-unlock for card cqkb3gc1, 5 Jun 2026 (no real payment)
];
// Fail loudly on a malformed (non-digit) entry instead of silently dropping it,
// which would otherwise let an owner test payment leak back into the stats.
const _badUtr = EXCLUDED_PAYMENT_UTRS.find((u) => !/^\d+$/.test(u));
if (_badUtr !== undefined) {
  throw new Error(
    `EXCLUDED_PAYMENT_UTRS entries must be digits only; got ${JSON.stringify(_badUtr)}`,
  );
}
/** Quoted, comma-joined for inlining: e.g. `'123','456'` (or "" if none). */
const EXCLUDED_UTR_SQL_LIST = EXCLUDED_PAYMENT_UTRS
  .map((u) => `'${u}'`)
  .join(",");

/**
 * Price A/B experiment start — the moment arm tagging (₹49/₹99) first began
 * persisting onto BOTH card_created and card_paid events in production. The
 * A/B panel counts only events from this point so created, paid, and the
 * conversion rate share one consistent epoch. Earlier conversions were never
 * tagged (the arm lived only in the browser), so including them would mix a
 * tagged numerator with an untagged baseline. Stored as a fixed UTC instant
 * (2026-06-04 20:18 IST = 14:48 UTC).
 */
const AB_EXPERIMENT_START = "2026-06-04T14:48:00Z";

/**
 * Builds the shared WHERE-fragment + ordered parameter list for every
 * analytics aggregate query. Combines:
 *   - superuser email exclusion
 *   - excluded-recipient-name exclusion
 *   - optional date range (from/to inclusive of full days)
 *
 * Returns a fragment without a leading "WHERE" so callers can splice it
 * into more complex queries (with extra ANDs).
 */
function buildEventFilter(opts: { from?: string | null; to?: string | null } = {}): {
  whereSql: string;
  params: string[];
} {
  const params: string[] = [];
  const conds: string[] = [];

  const emailStart = params.length + 1;
  params.push(...SUPERUSER_EMAILS);
  conds.push(
    `(email IS NULL OR email NOT IN (${SUPERUSER_EMAILS.map((_, i) => `$${emailStart + i}`).join(",")}))`,
  );

  const recipStart = params.length + 1;
  params.push(...EXCLUDED_RECIPIENT_PATTERNS);
  // ~* is the case-insensitive regex match. The patterns use Postgres
  // word-boundary anchors (`\y`) so "Itisha" matches but "Nitisha" does not.
  conds.push(
    `(recipient_name IS NULL OR ${EXCLUDED_RECIPIENT_PATTERNS.map(
      (_, i) => `recipient_name !~* $${recipStart + i}`,
    ).join(" AND ")})`,
  );

  // Exclude events on cards that were unlocked by an excluded payer's (Itisha's)
  // test payment. The subquery guards against NULL card_id so NOT IN is safe.
  if (EXCLUDED_PAYER_PATTERNS.length > 0 || EXCLUDED_UTR_SQL_LIST) {
    const payerStart = params.length + 1;
    params.push(...EXCLUDED_PAYER_PATTERNS);
    const matchParts: string[] = [];
    if (EXCLUDED_PAYER_PATTERNS.length > 0) {
      matchParts.push(
        EXCLUDED_PAYER_PATTERNS.map((_, i) => `raw_sms ~* $${payerStart + i}`).join(" OR "),
      );
    }
    if (EXCLUDED_UTR_SQL_LIST) matchParts.push(`utr IN (${EXCLUDED_UTR_SQL_LIST})`);
    conds.push(
      `(card_id IS NULL OR card_id NOT IN (
         SELECT card_id FROM hs_received_payments
         WHERE card_id IS NOT NULL AND (${matchParts.join(" OR ")})
       ))`,
    );
  }

  if (opts.from) {
    params.push(opts.from);
    // Compare in IST (UTC+5:30) so "Today" aligns with Indian midnight, not UTC midnight.
    conds.push(`(created_at AT TIME ZONE 'Asia/Kolkata')::date >= $${params.length}::date`);
  }
  if (opts.to) {
    params.push(opts.to);
    // Inclusive end-of-day in IST.
    conds.push(`(created_at AT TIME ZONE 'Asia/Kolkata')::date < ($${params.length}::date + INTERVAL '1 day')`);
  }

  return { whereSql: conds.join(" AND "), params };
}

/**
 * Verifies the request is from a signed-in Clerk user whose primary email
 * is on the SUPERUSER_EMAILS allowlist. Replaces the previous ADMIN_SECRET
 * shared-key scheme so no admin credential ever ships in the client bundle.
 *
 * Returns true on success; otherwise responds with 401/403 and returns false.
 */
async function requireSuperuser(req: Request, res: Response): Promise<boolean> {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  try {
    const user = await clerkClient.users.getUser(userId);
    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses?.[0]?.emailAddress ??
      null;
    if (!email || !SUPERUSER_EMAILS.includes(email)) {
      res.status(403).json({ error: "forbidden" });
      return false;
    }
    return true;
  } catch (err) {
    console.error("[events] requireSuperuser failed", err);
    res.status(500).json({ error: "auth_lookup_failed" });
    return false;
  }
}

const ENSURE_TABLE = `
  CREATE TABLE IF NOT EXISTS hs_card_events (
    id           SERIAL PRIMARY KEY,
    event        TEXT NOT NULL,
    fingerprint  TEXT,
    clerk_user_id TEXT,
    email        TEXT,
    occasion     TEXT,
    template     TEXT,
    channel      TEXT,
    has_likes    BOOLEAN,
    used_custom_msg BOOLEAN,
    is_free      BOOLEAN,
    from_card_ref BOOLEAN,
    created_at   TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS hs_card_events_event   ON hs_card_events(event);
  CREATE INDEX IF NOT EXISTS hs_card_events_email   ON hs_card_events(email);
  CREATE INDEX IF NOT EXISTS hs_card_events_created ON hs_card_events(created_at);
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS recipient_name TEXT;
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS card_id TEXT;
  CREATE INDEX IF NOT EXISTS hs_card_events_card_id ON hs_card_events(card_id);
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS utm_source TEXT;
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS utm_medium TEXT;
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
  CREATE INDEX IF NOT EXISTS hs_card_events_utm_source ON hs_card_events(utm_source);
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS has_voice_note BOOLEAN;
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS photo_count SMALLINT;
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS price SMALLINT;
  CREATE INDEX IF NOT EXISTS hs_card_events_price ON hs_card_events(price);
`;

const ENSURE_VITALS_TABLE = `
  CREATE TABLE IF NOT EXISTS hs_web_vitals (
    id              SERIAL PRIMARY KEY,
    metric_name     TEXT NOT NULL,
    value_ms        DOUBLE PRECISION NOT NULL,
    page_path       TEXT,
    fingerprint     TEXT,
    connection_type TEXT,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS hs_web_vitals_metric  ON hs_web_vitals(metric_name);
  CREATE INDEX IF NOT EXISTS hs_web_vitals_created ON hs_web_vitals(created_at);
  CREATE INDEX IF NOT EXISTS hs_web_vitals_path    ON hs_web_vitals(page_path);
`;

const VITAL_NAMES = new Set(["LCP", "FCP", "TTFB", "INP", "CLS"]);

/**
 * Run ENSURE_TABLE / ENSURE_VITALS_TABLE *once* per process. The original
 * code ran the full DDL block on every event POST, and those `ALTER TABLE
 * … ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` statements
 * each take an ACCESS EXCLUSIVE lock. Concurrent requests (e.g. a user
 * tapping the template picker quickly) would race on those locks and
 * occasionally deadlock. Memoising the promise eliminates the race and
 * also removes a lot of redundant catalog work from the hot path.
 */
let _eventsTableReady: Promise<void> | null = null;
function ensureEventsTable(): Promise<void> {
  if (!_eventsTableReady) {
    _eventsTableReady = pool.query(ENSURE_TABLE).then(() => undefined).catch((err) => {
      _eventsTableReady = null; // allow retry on next call if it failed
      throw err;
    });
  }
  return _eventsTableReady;
}

let _vitalsTableReady: Promise<void> | null = null;
function ensureVitalsTable(): Promise<void> {
  if (!_vitalsTableReady) {
    _vitalsTableReady = pool.query(ENSURE_VITALS_TABLE).then(() => undefined).catch((err) => {
      _vitalsTableReady = null;
      throw err;
    });
  }
  return _vitalsTableReady;
}

/** Trim long UA strings to a short summary (browser + os only). */
function summarizeUA(ua: string | undefined): string | null {
  if (!ua) return null;
  return ua.slice(0, 240);
}

/** Heuristic bot detection from the User-Agent header. Keeps Web Vitals
 *  data clean — synthetic crawlers shouldn't pollute P50/P75/P90. */
const BOT_UA_RE = /bot|crawler|spider|crawling|headless|lighthouse|pingdom|preview|monitor|googlebot|bingbot|yandex|duckduck|baiduspider|facebookexternalhit|slackbot|discordbot|twitterbot|linkedinbot|whatsapp|telegram/i;
function isBotUA(ua: string | undefined): boolean {
  return !!ua && BOT_UA_RE.test(ua);
}

/**
 * Validates a YYYY-MM-DD date string from a query parameter. Returns the
 * canonical string on success or null if missing/invalid. Strict validation
 * prevents SQL date-cast errors and accidental wide-open ranges.
 */
function parseDateParam(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(trimmed + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return trimmed;
}

/**
 * One-shot purge of pre-existing rows whose recipient_name matches an
 * excluded pattern. Memoised per process so it only runs once per server
 * start, which is enough — the POST /events/card handler now silently
 * drops new matches, so this just cleans up legacy data.
 */
let _purgedExcludedRecipients = false;
async function ensureExcludedRecipientsPurged(): Promise<void> {
  if (_purgedExcludedRecipients) return;
  if (EXCLUDED_RECIPIENT_PATTERNS.length === 0) {
    _purgedExcludedRecipients = true;
    return;
  }
  try {
    const orClause = EXCLUDED_RECIPIENT_PATTERNS.map(
      (_, i) => `recipient_name ~* $${i + 1}`,
    ).join(" OR ");
    const result = await pool.query(
      `DELETE FROM hs_card_events
       WHERE recipient_name IS NOT NULL AND (${orClause})`,
      EXCLUDED_RECIPIENT_PATTERNS,
    );
    if ((result.rowCount ?? 0) > 0) {
      console.log(
        `[events] purged ${result.rowCount} excluded-recipient rows from hs_card_events`,
      );
    }
    _purgedExcludedRecipients = true;
  } catch (err) {
    console.error("[events] failed to purge excluded recipients", err);
  }
}

/**
 * One-shot purge of the site owner's (Itisha's) test payments and everything
 * derived from them: the cards her payments unlocked, every event on those
 * cards, and the payment rows themselves. Memoised per process; idempotent
 * (re-running matches nothing once the rows are gone). Wrapped in a transaction
 * so a partial failure leaves the data consistent.
 */
let _purgedExcludedPayers = false;
async function ensureExcludedPayersPurged(): Promise<void> {
  if (_purgedExcludedPayers) return;
  if (EXCLUDED_PAYER_PATTERNS.length === 0) {
    _purgedExcludedPayers = true;
    return;
  }
  const orClause = EXCLUDED_PAYER_PATTERNS.map(
    (_, i) => `raw_sms ~* $${i + 1}`,
  ).join(" OR ");
  // card_ids of cards unlocked by her test payments. Evaluated before the
  // payments are deleted (payments are removed last).
  const cardSel = `SELECT card_id FROM hs_received_payments
                   WHERE card_id IS NOT NULL AND (${orClause})`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const evDel = await client.query(
      `DELETE FROM hs_card_events WHERE card_id IN (${cardSel})`,
      [...EXCLUDED_PAYER_PATTERNS],
    );
    const cardDel = await client.query(
      `DELETE FROM hs_cards WHERE id IN (${cardSel})`,
      [...EXCLUDED_PAYER_PATTERNS],
    );
    const payDel = await client.query(
      `DELETE FROM hs_received_payments WHERE ${orClause}`,
      [...EXCLUDED_PAYER_PATTERNS],
    );
    await client.query("COMMIT");
    const total =
      (evDel.rowCount ?? 0) + (cardDel.rowCount ?? 0) + (payDel.rowCount ?? 0);
    if (total > 0) {
      console.log(
        `[events] purged Itisha test data — events:${evDel.rowCount} cards:${cardDel.rowCount} payments:${payDel.rowCount}`,
      );
    }
    _purgedExcludedPayers = true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[events] failed to purge excluded payers", err);
  } finally {
    client.release();
  }
}

/** Returns true when the request originates from a dev/staging domain. */
function isDevRequest(req: Request): boolean {
  const origin = req.get("origin") ?? req.get("referer") ?? "";
  return origin.includes(".replit.dev") || origin.includes("janeway.replit.dev") ||
    origin.includes("localhost") || origin.includes("127.0.0.1");
}

/**
 * POST /api/events/card
 * Records a card analytics event. Superuser emails and excluded recipient
 * names are silently dropped so they never enter the analytics dataset.
 */
router.post("/events/card", async (req, res) => {
  try {
    // Silently drop events from dev / staging environments.
    if (isDevRequest(req)) {
      return res.json({ ok: true, dropped: true });
    }

    await ensureEventsTable();

    const {
      event, fingerprint, clerk_user_id, email,
      occasion, template, channel,
      has_likes, used_custom_msg, is_free, from_card_ref,
      recipient_name, card_id, has_photo, has_voice_note, photo_count,
      utm_source, utm_medium, utm_campaign, price,
    } = req.body as Record<string, unknown>;

    if (!event || typeof event !== "string") {
      return res.status(400).json({ error: "event required" });
    }

    // Price A/B arm — only ever 49 or 99; anything else stored as NULL.
    const priceVal =
      price === 49 || price === "49" ? 49 :
      price === 99 || price === "99" ? 99 : null;

    // Silently drop events from superuser
    if (typeof email === "string" && SUPERUSER_EMAILS.includes(email)) {
      return res.json({ ok: true, dropped: true });
    }

    // Silently drop events whose recipient name matches an excluded pattern
    // (e.g. cards addressed to "Itisha"). Keeps analytics free of self-tests.
    if (isExcludedRecipient(recipient_name)) {
      return res.json({ ok: true, dropped: true });
    }

    /** Cap free-form UTM strings to keep cardinality bounded. */
    const capUtm = (v: unknown, max: number): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t ? t.slice(0, max) : null;
    };

    await pool.query(
      `INSERT INTO hs_card_events
         (event, fingerprint, clerk_user_id, email, occasion, template,
          channel, has_likes, used_custom_msg, is_free, from_card_ref, recipient_name, card_id,
          has_photo, has_voice_note, photo_count, utm_source, utm_medium, utm_campaign, price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        event,
        fingerprint ?? null,
        clerk_user_id ?? null,
        email ?? null,
        occasion ?? null,
        template ?? null,
        channel ?? null,
        has_likes ?? null,
        used_custom_msg ?? null,
        is_free ?? null,
        from_card_ref ?? null,
        recipient_name ?? null,
        card_id ?? null,
        has_photo ?? null,
        has_voice_note ?? null,
        typeof photo_count === "number" ? photo_count : null,
        capUtm(utm_source, 60),
        capUtm(utm_medium, 60),
        capUtm(utm_campaign, 80),
        priceVal,
      ],
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("[events/card]", err);
    return res.status(500).json({ error: "internal" });
  }
});

/**
 * POST /api/events/vitals
 * Records a Web Vitals metric (LCP, FCP, TTFB, INP, CLS) from a real user session.
 */
router.post("/events/vitals", async (req, res) => {
  try {
    // Drop bot/crawler/synthetic-monitor traffic so it can't pollute percentiles.
    if (isBotUA(req.get("user-agent") ?? undefined)) {
      return res.json({ ok: true, dropped: true });
    }

    await ensureVitalsTable();

    const body = req.body as Record<string, unknown>;
    const metric_name = typeof body["metric_name"] === "string" ? body["metric_name"] : "";
    const value_msRaw = body["value_ms"];
    const value_ms = typeof value_msRaw === "number" ? value_msRaw : Number(value_msRaw);

    if (!VITAL_NAMES.has(metric_name)) {
      return res.status(400).json({ error: "unknown metric_name" });
    }
    // CLS is unitless and tiny (typically 0–1). Other metrics are ms (cap at 10 min).
    const upperBound = metric_name === "CLS" ? 100 : 600000;
    if (!Number.isFinite(value_ms) || value_ms < 0 || value_ms > upperBound) {
      return res.status(400).json({ error: "invalid value_ms" });
    }

    // Drop superuser submissions silently (caller may include email)
    const emailRaw = body["email"];
    if (typeof emailRaw === "string" && SUPERUSER_EMAILS.includes(emailRaw)) {
      return res.json({ ok: true, dropped: true });
    }

    // Cap free-form text inputs to keep cardinality and storage bounded
    const fingerprint = typeof body["fingerprint"] === "string" ? body["fingerprint"].slice(0, 80) : null;
    const page_path = typeof body["page_path"] === "string" ? body["page_path"].slice(0, 200) : null;
    const connection_type = typeof body["connection_type"] === "string"
      ? body["connection_type"].slice(0, 30)
      : null;
    const user_agent = summarizeUA(req.get("user-agent") ?? undefined);

    await pool.query(
      `INSERT INTO hs_web_vitals
         (metric_name, value_ms, page_path, fingerprint, connection_type, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [metric_name, value_ms, page_path, fingerprint, connection_type, user_agent],
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("[events/vitals]", err);
    return res.status(500).json({ error: "internal" });
  }
});

/**
 * GET /api/events/analytics
 *
 * Returns aggregated card analytics, excluding superuser and rows whose
 * recipient_name matches an excluded pattern. Optionally accepts a date
 * range via `?from=YYYY-MM-DD&to=YYYY-MM-DD` (both inclusive). Either
 * endpoint can be omitted for an open-ended range.
 *
 * Auth: Clerk session — caller must be a signed-in superuser email.
 */
router.get("/events/analytics", async (req, res) => {
  if (!(await requireSuperuser(req, res))) return;

  try {
    await ensureEventsTable();
    await ensureVitalsTable();
    await ensureExcludedRecipientsPurged();
    await ensureExcludedPayersPurged();

    const from = parseDateParam(req.query["from"]);
    const to = parseDateParam(req.query["to"]);

    const filter = buildEventFilter({ from, to });
    const { whereSql, params } = filter;

    /**
     * Vitals filter: applies the same date range when supplied; otherwise
     * defaults to the rolling 24-hour window so the widget keeps working
     * for the common "what's happening right now?" case.
     */
    const vitalsParams: string[] = [];
    let vitalsWhere: string;
    if (from || to) {
      const conds: string[] = [];
      if (from) {
        vitalsParams.push(from);
        conds.push(`(created_at AT TIME ZONE 'Asia/Kolkata')::date >= $${vitalsParams.length}::date`);
      }
      if (to) {
        vitalsParams.push(to);
        conds.push(`(created_at AT TIME ZONE 'Asia/Kolkata')::date < ($${vitalsParams.length}::date + INTERVAL '1 day')`);
      }
      vitalsWhere = conds.join(" AND ");
    } else {
      vitalsWhere = `created_at > NOW() - INTERVAL '24 hours'`;
    }

    /**
     * "Recent cards" view-count subquery shares the exact same filter as the
     * outer SELECT (same email exclusions, same recipient exclusions, same
     * date range). Because the placeholders ($1, $2, …) are identical in both
     * the subquery and the outer WHERE, Postgres lets us bind the params just
     * once even though they're referenced twice in the SQL.
     */

    const [
      overview,
      occasions,
      userCohorts,
      anon_cohorts,
      signedInAfterWall,
      recentCards,
      vitals,
      utm_funnel,
      photoBreakdown,
      recipientCtaFunnel,
      userCards,
      paymentFunnel,
      mediaBreakdown,
      priceAb,
      priceAbOccasions,
    ] = await Promise.all([
        /* ── overview metrics ── */
        pool.query(
          `SELECT
            COUNT(*) FILTER (WHERE event = 'landing_name_entered')                               AS names_entered,
            COUNT(*) FILTER (WHERE event = 'cta_clicked')                                        AS cta_clicks,
            COUNT(*) FILTER (WHERE event = 'generate_clicked')                                   AS generate_clicks,
            COUNT(*) FILTER (WHERE event = 'card_created')                                       AS cards_created,
            COUNT(*) FILTER (WHERE event = 'card_created' AND is_free = true)                    AS free_cards,
            COUNT(*) FILTER (WHERE event = 'card_created' AND is_free = false)                   AS paid_cards,
            COUNT(*) FILTER (WHERE event = 'card_shared'  AND channel = 'whatsapp')              AS shared_wa,
            COUNT(*) FILTER (WHERE event = 'card_shared'  AND channel = 'instagram')             AS shared_ig,
            COUNT(*) FILTER (WHERE event = 'card_shared'  AND channel = 'link')                  AS shared_link,
            COUNT(*) FILTER (WHERE event = 'card_viewed')                                        AS card_views,
            COUNT(*) FILTER (WHERE event = 'website_visited_from_card')                          AS website_from_card,
            COUNT(*) FILTER (WHERE event = 'card_created' AND from_card_ref = true)              AS created_from_card_ref,
            COUNT(*) FILTER (WHERE event = 'signup_wall_shown')                                  AS signup_walls_shown,
            COUNT(*) FILTER (WHERE event = 'paywall_shown')                                      AS paywall_shown,
            COUNT(*) FILTER (WHERE event = 'paywall_paid')                                       AS paywall_paid,
            COUNT(*) FILTER (WHERE event = 'card_created' AND has_likes = true)                  AS likes_filled,
            COUNT(*) FILTER (WHERE event = 'card_created')                                       AS likes_total,
            COUNT(*) FILTER (WHERE event = 'card_created' AND used_custom_msg = true)            AS custom_msg_changed,
            COUNT(*) FILTER (WHERE event = 'card_created' AND clerk_user_id IS NOT NULL
                              AND is_free = true)                                                 AS signed_in_free_cards,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'landing_name_entered') AS names_entered_users,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'cta_clicked')          AS cta_users,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'generate_clicked')     AS generate_users,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'card_created')         AS cards_created_users,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'card_viewed')          AS card_viewed_users,
            COUNT(*) FILTER (WHERE event = 'photo_added')                                        AS photo_added,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'photo_added')          AS photo_added_users,
            COUNT(*) FILTER (WHERE event = 'signup_unlock_clicked')                              AS signup_unlock_clicked,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'signup_unlock_clicked') AS signup_unlock_users,
            COUNT(*) FILTER (WHERE event = 'continue_to_signin_clicked')                         AS continue_to_signin_clicked,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'continue_to_signin_clicked') AS continue_to_signin_users,
            COUNT(*) FILTER (WHERE event = 'share_without_photo_clicked')                        AS share_without_photo_clicked,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'share_without_photo_clicked') AS share_without_photo_users,
            COUNT(*) FILTER (WHERE event = 'photo_paywall_shown')                                AS photo_paywall_shown,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'photo_paywall_shown')  AS photo_paywall_shown_users,
            COUNT(*) FILTER (WHERE event = 'google_signin_completed')                            AS google_signin_completed,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'google_signin_completed') AS google_signin_completed_users,
            COUNT(*) FILTER (WHERE event = 'bundle_paywall_shown')                               AS bundle_paywall_shown,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'bundle_paywall_shown') AS bundle_paywall_shown_users,
            COUNT(*) FILTER (WHERE event = 'pay_now_clicked')                                    AS pay_now_clicked,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'pay_now_clicked')      AS pay_now_clicked_users,
            COUNT(*) FILTER (WHERE event = 'utr_entered')                                        AS utr_entered,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'utr_entered')          AS utr_entered_users,
            COUNT(*) FILTER (WHERE event = 'confirm_unlock_clicked')                             AS confirm_unlock_clicked,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'confirm_unlock_clicked') AS confirm_unlock_clicked_users,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'paywall_paid')         AS paywall_paid_users
           FROM hs_card_events WHERE ${whereSql}`,
          params,
        ),

        /* ── occasions ── */
        pool.query(
          `SELECT occasion, COUNT(*) AS cnt
           FROM hs_card_events
           WHERE event = 'card_created' AND occasion IS NOT NULL AND ${whereSql}
           GROUP BY occasion ORDER BY cnt DESC`,
          params,
        ),

        /* ── signed-in user cohorts (1, 2, 3 cards) ──
         * hs_clerk_users has no created_at or recipient_name column, so this
         * query stays scoped to the email exclusion only. It represents
         * lifetime cohorts, independent of the selected date range. */
        pool.query(
          `SELECT cards_used, COUNT(*) AS users
           FROM hs_clerk_users
           WHERE (email IS NULL OR email NOT IN (${SUPERUSER_EMAILS.map((_, i) => `$${i + 1}`).join(",")}))
           GROUP BY cards_used ORDER BY cards_used`,
          SUPERUSER_EMAILS,
        ),

        /* ── anon user cohorts from events ── */
        pool.query(
          `SELECT card_count, COUNT(*) AS users FROM (
             SELECT fingerprint, COUNT(*) AS card_count
             FROM hs_card_events
             WHERE event = 'card_created' AND clerk_user_id IS NULL AND fingerprint IS NOT NULL
               AND ${whereSql}
             GROUP BY fingerprint
           ) t GROUP BY card_count ORDER BY card_count`,
          params,
        ),

        /* ── unique signed-in users who have created at least one card ── */
        pool.query(
          `SELECT COUNT(DISTINCT clerk_user_id) AS count
           FROM hs_card_events
           WHERE event = 'card_created' AND clerk_user_id IS NOT NULL AND ${whereSql}`,
          params,
        ),

        /* ── recent cards with recipient names and view counts ──
         * The view-count subquery applies the same exclusion + date filter
         * so we don't include views of cards that no longer pass the filter. */
        pool.query(
          `SELECT c.card_id, c.recipient_name, c.occasion, c.template, c.is_free, c.created_at,
                  COALESCE(v.view_count, 0) AS view_count
           FROM hs_card_events c
           LEFT JOIN (
             SELECT card_id AS vc, COUNT(*) AS view_count
             FROM hs_card_events
             WHERE event = 'card_viewed' AND card_id IS NOT NULL
               AND ${whereSql}
             GROUP BY card_id
           ) v ON v.vc = c.card_id
           WHERE c.event = 'card_created' AND ${whereSql}
           ORDER BY c.created_at DESC
           LIMIT 20`,
          // Same placeholders ($1, $2, …) appear in both subquery and outer
          // WHERE — Postgres binds each $N once and reuses it everywhere.
          params,
        ),

        /* ── Web Vitals: P50/P75/P90 for the selected range (or last 24h). ── */
        pool.query(
          `SELECT
             metric_name,
             COUNT(*)::int                                              AS samples,
             percentile_cont(0.50) WITHIN GROUP (ORDER BY value_ms)     AS p50,
             percentile_cont(0.75) WITHIN GROUP (ORDER BY value_ms)     AS p75,
             percentile_cont(0.90) WITHIN GROUP (ORDER BY value_ms)     AS p90
           FROM hs_web_vitals
           WHERE ${vitalsWhere}
           GROUP BY metric_name
           ORDER BY metric_name`,
          vitalsParams,
        ),

        /* ── UTM funnel: visits → CTA clicks → cards → paid, by source ──
         *
         * "sessions" approximates per-source unique visitors using the
         * persisted device fingerprint. UTM is captured first-touch on the
         * client, so every event a fingerprint emits is attributed to the
         * source that originally brought them. */
        pool.query(
          `SELECT
             COALESCE(NULLIF(utm_source, ''), '(direct)')                                  AS source,
             COUNT(DISTINCT NULLIF(fingerprint, ''))                                        AS sessions,
             COUNT(DISTINCT NULLIF(fingerprint, '')) FILTER (WHERE event = 'cta_clicked')   AS cta_users,
             COUNT(DISTINCT NULLIF(fingerprint, '')) FILTER (WHERE event = 'card_created')  AS card_creators,
             COUNT(*) FILTER (WHERE event = 'card_created')                                 AS cards,
             COUNT(*) FILTER (WHERE event = 'card_created' AND is_free = false)             AS paid_cards
           FROM hs_card_events
           WHERE ${whereSql}
           GROUP BY 1
           ORDER BY sessions DESC NULLS LAST
           LIMIT 30`,
          params,
        ),

        /* ── Card with photo vs without photo breakdown ──
         * has_photo is stored directly on each event (set at tracking time).
         * For events where has_photo is NULL (older data), we fall back to
         * a LEFT JOIN to hs_cards to check photo_url on the stored card.
         * COALESCE prefers the explicit flag over the JOIN result. */
        pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE e.event = 'card_created' AND COALESCE(e.has_photo, c.photo_url IS NOT NULL))      AS photo_created,
             COUNT(*) FILTER (WHERE e.event = 'card_created' AND NOT COALESCE(e.has_photo, c.photo_url IS NOT NULL))  AS nophoto_created,
             COUNT(*) FILTER (WHERE e.event = 'card_shared'  AND COALESCE(e.has_photo, c.photo_url IS NOT NULL))      AS photo_shared,
             COUNT(*) FILTER (WHERE e.event = 'card_shared'  AND NOT COALESCE(e.has_photo, c.photo_url IS NOT NULL))  AS nophoto_shared,
             COUNT(*) FILTER (WHERE e.event = 'card_viewed'  AND COALESCE(e.has_photo, c.photo_url IS NOT NULL))      AS photo_viewed,
             COUNT(*) FILTER (WHERE e.event = 'card_viewed'  AND NOT COALESCE(e.has_photo, c.photo_url IS NOT NULL))  AS nophoto_viewed
           FROM (
             SELECT event, card_id, has_photo
             FROM hs_card_events
             WHERE ${whereSql}
               AND event IN ('card_created', 'card_shared', 'card_viewed')
           ) e
           LEFT JOIN hs_cards c ON e.card_id = c.id`,
          params,
        ),

        /* ── Recipient-card "Create your own card" CTA funnel ──
         * Measures the recipient → creator viral loop:
         *   - clicks   = total taps on the CTA at the end of a received card
         *   - users    = distinct devices (fingerprints) that tapped it
         *   - cards    = how many of those devices then created a card
         *
         * The cards-after-click count joins on fingerprint inside the same
         * date window — a click + a card-create from the same device count
         * as one conversion. */
        pool.query(
          `WITH clickers AS (
             SELECT DISTINCT fingerprint
             FROM hs_card_events
             WHERE event = 'create_own_clicked'
               AND fingerprint IS NOT NULL AND fingerprint <> ''
               AND ${whereSql}
           )
           SELECT
             (SELECT COUNT(*)::int FROM hs_card_events
                WHERE event = 'create_own_clicked' AND ${whereSql})         AS clicks,
             (SELECT COUNT(*)::int FROM clickers)                           AS unique_clickers,
             (SELECT COUNT(DISTINCT e.fingerprint)::int
                FROM hs_card_events e
                WHERE e.event = 'card_created'
                  AND e.fingerprint IN (SELECT fingerprint FROM clickers)
                  AND ${whereSql})                                          AS cards_after_click`,
          params,
        ),

        /* ── Signed-in users: email + cards created ──
         * Reads from hs_clerk_users (lifetime data, not date-range scoped)
         * to show every real signed-in user and how many cards they have sent.
         * Superuser emails are excluded. Ordered by cards_used DESC so the
         * most active users appear first. */
        pool.query(
          `SELECT email, clerk_user_id, cards_used, created_at
           FROM hs_clerk_users
           WHERE email IS NOT NULL
             AND email NOT IN (${SUPERUSER_EMAILS.map((_, i) => `$${i + 1}`).join(",")})
           ORDER BY cards_used DESC, created_at DESC`,
          SUPERUSER_EMAILS,
        ),

        /* ── Payment funnel ── 7 steps from card creation to sharing.
         * Distinct fingerprints per step so we measure unique users, not
         * event repetitions (a user could open the paywall multiple times). */
        pool.query(
          `SELECT
             COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'card_created')          AS step1_cards_created,
             COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'bundle_paywall_shown')   AS step2_paywall_shown,
             COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'pay_popup_cta_clicked')  AS step3_popup_clicked,
             COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'upi_id_copied')          AS step4_upi_copied,
             COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'payment_done_clicked')   AS step5_payment_done,
             COUNT(DISTINCT NULLIF(card_id,''))     FILTER (WHERE event = 'card_paid')              AS step6_card_unlocked,
             COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'card_shared')            AS step7_card_shared
           FROM hs_card_events WHERE ${whereSql}`,
          params,
        ),
        /* ── Voice & multi-photo breakdown from hs_card_events ──
           photo_url/voice_note_url are never persisted to hs_cards (they live
           in URL params), so we count from the card_created event flags instead. */
        pool.query(
          `SELECT
             COUNT(DISTINCT card_id) FILTER (WHERE event = 'card_created' AND has_voice_note = true AND card_id IS NOT NULL) AS cards_with_voice,
             COUNT(DISTINCT card_id) FILTER (WHERE event = 'card_created' AND photo_count >= 2 AND card_id IS NOT NULL)      AS cards_with_multi_photo
           FROM hs_card_events WHERE ${whereSql}`,
          params,
        ),
        /* ── Price A/B test: per-arm created → paid readout ──
         * Both created and paid come from arm-tagged events, so the panel
         * counts a single consistent epoch: from when arm tagging went live
         * (AB_EXPERIMENT_START). Earlier untagged conversions are intentionally
         * excluded so created/paid/conversion% are all like-for-like.
         *   created = card_created events tagged with this arm
         *   paid    = distinct cards with a card_paid event tagged with this arm
         * Conversion is computed client-side as paid / created. */
        pool.query(
          `SELECT price,
             COUNT(*) FILTER (WHERE event = 'card_created') AS created,
             (SELECT COUNT(DISTINCT ce.card_id)
                FROM hs_card_events ce
                WHERE ce.event = 'card_paid'
                  AND ce.created_at >= '${AB_EXPERIMENT_START}'::timestamptz
                  AND ce.card_id IN (SELECT id FROM hs_cards WHERE price = e.price)
                  AND ${whereSql}
             ) AS paid
           FROM hs_card_events e
           WHERE price IN (49, 99)
             AND created_at >= '${AB_EXPERIMENT_START}'::timestamptz
             AND ${whereSql}
           GROUP BY price ORDER BY price`,
          params,
        ),
        /* ── Price A/B test: per-arm × occasion breakdown (same epoch) ── */
        pool.query(
          `SELECT price, occasion,
             COUNT(*) FILTER (WHERE event = 'card_created') AS created,
             (SELECT COUNT(DISTINCT ce.card_id)
                FROM hs_card_events ce
                WHERE ce.event = 'card_paid'
                  AND ce.occasion = e.occasion
                  AND ce.created_at >= '${AB_EXPERIMENT_START}'::timestamptz
                  AND ce.card_id IN (SELECT id FROM hs_cards WHERE price = e.price)
                  AND ${whereSql}
             ) AS paid
           FROM hs_card_events e
           WHERE price IN (49, 99) AND occasion IS NOT NULL
             AND event = 'card_created'
             AND created_at >= '${AB_EXPERIMENT_START}'::timestamptz
             AND ${whereSql}
           GROUP BY price, occasion ORDER BY price, created DESC`,
          params,
        ),
      ]);

    /**
     * Both `created` and `paid` come from arm-tagged events since
     * AB_EXPERIMENT_START, so they share one epoch and the conversion rate is
     * like-for-like. Always emit both arms so the panel renders even when one
     * side is 0.
     */
    const createdByArm = new Map<number, number>();
    const paidByArm = new Map<number, number>();
    for (const r of priceAb.rows as Array<{ price: number; created: string; paid: string }>) {
      createdByArm.set(Number(r.price), Number(r.created) || 0);
      paidByArm.set(Number(r.price), Number(r.paid) || 0);
    }
    const mergedPriceAb = [49, 99].map((price) => ({
      price,
      created: String(createdByArm.get(price) ?? 0),
      paid: String(paidByArm.get(price) ?? 0),
    }));

    return res.json({
      overview: overview.rows[0],
      occasions: occasions.rows,
      signed_in_cohorts: userCohorts.rows,
      anon_cohorts: anon_cohorts.rows,
      signed_up_after_wall: signedInAfterWall.rows[0]?.count ?? 0,
      recent_cards: recentCards.rows,
      vitals: vitals.rows,
      utm_funnel: utm_funnel.rows,
      photo_breakdown: photoBreakdown.rows[0] ?? null,
      recipient_cta_funnel: recipientCtaFunnel.rows[0] ?? { clicks: 0, unique_clickers: 0, cards_after_click: 0 },
      user_cards: userCards.rows,
      payment_funnel: paymentFunnel.rows[0] ?? null,
      media_breakdown: mediaBreakdown.rows[0] ?? null,
      price_ab: mergedPriceAb,
      price_ab_occasions: priceAbOccasions.rows,
      // Echo back the effective range so the UI can show what's selected.
      range: { from: from ?? null, to: to ?? null },
    });
  } catch (err) {
    console.error("[events/analytics]", err);
    return res.status(500).json({ error: "internal" });
  }
});

/**
 * GET /api/events/sales
 *
 * Sales analytics derived from confirmed UPI payments (hs_received_payments).
 * Always excludes:
 *   - refunded payments (refunded_at IS NOT NULL)
 *   - the app owner's own self/test payments, matched via EXCLUDED_PAYER_PATTERNS
 *     (payer name "ITISHA JAIN" or her UPI VPA 8905158970). The patterns are
 *     anchored to the sender/VPA fields so real customers (e.g. "Somya Jain")
 *     are never caught.
 *
 * Optional date range via ?from=YYYY-MM-DD&to=YYYY-MM-DD (IST, inclusive).
 * Each confirmed payment corresponds to one card unlock.
 *
 * Auth: Clerk session — caller must be a signed-in superuser email.
 */
router.get("/events/sales", async (req, res) => {
  if (!(await requireSuperuser(req, res))) return;

  try {
    const from = parseDateParam(req.query["from"]);
    const to = parseDateParam(req.query["to"]);

    // WHERE fragment over hs_received_payments. Bare column names are safe in
    // the occasion query below because the joined subquery only exposes
    // card_id/occasion — created_at/refunded_at/raw_sms/amount resolve to rp.
    const conds: string[] = ["refunded_at IS NULL"];
    const params: string[] = [];
    // Exclude the owner's own UPI test payments (see EXCLUDED_PAYER_PATTERNS).
    const payerStart = params.length + 1;
    params.push(...EXCLUDED_PAYER_PATTERNS);
    conds.push(
      `(raw_sms IS NULL OR NOT (${EXCLUDED_PAYER_PATTERNS.map(
        (_, i) => `raw_sms ~* $${payerStart + i}`,
      ).join(" OR ")}))`,
    );
    // Exclude the owner's opaque (redirect-URL) test payments by exact UTR.
    if (EXCLUDED_UTR_SQL_LIST) {
      conds.push(`(utr IS NULL OR utr NOT IN (${EXCLUDED_UTR_SQL_LIST}))`);
    }
    if (from) {
      params.push(from);
      conds.push(`(created_at AT TIME ZONE 'Asia/Kolkata')::date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      conds.push(`(created_at AT TIME ZONE 'Asia/Kolkata')::date < ($${params.length}::date + INTERVAL '1 day')`);
    }
    const whereSql = conds.join(" AND ");

    const [totals, daily, byOccasion, last24h] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(NULLIF(amount,'')::numeric),0) AS total_amount,
                COUNT(*)                                    AS total_unlocks
         FROM hs_received_payments
         WHERE ${whereSql}`,
        params,
      ),
      pool.query(
        `SELECT to_char((created_at AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS date,
                COUNT(*)                                       AS unlocks,
                COALESCE(SUM(NULLIF(amount,'')::numeric),0)    AS amount
         FROM hs_received_payments
         WHERE ${whereSql}
         GROUP BY 1
         ORDER BY 1 DESC`,
        params,
      ),
      pool.query(
        `SELECT to_char((rp.created_at AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS date,
                COALESCE(occ.occasion, 'unknown')                AS occasion,
                COUNT(*)                                         AS unlocks
         FROM hs_received_payments rp
         LEFT JOIN (
           SELECT card_id,
                  MAX(occasion) FILTER (WHERE occasion IS NOT NULL AND occasion <> '') AS occasion
           FROM hs_card_events
           WHERE card_id IS NOT NULL
           GROUP BY card_id
         ) occ ON occ.card_id = rp.card_id
         WHERE ${whereSql}
         GROUP BY 1, 2
         ORDER BY 1 DESC, unlocks DESC`,
        params,
      ),
      // Rolling 24-hour window: always relative to "now", independent of the
      // from/to date filter, so the widget always shows the live last-24h count.
      pool.query(
        `SELECT COUNT(*)                                    AS unlocks,
                COALESCE(SUM(NULLIF(amount,'')::numeric),0) AS amount
         FROM hs_received_payments
         WHERE refunded_at IS NULL
           AND (raw_sms IS NULL OR NOT (${EXCLUDED_PAYER_PATTERNS.map(
             (_, i) => `raw_sms ~* $${i + 1}`,
           ).join(" OR ")}))
           ${EXCLUDED_UTR_SQL_LIST ? `AND (utr IS NULL OR utr NOT IN (${EXCLUDED_UTR_SQL_LIST}))` : ""}
           AND created_at >= NOW() - INTERVAL '24 hours'`,
        [...EXCLUDED_PAYER_PATTERNS],
      ),
    ]);

    return res.json({
      total_amount: totals.rows[0]?.total_amount ?? "0",
      total_unlocks: totals.rows[0]?.total_unlocks ?? "0",
      last_24h_unlocks: last24h.rows[0]?.unlocks ?? "0",
      last_24h_amount: last24h.rows[0]?.amount ?? "0",
      daily: daily.rows,
      by_occasion: byOccasion.rows,
      range: { from: from ?? null, to: to ?? null },
    });
  } catch (err) {
    console.error("[events/sales]", err);
    return res.status(500).json({ error: "internal" });
  }
});

/**
 * DELETE /api/events/reset
 * Wipes all analytics + usage data.
 * Auth: Clerk session — caller must be a signed-in superuser email.
 */
router.delete("/events/reset", async (req, res) => {
  if (!(await requireSuperuser(req, res))) return;
  try {
    await pool.query("TRUNCATE TABLE hs_card_events RESTART IDENTITY");
    await pool.query("TRUNCATE TABLE hs_card_usage RESTART IDENTITY");
    await pool.query("TRUNCATE TABLE hs_clerk_users RESTART IDENTITY");
    await pool.query(ENSURE_VITALS_TABLE);
    await pool.query("TRUNCATE TABLE hs_web_vitals RESTART IDENTITY");
    return res.json({ ok: true, message: "All analytics data cleared." });
  } catch (err) {
    console.error("[events/reset]", err);
    return res.status(500).json({ error: "internal" });
  }
});

export default router;
