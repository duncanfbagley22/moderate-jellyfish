"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { TIER_STATE_LABEL, TIER_SUMMARY, type Tier } from "@/app/springboard/lib/types";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

interface FlowchartViewProps {
  onSelectTier: (tier: Tier) => void;
}

// 1. Grid coordinates mapped to standard percent units (0-100)
const NODE_POS: Record<Tier, { left: number; top: number }> = {
  clean_up: { left: 14, top: 40 },
  maintenance: { left: 50, top: 40 },
  growth: { left: 86, top: 40 },
};

type AnchorSide = "TOP" | "BOTTOM" | "LEFT" | "RIGHT";
type EdgeColor = "rose" | "amber" | "emerald";

const EDGE_TOOLTIP: Record<string, string> = {
  "clean-up": "Deliberate effort spent closing the deficit and getting back to baseline.",
  neglect: "Skipping maintenance until things slide into deficit.",
  maintenance: "The steady, recurring work that holds your baseline in place.",
  opportunity: "Extra capacity you invest to push beyond baseline.",
  improvement: "Growth gains settling in and raising your baseline.",
};

const TOOLTIP_BORDER: Record<EdgeColor, string> = {
  rose: "border-rose-400/40",
  amber: "border-amber-400/40",
  emerald: "border-emerald-400/40",
};

interface EdgeConfig {
  id: string;
  source: { tier: Tier; anchor: AnchorSide };
  target: { tier: Tier; anchor: AnchorSide };
  flow?: {
    strength: number;
    biasX?: number;
    biasY?: number;
    tension: number;
  };
  labelOffset?: { x: number; y: number };
  label: string;
  color: EdgeColor;
  isLoop?: boolean;
}

const EDGE_CONFIGS: EdgeConfig[] = [
  {
    id: "clean-up",
    source: { tier: "clean_up", anchor: "RIGHT" },
    target: { tier: "maintenance", anchor: "BOTTOM" },
flow: {
  strength: .7,
  biasX: 0.03,
  biasY: -0.03,
  tension: 0.6,
},
    labelOffset: { x: 0, y: -10 },
    label: "Clean Up",
    color: "emerald",
  },
  {
    id: "neglect",
    source: { tier: "maintenance", anchor: "LEFT" },
    target: { tier: "clean_up", anchor: "TOP" },
    flow: {
      strength: .7,
      biasX: 0.03,
      biasY: -.03,
      tension: .6,
    },
    labelOffset: { x: 0, y: 5 },
    label: "Neglect",
    color: "rose",
  },
  {
    id: "maintenance",
    source: { tier: "maintenance", anchor: "TOP" },
    target: { tier: "maintenance", anchor: "LEFT" },
    flow: {
  strength: 1,
  tension: .6,
  biasX: .2,
  biasY: -0.15,
    },
    labelOffset: { x: 0, y: -5 },
    label: "Maintenance",
    color: "amber",
  },
  {
    id: "opportunity",
    source: { tier: "maintenance", anchor: "RIGHT" },
    target: { tier: "growth", anchor: "BOTTOM" },
    flow: {
  strength: .7,
  biasX: 0.03,
  biasY: -0.03,
  tension: 0.6,
    },
    labelOffset: { x: 0, y: -4 },
    label: "Opportunity",
    color: "emerald",
  },
  {
    id: "improvement",
    source: { tier: "growth", anchor: "LEFT" },
    target: { tier: "maintenance", anchor: "TOP" },
    flow: {
      strength: .7,
      biasX: 0.03,
      biasY: -.03,
      tension: .6,
    },
    labelOffset: { x: 0, y: 5 },
    label: "Improvement",
    color: "emerald",
  },
];

const STROKE_CLASS: Record<EdgeColor, string> = {
  rose: "stroke-rose-500/70 dark:stroke-rose-400/70",
  amber: "stroke-amber-500/70 dark:stroke-amber-400/70",
  emerald: "stroke-emerald-500/70 dark:stroke-emerald-400/70",
};

const FILL_CLASS: Record<EdgeColor, string> = {
  rose: "fill-rose-500/100 dark:fill-rose-400/100",
  amber: "fill-amber-500/100 dark:fill-amber-400/100",
  emerald: "fill-emerald-500/100 dark:fill-emerald-400/100",
};

const LABEL_CLASS: Record<EdgeColor, string> = {
  rose: "text-rose-600 dark:text-rose-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
};

type NodeRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type NodeMap = Partial<Record<Tier, NodeRect>>;

