'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Save, Sparkles } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { clsx } from '@/lib/balanza/clsx';
import {
  TIER_FORCE_LABEL,
  TOPIC_LABEL,
  TIMEFRAME_LABEL,
  INTENT_LABEL,
  PLATFORM_LABEL,
  type Tier,
  type PromptParams,
} from '@/lib/balanza/types';

// The subset of PromptParams worth showing as pills once a response comes
// back — excludes `model` and `userPrompt` per design (free text doesn't
// belong in a pill, and the model choice isn't really "framing" context).
export type UsedParams = Pick<
  PromptParams,
  'tier' | 'topic' | 'timeframe' | 'intent' | 'platform' | 'friction' | 'creativity'
>;

interface OutputPanelProps {
  tier: Tier;
  markdown: string | null;
  isGenerating: boolean;
  isSaved: boolean;
  onSave: () => void;
  /** Snapshot of the inputs that produced the current `markdown`. */
  usedParams: UsedParams | null;
}

const TIER_PILL_COLOR: Record<Tier, PillColor> = {
  clean_up: 'rose',
  maintenance: 'amber',
  growth: 'emerald',
};

type PillColor = 'rose' | 'amber' | 'emerald' | 'sky' | 'violet' | 'indigo' | 'teal' | 'fuchsia' | 'cyan';

const PILL_COLOR_CLASS: Record<PillColor, string> = {
  rose: 'bg-rose-400/10 text-rose-600 dark:text-rose-400 border-rose-400/25',
  amber: 'bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-400/25',
  emerald: 'bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/25',
  sky: 'bg-sky-400/10 text-sky-600 dark:text-sky-400 border-sky-400/25',
  violet: 'bg-violet-400/10 text-violet-600 dark:text-violet-400 border-violet-400/25',
  indigo: 'bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 border-indigo-400/25',
  teal: 'bg-teal-400/10 text-teal-600 dark:text-teal-400 border-teal-400/25',
  fuchsia: 'bg-fuchsia-400/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-400/25',
  cyan: 'bg-cyan-400/10 text-cyan-600 dark:text-cyan-400 border-cyan-400/25',
};

function Pill({ color, children }: { color: PillColor; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
        PILL_COLOR_CLASS[color]
      )}
    >
      {children}
    </span>
  );
}

function UsedParamsPills({ params }: { params: UsedParams }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-4 shrink-0">
      <Pill color={TIER_PILL_COLOR[params.tier]}>{TIER_FORCE_LABEL[params.tier]}</Pill>
      <Pill color="sky">{TOPIC_LABEL[params.topic]}</Pill>
      <Pill color="violet">{TIMEFRAME_LABEL[params.timeframe]}</Pill>
      <Pill color="indigo">{INTENT_LABEL[params.intent]}</Pill>
      <Pill color="teal">{PLATFORM_LABEL[params.platform]}</Pill>
      <Pill color="fuchsia">Friction {params.friction}</Pill>
      <Pill color="cyan">Creativity {params.creativity}</Pill>
    </div>
  );
}

export function OutputPanel({ markdown, isGenerating, isSaved, onSave, usedParams }: OutputPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <GlassCard tintBg={false} className="h-full flex flex-col p-6" active={!!markdown}>
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">
          Output
        </h2>
        <div className="flex gap-2">
          <ActionButton onClick={handleCopy} disabled={!markdown}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy Payload'}
          </ActionButton>
          <ActionButton onClick={onSave} disabled={!markdown} primary>
            <Save size={13} />
            {isSaved ? 'Saved' : 'Save to History'}
          </ActionButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {!isGenerating && markdown && usedParams && <UsedParamsPills params={usedParams} />}

        {isGenerating && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
            <Sparkles size={20} className="animate-pulse" />
            <p className="text-xs font-mono-ui">Running single-shot prompt…</p>
          </div>
        )}

        {!isGenerating && !markdown && (
          <div className="h-full flex items-center justify-center text-center px-8">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Tune the context on the left, describe what you're after below, and generate to see the response here.
            </p>
          </div>
        )}

        {!isGenerating && markdown && (
          <article className="prose prose-sm dark:prose-invert prose-slate max-w-none prose-headings:font-display">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </article>
        )}
      </div>
    </GlassCard>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity disabled:opacity-40',
        primary
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
          : 'border border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-300'
      )}
    >
      {children}
    </button>
  );
}