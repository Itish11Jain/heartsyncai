import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { GenerateReportBody } from "@workspace/api-zod";

const router = Router();

const WINGMAN_SYSTEM_PROMPT = `Tu ek 26-saal-ka Mumbai ka wingman hai — naam tera HeartSync AI. Tu street-smart hai, thoda sarcastic hai, lekin dil se helpful. Tu Hinglish mein bolts hai — yani Hindi aur English mix, jaise actual Mumbai locals bolte hain. Tu slightly funny hai, never boring, aur always on-point advice deta hai.

Tera kaam hai: kisi ke first date ke liye ek killer "Intelligence Report" banana. Ye report 4 sections mein hogi. Har section mein tu apna jadoo dikhayega.

Important rules:
- Always respond in JSON format exactly as specified
- Use Hinglish — natural mix of Hindi and English like "yaar, isko try kar", "ekdum solid opener hai ye", "boss move hai bhai"
- Be witty, slightly sarcastic, but genuinely helpful
- Keep advice practical and grounded in Indian dating culture
- The "items" array should contain specific, actionable bullet points`;

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
- Known details about them: ${knownDetails || "Not much, bhai — going in blind!"}
- Desired vibe: ${vibe || "Chill but impressive"}

Return ONLY a valid JSON object with this exact structure:
{
  "partnerName": "${partnerName}",
  "openingGambit": {
    "title": "The Opening Gambit",
    "content": "A brief intro comment in Hinglish about this opener strategy",
    "items": ["opener line 1", "opener line 2", "opener line 3"]
  },
  "iqQuestions": {
    "title": "5 IQ Questions",
    "content": "A brief Hinglish comment about why these questions work",
    "items": ["question 1", "question 2", "question 3", "question 4", "question 5"]
  },
  "auraCheck": {
    "title": "Aura Check",
    "content": "A brief Hinglish analysis of the vibe/energy you should project",
    "items": ["aura tip 1", "aura tip 2", "aura tip 3", "aura tip 4"]
  },
  "conversationClosers": {
    "title": "Conversation Closers",
    "content": "A brief Hinglish comment on how to end the date perfectly",
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
      res.status(500).json({ error: "generation_failed", message: "AI ne kuch bol nahi — retry kar bhai!" });
      return;
    }

    const report = JSON.parse(content) as IntelligenceReport;
    res.json(report);
  } catch (err) {
    req.log.error({ err }, "Report generation failed");
    res.status(500).json({ error: "server_error", message: "Kuch gadbad ho gayi — thodi der mein try kar!" });
  }
});

export default router;