// Helper to find exact outer card border coordinates
function getAnchor(rect: NodeRect, side: AnchorSide, container: DOMRect) {
  const left = rect.left - container.left;
  const top = rect.top - container.top;

  switch (side) {
    case "TOP":
      return {
        x: left + rect.width / 2,
        y: top,
      };

    case "BOTTOM":
      return {
        x: left + rect.width / 2,
        y: top + rect.height,
      };

    case "LEFT":
      return {
        x: left,
        y: top + rect.height / 2,
      };

    case "RIGHT":
      return {
        x: left + rect.width,
        y: top + rect.height / 2,
      };
  }
}

export function FlowchartView({ onSelectTier }: FlowchartViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const nodeRefs = {
    clean_up: useRef<HTMLDivElement>(null),
    maintenance: useRef<HTMLDivElement>(null),
    growth: useRef<HTMLDivElement>(null),
  };

  const [nodeRects, setNodeRects] = useState<Partial<Record<Tier, DOMRect>>>(
    {},
  );
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  const measure = () => {
    if (!containerRef.current) return;

    const cRect = containerRef.current.getBoundingClientRect();
    setContainerRect(cRect);

    setNodeRects({
      clean_up: nodeRefs.clean_up.current?.getBoundingClientRect(),
      maintenance: nodeRefs.maintenance.current?.getBoundingClientRect(),
      growth: nodeRefs.growth.current?.getBoundingClientRect(),
    });
  };

  useLayoutEffect(() => {
    measure();

    const observer = new ResizeObserver(measure);

    if (containerRef.current) observer.observe(containerRef.current);

    Object.values(nodeRefs).forEach((r) => {
      if (r.current) observer.observe(r.current);
    });

    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // FlowNode shares a layoutId with the rows in TierStack, so framer-motion
  // animates it into place with a spring-driven transform (a FLIP animation)
  // whenever this view mounts after coming back from the sandbox. That's a
  // transform, not a size change, so ResizeObserver never fires while it's
  // happening — the one-time measure() above only captures the card's
  // *starting* position (wherever it sat in the sandbox list), which is why
  // the arrows look stuck in the corner. Re-measure every frame for a short
  // window after mount so the edges track the cards as they animate in.
  const mountTimeRef = useRef<number | null>(null);
  useAnimationFrame((t) => {
    if (mountTimeRef.current === null) mountTimeRef.current = t;
    if (t - mountTimeRef.current < 700) {
      measure();
    }
  });

  function getAnchor(tier: Tier, side: "TOP" | "BOTTOM" | "LEFT" | "RIGHT") {
    const rect = nodeRects[tier];
    const container = containerRect;

    if (!rect || !container) return { x: 0, y: 0 };

    const x = rect.left - container.left;
    const y = rect.top - container.top;

    switch (side) {
      case "TOP":
        return { x: x + rect.width / 2, y };
      case "BOTTOM":
        return { x: x + rect.width / 2, y: y + rect.height };
      case "LEFT":
        return { x, y: y + rect.height / 2 };
      case "RIGHT":
        return { x: x + rect.width, y: y + rect.height / 2 };
    }
  }

  const processedEdges = useMemo(() => {
    if (!containerRect) return [];

    const required = ["clean_up", "maintenance", "growth"] as const;
    if (!required.every((t) => nodeRects[t])) return [];

    return EDGE_CONFIGS.map((edge, i) => {
      const start = getAnchor(edge.source.tier, edge.source.anchor);
      const end = getAnchor(edge.target.tier, edge.target.anchor);

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const pullback = edge.isLoop
        ? { x: end.x, y: end.y }
        : {
            x: end.x - (dx / dist) * 8,
            y: end.y - (dy / dist) * 8,
          };

      let d = "";
      let labelX = 0;
      let labelY = 0;

      if (edge.isLoop) {
        const flow = edge.flow ?? {
          strength: 0.4,
          biasX: 0,
          biasY: -0.6,
          tension: 0.8,
        };

        const dx = 1; // arbitrary direction reference
        const dy = 0;

        // perpendicular vector (for loop expansion)
        const nx = 0;
        const ny = 1;

        const loopSize = 40 + flow.strength * 40;
        const spread = 20 + 1 * 20;

        const cp1 = {
          x: start.x - spread + nx * loopSize,
          y: start.y - loopSize + ny * loopSize * 1,
        };

        const cp2 = {
          x: start.x + spread - nx * loopSize,
          y: start.y - loopSize + ny * loopSize * 1,
        };

        d = `M ${start.x} ${start.y}
       C ${cp1.x} ${cp1.y},
         ${cp2.x} ${cp2.y},
         ${end.x} ${end.y}`;

        labelX =
          0.125 * start.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * end.x;

        labelY =
          0.125 * start.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * end.y;
      } else {
        const pdx = pullback.x - start.x;
        const pdy = pullback.y - start.y;

        const midX = start.x + pdx * 0.5;
        const midY = start.y + pdy * 0.5;

        const flow = edge.flow ?? {
          strength: 0.25,
          biasX: 0,
          biasY: 0,
          tension: 0.5,
        };

        // perpendicular vector (normalized-ish)
        const len = Math.max(Math.sqrt(pdx * pdx + pdy * pdy), 0.001);

        const nx = -pdy / len;
        const ny = pdx / len;

        // directional bias vector
        const bx = flow.biasX ?? 0;
        const by = flow.biasY ?? 0;

        // how much curve bends perpendicular vs directional
        const perpendicularPush = flow.strength * 40;
        const directionalPush = flow.tension * 25;

        // final control point
        const cx = midX + nx * perpendicularPush + dx * bx * directionalPush;

        const cy = midY + ny * perpendicularPush + dy * by * directionalPush;

        d = `M ${start.x} ${start.y} Q ${cx} ${cy}, ${pullback.x} ${pullback.y}`;

        labelX = 0.25 * start.x + 0.5 * cx + 0.25 * pullback.x;
        labelY = 0.25 * start.y + 0.5 * cy + 0.25 * pullback.y;
      }

      return {
        ...edge,
        d,
        labelPos: {
          left: labelX + (edge.labelOffset?.x || 0),
          top: labelY + (edge.labelOffset?.y || 0),
        },
      };
    });
  }, [nodeRects, containerRect]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="relative w-full h-full flex flex-col items-center justify-center px-6 -translate-y-20"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-3xl aspect-16/10"
      >
        {/* SVG LAYER */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          <defs>
            {(["rose", "amber", "emerald"] as const).map((c) => (
              <marker
                key={c}
                id={`arrow-${c}`}
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="9"
                markerHeight="9"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" className={FILL_CLASS[c]} />
              </marker>
            ))}
          </defs>

          {processedEdges.map((edge, i) => (
            <motion.path
              key={edge.id}
              d={edge.d}
              fill="none"
              strokeWidth="3"
              className={STROKE_CLASS[edge.color]}
              markerEnd={`url(#arrow-${edge.color})`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.2 + i * 0.08,
                ease: "easeOut",
              }}
            />
          ))}
        </svg>

        {/* LABELS */}
        {processedEdges.map((edge) => (
          <div
            key={`${edge.id}-label`}
            className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
            style={{
              left: edge.labelPos.left,
              top: edge.labelPos.top,
            }}
          >
            <span
              className={`font-mono-ui text-[9px] sm:text-[11px] md:text-[14px] whitespace-nowrap rounded-full border border-black/10 bg-white/60 px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-2.5 md:py-1 shadow-[0_0_20px_rgba(255,255,255,0.18)] backdrop-blur-lg transition-all duration-150 cursor-default ${LABEL_CLASS[edge.color]} dark:border-white/10 dark:bg-white/5`}
            >
              {edge.label}
            </span>
            <div
              className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-9999 w-max max-w-50 rounded-lg border px-3 py-2 text-lg leading-snug bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg shadow-lg text-slate-600 dark:text-slate-300 opacity-0 scale-95 group-hover:opacity-100 duration-150 ${TOOLTIP_BORDER[edge.color]}`}
            >
              {EDGE_TOOLTIP[edge.id]}
            </div>
          </div>
        ))}

        {/* NODES */}
        <FlowNode
          tier="growth"
          glow="growth"
          ref={nodeRefs.growth}
          onSelect={onSelectTier}
        />
        <FlowNode
          tier="maintenance"
          glow="maintenance"
          ref={nodeRefs.maintenance}
          onSelect={onSelectTier}
        />
        <FlowNode
          tier="clean_up"
          glow="clean_up"
          ref={nodeRefs.clean_up}
          onSelect={onSelectTier}
        />
      </div>
    </motion.div>
  );
}

import { forwardRef } from "react";

const FlowNode = forwardRef<
  HTMLDivElement,
  {
    tier: Tier;
    glow: "clean_up" | "maintenance" | "growth";
    onSelect: (tier: Tier) => void;
  }
>(({ tier, glow, onSelect }, ref) => {
  return (
    <GlassCard
      ref={ref}
      layoutId={`tier-card-${tier}`}
      glow={glow}
      tooltip={TIER_SUMMARY[tier]}
      className="absolute w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 flex items-center justify-center text-center cursor-pointer p-2 sm:p-3 -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${NODE_POS[tier].left}%`,
        top: `${NODE_POS[tier].top}%`,
      }}
      onClick={() => onSelect(tier)}
      whileTap={{ scale: 0.96 }}
    >
      <h3 className="font-display text-xs sm:text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100">
        {TIER_STATE_LABEL[tier]}
      </h3>
    </GlassCard>
  );
});

FlowNode.displayName = "FlowNode";
