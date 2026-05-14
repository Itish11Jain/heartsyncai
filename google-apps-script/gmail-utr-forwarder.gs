/**
 * HeartSync AI — Gmail UTR Auto-Forwarder
 *
 * Watches your Gmail inbox for HDFC payment alert emails (₹49 credits),
 * extracts the 12-digit UPI transaction reference number, and POSTs it
 * to the HeartSync API so customers can unlock their cards instantly.
 *
 * SETUP INSTRUCTIONS
 * ──────────────────
 * 1. Go to https://script.google.com  (sign in with the Gmail that receives HDFC alerts)
 * 2. Click "New project", paste this entire file, save it (Ctrl+S)
 * 3. Fill in HEARTSYNC_API_SECRET below (copy it from your Replit environment secrets → ADMIN_SECRET)
 * 4. Click Run → "setupTrigger"  (grants Gmail permission + creates the 1-min auto-trigger)
 * 5. Approve the permission popup — that's it, fully automatic from here.
 *
 * The script runs every 1 minute, processes new HDFC emails, and marks them
 * with a "heartsync-processed" label so they are never double-counted.
 */

var HEARTSYNC_API_URL    = "https://heartsync.in/api/internal/upi-payment";
var HEARTSYNC_API_SECRET = "PASTE_YOUR_ADMIN_SECRET_HERE";   // ← fill this in
var PROCESSED_LABEL      = "heartsync-processed";
var AMOUNT_FILTER        = "49";   // only store UTRs for ₹49 payments

// ─── Main function (runs every minute via trigger) ───────────────────────────

function checkHdfcEmails() {
  var label = getOrCreateLabel(PROCESSED_LABEL);

  // Search for unread HDFC credit alert emails not yet labelled
  var query = 'from:(alerts@hdfcbank.com OR noreply@hdfcbank.com OR alerts@hdfcbank.net) subject:"Account update" "UPI transaction reference number" is:unread -label:' + PROCESSED_LABEL;
  var threads = GmailApp.search(query, 0, 20);

  if (threads.length === 0) return;

  threads.forEach(function(thread) {
    var messages = thread.getMessages();
    messages.forEach(function(msg) {
      if (msg.isUnread()) {
        processMessage(msg, label);
      }
    });
  });
}

// ─── Process a single email message ──────────────────────────────────────────

function processMessage(msg, processedLabel) {
  var body = msg.getPlainBody() || msg.getBody();

  // Extract UTR — "Your UPI transaction reference number is 606009209619"
  var utrMatch = body.match(/UPI transaction reference number is\s*(\d{12})/i);
  if (!utrMatch) return;
  var utr = utrMatch[1];

  // Only process ₹49 payments
  var amountMatch = body.match(/Rs\.\s*([\d,]+(?:\.\d+)?)\s+is\s+successfully\s+credited/i);
  if (!amountMatch) return;
  var amount = amountMatch[1].replace(",", "");
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
      payload: JSON.stringify({
        utr: utr,
        amount: amount,
        raw_sms: body.substring(0, 500)
      }),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    Logger.log("HeartSync API response: " + code + " | UTR: " + utr);

    if (code === 200 || code === 409) {
      // 200 = stored, 409 = already exists (ON CONFLICT DO NOTHING) — both are fine
      msg.getThread().addLabel(processedLabel);
      msg.markRead();
      Logger.log("✓ UTR " + utr + " stored. Card unlock ready for last 4 digits: " + utr.slice(-4));
    } else {
      Logger.log("✗ API error " + code + ": " + response.getContentText());
    }

  } catch (e) {
    Logger.log("✗ Fetch error: " + e.message);
  }
}

// ─── One-time setup: creates the 1-minute recurring trigger ──────────────────

function setupTrigger() {
  // Remove any existing triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "checkHdfcEmails") {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("checkHdfcEmails")
    .timeBased()
    .everyMinutes(1)
    .create();

  getOrCreateLabel(PROCESSED_LABEL);
  Logger.log("✓ Trigger created. checkHdfcEmails will run every 1 minute.");
}

// ─── Helper: get or create a Gmail label ─────────────────────────────────────

function getOrCreateLabel(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) label = GmailApp.createLabel(name);
  return label;
}
