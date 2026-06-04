---
name: BirthdayDoor integration
description: How the birthday template is wired into heartsync-ai (routing, payment, URL params)
---

# BirthdayDoor integration

## Key decisions

**Template is premium** — added "birthday" to PREMIUM_TEMPLATES in usage.ts. This means send.tsx redirects directly to birthday.html without creating a DB card row; payment is handled inside the birthday card page itself (same as cosmic/vinyl/crystal).

**Why:** Birthday card has 6 scenes and a custom payment bottom sheet; the DB-card flow (envelope pattern) doesn't fit. Consistent with how other animated premium templates work.

**How to apply:** Any new animated multi-scene template should follow the same pattern: add to PREMIUM_TEMPLATES, create its own HTML splash + TSX page + route, update buildCardUrl in send.tsx.

## URL param contract (birthday.html → /birthday)

- `to` — recipient name
- `msg` — base64-encoded custom message (optional)
- `sender=1` — flag: viewer is the card creator
- `id` — card ID for analytics / UnlockModal
- `occasion` — passed through from send form
- `photos` — comma-separated, URL-encoded photo URLs (up to 3 for polaroid scene)
- `personalpicture` — single URL for personal sticker (Scene 5)

## Auto-select birthday template

In send.tsx `doGenerateCard`, `effectiveTemplate` is overridden to "birthday" when `occasion === "birthday"`. No UI change needed — the template picker stays hidden for birthday as it does for other occasions.

## Scene 1 balloons — gradient circles ONLY (do not replace)

Scene 1's floating balloons use CSS radial-gradient `<circle>` sprites (`S1G`
array → `radialGradient` defs). A "photorealistic 3D balloon image-sprite"
version was built and shipped to production — the owner had **explicitly said
not to put it on production** and was upset it went live. It was reverted back
to the gradient circles.
**Why:** owner rejected the realistic 3D balloon look for the birthday opener;
keep the soft gradient circles.
**How to apply:** do NOT swap Scene 1 balloons to image sprites again. More
broadly: never publish/deploy an unapproved visual change — keep
experimental/unapproved redesigns out of any production deploy until the owner
signs off.

## Scene 6 payment flow

- Auto-opens UnlockModal (mobile) or WatermarkPaywallModal (desktop) 3 s after scene 6, once per session (tracked with `autoOpenFiredRef`)
- After unlock: WhatsApp / Instagram / Copy Link share buttons appear
- Recipient sees ViralReplyCTA with `template="birthday"`
