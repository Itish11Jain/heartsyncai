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

/* ═══════════════════════════ COSMIC TEMPLATES ════════════════════════════ */

export interface CosmicStar {
  emoji: string;
  text: string;
}

export interface CosmicTemplate {
  hook_title: string;
  title_prefix: string;
  stars: CosmicStar[];
  final_message: string;
}

const COSMIC: Record<string, Record<string, CosmicTemplate>> = {
  thank_you: {
    friend: {
      hook_title: "✨ A Universe of Thanks ✨",
      title_prefix: "To the brightest star",
      stars: [
        { emoji: "🎮", text: "Always got my back when it counts." },
        { emoji: "🍕", text: "The absolute best late-night vibes." },
        { emoji: "💡", text: "Top-tier advice and brilliant ideas." },
        { emoji: "🔥", text: "Bringing the best energy to the room." },
      ],
      final_message: "Thank you for being an amazing friend. My universe is better with you in it!",
    },
    partner: {
      hook_title: "✨ You are my Universe ✨",
      title_prefix: "To my favourite person",
      stars: [
        { emoji: "💖", text: "You make every single day better." },
        { emoji: "☕", text: "Thanks for keeping me sane." },
        { emoji: "🫂", text: "My ultimate safe space." },
        { emoji: "✨", text: "You are literal magic." },
      ],
      final_message: "Thank you for everything you do. I'm so lucky to orbit with you.",
    },
    spouse: {
      hook_title: "✨ You are my Everything ✨",
      title_prefix: "To my person",
      stars: [
        { emoji: "💍", text: "My greatest adventure, always." },
        { emoji: "🌙", text: "Every night feels complete with you." },
        { emoji: "🏡", text: "Home is wherever you are." },
        { emoji: "💫", text: "You make life extraordinary." },
      ],
      final_message: "Thank you for choosing me every single day. I love you deeply.",
    },
    date: {
      hook_title: "✨ You Made My World Brighter ✨",
      title_prefix: "To someone wonderful",
      stars: [
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
      hook_title: "✨ Another Trip Around the Sun ✨",
      title_prefix: "Happy Solar Return",
      stars: [
        { emoji: "🎂", text: "Time to eat all the cake." },
        { emoji: "🥳", text: "Ready to celebrate you." },
        { emoji: "🎁", text: "You deserve the absolute best." },
        { emoji: "🥂", text: "Cheers to another amazing year!" },
      ],
      final_message: "Happy Birthday! Wishing you the most incredible year ahead!",
    },
    partner: {
      hook_title: "✨ A Stellar Birthday ✨",
      title_prefix: "To the centre of my universe",
      stars: [
        { emoji: "💘", text: "My absolute favourite person." },
        { emoji: "🎉", text: "I love celebrating you." },
        { emoji: "🍰", text: "Even sweeter than the cake." },
        { emoji: "🌟", text: "My shining star today and always." },
      ],
      final_message: "Happy Birthday, my love! I love celebrating you today and every single day.",
    },
    spouse: {
      hook_title: "✨ A Cosmic Celebration ✨",
      title_prefix: "To my favourite human",
      stars: [
        { emoji: "💍", text: "The love of my life." },
        { emoji: "🎉", text: "I never want to stop celebrating you." },
        { emoji: "🌹", text: "You grow more beautiful every year." },
        { emoji: "🌟", text: "My constant star in this galaxy." },
      ],
      final_message: "Happy Birthday, my love. Every year with you is the best year yet.",
    },
    date: {
      hook_title: "✨ A Stellar Day for a Stellar Person ✨",
      title_prefix: "Happy Birthday",
      stars: [
        { emoji: "🦋", text: "Something about you is just magnetic." },
        { emoji: "🎂", text: "Eat all the cake — you deserve it." },
        { emoji: "✨", text: "You light up every room you're in." },
        { emoji: "🥂", text: "Here's to you and this incredible year!" },
      ],
      final_message: "Happy Birthday! Wishing you a day as wonderful as you are.",
    },
  },
  anniversary: {
    friend: {
      hook_title: "✨ Here's to Us ✨",
      title_prefix: "To my ride-or-die",
      stars: [
        { emoji: "🌱", text: "Look how far we've come." },
        { emoji: "🤝", text: "The most dependable person I know." },
        { emoji: "🎉", text: "Years of memories and counting." },
        { emoji: "💛", text: "Here's to many more adventures." },
      ],
      final_message: "Happy Anniversary! So grateful our friendship has stood the test of time.",
    },
    partner: {
      hook_title: "✨ One More Orbit Together ✨",
      title_prefix: "To the love of my life",
      stars: [
        { emoji: "💖", text: "Every day with you is a gift." },
        { emoji: "🌙", text: "My favourite feeling is home — and you're it." },
        { emoji: "🎉", text: "Celebrating us. Always." },
        { emoji: "🚀", text: "So many more adventures ahead." },
      ],
      final_message: "Happy Anniversary, my love. Here's to us — today, tomorrow, and always.",
    },
    spouse: {
      hook_title: "✨ A Lifetime of Stars ✨",
      title_prefix: "To my forever person",
      stars: [
        { emoji: "💍", text: "The best yes I ever said." },
        { emoji: "🌹", text: "More in love with you every single day." },
        { emoji: "🏡", text: "Every home is paradise with you." },
        { emoji: "🌌", text: "You are my whole universe." },
      ],
      final_message: "Happy Anniversary. Choosing you is the greatest thing I've ever done.",
    },
    date: {
      hook_title: "✨ Something Worth Celebrating ✨",
      title_prefix: "Here's to you and me",
      stars: [
        { emoji: "🦋", text: "Still get butterflies with you." },
        { emoji: "😊", text: "You make everything more fun." },
        { emoji: "✨", text: "Something magical about us." },
        { emoji: "🥂", text: "Cheers to whatever this beautiful thing is." },
      ],
      final_message: "Here's to us. I'm so happy we found each other.",
    },
  },
  sorry: {
    friend: {
      hook_title: "✨ I Messed Up ✨",
      title_prefix: "To my amazing friend",
      stars: [
        { emoji: "🌧️", text: "I feel terrible about what happened." },
        { emoji: "🥺", text: "I value our friendship too much to lose it." },
        { emoji: "🤝", text: "I want to make things right." },
        { emoji: "⏳", text: "Take your time, but know I'm sorry." },
      ],
      final_message: "I am truly sorry. Let's move past this when you're ready.",
    },
    partner: {
      hook_title: "✨ Let Me Make It Right ✨",
      title_prefix: "To my everything",
      stars: [
        { emoji: "💔", text: "I hate fighting with you." },
        { emoji: "😔", text: "I was wrong, and I own that." },
        { emoji: "❤️‍🩹", text: "You mean the world to me." },
        { emoji: "🌹", text: "Let me make it up to you." },
      ],
      final_message: "I am so deeply sorry. I love you and I promise to do better.",
    },
    spouse: {
      hook_title: "✨ I'm So Sorry ✨",
      title_prefix: "To the person I love most",
      stars: [
        { emoji: "💔", text: "It hurts me to have hurt you." },
        { emoji: "😔", text: "I was completely wrong." },
        { emoji: "❤️‍🩹", text: "Your happiness means everything to me." },
        { emoji: "🌹", text: "I will make this right." },
      ],
      final_message: "I am deeply sorry. I love you and I will do better, always.",
    },
    date: {
      hook_title: "✨ I'm Sorry ✨",
      title_prefix: "To someone I care about",
      stars: [
        { emoji: "🌧️", text: "I didn't mean for things to go that way." },
        { emoji: "🥺", text: "I really do care about you." },
        { emoji: "🤝", text: "I'd love the chance to make it up." },
        { emoji: "✨", text: "You're worth so much more than that." },
      ],
      final_message: "I'm sorry. You deserve better, and I want to show you that.",
    },
  },
  feel_good: {
    friend: {
      hook_title: "✨ A Stellar Reminder ✨",
      title_prefix: "Just so you know",
      stars: [
        { emoji: "🌟", text: "You are a literal star." },
        { emoji: "👑", text: "Don't let your crown slip." },
        { emoji: "💪", text: "You are stronger than you know." },
        { emoji: "🚀", text: "You are destined for great things." },
      ],
      final_message: "Never forget how incredibly awesome you are. Keep shining!",
    },
    partner: {
      hook_title: "✨ A Love Note from the Galaxy ✨",
      title_prefix: "Just so you know",
      stars: [
        { emoji: "🌟", text: "You are a literal star." },
        { emoji: "💖", text: "You are so deeply loved." },
        { emoji: "💪", text: "You can handle anything." },
        { emoji: "🚀", text: "Destined for extraordinary things." },
      ],
      final_message: "You are incredible. Never forget that for a single second.",
    },
    spouse: {
      hook_title: "✨ A Love Note from the Galaxy ✨",
      title_prefix: "Just so you know",
      stars: [
        { emoji: "💍", text: "The best thing that ever happened to me." },
        { emoji: "🌟", text: "You shine so incredibly bright." },
        { emoji: "💪", text: "Unstoppable — always." },
        { emoji: "💛", text: "Loved beyond words." },
      ],
      final_message: "You are my everything. I hope you never forget that.",
    },
    date: {
      hook_title: "✨ A Little Cosmic Cheer ✨",
      title_prefix: "Just so you know",
      stars: [
        { emoji: "🌟", text: "You are genuinely special." },
        { emoji: "😊", text: "Your smile is everything." },
        { emoji: "✨", text: "Something about you is magical." },
        { emoji: "🚀", text: "The world needs more of you in it." },
      ],
      final_message: "Just wanted you to know you're pretty amazing. Keep being you!",
    },
  },
  congratulations: {
    friend: {
      hook_title: "✨ A Supernova Achievement ✨",
      title_prefix: "You did it!",
      stars: [
        { emoji: "🏆", text: "Absolute champion behavior." },
        { emoji: "👏", text: "So incredibly well deserved." },
        { emoji: "🍾", text: "Time to pop the champagne!" },
        { emoji: "🚀", text: "The sky is truly the limit." },
      ],
      final_message: "Huge congratulations on your achievement! So incredibly proud of you.",
    },
    partner: {
      hook_title: "✨ A Supernova Achievement ✨",
      title_prefix: "You did it, superstar!",
      stars: [
        { emoji: "🏆", text: "You worked so hard for this." },
        { emoji: "💖", text: "I'm so unbelievably proud of you." },
        { emoji: "🍾", text: "Champagne is calling!" },
        { emoji: "🌟", text: "The world hasn't seen anything yet." },
      ],
      final_message: "Congratulations! Your achievement is extraordinary, and so are you.",
    },
    spouse: {
      hook_title: "✨ My Champion ✨",
      title_prefix: "Look at you go!",
      stars: [
        { emoji: "🏆", text: "You earned every bit of this." },
        { emoji: "💍", text: "Proudest partner in the universe." },
        { emoji: "🍾", text: "We are absolutely celebrating this!" },
        { emoji: "🌟", text: "Limitless — that's you." },
      ],
      final_message: "Congratulations! I've never been more proud. Let's celebrate you!",
    },
    date: {
      hook_title: "✨ Way to Go! ✨",
      title_prefix: "You absolutely did it!",
      stars: [
        { emoji: "🏆", text: "This is so well deserved." },
        { emoji: "👏", text: "Seriously impressive." },
        { emoji: "🍾", text: "This calls for a celebration." },
        { emoji: "✨", text: "You are genuinely unstoppable." },
      ],
      final_message: "Congratulations! You should be so proud of yourself today.",
    },
  },
};

export function getCosmicTemplate(occasion: string, relation: string): CosmicTemplate | null {
  return COSMIC[occasion]?.[relation] ?? COSMIC[occasion]?.["friend"] ?? null;
}

export function getCosmicFallback(occasion: string): CosmicTemplate {
  const oc = COSMIC[occasion];
  if (oc) return Object.values(oc)[0];
  return {
    hook_title: "✨ A Stellar Surprise ✨",
    title_prefix: "A message from the stars",
    stars: [
      { emoji: "🌟", text: "You light up the room." },
      { emoji: "💖", text: "Truly one of a kind." },
      { emoji: "✨", text: "The universe conspired to make you." },
      { emoji: "🚀", text: "Limitless — always." },
    ],
    final_message: "Wishing you all the happiness in the universe.",
  };
}

/* ═══════════════════════════ VINYL TEMPLATES ═════════════════════════════ */

export interface VinylTrack {
  emoji: string;
  title: string;
  text: string;
}

export interface VinylTemplate {
  album_title: string;
  title_prefix: string;
  side_label: string;
  tracks: VinylTrack[];
  final_message: string;
}

const VINYL: Record<string, Record<string, VinylTemplate>> = {
  thank_you: {
    friend: {
      album_title: "Thank You, Legend",
      title_prefix: "To the absolute legend",
      side_label: "Side A — For My Absolute Favourite",
      tracks: [
        { emoji: "🎮", title: "Always There", text: "Always got my back when it counts." },
        { emoji: "🍕", title: "Late Night Vibes", text: "The absolute best late-night energy." },
        { emoji: "💡", title: "Bright Ideas", text: "Top-tier advice and brilliant ideas." },
        { emoji: "🔥", title: "Good Energy", text: "Bringing the best energy to the room." },
      ],
      final_message: "Thank you for being an amazing friend. I truly appreciate you!",
    },
    partner: {
      album_title: "For My Favourite Person",
      title_prefix: "To my favourite person",
      side_label: "Side A — A Mixtape of Gratitude",
      tracks: [
        { emoji: "💖", title: "Better Every Day", text: "You make every single day better." },
        { emoji: "☕", title: "Keeping Me Sane", text: "Thanks for the calm in the chaos." },
        { emoji: "🫂", title: "Safe Place", text: "My ultimate safe space — always." },
        { emoji: "✨", title: "Literal Magic", text: "You are, quite simply, magic." },
      ],
      final_message: "Thank you for everything you do. I'm so lucky to have you.",
    },
    spouse: {
      album_title: "To My Everything",
      title_prefix: "To my everything",
      side_label: "Side A — A Love Mixtape",
      tracks: [
        { emoji: "💍", title: "Greatest Adventure", text: "You are my greatest adventure." },
        { emoji: "🌙", title: "Complete", text: "Every night feels complete with you." },
        { emoji: "🏡", title: "Home", text: "Home is wherever you are." },
        { emoji: "💫", title: "Extraordinary", text: "You make life extraordinary." },
      ],
      final_message: "Thank you for choosing me every single day. I love you deeply.",
    },
    date: {
      album_title: "Something Special",
      title_prefix: "To someone special",
      side_label: "Side A — For Someone Unforgettable",
      tracks: [
        { emoji: "😊", title: "That Smile", text: "You made me smile like I forgot how." },
        { emoji: "🌟", title: "One of a Kind", text: "Genuinely one of a kind." },
        { emoji: "🦋", title: "Butterflies", text: "You give me the best butterflies." },
        { emoji: "🎯", title: "Glad We Met", text: "I'm so glad our paths crossed." },
      ],
      final_message: "Thank you for a genuinely amazing time. I can't stop smiling.",
    },
  },
  birthday: {
    friend: {
      album_title: "Happy Birthday, Legend",
      title_prefix: "Another trip around the sun",
      side_label: "Side A — Birthday Bangers",
      tracks: [
        { emoji: "🎂", title: "Eat the Cake", text: "Time to eat all the cake — zero guilt." },
        { emoji: "🥳", title: "Celebrate You", text: "Ready to celebrate you properly." },
        { emoji: "🎁", title: "You Deserve It", text: "You deserve the absolute best." },
        { emoji: "🥂", title: "Cheers!", text: "Cheers to another amazing year!" },
      ],
      final_message: "Happy Birthday! Wishing you the most incredible year ahead!",
    },
    partner: {
      album_title: "Happy Birthday, My Love",
      title_prefix: "Happy birthday, my love",
      side_label: "Side A — For the Centre of My World",
      tracks: [
        { emoji: "🎈", title: "Every Year a Gift", text: "Every year with you is a gift." },
        { emoji: "💝", title: "Every Celebration", text: "You deserve every celebration." },
        { emoji: "🌹", title: "Always Yours", text: "My heart is yours today and always." },
        { emoji: "🎊", title: "Best Year Yet", text: "This year is going to be your best one yet." },
      ],
      final_message: "Happy Birthday, my love! I'm so grateful for every moment with you.",
    },
    spouse: {
      album_title: "To My Partner in Everything",
      title_prefix: "To my partner in everything",
      side_label: "Side A — A Birthday Mixtape",
      tracks: [
        { emoji: "🎂", title: "Another Year of Love", text: "Another year of loving you." },
        { emoji: "💑", title: "Beautiful Life", text: "Life is beautiful because of you." },
        { emoji: "🥳", title: "All About You", text: "Today is all about you, babe." },
        { emoji: "✨", title: "Every Room", text: "You light up every room you walk into." },
      ],
      final_message: "Happy Birthday! I fall more in love with you every single day.",
    },
    date: {
      album_title: "Celebrating You Today",
      title_prefix: "Celebrating you today",
      side_label: "Side A — For Someone Wonderful",
      tracks: [
        { emoji: "🎉", title: "World Is Better", text: "The world is better because you're in it." },
        { emoji: "🌟", title: "Feel Amazing", text: "You deserve to feel amazing today." },
        { emoji: "🎂", title: "Make a Wish", text: "Make a wish — you've earned it." },
        { emoji: "😊", title: "All Good Things", text: "Wishing you all the good things." },
      ],
      final_message: "Happy Birthday! Hope today is as wonderful as you are.",
    },
  },
  sorry: {
    partner: {
      album_title: "Let Me Make It Right",
      title_prefix: "To my everything",
      side_label: "Side A — From the Heart",
      tracks: [
        { emoji: "💔", title: "Hate Fighting", text: "I hate fighting with you." },
        { emoji: "😔", title: "I Was Wrong", text: "I was wrong, and I own that." },
        { emoji: "❤️‍🩹", title: "You Mean the World", text: "You mean the world to me." },
        { emoji: "🌹", title: "Let Me Try", text: "Let me make it up to you." },
      ],
      final_message: "I am so deeply sorry. I love you and I promise to do better.",
    },
    friend: {
      album_title: "I'm Sorry, Truly",
      title_prefix: "To someone I value deeply",
      side_label: "Side A — Because You Matter",
      tracks: [
        { emoji: "🙁", title: "I Was Wrong", text: "I handled that all wrong." },
        { emoji: "🤝", title: "Friendship First", text: "Our friendship means everything." },
        { emoji: "💙", title: "I Care", text: "I genuinely care about you." },
        { emoji: "🌱", title: "Grow Together", text: "Let's grow from this together." },
      ],
      final_message: "I'm truly sorry. You deserve better from me, and I'll do better.",
    },
    spouse: {
      album_title: "To My Heart",
      title_prefix: "To my heart",
      side_label: "Side A — A Heartfelt Apology",
      tracks: [
        { emoji: "💔", title: "Never Want to Hurt You", text: "I never want to hurt you." },
        { emoji: "🕊️", title: "I Choose Us", text: "I choose us, always." },
        { emoji: "❤️", title: "Unconditional", text: "My love for you is unconditional." },
        { emoji: "🙏", title: "Please Forgive Me", text: "Please forgive me." },
      ],
      final_message: "I'm so sorry, my love. You are everything to me, and I'll never stop trying.",
    },
    date: {
      album_title: "An Honest Apology",
      title_prefix: "To someone I care about",
      side_label: "Side A — Because You Deserve Better",
      tracks: [
        { emoji: "😞", title: "Didn't Mean It", text: "I didn't mean to make you feel that way." },
        { emoji: "💫", title: "You Deserve Kindness", text: "You deserve kindness and care." },
        { emoji: "🌸", title: "Moving Forward", text: "I hope we can move forward." },
        { emoji: "🙏", title: "Genuinely Sorry", text: "I'm genuinely sorry." },
      ],
      final_message: "I'm sorry. I hope you'll give me a chance to make it right.",
    },
  },
  feel_good: {
    friend: {
      album_title: "A Reminder, Just for You",
      title_prefix: "Hey you — yes, YOU",
      side_label: "Side A — Hey You — Yes, YOU",
      tracks: [
        { emoji: "🌟", title: "One of a Kind", text: "You are genuinely one of a kind." },
        { emoji: "💪", title: "Stronger Than You Know", text: "Tougher and stronger than you know." },
        { emoji: "🌻", title: "The World Needs You", text: "The world is better with you in it." },
        { emoji: "✨", title: "Good Vibes", text: "Sending you all the good vibes." },
      ],
      final_message: "Just a reminder that you're incredible. Keep going — you've got this!",
    },
    partner: {
      album_title: "To My Sunshine",
      title_prefix: "To my sunshine",
      side_label: "Side A — You Are Doing Great",
      tracks: [
        { emoji: "🌈", title: "Grey Days Brighter", text: "You brighten even the grey days." },
        { emoji: "💖", title: "I See You", text: "I see how hard you work, every day." },
        { emoji: "🫂", title: "Always Here", text: "I'm here for you, always." },
        { emoji: "🌟", title: "All the Good Things", text: "You deserve all the good things." },
      ],
      final_message: "I just want you to know — you're doing amazing. I'm so proud of you.",
    },
    spouse: {
      album_title: "To My Person",
      title_prefix: "To my person",
      side_label: "Side A — A Love Note",
      tracks: [
        { emoji: "🏡", title: "Home Reset", text: "Coming home to you resets everything." },
        { emoji: "💛", title: "Hard Days Easy", text: "You make even hard days better." },
        { emoji: "🌙", title: "Who We Are", text: "I love who we are together." },
        { emoji: "✨", title: "Extraordinary", text: "You are extraordinary." },
      ],
      final_message: "I just wanted to remind you how much you matter. I love you so much.",
    },
    date: {
      album_title: "A Little Something",
      title_prefix: "For someone special",
      side_label: "Side A — For Someone Special",
      tracks: [
        { emoji: "😊", title: "That Smile", text: "You have the best smile." },
        { emoji: "🦋", title: "Feeling Light", text: "You make me feel light." },
        { emoji: "🌸", title: "Just Smiling", text: "Just a little something to make you smile." },
        { emoji: "💫", title: "Good Things Coming", text: "You deserve all good things." },
      ],
      final_message: "Just sending some good vibes your way. You deserve to feel amazing today!",
    },
  },
  congratulations: {
    friend: {
      album_title: "Look at You Go!",
      title_prefix: "Look at you go",
      side_label: "Side A — Absolute Champion",
      tracks: [
        { emoji: "🏆", title: "You Crushed It", text: "You absolutely crushed it." },
        { emoji: "🎊", title: "Knew You Had It", text: "I knew you had this in you." },
        { emoji: "🥂", title: "Big Time Celebrate", text: "Time to celebrate — big time." },
        { emoji: "🔥", title: "Not Even Surprised", text: "Honestly? Not even surprised." },
      ],
      final_message: "Congratulations!! I'm SO proud of you. You worked hard for this and you deserve every bit of it!",
    },
    partner: {
      album_title: "My Most Capable Person",
      title_prefix: "To the most capable person I know",
      side_label: "Side A — So Proud of You",
      tracks: [
        { emoji: "🌟", title: "Always Knew", text: "I always knew you'd make it here." },
        { emoji: "💪", title: "Paying Off", text: "Your hard work is finally paying off." },
        { emoji: "🎊", title: "Just the Beginning", text: "This is just the beginning." },
        { emoji: "💖", title: "Incredibly Proud", text: "So incredibly proud of you." },
      ],
      final_message: "Congratulations, love! Watching you achieve your dreams is the most beautiful thing. So proud!",
    },
    spouse: {
      album_title: "My Person — What a Star!",
      title_prefix: "My person — what a star",
      side_label: "Side A — Your Biggest Fan",
      tracks: [
        { emoji: "🏆", title: "Made It Look Easy", text: "You made it look easy — it wasn't." },
        { emoji: "💫", title: "Watched You Work", text: "I've watched you work so hard for this." },
        { emoji: "🎉", title: "Your Day", text: "Today is YOUR day." },
        { emoji: "❤️", title: "Biggest Fan", text: "I'm your biggest fan, always." },
      ],
      final_message: "Congratulations! You deserve every celebration today. I'm so proud to be by your side.",
    },
    date: {
      album_title: "Celebrating You!",
      title_prefix: "Celebrating you",
      side_label: "Side A — Big News Energy",
      tracks: [
        { emoji: "🎊", title: "Big News", text: "This is such big news!" },
        { emoji: "🌟", title: "Feel Good", text: "You should feel really good about this." },
        { emoji: "🥂", title: "Proper Celebration", text: "A proper celebration is in order." },
        { emoji: "✨", title: "Happy for You", text: "Genuinely happy for you." },
      ],
      final_message: "Congratulations! This is amazing news. You should be so proud of yourself!",
    },
  },
};

/* ═══════════════════════════ CRYSTAL TEMPLATES ═══════════════════════════ */

export interface CrystalNode {
  emoji: string;
  text: string;
}

export interface CrystalTemplate {
  hook_title: string;
  title_prefix: string;
  nodes: CrystalNode[];
  final_message: string;
}

const CRYSTAL: Record<string, Record<string, CrystalTemplate>> = {
  thank_you: {
    friend: {
      hook_title: "✦ The Crystal Speaks of Gratitude ✦",
      title_prefix: "To my absolute legend",
      nodes: [
        { emoji: "🎮", text: "The visions say: you always show up when it matters." },
        { emoji: "🍕", text: "The mist reveals: the best late-night energy." },
        { emoji: "💡", text: "The crystal sees: brilliant ideas and top-tier advice." },
        { emoji: "🔥", text: "The stars agree: you light up every room you enter." },
      ],
      final_message: "Thank you for being an amazing friend. The universe sees how much you mean to me.",
    },
    partner: {
      hook_title: "✦ The Ball Sees Only You ✦",
      title_prefix: "To my favourite person",
      nodes: [
        { emoji: "💖", text: "The crystal whispers: you make every day brighter." },
        { emoji: "☕", text: "The mist reveals: the calm in every storm." },
        { emoji: "🫂", text: "The visions say: my ultimate safe space." },
        { emoji: "✨", text: "The stars confirm: you are literal magic." },
      ],
      final_message: "Thank you for everything you are. The crystal ball has always known — I'm so lucky to have you.",
    },
    spouse: {
      hook_title: "✦ A Vision of Pure Love ✦",
      title_prefix: "To my everything",
      nodes: [
        { emoji: "💍", text: "The crystal sees: my greatest adventure." },
        { emoji: "🌙", text: "The mist whispers: every night is complete with you." },
        { emoji: "🏡", text: "The visions reveal: home is wherever you are." },
        { emoji: "💫", text: "The ball knows: you make life extraordinary." },
      ],
      final_message: "The crystal ball has always known what I feel. Thank you for choosing me every single day. I love you deeply.",
    },
    date: {
      hook_title: "✦ The Mist Reveals Something Special ✦",
      title_prefix: "To someone unforgettable",
      nodes: [
        { emoji: "😊", text: "The crystal sees: you made me smile like I forgot how." },
        { emoji: "🌟", text: "The visions confirm: genuinely one of a kind." },
        { emoji: "🦋", text: "The mist reveals: the most wonderful butterflies." },
        { emoji: "🎯", text: "The ball knew: our paths were meant to cross." },
      ],
      final_message: "The crystal ball saw this coming. Thank you for a genuinely amazing time — I can't stop smiling.",
    },
  },
  birthday: {
    friend: {
      hook_title: "✦ A Birthday Vision Awaits ✦",
      title_prefix: "Another trip around the sun",
      nodes: [
        { emoji: "🎂", text: "The crystal commands: eat all the cake — zero guilt." },
        { emoji: "🥳", text: "The visions say: the universe is ready to celebrate you." },
        { emoji: "🎁", text: "The mist reveals: you deserve the absolute best." },
        { emoji: "🥂", text: "The ball decrees: cheers to another incredible year!" },
      ],
      final_message: "The crystal ball has spoken — this year belongs to you! Happy Birthday!",
    },
    partner: {
      hook_title: "✦ The Crystal Glows for You ✦",
      title_prefix: "To the centre of my world",
      nodes: [
        { emoji: "🎈", text: "The crystal whispers: every year with you is a gift." },
        { emoji: "💝", text: "The visions confirm: you deserve every celebration." },
        { emoji: "🌹", text: "The mist reveals: my heart is yours, always." },
        { emoji: "🎊", text: "The ball declares: this year will be your most magical yet." },
      ],
      final_message: "Happy Birthday, my love! The crystal ball already knew — every year with you is my favourite one yet.",
    },
    spouse: {
      hook_title: "✦ Your Future Shines Bright ✦",
      title_prefix: "To my partner in everything",
      nodes: [
        { emoji: "🎂", text: "The crystal sees: another year of loving you." },
        { emoji: "💑", text: "The visions reveal: life is most beautiful because of you." },
        { emoji: "🥳", text: "The mist confirms: today is entirely, completely yours." },
        { emoji: "✨", text: "The ball knows: you light up every room you walk into." },
      ],
      final_message: "Happy Birthday! The crystal ball predicted it — I fall more in love with you every single day.",
    },
    date: {
      hook_title: "✦ The Stars Align for You Today ✦",
      title_prefix: "Celebrating you today",
      nodes: [
        { emoji: "🎉", text: "The crystal sees: the world is better because you're in it." },
        { emoji: "🌟", text: "The visions say: you deserve to feel amazing today." },
        { emoji: "🎂", text: "The mist reveals: make a wish — you've absolutely earned it." },
        { emoji: "😊", text: "The ball whispers: wishing you all the good things." },
      ],
      final_message: "Happy Birthday! The crystal ball agrees — today should be as wonderful as you are.",
    },
  },
  sorry: {
    friend: {
      hook_title: "✦ The Crystal Sees Your Worth ✦",
      title_prefix: "To someone I value deeply",
      nodes: [
        { emoji: "🙁", text: "The mist reveals: I handled that completely wrong." },
        { emoji: "🤝", text: "The crystal confirms: our friendship means everything to me." },
        { emoji: "💙", text: "The visions say: I genuinely care about you." },
        { emoji: "🌱", text: "The ball sees: let's grow past this together." },
      ],
      final_message: "The crystal ball sees the truth — I'm truly sorry. You deserve better from me, and I'll do better.",
    },
    partner: {
      hook_title: "✦ The Ball Knows My Heart ✦",
      title_prefix: "To my everything",
      nodes: [
        { emoji: "💔", text: "The crystal whispers: I hate that I hurt you." },
        { emoji: "😔", text: "The visions confirm: I was wrong, and I own that." },
        { emoji: "❤️‍🩹", text: "The mist reveals: you mean the world to me." },
        { emoji: "🌹", text: "The ball knows: let me make it up to you." },
      ],
      final_message: "The crystal ball has always known how much I love you. I am so deeply sorry. I promise to do better.",
    },
    spouse: {
      hook_title: "✦ Love Beyond Words ✦",
      title_prefix: "To my heart",
      nodes: [
        { emoji: "💔", text: "The crystal aches: I never want to hurt you." },
        { emoji: "🕊️", text: "The visions are clear: I choose us, always." },
        { emoji: "❤️", text: "The mist confirms: my love for you is unconditional." },
        { emoji: "🙏", text: "The ball pleads: please forgive me." },
      ],
      final_message: "The crystal ball has always seen our love. I'm so sorry. You are everything to me, and I'll never stop trying.",
    },
    date: {
      hook_title: "✦ A Vision of Honesty ✦",
      title_prefix: "To someone I care about",
      nodes: [
        { emoji: "😞", text: "The crystal reveals: I didn't mean to make you feel that way." },
        { emoji: "💫", text: "The visions confirm: you deserve kindness and care." },
        { emoji: "🌸", text: "The mist whispers: I hope we can move forward." },
        { emoji: "🙏", text: "The ball knows: I am genuinely sorry." },
      ],
      final_message: "The crystal ball sees your worth. I'm sorry — I hope you'll give me a chance to make it right.",
    },
  },
  anniversary: {
    friend: {
      hook_title: "✦ The Ball Sees Years of Magic ✦",
      title_prefix: "To my ride-or-die",
      nodes: [
        { emoji: "🌱", text: "The crystal reveals: look how far we've come together." },
        { emoji: "🤝", text: "The visions confirm: still the most dependable person I know." },
        { emoji: "🎉", text: "The mist shows: years of memories and counting." },
        { emoji: "💛", text: "The ball decrees: here's to many more adventures." },
      ],
      final_message: "The crystal ball always knew our friendship would stand the test of time. Happy Anniversary — so grateful for you!",
    },
    partner: {
      hook_title: "✦ A Vision of Forever ✦",
      title_prefix: "To the love of my life",
      nodes: [
        { emoji: "💖", text: "The crystal whispers: every day with you is a gift." },
        { emoji: "🌙", text: "The visions reveal: home is my favourite feeling — and you're it." },
        { emoji: "🎉", text: "The mist confirms: celebrating us, always." },
        { emoji: "🚀", text: "The ball sees: so many more adventures still ahead of us." },
      ],
      final_message: "The crystal ball always knew we were written in the stars. Happy Anniversary, my love — today, tomorrow, and always.",
    },
    spouse: {
      hook_title: "✦ The Crystal Sees Our Story ✦",
      title_prefix: "To my forever person",
      nodes: [
        { emoji: "💍", text: "The crystal glows: the best yes I ever said." },
        { emoji: "🌹", text: "The visions show: more in love with you every single day." },
        { emoji: "🏡", text: "The mist reveals: every home is paradise with you." },
        { emoji: "🌌", text: "The ball knows: you are my whole universe." },
      ],
      final_message: "The crystal ball has seen our whole story — and it's the most beautiful one it's ever shown. Happy Anniversary.",
    },
    date: {
      hook_title: "✦ The Mist Shows Something Beautiful ✦",
      title_prefix: "Here's to you and me",
      nodes: [
        { emoji: "🦋", text: "The crystal sees: still getting butterflies with you." },
        { emoji: "😊", text: "The visions confirm: you make everything more fun." },
        { emoji: "✨", text: "The mist reveals: something magical about what we have." },
        { emoji: "🥂", text: "The ball whispers: cheers to whatever this beautiful thing is." },
      ],
      final_message: "The crystal ball saw us coming. Here's to us — I'm so happy we found each other.",
    },
  },
  feel_good: {
    friend: {
      hook_title: "✦ The Crystal Sees a Star ✦",
      title_prefix: "Hey you — yes, YOU",
      nodes: [
        { emoji: "🌟", text: "The crystal confirms: you are genuinely one of a kind." },
        { emoji: "💪", text: "The visions reveal: tougher and stronger than you know." },
        { emoji: "🌻", text: "The mist is clear: the world is better with you in it." },
        { emoji: "✨", text: "The ball sends: all the good vibes, straight to you." },
      ],
      final_message: "The crystal ball has spoken — you're incredible. Keep going. You've absolutely got this!",
    },
    partner: {
      hook_title: "✦ A Vision of You ✦",
      title_prefix: "To my sunshine",
      nodes: [
        { emoji: "🌈", text: "The crystal sees: you brighten even the greyest days." },
        { emoji: "💖", text: "The visions confirm: I see how hard you work, every day." },
        { emoji: "🫂", text: "The mist reveals: I'm here for you — always." },
        { emoji: "🌟", text: "The ball decrees: you deserve all the good things." },
      ],
      final_message: "The crystal ball already knew — you're doing amazingly. I'm so proud of you.",
    },
    spouse: {
      hook_title: "✦ The Ball Reveals Pure Magic ✦",
      title_prefix: "To my person",
      nodes: [
        { emoji: "🏡", text: "The crystal whispers: coming home to you resets everything." },
        { emoji: "💛", text: "The visions confirm: you make even hard days beautiful." },
        { emoji: "🌙", text: "The mist shows: I love who we are together." },
        { emoji: "✨", text: "The ball declares: you are extraordinary." },
      ],
      final_message: "The crystal ball has always seen your worth. Just a reminder — you matter more than words can say. I love you.",
    },
    date: {
      hook_title: "✦ The Crystal Glows for Someone Special ✦",
      title_prefix: "For someone I think about",
      nodes: [
        { emoji: "😊", text: "The crystal sees: you have the most amazing smile." },
        { emoji: "🦋", text: "The visions reveal: you make everything feel lighter." },
        { emoji: "🌸", text: "The mist confirms: just a little something to make you smile." },
        { emoji: "💫", text: "The ball knows: you deserve every good thing coming your way." },
      ],
      final_message: "The crystal ball agrees — you deserve to feel amazing today. Sending all the good vibes your way!",
    },
  },
  congratulations: {
    friend: {
      hook_title: "✦ The Ball Predicted Your Success ✦",
      title_prefix: "Look at you go!",
      nodes: [
        { emoji: "🏆", text: "The crystal saw it: you absolutely crushed it." },
        { emoji: "🎊", text: "The visions confirm: I always knew you had it in you." },
        { emoji: "🥂", text: "The mist declares: time to celebrate — big time." },
        { emoji: "🔥", text: "The ball whispers: honestly? Not even surprised." },
      ],
      final_message: "The crystal ball predicted this all along. Congratulations — I'm SO proud of you! You worked hard and deserve every bit of it!",
    },
    partner: {
      hook_title: "✦ The Crystal Knew All Along ✦",
      title_prefix: "To the most capable person I know",
      nodes: [
        { emoji: "🌟", text: "The crystal always knew: you'd make it here." },
        { emoji: "💪", text: "The visions confirm: your hard work is finally paying off." },
        { emoji: "🎊", text: "The mist reveals: this is only the beginning." },
        { emoji: "💖", text: "The ball glows: so incredibly proud of you." },
      ],
      final_message: "The crystal ball has always seen your potential. Congratulations, love! Watching you achieve your dreams is the most beautiful thing.",
    },
    spouse: {
      hook_title: "✦ A Vision of Triumph ✦",
      title_prefix: "My person — what a star!",
      nodes: [
        { emoji: "🏆", text: "The crystal confirms: you made it look easy — it wasn't." },
        { emoji: "💫", text: "The visions reveal: I've watched you work so hard for this." },
        { emoji: "🎉", text: "The mist declares: today is entirely YOUR day." },
        { emoji: "❤️", text: "The ball knows: I'm your biggest fan, always and forever." },
      ],
      final_message: "The crystal ball always saw this moment coming. Congratulations! I've never been more proud to be by your side.",
    },
    date: {
      hook_title: "✦ The Stars Saw This Coming ✦",
      title_prefix: "Celebrating you!",
      nodes: [
        { emoji: "🎊", text: "The crystal announces: this is such incredible news!" },
        { emoji: "🌟", text: "The visions confirm: you should feel really, really good about this." },
        { emoji: "🥂", text: "The mist declares: a proper celebration is absolutely in order." },
        { emoji: "✨", text: "The ball glows: genuinely so happy for you." },
      ],
      final_message: "The crystal ball saw this achievement in your stars. Congratulations — you should be so proud of yourself!",
    },
  },
};

export function getCrystalTemplate(occasion: string, relation: string): CrystalTemplate | null {
  return CRYSTAL[occasion]?.[relation] ?? CRYSTAL[occasion]?.["friend"] ?? null;
}

export function getCrystalFallback(occasion: string): CrystalTemplate {
  const oc = CRYSTAL[occasion];
  if (oc) return Object.values(oc)[0];
  return {
    hook_title: "✦ The Crystal Ball Speaks ✦",
    title_prefix: "A vision just for you",
    nodes: [
      { emoji: "🌟", text: "The crystal sees: you light up the world." },
      { emoji: "💖", text: "The visions confirm: truly one of a kind." },
      { emoji: "✨", text: "The mist reveals: the universe conspired to make you." },
      { emoji: "🔮", text: "The ball whispers: limitless — always." },
    ],
    final_message: "The crystal ball has always seen your magic. Wishing you all the happiness in the universe.",
  };
}

export function getVinylTemplate(occasion: string, relation: string): VinylTemplate | null {
  return VINYL[occasion]?.[relation] ?? VINYL[occasion]?.["friend"] ?? null;
}

export function getVinylFallback(occasion: string): VinylTemplate {
  const oc = VINYL[occasion];
  if (oc) return Object.values(oc)[0];
  return {
    album_title: "A Mixtape for You",
    title_prefix: "This one's for you",
    side_label: "Side A — From the Heart",
    tracks: [
      { emoji: "💖", title: "You Are Amazing", text: "You are amazing." },
      { emoji: "✨", title: "Brighter Days", text: "You make everything brighter." },
      { emoji: "🌟", title: "Here for You", text: "The world is better with you in it." },
      { emoji: "🎉", title: "Here's to You", text: "Here's to you!" },
    ],
    final_message: "Wishing you all the happiness in the world.",
  };
}
