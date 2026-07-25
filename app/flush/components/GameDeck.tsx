"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import type { Game } from "../lib/types";
import { GameCard } from "./GameCard";
import { BUTTON_BASE, RAISED, CARD_BACK_BACKGROUND } from "../lib/win95";
import { shuffleArray } from "../lib/shuffle";

type GameDeckProps = {
  games: Game[];
  onSelect: (game: Game) => void;
};

// Duration the shuffling spinner is shown for (new filter results / Shuffle
// button) before the newly-shuffled card is revealed.
const SHUFFLE_MS = 550;
// Drag distance (px) or flick velocity (px/s) past which a release counts
// as a swipe rather than snapping back to center.
const SWIPE_DISTANCE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;
// How long the released card takes to leave the screen once a swipe (or
// the Prev/Next button, which triggers the same motion) commits to it.
const FLY_OUT_MS = 250;

export function GameDeck({ games, onSelect }: GameDeckProps) {
  const [order, setOrder] = useState<Game[]>(() => shuffleArray(games));
  const [activeIndex, setActiveIndex] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isFlinging, setIsFlinging] = useState(false);
  const wasDragged = useRef(false);

  // Drives the top card's horizontal position while dragging and during
  // the programmatic fly-out; rotate is derived from it so the card tilts
  // like a flicked photo instead of translating in a straight line.
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-12, 0, 12]);

  const isBusy = isShuffling || isFlinging;

  // Re-shuffle (showing the spinner) whenever a new filter submit brings
  // back a new result set.
  useEffect(() => {
    setIsFlinging(false);
    x.set(0);
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
    x.set(0);
    setIsShuffling(true);
    setTimeout(() => {
      setOrder((prev) => shuffleArray(prev));
      setActiveIndex(0);
      setIsShuffling(false);
    }, SHUFFLE_MS);
  }

  // Sends the active card flying off in `direction` (-1 = off to the
  // left / advance to next, 1 = off to the right / back to previous),
  // then swaps in the new active card once it's off-screen. Used by both
  // the drag-release swipe and the Prev/Next buttons, so the motion is
  // identical either way.
  function flingOut(direction: 1 | -1) {
    if (isBusy || order.length < 2) return;
    setIsFlinging(true);
    animate(x, direction * 500, {
      duration: FLY_OUT_MS / 1000,
      ease: "easeIn",
      onComplete: () => {
        setActiveIndex((i) =>
          direction === -1 ? (i + 1) % order.length : (i - 1 + order.length) % order.length,
        );
        x.set(0);
        setIsFlinging(false);
      },
    });
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (isBusy) return;
    if (info.offset.x < -SWIPE_DISTANCE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY_THRESHOLD) {
      flingOut(-1);
    } else if (info.offset.x > SWIPE_DISTANCE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY_THRESHOLD) {
      flingOut(1);
    }
    // Otherwise: released within the swipe threshold. dragConstraints is
    // pinned to {left:0, right:0}, so Motion's own elastic spring snaps
    // the card back to center — no extra code needed.
  }

  function handleNext() {
    flingOut(-1);
  }

  function handlePrev() {
    flingOut(1);
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
            // Spinner placeholder shown for SHUFFLE_MS while a new shuffle
            // order is computed, then the real deck re-mounts.
            <div
              className="absolute inset-0 rounded-2xl border-4 border-white shadow-lg flex flex-col items-center justify-center gap-3"
              style={CARD_BACK_BACKGROUND}
            >
              <div className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
              <span className="text-white font-bold text-sm tracking-wide drop-shadow-[1px_1px_0_rgba(0,0,0,0.4)]">
                Shuffling…
              </span>
            </div>
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

              {/* Draggable top card — swipe left/right past the threshold
                  (or flick fast enough) to send it flying off and reveal
                  the next one. Keyed by game id so each new active card
                  is a fresh mount: it gets its own entrance tween (settling
                  in from the stack) instead of inheriting the outgoing
                  card's mid-animation transform. */}
              <motion.div
                key={active.id}
                className="absolute inset-0 touch-none"
                style={{ x, rotate, zIndex: peekCount + 1 }}
                drag={order.length > 1 && !isBusy ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragStart={() => {
                  wasDragged.current = false;
                }}
                onDrag={(_, info) => {
                  if (Math.abs(info.offset.x) > 5) wasDragged.current = true;
                }}
                onDragEnd={handleDragEnd}
                // Primary tap-to-open trigger — but Motion's `onTap`
                // does NOT automatically ignore a drag on the same
                // element once `drag="x"` is enabled: a pointerup at the
                // end of a small drag (that snaps back) or even a full
                // swipe still fires onTap. Gate it on the same
                // `wasDragged` flag the onClick fallback below uses, and
                // reset it once consumed here so a later plain tap (one
                // with no onDragStart at all) isn't blocked by a stale
                // flag left over from a previous swipe.
                onTap={() => {
                  if (wasDragged.current) {
                    wasDragged.current = false;
                    return;
                  }
                  if (!isBusy) onSelect(active);
                }}
                whileTap={{ scale: 0.98 }}
                initial={{ scale: 0.95, opacity: 0.85 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <GameCard
                  game={active}
                  // Kept as a keyboard-accessible fallback (Enter/Space in
                  // GameCard's onKeyDown) — the onTap above is what makes
                  // pointer/touch selection actually work.
                  onClick={() => {
                    if (wasDragged.current) return;
                    onSelect(active);
                  }}
                />
              </motion.div>
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
          {isShuffling ? "Shuffling…" : "Shuffle"}
        </button>
      </div>
    </div>
  );
}
