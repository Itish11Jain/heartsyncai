import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ExternalLink, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OCCASIONS, RELATIONS, getTemplate, getFallbackTemplate } from "@/lib/card-templates";

function useSearchParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

const step1Variants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function Send() {
  const [, setLocation] = useLocation();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [occasion, setOccasion] = useState(searchParams.get("occasion") ?? "");
  const [relation, setRelation] = useState(searchParams.get("relation") ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const defaultMsg = (() => {
    if (!occasion || !relation) return "";
    const t = getTemplate(occasion, relation) ?? getFallbackTemplate(occasion);
    return t.final_message;
  })();

  useEffect(() => {
    if (occasion && relation) {
      const t = getTemplate(occasion, relation) ?? getFallbackTemplate(occasion);
      setCustomMsg(t.final_message);
    }
  }, [occasion, relation]);

  useEffect(() => {
    if (searchParams.get("occasion") && !occasion) {
      setOccasion(searchParams.get("occasion") ?? "");
    }
    if (searchParams.get("relation") && !relation) {
      setRelation(searchParams.get("relation") ?? "");
    }
  }, []);

  function goTo(nextStep: number, direction: number) {
    setDir(direction);
    setStep(nextStep);
  }

  function buildShareUrl(name: string, msg: string) {
    const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const params = new URLSearchParams({ to: name, occasion, relation });
    if (msg.trim() && msg.trim() !== defaultMsg) {
      try {
        params.set("msg", btoa(unescape(encodeURIComponent(msg.trim()))));
      } catch {
        /* ignore encode errors */
      }
    }
    return `${base}/card?${params.toString()}`;
  }

  function handleFinish() {
    if (!recipientName.trim()) return;
    const url = buildShareUrl(recipientName.trim(), customMsg);
    setShareUrl(url);
    goTo(4, 1);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback */
    }
  }

  const stepVariants = {
    initial: { opacity: 0, x: dir * 50 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
    exit: { opacity: 0, x: dir * -50, transition: { duration: 0.2 } },
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start"
      style={{
        background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 60%, #060310 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2" style={{ maxWidth: 520 }}>
        <Link href="/moments">
          <button className="flex items-center gap-1 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            <ChevronLeft size={16} /> Back
          </button>
        </Link>
        <span className="text-sm font-semibold" style={{ color: "rgba(255,215,0,0.7)", letterSpacing: "0.04em" }}>
          ✨ Create 3D Card
        </span>
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: step >= i || step === 4 ? 20 : 6,
                height: 4,
                borderRadius: 99,
                background: step >= i || step === 4 ? "linear-gradient(90deg, #FFD700, #FFA500)" : "rgba(255,255,255,0.15)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      </div>

      <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-8" style={{ maxWidth: 520 }}>
        <AnimatePresence mode="wait" initial={false}>
          {/* Step 1: Occasion */}
          {step === 1 && (
            <motion.div key="step1" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <h1 className="text-2xl font-bold text-white text-center mb-2">What's the occasion?</h1>
              <p className="text-center text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
                Pick the vibe for your card
              </p>
              <div className="flex flex-col gap-3">
                {OCCASIONS.map(occ => (
                  <motion.button
                    key={occ.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setOccasion(occ.id); goTo(2, 1); }}
                    style={{
                      padding: "18px 20px",
                      borderRadius: 16,
                      background: occasion === occ.id
                        ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.12))"
                        : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${occasion === occ.id ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.08)"}`,
                      display: "flex", alignItems: "center", gap: 16,
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 36 }}>{occ.emoji}</span>
                    <div>
                      <div className="text-base font-semibold text-white">{occ.label}</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{occ.description}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Relation */}
          {step === 2 && (
            <motion.div key="step2" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <button
                onClick={() => goTo(1, -1)}
                className="flex items-center gap-1 text-sm mb-6"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                <ChevronLeft size={15} /> Back
              </button>
              <h1 className="text-2xl font-bold text-white text-center mb-2">Who is it for?</h1>
              <p className="text-center text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
                We'll personalise the message
              </p>
              <div className="grid grid-cols-2 gap-3">
                {RELATIONS.map(rel => (
                  <motion.button
                    key={rel.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setRelation(rel.id); goTo(3, 1); }}
                    style={{
                      padding: "20px 14px",
                      borderRadius: 16,
                      background: relation === rel.id
                        ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.12))"
                        : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${relation === rel.id ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.08)"}`,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 32 }}>{rel.emoji}</span>
                    <div className="font-semibold text-white text-sm">{rel.label}</div>
                    <div className="text-xs text-center" style={{ color: "rgba(255,255,255,0.35)" }}>{rel.sub}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Name + Message */}
          {step === 3 && (
            <motion.div key="step3" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <button
                onClick={() => goTo(2, -1)}
                className="flex items-center gap-1 text-sm mb-6"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                <ChevronLeft size={15} /> Back
              </button>
              <h1 className="text-2xl font-bold text-white text-center mb-2">Who's it for?</h1>
              <p className="text-center text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
                Enter their name and optionally tweak the message
              </p>
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Their name
                  </label>
                  <Input
                    placeholder="e.g. Rahul, Priya, Aditya…"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && recipientName.trim() && handleFinish()}
                    autoFocus
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1.5px solid rgba(255,255,255,0.12)",
                      color: "white",
                      fontSize: 16,
                      borderRadius: 12,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Message <span style={{ color: "rgba(255,255,255,0.3)" }}>(optional — edit to personalise)</span>
                  </label>
                  <textarea
                    value={customMsg}
                    onChange={e => setCustomMsg(e.target.value)}
                    rows={4}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.06)",
                      border: "1.5px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.9)",
                      fontSize: 14,
                      borderRadius: 12,
                      padding: "12px 14px",
                      resize: "vertical",
                      outline: "none",
                      lineHeight: 1.6,
                    }}
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={!recipientName.trim()}
                  onClick={handleFinish}
                  style={{
                    padding: "16px",
                    borderRadius: 14,
                    background: recipientName.trim()
                      ? "linear-gradient(135deg, #FFD700, #FFA500)"
                      : "rgba(255,255,255,0.08)",
                    color: recipientName.trim() ? "#000" : "rgba(255,255,255,0.3)",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: recipientName.trim() ? "pointer" : "default",
                    border: "none",
                    transition: "all 0.2s",
                  }}
                >
                  ✨ Generate Link
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Share */}
          {step === 4 && (
            <motion.div
              key="step4"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full flex flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.1 }}
                style={{ fontSize: 72, marginBottom: 16 }}
              >
                🎉
              </motion.div>
              <h1 className="text-2xl font-bold text-white text-center mb-2">Card is ready!</h1>
              <p className="text-center text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
                Share this link with {recipientName} — they'll get the full 3D experience
              </p>

              {/* Link preview box */}
              <div
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(255,215,0,0.06)",
                  border: "1.5px solid rgba(255,215,0,0.2)",
                  marginBottom: 16,
                }}
              >
                <p
                  className="text-sm break-all"
                  style={{ color: "rgba(255,215,0,0.7)", fontFamily: "monospace", fontSize: 12 }}
                >
                  {shareUrl}
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCopy}
                  style={{
                    padding: "16px",
                    borderRadius: 14,
                    background: copied
                      ? "linear-gradient(135deg, #22c55e, #16a34a)"
                      : "linear-gradient(135deg, #FFD700, #FFA500)",
                    color: "#000",
                    fontWeight: 700,
                    fontSize: 15,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    cursor: "pointer",
                    border: "none",
                    transition: "all 0.3s",
                  }}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? "Copied!" : "Copy Link"}
                </motion.button>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "15px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.06)",
                    border: "1.5px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.8)",
                    fontWeight: 600,
                    fontSize: 15,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    textDecoration: "none",
                  }}
                >
                  <ExternalLink size={16} />
                  Preview your card
                </a>

                <button
                  onClick={() => { setStep(1); setOccasion(""); setRelation(""); setRecipientName(""); setCustomMsg(""); setShareUrl(""); }}
                  className="text-sm text-center mt-1"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Make another card
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
