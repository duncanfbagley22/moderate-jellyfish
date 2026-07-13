# Flush — Status Notes

Quick-start for picking this up in a new chat session. Point Claude at this
file plus the actual current contents of `app/flush/` — don't rely on a
prior conversation's memory of what these files contain; re-read them
fresh every time (see "Known issue" below for why).

## What it is
A Windows-95-styled game-recommendation mini-app inside `moderate-jellyfish`.
Route: `app/flush/`. Supabase table: `flush_games`, project "Moderate
Jellyfish" (`cvmrjjhnwecjikyqteft`). There is no `scripts/sql/flush_games.sql`
or any other SQL file in the repo despite earlier notes claiming one —
RLS policies were applied straight to the live project via the Supabase
MCP tools (`apply_migration`), not committed anywhere. To see the current
policies, query `pg_policies` for `tablename = 'flush_games'` against that
project rather than looking for a file.

## Current state
- Full app built and working: `FlushApp.tsx` +
  `components/{FilterForm,GameCard,GameDeck,TitleBar,RulesModal,AddGameForm,ConfirmDeleteModal}.tsx`
  + `lib/{types,db,shuffle,win95}.ts`.
- Layout: fixed-viewport (`h-dvh`, no page scroll — must fit phone/iPad/desktop
  with nothing cut off). Filters are always visible in one compact row
  (single "Players" number, not a min/max range). Filter changes auto-apply
  via a debounced effect in `FlushApp.tsx` — there is intentionally no
  separate "Go"/submit button anywhere. The only "new hand" trigger is the
  Shuffle button in `GameDeck`, which now shows a plain spinner + "Shuffling…"
  text (the old riffling-card-backs animation was removed) — auto-applied
  filter changes reuse that same spinner.
- Cards: portrait-locked (5:7 aspect ratio via a fixed-aspect box, not
  Tailwind's `aspect-*` + `max-h` combo — see comments in `GameDeck.tsx` for
  why). Styled like a physical playing card, not a Win95 window: colored
  gradient face with the game's full name set large in the Chango display
  font (`next/font/google`, in `GameCard.tsx`) as the "picture" — replaced
  the earlier two-letter monogram. Cream footer has stats only (player
  count / time / platform chips, short rules, "tap for full rules") — the
  name was removed from the footer since it's now the picture itself, so
  it isn't shown twice.
- Card backs: `CARD_BACK_BACKGROUND` in `lib/win95.ts` — a CSS-only pattern
  mimicking the classic MS Solitaire/Hearts red-and-blue diamond weave.
- Next/prev is now a draggable Tinder-style swipe (`GameDeck.tsx`): the top
  card uses Framer Motion's `drag="x"` with rotation tied to drag distance;
  releasing past a distance/velocity threshold flings it off-screen via
  `animate()` and swaps in the next card, otherwise Motion's own elastic
  drag constraints spring it back to center. The Prev/Next buttons trigger
  the identical fling programmatically. Replaced the earlier `rotateY` flip
  transition entirely.
- Add Game: modal form (`AddGameForm.tsx`) inserts into Supabase via
  `insertGame()` in `lib/db.ts`. Requires the "Public insert access to
  flush_games" RLS policy (no auth for MVP, by design).
- Delete Game: `RulesModal.tsx` has a "🗑 Delete Game" button that opens
  `ConfirmDeleteModal.tsx` (a second, higher-z-index Win95 dialog stacked on
  top); confirming calls `deleteGame()` in `lib/db.ts` and removes the game
  from local state. Requires the "Public delete access to flush_games" RLS
  policy (added via `apply_migration`, same no-auth-for-MVP tradeoff as
  insert — anyone using the app can delete any game).
- Platform categories: `Platform` type is `"face cards" | "pen & paper"` in
  `lib/types.ts` (`PLATFORM_VALUES` / `PLATFORM_LABELS` — the one place to
  edit if these change again). Duncan updated the Supabase seed data
  directly to match.

## ⚠️ Known issue: unexplained concurrent file edits
Twice in the prior session, files in `app/flush/` were found to differ from
what Claude had just written moments earlier — once the platform category
values changed underneath it, once `FilterForm.tsx` grew back a "Deal"
button and `onSubmit` prop that had just been removed. Neither change came
from that conversation. Before trusting the current file state or making
further edits: check whether another Claude Desktop window, Cursor session,
or `claude code` process has this repo open and could be writing to it
concurrently. If several agents are editing the same files without knowing
about each other, this kind of silent regression will keep happening.

## Tooling notes (for whichever Claude picks this up)
- Use the `filesystem:*` MCP tools — **not** the sandboxed `str_replace` /
  `create_file` tools, which write to Claude's own container filesystem, not
  this Mac. Mixing them up produces "File not found" errors that look like a
  missing file but aren't.
- `filesystem:move_file` has been unreliable (hangs / times out) — prefer
  `write_file` to the new path over `move_file` for renames.
- Writes sometimes report a client-side timeout ("No result received...")
  even though the write succeeded server-side. Verify with a read before
  assuming a write failed or retrying.

## Open items
- Track down and stop whatever is concurrently editing these files.
- Optional cleanup: `app/flush/components/FilterModal.tsx` is unused
  (superseded by the always-visible inline `FilterForm`) — no delete tool
  was available in-session, so it's still sitting there.
