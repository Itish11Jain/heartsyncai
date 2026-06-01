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
