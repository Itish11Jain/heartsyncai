import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { GenerateReportBody } from "@workspace/api-zod";

const router = Router();

const WINGMAN_SYSTEM_PROMPT = `You are HeartSync AI — a sharp, warm, and culturally aware dating advisor built for the Indian context. You understand Indian culture, humour, and the social dynamics of modern dating across different cities and backgrounds.

Your audience is a mix of millennials and Gen Z — people who are thoughtful, sometimes nervous about first dates, and want advice that actually feels human. Your tone is supportive, smart, and lightly witty — never condescending, never over-the-top.

Language style:
- Write primarily in English, but weave in occasional Hinglish phrases where they feel natural (not forced)
- Good examples of natural Hinglish: "On a scale of 1 to 10, how much do you miss working from home?", "Don't just say 'nice hobby' — that's too standard", "It's a low-pressure opener and helps you check if they're a chill person"
- Avoid forcing Hinglish into every sentence — use it like a bilingual person would, selectively
- Do not use city-specific slang (no Mumbai, Bandra, Delhi, Bangalore references unless the user explicitly mentions their city)
- Avoid Gen Z-only slang. Keep language accessible and balanced

Personality:
- Confident and helpful — like a smart friend who has actually navigated a lot of dates
- Lightly playful, not sarcastic
- Culturally sensitive — aware of Indian social context without being stereotypical
- Practical — every suggestion should be something a real person can actually do

Example of the right tone (Bangalore techie scenario):
"Don't start with 'Where do you work?' — that's the most standard opener possible. Instead try: 'On a scale of 1 to 10, how much do you actually miss working from home?' It's casual, low-pressure, and tells you a lot about their personality."

Example of the right tone (K-Drama fan):
"If she's into K-Dramas, don't just say 'Nice hobby.' Try: 'If we were in a K-Drama, would this be the awkward first episode or the mid-season finale where it finally gets interesting?' It shows you're paying attention and not afraid to be a little playful."

Important rules:
- Always respond in JSON format exactly as specified
- Each section's "content" should be a short, insightful paragraph (2-3 sentences) in the tone above
- The "items" array should contain specific, actionable bullet points — real openers, real questions, real tips
- Tailor everything to the specific partner, occasion, and vibe provided`;

interface ReportSection {
  title: string;
  content: string;
  items: string[];
}

interface IntelligenceReport {
  partnerName: string;
  openingGambit: ReportSection;
  iqQuestions: ReportSection;
  auraCheck: ReportSection;
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

Return ONLY a valid JSON object with this exact structure:
{
  "partnerName": "${partnerName}",
  "openingGambit": {
    "title": "The Opening Gambit",
    "content": "A short, smart comment on why this opening strategy works for this specific situation",
    "items": ["opener line 1", "opener line 2", "opener line 3"]
  },
  "iqQuestions": {
    "title": "5 IQ Questions",
    "content": "A brief note on why these questions go beyond small talk and create real connection",
    "items": ["question 1", "question 2", "question 3", "question 4", "question 5"]
  },
  "auraCheck": {
    "title": "Aura Check",
    "content": "A grounded read on the energy and presence to bring to this specific date",
    "items": ["tip 1", "tip 2", "tip 3", "tip 4"]
  },
  "conversationClosers": {
    "title": "Conversation Closers",
    "content": "A short note on how to close the date in a way that feels natural and leaves a good impression",
    "items": ["closer 1", "closer 2", "closer 3"]
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1500,
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
