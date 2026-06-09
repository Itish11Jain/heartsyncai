---
name: Capability-gated animation
description: How HeartSync scales animation by device tier without downgrading good phones
---

- Heavy template animations (`/cosmic` canvas starfield, `/birthday` twinkle SVGs) are capability-gated via `src/lib/deviceCapability.ts` (`getDeviceTier`, `scaleCount`, `prefersReducedMotion`).

**Rule:** default to the `"high"` tier and keep full effects; only downgrade on POSITIVE low-end evidence (`deviceMemory <= 4`, `hardwareConcurrency <= 4`, `saveData`, or `effectiveType` 2g/3g). `prefers-reduced-motion` honored separately.

**Why:** iOS Safari does not expose `navigator.deviceMemory` (returns undefined). Treating "unknown" as low would silently strip animation from iPhones — the exact opposite of the requirement that good phones keep the premium effect. Unknown must stay high.

**How to apply:** when adding a new gated effect, pass the full value to `scaleCount(full, lowFactor, reducedFactor)`; never gate on the *absence* of a capability signal. For rAF canvas loops, also pause on `document.hidden` (visibilitychange) AND bail at the top of the loop when hidden — this is invisible battery saving, not a visual change.
