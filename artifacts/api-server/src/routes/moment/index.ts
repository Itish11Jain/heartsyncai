import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../../middleware/requireAuth.js";
import { pool } from "../../lib/db.js";
import { GenerateMomentBody } from "@workspace/api-zod";

const router = Router();

const MOMENTS_LIMIT = 3;

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

router.post("/moment/generate", requireAuth, async (req, res) => {
  const parseResult = GenerateMomentBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request body." });
    return;
  }

  const { recipientName, purpose, relation, likes } = parseResult.data;
  const userId = req.user!.userId;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const preCheck = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM hs_moments
     WHERE user_id = $1 AND created_at >= $2`,
    [userId, monthStart],
  );
  const preUsed = parseInt(preCheck.rows[0]?.count ?? "0", 10);
  if (preUsed >= MOMENTS_LIMIT) {
    res.status(403).json({
      error: "MOMENT_LIMIT_REACHED",
      message: `You've used all ${MOMENTS_LIMIT} free moments for this month. Come back next month!`,
      momentsUsed: preUsed,
      momentsLimit: MOMENTS_LIMIT,
    });
    return;
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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "SELECT id FROM hs_users WHERE id = $1 FOR UPDATE",
      [userId],
    );

    const countResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM hs_moments
       WHERE user_id = $1 AND created_at >= $2`,
      [userId, monthStart],
    );
    const momentsUsed = parseInt(countResult.rows[0]?.count ?? "0", 10);

    if (momentsUsed >= MOMENTS_LIMIT) {
      await client.query("ROLLBACK");
      res.status(403).json({
        error: "MOMENT_LIMIT_REACHED",
        message: `You've used all ${MOMENTS_LIMIT} free moments for this month. Come back next month!`,
        momentsUsed,
        momentsLimit: MOMENTS_LIMIT,
      });
      return;
    }

    await client.query(
      `INSERT INTO hs_moments (user_id, purpose, relation, recipient, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, purpose, relation, recipientName, generatedMessage],
    );

    await client.query("COMMIT");

    req.log.info({ userId, purpose, relation }, "Moment generated");

    res.json({
      message: generatedMessage,
      momentsUsed: momentsUsed + 1,
      momentsLimit: MOMENTS_LIMIT,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    req.log.error({ err }, "Moment insert failed");
    res.status(500).json({ error: "server_error", message: "Something went wrong on our end. Please try again." });
  } finally {
    client.release();
  }
});

router.get("/moment/status", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM hs_moments
     WHERE user_id = $1 AND created_at >= $2`,
    [userId, monthStart],
  );

  const momentsUsed = parseInt(countResult.rows[0]?.count ?? "0", 10);

  res.json({ momentsUsed, momentsLimit: MOMENTS_LIMIT });
});

export default router;
