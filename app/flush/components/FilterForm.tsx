"use client";

import type { GameFilters, PlatformFilter } from "../lib/types";
import { PLATFORM_VALUES, PLATFORM_LABELS } from "../lib/types";
import { RAISED, SUNKEN_THIN } from "../lib/win95";

type FilterFormProps = {
  filters: GameFilters;
  onChange: (patch: Partial<GameFilters>) => void;
};

const PLATFORM_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: "either", label: "Either" },
  ...PLATFORM_VALUES.map((p) => ({ value: p as PlatformFilter, label: PLATFORM_LABELS[p] })),
];

const MINUTES_STEP = 5;

// A single compact row (wraps on narrow screens). No submit button — every
// change here auto-applies (debounced) from the parent, so there's just
// one "new hand" trigger in the whole app: the Shuffle button.
export function FilterForm({ filters, onChange }: FilterFormProps) {
  return (
    <div className={`${RAISED} p-2 flex flex-wrap items-end gap-2 text-black`}>
      <label className="flex flex-col gap-0.5 text-[10px] font-bold">
        Players
        <input
          type="number"
          min={1}
          max={99}
          inputMode="numeric"
          value={filters.players}
          onChange={(e) =>
            onChange({ players: Math.max(1, Number(e.target.value) || 1) })
          }
          className={`${SUNKEN_THIN} px-2 py-1 text-sm w-16 touch-manipulation`}
        />
      </label>

      <label className="flex flex-col gap-0.5 text-[10px] font-bold">
        Minutes
        <input
          type="number"
          min={MINUTES_STEP}
          max={999}
          step={MINUTES_STEP}
          inputMode="numeric"
          value={filters.timeAvailableMins}
          onChange={(e) => {
            const raw = Number(e.target.value) || MINUTES_STEP;
            const snapped = Math.max(
              MINUTES_STEP,
              Math.round(raw / MINUTES_STEP) * MINUTES_STEP,
            );
            onChange({ timeAvailableMins: snapped });
          }}
          className={`${SUNKEN_THIN} px-2 py-1 text-sm w-16 touch-manipulation`}
        />
      </label>

      <div className="flex flex-col gap-0.5 text-[10px] font-bold flex-1 min-w-37.5">
        Platform
        <div className="flex flex-wrap gap-2 py-0.5">
          {PLATFORM_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-1 text-[11px] font-bold touch-manipulation"
            >
              <input
                type="radio"
                name="platform"
                value={opt.value}
                checked={filters.platform === opt.value}
                onChange={() => onChange({ platform: opt.value })}
                className="w-3.5 h-3.5"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
