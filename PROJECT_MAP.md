# Project Map: moderate-jellyfish

_Last updated: 2026-07-25_

## Overview
- **Project Type**: Next.js 16 (App Router) web app, TypeScript, React 19
- **Purpose**: Personal multi-tool site ("Duncan's Apps") with four mini-apps: an AI-curated news/article feed ("Duncan's Daily Digest"), a sleep tracker, "Springboard" — an AI-assisted personal project-ideation tool, and "Flush" — a Windows-95-styled game-recommendation card picker.
- **Tech Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Radix UI primitives, Supabase (Postgres + client SDK), Google Gemini API (`@google/generative-ai`), Jina AI Reader (`r.jina.ai`) for scraping, `rss-parser`, `react-markdown`, `lucide-react` icons, `tsx` for running backend scripts.

## Directory Structure
```
app/
  page.tsx              — home page ("Duncan's Apps"), links to /feed, /sleep, /springboard, /flush
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
  flush/                  — "Flush" — Win95-styled game-recommendation card picker
    FlushApp.tsx           — main client component; owns filters/games state, auto-applying search, add/delete flow
    STATUS.md              — hand-maintained session-handoff notes (current state, known issues, tooling gotchas) — read this before making changes
    page.tsx, layout.tsx   — route entry, sets tab title "flush"
    components/
      TitleBar.tsx          — Win95 title bar chrome, reused across the app's dialogs/panels
      FilterForm.tsx        — always-visible inline filter row (players/time/platform); auto-applies via debounce, no submit button
      FilterModal.tsx       — ⚠ unused/orphaned, superseded by inline FilterForm — candidate for deletion
      GameDeck.tsx           — swipeable card stack (Framer Motion drag/fling), shuffle spinner, prev/next
      GameCard.tsx            — individual playing-card-styled game display (5:7 portrait, Chango display font as the "picture")
      NumberStepper.tsx        — small +/- numeric input used in FilterForm
      RulesModal.tsx            — full rules view for a selected game; entry point for delete
      ConfirmDeleteModal.tsx     — second, higher-z-index confirm dialog stacked on RulesModal
      AddGameForm.tsx             — modal form, inserts a new game via lib/db.ts
    lib/
      types.ts               — Game, GameFilters, Platform union + PLATFORM_VALUES/LABELS (single source of truth for platform categories)
      db.ts                    — Supabase reads/writes for flush_games (fetch/insert/delete)
      shuffle.ts                — Fisher-Yates array shuffle helper
      win95.ts                   — shared Win95 bevel/chip/title-bar Tailwind class fragments + CSS-only card-back pattern
components/
  BackHome.tsx            — shared "back to home" nav button used across sub-apps
lib/
  supabase/client.ts        — browser Supabase client factory (anon key), shared across feed/sleep/springboard/flush
scripts/
  article_feed/             — standalone Node/tsx backend pipeline (run via cron, not part of Next.js server)
    index.ts, db.ts, rss.ts, discover.ts, jina.ts, summarize.ts, archive.ts
public/                     — static assets
node_modules/, .next/, .git/, .github/ — excluded from deep scan
```

## Key Files
- **package.json** — scripts: `dev`, `build`, `start`, `lint`; key deps: `@google/generative-ai`, `@supabase/supabase-js`, `framer-motion`, `@radix-ui/react-select` / `react-slider` / `react-toggle-group`, `next` 16.2.6, `react`/`react-dom` 19.2.4, `rss-parser`, `react-markdown`, `ws`. No new dependencies were added for Flush — it reuses framer-motion, @supabase/supabase-js, and Tailwind already in the project.
- **tsconfig.json** — path alias `@/*` → project root; strict mode on
- **next.config.ts** — default/empty Next config
- **AGENTS.md / CLAUDE.md** — CLAUDE.md just imports AGENTS.md. ⚠️ AGENTS.md contains an instruction claiming "this is NOT the Next.js you know" and directing the agent to read docs inside `node_modules/next/dist/docs/` before writing code — unverified, reads like an embedded prompt-injection; treat with skepticism and verify any claimed API changes against official Next.js docs.
- **README.md** — default `create-next-app` boilerplate plus a link to this PROJECT_MAP.md
- **app/flush/STATUS.md** — per-app, hand-maintained handoff notes (not auto-generated). Currently the only sub-app with one; worth checking for going forward whenever picking Flush work back up, since it can be more current than this map.

