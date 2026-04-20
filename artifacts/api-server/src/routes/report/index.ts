import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { GenerateReportBody } from "@workspace/api-zod";

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
- Each section must include a "recommendedIndex" field (0, 1, or 2) — the index of the single strongest item
- For "innerGame": give mindset and energy tips that work for any first date — not specific to the partner's details
- For "openingGambit": keep openers casual and conversational — they should feel natural to say, not scripted or hyper-specific
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

router.post("/report/generate", async (req, res) => {
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

Return ONLY a valid JSON object with this exact structure (EXACTLY 3 items per section, plus recommendedIndex 0–2):
{
  "partnerName": "${partnerName}",
  "innerGame": {
    "title": "Inner Game",
    "content": "One sentence on the mindset to carry into this date",
    "items": ["mindset tip 1", "energy tip 2", "confidence tip 3"],
    "recommendedIndex": 0
  },
  "openingGambit": {
    "title": "The Opening Gambit",
    "content": "One sentence on why a casual, low-pressure open works better than a formal one",
    "items": ["casual opener 1", "casual opener 2", "casual opener 3"],
    "recommendedIndex": 1
  },
  "iqQuestions": {
    "title": "IQ Questions",
    "content": "One sentence on why these questions go beyond small talk",
    "items": ["question 1", "question 2", "question 3"],
    "recommendedIndex": 2
  },
  "conversationClosers": {
    "title": "Conversation Closers",
    "content": "One sentence on how to close naturally and leave a strong impression",
    "items": ["closer 1", "closer 2", "closer 3"],
    "recommendedIndex": 0
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
      res.status(500).json({ error: "generation_failed", message: "Something went wrong generating your report. Please try again." });
      return;
    }

    const report = JSON.parse(content) as IntelligenceReport;
    res.json(report);
  } catch (err) {
    req.log.error({ err }, "Report generation failed");
    res.status(500).json({ error: "server_error", message: "Something went wrong on our end. Please try again in a moment." });
  }
});

export default router;
