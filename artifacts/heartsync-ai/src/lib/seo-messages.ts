/**
 * SEO message-guide content model + seed data.
 *
 * These power the pre-rendered /messages directory: curated "what to write"
 * pages that capture long-tail organic search (e.g. "apology messages for
 * boyfriend") and funnel readers into the card builder via a one-click
 * "Create this card" deep link.
 *
 * SINGLE SOURCE OF TRUTH: this file is consumed by both the React pages
 * (client) and the build-time prerender script (server). Keep it free of any
 * browser-only APIs so it stays safe to import during SSR.
 *
 * URL shape:
 *   /messages                         → MessagesIndex   (all occasions)
 *   /messages/:occasionPath           → MessagesCategory (one occasion)
 *   /messages/:occasionPath/:slug     → MessageGuide     (one guide)
 *
 * `occasionPath` is the URL segment (clean, hyphenated). `occasion` is the
 * builder param key the card builder understands (matches OCCASIONS in
 * card-templates.ts). The "Create this card" CTA passes `occasion` + `text`.
 */

/** Canonical production origin (used for canonical + OG URLs). */
export const SITE_URL = "https://heartsync.in";

/** Builder occasion keys (must match card-templates.ts OCCASIONS). */
export type OccasionKey =
  | "sorry"
  | "feel_good"
  | "birthday"
  | "congratulations"
  | "thank_you";

export interface OccasionGroup {
  /** Clean URL segment, e.g. "love" or "thank-you". */
  path: string;
  /** Builder param key passed to /send?occasion=… */
  occasion: OccasionKey;
  /** Short label, e.g. "Apology". */
  label: string;
  emoji: string;
  /** One-line tagline shown on the index card + category hero. */
  tagline: string;
  /** Intro paragraph for the category page. */
  intro: string;
  /** Tailwind gradient classes used as the accent for this occasion. */
  accent: string;
}

export interface MessageGuide {
  /** Owning occasion's URL segment. */
  occasionPath: string;
  /** URL slug, e.g. "apology-messages-for-boyfriend". */
  slug: string;
  /** Audience/category label, e.g. "For Him". */
  category: string;
  /** Visible H1 (search-intent phrasing). */
  h1: string;
  /** <title> tag content. */
  title: string;
  /** <meta name="description">. */
  metaDescription: string;
  /** 1–2 sentence empathetic intro shown under the H1. */
  intro: string;
  /** Ready-to-use message templates. */
  messages: string[];
}

export const OCCASION_GROUPS: OccasionGroup[] = [
  {
    path: "sorry",
    occasion: "sorry",
    label: "Apology",
    emoji: "🥀",
    tagline: "Heartfelt ways to say you're sorry and make things right.",
    intro:
      "Saying sorry is hard. Whether you've hurt someone you love or let down a friend, the right words can open the door to forgiveness. Pick a message below, make it yours, and turn it into a card they'll never forget.",
    accent: "from-rose-500 to-pink-500",
  },
  {
    path: "love",
    occasion: "feel_good",
    label: "Love & Thinking of You",
    emoji: "💗",
    tagline: "Sweet notes to brighten their day and remind them they're loved.",
    intro:
      "Sometimes the smallest message means the most. A good-morning note, a thinking-of-you text, or a little reminder that you care — these words keep love alive across any distance. Find one you love and send it as a card.",
    accent: "from-pink-500 to-fuchsia-500",
  },
  {
    path: "birthday",
    occasion: "birthday",
    label: "Birthday",
    emoji: "🎂",
    tagline: "Birthday wishes for everyone you love, for every kind of bond.",
    intro:
      "A birthday is the one day that's all about them. Skip the boring \"Happy Birthday\" and send something that actually sounds like you. Pick a wish below and turn it into a card that makes their day.",
    accent: "from-amber-500 to-orange-500",
  },
  {
    path: "congratulations",
    occasion: "congratulations",
    label: "Congratulations",
    emoji: "🎉",
    tagline: "Celebrate their big wins — new jobs, promotions, and milestones.",
    intro:
      "Big moments deserve more than a thumbs-up. Whether it's a new job, a promotion, a wedding, or a new baby, a thoughtful message shows you're truly happy for them. Choose one and send your congratulations as a card.",
    accent: "from-violet-500 to-purple-500",
  },
  {
    path: "thank-you",
    occasion: "thank_you",
    label: "Thank You",
    emoji: "🙏",
    tagline: "Warm, genuine ways to show your gratitude.",
    intro:
      "Gratitude lands best when it's specific and heartfelt. Whether you're thanking a friend, a teacher, your boss, or someone who gave you a gift, the right words make people feel truly appreciated. Pick a thank-you below and send it as a card.",
    accent: "from-emerald-500 to-teal-500",
  },
];

