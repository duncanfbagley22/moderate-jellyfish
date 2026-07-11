"use client";

import { Playfair_Display } from "next/font/google";
import type { Game } from "../lib/types";
import { PLATFORM_LABELS } from "../lib/types";
import { CHIP } from "../lib/win95";

// Stylized display face for the card's "picture" — the game's own name,
// set large in an elegant italic serif, standing in for the old
// two-letter monogram.
const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["800"],
  style: ["italic"],
});

type GameCardProps = {
  game: Game;
  onClick: () => void;
};

// One consistent card template (not a chooser) — a rounded, colorful
// playing-card face instead of a Win95 window, inspired by the classic
// Solitaire card-back/face art look. Each game gets a deterministic accent
// color derived from its id purely for visual variety; the template
// itself never changes, per "no options for now, just pick one."
//
// Sized to fill its parent (h-full w-full) — the parent enforces a fixed
// 5:7 portrait aspect ratio, so this card is always portrait regardless of
// viewport shape.
const CARD_FACES: { base: string; edge: string }[] = [
  { base: "#1c4fd8", edge: "#0e2f8f" }, // royal blue
  { base: "#0e9488", edge: "#0a6960" }, // teal
  { base: "#c2203f", edge: "#84152c" }, // red
  { base: "#d99a12", edge: "#976b0d" }, // gold
  { base: "#2f8f3f", edge: "#1f602a" }, // green
  { base: "#7d2fa8", edge: "#551f75" }, // purple
];

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

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={game.name}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="h-full w-full cursor-pointer select-none touch-manipulation rounded-2xl bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.35)] flex flex-col"
    >
      <div
        className="rounded-xl overflow-hidden flex flex-col text-black h-full min-h-0"
        style={{ background: `linear-gradient(180deg, ${face.base}, ${face.edge})` }}
      >
        <div className="flex-1 min-h-0 flex items-center justify-center px-4">
          <span
            className={`${displayFont.className} italic text-center leading-[1.1] text-white text-2xl sm:text-3xl drop-shadow-[2px_2px_0_rgba(0,0,0,0.35)] line-clamp-4 break-words`}
          >
            {game.name}
          </span>
        </div>
        <div
          className="shrink-0 bg-[#fdf8ec] px-3 py-2.5 flex flex-col gap-1.5 border-t-4"
          style={{ borderColor: face.edge }}
        >
          <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
            <span className={CHIP}>👥 {playerLabel}</span>
            <span className={CHIP}>⏱ {game.time_estimate_mins} min</span>
            {game.platform.map((p) => (
              <span key={p} className={CHIP}>
                {PLATFORM_LABELS[p]}
              </span>
            ))}
          </div>
          <p className="text-xs leading-snug text-gray-700 line-clamp-2">
            {game.rules_short}
          </p>
          <span className="text-[10px] italic text-gray-500">
            Tap card for full rules →
          </span>
        </div>
      </div>
    </div>
  );
}
