import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ExternalLink, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OCCASIONS, RELATIONS, getTemplate, getFallbackTemplate } from "@/lib/card-templates";

const CARD_READY_EMOJIS = ["🎉", "💛", "✨", "🥰", "🎊", "💖", "🎁", "🌟", "💫", "🎀"];

function useSearchParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export default function Send() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [emojiIdx, setEmojiIdx] = useState(0);
  const emojiTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [occasion, setOccasion] = useState(searchParams.get("occasion") ?? "");
  const [relation, setRelation] = useState(searchParams.get("relation") ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [likes, setLikes] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);

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

  useEffect(() => {
    if (step === 4) {
      emojiTimer.current = setInterval(() => {
        setEmojiIdx(i => (i + 1) % CARD_READY_EMOJIS.length);
      }, 900);
    } else {
      if (emojiTimer.current) clearInterval(emojiTimer.current);
    }
    return () => { if (emojiTimer.current) clearInterval(emojiTimer.current); };
  }, [step]);

  function goTo(nextStep: number, direction: number) {
    setDir(direction);
    setStep(nextStep);
  }

  function buildShareUrl(name: string, msg: string) {
    const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const p = new URLSearchParams({ to: name, occasion, relation });
    if (likes.trim()) p.set("likes", likes.trim());
    if (msg.trim() && msg.trim() !== defaultMsg) {
      try { p.set("msg", btoa(unescape(encodeURIComponent(msg.trim())))); } catch { /* ignore */ }
    }
    return `${base}/card?${p.toString()}`;
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
    } catch { /* fallback */ }
  }

  async function handleCopyForInstagram() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIgCopied(true);
      setTimeout(() => setIgCopied(false), 2500);
    } catch { /* fallback */ }
  }

  function shareOnWhatsApp() {
    const text = `🎁 Hey ${recipientName}! I made you a special surprise card.\nOpen it here 👉 ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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
              {/* Dynamic emoji */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={emojiIdx}
                  initial={{ scale: 0.4, opacity: 0, y: -8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.6, opacity: 0, y: 8 }}
                  transition={{ type: "spring", damping: 12, stiffness: 240 }}
                  style={{ fontSize: 60, marginBottom: 12, lineHeight: 1 }}
                >
                  {CARD_READY_EMOJIS[emojiIdx]}
                </motion.div>
              </AnimatePresence>

              <h1 className="text-2xl font-bold text-white text-center mb-1">Card is ready!</h1>
              <p className="text-center text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
                Share with {recipientName} — they'll get the full 3D surprise ✨
              </p>

              {/* Primary share buttons — large icons */}
              <div className="flex gap-4 w-full mb-5 justify-center">
                {/* WhatsApp */}
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={shareOnWhatsApp}
                  style={{
                    flex: 1,
                    maxWidth: 160,
                    padding: "18px 10px",
                    borderRadius: 18,
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 8px 28px rgba(37,211,102,0.35)",
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </motion.button>

                {/* Instagram */}
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={handleCopyForInstagram}
                  style={{
                    flex: 1,
                    maxWidth: 160,
                    padding: "18px 10px",
                    borderRadius: 18,
                    background: igCopied
                      ? "linear-gradient(135deg, #22c55e, #16a34a)"
                      : "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "background 0.3s",
                    boxShadow: "0 8px 28px rgba(220,39,67,0.3)",
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  {igCopied ? "Copied!" : "Instagram"}
                </motion.button>
              </div>

              {/* Secondary actions: copy + preview */}
              <div className="flex gap-3 w-full mb-4">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCopy}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 12,
                    background: copied ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(255,215,0,0.1)",
                    color: copied ? "white" : "rgba(255,215,0,0.85)",
                    fontWeight: 600, fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    cursor: "pointer", border: "1px solid rgba(255,215,0,0.22)",
                    transition: "all 0.3s",
                  }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied!" : "Copy Link"}
                </motion.button>

                <a
                  href={shareUrl + (shareUrl.includes("?") ? "&preview=1" : "?preview=1")}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1, padding: "12px", borderRadius: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 600, fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    textDecoration: "none",
                  }}
                >
                  <ExternalLink size={14} />
                  Preview
                </a>
              </div>

              <button
                onClick={() => { setStep(1); setOccasion(""); setRelation(""); setRecipientName(""); setLikes(""); setCustomMsg(""); setShareUrl(""); setEmojiIdx(0); }}
                className="text-sm text-center mt-1"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Make another card
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
