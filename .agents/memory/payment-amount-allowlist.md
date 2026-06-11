---
name: Payment amount allowlist (two places)
description: A new card price won't unlock in production unless BOTH the server amount-tier AND the external Gmail Apps Script allowlist include it
---

# A new price must be added in TWO places or production unlocks silently fail

Production card unlocks are driven by HDFC UPI **credit emails**, not the SMS
forwarder app. A Google Apps Script (`google-apps-script/gmail-utr-forwarder.gs`,
with a `.txt` twin) reads those emails and POSTs UTR+amount to
`/api/internal/upi-payment`.

When you introduce or change a card price, it must be accepted in BOTH layers or
the payment will never unlock the card:

1. **Server** — the amount-tier / accepted-amounts logic in the cards route
   (`artifacts/api-server/src/routes/cards.ts`) must map the price to its valid
   UPI amounts (each price plus the +₹1 round-up users sometimes pay).
2. **Gmail Apps Script** — the `ALLOWED_AMOUNTS` allowlist in the forwarder
   filters emails BEFORE they ever reach the server; amounts outside it are
   logged-and-skipped. If the new price isn't in this list the email is dropped
   and the server never sees the payment.

**Why:** the ₹29 reply tier was fully wired server-side but the Gmail script
still only allowed `[49,50,99,100]`, so real ₹29 reply payments were silently
skipped. Allowlist now `[29,30,49,50,99,100]`.

**How to apply:** editing the repo copy of the `.gs`/`.txt` does NOT change the
live script — the owner must paste the updated script into their script.google.com
project for it to take effect. Always tell them to redeploy after the edit. Keep
the `.gs` and `.txt` copies in sync.
