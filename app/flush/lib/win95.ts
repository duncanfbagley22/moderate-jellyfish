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
