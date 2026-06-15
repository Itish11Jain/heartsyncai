import type { TemplateId } from "./usage";

/**
 * Occasion campaigns power dedicated, prefilled landing experiences on /send
 * (e.g. /send?c=fathers-day) plus the copy + theme slots consumed by the
 * reusable 5-screen "occasion" card template (src/pages/occasion.tsx).
 *
 * To launch a new campaign:
 *   1. Add an entry here keyed by its URL slug.
 *   2. Ensure its `occasion` is registered in card-templates.ts (Occasion type)
 *      and priced in priceArm.ts (PRICE_BY_OCCASION).
 *   3. The occasion card page reads the theme/copy via getCampaignByOccasion().
 */
export interface OccasionCampaign {
  /** URL slug: /send?c=<slug> */
  slug: string;
  /** Registered occasion id (card-templates.ts Occasion + priceArm pricing). */
  occasion: string;
  /** Always "occasion" — the reusable 5-screen template. */
  template: TemplateId;

  /* ── /send prefill ── */
  /** Default recipient name shown in the campaign builder (e.g. "Papa"). */
  prefillName: string;
  /** Relationship used for message personalisation. */
  relation: string;
  /** Default message seeded into the builder + used as the card fallback. */
  defaultMessage: string;

  /* ── Campaign builder hero copy ── */
  campaignTitle: string;
  /** Date line shown under the headline (golden, straight). */
  campaignDate: string;
  campaignSubtitle: string;
  campaignEmoji: string;

  /* ── Card copy slots (src/pages/occasion.tsx) ── */
  /** Screen 1 — caption under the tappable flower. */
  tapPrompt: string;
  /** Screen 2 — line shown over the bouquet. */
  bouquetMessage: string;
  /** Screen 3 — headline over the photo/voice collage. */
  polaroidNote: string;
  /** Screen 5 — gold typewriter heading above the message. */
  finalHeader: string;

  /* ── Theme ── */
  /** Accent hex used for headings/glows on the card. */
  accent: string;
  /** Emoji used on the final message card corners. */
  cornerEmojis: [string, string, string, string];
}

const CAMPAIGNS: Record<string, OccasionCampaign> = {
  "fathers-day": {
    slug: "fathers-day",
    occasion: "fathers_day",
    template: "occasion",
    prefillName: "Papa",
    relation: "father",
    defaultMessage:
      "Happy Father's Day, Papa. Thank you for every quiet sacrifice, every word of advice, and for always being my safe place. Everything good in me started with you. I love you more than I ever say. ❤️",
    campaignTitle: "Father's Day Surprise",
    campaignDate: "Father's Day: 21st June",
    campaignSubtitle: "Write him a little note — we'll turn it into magic ✨",
    campaignEmoji: "🌸",
    tapPrompt: "Tap the flower for Papa 🌸",
    bouquetMessage: "Thank you for everything {name}!",
    polaroidNote: "Grateful for you, everyday!",
    finalHeader: "Happy Father's Day",
    accent: "#D4AF37",
    cornerEmojis: ["🌸", "✨", "💛", "❤️"],
  },
};

/** Look up a campaign by its URL slug (the `c` query param on /send). */
export function getCampaignBySlug(slug: string | null | undefined): OccasionCampaign | null {
  if (!slug) return null;
  return CAMPAIGNS[slug] ?? null;
}

/** Look up a campaign by its registered occasion id (used by the card page). */
export function getCampaignByOccasion(occasion: string | null | undefined): OccasionCampaign | null {
  if (!occasion) return null;
  return Object.values(CAMPAIGNS).find((c) => c.occasion === occasion) ?? null;
}
