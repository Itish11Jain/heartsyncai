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
 */

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

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

/** Inject checkout.js once; subsequent calls reuse the same promise. */
function loadCheckoutScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new PaymentFailed("Could not load the payment library.")));
      if (window.Razorpay) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = CHECKOUT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new PaymentFailed("Could not load the payment library."));
    };
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
    throw new PaymentFailed(orderData.message ?? "Could not start the payment. Please try again.");
  }

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
            }
          } catch {
            settleReject(new PaymentFailed("We couldn't confirm your payment. Please contact hello@heartsync.in"));
          }
        })();
      },
    });

    rzp.on("payment.failed", (resp: unknown) => {
      const msg = (resp as { error?: { description?: string } })?.error?.description;
      settleReject(new PaymentFailed(msg ?? "Payment failed. Please try again."));
    });

    rzp.open();
  });
}
