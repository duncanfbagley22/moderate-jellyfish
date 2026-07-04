'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { FlowchartView } from '@/components/balanza/FlowchartView';
import { TierStack } from '@/components/balanza/TierStack';
import { SandboxPanel } from '@/components/balanza/SandboxPanel';
import { OutputPanel } from '@/components/balanza/OutputPanel';
import { Baseline } from '@/components/balanza/Baseline';
import { clsx } from '@/lib/balanza/clsx';
import { generateBlueprint } from '@/lib/balanza/gemini';
import { getSessionId } from '@/lib/balanza/session';
import { createClient } from '@/lib/supabase/client';
import type { PromptParams, Tier } from '@/lib/balanza/types';

type AppState = 'flowchart' | 'sandbox';

const DEFAULT_PARAMS: Omit<PromptParams, 'tier'> = {
  topic: 'work',
  timeframe: 'short_term',
  intent: 'brainstorm',
  platform: 'code',
  friction: 30,
  model: 'gemini-flash-lite',
};

export default function BalanzaApp() {
  const [view, setView] = useState<AppState>('flowchart');
  const [selectedTier, setSelectedTier] = useState<Tier>('maintenance');
  const [params, setParams] = useState<Omit<PromptParams, 'tier'>>(DEFAULT_PARAMS);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSelectTierFromFlowchart = useCallback((tier: Tier) => {
    setSelectedTier(tier);
    setView('sandbox');
  }, []);

  const handleSelectTierInSandbox = useCallback((tier: Tier) => {
    setSelectedTier(tier);
    setMarkdown(null);
    setIsSaved(false);
  }, []);

  const handleParamChange = useCallback((patch: Partial<PromptParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
    setIsSaved(false);
  }, []);

  async function handleGenerate() {
    setIsGenerating(true);
    setIsSaved(false);
    try {
      const result = await generateBlueprint({ tier: selectedTier, ...params });
      setMarkdown(result.markdown);
    } catch (err) {
      setMarkdown(`**Something went wrong generating this blueprint.**\n\n${(err as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!markdown) return;
    const supabase = createClient();
    const { error } = await supabase.from('saved_blueprints').insert({
      session_id: getSessionId(),
      tier: selectedTier,
      metadata: { tier: selectedTier, ...params },
      payload_md: markdown,
    });
    if (!error) setIsSaved(true);
  }

  return (
    <div
      className={clsx(
        'relative min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden',
        view === 'flowchart' && 'dot-matrix'
      )}
    >
      <header className="relative z-20 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          {view === 'sandbox' && (
            <button
              onClick={() => setView('flowchart')}
              className="mr-1 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Back to flowchart"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <h1 className="font-display text-lg font-semibold tracking-tight">Balanza</h1>
        </div>
        <span className="font-mono-ui text-[10px] tracking-widest text-slate-400 uppercase">
          Project Guidance Tool
        </span>
      </header>

      <LayoutGroup>
        {/* main is relative and has a fixed height, making it the perfect positioning anchor */}
        <main className="relative z-10 max-w-6xl mx-auto px-6 pb-10 h-[calc(100vh-140px)]">
          
          {/* BASELINE MOTIF: Absolutely centered vertically within the main workspace area, flowchart view only */}
          {view === 'flowchart' && (
            <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 -mt-4.5 pointer-events-none z-0">
              <Baseline />
            </div>
          )}

          <AnimatePresence mode="wait">
            {view === 'flowchart' ? (
              <FlowchartView key="flowchart" onSelectTier={handleSelectTierFromFlowchart} />
            ) : (
              <motion.div
                key="sandbox"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: 0.15 }}
                className="relative z-10 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 h-full"
              >
                <div className="overflow-y-auto pr-1 space-y-6">
                  <TierStack selected={selectedTier} onSelect={handleSelectTierInSandbox} />
                  <SandboxPanel
                    params={{ tier: selectedTier, ...params }}
                    onChange={handleParamChange}
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                  />
                </div>

                <div className="min-h-0">
                  <OutputPanel
                    tier={selectedTier}
                    markdown={markdown}
                    isGenerating={isGenerating}
                    isSaved={isSaved}
                    onSave={handleSave}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </LayoutGroup>
    </div>
  );
}