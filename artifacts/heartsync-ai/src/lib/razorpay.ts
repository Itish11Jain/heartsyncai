/**
 * Razorpay Standard Checkout helper.
 *
 * Single entry point — payWithRazorpay() — used by every paywall surface:
 *   1. POST /api/razorpay/create-order  (amount derived server-side)
 *   2. load checkout.js + open the modal
 *   3. POST /api/razorpay/verify        (HMAC verified server-side → unlock)
 *
 * Resolves with the verify result on a confirmed payment; rejects with
 * PaymentCancelled (user closed the modal) or PaymentFailed (everything else).
 *
 * Razorpay is only the live checkout when the server payment mode is
 * 'razorpay' (see getPaymentMode). Default is the manual UPI flow, so this
 * stays dormant until the owner flips the toggle.
 */

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export type PaymentMode = "upi" | "razorpay";

let modeCache: { mode: PaymentMode; at: number } | null = null;
const MODE_TTL_MS = 10_000;

/**
 * The active payment mode, decided by the server. Cached ~10s so opening
 * several paywalls in a row doesn't spam the endpoint, while a flip still
 * takes effect almost immediately. Falls back to 'upi' on any error so the
 * manual flow is always the safe default.
 */
export async function getPaymentMode(): Promise<PaymentMode> {
  if (modeCache && Date.now() - modeCache.at < MODE_TTL_MS) return modeCache.mode;
  try {
    const res = await fetch(`${BASE}/api/payment-mode`);
    const data = (await res.json().catch(() => ({}))) as { mode?: string };
    const mode: PaymentMode = data.mode === "razorpay" ? "razorpay" : "upi";
    modeCache = { mode, at: Date.now() };
    return mode;
  } catch {
    return modeCache?.mode ?? "upi";
  }
}

export type PaymentKind = "card" | "bundle" | "template" | "watermark";

export interface PayOptions {
  kind: PaymentKind;
  cardId?: string;
  occasion?: string;
  /** Forwarded to /verify (card flow): Meta CAPI matching + dedup event id. */
  verifyExtras?: { eventId?: string; fbp?: string | null; fbc?: string | null };
  prefill?: { name?: string; email?: string; contact?: string };
  /** Clerk bearer token — required for the `template` kind. */
  authToken?: string | null;
  /**
   * Called when a payment is verified AFTER the returned promise already
   * settled — e.g. the open() watchdog rejected (false positive on a slow
   * render) but the modal was actually up and the user paid. Lets the caller
   * recover to a success state instead of leaving the user on a fallback
   * screen and risking a second payment.
   */
  onLateSuccess?: (result: PayResult) => void;
}

export interface PayResult {
  ok: true;
  kind: PaymentKind;
  cardId?: string | null;
  token?: string | null;
  unlocked_templates?: string[];
}

export class PaymentCancelled extends Error {
  constructor() {
    super("Payment cancelled");
    this.name = "PaymentCancelled";
  }
}

export class PaymentFailed extends Error {
  constructor(message = "Payment failed") {
    super(message);
    this.name = "PaymentFailed";
  }
}

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (resp: unknown) => void) => void;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  handler: (resp: RazorpaySuccess) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayOptions) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;
const SCRIPT_TIMEOUT_MS = 12_000;

/**
 * Inject checkout.js once; subsequent calls reuse the same promise. Rejects on
 * error OR after a timeout so a blocked/slow CDN can never leave the caller
 * waiting forever with no feedback.
 */
function loadCheckoutScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    let done = false;
    const fail = (reason: string) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      scriptPromise = null;
      console.error(`[razorpay] checkout.js failed to load: ${reason}`);
      reject(new PaymentFailed("Could not load the payment library."));
    };
    const ok = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      console.info("[razorpay] checkout.js loaded");
      resolve();
    };
    const timer = window.setTimeout(() => fail("timeout"), SCRIPT_TIMEOUT_MS);

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      if (window.Razorpay) { ok(); return; }
      existing.addEventListener("load", ok);
      existing.addEventListener("error", () => fail("script error"));
      return;
    }
    const s = document.createElement("script");
    s.src = CHECKOUT_SRC;
    s.async = true;
    s.onload = ok;
    s.onerror = () => fail("script error");
    document.body.appendChild(s);
  });
  return scriptPromise;
}

