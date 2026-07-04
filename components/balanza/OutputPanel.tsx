'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Save, Sparkles } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { clsx } from '@/lib/balanza/clsx';
import type { Tier } from '@/lib/balanza/types';

interface OutputPanelProps {
  tier: Tier;
  markdown: string | null;
  isGenerating: boolean;
  isSaved: boolean;
  onSave: () => void;
}

export function OutputPanel({ markdown, isGenerating, isSaved, onSave }: OutputPanelProps) {
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
        {isGenerating && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
            <Sparkles size={20} className="animate-pulse" />
            <p className="text-xs font-mono-ui">Running single-shot prompt…</p>
          </div>
        )}

        {!isGenerating && !markdown && (
          <div className="h-full flex items-center justify-center text-center px-8">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Configure the prompt on the left, then generate to see the response here.
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