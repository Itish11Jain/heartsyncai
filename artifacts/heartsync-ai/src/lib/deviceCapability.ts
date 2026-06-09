/**
 * Device-capability gating for animation-heavy templates.
 *
 * Goal: high-end devices (iPhones, modern / flagship Android) keep the full,
 * rich animation UNCHANGED. Only genuinely low-end / constrained devices get
 * reduced particle / element counts so the scene stays smooth. We default to
 * the "high" tier whenever capability is unknown (e.g. iOS Safari does not
 * expose `navigator.deviceMemory`) so quality devices are never downgraded by
 * accident. `prefers-reduced-motion` is honored only for users who opted in at
 * the OS level.
 */

export type DeviceTier = "high" | "low";

let _tier: DeviceTier | null = null;

/** Cached low/high classification. Only positive evidence downgrades to low. */
export function getDeviceTier(): DeviceTier {
  if (_tier) return _tier;
  if (typeof navigator === "undefined") return (_tier = "high");

  let low = false;

  // RAM: only a positive low reading downgrades. Unknown stays high (protects iOS).
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem > 0 && mem <= 4) low = true;

  // CPU cores: <= 4 is a strong low-end signal. Modern iPhones report 6.
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && cores > 0 && cores <= 4) low = true;

  // Slow network / data-saver correlates with budget devices and regions.
  const conn = (navigator as unknown as {
    connection?: { effectiveType?: string; saveData?: boolean };
  }).connection;
  if (conn) {
    if (conn.saveData) low = true;
    if (conn.effectiveType && /^(slow-2g|2g|3g)$/.test(conn.effectiveType)) low = true;
  }

  return (_tier = low ? "low" : "high");
}

/** True only when the user has enabled "reduce motion" in their OS settings. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Scale a decorative count. High tier keeps the full value; low tier applies
 * `lowFactor`; reduced-motion users get `reducedFactor`. High-end devices are
 * never reduced.
 */
export function scaleCount(full: number, lowFactor = 0.5, reducedFactor = 0.25): number {
  if (prefersReducedMotion()) return Math.max(0, Math.round(full * reducedFactor));
  return getDeviceTier() === "low" ? Math.max(0, Math.round(full * lowFactor)) : full;
}
