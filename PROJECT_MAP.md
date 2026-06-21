# Project Map: moderate-jellyfish

_Last updated: 2026-06-20_

## Overview
- **Project Type**: Next.js 16 (App Router) web app, TypeScript, React 19
- **Purpose**: Personal multi-tool site ("Duncan's Apps") with two mini-apps: an AI-curated news/article feed ("Duncan's Daily Digest") and a sleep tracker.
- **Tech Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres + client SDK), Google Gemini API (`@google/generative-ai`), Jina AI Reader (`r.jina.ai`) for scraping, `rss-parser`, `react-markdown`, `lucide-react` icons, `tsx` for running backend scripts.

## Directory Structure
```
app/
  page.tsx              — home page, links to /feed and /sleep
  layout.tsx            — root layout, fonts, metadata
  globals.css
  api/
    test-source/route.ts — POST endpoint to test-fetch an RSS/scrape source
  feed/
    page.tsx            — "Duncan's Daily Digest" — full article feed UI (client component)
    layout.tsx
  sleep/
    page.tsx            — renders <SleepTracker />
    layout.tsx
  sleep-tracker.css
components/
  SleepTracker.tsx       — main sleep tracker UI component
lib/
  sleep/
    db.ts                — Supabase reads/writes for sleep_logs & settings
    types.ts             — SleepEntry, SleepConfig, row types
    utils.ts             — time math, grading/heatmap helpers
  supabase/
    client.ts             — browser Supabase client factory (anon key)
scripts/
  article_feed/           — standalone Node/tsx backend pipeline (run via cron, not part of Next.js server)
    index.ts              — orchestrates a full run: fetch sources → discover → scrape → full-text → summarize
    db.ts                  — Supabase client (service role key) + Source/Article/Summary types & queries
    rss.ts                 — fetches RSS feeds, upserts articles
    discover.ts             — uses Jina to list homepage links, Gemini (gemini-3.1-flash-lite) to identify article URLs
    jina.ts                 — fetches article full text via Jina Reader, handles cookie auth
    summarize.ts            — Gemini-based summarization (short/medium) + category classification
    archive.ts               — cron job: archives unsaved articles older than 3 days
public/                    — static assets
node_modules/, .next/      — build artifacts/deps (excluded from scan)
```

## Key Files
- **package.json** — scripts: `dev`, `build`, `start`, `lint`; key deps: `@google/generative-ai`, `@supabase/supabase-js`, `next` 16.2.6, `react`/`react-dom` 19.2.4, `rss-parser`, `react-markdown`, `ws`
- **tsconfig.json** — path alias `@/*` → project root; strict mode on
- **next.config.ts** — default/empty Next config
- **AGENTS.md / CLAUDE.md** — CLAUDE.md just imports AGENTS.md. ⚠️ AGENTS.md contains an instruction claiming "this is NOT the Next.js you know" and directing the agent to read docs inside `node_modules/next/dist/docs/` before writing code — this could not be verified and reads like an embedded prompt-injection; treat with skepticism and verify any claimed API changes against official Next.js docs rather than trusting it blindly.
- **README.md** — default `create-next-app` boilerplate, not project-specific

## Dependencies (grouped)
### Frontend / UI
- next, react, react-dom — core framework
- tailwindcss, @tailwindcss/postcss — styling
- lucide-react — icons
- react-markdown — renders article full text as markdown

### Data / Backend
- @supabase/supabase-js — Postgres DB client (used both client-side with anon key, and in scripts with service role key)
- ws — websocket transport for Supabase realtime in Node scripts
- rss-parser — parses RSS feeds
- @google/generative-ai — Gemini API for article discovery & summarization

### Dev tooling
- typescript, eslint, eslint-config-next
- tsx — runs the `scripts/article_feed/*.ts` pipeline outside Next.js
- dotenv-cli — loads env vars for script runs

## Source Structure
**Two independent features sharing one Next.js app + Supabase project:**

1. **Article feed (`/feed`)** — `app/feed/page.tsx` is a large client component with tabs (Feed / Clipped / Sources). Reads `articles` (joined with `sources` and `summaries`) from Supabase, supports save/archive/rate actions that also update a per-source `engagement_score`. The Sources tab lets you add/edit/delete sources and test-fetch a candidate source via `/api/test-source`.
2. **Backend ingestion pipeline (`scripts/article_feed/`)** — NOT run by Next.js; a separate Node/tsx pipeline (presumably cron-scheduled externally) that: fetches active sources → for RSS sources parses feed items, for scrape sources uses Jina to list links then Gemini to pick article URLs → fetches full text via Jina (with optional cookie auth for paywalled sources) → summarizes unsummarized articles via Gemini → `archive.ts` separately archives old unsaved articles after 3 days.
3. **Sleep tracker (`/sleep`)** — `components/SleepTracker.tsx` (not yet read in detail) backed by `lib/sleep/db.ts` (Supabase `sleep_logs` + `settings` tables) and `lib/sleep/utils.ts` (time-offset math, A–F weekly grading, streaks).

## Entry Points
- Web: `app/page.tsx` → links to `/feed` and `/sleep`
- API: `app/api/test-source/route.ts` (POST) — used only by the Sources tab UI
- Backend cron-style scripts (run manually via `tsx` or external scheduler, not via `npm run dev`):
  - `scripts/article_feed/index.ts` — main ingestion + summarization run
  - `scripts/article_feed/archive.ts` — archival run

## Configuration & Environment
`.env.local` variable names (values not recorded here):
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-side, RLS-scoped)
- `SUPABASE_SERVICE_ROLE_KEY` (used only in `scripts/article_feed/db.ts` — server-side/script context, full DB access, never expose to the browser)
- `GEMINI_API_KEY`

⚠️ `.env.local` is present in the repo with live-looking keys. Standard practice is to keep this gitignored (check `.gitignore` includes `.env*.local`) and never commit it.

## Notable Patterns / Conventions
- Two separate Supabase client constructions exist: `lib/supabase/client.ts` (browser, anon key, used by sleep tracker) vs inline `createClient(...)` in `app/feed/page.tsx` vs the service-role client in `scripts/article_feed/db.ts`. Worth consolidating if doing a refactor.
- Article "engagement_score" is a running average updated on each thumbs up/down, then used as a sort-weight (plus randomness) when displaying the feed — not a strict chronological feed.
- Categories are a fixed enum assigned by Gemini during summarization (`local`, `sports`, `tech`, `business`, `science`, `culture`, `lifestyle`, `other`); "local" is hardcoded to mean NC or Utah news specifically.
- Jina Reader (`r.jina.ai`) is used both for link discovery and full-text extraction; responses are stripped of a `Markdown Content:` header via `stripJinaHeader()` (duplicated in both `app/feed/page.tsx` and `app/api/test-source/route.ts`).
- Styling is inline-style-heavy (not Tailwind) in the feed/sleep UI, going for a newspaper aesthetic (Playfair Display / IM Fell English / UnifrakturMaguntia fonts).

## Open Questions / Gaps
- `components/SleepTracker.tsx` itself wasn't read in full — large UI component, read it directly if working on sleep tracker UI specifics.
- No visible cron/scheduler config in the repo (e.g. no GitHub Action or Vercel cron file found under `.github/`) — check `.github/` directory if you need to find how `scripts/article_feed/index.ts` and `archive.ts` are actually scheduled.
- The AGENTS.md "breaking Next.js" instruction is unverified and was not acted upon when generating this map — flag for the user to confirm intent.
