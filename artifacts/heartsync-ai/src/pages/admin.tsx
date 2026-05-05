import { useState } from "react";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

type CardInfo = {
  id: string;
  clerk_user_id: string;
  owner_email?: string | null;
  recipient_name: string;
  occasion: string;
  template: string;
  is_watermarked: boolean;
  is_premium: boolean;
  created_at: string;
};

type UserInfo = {
  clerk_user_id: string;
  email: string;
  cards_used: number;
  unlocked_templates: string[];
  created_at: string;
};

function useAdminKey() {
  const stored = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("hs_admin_key") ?? "" : "";
  const [key, _setKey] = useState(stored);
  function setKey(k: string) {
    _setKey(k);
    try { sessionStorage.setItem("hs_admin_key", k); } catch { /* ignore */ }
  }
  return [key, setKey] as const;
}

async function apiFetch(path: string, options?: RequestInit) {
  const url = `${BASE}/api${path}`;
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const data = await res.json().catch(() => ({ error: "parse_error", message: "Non-JSON response" }));
  return { ok: res.ok, status: res.status, data };
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 18, padding: "24px 22px", marginBottom: 24,
    }}>
      <h2 style={{ color: "#fff", fontSize: 17, fontWeight: 700, margin: "0 0 18px" }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "11px 14px",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10, color: "#fff", fontSize: 14, outline: "none",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "monospace",
      }}
    />
  );
}

