'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { clsx } from '@/app/springboard/lib/clsx';

interface PromptBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
}

/**
 * Chat-style input pinned to the output area: an auto-growing textarea (à la
 * Claude/ChatGPT) paired with the generate action. The user's text here is
 * the primary instruction the Gemini prompt is built around — see
 * buildPrompt() in app/api/springboard/generate/route.ts.
 */
export function PromptBar({ value, onChange, onSubmit, isGenerating }: PromptBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow with content, capped so it never swallows the output area.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isGenerating) onSubmit();
    }
  }

  return (
    <GlassCard
      tintBg={false}
      active={value.trim().length > 0}
      className="shrink-0 flex items-end gap-2 p-2.5"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What do you want help thinking through?"
        className={clsx(
          'flex-1 resize-none bg-transparent px-2.5 py-2 text-sm leading-relaxed max-h-40',
          'text-slate-800 dark:text-slate-100',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'outline-none'
        )}
      />
      <button
        onClick={onSubmit}
        disabled={isGenerating || !value.trim()}
        aria-label="Generate"
        className={clsx(
          'flex items-center justify-center shrink-0 rounded-xl h-9 w-9 mb-0.5',
          'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
          'transition-opacity disabled:opacity-40'
        )}
      >
        {isGenerating ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Sparkles size={15} />
        )}
      </button>
    </GlassCard>
  );
}
