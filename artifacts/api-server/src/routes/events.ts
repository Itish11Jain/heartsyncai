import { Router, type Request, type Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { pool } from "../lib/db";

const router = Router();

const SUPERUSER_EMAILS = ["jainitisha93@gmail.com"];

/**
 * Recipient names to exclude from analytics entirely. Matched case-insensitively
 * on a *whole-word* basis using Postgres regex word boundaries (`\y…\y`).
 * That means "Itisha", "ITISHA 🌸", and "itisha jain" all match, but innocent
 * names that merely contain these letters ("Nitisha", "Pratisha") do NOT.
 *
 * Two layers of defence:
 *  1. POST /events/card silently drops new inserts that match.
 *  2. GET /events/analytics filters them out of every aggregate query.
 *
 * On first analytics request after server start, any pre-existing matching
 * rows are also DELETEd from the database (one-shot, idempotent).
 */
const EXCLUDED_RECIPIENT_NAMES = ["itisha"] as const;
/** Postgres regex patterns ( ~* operator, case-insensitive, word-bounded). */
const EXCLUDED_RECIPIENT_PATTERNS = EXCLUDED_RECIPIENT_NAMES.map((n) => `\\y${n}\\y`);
/** Equivalent JS regex for the insert-time guard. */
const EXCLUDED_RECIPIENT_REGEX = new RegExp(
  `\\b(?:${EXCLUDED_RECIPIENT_NAMES.join("|")})\\b`,
  "i",
);

function isExcludedRecipient(name: unknown): boolean {
  if (typeof name !== "string") return false;
  return EXCLUDED_RECIPIENT_REGEX.test(name);
}

/**
 * Builds the shared WHERE-fragment + ordered parameter list for every
 * analytics aggregate query. Combines:
 *   - superuser email exclusion
 *   - excluded-recipient-name exclusion
 *   - optional date range (from/to inclusive of full days)
 *
 * Returns a fragment without a leading "WHERE" so callers can splice it
 * into more complex queries (with extra ANDs).
 */
function buildEventFilter(opts: { from?: string | null; to?: string | null } = {}): {
  whereSql: string;
  params: string[];
} {
  const params: string[] = [];
  const conds: string[] = [];

  const emailStart = params.length + 1;
  params.push(...SUPERUSER_EMAILS);
  conds.push(
    `(email IS NULL OR email NOT IN (${SUPERUSER_EMAILS.map((_, i) => `$${emailStart + i}`).join(",")}))`,
  );

  const recipStart = params.length + 1;
  params.push(...EXCLUDED_RECIPIENT_PATTERNS);
  // ~* is the case-insensitive regex match. The patterns use Postgres
  // word-boundary anchors (`\y`) so "Itisha" matches but "Nitisha" does not.
  conds.push(
    `(recipient_name IS NULL OR ${EXCLUDED_RECIPIENT_PATTERNS.map(
      (_, i) => `recipient_name !~* $${recipStart + i}`,
    ).join(" AND ")})`,
  );

  if (opts.from) {
    params.push(opts.from);
    conds.push(`created_at >= $${params.length}::date`);
  }
  if (opts.to) {
    params.push(opts.to);
    // Inclusive end-of-day: rows with created_at strictly before midnight of the next day.
    conds.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  return { whereSql: conds.join(" AND "), params };
}

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

/**
 * Run ENSURE_TABLE / ENSURE_VITALS_TABLE *once* per process. The original
 * code ran the full DDL block on every event POST, and those `ALTER TABLE
 * … ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` statements
 * each take an ACCESS EXCLUSIVE lock. Concurrent requests (e.g. a user
 * tapping the template picker quickly) would race on those locks and
 * occasionally deadlock. Memoising the promise eliminates the race and
 * also removes a lot of redundant catalog work from the hot path.
 */
let _eventsTableReady: Promise<void> | null = null;
function ensureEventsTable(): Promise<void> {
  if (!_eventsTableReady) {
    _eventsTableReady = pool.query(ENSURE_TABLE).then(() => undefined).catch((err) => {
      _eventsTableReady = null; // allow retry on next call if it failed
      throw err;
    });
  }
  return _eventsTableReady;
}

let _vitalsTableReady: Promise<void> | null = null;
function ensureVitalsTable(): Promise<void> {
  if (!_vitalsTableReady) {
    _vitalsTableReady = pool.query(ENSURE_VITALS_TABLE).then(() => undefined).catch((err) => {
      _vitalsTableReady = null;
      throw err;
    });
  }
  return _vitalsTableReady;
}

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
 * Validates a YYYY-MM-DD date string from a query parameter. Returns the
 * canonical string on success or null if missing/invalid. Strict validation
 * prevents SQL date-cast errors and accidental wide-open ranges.
 */
function parseDateParam(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(trimmed + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return trimmed;
}

/**
 * One-shot purge of pre-existing rows whose recipient_name matches an
 * excluded pattern. Memoised per process so it only runs once per server
 * start, which is enough — the POST /events/card handler now silently
 * drops new matches, so this just cleans up legacy data.
 */
let _purgedExcludedRecipients = false;
async function ensureExcludedRecipientsPurged(): Promise<void> {
  if (_purgedExcludedRecipients) return;
  if (EXCLUDED_RECIPIENT_PATTERNS.length === 0) {
    _purgedExcludedRecipients = true;
    return;
  }
  try {
    const orClause = EXCLUDED_RECIPIENT_PATTERNS.map(
      (_, i) => `recipient_name ~* $${i + 1}`,
    ).join(" OR ");
    const result = await pool.query(
      `DELETE FROM hs_card_events
       WHERE recipient_name IS NOT NULL AND (${orClause})`,
      EXCLUDED_RECIPIENT_PATTERNS,
    );
    if ((result.rowCount ?? 0) > 0) {
      console.log(
        `[events] purged ${result.rowCount} excluded-recipient rows from hs_card_events`,
      );
    }
    _purgedExcludedRecipients = true;
  } catch (err) {
    console.error("[events] failed to purge excluded recipients", err);
  }
}

/** Returns true when the request originates from a dev/staging domain. */
function isDevRequest(req: Request): boolean {
  const origin = req.get("origin") ?? req.get("referer") ?? "";
  return origin.includes(".replit.dev") || origin.includes("janeway.replit.dev") ||
    origin.includes("localhost") || origin.includes("127.0.0.1");
}

/**
 * POST /api/events/card
 * Records a card analytics event. Superuser emails and excluded recipient
 * names are silently dropped so they never enter the analytics dataset.
 */
router.post("/events/card", async (req, res) => {
  try {
    // Silently drop events from dev / staging environments.
    if (isDevRequest(req)) {
      return res.json({ ok: true, dropped: true });
    }

    await ensureEventsTable();

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

    // Silently drop events whose recipient name matches an excluded pattern
    // (e.g. cards addressed to "Itisha"). Keeps analytics free of self-tests.
    if (isExcludedRecipient(recipient_name)) {
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

    await ensureVitalsTable();

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
 *
 * Returns aggregated card analytics, excluding superuser and rows whose
 * recipient_name matches an excluded pattern. Optionally accepts a date
 * range via `?from=YYYY-MM-DD&to=YYYY-MM-DD` (both inclusive). Either
 * endpoint can be omitted for an open-ended range.
 *
 * Auth: Clerk session — caller must be a signed-in superuser email.
 */
router.get("/events/analytics", async (req, res) => {
  if (!(await requireSuperuser(req, res))) return;

  try {
    await ensureEventsTable();
    await ensureVitalsTable();
    await ensureExcludedRecipientsPurged();

    const from = parseDateParam(req.query["from"]);
    const to = parseDateParam(req.query["to"]);

    const filter = buildEventFilter({ from, to });
    const { whereSql, params } = filter;

    /**
     * Vitals filter: applies the same date range when supplied; otherwise
     * defaults to the rolling 24-hour window so the widget keeps working
     * for the common "what's happening right now?" case.
     */
    const vitalsParams: string[] = [];
    let vitalsWhere: string;
    if (from || to) {
      const conds: string[] = [];
      if (from) {
        vitalsParams.push(from);
        conds.push(`created_at >= $${vitalsParams.length}::date`);
      }
      if (to) {
        vitalsParams.push(to);
        conds.push(`created_at < ($${vitalsParams.length}::date + INTERVAL '1 day')`);
      }
      vitalsWhere = conds.join(" AND ");
    } else {
      vitalsWhere = `created_at > NOW() - INTERVAL '24 hours'`;
    }

    /**
     * "Recent cards" view-count subquery shares the exact same filter as the
     * outer SELECT (same email exclusions, same recipient exclusions, same
     * date range). Because the placeholders ($1, $2, …) are identical in both
     * the subquery and the outer WHERE, Postgres lets us bind the params just
     * once even though they're referenced twice in the SQL.
     */

    const [
      overview,
      occasions,
      userCohorts,
      anon_cohorts,
      signedInAfterWall,
      recentCards,
      vitals,
      utm_funnel,
      premiumClicks,
      recipientCtaFunnel,
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
           FROM hs_card_events WHERE ${whereSql}`,
          params,
        ),

        /* ── occasions ── */
        pool.query(
          `SELECT occasion, COUNT(*) AS cnt
           FROM hs_card_events
           WHERE event = 'card_created' AND occasion IS NOT NULL AND ${whereSql}
           GROUP BY occasion ORDER BY cnt DESC`,
          params,
        ),

        /* ── signed-in user cohorts (1, 2, 3 cards) ──
         * hs_clerk_users has no created_at or recipient_name column, so this
         * query stays scoped to the email exclusion only. It represents
         * lifetime cohorts, independent of the selected date range. */
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
               AND ${whereSql}
             GROUP BY fingerprint
           ) t GROUP BY card_count ORDER BY card_count`,
          params,
        ),

        /* ── unique signed-in users who have created at least one card ── */
        pool.query(
          `SELECT COUNT(DISTINCT clerk_user_id) AS count
           FROM hs_card_events
           WHERE event = 'card_created' AND clerk_user_id IS NOT NULL AND ${whereSql}`,
          params,
        ),

        /* ── recent cards with recipient names and view counts ──
         * The view-count subquery applies the same exclusion + date filter
         * so we don't include views of cards that no longer pass the filter. */
        pool.query(
          `SELECT c.card_id, c.recipient_name, c.occasion, c.template, c.is_free, c.created_at,
                  COALESCE(v.view_count, 0) AS view_count
           FROM hs_card_events c
           LEFT JOIN (
             SELECT card_id, COUNT(*) AS view_count
             FROM hs_card_events
             WHERE event = 'card_viewed' AND card_id IS NOT NULL
               AND ${whereSql}
             GROUP BY card_id
           ) v ON v.card_id = c.card_id
           WHERE c.event = 'card_created' AND ${whereSql}
           ORDER BY c.created_at DESC
           LIMIT 20`,
          // Same placeholders ($1, $2, …) appear in both subquery and outer
          // WHERE — Postgres binds each $N once and reuses it everywhere.
          params,
        ),

        /* ── Web Vitals: P50/P75/P90 for the selected range (or last 24h). ── */
        pool.query(
          `SELECT
             metric_name,
             COUNT(*)::int                                              AS samples,
             percentile_cont(0.50) WITHIN GROUP (ORDER BY value_ms)     AS p50,
             percentile_cont(0.75) WITHIN GROUP (ORDER BY value_ms)     AS p75,
             percentile_cont(0.90) WITHIN GROUP (ORDER BY value_ms)     AS p90
           FROM hs_web_vitals
           WHERE ${vitalsWhere}
           GROUP BY metric_name
           ORDER BY metric_name`,
          vitalsParams,
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
           WHERE ${whereSql}
           GROUP BY 1
           ORDER BY sessions DESC NULLS LAST
           LIMIT 30`,
          params,
        ),

        /* ── Recipient-card "Create your own card" CTA funnel ──
         * Measures the recipient → creator viral loop:
         *   - clicks   = total taps on the CTA at the end of a received card
         *   - users    = distinct devices (fingerprints) that tapped it
         *   - cards    = how many of those devices then created a card
         *
         * The cards-after-click count joins on fingerprint inside the same
         * date window — a click + a card-create from the same device count
         * as one conversion. */
        pool.query(
          `WITH clickers AS (
             SELECT DISTINCT fingerprint
             FROM hs_card_events
             WHERE event = 'create_own_clicked'
               AND fingerprint IS NOT NULL AND fingerprint <> ''
               AND ${whereSql}
           )
           SELECT
             (SELECT COUNT(*)::int FROM hs_card_events
                WHERE event = 'create_own_clicked' AND ${whereSql})         AS clicks,
             (SELECT COUNT(*)::int FROM clickers)                           AS unique_clickers,
             (SELECT COUNT(DISTINCT e.fingerprint)::int
                FROM hs_card_events e
                WHERE e.event = 'card_created'
                  AND e.fingerprint IN (SELECT fingerprint FROM clickers)
                  AND ${whereSql})                                          AS cards_after_click`,
          params,
        ),

        /* ── Premium-card click breakdown by template ──
         * `paywall_shown` fires the moment a user taps a premium template
         * card (cosmic / crystal / vinyl) and the paywall opens. We expose:
         *   - per-template click count (events) and unique customers
         *   - total clicks + total unique customers across all premium
         * so the dashboard can show "X customers clicked premium, broken
         * down as Y on cosmic, Z on crystal, ...". Templates are kept as
         * raw event values rather than hard-coding the premium list, so
         * adding a new premium template later doesn't require a code
         * change here. */
        pool.query(
          `SELECT
             template,
             COUNT(*)::int                                          AS clicks,
             COUNT(DISTINCT NULLIF(fingerprint, ''))::int           AS unique_customers
           FROM hs_card_events
           WHERE event = 'paywall_shown'
             AND template IS NOT NULL AND template <> ''
             AND ${whereSql}
           GROUP BY template
           ORDER BY clicks DESC`,
          params,
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
      premium_clicks: premiumClicks.rows,
      recipient_cta_funnel: recipientCtaFunnel.rows[0] ?? { clicks: 0, unique_clickers: 0, cards_after_click: 0 },
      // Echo back the effective range so the UI can show what's selected.
      range: { from: from ?? null, to: to ?? null },
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
