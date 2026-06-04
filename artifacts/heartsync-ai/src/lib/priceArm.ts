/**
 * Price A/B test arm assignment.
 *
 * Splits devices 50/50 into a ₹49 arm and a ₹99 arm, anchored to the existing
 * device fingerprint (hs_fp) so the assignment is deterministic. Once assigned,
 * the arm is persisted in its own localStorage key (hs_price_arm) and never
 * changes for that device — even if the fingerprint logic changes later, so a
 * returning visitor always sees the same price.
 *
 * Each arm keeps the same "~50% off" discount framing: the live price is shown
 * struck through against an anchor (49 → ₹99 anchor, 99 → ₹199 anchor), so only
 * the number the customer pays varies between arms.
 */

const ARM_KEY = "hs_price_arm";

export type PriceArm = 49 | 99;

export interface PriceConfig {
  /** The live price the device pays, in rupees. */
  price: PriceArm;
  /** The struck-through "original" price for discount framing. */
  anchor: number;
}

const ANCHOR: Record<PriceArm, number> = { 49: 99, 99: 199 };

/** Deterministic 0/1 bucket from a string (same hash family as makeFingerprint). */
function bucket(seed: string): PriceArm {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2 === 0 ? 49 : 99;
}

/** Returns the sticky price arm for this device (49 or 99). */
export function getPriceArm(): PriceArm {
  if (typeof window === "undefined") return 49;
  try {
    // Testing override: ?arm=49 or ?arm=99 forces (and persists) an arm so QA
    // can view either variant on demand. Once set it sticks like a normal arm.
    const override = new URLSearchParams(window.location.search).get("arm");
    if (override === "49" || override === "99") {
      localStorage.setItem(ARM_KEY, override);
      return Number(override) as PriceArm;
    }

    const stored = localStorage.getItem(ARM_KEY);
    if (stored === "49" || stored === "99") return Number(stored) as PriceArm;

    // Anchor to the existing device fingerprint when present so the split is
    // deterministic; fall back to a random 50/50 draw if it isn't set yet.
    const fp = localStorage.getItem("hs_fp");
    const arm: PriceArm = fp ? bucket(fp) : Math.random() < 0.5 ? 49 : 99;
    localStorage.setItem(ARM_KEY, String(arm));
    return arm;
  } catch {
    return 49;
  }
}

/** Returns the price + discount anchor for this device's arm. */
export function getPriceConfig(): PriceConfig {
  const price = getPriceArm();
  return { price, anchor: ANCHOR[price] };
}
