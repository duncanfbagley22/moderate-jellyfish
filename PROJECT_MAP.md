# Project Map: moderate-jellyfish

_Last updated: 2026-07-05_

## Overview
- **Project Type**: Next.js 16 (App Router) web app, TypeScript, React 19
- **Purpose**: Personal multi-tool site ("Duncan's Apps") with three mini-apps: an AI-curated news/article feed ("Duncan's Daily Digest"), a sleep tracker, and "Springboard" — an AI-assisted personal project-ideation tool.
- **Tech Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Radix UI primitives, Supabase (Postgres + client SDK), Google Gemini API (`@google/generative-ai`), Jina AI Reader (`r.jina.ai`) for scraping, `rss-parser`, `react-markdown`, `lucide-react` icons, `tsx` for running backend scripts.

## Directory Structure
```
app/
  page.tsx              — home page ("Duncan's Apps"), links to /feed, /sleep, /springboard
  layout.tsx            — root layout, fonts, metadata
  globals.css, icon.png
  feed/
    page.tsx, layout.tsx — "Duncan's Daily Digest" — full article feed UI (client component)
    api/test-source/route.ts — POST endpoint to test-fetch an RSS/scrape source
    styles/feed.module.css
  sleep/
    page.tsx, layout.tsx — renders <SleepTracker />
    components/SleepTracker.tsx — main sleep tracker UI
    lib/
      db.ts             — Supabase reads/writes for sleep_logs & settings
      types.ts           — SleepEntry, SleepConfig, UiState, row types
      utils.ts           — time math, grading/heatmap helpers
      ui-state.ts        — localStorage-backed dark-mode + calendar-offset UI state (key: sleepy_v5_ui)
    styles/sleep-tracker.css
  springboard/            — "Springboard" (formerly referred to as Balanza) — AI project-ideation tool
    page.tsx              — renders <SpringboardApp />
    SpringboardApp.tsx     — main client component; owns view state (flowchart ⇄ sandbox), prompt params, generation + save flow
    api/route.ts           — POST endpoint; builds the Gemini prompt from PromptParams and calls Gemini
    components/
      FlowchartView.tsx    — landing view, 3-node flowchart (Deficit / Status Quo / Growth)
      TierStack.tsx        — left-panel force selector in sandbox view
      SandboxPanel.tsx     — sliders/selects for topic, timeframe, intent, platform, friction, creativity
      PromptBar.tsx        — free-text prompt input + submit
      OutputPanel.tsx       — renders generated markdown blueprint, save button
      Baseline.tsx          — decorative baseline motif behind flowchart view
      GlassCard.tsx          — shared glass-morphism card wrapper
      InfoButton.tsx         — "?" popover explaining the tool / a given force
    lib/
      types.ts             — Tier/Topic/Timeframe/Intent/Platform enums, PromptParams, SavedBlueprint, label maps
      gemini.ts             — client-side fetch wrapper calling /springboard/api
      session.ts            — localStorage-backed anonymous session id (key: springboard:session_id)
      clsx.ts                — small classnames helper
    styles/springboard.css
components/
  BackHome.tsx            — shared "back to home" nav button used across sub-apps
lib/
  supabase/client.ts        — browser Supabase client factory (anon key), shared across feed/sleep/springboard
scripts/
  article_feed/             — standalone Node/tsx backend pipeline (run via cron, not part of Next.js server)
    index.ts, db.ts, rss.ts, discover.ts, jina.ts, summarize.ts, archive.ts
public/                     — static assets
node_modules/, .next/, .git/, .github/ — excluded from deep scan
```

