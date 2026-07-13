"use client";

import { SUNKEN_THIN, STEPPER_BUTTON } from "../lib/win95";

type NumberStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  inputWidthClassName?: string;
};

// Always-visible +/- buttons alongside the number input. Native number
// input spin arrows don't render on mobile (iOS/Android just show the
// on-screen keyboard, no steppers), so this is what makes these fields
// usable with a tap on a phone. The input itself is still directly
// editable for anyone who'd rather type — clamped the same either way.
export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  inputWidthClassName = "w-12",
}: NumberStepperProps) {
  function clamp(n: number) {
    return Math.min(max, Math.max(min, n));
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label="Decrease"
        className={STEPPER_BUTTON}
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        className={`${SUNKEN_THIN} px-1 py-1 text-sm text-center touch-manipulation ${inputWidthClassName}`}
      />
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