export const MESSAGE_GUIDES: MessageGuide[] = [
  /* ─────────────────────────── SORRY ─────────────────────────── */
  {
    occasionPath: "sorry",
    slug: "apology-messages-for-boyfriend",
    category: "For Him",
    h1: "Apology Messages for Your Boyfriend",
    title: "Apology Messages for Boyfriend — Sweet Sorry Notes | HeartSync",
    metaDescription:
      "Heartfelt apology messages for your boyfriend to say sorry after a fight. Pick a message and turn it into a beautiful card in seconds.",
    intro:
      "Hurt the man you love? These honest, heartfelt sorry messages will help you say what you mean and start making things right.",
    messages: [
      "I'm sorry. I hate that I hurt you, and I hate even more that I let my pride get in the way of saying this sooner. You mean everything to me.",
      "I keep replaying what I said and I wish I could take it back. You deserve so much better from me, and I promise to do better. Please forgive me.",
      "I don't have the perfect words, just an honest heart that's sorry. You're my favourite person and I never want to be the reason you're sad.",
      "I was wrong. No excuses. I love you too much to let a silly fight come between us. Can we start over?",
      "Being upset with you feels worse than anything. I'm sorry for my part in this. Let's fix it together, because us is worth fixing.",
    ],
  },
  {
    occasionPath: "sorry",
    slug: "apology-messages-for-girlfriend",
    category: "For Her",
    h1: "Apology Messages for Your Girlfriend",
    title: "Apology Messages for Girlfriend — Heartfelt Sorry Notes | HeartSync",
    metaDescription:
      "Sweet, sincere apology messages for your girlfriend to say sorry and make up after an argument. Send it as a personalised card.",
    intro:
      "When you've hurt the woman you love, a real apology goes a long way. Use these heartfelt sorry messages to make things right.",
    messages: [
      "I'm sorry, my love. You didn't deserve that, and I never want to see that look in your eyes again. You're my whole world.",
      "I messed up, and I know it. I'd choose you a thousand times over any argument. Please let me make it up to you.",
      "Your happiness matters more to me than being right. I'm truly sorry. Forgive me?",
      "I hate going to sleep knowing you're upset with me. I'm sorry. I love you more than words, and I'll prove it every day.",
      "You are the best thing that's ever happened to me, and I'm sorry I forgot to act like it. I promise to cherish you better.",
    ],
  },
  {
    occasionPath: "sorry",
    slug: "sorry-messages-for-a-friend",
    category: "For a Friend",
    h1: "Sorry Messages for a Friend",
    title: "Sorry Messages for a Friend — Apologise & Make Up | HeartSync",
    metaDescription:
      "Genuine sorry messages to apologise to a friend after a fight or misunderstanding. Turn your apology into a thoughtful card.",
    intro:
      "Good friends are rare, and they're worth swallowing your pride for. These messages will help you apologise and save the friendship.",
    messages: [
      "I'm sorry. Our friendship means too much to me to let this come between us. I miss my person.",
      "I was wrong and I know it. Thank you for being patient with me even when I don't deserve it. Can we talk?",
      "I hate that I hurt you. You've always shown up for me, and I'm sorry I didn't show up for you this time.",
      "No fight is worth losing you over. I'm sorry, truly. Let's go back to being us.",
      "I owe you an apology and a long overdue coffee. I'm sorry for everything — you're one of the best people I know.",
    ],
  },
  {
    occasionPath: "sorry",
    slug: "apology-messages-after-a-fight",
    category: "After a Fight",
    h1: "Apology Messages After a Fight",
    title: "Apology Messages After a Fight — Make Up Fast | HeartSync",
    metaDescription:
      "Calm-the-storm apology messages to send after a big argument. Say sorry, take responsibility, and make up. Send it as a card.",
    intro:
      "After a heated argument, the right words can cool things down. These apology messages help you take responsibility and reconnect.",
    messages: [
      "I don't want to win the argument. I want to fix things with you. I'm sorry for how I handled that.",
      "We were both upset, but I'm sorry for the things I said in the heat of the moment. You deserve better from me.",
      "I'd rather be at peace with you than be right. Let's leave the fight behind us. I'm sorry.",
      "I've calmed down and I can see it more clearly now — I was unfair to you. I'm genuinely sorry.",
      "Fighting with you is the worst feeling. I'm sorry. Can we start fresh and just talk?",
    ],
  },
  {
    occasionPath: "sorry",
    slug: "professional-apology-messages",
    category: "At Work",
    h1: "Professional Apology Messages",
    title: "Professional Apology Messages — Sincere & Polite | HeartSync",
    metaDescription:
      "Polite, professional apology messages for work — to a colleague, client, or boss. Acknowledge the mistake and rebuild trust.",
    intro:
      "A sincere, professional apology protects relationships and trust. Use these polite messages to own a mistake and move forward.",
    messages: [
      "I want to sincerely apologise for the oversight on my part. I take full responsibility and I'm already working to put it right.",
      "Please accept my apologies for the delay. It wasn't up to my usual standard, and I'll make sure it doesn't happen again.",
      "I'm sorry for the miscommunication earlier. I value our working relationship and want to make sure we're aligned going forward.",
      "Thank you for your patience. I apologise for the inconvenience this caused, and I appreciate you giving me the chance to fix it.",
      "I realise my error affected your work, and I'm truly sorry. I've corrected it and put steps in place to prevent a repeat.",
    ],
  },

  /* ─────────────────────── LOVE / FEEL GOOD ──────────────────── */
  {
    occasionPath: "love",
    slug: "thinking-of-you-messages",
    category: "Thinking of You",
    h1: "Thinking of You Messages",
    title: "Thinking of You Messages — Sweet & Heartfelt | HeartSync",
    metaDescription:
      "Sweet thinking-of-you messages to let someone know they're on your mind. Brighten their day with a personalised card.",
    intro:
      "A simple \"I was thinking of you\" can make someone's entire day. Pick one of these warm messages and let them know they matter.",
    messages: [
      "Just a little reminder that you crossed my mind today and made me smile. Hope your day is as lovely as you are.",
      "No reason — I just wanted you to know I was thinking about you and I'm grateful you're in my life.",
      "Some people make the world feel warmer just by existing. You're one of them. Thinking of you today.",
      "You popped into my head and I had to tell you: you matter to me, more than you probably realise.",
      "Sending you a little bit of love from afar today. Thinking of you and hoping you feel it.",
    ],
  },
  {
    occasionPath: "love",
    slug: "cheer-up-messages-for-a-friend",
    category: "Cheer Up",
    h1: "Cheer Up Messages for a Friend",
    title: "Cheer Up Messages for a Friend — Lift Their Spirits | HeartSync",
    metaDescription:
      "Uplifting cheer-up messages to comfort a friend having a hard day. Send a little sunshine as a personalised card.",
    intro:
      "When someone you care about is down, a few kind words can be a lifeline. Use these messages to lift their spirits.",
    messages: [
      "Bad days happen, but they don't last — and neither will this. I'm right here with you, always.",
      "You've gotten through every hard day so far, and you'll get through this one too. I believe in you completely.",
      "Sending you the biggest virtual hug. You don't have to be okay right now — just know you're not alone.",
      "Tough times don't define you; the way you keep going does. And you're doing better than you think.",
      "Whatever today threw at you, remember how loved you are. Brighter days are coming, I promise.",
    ],
  },
  {
    occasionPath: "love",
    slug: "good-morning-love-messages",
    category: "Good Morning",
    h1: "Good Morning Love Messages",
    title: "Good Morning Love Messages — Romantic Notes | HeartSync",
    metaDescription:
      "Romantic good-morning messages to start your partner's day with a smile. Turn it into a sweet personalised card.",
    intro:
      "Start their day with love. These good-morning messages are the sweetest way to remind your partner they're the first thing on your mind.",
    messages: [
      "Good morning, my love. Waking up knowing you're mine is my favourite part of every single day.",
      "Rise and shine, beautiful. I hope today is as wonderful as the way you make me feel.",
      "Morning! Just so you know, you were my first thought today — like every day.",
      "Good morning to the one who has my whole heart. Go conquer today; I'm cheering you on.",
      "Sending you a good-morning kiss and a reminder that you are deeply, completely loved.",
    ],
  },
  {
    occasionPath: "love",
    slug: "long-distance-love-messages",
    category: "Long Distance",
    h1: "Long Distance Love Messages",
    title: "Long Distance Love Messages — Close the Distance | HeartSync",
    metaDescription:
      "Heartfelt long-distance relationship messages to feel close despite the miles. Send your love as a personalised card.",
    intro:
      "Distance is just a test of how far love can travel. These messages will help you feel close, no matter how many miles apart.",
    messages: [
      "The miles between us are nothing compared to how close you are to my heart. Counting down to you.",
      "Distance means so little when someone means so much. You're worth every mile and every wait.",
      "I fall asleep missing you and wake up missing you more — but loving you across any distance is still the easiest thing I do.",
      "Same moon, same stars, same heart that's completely yours. We're never really apart.",
      "Every day apart is one day closer to being together again. Until then, you have all of me.",
    ],
  },
  {
    occasionPath: "love",
    slug: "just-because-i-love-you-messages",
    category: "Just Because",
    h1: "Just Because I Love You Messages",
    title: "I Love You Messages — Just Because | HeartSync",
    metaDescription:
      "Sweet \"just because\" I-love-you messages to send for no reason at all. Make their day with a personalised card.",
    intro:
      "The best \"I love you\" comes with no occasion attached. Send one of these just because — and watch them melt.",
    messages: [
      "No special reason. I just love you, and I didn't want today to pass without telling you.",
      "In a world full of choices, I'd pick you every time, without a second thought. I love you.",
      "You're my favourite hello and my hardest goodbye. Just wanted you to know how much I love you.",
      "Loving you is the easiest thing I've ever done. Today, tomorrow, always.",
      "Just a reminder that you're loved — deeply, fully, and exactly as you are.",
    ],
  },

  /* ─────────────────────────── BIRTHDAY ──────────────────────── */
  {
    occasionPath: "birthday",
    slug: "birthday-wishes-for-best-friend",
    category: "Best Friend",
    h1: "Birthday Wishes for Your Best Friend",
    title: "Birthday Wishes for Best Friend — Heartfelt & Fun | HeartSync",
    metaDescription:
      "Heartfelt and fun birthday wishes for your best friend. Make their day special with a personalised birthday card.",
    intro:
      "Your best friend deserves a wish as special as they are. Pick one of these heartfelt birthday messages and make their day.",
    messages: [
      "Happy birthday to the person who knows all my secrets and loves me anyway. Life is so much better with you in it.",
      "Another year of you being the best friend anyone could ask for. Cheers to you today and always!",
      "Happy birthday, partner in crime! Thank you for every laugh, every memory, and every 2am chat. Love you loads.",
      "To my favourite human: I hope your birthday is as amazing, kind, and wonderful as you are. Celebrate big!",
      "Happy birthday to my forever person. Here's to many more years of being completely ridiculous together.",
    ],
  },
  {
    occasionPath: "birthday",
    slug: "birthday-wishes-for-girlfriend",
    category: "Girlfriend",
    h1: "Birthday Wishes for Your Girlfriend",
    title: "Birthday Wishes for Girlfriend — Romantic Notes | HeartSync",
    metaDescription:
      "Romantic birthday wishes for your girlfriend that melt her heart. Send a personalised birthday card she'll treasure.",
    intro:
      "Make her birthday unforgettable with words straight from the heart. These romantic wishes will make her feel adored.",
    messages: [
      "Happy birthday to the most beautiful woman I know, inside and out. Loving you is the best gift I've ever been given.",
      "Today the world got a little brighter, because it's the day my favourite person was born. Happy birthday, my love.",
      "Happy birthday, gorgeous. Thank you for filling my life with so much love and laughter. You deserve the world.",
      "Every day with you feels like a celebration, but today is all about you. Happy birthday, my heart.",
      "To the woman who stole my heart: happy birthday. I can't wait to make this your best year yet.",
    ],
  },
  {
    occasionPath: "birthday",
    slug: "birthday-wishes-for-boyfriend",
    category: "Boyfriend",
    h1: "Birthday Wishes for Your Boyfriend",
    title: "Birthday Wishes for Boyfriend — Sweet & Romantic | HeartSync",
    metaDescription:
      "Sweet and romantic birthday wishes for your boyfriend. Make him feel special with a personalised birthday card.",
    intro:
      "Celebrate the man who makes your world better. These birthday wishes will make him feel loved and appreciated.",
    messages: [
      "Happy birthday to the man who has my whole heart. Thank you for being my safe place and my favourite person.",
      "Today is all about you, my love. I hope it's as amazing as you make every one of my days. Happy birthday!",
      "Happy birthday, handsome. Loving you is easy and I'm so grateful you were born. Here's to us and many more years.",
      "To my favourite person: happy birthday. You deserve all the love, cake, and happiness in the world today.",
      "Happy birthday to my better half. I can't imagine my life without you in it. Let's make today unforgettable.",
    ],
  },
  {
    occasionPath: "birthday",
    slug: "birthday-wishes-for-sister",
    category: "Sister",
    h1: "Birthday Wishes for Your Sister",
    title: "Birthday Wishes for Sister — Loving & Warm | HeartSync",
    metaDescription:
      "Loving birthday wishes for your sister, from sweet to playful. Celebrate her with a personalised birthday card.",
    intro:
      "A sister is a first friend for life. Wish her a happy birthday with a message as special as your bond.",
    messages: [
      "Happy birthday to my first friend and forever favourite. Thank you for always having my back. Love you, sis!",
      "To my sister: you're the best part of growing up and the best part of being grown. Have the happiest birthday!",
      "Happy birthday, sis! Whether we're laughing or fighting over nothing, I wouldn't trade you for the world.",
      "Wishing the happiest birthday to the sister who knows me better than anyone. Today, you're celebrated big time.",
      "Happy birthday to my partner in everything. May this year bring you all the joy you so easily give to others.",
    ],
  },
  {
    occasionPath: "birthday",
    slug: "birthday-wishes-for-brother",
    category: "Brother",
    h1: "Birthday Wishes for Your Brother",
    title: "Birthday Wishes for Brother — Heartfelt & Fun | HeartSync",
    metaDescription:
      "Heartfelt and fun birthday wishes for your brother. Make him smile with a personalised birthday card.",
    intro:
      "Brothers are built-in best friends and the keepers of all the inside jokes. Wish yours a happy birthday in style.",
    messages: [
      "Happy birthday to my brother, my protector, and my partner in chaos. Life with you is never boring. Love you!",
      "To the best brother a person could ask for: have the happiest birthday. You deserve all the good things.",
      "Happy birthday, bro! Thanks for the memories, the mischief, and always having my back. Let's celebrate!",
      "Wishing my brother a year as amazing as he is. Thank you for being someone I'm proud to call family.",
      "Happy birthday to the one who's been by my side through it all. May this year be your absolute best.",
    ],
  },

  /* ─────────────────────── CONGRATULATIONS ───────────────────── */
  {
    occasionPath: "congratulations",
    slug: "congratulations-on-new-job",
    category: "New Job",
    h1: "Congratulations on Your New Job",
    title: "Congratulations on New Job — Messages | HeartSync",
    metaDescription:
      "Warm congratulations messages for a new job. Celebrate their achievement with a personalised card.",
    intro:
      "A new job is a fresh chapter and a big win. Celebrate it with a message that says how proud you are.",
    messages: [
      "Congratulations on the new job! They are so lucky to have you. Go show them everything you're capable of.",
      "So proud of you! This is the start of something amazing. Wishing you all the success in your new role.",
      "You worked hard for this and you earned every bit of it. Congratulations on your well-deserved new job!",
      "New job, new adventure, same brilliant you. Congratulations — go make them wonder how they ever managed without you.",
      "Huge congratulations! Watching you chase your goals and win is the best. Here's to your next big chapter.",
    ],
  },
  {
    occasionPath: "congratulations",
    slug: "congratulations-on-promotion",
    category: "Promotion",
    h1: "Congratulations on Your Promotion",
    title: "Congratulations on Promotion — Messages | HeartSync",
    metaDescription:
      "Celebrate a promotion with heartfelt congratulations messages. Send your pride and joy as a personalised card.",
    intro:
      "A promotion is proof that hard work pays off. Celebrate their climb with a message that honours the effort.",
    messages: [
      "Congratulations on your promotion! Nobody deserves it more. Your hard work has truly paid off.",
      "So well deserved! Watching you rise and shine is something special. Congratulations on this big step up.",
      "They saw what we've always known — you're brilliant. Huge congratulations on the promotion!",
      "Onwards and upwards! Congratulations on your promotion. The best is yet to come for you.",
      "You earned every bit of this. Congratulations on the new role — go lead the way like only you can.",
    ],
  },
  {
    occasionPath: "congratulations",
    slug: "congratulations-on-engagement",
    category: "Engagement",
    h1: "Congratulations on Your Engagement",
    title: "Congratulations on Engagement — Messages | HeartSync",
    metaDescription:
      "Sweet engagement congratulations messages for the happy couple. Celebrate their love with a personalised card.",
    intro:
      "An engagement is the beginning of forever. Send the happy couple a message as joyful as the moment.",
    messages: [
      "Congratulations on your engagement! Here's to a lifetime of love, laughter, and happily ever after.",
      "So happy for you both! Watching your love story unfold has been beautiful. Congratulations on saying yes!",
      "The best is yet to come for you two. Wishing you endless happiness as you start this new chapter together.",
      "Congratulations to the perfect pair! May your engagement be the start of your most wonderful adventure.",
      "Two hearts, one beautiful future. Congratulations on your engagement — you truly deserve all the joy.",
    ],
  },
  {
    occasionPath: "congratulations",
    slug: "congratulations-on-graduation",
    category: "Graduation",
    h1: "Congratulations on Your Graduation",
    title: "Congratulations on Graduation — Messages | HeartSync",
    metaDescription:
      "Proud graduation congratulations messages to celebrate the big achievement. Send it as a personalised card.",
    intro:
      "Years of hard work, all leading to this moment. Celebrate their graduation with a message full of pride.",
    messages: [
      "Congratulations, graduate! All those late nights paid off. So incredibly proud of everything you've achieved.",
      "You did it! This is just the beginning of all the amazing things ahead. Congratulations on your graduation.",
      "Cap off, future on. Congratulations on your graduation — go out there and change the world.",
      "Hard work, dedication, and a whole lot of brilliance. Congratulations, graduate! The world is yours now.",
      "So proud of you today and always. Congratulations on graduating — here's to your bright, well-earned future.",
    ],
  },
  {
    occasionPath: "congratulations",
    slug: "congratulations-on-new-baby",
    category: "New Baby",
    h1: "Congratulations on Your New Baby",
    title: "Congratulations on New Baby — Messages | HeartSync",
    metaDescription:
      "Heartwarming congratulations messages for new parents and their baby. Send your love as a personalised card.",
    intro:
      "A new baby brings a whole new kind of love into the world. Welcome the little one with a warm, joyful message.",
    messages: [
      "Congratulations on your beautiful new baby! Wishing your growing family endless love, joy, and tiny giggles.",
      "Welcome to the world, little one! And congratulations to the proud parents. Your hearts are about to feel so full.",
      "So happy for you both! May your days be filled with cuddles, first smiles, and all the love a baby brings.",
      "A new little miracle has arrived! Congratulations — get ready for the most beautiful adventure of your lives.",
      "Sending so much love to your growing family. Congratulations on your precious new arrival!",
    ],
  },

  /* ─────────────────────────── THANK YOU ─────────────────────── */
  {
    occasionPath: "thank-you",
    slug: "thank-you-messages-for-a-friend",
    category: "For a Friend",
    h1: "Thank You Messages for a Friend",
    title: "Thank You Messages for a Friend — Heartfelt | HeartSync",
    metaDescription:
      "Heartfelt thank-you messages to show a friend how much you appreciate them. Send your gratitude as a card.",
    intro:
      "Good friends deserve to know they're appreciated. Use these heartfelt messages to thank yours from the heart.",
    messages: [
      "Thank you for always being there, even when I forget to ask. I don't know what I'd do without you.",
      "I'm so grateful for you. Thank you for the laughs, the support, and for simply being you.",
      "Thank you for being the kind of friend everyone wishes they had. You make my life so much better.",
      "Just wanted to say thank you — for showing up, for listening, and for never letting me face things alone.",
      "Your kindness never goes unnoticed. Thank you for being one of the best parts of my life.",
    ],
  },
  {
    occasionPath: "thank-you",
    slug: "thank-you-messages-for-a-teacher",
    category: "For a Teacher",
    h1: "Thank You Messages for a Teacher",
    title: "Thank You Messages for Teacher — Appreciation | HeartSync",
    metaDescription:
      "Meaningful thank-you messages for a teacher who made a difference. Show your appreciation with a personalised card.",
    intro:
      "Great teachers shape lives long after the last lesson. Say thank you with a message that honours their impact.",
    messages: [
      "Thank you for believing in me when I didn't believe in myself. Your guidance changed everything.",
      "You didn't just teach a subject — you taught me to think, to grow, and to never give up. Thank you.",
      "Thank you for your patience, your wisdom, and your kindness. I'll carry your lessons with me forever.",
      "The best teachers leave a mark that lasts a lifetime, and you've certainly left yours. Thank you for everything.",
      "Words can't fully express my gratitude. Thank you for inspiring me and helping me become who I am.",
    ],
  },
  {
    occasionPath: "thank-you",
    slug: "thank-you-for-the-gift-messages",
    category: "For a Gift",
    h1: "Thank You for the Gift Messages",
    title: "Thank You for the Gift — Messages | HeartSync",
    metaDescription:
      "Gracious thank-you-for-the-gift messages to show your appreciation. Send a sweet personalised thank-you card.",
    intro:
      "It's the thought that counts — so let them know their thoughtfulness was felt. Use these messages to say thanks for a gift.",
    messages: [
      "Thank you so much for the lovely gift! It truly made my day, and so did the thought behind it.",
      "I absolutely love it — thank you! You always know exactly how to make me feel special.",
      "Thank you for the wonderful surprise. Your kindness and generosity mean more to me than the gift itself.",
      "What a thoughtful gift! Thank you for thinking of me. It's perfect, and so are you.",
      "Thank you from the bottom of my heart. Your gift, and your thoughtfulness, won't be forgotten.",
    ],
  },
  {
    occasionPath: "thank-you",
    slug: "thank-you-messages-for-your-boss",
    category: "For Your Boss",
    h1: "Thank You Messages for Your Boss",
    title: "Thank You Messages for Boss — Professional | HeartSync",
    metaDescription:
      "Professional thank-you messages for a boss or manager. Express genuine appreciation with a personalised card.",
    intro:
      "A great manager makes all the difference. Show genuine, professional appreciation with these thank-you messages.",
    messages: [
      "Thank you for your guidance and support. I've learned so much under your leadership, and I'm truly grateful.",
      "I appreciate the trust you've placed in me. Thank you for being a leader worth looking up to.",
      "Thank you for always encouraging me to grow. Your mentorship has made a real difference in my career.",
      "I'm grateful for your patience and the opportunities you've given me. Thank you for everything.",
      "Thank you for leading by example and bringing out the best in our team. It doesn't go unnoticed.",
    ],
  },
  {
    occasionPath: "thank-you",
    slug: "heartfelt-thank-you-messages",
    category: "Heartfelt",
    h1: "Heartfelt Thank You Messages",
    title: "Heartfelt Thank You Messages — From the Heart | HeartSync",
    metaDescription:
      "Deeply heartfelt thank-you messages for anyone who truly matters. Send your gratitude as a personalised card.",
    intro:
      "Some people deserve more than a quick thanks. These heartfelt messages help you express gratitude that comes straight from the heart.",
    messages: [
      "Thank you doesn't feel like enough, but please know how deeply grateful I am for you and everything you've done.",
      "From the bottom of my heart, thank you. Your kindness has touched my life in ways I'll never forget.",
      "I'm so thankful for you. The world needs more people with a heart like yours.",
      "Thank you for being a light in my life. Your generosity and warmth mean everything to me.",
      "Words fall short, but my gratitude is endless. Thank you for being exactly who you are.",
    ],
  },
];

