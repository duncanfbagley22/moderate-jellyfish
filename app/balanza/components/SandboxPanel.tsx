"use client";

import * as Select from "@radix-ui/react-select";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import * as Slider from "@radix-ui/react-slider";
import { ChevronDown, Check } from "lucide-react";
import {
  TIER_FORCE_LABEL,
  type PromptParams,
  type Topic,
  type Timeframe,
  type Intent,
  type Platform,
  type ModelEngine,
} from "@/app/balanza/lib/types";
import { clsx } from "@/app/balanza/lib/clsx";
import { InfoButton } from "@/app/balanza/components/InfoButton";

interface SandboxPanelProps {
  params: PromptParams;
  onChange: (patch: Partial<PromptParams>) => void;
}

const TOPICS: { value: Topic; label: string }[] = [
  { value: "work", label: "Work" },
  { value: "exercise", label: "Exercise" },
  { value: "spiritual", label: "Spiritual" },
  { value: "social", label: "Social" },
  { value: "financial", label: "Financial" },
  { value: "creative", label: "Creative" },
  { value: "home", label: "Home" },
  { value: "other", label: "Other" },
];

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "short_term", label: "Short-Term" },
  { value: "long_term", label: "Long-Term" },
];

export function SandboxPanel({ params, onChange }: SandboxPanelProps) {
  return (
    <div className="space-y-6">
      <p className="font-mono-ui text-[10px] tracking-widest text-slate-400 uppercase">
        Brainstorming under · {TIER_FORCE_LABEL[params.tier]}
      </p>

      <Field
        label="Topic"
        info={{
          title: "Topic",
          sections: [
            {
              body: "What area of life are you looking to address?",
            },
          ],
        }}
      >
        <Select.Root
          value={params.topic}
          onValueChange={(v) => onChange({ topic: v as Topic })}
        >
          <Select.Trigger className="flex w-full items-center justify-between rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur px-3 py-2 text-sm text-slate-800 dark:text-slate-100">
            <Select.Value />
            <Select.Icon>
              <ChevronDown size={14} className="opacity-60" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg shadow-xl z-50">
              <Select.Viewport className="p-1">
                {TOPICS.map((t) => (
                  <Select.Item
                    key={t.value}
                    value={t.value}
                    className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 outline-none data-highlighted:bg-black/5 dark:data-highlighted:bg-white/10 cursor-pointer"
                  >
                    <Select.ItemText>{t.label}</Select.ItemText>
                    <Select.ItemIndicator>
                      <Check size={14} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </Field>

      <Field
        label="Timeframe"
        info={{
          title: "Timeframe",
          sections: [
            {
              heading: "Short-Term",
              body: 'Something you could realistically start or finish in the next few days to a few weeks. Not a task, but a short-term project.',
            },
            {
              heading: "Long-Term",
              body: "A slower project arc. Maybe months, maybe longer. The response will assume you have room to sequence things rather than needing a quick win.",
            },
          ],
        }}
      >
        <SegmentedToggle
          value={params.timeframe}
          onChange={(v) => onChange({ timeframe: v as Timeframe })}
          options={TIMEFRAMES}
        />
      </Field>

      <Field
        label="Intent"
        info={{
          title: "Intent",
                    sections: [
            {
              heading: "Brainstorm",
              body: 'You want options, not commitment. Balanza will surface 3–5 different directions with a quick rationale for each, so you can pick one to explore further.',
            },
            {
              heading: "Blueprint",
              body: "You already know the direction, you just want the plan. Balanza will give you one concrete, sequenced path: steps, rough timing, and where it's likely to fall apart.",
            },
          ],
        }}
      >
        <SegmentedToggle
          value={params.intent}
          onChange={(v) => onChange({ intent: v as Intent })}
          options={[
            { value: "brainstorm", label: "Brainstorm" },
            { value: "blueprint", label: "Blueprint" },
          ]}
        />
      </Field>

      <Field
        label="Platform"
        info={{
          title: "Platform",
          sections: [
            {
              body: 'The medium through which you want to implement the solution. This will shape the response to be more relevant to your chosen platform.',
            },
            {
              heading: "Physical",
              body: 'A tangible, real-world approach to addressing the issue.',
            },
            {
              heading: "Code",
              body: "A digital solution implemented through programming.",
            },
            {
              heading: "Spreadsheet",
              body: "A simple, structured approach to organizing and analyzing data.",
            },
          ],
        }}
      >
        <SegmentedToggle
          value={params.platform}
          onChange={(v) => onChange({ platform: v as Platform })}
          options={[
            { value: "physical", label: "Physical" },
            { value: "code", label: "Code" },
            { value: "spreadsheet", label: "Spreadsheet" },
          ]}
        />
      </Field>

      <Field
        label={`Friction — ${params.friction}`}
        info={{
          title: "Friction",
                    sections: [
            {
              body: 'The level of difficulty involved in implementing the solution.',
            },
            {
              heading: "Low Friction",
              body: 'Something that requires minimal effort to implement.',
            },
            {
              heading: "High Friction",
              body: 'Something that requires significant effort to implement.',
            },
          ],
        }}
      >
        <Slider.Root
          className="relative flex items-center w-full h-5"
          value={[params.friction]}
          max={100}
          step={5}
          onValueChange={([v]) => onChange({ friction: v })}
        >
          <Slider.Track className="relative h-1 flex-1 rounded-full bg-black/10 dark:bg-white/10">
            <Slider.Range className="absolute h-full rounded-full bg-linear-to-r from-sky-400 to-rose-400" />
          </Slider.Track>
          <Slider.Thumb className="block w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-100 border border-black/10 shadow-md" />
        </Slider.Root>
        <div className="flex justify-between font-mono-ui text-[10px] text-slate-400 mt-1">
          <span>Low</span>
          <span>High</span>
        </div>
      </Field>

      <Field
        label={`Creativity — ${params.creativity}`}
        info={{
          title: "Creativity",
                    sections: [
            {
              body: 'The level of originality and innovation in the solution.',
            },
            {
              heading: "Basic",
              body: 'A straightforward approach to addressing the issue.',
            },
            {
              heading: "Super Creative",
              body: "An innovative solution that goes beyond the obvious.",
            },
          ],
        }}
      >
        <Slider.Root
          className="relative flex items-center w-full h-5"
          value={[params.creativity]}
          max={100}
          step={5}
          onValueChange={([v]) => onChange({ creativity: v })}
        >
          <Slider.Track className="relative h-1 flex-1 rounded-full bg-black/10 dark:bg-white/10">
            <Slider.Range className="absolute h-full rounded-full bg-linear-to-r from-violet-400 to-amber-400" />
          </Slider.Track>
          <Slider.Thumb className="block w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-100 border border-black/10 shadow-md" />
        </Slider.Root>
        <div className="flex justify-between font-mono-ui text-[10px] text-slate-400 mt-1">
          <span>Basic</span>
          <span>Super Creative</span>
        </div>
      </Field>

      <Field
        label="Model Engine"
        info={{
          title: "Model Engine",
                    sections: [
            {
              body: 'Explainer',
            },
            {
              heading: "Gemini Flash Lite",
              body: 'A lightweight version of the Gemini Flash model. It is faster and cheaper, but may produce less detailed responses.',
            },
            {
              heading: "Gemini Flash",
              body: "The full-featured version of the Gemini Flash model. It is slower and more expensive, but produces more detailed responses.",
            },
          ],
        }}
      >
        <SegmentedToggle
          value={params.model}
          onChange={(v) => onChange({ model: v as ModelEngine })}
          options={[
            { value: "gemini-flash-lite", label: "Flash Lite" },
            { value: "gemini-flash", label: "Flash" },
          ]}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  info,
  children,
}: {
  label: string;
  info?: React.ComponentProps<typeof InfoButton>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="block font-mono-ui text-[10px] tracking-widest text-slate-500 dark:text-slate-400 uppercase">
          {label}
        </label>
        {info && <InfoButton {...info} />}
      </div>
      {children}
    </div>
  );
}

function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      className="flex rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur p-1 gap-1"
    >
      {options.map((opt) => (
        <ToggleGroup.Item
          key={opt.value}
          value={opt.value}
          className={clsx(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            "text-slate-500 dark:text-slate-400",
            "data-[state=on]:bg-slate-900 data-[state=on]:text-white",
            "dark:data-[state=on]:bg-white dark:data-[state=on]:text-slate-900",
          )}
        >
          {opt.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
