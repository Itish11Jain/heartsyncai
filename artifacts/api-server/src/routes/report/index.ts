import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { GenerateReportBody } from "@workspace/api-zod";
import { requireAuth } from "../../middleware/requireAuth.js";
import { pool } from "../../lib/db.js";

const router = Router();

const WINGMAN_SYSTEM_PROMPT = `You are HeartSync AI — a sharp, warm, and culturally aware dating advisor built for the Indian context. You understand Indian culture, social dynamics, and the nuances of modern dating across different cities, professions, and backgrounds.

Your audience is a mix of millennials and Gen Z — people who are thoughtful, sometimes nervous about first dates, and want advice that feels genuinely human. Your tone is supportive, smart, and lightly witty — never condescending, never over-the-top.

Language: Write entirely in English. Do not use any Hindi, Hinglish, or regional language phrases. Keep language clear, accessible, and balanced — suitable for anyone across India.

Personality:
- Confident and helpful — like a smart friend who has navigated a lot of dates themselves
- Lightly playful, not sarcastic
- Culturally aware of the Indian context without being stereotypical
- Practical — every suggestion should be something a real person can actually do

Tone examples:
"Don't open with 'Where do you work?' — it's the most predictable thing you could say. Instead try: 'On a scale of 1 to 10, how much do you actually miss working from home?' It's casual, low-pressure, and tells you a lot about who they are."

"If they're into K-Dramas, don't just say 'Nice hobby.' Try: 'If we were in a K-Drama, would this be the awkward first episode or the mid-season finale where it finally gets interesting?' It shows you were paying attention and you're not afraid to have a personality."

Important rules:
- Always respond in JSON format exactly as specified
- Each section's "content" should be ONE concise sentence (max 20 words) that frames the advice — keep it tight
- Each "items" array must have EXACTLY 3 items — no more, no fewer
- Each item must be a single, specific, actionable line — no long explanations
- All 3 items in every section are equally valuable — do NOT include a "recommendedIndex" field
- For "innerGame": focus on how to behave and carry yourself during the date — posture, pace, presence, listening cues, when to speak vs. let silence breathe. Practical behaviour, not abstract mindset slogans.
- For "openingGambit": give one simple, easy question or line that breaks the ice naturally and makes the other person feel at ease immediately. The opener should invite them to talk and feel low-pressure — not clever or scripted.
- For "iqQuestions": write questions that show genuine curiosity about this specific person's interests, hobbies, and life — questions that nudge them to share and participate. Not trivia. Not showing off. Just warm curiosity that invites a real answer.
- For "conversationClosers": give natural, warm ways to wrap up the date so both people leave feeling good. Each closer should feel smooth and leave the door open for a potential next meeting — no awkward endings.
- Be crisp. Quality over quantity. A shorter, sharper insight beats a long vague one every time`;

interface ReportSection {
  title: string;
  content: string;
  items: string[];
  recommendedIndex?: number;
}

interface IntelligenceReport {
  partnerName: string;
  innerGame: ReportSection;
  openingGambit: ReportSection;
  iqQuestions: ReportSection;
  conversationClosers: ReportSection;
}

const previewRateLimit = new Map<string, { count: number; resetAt: number }>();

