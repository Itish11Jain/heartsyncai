import { Link } from "wouter";
import { HeartPulse, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Shared visual shell for all /messages SEO pages: branded background,
 * header with logo + "Create a Card" CTA, breadcrumbs, content slot, footer.
 *
 * Kept free of browser-only APIs so it renders cleanly during prerender.
 */
export function MessagesShell({
  crumbs,
  children,
}: {
  crumbs: Crumb[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full overflow-hidden bg-background text-foreground selection:bg-accent/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[55%] h-[55%] rounded-full bg-accent/10 blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[160px]" />
        <div className="absolute top-[40%] right-[0%] w-[35%] h-[35%] rounded-full bg-purple-800/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 pt-5 pb-20">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-xl">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              HeartSync AI
            </span>
          </Link>
          <Button
            asChild
            className="rounded-xl h-10 px-4 text-sm font-semibold bg-gradient-to-r from-accent to-purple-500 hover:opacity-90 text-white"
          >
            <Link href="/send">Create a Card</Link>
          </Button>
        </header>

        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center flex-wrap gap-1.5 text-xs text-white/40 mb-7"
        >
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3 text-white/25" />}
              {c.href ? (
                <Link href={c.href} className="hover:text-white/70 transition-colors">
                  {c.label}
                </Link>
              ) : (
                <span className="text-white/60">{c.label}</span>
              )}
            </span>
          ))}
        </nav>

        {children}

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-white/8 text-center">
          <p className="text-sm text-white/40 mb-4">
            Found the perfect words? Turn them into a card they'll never forget.
          </p>
          <Button
            asChild
            size="lg"
            className="rounded-2xl h-12 px-7 text-sm font-semibold bg-gradient-to-r from-accent to-purple-500 hover:opacity-90 text-white shadow-[0_0_40px_-12px_rgba(139,92,246,0.6)]"
          >
            <Link href="/send">Create your card free</Link>
          </Button>
          <p className="text-xs text-white/25 mt-8">
            © {new Date().getFullYear()} HeartSync AI ·{" "}
            <Link href="/messages" className="hover:text-white/50">
              All message guides
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
