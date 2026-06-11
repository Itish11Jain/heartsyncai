---
name: ₹29 reply price authority
description: How the ₹29 viral-reply tier is kept server-authoritative and isolated from normal ₹49/₹99 cards.
---

# ₹29 reply-card price authority

The ₹29 "viral reply" tier must be **server-authoritative** and never selectable by a
client request body. Normal cards are ₹49/₹99 (premium); only server-minted reply cards
are ₹29.

**The rule:**
- A client request body may only ever carry price `49` or `99`. There is a dedicated
  normalizer for client-supplied prices (in `cards.ts`) that accepts 49/99 only — `29` from
  a body is dropped. Use it on `POST /cards` and on both unlock body-fallbacks.
- The stored-price reader still accepts 29/49/99 (it reads what the server itself wrote).
- The ₹29 tier is reachable in an unlock **only** when the card's *stored* price is 29.
  Unlock price resolves as `normPrice(stored.price) ?? normClientBodyPrice(body.price)`.
- The **sole** way to create a ₹29 card is `POST /api/cards/reply`, which server-generates a
  CSPRNG id (`uniqueId()`, never client-supplied), inserts `template='reply'`, `price=29`,
  locked. It cannot target or overwrite an existing card, so it can't downgrade ₹49/₹99 cards.

**Why:** an earlier draft let the client pick ₹29 via the create/unlock body, which would let
anyone unlock a ₹99 premium card for ₹29. Architect flagged it as a critical downgrade bug.

**How to apply:** never reintroduce `29` into any client-body price normalization, and never
add a client-supplied-id path to the reply-mint endpoint. The client mints via
`POST /api/cards/reply` first, then reuses that id across pay-unlock retries.

**Known gap (pre-existing, out of scope):** the Meta CAPI `custom_data.value` is hardcoded
`99.0` in `fireMetaCapi` for ALL unlocks (so ₹49 and ₹29 unlocks both report 99). Fixing it
means threading the real unlocked amount into `fireMetaCapi`; left untouched to avoid changing
ad-attribution behavior for existing ₹49/₹99 flows.
