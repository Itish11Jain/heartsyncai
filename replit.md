# HeartSync AI

A premium relationship intelligence web app for India. Users describe a first-date scenario and receive a witty Hinglish "Intelligence Report" from a 26-year-old Mumbai wingman AI persona.

## Architecture

**Monorepo** managed by pnpm workspaces.

### Artifacts
- `artifacts/heartsync-ai` — React + Vite frontend (served at `/`)
- `artifacts/api-server` — Express API server (port 8080)

### Shared Libraries
- `lib/api-spec` — OpenAPI spec (`openapi.yaml`) with `POST /report/generate`
- `lib/api-client-react` — Generated TanStack Query hooks + Zod schemas (orval)
- `lib/api-zod` — Zod barrel re-export from generated code
- `lib/integrations-openai-ai-server` — Replit OpenAI integration (server-side)
- `lib/integrations-openai-ai-react` — Replit OpenAI integration (client helper)

## Key Features

- **Free first report** — tracked via `localStorage("heartsync_used_free")`
- **UPI paywall** — ₹99 via UPI ID `8905158970@upi` with QR code; unlocks on any UTR entry
- **AI persona** — GPT-5.2 model with Mumbai wingman system prompt (Hinglish)
- **4 report sections** — Opening Gambit, 5 IQ Questions, Aura Check, Conversation Closers
- **Framer Motion animations** — staggered section reveals, page transitions, loading states

## Frontend Pages

- `/` — Landing page ("Don't guess the vibe. Engineer it.")
- `/generate` — Date context form (partner name, occasion, details, vibe)
- `/report` — Intelligence Report display with free/paid gate

## API Endpoint

`POST /api/report/generate`
Body: `{ partnerName, occasion, knownDetails?, vibe? }`
Response: `{ partnerName, openingGambit, iqQuestions, auraCheck, conversationClosers }`

## State Management

Module-level `reportStore` in `artifacts/heartsync-ai/src/lib/store.ts` passes report data from `/generate` to `/report`.

## Running the Project

```bash
# API server
pnpm --filter @workspace/api-server run dev

# Frontend
pnpm --filter @workspace/heartsync-ai run dev
```

## Code Generation

After editing `lib/api-spec/openapi.yaml`:
```bash
pnpm --filter @workspace/api-client-react run codegen
```
