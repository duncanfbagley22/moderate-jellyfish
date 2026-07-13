"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RAISED, BUTTON_BASE } from "../lib/win95";
import { TitleBar } from "./TitleBar";

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  gameName: string;
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

// Stacks on top of RulesModal (z-60 vs. its z-50) as its own small Win95
// dialog rather than swapping RulesModal's own content — the "are you
// sure" step reads as a deliberate interruption, not a content change.
export function ConfirmDeleteModal({
  isOpen,
  gameName,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 touch-manipulation"
          onClick={() => !isDeleting && onCancel()}
        >
          <motion.div
            key="confirm-panel"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className={`${RAISED} w-full max-w-xs text-black`}
          >
            <TitleBar
              icon="⚠"
              label="Delete Game"
              onClose={isDeleting ? undefined : onCancel}
            />
            <div className="p-4 flex flex-col gap-3 bg-[#c0c0c0]">
              <p className="text-sm">
                Remove <span className="font-bold">{gameName}</span>{" "}
                from the deck? This can&rsquo;t be undone.
              </p>
              {error && (
                <p className="text-xs font-bold text-red-800">⚠ {error}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className={`${BUTTON_BASE} text-red-800`}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isDeleting}
                  className={BUTTON_BASE}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
