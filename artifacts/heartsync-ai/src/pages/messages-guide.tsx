import { Link, useParams } from "wouter";
import { ArrowRight } from "lucide-react";
import NotFound from "@/pages/not-found";
import { MessagesShell } from "@/components/seo/MessagesShell";
import { TemplateCard } from "@/components/seo/TemplateCard";
import { useSeoHead } from "@/lib/useSeoHead";
import { useEffect } from "react";
import {
  getOccasionGroup,
  getGuide,
  getGuidesForOccasion,
  guideHead,
  SITE_URL,
} from "@/lib/seo-messages";
import { trackEvent } from "@/lib/trackEvent";

export default function MessageGuide() {
  const params = useParams();
  const occasionPath = params.occasion ?? "";
  const slug = params.slug ?? "";
  const group = getOccasionGroup(occasionPath);
  const guide = getGuide(occasionPath, slug);

  useSeoHead(
    guide
      ? guideHead(guide)
      : {
          title: "Messages | HeartSync",
          description: "",
          canonical: `${SITE_URL}/messages/${occasionPath}/${slug}`,
          jsonLd: {},
        },
  );

  useEffect(() => {
    if (group && guide) {
      trackEvent({
        event: "messages_guide_viewed",
        occasion: group.occasion,
        template: guide.slug,
      });
    }
  }, [group, guide]);

  if (!group || !guide) return <NotFound />;

  const related = getGuidesForOccasion(occasionPath)
    .filter((g) => g.slug !== guide.slug)
    .slice(0, 4);

  return (
    <MessagesShell
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Messages", href: "/messages" },
        { label: group.label, href: `/messages/${group.path}` },
        { label: guide.category },
      ]}
    >
      <article>
        <header className="mb-9">
          <span className="text-xs font-medium text-accent/80 mb-3 block">
            {group.label} · {guide.category}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.12] mb-4 text-white">
            {guide.h1}
          </h1>
          <p className="text-base sm:text-lg text-white/55 leading-relaxed max-w-2xl">
            {guide.intro}
          </p>
        </header>

        <div className="space-y-4">
          {guide.messages.map((message, i) => (
            <TemplateCard
              key={i}
              message={message}
              occasion={group.occasion}
              slug={guide.slug}
              index={i}
            />
          ))}
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-lg font-bold text-white mb-4">
            More {group.label.toLowerCase()} ideas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((g) => (
              <Link
                key={g.slug}
                href={`/messages/${group.path}/${g.slug}`}
                className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/25 flex items-center justify-between gap-3"
              >
                <span className="text-sm font-medium text-white/80">
                  {g.h1}
                </span>
                <ArrowRight className="w-4 h-4 text-accent shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </MessagesShell>
  );
}