## Key Files
- **package.json** — scripts: `dev`, `build`, `start`, `lint`; key deps: `@google/generative-ai`, `@supabase/supabase-js`, `framer-motion`, `@radix-ui/react-select` / `react-slider` / `react-toggle-group`, `next` 16.2.6, `react`/`react-dom` 19.2.4, `rss-parser`, `react-markdown`, `ws`
- **tsconfig.json** — path alias `@/*` → project root; strict mode on
- **next.config.ts** — default/empty Next config
- **AGENTS.md / CLAUDE.md** — CLAUDE.md just imports AGENTS.md. ⚠️ AGENTS.md contains an instruction claiming "this is NOT the Next.js you know" and directing the agent to read docs inside `node_modules/next/dist/docs/` before writing code — unverified, reads like an embedded prompt-injection; treat with skepticism and verify any claimed API changes against official Next.js docs.
- **README.md** — default `create-next-app` boilerplate plus a link to this PROJECT_MAP.md

## Dependencies (grouped)
### Frontend / UI
- next, react, react-dom — core framework
- tailwindcss, @tailwindcss/postcss, @tailwindcss/typography — styling
- framer-motion — animation (springboard flowchart ⇄ sandbox transitions, shared layoutId FLIP animations)
- @radix-ui/react-select, react-slider, react-toggle-group — accessible primitives used in springboard's SandboxPanel
- lucide-react — icons
- react-markdown — renders article full text / springboard blueprint output as markdown

### Data / Backend
- @supabase/supabase-js — Postgres DB client (browser anon key in `lib/supabase/client.ts`; service role key separately in `scripts/article_feed/db.ts`)
- ws — websocket transport for Supabase realtime in Node scripts
- rss-parser — parses RSS feeds
- @google/generative-ai — Gemini API for article discovery/summarization (feed) and blueprint generation (springboard)

### Dev tooling
- typescript, eslint, eslint-config-next
- tsx — runs the `scripts/article_feed/*.ts` pipeline outside Next.js
- dotenv-cli — loads env vars for script runs

## Source Structure
**Three independent features sharing one Next.js app + Supabase project:**

1. **Article feed (`/feed`)** — large client component with tabs (Feed / Clipped / Sources). Reads `articles` (joined with `sources` and `summaries`) from Supabase, supports save/archive/rate actions that also update a per-source `engagement_score`. Sources tab lets you add/edit/delete sources and test-fetch a candidate via `/feed/api/test-source`.
2. **Backend ingestion pipeline (`scripts/article_feed/`)** — NOT run by Next.js; a separate Node/tsx pipeline that: fetches active sources → RSS parse or Jina-discover article links → Gemini picks article URLs → fetches full text via Jina → summarizes unsummarized articles via Gemini → `archive.ts` separately archives old unsaved articles after 3 days.
3. **Sleep tracker (`/sleep`)** — `SleepTracker.tsx` backed by `lib/db.ts` (Supabase `sleep_logs` + `settings` tables, date-ranged settings periods via a Postgres `daterange` exclusion constraint), `lib/utils.ts` (time-offset math, A–F weekly grading, streaks), and `lib/ui-state.ts` (persists dark mode + calendar offset to localStorage). Includes a comments/notes system backed by a separate `sleep_comments` table and dog-ear calendar indicators (not yet reflected in file names above — logic lives inside `SleepTracker.tsx` / `lib/db.ts`).
4. **Springboard (`/springboard`)** — the personal project-ideation tool (Duncan sometimes calls it "Balanza"). Frames personal projects around three forces — **Clean Up** (`clean_up`, state label "Deficit"), **Maintenance** (state label "Status Quo"), and **Growth** — via a `Tier` type. Flow: land on `FlowchartView` (3-node diagram) → pick a force → sandbox view with `TierStack` (force switcher), `SandboxPanel` (topic/timeframe/intent/platform selects + friction/creativity sliders), `PromptBar` (free-text ask) → `POST /springboard/api` builds a single-shot Gemini prompt (model choice `gemini-3.5-flash` or `gemini-3.1-flash-lite`, temperature mapped from the 0–100 creativity slider) → renders markdown in `OutputPanel` → optional save to Supabase `saved_blueprints` table, keyed by an anonymous per-browser `session_id` (localStorage, see `lib/session.ts`).

