"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { FlowchartView } from "@/components/balanza/FlowchartView";
import { TierStack } from "@/components/balanza/TierStack";
import { SandboxPanel } from "@/components/balanza/SandboxPanel";
import { OutputPanel } from "@/components/balanza/OutputPanel";
import { PromptBar } from "@/components/balanza/PromptBar";
import { Baseline } from "@/components/balanza/Baseline";
import { clsx } from "@/lib/balanza/clsx";
import { generateBlueprint } from "@/lib/balanza/gemini";
import { getSessionId } from "@/lib/balanza/session";
import { createClient } from "@/lib/supabase/client";
import type { PromptParams, Tier } from "@/lib/balanza/types";
import { InfoButton } from "@/components/balanza/InfoButton";

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

export default function BalanzaApp() {
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
    "tier" | "topic" | "timeframe" | "intent" | "platform" | "friction" | "creativity"
  > | null>(null);

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
              Balanza
            </h1>
            <InfoButton
              title="Balanza"
              sections={[
                {
                  body: "Balanza is a tool to help brainstorm potential ideas. The tool treats life through the perspective of a system with three key areas: Deficit, Status Quo, and Growth. Each area acts upon the others. Select the area that matches where you're at on a given front, then describe what's on your mind and set the parameters, and it'll shape a response around that area to guide your thinking and planning.",
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
        <span className="font-mono-ui text-[10px] tracking-widest text-slate-400 uppercase">
          Project Guidance Tool
        </span>
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
