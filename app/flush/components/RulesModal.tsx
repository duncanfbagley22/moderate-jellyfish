"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Game } from "../lib/types";
import { RAISED, CHIP, BUTTON_BASE } from "../lib/win95";
import { TitleBar } from "./TitleBar";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { deleteGame } from "../lib/db";

type RulesModalProps = {
  game: Game | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onEdit: (game: Game) => void;
};

// Simple opacity/scale fade — no physics, no layout-shared-element tricks.
// Keeps this snappy on mobile per the project's animation constraints.
export function RulesModal({ game, onClose, onDeleted, onEdit }: RulesModalProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleCancelDelete() {
    if (isDeleting) return;
    setIsConfirmOpen(false);
    setDeleteError(null);
  }

  async function handleConfirmDelete() {
    if (!game) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteGame(game.id);
      setIsConfirmOpen(false);
      // Closes RulesModal too — the parent clears selectedGame here since
      // the game it was showing no longer exists.
      onDeleted(game.id);
    } catch {
      setDeleteError("Couldn't delete that game. Try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {game && (
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
              className={`${RAISED} w-full max-w-lg max-h-[85vh] flex flex-col text-black`}
            >
              <TitleBar icon="" label={game.name} onClose={onClose} />
              <div className="p-4 flex flex-col gap-3 overflow-y-auto bg-[#c0c0c0]">
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className={CHIP}>
                    {" "}
                    {game.min_players === game.max_players
                      ? game.min_players
                      : `${game.min_players}-${game.max_players}`}
                  </span>
                  <span className={CHIP}>{game.time_estimate_mins} min</span>
                  {game.platform.map((p) => (
                    <span key={p} className={CHIP}>
                      {p === "face cards" ? "Face Cards" : "Pen & Paper"}
                    </span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {game.rules_long}
                </p>
                {game.url && (
                  <a
                    href={game.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-blue-800 underline underline-offset-2 break-all"
                  >
                    {game.url}
                  </a>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => onEdit(game)}
                    className={BUTTON_BASE}
                  >
                    Edit Game
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmOpen(true)}
                    className={`${BUTTON_BASE} text-red-800`}
                  >
                    Delete Game
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDeleteModal
        isOpen={isConfirmOpen}
        gameName={game?.name ?? ""}
        isDeleting={isDeleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
