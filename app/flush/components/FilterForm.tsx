"use client";

import type { GameFilters, PlatformFilter } from "../lib/types";
import { PLATFORM_VALUES, PLATFORM_LABELS } from "../lib/types";
import { RAISED, SUNKEN_THIN, BUTTON_BASE } from "../lib/win95";

type FilterFormProps = {
  filters: GameFilters;
  onChange: (patch: Partial<GameFilters>) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

const PLATFORM_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: "either", label: "Either" },
  ...PLATFORM_VALUES.map((p) => ({ value: p as PlatformFilter, label: PLATFORM_LABELS[p] })),
];

export function FilterForm({
  filters,
  onChange,
  onSubmit,
  isLoading,
}: FilterFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={`${RAISED} p-3 sm:p-4 flex flex-col gap-3 text-black`}
    >
      <fieldset className={`${SUNKEN_THIN} p-3 flex flex-col gap-3`}>
        <legend className="px-1 text-xs font-bold bg-[#c0c0c0]">
          Group Size
        </legend>
        <div className="flex items-center gap-3">
          <label className="flex-1 flex flex-col gap-1 text-xs font-bold">
            Min Players
            <input
              type="number"
              min={1}
              max={99}
              inputMode="numeric"
              value={filters.minPlayers}
              onChange={(e) =>
                onChange({
                  minPlayers: Math.max(1, Number(e.target.value) || 1),
                })
              }
              className={`${SUNKEN_THIN} px-2 py-1.5 text-sm w-full touch-manipulation`}
            />
          </label>
          <label className="flex-1 flex flex-col gap-1 text-xs font-bold">
            Max Players
            <input
              type="number"
              min={1}
              max={99}
              inputMode="numeric"
              value={filters.maxPlayers}
              onChange={(e) =>
                onChange({
                  maxPlayers: Math.max(1, Number(e.target.value) || 1),
                })
              }
              className={`${SUNKEN_THIN} px-2 py-1.5 text-sm w-full touch-manipulation`}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className={`${SUNKEN_THIN} p-3 flex flex-col gap-2`}>
        <legend className="px-1 text-xs font-bold bg-[#c0c0c0]">
          Time Available
        </legend>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Minutes
          <input
            type="number"
            min={1}
            max={999}
            inputMode="numeric"
            value={filters.timeAvailableMins}
            onChange={(e) =>
              onChange({
                timeAvailableMins: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className={`${SUNKEN_THIN} px-2 py-1.5 text-sm w-full touch-manipulation`}
          />
        </label>
      </fieldset>

      <fieldset className={`${SUNKEN_THIN} p-3 flex flex-col gap-2`}>
        <legend className="px-1 text-xs font-bold bg-[#c0c0c0]">
          Platform
        </legend>
        <div className="flex flex-wrap gap-3">
          {PLATFORM_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-1.5 text-xs font-bold touch-manipulation"
            >
              <input
                type="radio"
                name="platform"
                value={opt.value}
                checked={filters.platform === opt.value}
                onChange={() => onChange({ platform: opt.value })}
                className="w-4 h-4"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" disabled={isLoading} className={`${BUTTON_BASE} mt-1`}>
        {isLoading ? "Shuffling..." : "🔀 Shuffle & Deal!"}
      </button>
    </form>
  );
}
