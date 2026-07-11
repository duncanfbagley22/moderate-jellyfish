"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Game } from "../lib/types";
import { GameCard } from "./GameCard";
import { BUTTON_BASE, RAISED } from "../lib/win95";
import { shuffleArray } from "../lib/shuffle";

type GameDeckProps = {
  games: Game[];
  onSelect: (game: Game) => void;
};

// Duration of the riffle animation before the newly-shuffled card is
// revealed. Kept short and tween-based (no physics) per the project's
// mobile-performance constraint.
const SHUFFLE_MS = 550;

export function GameDeck({ games, onSelect }: GameDeckProps) {
  const [order, setOrder] = useState<Game[]>(() => shuffleArray(games));
  const [activeIndex, setActiveIndex] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);

  // Re-shuffle (with the riffle animation) whenever a new filter submit
  // brings back a new result set.
  useEffect(() => {
    setIsShuffling(true);
    const t = setTimeout(() => {
      setOrder(shuffleArray(games));
      setActiveIndex(0);
      setIsShuffling(false);
    }, SHUFFLE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games]);

  if (order.length === 0) return null;

  const active = order[activeIndex];
  const peekCount = Math.min(2, order.length - 1);

  function handleShuffle() {
    if (isShuffling) return;
    setIsShuffling(true);
    setTimeout(() => {
      setOrder((prev) => shuffleArray(prev));
      setActiveIndex(0);
      setIsShuffling(false);
    }, SHUFFLE_MS);
  }

  function handleNext() {
    setActiveIndex((i) => (i + 1) % order.length);
  }

  function handlePrev() {
    setActiveIndex((i) => (i - 1 + order.length) % order.length);
  }

  return (
    <div
      className="flex flex-col items-center gap-4 w-full rounded-3xl p-4 sm:p-6"
      style={{
        background: "radial-gradient(ellipse at 50% 20%, #1c8a44, #0d5228 75%)",
      }}
    >
      <div
        className="relative w-full max-w-sm flex items-center justify-center"
        style={{ minHeight: 300 }}
      >
        {isShuffling ? (
          // Riffle: a handful of card-back rectangles jitter/rotate in
          // place for SHUFFLE_MS, then the real deck re-mounts below.
          // Framer Motion's `animate` keyframe-array syntax — a plain
          // tween, no spring physics, cheap on mobile.
          <div className="relative w-full max-w-[220px]" style={{ height: 280 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-2xl bg-white p-2 shadow-lg"
                initial={{ x: 0, rotate: 0 }}
                animate={{
                  x: [0, -22, 18, -12, 0],
                  rotate: [0, -6, 5, -3, 0],
                }}
                transition={{
                  duration: SHUFFLE_MS / 1000,
                  ease: "easeInOut",
                  delay: i * 0.03,
                }}
                style={{ zIndex: i }}
              >
                <div
                  className="w-full h-full rounded-xl"
                  style={{
                    background:
                      "repeating-linear-gradient(45deg, #1a3f8f 0 8px, #16307a 8px 16px)",
                  }}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <>
            {/* Peeking cards behind the active card give the "deck" look
                without rendering or animating the full stack. */}
            {Array.from({ length: peekCount }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                className="absolute w-full max-w-sm h-64 sm:h-72 rounded-2xl bg-white/70 shadow-md"
                style={{
                  transform: `translate(${(i + 1) * 6}px, ${(i + 1) * 6}px)`,
                  zIndex: i,
                }}
              />
            ))}
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="relative w-full"
                style={{ zIndex: peekCount + 1 }}
              >
                <GameCard game={active} onClick={() => onSelect(active)} />
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>

      <div className={`${RAISED} flex items-center gap-2 px-3 py-2`}>
        <button
          type="button"
          onClick={handlePrev}
          className={BUTTON_BASE}
          aria-label="Previous game"
          disabled={isShuffling}
        >
          ◀
        </button>
        <span className="text-xs font-bold text-black px-2 min-w-[52px] text-center">
          {isShuffling ? "···" : `${activeIndex + 1} / ${order.length}`}
        </span>
        <button
          type="button"
          onClick={handleNext}
          className={BUTTON_BASE}
          aria-label="Next game"
          disabled={isShuffling}
        >
          ▶
        </button>
        <button
          type="button"
          onClick={handleShuffle}
          className={BUTTON_BASE}
          disabled={isShuffling}
        >
          {isShuffling ? "Shuffling…" : "🔀 Shuffle"}
        </button>
      </div>
    </div>
  );
}
