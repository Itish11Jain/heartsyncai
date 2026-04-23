# HeartSync AI

A premium relationship intelligence web app for India. Users describe a first-date scenario and receive an AI-generated "Intelligence Report" with 4 sections of dating strategy, tailored for the Indian context.

## Architecture

**Monorepo** managed by pnpm workspaces.

### Artifacts
- `artifacts/heartsync-ai` — React + Vite frontend (served at `/`)
- `artifacts/api-server` — Express API server (port 8080)

### Shared Libraries
- `lib/api-spec` — OpenAPI spec (`openapi.yaml`) — add endpoints here, run codegen
- `lib/api-client-react` — Generated TanStack Query hooks (orval) — do not edit manually
- `lib/api-zod` — Generated Zod schemas (orval) — do not edit manually
- `lib/integrations-openai-ai-server` — Replit OpenAI integration (server-side)

## Key Features

- **Firebase Auth** — Email/Password (primary, free) + Phone OTP (secondary, limited)
  - Sessions last 90 days via JWT signed with SESSION_SECRET
  - Firebase persistence set to browserLocalPersistence (survives browser restarts)
- **Credit system** — 1 free credit on signup; ₹99 via UPI buys 5 more credits
  - Credits tracked server-side in PostgreSQL (`hs_users` table)
  - All 4 report sections are always fully visible (no per-section locking)
- **UPI paywall** — on the generate page when credits = 0; UTR submission adds 5 credits instantly
- **AI persona** — GPT-5.2 with HeartSync AI system prompt (English, Indian context)
- **4 report sections** — Inner Game, Opening Gambit, IQ Questions, Conversation Closers
- **Framer Motion animations** — page transitions, staggered reveals, loading states

## Frontend Pages

- `/` — Landing page
- `/generate` — Auth gate → credit check → date context form (or paywall if credits = 0)
- `/report` — Interactive tabbed report (all 4 sections fully unlocked)
- `/moments` — AI greeting card generator (freemium: 2 free, then ₹50/10 pack)
- `/send` — 3D Card Builder: 3-step wizard (occasion → relation → name) → generates shareable link
- `/card?to=&occasion=&relation=&msg=` — Premium 3D Card Recipient Experience (4-phase animation)

## Auth Flow

1. User visits `/generate` → sees `AuthGate` overlay
2. Signs in via Email (creates account if new) or Phone OTP (+91 prefix)
3. Firebase returns ID token → sent to `POST /api/auth/verify`
4. Backend verifies with Firebase Admin SDK → upserts user in `hs_users` → returns session JWT + credits
5. Session JWT stored in `heartsync_auth_v1` localStorage key via `authStore`
6. `setAuthTokenGetter` in `main.tsx` attaches JWT to all API calls automatically

## Database Schema

```sql
CREATE TABLE hs_users (
  id SERIAL PRIMARY KEY,
  firebase_uid TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,  -- email or masked phone
  credits INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE hs_credit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES hs_users(id),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,  -- 'free_signup', 'utr_payment', 'report_generated'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/verify | No | Verify Firebase ID token, return session JWT + credits |
| POST | /api/report/generate | Required | Generate report, deduct 1 credit |
| POST | /api/payment/submit-utr | Required | Submit UTR, add 5 credits |
| GET | /api/payment/status/:id | No | Check payment status (legacy) |
| GET | /api/healthz | No | Health check |

## Environment Variables

| Key | Where | Description |
|-----|-------|-------------|
| VITE_FIREBASE_API_KEY | shared env | Firebase web config (public) |
| VITE_FIREBASE_AUTH_DOMAIN | shared env | Firebase web config (public) |
| VITE_FIREBASE_PROJECT_ID | shared env | Firebase web config (public) |
| VITE_FIREBASE_STORAGE_BUCKET | shared env | Firebase web config (public) |
| VITE_FIREBASE_MESSAGING_SENDER_ID | shared env | Firebase web config (public) |
| VITE_FIREBASE_APP_ID | shared env | Firebase web config (public) |
| FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON | secret | Firebase Admin SDK service account JSON |
| SESSION_SECRET | secret | JWT signing secret |
| DATABASE_URL | runtime | PostgreSQL connection string |

## Firebase Console Requirements

- Authentication → Sign-in method → **Email/Password**: Enabled
- Authentication → Sign-in method → **Phone**: Enabled
- Authentication → Settings → **Authorized domains**: Add your Replit dev domain

## State Management

- `authStore` (`src/lib/auth-store.ts`) — persists session token, display name, credits to localStorage
- `reportStore` (`src/lib/store.ts`) — persists most recent report to localStorage (key: `heartsync_report_v5`)
- Auth token automatically attached to all API calls via `setAuthTokenGetter` in `main.tsx`

## Code Generation

After editing `lib/api-spec/openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
```

## Running the Project

```bash
pnpm --filter @workspace/api-server run dev   # API server
pnpm --filter @workspace/heartsync-ai run dev  # Frontend
```
