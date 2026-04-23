import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../../middleware/requireAuth.js";
import { verifySession } from "../../lib/session.js";
import { pool } from "../../lib/db.js";
import { GenerateMomentBody } from "@workspace/api-zod";

const router = Router();

const PURPOSE_TONE: Record<string, string> = {
  thank_you: "warm gratitude — the card should feel sincere and appreciative, like a heartfelt thank-you that makes the person feel truly seen",
  sorry: "sincere apology with a light touch — honest and genuine, not overly dramatic, leaving the person feeling understood and reassured",
  i_love_you: "romantic and tender — deeply felt, intimate, and personal without being over-the-top",
  feel_good: "uplifting and playful — bright, positive energy that makes the person smile and feel valued",
};

const RELATION_REGISTER: Record<string, string> = {
  date: "early-stage warmth — keep it slightly cautious yet genuinely charming, as if you're just getting to know each other",
  friend: "casual and easy — the kind of message a close friend would love to receive, natural and warm",
  partner: "comfortable intimacy — you know each other well, so the message can be a bit more personal and affectionate",
  spouse: "deep bond — the message should carry the weight of a long shared history and unconditional love",
};

const MOMENT_SYSTEM_PROMPT = `You are HeartSync Moments — a warm, culturally aware card message writer for modern Indians aged 18–35.

Your job: write a short, personalised card message that will be displayed on a beautiful animated greeting card.

Rules:
- Write in Easy English — simple, warm, and natural. Not overly formal or flowery.
- 2–3 sentences maximum. Every word must earn its place.
- The message should feel personal and human — not like a template.
- Address the recipient by name at least once.
- No emojis. No hashtags. No sign-off (no "Love," or "Yours truly").
- The message must read beautifully on its own when displayed as text on a card.
- Respond with ONLY a JSON object: { "message": "..." }`;

function validateUtr(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  const isUpiRef = /^\d{12}$/.test(v);
  const isBankUtr = /^[A-Za-z]{4}[A-Za-z0-9]{12,18}$/.test(v);
  return isUpiRef || isBankUtr;
}

router.post("/moment/generate", async (req, res) => {
  const parseResult = GenerateMomentBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request body." });
    return;
  }

  const { recipientName, purpose, relation, likes } = parseResult.data;

  let userId: number | null = null;

  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const payload = verifySession(token);
      const userRow = await pool.query<{ id: number }>(
        "SELECT id FROM hs_users WHERE id = $1",
        [payload.userId],
      );
      if (userRow.rows.length > 0) {
        userId = payload.userId;
      }
    } catch {
      // Invalid token — treat as guest
    }
  }

  if (userId !== null) {
    const creditRow = await pool.query<{ moments_credits: number }>(
      "SELECT moments_credits FROM hs_users WHERE id = $1",
      [userId],
    );
    const currentCredits = creditRow.rows[0]?.moments_credits ?? 0;
    if (currentCredits <= 0) {
      res.status(403).json({
        error: "MOMENTS_OUT_OF_CREDITS",
        message: "You've used all your Moments credits. Top up to continue.",
        momentsCredits: 0,
      });
      return;
    }
  }

  const userPrompt = `Write a card message for:
- Recipient's name: ${recipientName}
- Purpose: ${PURPOSE_TONE[purpose]}
- Relationship: ${RELATION_REGISTER[relation]}${likes ? `\n- Things they love: ${likes} (weave a subtle reference to one of these into the message if it fits naturally — don't force it)` : ""}`;

  let generatedMessage: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 200,
      messages: [
        { role: "system", content: MOMENT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "generation_failed", message: "Something went wrong. Please try again." });
      return;
    }

    const data = JSON.parse(content) as { message: string };
    if (!data.message || typeof data.message !== "string") {
      res.status(500).json({ error: "generation_failed", message: "Something went wrong. Please try again." });
      return;
    }

    generatedMessage = data.message;
  } catch (err) {
    req.log.error({ err }, "Moment generation failed");
    res.status(500).json({ error: "server_error", message: "Something went wrong on our end. Please try again." });
    return;
  }

  if (userId !== null) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM hs_users WHERE id = $1 FOR UPDATE", [userId]);

      const creditRow = await client.query<{ moments_credits: number }>(
        "SELECT moments_credits FROM hs_users WHERE id = $1",
        [userId],
      );
      const currentCredits = creditRow.rows[0]?.moments_credits ?? 0;

      if (currentCredits <= 0) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "MOMENTS_OUT_OF_CREDITS",
          message: "You've used all your Moments credits. Top up to continue.",
          momentsCredits: 0,
        });
        return;
      }

      await client.query(
        "UPDATE hs_users SET moments_credits = moments_credits - 1 WHERE id = $1",
        [userId],
      );
      await client.query(
        `INSERT INTO hs_moments (user_id, purpose, relation, recipient, message) VALUES ($1, $2, $3, $4, $5)`,
        [userId, purpose, relation, recipientName, generatedMessage],
      );
      await client.query("COMMIT");

      req.log.info({ userId, purpose, relation }, "Moment generated (credits)");

      res.json({ message: generatedMessage, momentsCredits: currentCredits - 1 });
    } catch (err) {
      await client.query("ROLLBACK");
      req.log.error({ err }, "Moment insert failed");
      res.status(500).json({ error: "server_error", message: "Something went wrong on our end. Please try again." });
    } finally {
      client.release();
    }
    return;
  }

  req.log.info({ purpose, relation }, "Moment generated (guest)");
  res.json({ message: generatedMessage, momentsCredits: null });
});

