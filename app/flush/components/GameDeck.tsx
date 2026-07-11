"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Game } from "../lib/types";
import { GameCard } from "./GameCard";
import { BUTTON_BASE, RAISED, CARD_BACK_BACKGROUND } from "../lib/win95";
import { shuffleArray } from "../lib/shuffle";

type GameDeckProps = {
  games: Game[];
  onSelect: (game: Game) => void;
};

// Duration of the riffle-shuffle animation (new filter results / Shuffle
// button) before the newly-shuffled card is revealed.
const SHUFFLE_MS = 550;
// Duration of the next/prev flip transition.
const FLIP_MS = 380;

export function GameDeck({ games, onSelect }: GameDeckProps) {
  const [order, setOrder] = useState<Game[]>(() => shuffleArray(games));
  const [activeIndex, setActiveIndex] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const [flipTarget, setFlipTarget] = useState<{ game: Game; index: number } | null>(null);

  const isBusy = isShuffling || flipTarget !== null;

  // Re-shuffle (with the riffle animation) whenever a new filter submit
  // brings back a new result set.
  useEffect(() => {
    setFlipTarget(null);
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
    if (isBusy) return;
    setIsShuffling(true);
    setTimeout(() => {
      setOrder((prev) => shuffleArray(prev));
      setActiveIndex(0);
      setIsShuffling(false);
    }, SHUFFLE_MS);
  }

  // The current front card slides back into the stack while the next card
  // in line flips face-up to take its place.
  function goTo(nextIndex: number) {
    if (isBusy || order.length < 2) return;
    setFlipTarget({ game: order[nextIndex], index: nextIndex });
    setTimeout(() => {
      setActiveIndex(nextIndex);
      setFlipTarget(null);
    }, FLIP_MS);
  }

  function handleNext() {
    goTo((activeIndex + 1) % order.length);
  }

  function handlePrev() {
    goTo((activeIndex - 1 + order.length) % order.length);
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 w-full h-full min-h-0 rounded-3xl p-3 sm:p-4"
      style={{
        background: "radial-gradient(ellipse at 50% 20%, #1c8a44, #0d5228 75%)",
      }}
    >
      {/* Fixed 5:7 portrait box — height comes from the flex-allocated
          space above, width is derived from the aspect ratio and capped
          at 100%, so the card is always portrait no matter the viewport
          shape (phone, iPad, wide desktop). */}
      <div
        className="relative w-full flex-1 min-h-0 flex items-center justify-center"
        style={{ perspective: 1200 }}
      >
        <div
          className="relative"
          style={{ height: "100%", maxWidth: "100%", aspectRatio: "5 / 7" }}
        >
          {isShuffling ? (
            // Riffle: a handful of card-backs jitter/rotate in place for
            // SHUFFLE_MS, then the real deck re-mounts. A plain tween via
            // Framer Motion's keyframe-array syntax — no spring physics,
            // cheap on mobile.
            Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-2xl border-4 border-white shadow-lg"
                style={{ ...CARD_BACK_BACKGROUND, zIndex: i }}
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
              />
            ))
          ) : flipTarget ? (
            <>
              {/* Outgoing card slides back into the stack. */}
              <motion.div
                key={`out-${active.id}`}
                className="absolute inset-0"
                style={{ zIndex: 1 }}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{ x: 10, y: 14, scale: 0.92, opacity: 0 }}
                transition={{ duration: FLIP_MS / 1000, ease: "easeInOut" }}
              >
                <GameCard game={active} onClick={() => {}} />
              </motion.div>

              {/* Incoming card flips face-up: a standard two-sided flip —
                  card-back and card-face are separate absolutely
                  positioned layers with backfaceVisibility hidden, and the
                  shared parent rotates from 180deg (showing the back) to
                  0deg (showing the face). Still just a rotateY tween. */}
              <motion.div
                key={`in-${flipTarget.game.id}`}
                className="absolute inset-0"
                style={{ zIndex: 2, transformStyle: "preserve-3d" }}
                initial={{ rotateY: 180 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: FLIP_MS / 1000, ease: "easeInOut", delay: 0.05 }}
              >
                <div
                  className="absolute inset-0 rounded-2xl border-4 border-white shadow-lg"
                  style={{
                    ...CARD_BACK_BACKGROUND,
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                />
                <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                  <GameCard game={flipTarget.game} onClick={() => {}} />
                </div>
              </motion.div>
            </>
          ) : (
            <>
              {/* Peeking card-backs behind the active card give the "deck"
                  look without rendering or animating the full stack. */}
              {Array.from({ length: peekCount }).map((_, i) => (
                <div
                  key={i}
                  aria-hidden
                  className="absolute inset-0 rounded-2xl border-4 border-white shadow-md"
                  style={{
                    ...CARD_BACK_BACKGROUND,
                    transform: `translate(${(i + 1) * 6}px, ${(i + 1) * 6}px)`,
                    zIndex: i,
                  }}
                />
              ))}
              <div className="absolute inset-0" style={{ zIndex: peekCount + 1 }}>
                <GameCard game={active} onClick={() => onSelect(active)} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className={`${RAISED} shrink-0 flex items-center gap-2 px-3 py-2`}>
        <button
          type="button"
          onClick={handlePrev}
          className={BUTTON_BASE}
          aria-label="Previous game"
          disabled={isBusy}
        >
          ◀
        </button>
        <span className="text-xs font-bold text-black px-2 min-w-[52px] text-center">
          {isBusy ? "···" : `${activeIndex + 1} / ${order.length}`}
        </span>
        <button
          type="button"
          onClick={handleNext}
          className={BUTTON_BASE}
          aria-label="Next game"
          disabled={isBusy}
        >
          ▶
        </button>
        <button
          type="button"
          onClick={handleShuffle}
          className={BUTTON_BASE}
          disabled={isBusy}
        >
          {isShuffling ? "Shuffling…" : "🔀 Shuffle"}
        </button>
      </div>
    </div>
  );
}
