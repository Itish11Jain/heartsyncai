export type Occasion = "thank_you" | "birthday" | "sorry" | "anniversary" | "feel_good" | "congratulations";
export type Relation = "friend" | "partner" | "spouse" | "date";

export interface OrbData {
  emoji: string;
  text: string;
}

export interface CardTemplate {
  title_prefix: string;
  orbs: OrbData[];
  final_message: string;
}

const TEMPLATES: Record<string, Record<string, CardTemplate>> = {
  thank_you: {
    friend: {
      title_prefix: "To the absolute legend",
      orbs: [
        { emoji: "🎮", text: "Always got my back when it counts." },
        { emoji: "🍕", text: "The absolute best late-night vibes." },
        { emoji: "💡", text: "Top-tier advice and brilliant ideas." },
        { emoji: "🔥", text: "Bringing the best energy to the room." },
      ],
      final_message: "Thank you for being an amazing friend. I truly appreciate you!",
    },
    partner: {
      title_prefix: "To my favorite person",
      orbs: [
        { emoji: "💖", text: "You make every single day better." },
        { emoji: "☕", text: "Thanks for keeping me sane and caffeinated." },
        { emoji: "🫂", text: "My ultimate safe space." },
        { emoji: "✨", text: "You are literal magic." },
      ],
      final_message: "Thank you for everything you do. I'm so lucky to have you.",
    },
    spouse: {
      title_prefix: "To my everything",
      orbs: [
        { emoji: "💍", text: "You are my greatest adventure." },
        { emoji: "🌙", text: "Every night feels complete with you." },
        { emoji: "🏡", text: "Home is wherever you are." },
        { emoji: "💫", text: "You make life extraordinary." },
      ],
      final_message: "Thank you for choosing me every single day. I love you deeply.",
    },
    date: {
      title_prefix: "To someone special",
      orbs: [
        { emoji: "😊", text: "You made me smile like I forgot how." },
        { emoji: "🌟", text: "Genuinely one of a kind." },
        { emoji: "🦋", text: "You give me the best butterflies." },
        { emoji: "🎯", text: "I'm so glad our paths crossed." },
      ],
      final_message: "Thank you for a genuinely amazing time. I can't stop smiling.",
    },
  },
  birthday: {
    friend: {
      title_prefix: "Another trip around the sun",
      orbs: [
        { emoji: "🎂", text: "Time to eat all the cake." },
        { emoji: "🥳", text: "Ready to celebrate you." },
        { emoji: "🎁", text: "You deserve the absolute best." },
        { emoji: "🥂", text: "Cheers to another amazing year!" },
      ],
      final_message: "Happy Birthday! Wishing you the most incredible year ahead!",
    },
    partner: {
      title_prefix: "Happy Birthday to my love",
      orbs: [
        { emoji: "🎈", text: "Every year with you is a gift." },
        { emoji: "💝", text: "You deserve every celebration." },
        { emoji: "🌹", text: "My heart is yours today and always." },
        { emoji: "🎊", text: "This year is going to be your best one yet." },
      ],
      final_message: "Happy Birthday, my love! I'm so grateful for every moment with you.",
    },
    spouse: {
      title_prefix: "To my partner in everything",
      orbs: [
        { emoji: "🎂", text: "Another year of loving you." },
        { emoji: "💑", text: "Life is beautiful because of you." },
        { emoji: "🥳", text: "Today is all about you, babe." },
        { emoji: "✨", text: "You light up every room you walk into." },
      ],
      final_message: "Happy Birthday! I fall more in love with you every single day.",
    },
    date: {
      title_prefix: "Celebrating you today",
      orbs: [
        { emoji: "🎉", text: "The world is better because you're in it." },
        { emoji: "🌟", text: "You deserve to feel amazing today." },
        { emoji: "🎂", text: "Make a wish — you've earned it." },
        { emoji: "😊", text: "Wishing you all the good things." },
      ],
      final_message: "Happy Birthday! Hope today is as wonderful as you are.",
    },
  },
  sorry: {
    partner: {
      title_prefix: "To my everything",
      orbs: [
        { emoji: "💔", text: "I hate fighting with you." },
        { emoji: "😔", text: "I was wrong, and I own that." },
        { emoji: "❤️‍🩹", text: "You mean the world to me." },
        { emoji: "🌹", text: "Let me make it up to you." },
      ],
      final_message: "I am so deeply sorry. I love you and I promise to do better.",
    },
    friend: {
      title_prefix: "To someone I value deeply",
      orbs: [
        { emoji: "🙁", text: "I handled that all wrong." },
        { emoji: "🤝", text: "Our friendship means everything." },
        { emoji: "💙", text: "I genuinely care about you." },
        { emoji: "🌱", text: "Let's grow from this together." },
      ],
      final_message: "I'm truly sorry. You deserve better from me, and I'll do better.",
    },
    spouse: {
      title_prefix: "To my heart",
      orbs: [
        { emoji: "💔", text: "I never want to hurt you." },
        { emoji: "🕊️", text: "I choose us, always." },
        { emoji: "❤️", text: "My love for you is unconditional." },
        { emoji: "🙏", text: "Please forgive me." },
      ],
      final_message: "I'm so sorry, my love. You are everything to me, and I'll never stop trying.",
    },
    date: {
      title_prefix: "To someone I care about",
      orbs: [
        { emoji: "😞", text: "I didn't mean to make you feel that way." },
        { emoji: "💫", text: "You deserve kindness and care." },
        { emoji: "🌸", text: "I hope we can move forward." },
        { emoji: "🙏", text: "I'm genuinely sorry." },
      ],
      final_message: "I'm sorry. I hope you'll give me a chance to make it right.",
    },
  },
  anniversary: {
    partner: {
      title_prefix: "To the one who stole my heart",
      orbs: [
        { emoji: "🥂", text: "Every day with you is worth celebrating." },
        { emoji: "🌹", text: "You make love feel effortless." },
        { emoji: "🌅", text: "So many beautiful memories made." },
        { emoji: "💫", text: "And so many more to come." },
      ],
      final_message: "Happy Anniversary, love. Every year with you is my favourite one yet.",
    },
    spouse: {
      title_prefix: "To my forever person",
      orbs: [
        { emoji: "💍", text: "Choosing you was the best thing I ever did." },
        { emoji: "🏡", text: "Every chapter with you is magic." },
        { emoji: "❤️", text: "My love for you only grows deeper." },
        { emoji: "🕯️", text: "Here's to forever and beyond." },
      ],
      final_message: "Happy Anniversary, my love. Thank you for being my home, my adventure, my everything.",
    },
    friend: {
      title_prefix: "To my ride-or-die",
      orbs: [
        { emoji: "🎉", text: "Years of memories and counting." },
        { emoji: "🤝", text: "Still the best person I know." },
        { emoji: "💛", text: "Our friendship is the real deal." },
        { emoji: "🥳", text: "Cheers to us!" },
      ],
      final_message: "Happy Friendversary! Here's to all the years ahead. So grateful for you.",
    },
    date: {
      title_prefix: "To someone unforgettable",
      orbs: [
        { emoji: "🦋", text: "You give me butterflies every single time." },
        { emoji: "🌟", text: "You've made this past year so special." },
        { emoji: "💌", text: "I still can't believe how lucky I am." },
        { emoji: "🥂", text: "Here's to many more." },
      ],
      final_message: "Happy Anniversary! You're the best part of every day. Here's to us.",
    },
  },
  feel_good: {
    friend: {
      title_prefix: "Hey you — yes, YOU",
      orbs: [
        { emoji: "🌟", text: "You are genuinely one of a kind." },
        { emoji: "💪", text: "Tougher and stronger than you know." },
        { emoji: "🌻", text: "The world is better with you in it." },
        { emoji: "✨", text: "Sending you all the good vibes." },
      ],
      final_message: "Just a reminder that you're incredible. Keep going — you've got this!",
    },
    partner: {
      title_prefix: "To my sunshine",
      orbs: [
        { emoji: "🌈", text: "You brighten even the grey days." },
        { emoji: "💖", text: "I see how hard you work, every day." },
        { emoji: "🫂", text: "I'm here for you, always." },
        { emoji: "🌟", text: "You deserve all the good things." },
      ],
      final_message: "I just want you to know — you're doing amazing. I'm so proud of you.",
    },
    spouse: {
      title_prefix: "To my person",
      orbs: [
        { emoji: "🏡", text: "Coming home to you resets everything." },
        { emoji: "💛", text: "You make even hard days better." },
        { emoji: "🌙", text: "I love who we are together." },
        { emoji: "✨", text: "You are extraordinary." },
      ],
      final_message: "I just wanted to remind you how much you matter. I love you so much.",
    },
    date: {
      title_prefix: "For someone I think about",
      orbs: [
        { emoji: "😊", text: "You have the best smile." },
        { emoji: "🦋", text: "You make me feel light." },
        { emoji: "🌸", text: "Just a little something to make you smile." },
        { emoji: "💫", text: "You deserve all good things." },
      ],
      final_message: "Just sending some good vibes your way. You deserve to feel amazing today!",
    },
  },
  congratulations: {
    friend: {
      title_prefix: "Look at you go!",
      orbs: [
        { emoji: "🏆", text: "You absolutely crushed it." },
        { emoji: "🎊", text: "I knew you had this in you." },
        { emoji: "🥂", text: "Time to celebrate — big time." },
        { emoji: "🔥", text: "Honestly? Not even surprised." },
      ],
      final_message: "Congratulations!! I'm SO proud of you. You worked hard for this and you deserve every bit of it!",
    },
    partner: {
      title_prefix: "To the most capable person I know",
      orbs: [
        { emoji: "🌟", text: "I always knew you'd make it here." },
        { emoji: "💪", text: "Your hard work is finally paying off." },
        { emoji: "🎊", text: "This is just the beginning." },
        { emoji: "💖", text: "So incredibly proud of you." },
      ],
      final_message: "Congratulations, love! Watching you achieve your dreams is the most beautiful thing. So proud!",
    },
    spouse: {
      title_prefix: "My person — what a star!",
      orbs: [
        { emoji: "🏆", text: "You made it look easy — it wasn't." },
        { emoji: "💫", text: "I've watched you work so hard for this." },
        { emoji: "🎉", text: "Today is YOUR day." },
        { emoji: "❤️", text: "I'm your biggest fan, always." },
      ],
      final_message: "Congratulations! You deserve every celebration today. I'm so proud to be by your side.",
    },
    date: {
      title_prefix: "Celebrating you!",
      orbs: [
        { emoji: "🎊", text: "This is such big news!" },
        { emoji: "🌟", text: "You should feel really good about this." },
        { emoji: "🥂", text: "A proper celebration is in order." },
        { emoji: "✨", text: "Genuinely happy for you." },
      ],
      final_message: "Congratulations! This is amazing news. You should be so proud of yourself!",
    },
  },
};

