"use client";

import { Tinos } from "next/font/google";
import type { Game } from "../lib/types";
import { PLATFORM_LABELS } from "../lib/types";
import { CHIP } from "../lib/win95";

// Classic card-index serif for the game name — stands in for a rank,
// styled after the plain, traditional typography on real Windows
// Solitaire/Hearts/FreeCell card faces rather than a poster display font.
const indexFont = Tinos({
  subsets: ["latin"],
  weight: "700",
});

type GameCardProps = {
  game: Game;
  onClick: () => void;
};

// Each game gets a deterministic ink color + a suit-like glyph — the same
// trick a real deck uses to feel like one coherent set while every card
// stays distinguishable (four suits × many ranks, one visual language).
// The template itself never changes, only this pairing.
const CARD_FACES: { ink: string; glyph: string }[] = [
  { ink: "#1c4fd8", glyph: "♠" },
  { ink: "#0e9488", glyph: "♣" },
  { ink: "#c2203f", glyph: "♥" },
  { ink: "#d99a12", glyph: "★" },
  { ink: "#2f8f3f", glyph: "♦" },
  { ink: "#7d2fa8", glyph: "●" },
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Small suit-glyph mark shown top-left and, rotated 180°, bottom-right —
// the corner-index treatment real playing cards use so the card reads
// right-side up no matter which way it's held.
function CornerIndex({
  glyph,
  ink,
  flipped,
}: {
  glyph: string;
  ink: string;
  flipped?: boolean;
}) {
  return (
    <span
      className="absolute text-lg sm:text-xl leading-none select-none"
      style={{
        color: ink,
        top: flipped ? undefined : 8,
        left: flipped ? undefined : 8,
        bottom: flipped ? 8 : undefined,
        right: flipped ? 8 : undefined,
        transform: flipped ? "rotate(180deg)" : undefined,
      }}
      aria-hidden
    >
      {glyph}
    </span>
  );
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
        className="relative rounded-xl overflow-hidden flex flex-col text-black h-full min-h-0 border-2"
        style={{ background: "#fdf8ec", borderColor: face.ink }}
      >
        <CornerIndex glyph={face.glyph} ink={face.ink} />
        <CornerIndex glyph={face.glyph} ink={face.ink} flipped />

        <div className="flex-1 min-h-0 relative flex items-center justify-center px-6">
          {/* Faint oversized glyph watermark, standing in for a card's
              center pip arrangement — texture, not a focal point. */}
          <span
            className="absolute text-[10rem] sm:text-[12rem] leading-none opacity-[0.08] select-none"
            style={{ color: face.ink }}
            aria-hidden
          >
            {face.glyph}
          </span>
          <span
            className={`${indexFont.className} relative text-center leading-tight text-2xl sm:text-3xl line-clamp-4 break-words`}
            style={{ color: face.ink }}
          >
            {game.name}
          </span>
        </div>
        <div
          className="shrink-0 bg-[#fdf8ec] px-3 py-2.5 flex flex-col gap-1.5 border-t-2"
          style={{ borderColor: face.ink }}
        >
          <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
            <span className={CHIP}>{playerLabel}</span>
            <span className={CHIP}>{game.time_estimate_mins} min</span>
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
