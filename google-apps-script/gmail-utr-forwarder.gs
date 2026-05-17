/**
 * HeartSync AI — Gmail UTR Auto-Forwarder (final version)
 *
 * Finds HDFC ₹99 credit emails, extracts the UPI Reference No.,
 * and POSTs it to the HeartSync API so customers can unlock instantly.
 *
 * Uses PropertiesService to track processed message IDs so new payments
 * in the same Gmail thread are never skipped.
 *
 * SETUP (one-time)
 * ────────────────
 * 1. script.google.com → paste this file → save (Ctrl+S)
 * 2. Fill in HEARTSYNC_API_SECRET below
 * 3. Run → setupTrigger (approve Gmail permission)
 * 4. Run → reprocessPast  (catches any missed past emails)
 * Done — every new ₹99 credit is forwarded within 1 minute automatically.
 */

var HEARTSYNC_API_URL    = "https://heartsync.in/api/internal/upi-payment";
var HEARTSYNC_API_SECRET = "PASTE_YOUR_ADMIN_SECRET_HERE";  // ← fill this in
var AMOUNT_FILTER        = "99";

// ─── Main — runs every 1 minute ─────────────────────────────────────────────

function checkHdfcEmails() {
  // Search only for the unique phrase that appears in HDFC credit emails.
  // No sender filter (HDFC uses hdfcbank.bank.in which breaks from: filters).
  // No label filter — we track by message ID instead so threads work correctly.
  var threads = GmailApp.search('"UPI Reference No"', 0, 20);
  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(msg) {
      if (!isProcessed(msg.getId())) {
        processMessage(msg);
      }
    });
  });
}

// ─── Reprocess past emails ───────────────────────────────────────────────────

function reprocessPast() {
  var threads = GmailApp.search('"UPI Reference No"', 0, 100);
  Logger.log("Threads found: " + threads.length);
  var count = 0;
  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(msg) {
      if (!isProcessed(msg.getId())) {
        processMessage(msg);
        count++;
      } else {
        Logger.log("Already processed: " + msg.getId());
      }
    });
  });
  Logger.log("reprocessPast complete — processed " + count + " new messages.");
}

// ─── Process a single email ──────────────────────────────────────────────────

function processMessage(msg) {
  var body = msg.getPlainBody() || msg.getBody();

  // Extract 12-digit UTR
  var utrMatch = body.match(/UPI Reference No\.?\s*[:\-]?\s*(\d{12})/i)
              || body.match(/UPI transaction reference number is\s*(\d{12})/i);
  if (!utrMatch) return;
  var utr = utrMatch[1];

  // Extract amount
  var amountMatch = body.match(/Rs\.?\s*([\d,]+(?:\.\d+)?)\s+has been successfully credited/i)
                 || body.match(/Rs\.?\s*([\d,]+(?:\.\d+)?)\s+is\s+successfully\s+credited/i);
  if (!amountMatch) return;

  var amount = amountMatch[1].replace(/,/g, "");
  if (parseFloat(amount) !== parseFloat(AMOUNT_FILTER)) {
    Logger.log("Skipping non-₹99 payment: Rs." + amount + " | UTR " + utr);
    markProcessed(msg.getId());  // mark so we don't check again
    return;
  }

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
      markProcessed(msg.getId());
      Logger.log("✓ UTR " + utr + " stored. Customer unlocks with last 4: " + utr.slice(-4));
    } else {
      Logger.log("✗ API error " + code + ": " + response.getContentText() + " | UTR: " + utr);
    }
  } catch (e) {
    Logger.log("✗ Fetch error: " + e.message);
  }
}

// ─── Message ID tracking (survives across trigger runs) ─────────────────────

function isProcessed(msgId) {
  return PropertiesService.getScriptProperties().getProperty("msg_" + msgId) === "1";
}

function markProcessed(msgId) {
  PropertiesService.getScriptProperties().setProperty("msg_" + msgId, "1");
}

// ─── One-time setup ──────────────────────────────────────────────────────────

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "checkHdfcEmails") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("checkHdfcEmails").timeBased().everyMinutes(1).create();
  Logger.log("✓ Trigger set — checkHdfcEmails runs every 1 minute.");
}
