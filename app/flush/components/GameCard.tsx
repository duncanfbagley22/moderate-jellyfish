"use client";

import type { Game } from "../lib/types";
import { PLATFORM_LABELS } from "../lib/types";
import { CHIP } from "../lib/win95";

type GameCardProps = {
  game: Game;
  onClick: () => void;
};

// One consistent card template (not a chooser) — a rounded, colorful
// playing-card face instead of a Win95 window, inspired by the classic
// Solitaire card-back/face art look. Each game gets a deterministic accent
// color + icon derived from its id purely for visual variety; the template
// itself never changes, per "no options for now, just pick one."
const CARD_FACES: { base: string; edge: string }[] = [
  { base: "#1c4fd8", edge: "#0e2f8f" }, // royal blue
  { base: "#0e9488", edge: "#0a6960" }, // teal
  { base: "#c2203f", edge: "#84152c" }, // red
  { base: "#d99a12", edge: "#976b0d" }, // gold
  { base: "#2f8f3f", edge: "#1f602a" }, // green
  { base: "#7d2fa8", edge: "#551f75" }, // purple
];

const CARD_ICONS = ["🎯", "🕹️", "🎭", "🧩", "🔮", "🏆", "🗺️", "🎨", "⚔️", "🔍"];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function GameCard({ game, onClick }: GameCardProps) {
  const playerLabel =
    game.min_players === game.max_players
      ? `${game.min_players}`
      : `${game.min_players}-${game.max_players}`;

  const face = CARD_FACES[hashString(game.id) % CARD_FACES.length];
  const icon = CARD_ICONS[hashString(`${game.id}:icon`) % CARD_ICONS.length];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="w-full max-w-sm cursor-pointer select-none touch-manipulation rounded-2xl bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
    >
      <div
        className="rounded-xl overflow-hidden flex flex-col text-black"
        style={{ background: `linear-gradient(180deg, ${face.base}, ${face.edge})` }}
      >
        <div className="flex-1 flex items-center justify-center py-8 text-6xl">
          <span aria-hidden>{icon}</span>
        </div>
        <div
          className="bg-[#fdf8ec] px-3 py-3 flex flex-col gap-2 border-t-4"
          style={{ borderColor: face.edge }}
        >
          <h3 className="text-sm font-bold leading-tight">{game.name}</h3>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
            <span className={CHIP}>👥 {playerLabel}</span>
            <span className={CHIP}>⏱ {game.time_estimate_mins} min</span>
            {game.platform.map((p) => (
              <span key={p} className={CHIP}>
                {PLATFORM_LABELS[p]}
              </span>
            ))}
          </div>
          <p className="text-xs leading-snug text-gray-700">{game.rules_short}</p>
          <span className="text-[10px] italic text-gray-500">
            Tap card for full rules →
          </span>
        </div>
      </div>
    </div>
  );
}
