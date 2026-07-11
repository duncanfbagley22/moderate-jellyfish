"use client";

import { useEffect, useState } from "react";
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
  minPlayers: 1,
  maxPlayers: 6,
  timeAvailableMins: 60,
  platform: "either",
};

export default function FlushApp() {
  const [filters, setFilters] = useState<GameFilters>(DEFAULT_FILTERS);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

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

  // Deal an initial hand on load so the deck isn't empty on first paint.
  useEffect(() => {
    runSearch(DEFAULT_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterChange(patch: Partial<GameFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  // Newly added games are dropped straight into the current deck rather
  // than re-querying — instant feedback, even if the new game doesn't
  // happen to match the currently-set filters.
  function handleGameAdded(newGame: Game) {
    setGames((prev) => [...prev, newGame]);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center gap-4 p-3 sm:p-6"
      style={{
        background: "#008080",
        fontFamily:
          'Tahoma, "MS Sans Serif", "Segoe UI", Geneva, Verdana, sans-serif',
      }}
    >
      <div className={`${RAISED} w-full max-w-sm text-black`}>
        <TitleBar icon="🎲" label="Flush — Game Picker" />
        <div className="p-3 bg-[#c0c0c0] flex items-center justify-between gap-2">
          <BackHome className={`${BUTTON_BASE} text-xs`} label="← Home" />
          <span className="text-[11px] italic text-gray-700 hidden sm:inline">
            find something to play
          </span>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className={`${BUTTON_BASE} text-xs`}
          >
            + Add Game
          </button>
        </div>
      </div>

      <div className="w-full max-w-sm">
        <FilterForm
          filters={filters}
          onChange={handleFilterChange}
          onSubmit={() => runSearch(filters)}
          isLoading={isLoading}
        />
      </div>

      {error && (
        <div className={`${RAISED} w-full max-w-sm p-3 text-black text-sm`}>
          ⚠ {error}
        </div>
      )}

      {!error && hasSearched && !isLoading && games.length === 0 && (
        <div className={`${RAISED} w-full max-w-sm text-black`}>
          <TitleBar icon="🚫" label="No Matches" />
          <div className="p-4 bg-[#c0c0c0] flex flex-col gap-3 items-center text-center">
            <p className="text-sm">
              No games fit that group size, time, and platform combo.
            </p>
            <p className="text-xs text-gray-700">
              Try widening the player range or bumping up the time available.
            </p>
          </div>
        </div>
      )}

      {!error && games.length > 0 && (
        <GameDeck games={games} onSelect={setSelectedGame} />
      )}

      <RulesModal game={selectedGame} onClose={() => setSelectedGame(null)} />
      <AddGameForm
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdded={handleGameAdded}
      />
    </div>
  );
}