function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const DESCRIPTIONS: Record<PaymentKind, string> = {
  card: "Unlock & share your card",
  bundle: "2-card bundle",
  template: "Premium templates (forever)",
  watermark: "Remove watermark",
};

/**
 * Opens Razorpay checkout and resolves once the payment is verified server-side.
 * @throws PaymentCancelled when the user dismisses the modal.
 * @throws PaymentFailed on order/verify/network/payment errors.
 */
export async function payWithRazorpay(opts: PayOptions): Promise<PayResult> {
  console.info("[razorpay] starting checkout", { kind: opts.kind, cardId: opts.cardId });
  // 1) Create the order (amount is decided by the server).
  const orderRes = await fetch(`${BASE}/api/razorpay/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(opts.authToken) },
    body: JSON.stringify({ kind: opts.kind, cardId: opts.cardId, occasion: opts.occasion }),
  });
  const orderData = (await orderRes.json().catch(() => ({}))) as {
    orderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string;
    message?: string;
  };
  if (!orderRes.ok || !orderData.orderId || !orderData.keyId) {
    console.error("[razorpay] create-order failed", orderRes.status, orderData);
    throw new PaymentFailed(orderData.message ?? "Could not start the payment. Please try again.");
  }
  console.info("[razorpay] order created", orderData.orderId);

  // 2) Make sure checkout.js is available.
  await loadCheckoutScript();
  if (!window.Razorpay) throw new PaymentFailed("Could not load the payment library.");

  // 3) Open the modal and wait for verify.
  return new Promise<PayResult>((resolve, reject) => {
    let settled = false;
    const settleReject = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    const rzp = new window.Razorpay!({
      key: orderData.keyId!,
      order_id: orderData.orderId!,
      amount: orderData.amount ?? 0,
      currency: orderData.currency ?? "INR",
      name: "HeartSync AI",
      description: DESCRIPTIONS[opts.kind],
      theme: { color: "#FFD700" },
      ...(opts.prefill ? { prefill: opts.prefill } : {}),
      modal: {
        ondismiss: () => settleReject(new PaymentCancelled()),
      },
      handler: (resp: RazorpaySuccess) => {
        void (async () => {
          try {
            const verifyRes = await fetch(`${BASE}/api/razorpay/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeaders(opts.authToken) },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                ...(opts.verifyExtras ?? {}),
              }),
            });
            const data = (await verifyRes.json().catch(() => ({}))) as PayResult & { message?: string };
            if (!verifyRes.ok || !data.ok) {
              settleReject(new PaymentFailed(data.message ?? "We couldn't confirm your payment. Please contact hello@heartsync.in"));
              return;
            }
            if (!settled) {
              settled = true;
              resolve(data);
            } else {
              // The promise was already settled (almost always the open()
              // watchdog firing on a slow render). The payment genuinely went
              // through and is verified server-side, so recover the UI instead
              // of leaving the user on a fallback / asking them to pay again.
              console.warn("[razorpay] payment verified after promise settled — recovering via onLateSuccess");
              opts.onLateSuccess?.(data);
            }
          } catch {
            settleReject(new PaymentFailed("We couldn't confirm your payment. Please contact hello@heartsync.in"));
          }
        })();
      },
    });

    rzp.on("payment.failed", (resp: unknown) => {
      const msg = (resp as { error?: { description?: string } })?.error?.description;
      console.error("[razorpay] payment.failed", msg);
      settleReject(new PaymentFailed(msg ?? "Payment failed. Please try again."));
    });

    console.info("[razorpay] opening modal");
    rzp.open();

    // Watchdog: if the overlay never renders (popup blocked, in-app webview
    // quirk, slow network) the promise would otherwise hang forever and the
    // caller would show nothing at all. Detect a missing overlay shortly after
    // open() and surface a real error so the caller can fall back to UPI.
    window.setTimeout(() => {
      if (settled) return;
      const appeared = document.querySelector(
        ".razorpay-container, .razorpay-checkout-frame, iframe.razorpay-checkout-frame, iframe[src*='razorpay']",
      );
      if (!appeared) {
        console.error("[razorpay] modal did not appear within 8s of open()");
        settleReject(new PaymentFailed("The payment window couldn't open. Please try again or pay via UPI."));
      }
    }, 8000);
  });
}
