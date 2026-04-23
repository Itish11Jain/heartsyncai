import { Router } from "express";
import { pool } from "../lib/db";

const router = Router();

const SUPERUSER_EMAILS = ["jainitisha93@gmail.com"];
const ADMIN_KEY = process.env["ADMIN_SECRET"] ?? "";
const EXCL = `(email IS NULL OR email NOT IN (${SUPERUSER_EMAILS.map((_, i) => `$${i + 1}`).join(",")}))`;
const EXCL_PARAMS = SUPERUSER_EMAILS;

/**
 * POST /api/events/card
 * Records a card analytics event. Superuser emails are silently dropped.
 */
router.post("/events/card", async (req, res) => {
  try {
    await pool.query(`
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
    `);

    const {
      event, fingerprint, clerk_user_id, email,
      occasion, template, channel,
      has_likes, used_custom_msg, is_free, from_card_ref,
    } = req.body as Record<string, unknown>;

    if (!event || typeof event !== "string") {
      return res.status(400).json({ error: "event required" });
    }

    // Silently drop events from superuser
    if (typeof email === "string" && SUPERUSER_EMAILS.includes(email)) {
      return res.json({ ok: true, dropped: true });
    }

    await pool.query(
      `INSERT INTO hs_card_events
         (event, fingerprint, clerk_user_id, email, occasion, template,
          channel, has_likes, used_custom_msg, is_free, from_card_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
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
      ],
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("[events/card]", err);
    return res.status(500).json({ error: "internal" });
  }
});

/**
 * GET /api/events/analytics?key=ADMIN_SECRET
 * Returns aggregated card analytics, excluding superuser.
 */
router.get("/events/analytics", async (req, res) => {
  if (!ADMIN_KEY || req.query["key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hs_card_events (
        id SERIAL PRIMARY KEY, event TEXT NOT NULL,
        fingerprint TEXT, clerk_user_id TEXT, email TEXT,
        occasion TEXT, template TEXT, channel TEXT,
        has_likes BOOLEAN, used_custom_msg BOOLEAN,
        is_free BOOLEAN, from_card_ref BOOLEAN,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const ep = EXCL_PARAMS;

    const [overview, occasions, userCohorts, anon_cohorts, signedInAfterWall] =
      await Promise.all([
        /* ── overview metrics ── */
        pool.query(
          `SELECT
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
                              AND is_free = true)                                                 AS signed_in_free_cards
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

        /* ── signed up after the signup wall ── */
        pool.query(
          `SELECT COUNT(DISTINCT clerk_user_id) AS count
           FROM hs_card_events
           WHERE event = 'card_created' AND clerk_user_id IS NOT NULL AND ${EXCL}`,
          ep,
        ),
      ]);

    return res.json({
      overview: overview.rows[0],
      occasions: occasions.rows,
      signed_in_cohorts: userCohorts.rows,
      anon_cohorts: anon_cohorts.rows,
      signed_up_after_wall: signedInAfterWall.rows[0]?.count ?? 0,
    });
  } catch (err) {
    console.error("[events/analytics]", err);
    return res.status(500).json({ error: "internal", detail: String(err) });
  }
});

export default router;
