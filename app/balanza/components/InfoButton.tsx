'use client';

import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Info, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { Tier } from '@/app/balanza/lib/types';
import { clsx } from '@/app/balanza/lib/clsx';

type GlowVariant = Tier | 'neutral';

const ACCENT_TEXT: Record<GlowVariant, string> = {
  clean_up: 'text-rose-600 dark:text-rose-400',
  maintenance: 'text-amber-600 dark:text-amber-400',
  growth: 'text-emerald-600 dark:text-emerald-400',
  neutral: 'text-sky-600 dark:text-sky-400',
};

const ACCENT_RING: Record<GlowVariant, string> = {
  clean_up: 'hover:border-rose-400/40 hover:text-rose-500 dark:hover:text-rose-400',
  maintenance: 'hover:border-amber-400/40 hover:text-amber-500 dark:hover:text-amber-400',
  growth: 'hover:border-emerald-400/40 hover:text-emerald-500 dark:hover:text-emerald-400',
  neutral: 'hover:border-sky-400/40 hover:text-sky-500 dark:hover:text-sky-400',
};

export interface InfoSection {
  /** Optional heading for this chunk of the modal. Omit for a single free-flowing block. */
  heading?: string;
  body: ReactNode;
}

export interface InfoButtonProps {
  /** Modal title, shown in the header. */
  title: string;
  /** One or more content blocks, rendered in order and separated by dividers. */
  sections: InfoSection[];
  /** Ties the button/modal accent color to a tier, or 'neutral' (default). */
  glow?: GlowVariant;
  /** Extra classes for the trigger button (e.g. spacing next to a heading). */
  className?: string;
  /** Accessible label for the trigger button; defaults to `Explain ${title}`. */
  label?: string;
}

/**
 * Small "i" trigger that opens a style-consistent modal explainer. Drop this
 * next to any title or field label — pass a `title` and one or more
 * `sections` and it handles the rest (open/close, escape key, scroll lock,
 * dark mode, portal rendering so it's never clipped by a parent's
 * overflow-hidden).
 */
export function InfoButton({ title, sections, glow = 'neutral', className, label }: InfoButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
<button
  type="button"
  onClick={() => setOpen(true)}
  aria-label={label ?? `Explain ${title}`}
  className={clsx(
    'inline-flex items-center justify-center shrink-0 rounded-full w-5 h-5 cursor-pointer',
    'text-slate-600 dark:text-slate-300',
    'border border-black/20 dark:border-white/20',
    'bg-black/5 dark:bg-white/10',
    'transition-colors',
    ACCENT_RING[glow],
    className
  )}
>
  <Info size={12} strokeWidth={2.25} />
</button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <InfoModal title={title} sections={sections} glow={glow} onClose={() => setOpen(false)} />,
          document.body
        )}
    </>
  );
}

function InfoModal({
  title,
  sections,
  glow,
  onClose,
}: {
  title: string;
  sections: InfoSection[];
  glow: GlowVariant;
  onClose: () => void;
}) {
  // Escape-to-close + lock background scroll while the modal is open.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="info-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <motion.div
          key="info-modal-panel"
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={clsx(
            'relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border p-5',
            'bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg shadow-xl',
            'border-black/10 dark:border-white/10'
          )}
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className={clsx('font-display text-base font-semibold', ACCENT_TEXT[glow])}>{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-full p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="divide-y divide-black/10 dark:divide-white/10">
            {sections.map((section, i) => (
              <div key={i} className={i === 0 ? 'pb-4' : 'py-4 last:pb-0'}>
                {section.heading && (
                  <h3 className="font-mono-ui text-[10px] tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 uppercase">
                    {section.heading}
                  </h3>
                )}
                <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{section.body}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}