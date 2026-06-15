---
name: Occasion campaign system
description: How reusable occasion campaigns (/send?c=slug) + the shared "occasion" card template are wired and what must be registered when adding a new one.
---

# Reusable occasion campaigns

A campaign = prefilled `/send?c=<slug>` landing + the ONE shared 5-screen card
template `src/pages/occasion.tsx` (route `/occasion`). Father's Day is the first.
Copy/theme live in `src/lib/occasion-campaigns.ts` (`CAMPAIGNS[slug]`), looked up
by slug on /send (`getCampaignBySlug`) and by occasion on the card page
(`getCampaignByOccasion`). The card reads everything (tapPrompt, bouquetMessage,
polaroidNote, finalHeader, accent, cornerEmojis, defaultMessage) from that config —
the page itself is occasion-agnostic.

**Why:** one template + per-campaign config means new occasions are config-only,
no new scene code.

## How to apply — adding a new campaign occasion
A new occasion id (e.g. `mothers_day`) must be registered in FIVE places or it
breaks at build/runtime:
1. `card-templates.ts` Occasion type
2. `priceArm.ts` price map (per-occasion pricing; ₹99 birthday/sorry/fathers_day, ₹49 others)
3. `usage.ts` — `"occasion"` is already in TemplateId/PREMIUM_TEMPLATES/isPremiumTemplate (template is shared; don't re-add)
4. `occasion-campaigns.ts` — add `CAMPAIGNS[slug]` with `occasion` + all copy/theme slots
5. a committed satellite `public/<slug>.html` (clone an existing one) for OG link previews — and add its filename to `scripts/inject-preloads.mjs` satelliteFiles + the API `share.ts` TEMPLATE_MAP

Gotcha: `template-preview.tsx` has its OWN local `TemplateId` union (picker
thumbnails). It must include `"occasion"` (maps to envelope preview) or send.tsx
typecheck fails — even though occasion is never shown in the picker.

## send.tsx campaign branching
Campaign mode starts at step 3, prefills name/message/occasion/relation, and every
campaign branch must early-return BEFORE the viral-reply and normal-flow branches
(re-seed effect, defaultMsg, effectiveTemplate, buildCardUrl, header back/title).
Campaign is disabled when it's a viral reply so the reply flow is untouched.

## occasion.tsx parity rules (mirror birthday.tsx)
- recipient-only `card_viewed` with `template:"occasion"` (excl. autoplay) — analytics Views depend on it
- sender gets a CSPRNG cardId + replaceState; fetch `/api/cards/:id` → is_premium → isUnlocked
- paywall auto-opens ~2s AFTER the final typewriter finishes (sender, !preview, !unlocked); mobile UnlockModal / desktop WatermarkPaywallModal, both passed `occasion` so ₹99 derives automatically
- autoplay preview mode (used inside the paywall modal iframe) loops scenes on a timer; scene components must not also self-advance in autoplay