router.post("/moment/payment", requireAuth, async (req, res) => {
  const { utr } = req.body as { utr?: unknown };

  if (!validateUtr(utr)) {
    res.status(400).json({
      error: "validation_error",
      message: "Invalid UTR format. Enter the 12-digit UPI reference or bank transaction ID.",
    });
    return;
  }

  const cleanUtr = (utr as string).trim().toUpperCase();

  const existing = await pool.query("SELECT id FROM hs_utr_submissions WHERE utr = $1", [cleanUtr]);
  if ((existing.rowCount ?? 0) > 0) {
    res.status(409).json({
      error: "duplicate_utr",
      message: "This transaction ID has already been used. Contact support if you think this is a mistake.",
    });
    return;
  }

  try {
    await pool.query("INSERT INTO hs_utr_submissions (utr, user_id) VALUES ($1, $2)", [cleanUtr, req.user!.userId]);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr?.code === "23505") {
      res.status(409).json({
        error: "duplicate_utr",
        message: "This transaction ID has already been used. Contact support if you think this is a mistake.",
      });
      return;
    }
    throw err;
  }

  const updated = await pool.query<{ moments_credits: number }>(
    "UPDATE hs_users SET moments_credits = moments_credits + 10 WHERE id = $1 RETURNING moments_credits",
    [req.user!.userId],
  );
  await pool.query(
    "INSERT INTO hs_credit_logs (user_id, delta, reason) VALUES ($1, $2, $3)",
    [req.user!.userId, 10, `moments_utr_payment:${cleanUtr}`],
  );

  const momentsCredits = updated.rows[0]?.moments_credits ?? 10;

  req.log.info(
    { utrMasked: `${cleanUtr.slice(0, 4)}****${cleanUtr.slice(-4)}`, userId: req.user!.userId, momentsCredits },
    "Moments UTR payment recorded",
  );

  res.json({ ok: true, momentsCredits });
});

router.get("/moment/status", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  const result = await pool.query<{ moments_credits: number }>(
    "SELECT moments_credits FROM hs_users WHERE id = $1",
    [userId],
  );

  const momentsCredits = result.rows[0]?.moments_credits ?? 0;
  res.json({ momentsCredits });
});

export default router;