function Btn({ onClick, disabled, danger, children }: { onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 20px", borderRadius: 10, border: "none",
        background: disabled
          ? "rgba(255,255,255,0.08)"
          : danger
            ? "linear-gradient(135deg, #ef4444, #dc2626)"
            : "linear-gradient(135deg, #FFD700, #f59e0b)",
        color: disabled ? "rgba(255,255,255,0.3)" : danger ? "#fff" : "#000",
        fontWeight: 700, fontSize: 13, cursor: disabled ? "default" : "pointer",
        transition: "opacity 0.15s",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function StatusMsg({ msg }: { msg: { type: "ok" | "err"; text: string } | null }) {
  if (!msg) return null;
  return (
    <div style={{
      marginTop: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13,
      background: msg.type === "ok" ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)",
      border: `1px solid ${msg.type === "ok" ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
      color: msg.type === "ok" ? "#4ade80" : "#f87171",
    }}>
      {msg.text}
    </div>
  );
}

function InfoBox({ data }: { data: Record<string, unknown> }) {
  return (
    <div style={{
      marginTop: 12, padding: "12px 14px", borderRadius: 10,
      background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)",
      fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.7)",
      lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-all",
    }}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <span style={{ color: "rgba(255,215,0,0.7)" }}>{k}:</span>{" "}
          {typeof v === "boolean"
            ? <span style={{ color: v ? "#4ade80" : "#f87171" }}>{String(v)}</span>
            : Array.isArray(v)
              ? <span style={{ color: "#a5b4fc" }}>[{(v as unknown[]).join(", ") || "none"}]</span>
              : <span>{String(v ?? "—")}</span>}
        </div>
      ))}
    </div>
  );
}

function RevokeCardPanel({ adminKey }: { adminKey: string }) {
  const [cardId, setCardId] = useState("");
  const [card, setCard] = useState<CardInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [revoked, setRevoked] = useState(false);

  async function lookup() {
    if (!cardId.trim()) return;
    setLoading(true); setMsg(null); setCard(null); setRevoked(false);
    const { ok, data } = await apiFetch(`/admin/lookup-card?key=${encodeURIComponent(adminKey)}&card_id=${encodeURIComponent(cardId.trim())}`);
    setLoading(false);
    if (ok) setCard(data.card as CardInfo);
    else setMsg({ type: "err", text: (data as { message?: string }).message ?? "Not found." });
  }

  async function doRevoke() {
    if (!card) return;
    setLoading(true); setMsg(null);
    const { ok, data } = await apiFetch("/admin/revoke-card", {
      method: "POST",
      body: JSON.stringify({ key: adminKey, card_id: card.id }),
    });
    setLoading(false);
    if (ok) {
      setRevoked(true);
      setCard(c => c ? { ...c, is_watermarked: true, is_premium: false } : c);
      setMsg({ type: "ok", text: `Card "${card.id}" revoked — watermark restored, premium removed.` });
    } else {
      setMsg({ type: "err", text: (data as { message?: string }).message ?? "Revoke failed." });
    }
  }

  return (
    <Panel title="🃏 Revoke a Card">
      <Field label="Card ID">
        <TextInput value={cardId} onChange={v => { setCardId(v); setCard(null); setMsg(null); setRevoked(false); }} placeholder="e.g. ab12cd34" />
      </Field>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <Btn onClick={lookup} disabled={loading || !cardId.trim()}>
          {loading && !card ? "Looking up…" : "Look up card"}
        </Btn>
        {card && !revoked && (
          <Btn onClick={doRevoke} disabled={loading} danger>
            {loading ? "Revoking…" : "Confirm Revoke"}
          </Btn>
        )}
      </div>
      {card && (
        <InfoBox data={{
          id: card.id,
          recipient: card.recipient_name,
          occasion: card.occasion,
          template: card.template,
          owner_email: card.owner_email ?? "—",
          is_premium: card.is_premium,
          is_watermarked: card.is_watermarked,
          created_at: new Date(card.created_at).toLocaleString("en-IN"),
        }} />
      )}
      <StatusMsg msg={msg} />
    </Panel>
  );
}

function RevokePremiumPanel({ adminKey }: { adminKey: string }) {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [revoked, setRevoked] = useState(false);

  async function lookup() {
    if (!email.trim()) return;
    setLoading(true); setMsg(null); setUser(null); setRevoked(false);
    const { ok, data } = await apiFetch(`/admin/lookup-user?key=${encodeURIComponent(adminKey)}&email=${encodeURIComponent(email.trim())}`);
    setLoading(false);
    if (ok) setUser(data.user as UserInfo);
    else setMsg({ type: "err", text: (data as { message?: string }).message ?? "Not found." });
  }

  async function doRevoke() {
    if (!user) return;
    setLoading(true); setMsg(null);
    const { ok, data } = await apiFetch("/admin/revoke-premium", {
      method: "POST",
      body: JSON.stringify({ key: adminKey, email: user.email }),
    });
    setLoading(false);
    if (ok) {
      setRevoked(true);
      setUser(u => u ? { ...u, unlocked_templates: [] } : u);
      setMsg({ type: "ok", text: `Premium revoked for ${user.email} — unlocked templates cleared.` });
    } else {
      setMsg({ type: "err", text: (data as { message?: string }).message ?? "Revoke failed." });
    }
  }

  return (
    <Panel title="⭐ Revoke Premium Status">
      <Field label="Customer Email">
        <TextInput value={email} onChange={v => { setEmail(v); setUser(null); setMsg(null); setRevoked(false); }} placeholder="e.g. user@gmail.com" />
      </Field>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <Btn onClick={lookup} disabled={loading || !email.trim()}>
          {loading && !user ? "Looking up…" : "Look up user"}
        </Btn>
        {user && !revoked && (user.unlocked_templates?.length ?? 0) > 0 && (
          <Btn onClick={doRevoke} disabled={loading} danger>
            {loading ? "Revoking…" : "Confirm Revoke"}
          </Btn>
        )}
        {user && !revoked && (user.unlocked_templates?.length ?? 0) === 0 && (
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, lineHeight: "36px" }}>
            No premium to revoke
          </span>
        )}
      </div>
      {user && (
        <InfoBox data={{
          email: user.email,
          clerk_user_id: user.clerk_user_id,
          cards_used: user.cards_used,
          unlocked_templates: user.unlocked_templates,
          joined: new Date(user.created_at).toLocaleString("en-IN"),
        }} />
      )}
      <StatusMsg msg={msg} />
    </Panel>
  );
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useAdminKey();
  const [keyInput, setKeyInput] = useState(adminKey);
  const [authed, setAuthed] = useState(!!adminKey);
  const [keyErr, setKeyErr] = useState("");
  const [checking, setChecking] = useState(false);

  async function checkKey() {
    const k = keyInput.trim();
    if (!k) return;
    setChecking(true); setKeyErr("");
    const { ok } = await apiFetch(`/admin/lookup-user?key=${encodeURIComponent(k)}&email=_probe_`);
    setChecking(false);
    if (ok || true) {
      setAdminKey(k);
      setAuthed(true);
    }
  }

  async function verifyAndLogin() {
    const k = keyInput.trim();
    if (!k) { setKeyErr("Enter your admin secret."); return; }
    setChecking(true); setKeyErr("");
    const { status } = await apiFetch(`/admin/lookup-card?key=${encodeURIComponent(k)}&card_id=_probe_`);
    setChecking(false);
    if (status === 401) { setKeyErr("Wrong key — try again."); return; }
    setAdminKey(k);
    setAuthed(true);
  }

  const bg = "radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #0d0618 60%, #04000c 100%)";
  const ff = "'Segoe UI', system-ui, sans-serif";

  if (!authed) {
    return (
      <div style={{ minHeight: "100dvh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: ff }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>HeartSync Admin</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 28px" }}>Enter your admin secret to continue</p>
          <input
            type="password"
            value={keyInput}
            onChange={e => { setKeyInput(e.target.value); setKeyErr(""); }}
            onKeyDown={e => e.key === "Enter" && verifyAndLogin()}
            placeholder="Admin secret"
            style={{
              width: "100%", boxSizing: "border-box", padding: "13px 14px",
              background: "rgba(255,255,255,0.06)", border: `1px solid ${keyErr ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 12, color: "#fff", fontSize: 15, outline: "none", marginBottom: 8,
              fontFamily: "monospace",
            }}
          />
          {keyErr && <p style={{ color: "#f87171", fontSize: 12, margin: "0 0 8px" }}>{keyErr}</p>}
          <button
            onClick={verifyAndLogin}
            disabled={checking}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: checking ? "rgba(255,215,0,0.2)" : "linear-gradient(135deg, #FFD700, #f59e0b)",
              color: checking ? "rgba(255,255,255,0.4)" : "#000",
              fontWeight: 800, fontSize: 15, cursor: checking ? "default" : "pointer",
            }}
          >
            {checking ? "Verifying…" : "Enter →"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: bg, padding: "32px 20px 60px", fontFamily: ff }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0 }}>HeartSync Admin</h1>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "4px 0 0" }}>Revoke cards &amp; premium access</p>
          </div>
          <button
            onClick={() => { setAuthed(false); setAdminKey(""); setKeyInput(""); }}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>

        <RevokeCardPanel adminKey={adminKey} />
        <RevokePremiumPanel adminKey={adminKey} />
      </div>
    </div>
  );
}
