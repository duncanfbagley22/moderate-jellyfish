"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { FlowchartView } from "@/app/springboard/components/FlowchartView";
import { TierStack } from "@/app/springboard/components/TierStack";
import { SandboxPanel } from "@/app/springboard/components/SandboxPanel";
import { OutputPanel } from "@/app/springboard/components/OutputPanel";
import { PromptBar } from "@/app/springboard/components/PromptBar";
import { Baseline } from "@/app/springboard/components/Baseline";
import { clsx } from "@/app/springboard/lib/clsx";
import { generateBlueprint } from "@/app/springboard/lib/gemini";
import { getSessionId } from "@/app/springboard/lib/session";
import { createClient } from "@/lib/supabase/client";
import type { PromptParams, Tier } from "@/app/springboard/lib/types";
import { InfoButton } from "@/app/springboard/components/InfoButton";
import BackHome from "@/components/BackHome";

type AppState = "flowchart" | "sandbox";

const DEFAULT_PARAMS: Omit<PromptParams, "tier" | "userPrompt"> = {
  topic: "work",
  timeframe: "short_term",
  intent: "brainstorm",
  platform: "code",
  friction: 30,
  creativity: 50,
  model: "gemini-flash-lite",
};

export default function SpringboardApp() {
  const [view, setView] = useState<AppState>("flowchart");
  const [selectedTier, setSelectedTier] = useState<Tier>("maintenance");
  const [params, setParams] =
    useState<Omit<PromptParams, "tier" | "userPrompt">>(DEFAULT_PARAMS);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  // Live text in the prompt bar; cleared once a generation succeeds.
  const [promptText, setPromptText] = useState("");
  // The instruction that actually produced the current `markdown`, kept around
  // so it can be persisted alongside the blueprint on save even after the
  // input clears.
  const [lastPrompt, setLastPrompt] = useState("");
  // Snapshot of the structured inputs (everything but model/userPrompt) that
  // produced the current `markdown`, so the output panel can render them as
  // pills even after the user keeps tweaking the live sandbox controls.
  const [lastParams, setLastParams] = useState<Pick<
    PromptParams,
    | "tier"
    | "topic"
    | "timeframe"
    | "intent"
    | "platform"
    | "friction"
    | "creativity"
  > | null>(null);

  const handleReset = useCallback(() => {
    setSelectedTier("maintenance");
    setParams(DEFAULT_PARAMS);
    setMarkdown(null);
    setIsGenerating(false);
    setIsSaved(false);
    setPromptText("");
    setLastPrompt("");
    setLastParams(null);
  }, []);

  const handleSelectTierFromFlowchart = useCallback((tier: Tier) => {
    setSelectedTier(tier);
    setView("sandbox");
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
    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) return;

    setIsGenerating(true);
    setIsSaved(false);
    setLastPrompt(trimmedPrompt);
    setLastParams({
      tier: selectedTier,
      topic: params.topic,
      timeframe: params.timeframe,
      intent: params.intent,
      platform: params.platform,
      friction: params.friction,
      creativity: params.creativity,
    });
    try {
      const result = await generateBlueprint({
        tier: selectedTier,
        ...params,
        userPrompt: trimmedPrompt,
      });
      setMarkdown(result.markdown);
      setPromptText("");
    } catch (err) {
      setMarkdown(
        `**Something went wrong generating this blueprint.**\n\n${(err as Error).message}`,
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!markdown) return;
    const supabase = createClient();
    const { error } = await supabase.from("saved_blueprints").insert({
      session_id: getSessionId(),
      tier: selectedTier,
      metadata: { tier: selectedTier, ...params, userPrompt: lastPrompt },
      payload_md: markdown,
    });
    if (!error) setIsSaved(true);
  }

  return (
    <div
      className={clsx(
        "relative min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden",
        view === "flowchart" && "dot-matrix",
      )}
    >
      <header className="relative z-20 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          {view === "sandbox" && (
            <button
              onClick={() => setView("flowchart")}
              className="mr-1 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Back to flowchart"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <h1 className="font-display text-lg font-semibold tracking-tight">
              Springboard
            </h1>
            <InfoButton
              title="Springboard"
              sections={[
                {
                  body: "Springboard is a tool to help brainstorm potential ideas. The tool treats life through the perspective of a system with three key areas: Deficit, Status Quo, and Growth. Each area acts upon the others. Select the area that matches where you're at on a given front, then describe what's on your mind and set the parameters, and it'll shape a response around that area to guide your thinking and planning.",
                },
                {
                  heading: "Deficit",
                  body: "Deficit represents the gap between your current state and your desired state. Neglecting something in your status quo creates a deficit, and clean up helps close the gap.",
                },
                {
                  heading: "Status Quo",
                  body: "Status Quo represents your current state, the general day-to-day reality. Maintenance is required to keep the status quo.",
                },
                {
                  heading: "Growth",
                  body: "Growth represents the potential for improvement or expansion. It's the area where you see opportunities for development, and focusing on effective growth leads to improvement in the status quo.",
                },
              ]}
            />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 sm:px-3 sm:py-2 sm:text-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <BackHome className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 sm:px-3 sm:py-2 sm:text-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100">
            <ArrowLeft size={16} />
            Back to Main
          </BackHome>
        </div>
      </header>

      <LayoutGroup>
        {/* main is relative and has a fixed height, making it the perfect positioning anchor */}
        <main className="relative z-10 max-w-6xl mx-auto px-6 pb-10 h-[calc(100vh-140px)]">
          {/* BASELINE MOTIF: Absolutely centered vertically within the main workspace area, flowchart view only */}
          {view === "flowchart" && (
            <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 -mt-4.5 pointer-events-none z-0">
              <Baseline />
            </div>
          )}

          <AnimatePresence mode="wait">
            {view === "flowchart" ? (
              <FlowchartView
                key="flowchart"
                onSelectTier={handleSelectTierFromFlowchart}
              />
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
                  <TierStack
                    selected={selectedTier}
                    onSelect={handleSelectTierInSandbox}
                  />
                  <SandboxPanel
                    params={{
                      tier: selectedTier,
                      userPrompt: promptText,
                      ...params,
                    }}
                    onChange={handleParamChange}
                  />
                </div>

                {/* flex-col-reverse on mobile puts the prompt bar above the output;
                    lg:flex-col puts it back at the bottom on desktop. */}
                <div className="min-h-0 flex flex-col-reverse lg:flex-col gap-4 h-full">
                  <div className="flex-1 min-h-0">
                    <OutputPanel
                      tier={selectedTier}
                      markdown={markdown}
                      isGenerating={isGenerating}
                      isSaved={isSaved}
                      onSave={handleSave}
                      usedParams={lastParams}
                    />
                  </div>
                  <PromptBar
                    value={promptText}
                    onChange={setPromptText}
                    onSubmit={handleGenerate}
                    isGenerating={isGenerating}
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
