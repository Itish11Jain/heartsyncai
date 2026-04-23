import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OCCASIONS, RELATIONS, getTemplate, getFallbackTemplate } from "@/lib/card-templates";

const GEN_EMOJIS = ["✨", "💌", "🎀", "💛", "🎁", "🌟", "🥰", "💫", "🎊"];

function useSearchParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export default function Send() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [occasion, setOccasion] = useState(searchParams.get("occasion") ?? "");
  const [relation, setRelation] = useState(searchParams.get("relation") ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [likes, setLikes] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [showGenerating, setShowGenerating] = useState(false);
  const [genEmojiIdx, setGenEmojiIdx] = useState(0);

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
    if (searchParams.get("occasion") && !occasion) setOccasion(searchParams.get("occasion") ?? "");
    if (searchParams.get("relation") && !relation) setRelation(searchParams.get("relation") ?? "");
  }, []);

  function goTo(nextStep: number, direction: number) {
    setDir(direction);
    setStep(nextStep);
  }

  function pickTemplate(): string {
    const last = localStorage.getItem("hs_last_template");
    const next = !last
      ? (Math.random() < 0.5 ? "envelope" : "cosmic")
      : (last === "envelope" ? "cosmic" : "envelope");
    localStorage.setItem("hs_last_template", next);
    return next;
  }

  function buildCardUrl(name: string, msg: string, senderFlag = false, template = "envelope") {
    const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const p = new URLSearchParams({ to: name, occasion, relation });
    if (likes.trim()) p.set("likes", likes.trim());
    if (msg.trim() && msg.trim() !== defaultMsg) {
      try { p.set("msg", btoa(unescape(encodeURIComponent(msg.trim())))); } catch { /* ignore */ }
    }
    if (template !== "envelope") p.set("template", template);
    if (senderFlag) p.set("sender", "1");
    return `${base}/card?${p.toString()}`;
  }

  /* Cycle generating emoji one at a time */
  useEffect(() => {
    if (!showGenerating) return;
    const iv = setInterval(() => {
      setGenEmojiIdx(i => (i + 1) % GEN_EMOJIS.length);
    }, 650);
    return () => clearInterval(iv);
  }, [showGenerating]);

  function handleFinish() {
    if (!recipientName.trim()) return;
    const template = pickTemplate();
    const url = buildCardUrl(recipientName.trim(), customMsg, true, template);
    setShowGenerating(true);
    setTimeout(() => { window.location.href = url; }, 1800);
  }

  const stepVariants = {
    initial: { opacity: 0, x: dir * 50 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
    exit: { opacity: 0, x: dir * -50, transition: { duration: 0.2 } },
  };

  return (
    <div
      className="h-dvh flex flex-col items-center overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 60%, #060310 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2" style={{ maxWidth: 520 }}>
        <Link href="/">
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
                width: step >= i ? 20 : 6,
                height: 4,
                borderRadius: 99,
                background: step >= i ? "linear-gradient(90deg, #FFD700, #FFA500)" : "rgba(255,255,255,0.15)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      </div>

      <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-2" style={{ maxWidth: 520, minHeight: 0 }}>
        <AnimatePresence mode="wait" initial={false}>

          {/* Step 1: Occasion */}
          {step === 1 && (
            <motion.div key="step1" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <h1 className="text-2xl font-bold text-white text-center mb-1">What's the occasion?</h1>
              <p className="text-center text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                Pick the vibe for your card
              </p>
              <div className="flex flex-col gap-2">
                {OCCASIONS.map(occ => (
                  <motion.button
                    key={occ.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setOccasion(occ.id); goTo(2, 1); }}
                    style={{
                      padding: "11px 16px",
                      borderRadius: 16,
                      background: occasion === occ.id
                        ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.12))"
                        : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${occasion === occ.id ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.08)"}`,
                      display: "flex", alignItems: "center", gap: 16,
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{occ.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold text-white">{occ.label}</div>
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
              <button onClick={() => goTo(1, -1)} className="flex items-center gap-1 text-sm mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>
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

          {/* Step 3: Name + Likes + Message */}
          {step === 3 && (
            <motion.div key="step3" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <button onClick={() => goTo(2, -1)} className="flex items-center gap-1 text-sm mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>
                <ChevronLeft size={15} /> Back
              </button>
              <h1 className="text-2xl font-bold text-white text-center mb-2">Who's it for?</h1>
              <p className="text-center text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
                We'll make it feel personal to them ✨
              </p>
              <div className="flex flex-col gap-4">
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

                {/* Likes field — the personalisation magic */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "rgba(255,215,0,0.75)" }}>
                    ✨ What do they love?
                  </label>
                  <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                    We'll add a personal orb just for them — travel, pandas, coffee, cricket…
                  </p>
                  <Input
                    placeholder="e.g. travel, panda, cricket, pink, coffee…"
                    value={likes}
                    onChange={e => setLikes(e.target.value)}
                    style={{
                      background: "rgba(255,215,0,0.05)",
                      border: "1.5px solid rgba(255,215,0,0.2)",
                      color: "white",
                      fontSize: 14,
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
                    rows={3}
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

        </AnimatePresence>
      </div>

      {/* ════ GENERATING SPLASH ════ */}
      <AnimatePresence>
        {showGenerating && (
          <motion.div
            key="generating-splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed", inset: 0, zIndex: 80,
              background: "radial-gradient(ellipse at 50% 40%, #1a0a2e 0%, #0d0618 55%, #050210 100%)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={genEmojiIdx}
                initial={{ opacity: 0, scale: 0.65, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.65, y: -12 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                style={{ fontSize: 76 }}
              >
                {GEN_EMOJIS[genEmojiIdx]}
              </motion.div>
            </AnimatePresence>
            <motion.p
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ fontSize: 20, fontWeight: 700, color: "#FFD700", letterSpacing: "0.04em", textAlign: "center", margin: 0, fontFamily: "'Segoe UI', system-ui, sans-serif" }}
            >
              Creating your card…
            </motion.p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", margin: 0, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
              Sprinkling the magic ✨
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
