"use client";

import { SUNKEN_THIN, STEPPER_BUTTON } from "../lib/win95";

type NumberStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  displayWidthClassName?: string;
  ariaLabel?: string;
};

// Tap-only stepper — the value is a plain, non-interactive display
// between two +/- buttons, not an editable input. Nothing here can
// summon the mobile on-screen keyboard, by design (native number-input
// spin arrows don't render on mobile anyway, so this replaces the old
// approach of an editable input plus buttons).
export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  displayWidthClassName = "w-10",
  ariaLabel,
}: NumberStepperProps) {
  function clamp(n: number) {
    return Math.min(max, Math.max(min, n));
  }

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label="Decrease"
        className={STEPPER_BUTTON}
      >
        −
      </button>
      <span
        className={`${SUNKEN_THIN} px-1 py-1 text-sm text-center font-bold select-none touch-manipulation ${displayWidthClassName}`}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label="Increase"
        className={STEPPER_BUTTON}
      >
        +
      </button>
    </div>
  );
}
