"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Game, Platform } from "../lib/types";
import { PLATFORM_VALUES, PLATFORM_LABELS } from "../lib/types";
import { RAISED, SUNKEN_THIN, BUTTON_BASE } from "../lib/win95";
import { TitleBar } from "./TitleBar";
import { NumberStepper } from "./NumberStepper";
import { insertGame } from "../lib/db";

type AddGameFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (game: Game) => void;
};

const EMPTY_FORM = {
  name: "",
  minPlayers: 2,
  maxPlayers: 4,
  timeEstimateMins: 30,
  platform: [] as Platform[],
  rulesShort: "",
  rulesLong: "",
  url: "",
};

export function AddGameForm({ isOpen, onClose, onAdded }: AddGameFormProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePlatform(p: Platform) {
    setForm((prev) => ({
      ...prev,
      platform: prev.platform.includes(p)
        ? prev.platform.filter((x) => x !== p)
        : [...prev.platform, p],
    }));
  }

  function handleClose() {
    setForm(EMPTY_FORM);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Give the game a name.");
    if (form.minPlayers > form.maxPlayers)
      return setError("Min players can't be more than max players.");
    if (form.platform.length === 0)
      return setError("Pick at least one platform.");
    if (!form.rulesShort.trim() || !form.rulesLong.trim())
      return setError("Fill in both the short and full rules.");

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await insertGame({
        name: form.name.trim(),
        min_players: form.minPlayers,
        max_players: form.maxPlayers,
        time_estimate_mins: form.timeEstimateMins,
        platform: form.platform,
        rules_short: form.rulesShort.trim(),
        rules_long: form.rulesLong.trim(),
        url: form.url.trim() || null,
      });
      onAdded(created);
      handleClose();
    } catch {
      setError("Couldn't save that game. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 touch-manipulation"
          onClick={handleClose}
        >
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className={`${RAISED} w-full max-w-lg max-h-[85vh] flex flex-col text-black`}
          >
            <TitleBar icon="➕" label="Add a Game" onClose={handleClose} />
            <form
              onSubmit={handleSubmit}
              className="p-4 flex flex-col gap-3 overflow-y-auto bg-[#c0c0c0]"
            >
              <label className="flex flex-col gap-1 text-xs font-bold">
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className={`${SUNKEN_THIN} px-2 py-1.5 text-sm w-full touch-manipulation`}
                />
              </label>

              <div className="flex items-center gap-4">
                <label className="flex flex-col gap-1 text-xs font-bold">
                  Min Players
                  <NumberStepper
                    value={form.minPlayers}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, minPlayers: v }))
                    }
                    min={1}
                    max={99}
                    ariaLabel="Min players"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold">
                  Max Players
                  <NumberStepper
                    value={form.maxPlayers}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, maxPlayers: v }))
                    }
                    min={1}
                    max={99}
                    ariaLabel="Max players"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-xs font-bold">
                Time Estimate (minutes)
                <NumberStepper
                  value={form.timeEstimateMins}
                  onChange={(v) =>
                    setForm((p) => ({ ...p, timeEstimateMins: v }))
                  }
                  min={1}
                  max={999}
                  displayWidthClassName="w-12"
                  ariaLabel="Time estimate in minutes"
                />
              </label>

              <fieldset className={`${SUNKEN_THIN} p-3 flex flex-col gap-2`}>
                <legend className="px-1 text-xs font-bold bg-[#c0c0c0]">
                  Platform
                </legend>
                <div className="flex flex-wrap gap-3">
                  {PLATFORM_VALUES.map((p) => (
                    <label
                      key={p}
                      className="flex items-center gap-1.5 text-xs font-bold touch-manipulation"
                    >
                      <input
                        type="checkbox"
                        checked={form.platform.includes(p)}
                        onChange={() => togglePlatform(p)}
                        className="w-4 h-4"
                      />
                      {PLATFORM_LABELS[p]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex flex-col gap-1 text-xs font-bold">
                Short Description
                <input
                  type="text"
                  value={form.rulesShort}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, rulesShort: e.target.value }))
                  }
                  placeholder="One line — shows on the card."
                  className={`${SUNKEN_THIN} px-2 py-1.5 text-sm w-full touch-manipulation`}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold">
                Full Rules
                <textarea
                  value={form.rulesLong}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, rulesLong: e.target.value }))
                  }
                  rows={5}
                  placeholder="Shows in the expanded card view."
                  className={`${SUNKEN_THIN} px-2 py-1.5 text-sm w-full touch-manipulation resize-none`}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold">
                Link (optional)
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, url: e.target.value }))
                  }
                  placeholder="https://..."
                  className={`${SUNKEN_THIN} px-2 py-1.5 text-sm w-full touch-manipulation`}
                />
              </label>

              {error && (
                <p className="text-xs font-bold text-red-800">⚠ {error}</p>
              )}

              <div className="flex items-center gap-2 mt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={BUTTON_BASE}
                >
                  {isSubmitting ? "Saving..." : "Add to Deck"}
                </button>
                <button type="button" onClick={handleClose} className={BUTTON_BASE}>
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
