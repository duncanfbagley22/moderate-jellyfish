"use client";

import { useEffect, useRef, useState } from "react";
import BackHome from "@/components/BackHome";
import { AddGameForm } from "./components/AddGameForm";
import { FilterForm } from "./components/FilterForm";
import { GameDeck } from "./components/GameDeck";
import { RulesModal } from "./components/RulesModal";
import { TitleBar } from "./components/TitleBar";
import { fetchGames } from "./lib/db";
import type { Game, GameFilters } from "./lib/types";
import { RAISED, BUTTON_BASE } from "./lib/win95";

const DEFAULT_FILTERS: GameFilters = {
  players: 4,
  timeAvailableMins: 60,
  platform: "either",
};

// Filter changes auto-apply after this pause, rather than needing an
// explicit "Go" — keeps the whole app down to a single "new hand" trigger
// (the Shuffle button's animation), instead of two overlapping ones.
const AUTO_APPLY_DELAY_MS = 400;

export default function FlushApp() {
  const [filters, setFilters] = useState<GameFilters>(DEFAULT_FILTERS);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  const isFirstRun = useRef(true);

  // The h-dvh + overflow-hidden on the wrapper below only stops *this*
  // div from scrolling — it doesn't stop the page itself. html/body have
  // no scroll lock by default (other sub-apps in this repo need normal
  // scrolling), and on iOS Safari in particular the page can still
  // rubber-band/bounce vertically even when nothing here overflows. Lock
  // html + body for as long as this route is mounted, and restore
  // whatever was there before on unmount so navigating to another
  // sub-app doesn't inherit the lock.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehaviorY,
      bodyOverscroll: body.style.overscrollBehaviorY,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehaviorY = "none";
    body.style.overscrollBehaviorY = "none";

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehaviorY = prev.htmlOverscroll;
      body.style.overscrollBehaviorY = prev.bodyOverscroll;
    };
  }, []);

  async function runSearch(nextFilters: GameFilters) {
    setIsLoading(true);
    setError(null);
    try {
      const results = await fetchGames(nextFilters);
      setGames(results);
    } catch {
      setError("Couldn't load games. Check your connection and try again.");
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  }

  // Deal an initial hand immediately on mount; after that, debounce so
  // rapid edits (typing a player count, nudging minutes) don't fire a
  // request per keystroke.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      runSearch(filters);
      return;
    }
    const t = setTimeout(() => runSearch(filters), AUTO_APPLY_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function handleFilterChange(patch: Partial<GameFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  // Add and edit share one form (AddGameForm) and one save callback —
  // whether a row is new or existing, the parent just needs to reconcile
  // it into `games` by id.
  function handleGameSaved(saved: Game) {
    setGames((prev) =>
      prev.some((g) => g.id === saved.id)
        ? prev.map((g) => (g.id === saved.id ? saved : g))
        : [...prev, saved],
    );
  }

  // Mirrors handleGameSaved: drop the deleted game out of local state
  // rather than re-querying, and close RulesModal since the game it was
  // showing no longer exists.
  function handleGameDeleted(id: string) {
    setGames((prev) => prev.filter((g) => g.id !== id));
    setSelectedGame(null);
  }

  // Opens the edit form for the game currently shown in RulesModal, and
  // closes RulesModal itself — only one modal is ever open at a time
  // (aside from the delete-confirm stack inside RulesModal).
  function handleEditRequested(game: Game) {
    setSelectedGame(null);
    setEditingGame(game);
  }

  function handleFormClose() {
    setIsAddOpen(false);
    setEditingGame(null);
  }

  return (
    <div
      className="h-dvh w-full overflow-hidden flex flex-col items-center gap-2 p-2 sm:p-4"
      style={{
        background: "#008080",
        fontFamily:
          'Tahoma, "MS Sans Serif", "Segoe UI", Geneva, Verdana, sans-serif',
      }}
    >
      {/* Header — fixed height, never grows. */}
      <div className={`${RAISED} w-full max-w-sm text-black shrink-0`}>
        <TitleBar icon="🎲" label="Flush — Game Picker" />
        <div className="p-2 bg-[#c0c0c0] flex items-center justify-between gap-1.5">
          <BackHome className={`${BUTTON_BASE} text-xs`} label="← Home" />
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className={`${BUTTON_BASE} text-xs`}
          >
            + Add Game
          </button>
        </div>
      </div>

      {/* Filters — always visible, one compact row, auto-applies. */}
      <div className="w-full max-w-sm shrink-0">
        <FilterForm filters={filters} onChange={handleFilterChange} />
      </div>

      {/* Main area — takes exactly whatever vertical space remains, so
          the page never needs to scroll on any device. */}
      <div className="w-full max-w-sm flex-1 min-h-0 flex flex-col">
        {error && (
          <div className={`${RAISED} w-full p-3 text-black text-sm`}>
            ⚠ {error}
          </div>
        )}

        {!error && hasSearched && !isLoading && games.length === 0 && (
          <div className={`${RAISED} w-full text-black`}>
            <TitleBar icon="" label="No Matches" />
            <div className="p-4 bg-[#c0c0c0] flex flex-col gap-3 items-center text-center">
              <p className="text-sm">
                No games fit that player count, time, and platform combo.
              </p>
              <p className="text-xs text-gray-700">
                Try adjusting the filters above.
              </p>
            </div>
          </div>
        )}

        {!error && games.length > 0 && (
          <GameDeck games={games} onSelect={setSelectedGame} />
        )}
      </div>

      <RulesModal
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
        onDeleted={handleGameDeleted}
        onEdit={handleEditRequested}
      />
      <AddGameForm
        isOpen={isAddOpen || editingGame !== null}
        onClose={handleFormClose}
        onSaved={handleGameSaved}
        editingGame={editingGame}
      />
    </div>
  );
}