/* ─────────────────────────── Helpers ─────────────────────────── */

export function getOccasionGroup(path: string): OccasionGroup | undefined {
  return OCCASION_GROUPS.find((g) => g.path === path);
}

export function getGuidesForOccasion(path: string): MessageGuide[] {
  return MESSAGE_GUIDES.filter((g) => g.occasionPath === path);
}

export function getGuide(
  occasionPath: string,
  slug: string,
): MessageGuide | undefined {
  return MESSAGE_GUIDES.find(
    (g) => g.occasionPath === occasionPath && g.slug === slug,
  );
}

/** Count of guides per occasion (for the index page). */
export function guideCount(path: string): number {
  return getGuidesForOccasion(path).length;
}

/* ──────────────────── SEO head metadata (shared) ─────────────────────
 * Single source of truth for per-page <head> data, consumed by both the
 * React pages (via useSeoHead) and the build-time prerender script. Keeping
 * these here prevents the client and the pre-rendered HTML from drifting. */

export interface HeadMeta {
  title: string;
  description: string;
  canonical: string;
  jsonLd: Record<string, unknown>;
}

const INDEX_TITLE =
  "What to Write — Message Ideas for Every Occasion | HeartSync";
const INDEX_DESCRIPTION =
  "Stuck on what to write? Browse heartfelt message ideas for apologies, birthdays, love notes, congratulations and thank-yous — then turn them into a card.";