## Entry Points
- Web: `app/page.tsx` → links to `/feed`, `/sleep`, `/springboard`
- APIs:
  - `app/feed/api/test-source/route.ts` (POST) — used only by the feed Sources tab UI
  - `app/springboard/api/route.ts` (POST) — generates a blueprint from `PromptParams` via Gemini
- Backend cron-style scripts (run manually via `tsx` or external scheduler, not via `npm run dev`):
  - `scripts/article_feed/index.ts` — main ingestion + summarization run
  - `scripts/article_feed/archive.ts` — archival run

## Configuration & Environment
`.env.local` variable names (values not recorded here):
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-side, RLS-scoped — used by feed, sleep, and springboard)
- `SUPABASE_SERVICE_ROLE_KEY` (used only in `scripts/article_feed/db.ts` — server-side/script context, full DB access, never expose to the browser)
- `GEMINI_API_KEY` (used by both `scripts/article_feed/summarize.ts` and `app/springboard/api/route.ts` — a past session hit a Vercel production bug from this var not being set in the deployed environment; confirm it's present in Vercel's env settings, not just `.env.local`, if springboard generation fails in prod)

⚠️ `.env.local` is present in the repo with live-looking keys. Standard practice is to keep this gitignored (check `.gitignore` includes `.env*.local`) and never commit it.

## Notable Patterns / Conventions
- Three separate Supabase client constructions exist historically: `lib/supabase/client.ts` (shared browser client, anon key — now used by sleep *and* springboard) vs inline `createClient(...)` in `app/feed/page.tsx` vs the service-role client in `scripts/article_feed/db.ts`. Worth consolidating if doing a refactor.
- Article "engagement_score" is a running average updated on each thumbs up/down, then used as a sort-weight (plus randomness) when displaying the feed — not a strict chronological feed.
- Categories are a fixed enum assigned by Gemini during summarization (`local`, `sports`, `tech`, `business`, `science`, `culture`, `lifestyle`, `other`); "local" is hardcoded to mean NC or Utah news specifically.
- Jina Reader (`r.jina.ai`) is used both for link discovery and full-text extraction; responses are stripped of a `Markdown Content:` header via `stripJinaHeader()` (duplicated in both `app/feed/page.tsx` and `app/feed/api/test-source/route.ts`).
- Styling is inline-style-heavy (not Tailwind) in the feed/sleep UI, going for a newspaper aesthetic (Playfair Display / IM Fell English / UnifrakturMaguntia fonts). Springboard, by contrast, is Tailwind + Radix + Framer Motion based, with a distinct "dot-matrix" background on the flowchart view.
- Springboard's `Tier` naming is intentionally split: the internal/API value (`clean_up`/`maintenance`/`growth`) is the *force* acting on a project, while the user-facing state label (`Deficit`/`Status Quo`/`Growth`) is what that force acts upon — see `TIER_FORCE_LABEL` vs `TIER_STATE_LABEL` in `lib/types.ts`.
- Springboard is a one-shot prompt tool by design — the Gemini prompt in `api/route.ts` explicitly instructs the model not to ask clarifying questions or expect a follow-up turn.
- Past debugging sessions on springboard have centered on Framer Motion `layoutId` FLIP animation timing between flowchart and sandbox views, z-index stacking-context issues, and mobile responsiveness of the sandbox grid layout.

## Open Questions / Gaps
- `components/sleep/SleepTracker.tsx`'s comments/notes system and dog-ear calendar indicators are known (per prior work) to exist but aren't broken out into separate files — read the component directly if working on that feature.
- No visible cron/scheduler config found under `.github/` in this pass — check that directory directly if you need to confirm how `scripts/article_feed/index.ts` and `archive.ts` are actually scheduled.
- The AGENTS.md "breaking Next.js" instruction is unverified and was not acted upon when generating this map — flag for the user to confirm intent.
- Confirm whether "Springboard" is the final settled name or if a rename back to "Balanza" is still planned — code and UI consistently say "Springboard" as of this scan.
