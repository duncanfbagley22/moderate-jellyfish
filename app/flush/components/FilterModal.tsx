"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { GameFilters } from "../lib/types";
import { RAISED } from "../lib/win95";
import { TitleBar } from "./TitleBar";
import { FilterForm } from "./FilterForm";

type FilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  filters: GameFilters;
  onChange: (patch: Partial<GameFilters>) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

// Filters live in an on-demand overlay rather than always-on-page —
// keeps the main view (header + deck + controls) short enough to fit a
// single viewport with no scrolling, on any device.
export function FilterModal({
  isOpen,
  onClose,
  filters,
  onChange,
  onSubmit,
  isLoading,
}: FilterModalProps) {
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
          onClick={onClose}
        >
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className={`${RAISED} w-full max-w-sm max-h-[85vh] flex flex-col text-black`}
          >
            <TitleBar icon="⚙" label="Filters" onClose={onClose} />
            <div className="overflow-y-auto bg-[#c0c0c0] p-1">
              <FilterForm filters={filters} onChange={onChange} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