export function indexHead(): HeadMeta {
  return {
    title: INDEX_TITLE,
    description: INDEX_DESCRIPTION,
    canonical: `${SITE_URL}/messages`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Message Ideas for Every Occasion",
      description: INDEX_DESCRIPTION,
      url: `${SITE_URL}/messages`,
    },
  };
}

export function categoryHead(group: OccasionGroup): HeadMeta {
  const description = group.tagline;
  return {
    title: `${group.label} Messages — What to Write | HeartSync`,
    description,
    canonical: `${SITE_URL}/messages/${group.path}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${group.label} Messages`,
      description,
      url: `${SITE_URL}/messages/${group.path}`,
    },
  };
}

export function guideHead(guide: MessageGuide): HeadMeta {
  return {
    title: guide.title,
    description: guide.metaDescription,
    canonical: `${SITE_URL}/messages/${guide.occasionPath}/${guide.slug}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.h1,
      description: guide.metaDescription,
      url: `${SITE_URL}/messages/${guide.occasionPath}/${guide.slug}`,
      author: { "@type": "Organization", name: "HeartSync AI" },
      publisher: { "@type": "Organization", name: "HeartSync AI" },
    },
  };
}

export interface PrerenderRoute extends HeadMeta {
  /** Root-relative URL path, e.g. /messages/sorry/apology-messages-for-boyfriend */
  url: string;
}

/** Every /messages route that should be pre-rendered to static HTML. */
export function allPrerenderRoutes(): PrerenderRoute[] {
  const routes: PrerenderRoute[] = [{ url: "/messages", ...indexHead() }];
  for (const group of OCCASION_GROUPS) {
    routes.push({ url: `/messages/${group.path}`, ...categoryHead(group) });
  }
  for (const guide of MESSAGE_GUIDES) {
    routes.push({
      url: `/messages/${guide.occasionPath}/${guide.slug}`,
      ...guideHead(guide),
    });
  }
  return routes;
}
