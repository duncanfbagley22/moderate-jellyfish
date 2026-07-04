'use client';

import { GlassCard } from './GlassCard';
import { TIER_STATE_LABEL, TIER_SUMMARY, type Tier } from '@/lib/balanza/types';

interface TierStackProps {
  selected: Tier;
  onSelect: (tier: Tier) => void;
}

const ORDER: Tier[] = ['growth', 'maintenance', 'clean_up'];
const GLOW: Record<Tier, 'clean_up' | 'maintenance' | 'growth'> = {
  clean_up: 'clean_up',
  maintenance: 'maintenance',
  growth: 'growth',
};

export function TierStack({ selected, onSelect }: TierStackProps) {
  return (
    <div className="rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 divide-y divide-black/10 dark:divide-white/10">
      {ORDER.map((tier) => (
        <GlassCard
          key={tier}
          layoutId={`tier-card-${tier}`}
          glow={GLOW[tier]}
          active={selected === tier}
          dimmed={selected !== tier}
          rounded="none"
          bordered={false}
          className="cursor-pointer px-4 py-5"
          onClick={() => onSelect(tier)}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">
              {TIER_STATE_LABEL[tier]}
            </h3>
            {selected === tier && (
              <span className="font-mono-ui text-[9px] tracking-widest text-slate-500 dark:text-slate-400">
                ACTIVE
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {TIER_SUMMARY[tier]}
          </p>
        </GlassCard>
      ))}
    </div>
  );
}