export function getTemplate(occasion: string, relation: string): CardTemplate | null {
  return TEMPLATES[occasion]?.[relation] ?? null;
}

export function getFallbackTemplate(occasion: string): CardTemplate {
  const occasionTemplates = TEMPLATES[occasion];
  if (occasionTemplates) {
    const firstKey = Object.keys(occasionTemplates)[0];
    return occasionTemplates[firstKey];
  }
  return {
    title_prefix: "A special message",
    orbs: [
      { emoji: "💖", text: "You are amazing." },
      { emoji: "✨", text: "You make everything brighter." },
      { emoji: "🌟", text: "The world is better with you in it." },
      { emoji: "🎉", text: "Here's to you!" },
    ],
    final_message: "Wishing you all the happiness in the world.",
  };
}

export const OCCASIONS: { id: Occasion; label: string; emoji: string; description: string }[] = [
  { id: "birthday", label: "Birthday", emoji: "🎂", description: "Celebrate their special day" },
  { id: "anniversary", label: "Anniversary", emoji: "🥂", description: "Celebrate your time together" },
  { id: "congratulations", label: "Congrats!", emoji: "🏆", description: "Celebrate their achievement" },
  { id: "feel_good", label: "Feel Good", emoji: "🌟", description: "Brighten someone's day" },
  { id: "thank_you", label: "Thank You", emoji: "🙏", description: "Show your appreciation" },
  { id: "sorry", label: "Sorry", emoji: "💔", description: "Make things right" },
];

export const RELATIONS: { id: Relation; label: string; sub: string; emoji: string }[] = [
  { id: "friend", label: "Friend", sub: "Close friend", emoji: "👯" },
  { id: "partner", label: "Partner", sub: "Girlfriend / Boyfriend", emoji: "💑" },
  { id: "spouse", label: "Spouse", sub: "Wife / Husband", emoji: "💍" },
  { id: "date", label: "Date", sub: "First date or crush", emoji: "🦋" },
];
