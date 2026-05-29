import type { SleepConfig, SleepEntry } from "./types";

export function trimTime(value: string) {
  return value.slice(0, 5);
}

export function toMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function calcOffset(actual: string, target: string) {
  let d = toMins(actual) - toMins(target);
  if (d > 720) d -= 1440;
  if (d < -720) d += 1440;
  return d;
}

export function calcDur(s: string, w: string) {
  let d = toMins(w) - toMins(s);
  if (d < 0) d += 1440;
  return d;
}

export function worstOff(entry: SleepEntry, cfg: SleepConfig) {
  return Math.max(
    Math.abs(calcOffset(entry.sleep, cfg.targetSleep)),
    Math.abs(calcOffset(entry.wake, cfg.targetWake)),
  );
}

export function heatStyle(entry: SleepEntry, cfg: SleepConfig) {
  const w = worstOff(entry, cfg);
  if (w <= cfg.threshGood) {
    return { bg: "var(--heat-on)", num: "var(--heat-on-num)" };
  }
  if (w <= cfg.threshOk) {
    return { bg: "var(--heat-close)", num: "var(--heat-close-num)" };
  }
  if (w <= cfg.threshOk * 2) {
    return { bg: "var(--heat-off)", num: "var(--heat-off-num)" };
  }
  return { bg: "var(--heat-miss)", num: "var(--heat-miss-num)" };
}

export function heatLabel(entry: SleepEntry, cfg: SleepConfig) {
  const w = worstOff(entry, cfg);
  if (w <= cfg.threshGood) return "On target";
  if (w <= cfg.threshOk) return "Close";
  if (w <= cfg.threshOk * 2) return "Off";
  return "Miss";
}

export function fmt12(t: string) {
  const m = ((toMins(t) % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${hh >= 12 ? "pm" : "am"}`;
}

export function score7(entries: SleepEntry[], cfg: SleepConfig) {
  const last7 = entries.slice(-7);
  if (!last7.length) return null;

  let pts = 0;
  last7.forEach((entry) => {
    const w = worstOff(entry, cfg);
    if (w <= cfg.threshGood) pts += 4;
    else if (w <= cfg.threshOk) pts += 2;
    else if (w <= cfg.threshOk * 2) pts += 1;
  });

  return pts / (last7.length * 4);
}

export function toGrade(pct: number | null) {
  if (pct === null) return null;
  if (pct >= 0.88) return "A";
  if (pct >= 0.7) return "B";
  if (pct >= 0.5) return "C";
  if (pct >= 0.3) return "D";
  return "F";
}

export const GRADES = {
  A: {
    title: "Excellent",
    sub: "Nailing your targets consistently",
    bg: "var(--grade-a-bg)",
    fg: "var(--grade-a)",
  },
  B: {
    title: "Good",
    sub: "Mostly on track this week",
    bg: "var(--grade-b-bg)",
    fg: "var(--grade-b)",
  },
  C: {
    title: "Getting there",
    sub: "Some room to tighten up",
    bg: "var(--grade-c-bg)",
    fg: "var(--grade-c)",
  },
  D: {
    title: "Needs work",
    sub: "Consistency is drifting",
    bg: "var(--grade-d-bg)",
    fg: "var(--grade-d)",
  },
  F: {
    title: "Rough week",
    sub: "Worth revisiting your targets",
    bg: "var(--grade-f-bg)",
    fg: "var(--grade-f)",
  },
} as const;

export function streakCount(entries: SleepEntry[], cfg: SleepConfig) {
  let streak = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (worstOff(entries[i], cfg) <= cfg.threshGood) streak++;
    else break;
  }
  return streak;
}

export function avgDur(entries: SleepEntry[]) {
  if (!entries.length) return null;
  const recent = entries.slice(-7);
  return Math.round(
    recent.reduce((acc, entry) => acc + calcDur(entry.sleep, entry.wake), 0) /
      recent.length,
  );
}

export function todayDate() {
  return new Date().toISOString().split("T")[0];
}

export function maxCalOffset(entries: SleepEntry[]) {
  if (!entries.length) return 0;
  const oldest = entries[0].date;
  const now = new Date();
  const oy = parseInt(oldest.slice(0, 4), 10);
  const om = parseInt(oldest.slice(5, 7), 10) - 1;
  return (now.getFullYear() - oy) * 12 + (now.getMonth() - om);
}

export function offsetCard(offsetMins: number) {
  const abs = Math.abs(Math.round(offsetMins));
  if (abs <= 5) {
    return { icon: "ti-check", txt: "On time", color: "var(--grade-a)" };
  }
  if (offsetMins > 0) {
    return { icon: "ti-arrow-up", txt: `${abs}m late`, color: "var(--heat-miss)" };
  }
  return { icon: "ti-arrow-down", txt: `${abs}m early`, color: "var(--blue)" };
}
