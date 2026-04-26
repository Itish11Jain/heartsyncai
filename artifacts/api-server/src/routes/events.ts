import { Router, type Request, type Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { pool } from "../lib/db";

const router = Router();

const SUPERUSER_EMAILS = ["jainitisha93@gmail.com"];
const EXCL = `(email IS NULL OR email NOT IN (${SUPERUSER_EMAILS.map((_, i) => `$${i + 1}`).join(",")}))`;
const EXCL_PARAMS = SUPERUSER_EMAILS;

/**
 * Verifies the request is from a signed-in Clerk user whose primary email
 * is on the SUPERUSER_EMAILS allowlist. Replaces the previous ADMIN_SECRET
 * shared-key scheme so no admin credential ever ships in the client bundle.
 *
 * Returns true on success; otherwise responds with 401/403 and returns false.
 */
async function requireSuperuser(req: Request, res: Response): Promise<boolean> {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  try {
    const user = await clerkClient.users.getUser(userId);
    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses?.[0]?.emailAddress ??
      null;
    if (!email || !SUPERUSER_EMAILS.includes(email)) {
      res.status(403).json({ error: "forbidden" });
      return false;
    }
    return true;
  } catch (err) {
    console.error("[events] requireSuperuser failed", err);
    res.status(500).json({ error: "auth_lookup_failed" });
    return false;
  }
}

const ENSURE_TABLE = `
  CREATE TABLE IF NOT EXISTS hs_card_events (
    id           SERIAL PRIMARY KEY,
    event        TEXT NOT NULL,
    fingerprint  TEXT,
    clerk_user_id TEXT,
    email        TEXT,
    occasion     TEXT,
    template     TEXT,
    channel      TEXT,
    has_likes    BOOLEAN,
    used_custom_msg BOOLEAN,
    is_free      BOOLEAN,
    from_card_ref BOOLEAN,
    created_at   TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS hs_card_events_event   ON hs_card_events(event);
  CREATE INDEX IF NOT EXISTS hs_card_events_email   ON hs_card_events(email);
  CREATE INDEX IF NOT EXISTS hs_card_events_created ON hs_card_events(created_at);
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS recipient_name TEXT;
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS card_id TEXT;
  CREATE INDEX IF NOT EXISTS hs_card_events_card_id ON hs_card_events(card_id);
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS utm_source TEXT;
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS utm_medium TEXT;
  ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
  CREATE INDEX IF NOT EXISTS hs_card_events_utm_source ON hs_card_events(utm_source);
`;

const ENSURE_VITALS_TABLE = `
  CREATE TABLE IF NOT EXISTS hs_web_vitals (
    id              SERIAL PRIMARY KEY,
    metric_name     TEXT NOT NULL,
    value_ms        DOUBLE PRECISION NOT NULL,
    page_path       TEXT,
    fingerprint     TEXT,
    connection_type TEXT,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS hs_web_vitals_metric  ON hs_web_vitals(metric_name);
  CREATE INDEX IF NOT EXISTS hs_web_vitals_created ON hs_web_vitals(created_at);
  CREATE INDEX IF NOT EXISTS hs_web_vitals_path    ON hs_web_vitals(page_path);
`;

const VITAL_NAMES = new Set(["LCP", "FCP", "TTFB", "INP", "CLS"]);

/** Trim long UA strings to a short summary (browser + os only). */
function summarizeUA(ua: string | undefined): string | null {
  if (!ua) return null;
  return ua.slice(0, 240);
}

/** Heuristic bot detection from the User-Agent header. Keeps Web Vitals
 *  data clean — synthetic crawlers shouldn't pollute P50/P75/P90. */
const BOT_UA_RE = /bot|crawler|spider|crawling|headless|lighthouse|pingdom|preview|monitor|googlebot|bingbot|yandex|duckduck|baiduspider|facebookexternalhit|slackbot|discordbot|twitterbot|linkedinbot|whatsapp|telegram/i;
function isBotUA(ua: string | undefined): boolean {
  return !!ua && BOT_UA_RE.test(ua);
}

/**
 * POST /api/events/card
 * Records a card analytics event. Superuser emails are silently dropped.
 */
router.post("/events/card", async (req, res) => {
  try {
    await pool.query(ENSURE_TABLE);

    const {
      event, fingerprint, clerk_user_id, email,
      occasion, template, channel,
      has_likes, used_custom_msg, is_free, from_card_ref,
      recipient_name, card_id,
      utm_source, utm_medium, utm_campaign,
    } = req.body as Record<string, unknown>;

    if (!event || typeof event !== "string") {
      return res.status(400).json({ error: "event required" });
    }

    // Silently drop events from superuser
    if (typeof email === "string" && SUPERUSER_EMAILS.includes(email)) {
      return res.json({ ok: true, dropped: true });
    }

    /** Cap free-form UTM strings to keep cardinality bounded. */
    const capUtm = (v: unknown, max: number): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t ? t.slice(0, max) : null;
    };

    await pool.query(
      `INSERT INTO hs_card_events
         (event, fingerprint, clerk_user_id, email, occasion, template,
          channel, has_likes, used_custom_msg, is_free, from_card_ref, recipient_name, card_id,
          utm_source, utm_medium, utm_campaign)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        event,
        fingerprint ?? null,
        clerk_user_id ?? null,
        email ?? null,
        occasion ?? null,
        template ?? null,
        channel ?? null,
        has_likes ?? null,
        used_custom_msg ?? null,
        is_free ?? null,
        from_card_ref ?? null,
        recipient_name ?? null,
        card_id ?? null,
        capUtm(utm_source, 60),
        capUtm(utm_medium, 60),
        capUtm(utm_campaign, 80),
      ],
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("[events/card]", err);
    return res.status(500).json({ error: "internal" });
  }
});

/**
 * POST /api/events/vitals
 * Records a Web Vitals metric (LCP, FCP, TTFB, INP, CLS) from a real user session.
 */
router.post("/events/vitals", async (req, res) => {
  try {
    // Drop bot/crawler/synthetic-monitor traffic so it can't pollute percentiles.
    if (isBotUA(req.get("user-agent") ?? undefined)) {
      return res.json({ ok: true, dropped: true });
    }

    await pool.query(ENSURE_VITALS_TABLE);

    const body = req.body as Record<string, unknown>;
    const metric_name = typeof body["metric_name"] === "string" ? body["metric_name"] : "";
    const value_msRaw = body["value_ms"];
    const value_ms = typeof value_msRaw === "number" ? value_msRaw : Number(value_msRaw);

    if (!VITAL_NAMES.has(metric_name)) {
      return res.status(400).json({ error: "unknown metric_name" });
    }
    // CLS is unitless and tiny (typically 0–1). Other metrics are ms (cap at 10 min).
    const upperBound = metric_name === "CLS" ? 100 : 600000;
    if (!Number.isFinite(value_ms) || value_ms < 0 || value_ms > upperBound) {
      return res.status(400).json({ error: "invalid value_ms" });
    }

    // Drop superuser submissions silently (caller may include email)
    const emailRaw = body["email"];
    if (typeof emailRaw === "string" && SUPERUSER_EMAILS.includes(emailRaw)) {
      return res.json({ ok: true, dropped: true });
    }

    // Cap free-form text inputs to keep cardinality and storage bounded
    const fingerprint = typeof body["fingerprint"] === "string" ? body["fingerprint"].slice(0, 80) : null;
    const page_path = typeof body["page_path"] === "string" ? body["page_path"].slice(0, 200) : null;
    const connection_type = typeof body["connection_type"] === "string"
      ? body["connection_type"].slice(0, 30)
      : null;
    const user_agent = summarizeUA(req.get("user-agent") ?? undefined);

    await pool.query(
      `INSERT INTO hs_web_vitals
         (metric_name, value_ms, page_path, fingerprint, connection_type, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [metric_name, value_ms, page_path, fingerprint, connection_type, user_agent],
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("[events/vitals]", err);
    return res.status(500).json({ error: "internal" });
  }
});

/**
 * GET /api/events/analytics
 * Returns aggregated card analytics, excluding superuser.
 * Auth: Clerk session — caller must be a signed-in superuser email.
 */
router.get("/events/analytics", async (req, res) => {
  if (!(await requireSuperuser(req, res))) return;

  try {
    await pool.query(ENSURE_TABLE);
    await pool.query(ENSURE_VITALS_TABLE);

    const ep = EXCL_PARAMS;

    const [
      overview,
      occasions,
      userCohorts,
      anon_cohorts,
      signedInAfterWall,
      recentCards,
      vitals,
      utm_funnel,
    ] = await Promise.all([
        /* ── overview metrics ── */
        pool.query(
          `SELECT
            COUNT(*) FILTER (WHERE event = 'landing_name_entered')                               AS names_entered,
            COUNT(*) FILTER (WHERE event = 'cta_clicked')                                        AS cta_clicks,
            COUNT(*) FILTER (WHERE event = 'generate_clicked')                                   AS generate_clicks,
            COUNT(*) FILTER (WHERE event = 'card_created')                                       AS cards_created,
            COUNT(*) FILTER (WHERE event = 'card_created' AND is_free = true)                    AS free_cards,
            COUNT(*) FILTER (WHERE event = 'card_created' AND is_free = false)                   AS paid_cards,
            COUNT(*) FILTER (WHERE event = 'card_shared'  AND channel = 'whatsapp')              AS shared_wa,
            COUNT(*) FILTER (WHERE event = 'card_shared'  AND channel = 'instagram')             AS shared_ig,
            COUNT(*) FILTER (WHERE event = 'card_shared'  AND channel = 'link')                  AS shared_link,
            COUNT(*) FILTER (WHERE event = 'card_viewed')                                        AS card_views,
            COUNT(*) FILTER (WHERE event = 'website_visited_from_card')                          AS website_from_card,
            COUNT(*) FILTER (WHERE event = 'card_created' AND from_card_ref = true)              AS created_from_card_ref,
            COUNT(*) FILTER (WHERE event = 'signup_wall_shown')                                  AS signup_walls_shown,
            COUNT(*) FILTER (WHERE event = 'paywall_shown')                                      AS paywall_shown,
            COUNT(*) FILTER (WHERE event = 'paywall_paid')                                       AS paywall_paid,
            COUNT(*) FILTER (WHERE event = 'card_created' AND has_likes = true)                  AS likes_filled,
            COUNT(*) FILTER (WHERE event = 'card_created')                                       AS likes_total,
            COUNT(*) FILTER (WHERE event = 'card_created' AND used_custom_msg = true)            AS custom_msg_changed,
            COUNT(*) FILTER (WHERE event = 'card_created' AND clerk_user_id IS NOT NULL
                              AND is_free = true)                                                 AS signed_in_free_cards,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'landing_name_entered') AS names_entered_users,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'cta_clicked')          AS cta_users,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'generate_clicked')     AS generate_users,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'card_created')         AS cards_created_users,
            COUNT(DISTINCT NULLIF(fingerprint,'')) FILTER (WHERE event = 'card_viewed')          AS card_viewed_users
           FROM hs_card_events WHERE ${EXCL}`,
          ep,
        ),

        /* ── occasions ── */
        pool.query(
          `SELECT occasion, COUNT(*) AS cnt
           FROM hs_card_events
           WHERE event = 'card_created' AND occasion IS NOT NULL AND ${EXCL}
           GROUP BY occasion ORDER BY cnt DESC`,
          ep,
        ),

        /* ── signed-in user cohorts (1, 2, 3 cards) ── */
        pool.query(
          `SELECT cards_used, COUNT(*) AS users
           FROM hs_clerk_users
           WHERE (email IS NULL OR email NOT IN (${SUPERUSER_EMAILS.map((_, i) => `$${i + 1}`).join(",")}))
           GROUP BY cards_used ORDER BY cards_used`,
          SUPERUSER_EMAILS,
        ),

        /* ── anon user cohorts from events ── */
        pool.query(
          `SELECT card_count, COUNT(*) AS users FROM (
             SELECT fingerprint, COUNT(*) AS card_count
             FROM hs_card_events
             WHERE event = 'card_created' AND clerk_user_id IS NULL AND fingerprint IS NOT NULL
               AND ${EXCL}
             GROUP BY fingerprint
           ) t GROUP BY card_count ORDER BY card_count`,
          ep,
        ),

        /* ── unique signed-in users who have created at least one card ── */
        pool.query(
          `SELECT COUNT(DISTINCT clerk_user_id) AS count
           FROM hs_card_events
           WHERE event = 'card_created' AND clerk_user_id IS NOT NULL AND ${EXCL}`,
          ep,
        ),

        /* ── recent cards with recipient names and view counts ── */
        pool.query(
          `SELECT c.card_id, c.recipient_name, c.occasion, c.template, c.is_free, c.created_at,
                  COALESCE(v.view_count, 0) AS view_count
           FROM hs_card_events c
           LEFT JOIN (
             SELECT card_id, COUNT(*) AS view_count
             FROM hs_card_events
             WHERE event = 'card_viewed' AND card_id IS NOT NULL
             GROUP BY card_id
           ) v ON v.card_id = c.card_id
           WHERE c.event = 'card_created' AND ${EXCL}
           ORDER BY c.created_at DESC
           LIMIT 20`,
          ep,
        ),

        /* ── Web Vitals: P50/P75/P90 over the last 24h ── */
        pool.query(
          `SELECT
             metric_name,
             COUNT(*)::int                                              AS samples,
             percentile_cont(0.50) WITHIN GROUP (ORDER BY value_ms)     AS p50,
             percentile_cont(0.75) WITHIN GROUP (ORDER BY value_ms)     AS p75,
             percentile_cont(0.90) WITHIN GROUP (ORDER BY value_ms)     AS p90
           FROM hs_web_vitals
           WHERE created_at > NOW() - INTERVAL '24 hours'
           GROUP BY metric_name
           ORDER BY metric_name`,
        ),

        /* ── UTM funnel: visits → CTA clicks → cards → paid, by source ──
         *
         * "sessions" approximates per-source unique visitors using the
         * persisted device fingerprint. UTM is captured first-touch on the
         * client, so every event a fingerprint emits is attributed to the
         * source that originally brought them. */
        pool.query(
          `SELECT
             COALESCE(NULLIF(utm_source, ''), '(direct)')                                  AS source,
             COUNT(DISTINCT NULLIF(fingerprint, ''))                                        AS sessions,
             COUNT(DISTINCT NULLIF(fingerprint, '')) FILTER (WHERE event = 'cta_clicked')   AS cta_users,
             COUNT(DISTINCT NULLIF(fingerprint, '')) FILTER (WHERE event = 'card_created')  AS card_creators,
             COUNT(*) FILTER (WHERE event = 'card_created')                                 AS cards,
             COUNT(*) FILTER (WHERE event = 'card_created' AND is_free = false)             AS paid_cards
           FROM hs_card_events
           WHERE ${EXCL}
           GROUP BY 1
           ORDER BY sessions DESC NULLS LAST
           LIMIT 30`,
          ep,
        ),
      ]);

    return res.json({
      overview: overview.rows[0],
      occasions: occasions.rows,
      signed_in_cohorts: userCohorts.rows,
      anon_cohorts: anon_cohorts.rows,
      signed_up_after_wall: signedInAfterWall.rows[0]?.count ?? 0,
      recent_cards: recentCards.rows,
      vitals: vitals.rows,
      utm_funnel: utm_funnel.rows,
    });
  } catch (err) {
    console.error("[events/analytics]", err);
    return res.status(500).json({ error: "internal" });
  }
});

/**
 * DELETE /api/events/reset
 * Wipes all analytics + usage data.
 * Auth: Clerk session — caller must be a signed-in superuser email.
 */
router.delete("/events/reset", async (req, res) => {
  if (!(await requireSuperuser(req, res))) return;
  try {
    await pool.query("TRUNCATE TABLE hs_card_events RESTART IDENTITY");
    await pool.query("TRUNCATE TABLE hs_card_usage RESTART IDENTITY");
    await pool.query("TRUNCATE TABLE hs_clerk_users RESTART IDENTITY");
    await pool.query(ENSURE_VITALS_TABLE);
    await pool.query("TRUNCATE TABLE hs_web_vitals RESTART IDENTITY");
    return res.json({ ok: true, message: "All analytics data cleared." });
  } catch (err) {
    console.error("[events/reset]", err);
    return res.status(500).json({ error: "internal" });
  }
});

export default router;
