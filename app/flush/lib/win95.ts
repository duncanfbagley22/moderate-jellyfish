import type { CSSProperties } from "react";

// Shared Windows 95–style Tailwind class fragments for the Flush mini-app.
//
// Kept intentionally simple: a single 4px (or 2px "thin") bevel border per
// element rather than the authentic double-bevel Win95 used historically —
// this reads as "retro" without adding extra DOM/animation weight.
//
// RAISED = looks poking out (panels, cards, buttons at rest)
// SUNKEN = looks pressed in (inputs, pressed buttons, inset wells)

export const RAISED =
  "border-4 border-t-white border-l-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0]";

export const SUNKEN =
  "border-4 border-t-gray-800 border-l-gray-800 border-r-white border-b-white bg-[#c0c0c0]";

export const RAISED_THIN =
  "border-2 border-t-white border-l-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0]";

export const SUNKEN_THIN =
  "border-2 border-t-gray-800 border-l-gray-800 border-r-white border-b-white bg-[#c0c0c0]";

// Small inset "chip" used for player-count / time / platform badges.
export const CHIP =
  "bg-white border-2 border-t-gray-800 border-l-gray-800 border-r-white border-b-white px-2 py-0.5";

export const TITLE_BAR =
  "bg-gradient-to-r from-[#000080] to-[#1084d0] text-white px-2 py-1 flex items-center justify-between select-none";

export const BUTTON_BASE =
  RAISED_THIN +
  " active:border-t-gray-800 active:border-l-gray-800 active:border-r-white active:border-b-white" +
  " px-3 py-1.5 text-sm font-bold text-black active:translate-y-px touch-manipulation disabled:opacity-60 disabled:pointer-events-none";

// Classic Microsoft card-game back pattern: a navy field with a woven
// diamond lattice in red/blue, built from overlapping repeating diagonal
// gradients. Pure CSS, no image asset needed — matches the reference
// Hearts screenshot.
export const CARD_BACK_BACKGROUND: CSSProperties = {
  backgroundColor: "#1a3a8f",
  backgroundImage:
    "repeating-linear-gradient(45deg, #c23b4a 0, #c23b4a 3px, transparent 3px, transparent 10px), " +
    "repeating-linear-gradient(-45deg, #c23b4a 0, #c23b4a 3px, transparent 3px, transparent 10px), " +
    "repeating-linear-gradient(45deg, #2f5fd6 0, #2f5fd6 2px, transparent 2px, transparent 10px), " +
    "repeating-linear-gradient(-45deg, #2f5fd6 0, #2f5fd6 2px, transparent 2px, transparent 10px)",
  backgroundPosition: "0 0, 5px 5px, 2px 2px, 7px 7px",
  backgroundSize: "10px 10px",
};
