---
name: Birthday card ID registration bug
description: Why birthday template cards previously had no card_id in DB, and how it was fixed.
---

# Birthday card_id missing — root cause & fix

**Why:** `send.tsx` redirects to `birthday.html` with no `?id=` param (5th arg of `buildCardUrl` is `undefined`). `birthday.tsx` read `cardId = params.get("id") ?? ""` → empty string. `UnlockModal` then called `POST /api/cards//auto-unlock` — Express can't match `:id = ""` → 404. Not a 402, so polling stopped and UTR entry also failed → no card ever registered.

**Symptom:** `hs_received_payments` shows payment received but `card_id = NULL`, `used_at = NULL`. No row in `hs_card_unlock_submissions`. Card never unlocked.

**Fix (birthday.tsx):** Changed `cardId` from a `const` to `useState`. Added a `useEffect` that runs once on mount: if `isSender && !cardId`, generates a cryptographically random 8-char `[a-z0-9]` ID via `crypto.getRandomValues`, calls `setCardId(id)`, and calls `window.history.replaceState` to stamp `?id=<id>` into the URL. The `auto-unlock` and `pay-unlock` endpoints both use `INSERT INTO hs_cards ON CONFLICT DO UPDATE`, so they create the card row on first successful unlock — no pre-registration step needed.

**Why:** `PremiumLockPanel` (crystal/cosmic/vinyl) registers the card post-UTR server-side. Birthday uses `UnlockModal` which has no equivalent registration step — it relies on a pre-existing card ID in the URL, which was never provided.
