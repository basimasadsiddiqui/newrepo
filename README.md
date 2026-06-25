# Akhtar Jewellers — ERP

A jewellery-shop ERP for a Pakistani gold/jewellery business: invoicing (sales,
purchase, bulk), inventory, parties (customers/suppliers), payments & ledgers,
gold/metal rate management, customer orders, and an AI "Automations" suite.

**Stack:** Next.js 16 (App Router, React 19) · TypeScript · PostgreSQL via
Prisma 7 (`@prisma/adapter-pg`) · TailwindCSS 4 + Radix/shadcn · `decimal.js`
for money math · jsPDF for printing.

## Prerequisites

- Node.js 20.6+ (uses `process.loadEnvFile`)
- Docker (for the local Postgres) — or any reachable PostgreSQL instance

## Setup

1. **Create `.env`** in the project root:

   ```env
   # Matches docker-compose.yml (Postgres exposed on host port 5435)
   DATABASE_URL="postgresql://jewel_user:jewel_pass_2024@localhost:5435/jewel_erp"

   # Optional — enables AI automations without configuring a key in the UI.
   # Keys can also be added at runtime via Automations → Settings.
   ANTHROPIC_API_KEY=""
   ```

2. **Start the database, migrate, and seed** (one command):

   ```bash
   npm run db:setup
   ```

   This runs `db:up` (docker compose), `prisma migrate deploy`, then seeds.

3. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## NPM scripts

| Script | Purpose |
|---|---|
| `dev` / `build` / `start` | Next.js dev / production build / serve |
| `lint` | ESLint |
| `db:up` / `db:down` | Start / stop the Postgres container |
| `db:migrate` | `prisma migrate deploy` |
| `db:generate` | Regenerate the Prisma client |
| `db:seed` | Seed via `prisma/seed.js` |
| `db:studio` | Prisma Studio |
| `db:reset` | Reset DB (migrate reset --force) + reseed |
| `db:setup` | Up + migrate + seed (first-time setup) |

## Project structure

The codebase is mid-migration to a modular layout. New code lives under
`src/modules/<feature>/{domain,application,infrastructure,presentation}` and
`src/core/{auth,config,database,errors}`. Many files under `src/lib/*` are now
thin **backward-compat bridges** that re-export from the canonical module
location — prefer importing from `@modules/*` / `@core/*` in new code.

- `src/app` — App Router pages + `/api/*` route handlers
- `src/modules/invoice/application/calculationEngine.ts` — pure, decimal-precise
  jewellery math (Tola/Masha/Ratti, Karat↔Ratti, Pasa, Kaat). The core domain logic.
- `src/components` — feature UI (invoice, inventory, automations, …)
- `prisma/schema.prisma` — data model (multi-tenant under `Organization`)

## AI Automations

`/automations` provides an AI assistant suite: agent chat, voice assistant,
voice-to-invoice, image (inventory) search, daily digest, smart reminders, and
business insights. It supports multiple providers (Anthropic, OpenAI, DeepSeek,
Google Gemini, Mistral, GitHub Models, and browser-side Puter.js) configured at
runtime in **Automations → Settings**, with rule-based fallbacks when offline.

> Note: this app currently has no authentication layer and operates against a
> single hardcoded organization (`org-akhtar`). Do not expose it publicly as-is.
