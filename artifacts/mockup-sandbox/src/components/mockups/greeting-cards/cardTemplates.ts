export type Occasion = "thank_you" | "sorry" | "feel_good";
export type Relationship = "friend" | "partner" | "generic";

export interface OrbData {
  emoji: string;
  compliment: string;
  color: string;
}

export interface CardTemplate {
  occasion: Occasion;
  relationship: Relationship;
  titlePrefix: string;
  finalMessage: string;
  orbs: OrbData[];
  palette: {
    bg: string;
    cardBg: string;
    cardText: string;
    accent: string;
    envelopeBody: string;
    envelopeFlap: string;
  };
}

const TEMPLATES: CardTemplate[] = [
  {
    occasion: "thank_you",
    relationship: "friend",
    titlePrefix: "Thank you,",
    finalMessage:
      "Having you in my life is a gift I'll always be grateful for. Thank you for everything you are. 💛",
    orbs: [
      { emoji: "🌟", compliment: "You light up every room you walk into!", color: "#fbbf24" },
      { emoji: "🙏", compliment: "Your generosity knows no bounds.", color: "#f59e0b" },
      { emoji: "🎁", compliment: "You always give without expecting anything back.", color: "#ec4899" },
      { emoji: "💛", compliment: "Your friendship means the world to me.", color: "#facc15" },
      { emoji: "🌈", compliment: "You make even ordinary days extraordinary.", color: "#a78bfa" },
      { emoji: "✨", compliment: "You inspire me to be a better person.", color: "#38bdf8" },
    ],
    palette: {
      bg: "#0f0c1a",
      cardBg: "linear-gradient(145deg, #1c1340 0%, #2a1a5e 50%, #1a1035 100%)",
      cardText: "#e0d4ff",
      accent: "#a78bfa",
      envelopeBody: "linear-gradient(158deg, #f5f0d8 0%, #ede5c0 45%, #e0d5a8 100%)",
      envelopeFlap: "linear-gradient(172deg, #d6c98a 0%, #c8b870 55%, #b8a455 100%)",
    },
  },
  {
    occasion: "thank_you",
    relationship: "partner",
    titlePrefix: "Thank you,",
    finalMessage:
      "Every day with you is a reminder of how lucky I am. Thank you for being my everything. ❤️",
    orbs: [
      { emoji: "❤️", compliment: "You make my heart feel so full.", color: "#f43f5e" },
      { emoji: "🌹", compliment: "Your love is the most beautiful thing I know.", color: "#e11d48" },
      { emoji: "💫", compliment: "You understand me like no one else ever has.", color: "#c084fc" },
      { emoji: "🏡", compliment: "With you, anywhere feels like home.", color: "#fb923c" },
      { emoji: "🥂", compliment: "Here's to every adventure still ahead of us.", color: "#fbbf24" },
    ],
    palette: {
      bg: "#0d0509",
      cardBg: "linear-gradient(145deg, #3d0b1a 0%, #5a1027 50%, #3a0d22 100%)",
      cardText: "#ffd5e0",
      accent: "#f43f5e",
      envelopeBody: "linear-gradient(158deg, #f8eef0 0%, #f2dde2 45%, #e8cdd4 100%)",
      envelopeFlap: "linear-gradient(172deg, #deb8c4 0%, #cfa4b2 55%, #c09098 100%)",
    },
  },
  {
    occasion: "sorry",
    relationship: "friend",
    titlePrefix: "I'm sorry,",
    finalMessage:
      "Our friendship means more to me than I can ever express. I'm truly sorry, and I hope you know how much I care. 🤍",
    orbs: [
      { emoji: "🤍", compliment: "I value your friendship more than words can say.", color: "#cbd5e1" },
      { emoji: "🌿", compliment: "You always know how to find peace even in chaos.", color: "#4ade80" },
      { emoji: "🕊️", compliment: "Your grace and forgiveness amaze me.", color: "#93c5fd" },
      { emoji: "🫂", compliment: "You give the best hugs — real or virtual.", color: "#f9a8d4" },
      { emoji: "🌧️", compliment: "You stay by my side through every storm.", color: "#60a5fa" },
      { emoji: "🌱", compliment: "You help me grow into a better version of myself.", color: "#86efac" },
    ],
    palette: {
      bg: "#050e14",
      cardBg: "linear-gradient(145deg, #0a1f2e 0%, #112a3d 50%, #0c1e2c 100%)",
      cardText: "#bfdbfe",
      accent: "#60a5fa",
      envelopeBody: "linear-gradient(158deg, #ddeef8 0%, #cce0ef 45%, #b8d0e4 100%)",
      envelopeFlap: "linear-gradient(172deg, #93c5fd 0%, #7bb3ef 55%, #60a0d8 100%)",
    },
  },
  {
    occasion: "sorry",
    relationship: "partner",
    titlePrefix: "I'm sorry,",
    finalMessage:
      "You are my safe place, and I never want to be the reason you feel unsafe. I'm deeply sorry. 💜",
    orbs: [
      { emoji: "💜", compliment: "Your patience with me means everything.", color: "#a855f7" },
      { emoji: "🌙", compliment: "You are my calm in every storm.", color: "#818cf8" },
      { emoji: "🫶", compliment: "You love with your whole heart and it shows.", color: "#f9a8d4" },
      { emoji: "💌", compliment: "Every moment we share is one I treasure.", color: "#e879f9" },
      { emoji: "🌸", compliment: "Your gentleness makes the world softer.", color: "#f472b6" },
    ],
    palette: {
      bg: "#0d0614",
      cardBg: "linear-gradient(145deg, #1e0a3c 0%, #2d1250 50%, #1c0a38 100%)",
      cardText: "#e9d5ff",
      accent: "#a855f7",
      envelopeBody: "linear-gradient(158deg, #ede8f8 0%, #dfd5f0 45%, #d0c5e8 100%)",
      envelopeFlap: "linear-gradient(172deg, #c4b5fd 0%, #a78bfa 55%, #8b5cf6 100%)",
    },
  },
  {
    occasion: "feel_good",
    relationship: "generic",
    titlePrefix: "Hey,",
    finalMessage:
      "You are incredible, and don't you ever forget it. The world is genuinely better with you in it. ☀️",
    orbs: [
      { emoji: "☀️", compliment: "Your smile could brighten the darkest day.", color: "#fbbf24" },
      { emoji: "💪", compliment: "You are so much stronger than you realise.", color: "#fb923c" },
      { emoji: "🌺", compliment: "You bloom beautifully through every challenge.", color: "#f472b6" },
      { emoji: "🦋", compliment: "You are always evolving into something amazing.", color: "#a78bfa" },
      { emoji: "🎉", compliment: "Celebrating you today and every day!", color: "#34d399" },
      { emoji: "🔥", compliment: "Your passion is absolutely contagious.", color: "#f97316" },
    ],
    palette: {
      bg: "#070e07",
      cardBg: "linear-gradient(145deg, #0f2a10 0%, #1a3d1b 50%, #102512 100%)",
      cardText: "#d1fae5",
      accent: "#34d399",
      envelopeBody: "linear-gradient(158deg, #ecfdf5 0%, #d1fae5 45%, #bbf7d0 100%)",
      envelopeFlap: "linear-gradient(172deg, #6ee7b7 0%, #4ade80 55%, #22c55e 100%)",
    },
  },
];

const GENERIC_FALLBACK: CardTemplate = TEMPLATES[4];

export function resolveTemplate(
  occasion: string,
  relationship: string,
): CardTemplate {
  const exact = TEMPLATES.find(
    (t) => t.occasion === occasion && t.relationship === relationship,
  );
  if (exact) return exact;
  const sameOccasion = TEMPLATES.find(
    (t) => t.occasion === occasion && t.relationship === "generic",
  );
  return sameOccasion ?? GENERIC_FALLBACK;
}

export { TEMPLATES };