router.post("/report/preview", async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string ?? req.socket.remoteAddress ?? "unknown").split(",")[0]!.trim();
  const now = Date.now();
  const window = 60 * 60 * 1000;
  const entry = previewRateLimit.get(ip);

  if (entry && entry.resetAt > now) {
    if (entry.count >= 5) {
      res.status(429).json({ error: "rate_limited", message: "Too many previews. Please try again later." });
      return;
    }
    entry.count += 1;
  } else {
    previewRateLimit.set(ip, { count: 1, resetAt: now + window });
  }

  const parseResult = GenerateReportBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request body." });
    return;
  }

  const { partnerName, occasion, knownDetails, vibe } = parseResult.data;

  const previewPrompt = `Generate ONLY the innerGame section of a date advice report for:
- Partner's name: ${partnerName}
- Occasion/Date type: ${occasion}
- Known details: ${knownDetails || "Not much — going in with limited information."}
- Desired vibe: ${vibe || "Relaxed but memorable"}

Return ONLY this JSON (EXACTLY 3 items, no extra fields):
{
  "innerGame": {
    "title": "How to Carry Yourself",
    "content": "One sentence on how to carry yourself on this date",
    "items": ["specific behaviour tip 1", "specific behaviour tip 2", "specific behaviour tip 3"]
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 400,
      messages: [
        { role: "system", content: WINGMAN_SYSTEM_PROMPT },
        { role: "user", content: previewPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "generation_failed", message: "Something went wrong. Please try again." });
      return;
    }

    const data = JSON.parse(content) as { innerGame: { title: string; content: string; items: string[] } };
    req.log.info({ ip }, "Preview generated");
    res.json({ innerGame: data.innerGame });
  } catch (err) {
    req.log.error({ err }, "Preview generation failed");
    res.status(500).json({ error: "server_error", message: "Something went wrong on our end. Please try again." });
  }
});

router.post("/report/generate", requireAuth, async (req, res) => {
  if (req.user!.credits <= 0) {
    res.status(403).json({
      error: "no_credits",
      message: "No reports left. Buy a pack to continue.",
    });
    return;
  }

  const parseResult = GenerateReportBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request body" });
    return;
  }

  const { partnerName, occasion, knownDetails, vibe } = parseResult.data;

  const userPrompt = `Generate a date intelligence report for:
- Partner's name: ${partnerName}
- Occasion/Date type: ${occasion}
- Known details about them: ${knownDetails || "Not much — going in with limited information."}
- Desired vibe: ${vibe || "Relaxed but memorable"}

Return ONLY a valid JSON object with this exact structure (EXACTLY 3 items per section, no recommendedIndex):
{
  "partnerName": "${partnerName}",
  "innerGame": {
    "title": "Inner Game",
    "content": "One sentence on how to carry yourself on this date",
    "items": ["specific behaviour tip 1", "specific behaviour tip 2", "specific behaviour tip 3"]
  },
  "openingGambit": {
    "title": "The Opening Gambit",
    "content": "One sentence on why a simple, easy opener puts them at ease",
    "items": ["low-pressure opener or question 1", "low-pressure opener or question 2", "low-pressure opener or question 3"]
  },
  "iqQuestions": {
    "title": "IQ Questions",
    "content": "One sentence on how these questions show curiosity and invite real conversation",
    "items": ["interest/hobby question 1", "interest/hobby question 2", "interest/hobby question 3"]
  },
  "conversationClosers": {
    "title": "Conversation Closers",
    "content": "One sentence on ending the date warmly and leaving the door open",
    "items": ["warm closer 1", "warm closer 2", "warm closer 3"]
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1200,
      messages: [
        { role: "system", content: WINGMAN_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({
        error: "generation_failed",
        message: "Something went wrong generating your report. Please try again.",
      });
      return;
    }

    const report = JSON.parse(content) as IntelligenceReport;

    const updated = await pool.query<{ credits: number }>(
      "UPDATE hs_users SET credits = credits - 1 WHERE id = $1 RETURNING credits",
      [req.user!.userId],
    );
    await pool.query(
      "INSERT INTO hs_credit_logs (user_id, delta, reason) VALUES ($1, $2, $3)",
      [req.user!.userId, -1, "report_generated"],
    );

    const creditsRemaining = updated.rows[0]?.credits ?? 0;

    req.log.info({ userId: req.user!.userId, creditsRemaining }, "Report generated");

    res.json({ ...report, creditsRemaining });
  } catch (err) {
    req.log.error({ err }, "Report generation failed");
    res.status(500).json({
      error: "server_error",
      message: "Something went wrong on our end. Please try again in a moment.",
    });
  }
});

export default router;
