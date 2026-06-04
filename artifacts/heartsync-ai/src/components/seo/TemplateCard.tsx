import { useState } from "react";
import { Link } from "wouter";
import { Copy, Check, ArrowRight } from "lucide-react";
import type { OccasionKey } from "@/lib/seo-messages";
import { trackEvent } from "@/lib/trackEvent";

/**
 * A single ready-to-use message template.
 * Primary action drops the visitor into the card builder with this message
 * pre-filled; secondary action copies the text to the clipboard.
 *
 * SSR-safe: clipboard / analytics only fire inside click handlers.
 */
export function TemplateCard({
  message,
  occasion,
  slug,
  index,
}: {
  message: string;
  occasion: OccasionKey;
  slug: string;
  index: number;
}) {
  const [copied, setCopied] = useState(false);

  const buildHref = `/send?occasion=${encodeURIComponent(
    occasion,
  )}&text=${encodeURIComponent(message)}`;

  function handleCopy() {
    try {
      void navigator.clipboard?.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — ignore */
    }
    trackEvent({ event: "messages_guide_copy_click", occasion, template: slug });
  }

  function handleCreate() {
    trackEvent({ event: "messages_guide_cta_click", occasion, template: slug });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 transition-colors hover:border-white/20">
      <p className="text-base sm:text-lg leading-relaxed text-white/85 mb-5">
        <span className="text-white/25 mr-1.5 select-none">{index + 1}.</span>
        {message}
      </p>
      <div className="flex flex-col sm:flex-row gap-2.5">
        <Link
          href={buildHref}
          onClick={handleCreate}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl h-11 px-5 text-sm font-semibold bg-gradient-to-r from-accent to-purple-500 hover:opacity-90 text-white transition-opacity"
        >
          Create this card <ArrowRight className="w-4 h-4" />
        </Link>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center gap-2 rounded-xl h-11 px-5 text-sm font-medium border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-colors"
          aria-label="Copy message text"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" /> Copy text
            </>
          )}
        </button>
      </div>
    </div>
  );
}