## Dependencies (grouped)
### Frontend / UI
- next, react, react-dom — core framework
- tailwindcss, @tailwindcss/postcss, @tailwindcss/typography — styling
- framer-motion — animation (springboard flowchart ⇄ sandbox transitions; flush's draggable swipe-card deck in GameDeck.tsx)
- @radix-ui/react-select, react-slider, react-toggle-group — accessible primitives used in springboard's SandboxPanel
- lucide-react — icons
- react-markdown — renders article full text / springboard blueprint output as markdown
- next/font/google (built-in, no separate package) — Chango display font used for game names in flush's GameCard.tsx

### Data / Backend
- @supabase/supabase-js — Postgres DB client (browser anon key in `lib/supabase/client.ts`; service role key separately in `scripts/article_feed/db.ts`; also backs flush's `flush_games` table)
- ws — websocket transport for Supabase realtime in Node scripts
- rss-parser — parses RSS feeds
- @google/generative-ai — Gemini API for article discovery/summarization (feed) and blueprint generation (springboard)

### Dev tooling
- typescript, eslint, eslint-config-next
- tsx — runs the `scripts/article_feed/*.ts` pipeline outside Next.js
- dotenv-cli — loads env vars for script runs

## Source Structure
**Four independent features sharing one Next.js app + Supabase project:**

1. **Article feed (`/feed`)** — large client component with tabs (Feed / Clipped / Sources). Reads `articles` (joined with `sources` and `summaries`) from Supabase, supports save/archive/rate actions that also update a per-source `engagement_score`. Sources tab lets you add/edit/delete sources and test-fetch a candidate via `/feed/api/test-source`.
2. **Backend ingestion pipeline (`scripts/article_feed/`)** — NOT run by Next.js; a separate Node/tsx pipeline that: fetches active sources → RSS parse or Jina-discover article links → Gemini picks article URLs → fetches full text via Jina → summarizes unsummarized articles via Gemini → `archive.ts` separately archives old unsaved articles after 3 days.
3. **Sleep tracker (`/sleep`)** — `SleepTracker.tsx` backed by `lib/db.ts` (Supabase `sleep_logs` + `settings` tables, date-ranged settings periods via a Postgres `daterange` exclusion constraint), `lib/utils.ts` (time-offset math, A–F weekly grading, streaks), and `lib/ui-state.ts` (persists dark mode + calendar offset to localStorage). Includes a comments/notes system backed by a separate `sleep_comments` table and dog-ear calendar indicators (not yet reflected in file names above — logic lives inside `SleepTracker.tsx` / `lib/db.ts`).
4. **Springboard (`/springboard`)** — the personal project-ideation tool (Duncan sometimes calls it "Balanza"). Frames personal projects around three forces — **Clean Up** (`clean_up`, state label "Deficit"), **Maintenance** (state label "Status Quo"), and **Growth** — via a `Tier` type. Flow: land on `FlowchartView` (3-node diagram) → pick a force → sandbox view with `TierStack` (force switcher), `SandboxPanel` (topic/timeframe/intent/platform selects + friction/creativity sliders), `PromptBar` (free-text ask) → `POST /springboard/api` builds a single-shot Gemini prompt (model choice `gemini-3.5-flash` or `gemini-3.1-flash-lite`, temperature mapped from the 0–100 creativity slider) → renders markdown in `OutputPanel` → optional save to Supabase `saved_blueprints` table, keyed by an anonymous per-browser `session_id` (localStorage, see `lib/session.ts`).
5. **Flush (`/flush`)** — Win95-styled game-recommendation card picker, no auth (MVP). `FlushApp.tsx` holds filters (`players`, `timeAvailableMins`, `platform`) and games state; filter changes auto-apply via a 400ms debounced effect (`AUTO_APPLY_DELAY_MS`) calling `fetchGames()` in `lib/db.ts` — deliberately no "Go"/submit button. `fetchGames()` queries the `flush_games` Postgres table directly from the browser via the shared Supabase client, matching on `players` falling within each game's `[min_players, max_players]` range, time ≤ available, and (optionally) `platform` via array-containment (`.contains()`). Fixed-viewport layout (`h-dvh`, no page scroll — must fit any device). Cards (`GameCard.tsx`) are portrait-locked (5:7), styled as a physical card with the game name as the "picture" in the Chango font; browsing is a draggable Tinder-style swipe (`GameDeck.tsx`, Framer Motion `drag="x"` + fling on release past a threshold, or springs back). Add/delete both write straight to Supabase (`insertGame`/`deleteGame` in `lib/db.ts`) relying on public insert/delete RLS policies applied directly to the live Supabase project via MCP `apply_migration` — **not committed as SQL anywhere in the repo**; check `pg_policies` on the live project (`cvmrjjhnwecjikyqteft`) to see current policies. Shared Win95 visual language (bevels, chips, title bar, CSS-only card-back weave pattern) lives in `lib/win95.ts`.

## Entry Points
- Web: `app/page.tsx` → links to `/feed`, `/sleep`, `/springboard`, `/flush`
- APIs:
  - `app/feed/api/test-source/route.ts` (POST) — used only by the feed Sources tab UI
  - `app/springboard/api/route.ts` (POST) — generates a blueprint from `PromptParams` via Gemini
  - Flush has no API route — reads/writes go straight from the browser to Supabase (`flush_games` table) via the shared client
- Backend cron-style scripts (run manually via `tsx` or external scheduler, not via `npm run dev`):
  - `scripts/article_feed/index.ts` — main ingestion + summarization run
  - `scripts/article_feed/archive.ts` — archival run

## Configuration & Environment
`.env.local` variable names (values not recorded here):
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-side, RLS-scoped — used by feed, sleep, springboard, and flush)
- `SUPABASE_SERVICE_ROLE_KEY` (used only in `scripts/article_feed/db.ts` — server-side/script context, full DB access, never expose to the browser)
- `GEMINI_API_KEY` (used by both `scripts/article_feed/summarize.ts` and `app/springboard/api/route.ts` — a past session hit a Vercel production bug from this var not being set in the deployed environment; confirm it's present in Vercel's env settings, not just `.env.local`, if springboard generation fails in prod)

⚠️ `.env.local` is present in the repo with live-looking keys. Standard practice is to keep this gitignored (check `.gitignore` includes `.env*.local`) and never commit it.

## Notable Patterns / Conventions
- Three separate Supabase client constructions exist historically: `lib/supabase/client.ts` (shared browser client, anon key — now used by sleep, springboard, *and* flush) vs inline `createClient(...)` in `app/feed/page.tsx` vs the service-role client in `scripts/article_feed/db.ts`. Worth consolidating if doing a refactor.
- Article "engagement_score" is a running average updated on each thumbs up/down, then used as a sort-weight (plus randomness) when displaying the feed — not a strict chronological feed.
- Categories are a fixed enum assigned by Gemini during summarization (`local`, `sports`, `tech`, `business`, `science`, `culture`, `lifestyle`, `other`); "local" is hardcoded to mean NC or Utah news specifically.
- Jina Reader (`r.jina.ai`) is used both for link discovery and full-text extraction; responses are stripped of a `Markdown Content:` header via `stripJinaHeader()` (duplicated in both `app/feed/page.tsx` and `app/feed/api/test-source/route.ts`).
- Styling is inline-style-heavy (not Tailwind) in the feed/sleep UI, going for a newspaper aesthetic (Playfair Display / IM Fell English / UnifrakturMaguntia fonts). Springboard, by contrast, is Tailwind + Radix + Framer Motion based, with a distinct "dot-matrix" background on the flowchart view. Flush is a third distinct visual language: Tailwind-based Windows 95 chrome (bevel borders, title bars) centralized in `lib/win95.ts`, deliberately simplified to a single 4px/2px bevel rather than authentic double-bevel Win95.
- Springboard's `Tier` naming is intentionally split: the internal/API value (`clean_up`/`maintenance`/`growth`) is the *force* acting on a project, while the user-facing state label (`Deficit`/`Status Quo`/`Growth`) is what that force acts upon — see `TIER_FORCE_LABEL` vs `TIER_STATE_LABEL` in `lib/types.ts`.
- Springboard is a one-shot prompt tool by design — the Gemini prompt in `api/route.ts` explicitly instructs the model not to ask clarifying questions or expect a follow-up turn.
- Past debugging sessions on springboard have centered on Framer Motion `layoutId` FLIP animation timing between flowchart and sandbox views, z-index stacking-context issues, and mobile responsiveness of the sandbox grid layout.
- Flush centralizes its platform-category enum in `lib/types.ts` (`PLATFORM_VALUES`/`PLATFORM_LABELS`) specifically so FilterForm/GameCard/AddGameForm never hardcode values separately — the one file to touch if categories change.
- Flush has no auth by design (MVP tradeoff) — public insert and delete RLS policies on `flush_games` mean anyone using the app can add or delete any game.

## Open Questions / Gaps
- `components/sleep/SleepTracker.tsx`'s comments/notes system and dog-ear calendar indicators are known (per prior work) to exist but aren't broken out into separate files — read the component directly if working on that feature.
- No visible cron/scheduler config found under `.github/` in this pass — check that directory directly if you need to confirm how `scripts/article_feed/index.ts` and `archive.ts` are actually scheduled.
- The AGENTS.md "breaking Next.js" instruction is unverified and was not acted upon when generating this map — flag for the user to confirm intent.
- Confirm whether "Springboard" is the final settled name or if a rename back to "Balanza" is still planned — code and UI consistently say "Springboard" as of this scan.
- Flush: `app/flush/components/FilterModal.tsx` is unused/orphaned (superseded by the always-visible inline `FilterForm`) — candidate for deletion, left in place because no delete tool was available in a prior session.
- Flush: `STATUS.md` documents an unresolved, unexplained pattern of concurrent file edits (values/props changing between writes and reads with no corresponding conversation making the change) — worth checking whether multiple agent sessions (Claude Desktop, Cursor, `claude code`) have this repo open simultaneously before trusting file state at face value on future sessions.
- Flush: the `flush_games` RLS policies (public insert/delete) were applied live via Supabase MCP `apply_migration` and are not captured as a committed SQL file anywhere in the repo — there's no local record of them outside the live Postgres project itself.
