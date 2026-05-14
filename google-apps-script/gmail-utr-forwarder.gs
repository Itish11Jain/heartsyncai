/**
 * HeartSync AI — Gmail UTR Auto-Forwarder
 *
 * Watches your Gmail inbox for HDFC payment alert emails (₹49 credits),
 * extracts the 12-digit UPI Reference No., and POSTs it to the HeartSync
 * API so customers can unlock their cards instantly — fully automatic.
 *
 * SETUP (one-time)
 * ────────────────
 * 1. Go to https://script.google.com — sign in with the Gmail that gets HDFC alerts
 * 2. Paste this entire file, replacing whatever is there. Save (Ctrl+S).
 * 3. Fill in HEARTSYNC_API_SECRET below (copy from Replit secrets → ADMIN_SECRET)
 * 4. Click Run → setupTrigger  (approve the Gmail permission popup)
 * 5. Done — fully automatic from here. Every new ₹49 credit is forwarded in ≤1 min.
 *
 * To retroactively process emails that were missed before this fix, run:
 *   reprocessPast()
 * once from the Apps Script editor (Run menu).
 */

var HEARTSYNC_API_URL    = "https://heartsync.in/api/internal/upi-payment";
var HEARTSYNC_API_SECRET = "PASTE_YOUR_ADMIN_SECRET_HERE";  // ← fill this in
var PROCESSED_LABEL      = "heartsync-processed";
var AMOUNT_FILTER        = "49";

// ─── Main function — runs every 1 minute via trigger ────────────────────────

function checkHdfcEmails() {
  var label = getOrCreateLabel(PROCESSED_LABEL);

  // Search by sender + text that actually appears in HDFC credit emails.
  // No "is:unread" — the email may already be read by the time the trigger fires.
  // The "-label:heartsync-processed" prevents double-processing.
  var query = 'from:(alerts@hdfcbank.com OR noreply@hdfcbank.com OR alerts@hdfcbank.net OR alerts@hdfcbank.bank.in) "UPI Reference No" -label:' + PROCESSED_LABEL;
  var threads = GmailApp.search(query, 0, 20);

  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(msg) {
      processMessage(msg, label);
    });
  });
}

// ─── Run once to catch emails missed before this fix ────────────────────────

function reprocessPast() {
  var label = getOrCreateLabel(PROCESSED_LABEL);
  // Broader search — no label filter, looks at last 100 HDFC emails
  var query = 'from:(alerts@hdfcbank.com OR noreply@hdfcbank.com OR alerts@hdfcbank.net OR alerts@hdfcbank.bank.in) "UPI Reference No"';
  var threads = GmailApp.search(query, 0, 100);
  var count = 0;
  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(msg) {
      // Skip already-labelled messages
      var labels = msg.getThread().getLabels().map(function(l) { return l.getName(); });
      if (labels.indexOf(PROCESSED_LABEL) === -1) {
        processMessage(msg, label);
        count++;
      }
    });
  });
  Logger.log("reprocessPast complete — checked " + count + " unlabelled messages.");
}

// ─── Process a single email ──────────────────────────────────────────────────

function processMessage(msg, processedLabel) {
  var body = msg.getPlainBody() || msg.getBody();

  // Extract 12-digit UTR from "UPI Reference No.: 306164728586"
  var utrMatch = body.match(/UPI Reference No\.?\s*[:\-]?\s*(\d{12})/i);
  if (!utrMatch) {
    // Fallback: older HDFC format
    utrMatch = body.match(/UPI transaction reference number is\s*(\d{12})/i);
  }
  if (!utrMatch) return;
  var utr = utrMatch[1];

  // Extract amount — "Rs.49.00 has been successfully credited"
  var amountMatch = body.match(/Rs\.?\s*([\d,]+(?:\.\d+)?)\s+has been successfully credited/i);
  if (!amountMatch) {
    amountMatch = body.match(/Rs\.?\s*([\d,]+(?:\.\d+)?)\s+is\s+successfully\s+credited/i);
  }
  if (!amountMatch) return;

  var amount = amountMatch[1].replace(/,/g, "");
  if (parseFloat(amount) !== parseFloat(AMOUNT_FILTER)) {
    Logger.log("Skipping non-₹49 payment: Rs." + amount + " | UTR " + utr);
    return;
  }

  // POST to HeartSync API
  try {
    var response = UrlFetchApp.fetch(HEARTSYNC_API_URL, {
      method: "post",
      contentType: "application/json",
      headers: { "Authorization": "Bearer " + HEARTSYNC_API_SECRET },
      payload: JSON.stringify({ utr: utr, amount: amount, raw_sms: body.substring(0, 500) }),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code === 200 || code === 409) {
      msg.getThread().addLabel(processedLabel);
      Logger.log("✓ UTR " + utr + " stored. Customer can unlock with last 4 digits: " + utr.slice(-4));
    } else {
      Logger.log("✗ API error " + code + ": " + response.getContentText() + " | UTR: " + utr);
    }
  } catch (e) {
    Logger.log("✗ Fetch error: " + e.message);
  }
}

// ─── One-time setup: 1-minute trigger ───────────────────────────────────────

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "checkHdfcEmails") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("checkHdfcEmails").timeBased().everyMinutes(1).create();
  getOrCreateLabel(PROCESSED_LABEL);
  Logger.log("✓ Trigger created. checkHdfcEmails will run every 1 minute.");
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function getOrCreateLabel(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) label = GmailApp.createLabel(name);
  return label;
}
