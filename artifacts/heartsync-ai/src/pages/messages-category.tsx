import { Link, useParams } from "wouter";
import { ArrowRight } from "lucide-react";
import NotFound from "@/pages/not-found";
import { MessagesShell } from "@/components/seo/MessagesShell";
import { useSeoHead } from "@/lib/useSeoHead";
import {
  getOccasionGroup,
  getGuidesForOccasion,
  categoryHead,
  SITE_URL,
} from "@/lib/seo-messages";

export default function MessagesCategory() {
  const params = useParams();
  const occasionPath = params.occasion ?? "";
  const group = getOccasionGroup(occasionPath);
  const guides = getGuidesForOccasion(occasionPath);

  useSeoHead(
    group
      ? categoryHead(group)
      : {
          title: "Messages | HeartSync",
          description: "",
          canonical: `${SITE_URL}/messages/${occasionPath}`,
          jsonLd: {},
        },
  );

  if (!group) return <NotFound />;

  return (
    <MessagesShell
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Messages", href: "/messages" },
        { label: group.label },
      ]}
    >
      <section className="mb-10">
        <div
          className={`text-3xl w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-tr ${group.accent} mb-5`}
        >
          {group.emoji}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.12] mb-4 text-white">
          {group.label} Messages
        </h1>
        <p className="text-base sm:text-lg text-white/55 leading-relaxed max-w-2xl">
          {group.intro}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/messages/${group.path}/${guide.slug}`}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25"
          >
            <span className="text-xs font-medium text-accent/80 mb-2 block">
              {guide.category}
            </span>
            <h2 className="text-base font-bold text-white mb-1.5 leading-snug">
              {guide.h1}
            </h2>
            <p className="text-sm text-white/45 leading-relaxed mb-4 line-clamp-2">
              {guide.intro}
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent group-hover:gap-2.5 transition-all">
              Read {guide.messages.length} messages{" "}
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        ))}
      </section>
    </MessagesShell>
  );
}
