'use client';

import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion';
import { forwardRef, useState, type ReactNode } from 'react';
import type { Tier } from '@/app/balanza/lib/types';
import { clsx } from '@/app/balanza/lib/clsx';

type GlowVariant = Tier | 'neutral';

const GLOW_SHADOW: Record<GlowVariant, string> = {
  clean_up: '0 0 40px -8px rgb(var(--glow-clean-up) / 0.55)',
  maintenance: '0 0 40px -8px rgb(var(--glow-maintenance) / 0.55)',
  growth: '0 0 40px -8px rgb(var(--glow-growth) / 0.55)',
  neutral: '0 0 40px -8px rgb(var(--glow-baseline) / 0.4)',
};

const GLOW_BORDER: Record<GlowVariant, string> = {
  clean_up: 'hover:border-rose-400/30',
  maintenance: 'hover:border-amber-400/30',
  growth: 'hover:border-emerald-400/30',
  neutral: 'hover:border-sky-300/30',
};

const GLOW_BG: Record<GlowVariant, string> = {
  clean_up: 'bg-[rgb(var(--glow-clean-up)/0.16)] dark:bg-[rgb(var(--glow-clean-up)/0.18)]',
  maintenance: 'bg-[rgb(var(--glow-maintenance)/0.16)] dark:bg-[rgb(var(--glow-maintenance)/0.18)]',
  growth: 'bg-[rgb(var(--glow-growth)/0.16)] dark:bg-[rgb(var(--glow-growth)/0.18)]',
  neutral: 'bg-white/60 dark:bg-white/5',
};

const TOOLTIP_ACCENT: Record<GlowVariant, string> = {
  clean_up: 'border-rose-400/40 text-rose-600 dark:text-rose-400',
  maintenance: 'border-amber-400/40 text-amber-600 dark:text-amber-400',
  growth: 'border-emerald-400/40 text-emerald-600 dark:text-emerald-400',
  neutral: 'border-sky-300/40 text-sky-600 dark:text-sky-400',
};

export interface GlassCardProps extends HTMLMotionProps<'div'> {
  glow?: GlowVariant;
  active?: boolean;
  dimmed?: boolean;
  layoutId?: string;
  rounded?: 'lg' | 'none';
  bordered?: boolean;
  children?: ReactNode;
  /** Set false to keep the neutral glass fill while still using `glow` for the border/shadow color. */
  tintBg?: boolean;
  /** Explainer content shown in a hover tooltip, styled to match `glow`. */
  tooltip?: ReactNode;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      glow = 'neutral',
      active,
      dimmed,
      layoutId,
      rounded = 'lg',
      bordered = true,
      tintBg = true,
      tooltip,
      className,
      children,
      style,
      ...rest
    },
    ref
  ) => {
    const [hovered, setHovered] = useState(false);

    return (
      <motion.div
        ref={ref}
        layoutId={layoutId}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        className={clsx(
          'relative',
          rounded === 'lg' && 'rounded-2xl',
          bordered && 'border border-black/10 dark:border-white/10',
          GLOW_BG[tintBg ? glow : 'neutral'],
          'backdrop-blur-lg',
          'transition-colors duration-300',
          GLOW_BORDER[glow],
          dimmed && 'opacity-40 saturate-50',
          className
        )}
        animate={{
          boxShadow: active ? GLOW_SHADOW[glow] : '0 0 0px 0px rgb(0 0 0 / 0)',
          opacity: dimmed ? 0.4 : 1,
        }}
        whileHover={{
          boxShadow: GLOW_SHADOW[glow],
          scale: dimmed ? 1 : 1.015,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        style={style}
        {...rest}
      >
        {children}
        {tooltip && (
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className={clsx(
                  'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
                  'w-max max-w-200px rounded-lg border px-3 py-2 text-lg leading-snug',
                  'bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg shadow-lg',
                  'text-slate-600 dark:text-slate-300',
                  TOOLTIP_ACCENT[glow]
                )}
              >
                {tooltip}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';