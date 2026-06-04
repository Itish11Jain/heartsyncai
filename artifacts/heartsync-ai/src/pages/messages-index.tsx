import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { MessagesShell } from "@/components/seo/MessagesShell";
import { useSeoHead } from "@/lib/useSeoHead";
import { OCCASION_GROUPS, guideCount, indexHead } from "@/lib/seo-messages";

export default function MessagesIndex() {
  useSeoHead(indexHead());

  return (
    <MessagesShell crumbs={[{ label: "Home", href: "/" }, { label: "Messages" }]}>
      <section className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.12] mb-4 text-white">
          Never wonder{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-purple-400 to-primary">
            what to write
          </span>{" "}
          again.
        </h1>
        <p className="text-base sm:text-lg text-white/55 leading-relaxed max-w-2xl">
          Hand-picked message ideas for every occasion — heartfelt, ready to
          use, and easy to make your own. Find the perfect words, then turn them
          into a beautiful personalised card in seconds.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {OCCASION_GROUPS.map((g) => (
          <Link
            key={g.path}
            href={`/messages/${g.path}`}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/25"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`text-2xl w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-tr ${g.accent} bg-opacity-20`}
              >
                {g.emoji}
              </div>
              <span className="text-xs text-white/30 mt-1">
                {guideCount(g.path)} guides
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mb-1.5">{g.label}</h2>
            <p className="text-sm text-white/50 leading-relaxed mb-4">
              {g.tagline}
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent group-hover:gap-2.5 transition-all">
              Browse ideas <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        ))}
      </section>
    </MessagesShell>
  );
}
