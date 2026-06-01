---
name: Card view tracking
description: How the analytics "Views" column is populated for greeting-card templates.
---

# Card view tracking

The analytics dashboard "Views" column (Recent Cards table + overview card_views)
counts rows of the `card_viewed` analytics event that have a non-null `card_id`.

Each card template page must fire this itself on the recipient's open:
`trackEvent({ event: "card_viewed", template: "<name>", occasion, recipient_name, card_id })`
inside a mount-once effect gated on `isRecipient && !isAutoplay`.

**Why:** there is no central place that emits `card_viewed` — it lives per-page.
A template that forgets it shows 0 views forever even though it works fine.
The birthday template originally shipped without it (cosmic/crystal/vinyl/envelope all had it).

**How to apply:** whenever you add a NEW card template page, copy the `card_viewed`
mount effect from an existing template (e.g. card.tsx / cosmic.tsx) or its Views
column will silently stay 0.

## Premium templates: card_id must be threaded through card_created

The recent-cards "Views" join matches `card_created.card_id = card_viewed.card_id`.
For premium templates (birthday/cosmic/crystal/vinyl) send.tsx's premium branch
must generate a tracking id and pass it to BOTH the `card_created` trackEvent AND
`buildCardUrl`. The original premium branch fired `card_created` with no card_id
and built the URL with `id=undefined`; the card page then generated its own fresh
id, so the recipient's `card_viewed` id never matched → Views stuck at 0.

**Why:** premium templates create no DB card row at send time (only on unlock), so
the only link between create and view is this client tracking id. Free/envelope
branch already did this correctly; premium branch did not.
