"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  clearSleepLogs,
  closePeriodEndDate,
  deletePeriod,
  loadSleepData,
  saveComment,
  savePeriod,
  upsertSleepLog,
} from "@/app/sleep/lib/db";
import type {
  CommentsMap,
  SettingsPeriod,
  SleepEntry,
} from "@/app/sleep/lib/types";
import { loadUiState, saveUiState } from "@/app/sleep/lib/ui-state";
import {
  avgDur,
  calcDur,
  calcOffset,
  configForDate,
  dateAdd,
  defaultLogDate,
  fmt12,
  GRADES,
  heatLabel,
  heatStyle,
  isPeriodBoundary,
  localDateString,
  maxCalOffset,
  offsetCard,
  periodLabel,
  periodsOverlap,
  score7,
  streakCount,
  todayDate,
  toGrade,
} from "@/app/sleep/lib/utils";
import BackHome from "@/components/BackHome";
import "@/app/sleep/styles/sleep-tracker.css";

type Tab = "log" | "dash" | "history" | "settings";

type PeriodFormState = {
  id?: string;
  startDate: string;
  ongoing: boolean;
  endDate: string;
  sleep: string;
  wake: string;
  good: string;
  ok: string;
};

const TABS: Tab[] = ["log", "dash", "history", "settings"];
const DOW_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const CAL_DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function Legend() {
  return (
    <div className="legend-row">
      <div className="legend-item">
        <div className="legend-swatch" style={{ background: "var(--heat-on)" }} />
        On target
      </div>
      <div className="legend-item">
        <div className="legend-swatch" style={{ background: "var(--heat-close)" }} />
        Close
      </div>
      <div className="legend-item">
        <div className="legend-swatch" style={{ background: "var(--heat-off)" }} />
        Off
      </div>
      <div className="legend-item">
        <div className="legend-swatch" style={{ background: "var(--heat-miss)" }} />
        Miss
      </div>
      <div className="legend-item">
        <div className="legend-swatch" style={{ background: "var(--heat-0)" }} />
        No data
      </div>
    </div>
  );
}

function HistoryLegend() {
  return (
    <div className="legend-row">
      <div className="legend-item">
        <div className="legend-swatch" style={{ background: "var(--heat-on)" }} />
        On target
      </div>
      <div className="legend-item">
        <div className="legend-swatch" style={{ background: "var(--heat-close)" }} />
        Close
      </div>
      <div className="legend-item">
        <div className="legend-swatch" style={{ background: "var(--heat-off)" }} />
        Off
      </div>
      <div className="legend-item">
        <div className="legend-swatch" style={{ background: "var(--heat-miss)" }} />
        Miss
      </div>
      <div className="legend-item">
        <div className="legend-swatch" style={{ background: "var(--heat-0)" }} />
        No data
      </div>
      <div className="legend-item">
        <div className="legend-swatch" style={{ background: "var(--yellow)" }} />
        Settings changed
      </div>
    </div>
  );
}

function emptyPeriodForm(): PeriodFormState {
  return {
    id: undefined,
    startDate: todayDate(),
    ongoing: true,
    endDate: "",
    sleep: "23:00",
    wake: "07:00",
    good: "15",
    ok: "30",
  };
}

export default function SleepTracker() {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [comments, setComments] = useState<CommentsMap>({});
  const [periods, setPeriods] = useState<SettingsPeriod[]>([]);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return loadUiState().dark;
  });
  const [calOffset, setCalOffset] = useState(() => {
    if (typeof window === "undefined") return 0;
    return loadUiState().calOffset;
  });
  const [activeTab, setActiveTab] = useState<Tab>("log");
  const [logDate, setLogDate] = useState(() => dateAdd(defaultLogDate(), 0));
  const logDateInvalid = logDate >= todayDate();
  const [inpSleep, setInpSleep] = useState("23:00");
  const [inpWake, setInpWake] = useState("07:00");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings period editor state
  const [periodForm, setPeriodForm] = useState<PeriodFormState | null>(null);
  const [periodFormError, setPeriodFormError] = useState<string | null>(null);
  const [periodBusy, setPeriodBusy] = useState(false);

  // Modal state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalComment, setModalComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  const headerDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadSleepData();
      setEntries(data.entries);
      setPeriods(data.periods);
      setComments(data.comments);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshData]);

  useEffect(() => {
    document.documentElement.setAttribute("data-dark", dark ? "true" : "false");
    saveUiState({ dark, calOffset });
  }, [dark, calOffset]);

  const handleTabSelect = useCallback((nextTab: Tab) => {
    setActiveTab(nextTab);
    if (nextTab === "log") {
      setLogDate(dateAdd(defaultLogDate(), -1));
    }
  }, []);

  const logDateEntry = entries.find((entry) => entry.date === logDate);
  const logDateLabel = useMemo(() => {
    const today = todayDate();
    if (logDate === today) return "Today";
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (logDate === localDateString(yesterday)) return "Yesterday";
    return new Date(`${logDate}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [logDate]);

  const logCfg = useMemo(() => configForDate(periods, logDate), [periods, logDate]);

  const sleepPreview =
    inpSleep && inpWake ? offsetCard(calcOffset(inpSleep, logCfg.targetSleep)) : null;
  const wakePreview =
    inpSleep && inpWake ? offsetCard(calcOffset(inpWake, logCfg.targetWake)) : null;
  const durPreview = inpSleep && inpWake ? calcDur(inpSleep, inpWake) : null;

  const pct = score7(entries, periods);
  const grade = toGrade(pct);
  const gradeInfo = grade ? GRADES[grade] : null;
  const streak = streakCount(entries, periods);
  const averageDuration = avgDur(entries);
  const maxOffset = maxCalOffset(entries);

  const sortedPeriods = useMemo(
    () => [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [periods],
  );

  const weekDays = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now);
      day.setDate(day.getDate() - (7 - index));
      const date = localDateString(day);
      const entry = entries.find((item) => item.date === date);
      return { day, date, entry };
    });
  }, [entries]);

  const calendar = useMemo(() => {
    const now = new Date();
    const displayDate = new Date(now.getFullYear(), now.getMonth() - calOffset, 1);
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<
      | { type: "blank" }
      | { type: "day"; day: number; date: string; entry?: SleepEntry }
    > = [];

    for (let i = 0; i < firstDow; i++) cells.push({ type: "blank" });
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({
        type: "day",
        day,
        date,
        entry: entries.find((item) => item.date === date),
      });
    }

    return {
      title: displayDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      cells,
    };
  }, [calOffset, entries]);

  // Modal handlers
  function openModal(date: string, _entry?: SleepEntry) {
    setSelectedDate(date);
    setModalComment(comments[date] ?? "");
  }

  async function handleSaveComment() {
    if (!selectedDate) return;
    setCommentBusy(true);
    try {
      await saveComment(selectedDate, modalComment);
      setComments((current) => {
        const next = { ...current };
        if (modalComment.trim()) {
          next[selectedDate] = modalComment.trim();
        } else {
          delete next[selectedDate];
        }
        return next;
      });
      showToast("Note saved!");
      setSelectedDate(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleLogEntry() {
    if (!inpSleep || !inpWake) return;

    setBusy(true);
    setError(null);
    try {
      const entry = await upsertSleepLog(logDate, inpSleep, inpWake);
      setEntries((current) => {
        const next = current.filter((item) => item.date !== entry.date);
        next.push(entry);
        next.sort((a, b) => a.date.localeCompare(b.date));
        return next;
      });
      showToast("Logged!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to log sleep");
    } finally {
      setBusy(false);
    }
  }

  async function handleClearAll() {
    if (!confirm("Clear all sleep entries?")) return;

    setBusy(true);
    setError(null);
    try {
      await clearSleepLogs();
      setEntries([]);
      setCalOffset(0);
      showToast("Cleared");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to clear entries");
    } finally {
      setBusy(false);
    }
  }

  function shiftCalendar(direction: number) {
    setCalOffset((current) =>
      Math.max(0, Math.min(maxOffset, current + direction)),
    );
  }

  // Settings period handlers
  function openNewPeriodForm() {
    setPeriodFormError(null);
    setPeriodForm(emptyPeriodForm());
  }

  function openEditPeriodForm(period: SettingsPeriod) {
    setPeriodFormError(null);
    setPeriodForm({
      id: period.id,
      startDate: period.startDate,
      ongoing: period.endDate === null,
      endDate: period.endDate ?? "",
      sleep: period.targetSleep,
      wake: period.targetWake,
      good: String(period.threshGood),
      ok: String(period.threshOk),
    });
  }

  function closePeriodForm() {
    setPeriodForm(null);
    setPeriodFormError(null);
  }

  async function handleSavePeriod() {
    if (!periodForm) return;
    const { id, startDate, ongoing, endDate, sleep, wake, good, ok } = periodForm;

    if (!startDate) {
      setPeriodFormError("Start date is required.");
      return;
    }
    if (!ongoing && !endDate) {
      setPeriodFormError("Pick an end date, or mark this period as ongoing.");
      return;
    }
    if (!ongoing && endDate < startDate) {
      setPeriodFormError("End date can't be before the start date.");
      return;
    }

    const candidate = { startDate, endDate: ongoing ? null : endDate };
    const others = periods.filter((p) => p.id !== id);
    const conflict = others.find((p) => periodsOverlap(candidate, p));
    if (conflict) {
      setPeriodFormError(`Overlaps with ${periodLabel(conflict)}. Adjust the dates.`);
      return;
    }

    setPeriodBusy(true);
    setPeriodFormError(null);
    try {
      // Only one period may be open-ended; close the previous one if this one takes over.
      if (ongoing) {
        const otherOpen = others.find((p) => p.endDate === null);
        if (otherOpen) {
          await closePeriodEndDate(otherOpen.id, dateAdd(startDate, -1));
        }
      }

      await savePeriod({
        id,
        startDate,
        endDate: ongoing ? null : endDate,
        targetSleep: sleep,
        targetWake: wake,
        threshGood: parseInt(good, 10) || 15,
        threshOk: parseInt(ok, 10) || 30,
      });

      await refreshData();
      showToast(id ? "Period updated!" : "Period added!");
      closePeriodForm();
    } catch (err: unknown) {
      setPeriodFormError(
        err instanceof Error ? err.message : "Failed to save period",
      );
    } finally {
      setPeriodBusy(false);
    }
  }

  async function handleDeletePeriod(period: SettingsPeriod) {
    if (periods.length <= 1) return;
    if (!confirm(`Delete the ${periodLabel(period)} settings period?`)) return;

    setPeriodBusy(true);
    setError(null);
    try {
      await deletePeriod(period.id);
      await refreshData();
      showToast("Period deleted");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete period");
    } finally {
      setPeriodBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="sleep-tracker-page">
        <div
          className="sleep-tracker-loading"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="loading-scene">
            <div className="loading-orbit" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="loading-dot-arm"
                  style={{ "--i": i } as CSSProperties}
                >
                  <span className="loading-dot" />
                </div>
              ))}
            </div>
            <div className="loading-logo" aria-hidden="true">
              <img
                src="/moderate-jellyfish.svg"
                alt=""
                className="loading-logo-image"
              />
            </div>
          </div>
          <p className="loading-label">loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sleep-tracker-page">
      <div className="sleep-tracker-root">
        <div className="topbar">
          <div className="topbar-left">
            <BackHome className="btn-back">
              <i className="ti ti-arrow-left" />
            </BackHome>
            <div className="wordmark">
              sleepy
              <div className="wordmark-dot" />
            </div>
          </div>

          <div className="topbar-right">
            <div className="hdr-date">{headerDate}</div>
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setDark((value) => !value)}
              aria-label="Toggle dark mode"
            >
              <i className={`ti ${dark ? "ti-sun" : "ti-moon"}`} />
            </button>
          </div>
        </div>

        {error ? <div className="sleep-tracker-status">{error}</div> : null}

        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab ${activeTab === tab ? "on" : ""}`}
              onClick={() => handleTabSelect(tab)}
            >
              {tab === "log"
                ? "Log"
                : tab === "dash"
                  ? "Dashboard"
                  : tab === "history"
                    ? "History"
                    : "Settings"}
            </button>
          ))}
        </div>

        {/* LOG TAB */}
        <div className={`page ${activeTab === "log" ? "on" : ""}`}>
          <div className="card">
            <div className="card-header">
              <div className="card-label">Last Night&apos;s Log</div>
              <input
                type="date"
                className="log-date-inp"
                value={logDate}
                onChange={(event) => setLogDate(event.target.value)}
                aria-label="Night (bed date)"
              />
            </div>
            <div className="field-block">
              <div className="field-head">Bedtime</div>
              <input
                type="time"
                value={inpSleep}
                onChange={(event) => setInpSleep(event.target.value)}
              />
            </div>
            <div className="field-block">
              <div className="field-head">Wake time</div>
              <input
                type="time"
                value={inpWake}
                onChange={(event) => setInpWake(event.target.value)}
              />
            </div>
            <div className="offset-cards">
              <div className="offset-card">
                <div className="offset-card-label">Bedtime</div>
                <div className="offset-card-value">
                  {sleepPreview ? (
                    <>
                      <i className={`ti ${sleepPreview.icon}`} style={{ color: sleepPreview.color }} />
                      <span style={{ color: sleepPreview.color }}>{sleepPreview.txt}</span>
                    </>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>—</span>
                  )}
                </div>
              </div>
              <div className="offset-card">
                <div className="offset-card-label">Wake</div>
                <div className="offset-card-value">
                  {wakePreview ? (
                    <>
                      <i className={`ti ${wakePreview.icon}`} style={{ color: wakePreview.color }} />
                      <span style={{ color: wakePreview.color }}>{wakePreview.txt}</span>
                    </>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>—</span>
                  )}
                </div>
              </div>
              <div className="offset-card">
                <div className="offset-card-label">Duration</div>
                <div className="offset-card-value">
                  {durPreview !== null ? (
                    <>
                      <i className="ti ti-moon" style={{ color: "var(--blue)" }} />
                      <span style={{ color: "var(--text)" }}>
                        {Math.floor(durPreview / 60)}h {durPreview % 60}m
                      </span>
                    </>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>—</span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-log"
              onClick={handleLogEntry}
              disabled={busy || logDateInvalid}
              title={logDateInvalid ? "You can't log today or a future date" : undefined}
            >
              Log sleep
            </button>
            {logDateEntry ? (
              <div className="today-row">
                <div
                  className="today-pip"
                  style={{ background: heatStyle(logDateEntry, logCfg).bg }}
                />
                <div>
                  <div className="today-text">
                    {logDateLabel}: {heatLabel(logDateEntry, logCfg)}
                  </div>
                  <div className="today-sub">
                    {fmt12(logDateEntry.sleep)} — {fmt12(logDateEntry.wake)} ·{" "}
                    {Math.floor(calcDur(logDateEntry.sleep, logDateEntry.wake) / 60)}h{" "}
                    {calcDur(logDateEntry.sleep, logDateEntry.wake) % 60}m
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="toast-wrap">
            <div className={`toast-pill ${toast ? "show" : ""}`}>{toast ?? ""}</div>
          </div>
        </div>

        {/* DASHBOARD TAB */}
        <div className={`page ${activeTab === "dash" ? "on" : ""}`}>
          <div className="card">
            {grade && gradeInfo ? (
              <div className="grade-hero">
                <div
                  className="grade-bubble"
                  style={{ background: gradeInfo.bg, color: gradeInfo.fg }}
                >
                  {grade}
                </div>
                <div>
                  <div className="grade-title" style={{ color: gradeInfo.fg }}>
                    {gradeInfo.title}
                  </div>
                  <div className="grade-sub">{gradeInfo.sub}</div>
                  <div className="grade-sub" style={{ marginTop: 3 }}>
                    7-day average
                  </div>
                </div>
              </div>
            ) : (
              <div className="grade-hero">
                <div
                  className="grade-bubble"
                  style={{ background: "var(--surface2)", color: "var(--muted)" }}
                >
                  —
                </div>
                <div>
                  <div className="grade-title">No data yet</div>
                  <div className="grade-sub">Log a few nights to see your grade</div>
                </div>
              </div>
            )}
          </div>

          <div className="stats-row">
            <div className="stat-tile">
              <div className="stat-num yellow">{streak > 0 ? streak : "—"}</div>
              <div className="stat-lbl">On-target streak</div>
            </div>
            <div className="stat-tile">
              <div className="stat-num">
                {averageDuration
                  ? `${Math.floor(averageDuration / 60)}h ${averageDuration % 60}m`
                  : "—"}
              </div>
              <div className="stat-lbl">Avg duration</div>
            </div>
            <div className="stat-tile">
              <div className="stat-num">{entries.length}</div>
              <div className="stat-lbl">Days logged</div>
            </div>
          </div>

          <div className="card">
            <div className="card-label">This week</div>
            <div className="week-strip">
              {weekDays.map(({ day, date, entry }) => {
                const dayCfg = configForDate(periods, date);
                const boundary = isPeriodBoundary(periods, date);
                const hasComment = Boolean(comments[date]);
                const style = entry
                  ? heatStyle(entry, dayCfg)
                  : { bg: "var(--heat-0)", num: "var(--heat-0-num)" };
                const tip = [
                  boundary ? "⚙️ Settings changed here" : "",
                  entry
                    ? `${heatLabel(entry, dayCfg)} · ${fmt12(entry.sleep)}–${fmt12(entry.wake)}`
                    : "No entry",
                  hasComment ? `💬 ${comments[date]}` : "",
                ]
                  .filter(Boolean)
                  .join("\n");

                return (
                  <div key={date} className="week-col">
                    <div className="week-day-lbl">{DOW_SHORT[day.getDay()]}</div>
                    <div
                      className={`heat-cell ${boundary ? "period-boundary-history" : ""}`}
                      style={{ background: style.bg, cursor: "pointer" }}
                      role="button"
                      tabIndex={0}
                      onClick={() => openModal(date)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openModal(date);
                        }
                      }}
                    >
                      {hasComment && <div className="cal-comment-ear" />}
                      <div className="heat-cell-num" style={{ color: style.num }}>
                        {day.getDate()}
                      </div>
                      <div className="tt" style={{ whiteSpace: "pre-line" }}>{tip}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Legend />
          </div>
        </div>

        {/* HISTORY TAB */}
        <div className={`page ${activeTab === "history" ? "on" : ""}`}>
          <div className="card">
            <div className="cal-nav">
              <button
                type="button"
                className={`cal-arrow ${calOffset >= maxOffset ? "disabled" : ""}`}
                onClick={() => shiftCalendar(1)}
                aria-label="Previous month"
              >
                <i className="ti ti-chevron-left" />
              </button>
              <div className="cal-month-title">{calendar.title}</div>
              <button
                type="button"
                className={`cal-arrow ${calOffset <= 0 ? "disabled" : ""}`}
                onClick={() => shiftCalendar(-1)}
                aria-label="Next month"
              >
                <i className="ti ti-chevron-right" />
              </button>
            </div>
            <div className="cal-grid">
              {CAL_DOW.map((label) => (
                <div key={label} className="cal-dow">
                  {label}
                </div>
              ))}
            </div>
            <div className="cal-grid" style={{ marginTop: 5 }}>
              {calendar.cells.map((cell, index) => {
                if (cell.type === "blank") {
                  return <div key={`blank-${index}`} />;
                }

                const hasComment = Boolean(comments[cell.date]);
                const dayCfg = configForDate(periods, cell.date);
                const boundary = isPeriodBoundary(periods, cell.date);

                if (cell.entry) {
                  const style = heatStyle(cell.entry, dayCfg);
                  const duration = calcDur(cell.entry.sleep, cell.entry.wake);
                  const tip = [
                    boundary ? "⚙️ Settings changed here" : "",
                    `${heatLabel(cell.entry, dayCfg)} · ${fmt12(cell.entry.sleep)}–${fmt12(cell.entry.wake)} · ${Math.floor(duration / 60)}h ${duration % 60}m`,
                    hasComment ? `💬 ${comments[cell.date]}` : "",
                  ]
                    .filter(Boolean)
                    .join("\n");

                  return (
                    <div key={cell.date} className="cal-day-wrap">
                      <div
                        className={`cal-day logged ${boundary ? "period-boundary-history" : ""}`}
                        style={{ background: style.bg, cursor: "pointer" }}
                        onClick={() => openModal(cell.date, cell.entry)}
                      >
                        {hasComment && <div className="cal-comment-ear" />}
                        <div className="tt" style={{ whiteSpace: "pre-line" }}>{tip}</div>
                        <div className="cal-day-num" style={{ color: style.num }}>
                          {cell.day}
                        </div>
                      </div>
                    </div>
                  );
                }

                const emptyTip = [
                  boundary ? "⚙️ Settings changed here" : "",
                  hasComment ? `💬 ${comments[cell.date]}` : "",
                ]
                  .filter(Boolean)
                  .join("\n");

                return (
                  <div key={cell.date} className="cal-day-wrap">
                    <div
                      className={`cal-day ${boundary ? "period-boundary-history" : ""}`}
                      style={{ background: "var(--heat-0)", cursor: "pointer" }}
                      onClick={() => openModal(cell.date, undefined)}
                    >
                      {hasComment && <div className="cal-comment-ear" />}
                      {emptyTip && (
                        <div className="tt" style={{ whiteSpace: "pre-line" }}>
                          {emptyTip}
                        </div>
                      )}
                      <div className="cal-day-num" style={{ color: "var(--heat-0-num)" }}>
                        {cell.day}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <HistoryLegend />
          </div>
        </div>

        {/* SETTINGS TAB */}
        <div className={`page ${activeTab === "settings" ? "on" : ""}`}>
          <div className="card">
            <div className="card-header">
              <div className="card-label">Settings periods</div>
              <button
                type="button"
                className="btn-add-period"
                onClick={openNewPeriodForm}
              >
                <i className="ti ti-plus" /> Add period
              </button>
            </div>

            {sortedPeriods.length === 0 ? (
              <div className="setting-hint">
                No settings yet — add your first period.
              </div>
            ) : (
              <div className="period-list">
                {sortedPeriods.map((period) => (
                  <div key={period.id} className="period-row">
                    <div>
                      <div className="period-row-range">
                        {periodLabel(period)}
                        {period.endDate === null && (
                          <span className="period-current-pill">Current</span>
                        )}
                      </div>
                      <div className="setting-hint">
                        {fmt12(period.targetSleep)} – {fmt12(period.targetWake)} · on
                        target ±{period.threshGood}m, close ±{period.threshOk}m
                      </div>
                    </div>
                    <div className="period-row-actions">
                      <button
                        type="button"
                        className="btn-period-edit"
                        onClick={() => openEditPeriodForm(period)}
                        aria-label="Edit period"
                      >
                        <i className="ti ti-pencil" />
                      </button>
                      <button
                        type="button"
                        className="btn-period-delete"
                        onClick={() => handleDeletePeriod(period)}
                        disabled={periods.length <= 1 || periodBusy}
                        aria-label="Delete period"
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {periodForm ? (
            <div className="card">
              <div className="card-label">
                {periodForm.id ? "Edit period" : "New period"}
              </div>

              <div className="setting-row">
                <div>
                  <div className="setting-key">Start date</div>
                  <div className="setting-hint">First night this applies to</div>
                </div>
                <input
                  type="date"
                  className="set-inp"
                  value={periodForm.startDate}
                  onChange={(event) =>
                    setPeriodForm((f) =>
                      f ? { ...f, startDate: event.target.value } : f,
                    )
                  }
                />
              </div>

              <div className="setting-row">
                <div>
                  <div className="setting-key">Ongoing</div>
                  <div className="setting-hint">
                    No end date — applies until you add a newer period
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={periodForm.ongoing}
                  onChange={(event) =>
                    setPeriodForm((f) =>
                      f ? { ...f, ongoing: event.target.checked } : f,
                    )
                  }
                />
              </div>

              {!periodForm.ongoing ? (
                <div className="setting-row">
                  <div>
                    <div className="setting-key">End date</div>
                    <div className="setting-hint">Last night this applies to</div>
                  </div>
                  <input
                    type="date"
                    className="set-inp"
                    value={periodForm.endDate}
                    onChange={(event) =>
                      setPeriodForm((f) =>
                        f ? { ...f, endDate: event.target.value } : f,
                      )
                    }
                  />
                </div>
              ) : null}

              <div className="setting-row">
                <div>
                  <div className="setting-key">Target bedtime</div>
                </div>
                <input
                  type="time"
                  className="set-inp"
                  value={periodForm.sleep}
                  onChange={(event) =>
                    setPeriodForm((f) =>
                      f ? { ...f, sleep: event.target.value } : f,
                    )
                  }
                />
              </div>

              <div className="setting-row">
                <div>
                  <div className="setting-key">Target wake time</div>
                </div>
                <input
                  type="time"
                  className="set-inp"
                  value={periodForm.wake}
                  onChange={(event) =>
                    setPeriodForm((f) =>
                      f ? { ...f, wake: event.target.value } : f,
                    )
                  }
                />
              </div>

              <div className="setting-row">
                <div>
                  <div className="setting-key">On target</div>
                  <div className="setting-hint">Within this many minutes</div>
                </div>
                <input
                  type="number"
                  className="set-inp"
                  min={5}
                  max={60}
                  step={5}
                  value={periodForm.good}
                  onChange={(event) =>
                    setPeriodForm((f) =>
                      f ? { ...f, good: event.target.value } : f,
                    )
                  }
                />
              </div>

              <div className="setting-row">
                <div>
                  <div className="setting-key">Close</div>
                  <div className="setting-hint">Within this many minutes</div>
                </div>
                <input
                  type="number"
                  className="set-inp"
                  min={10}
                  max={90}
                  step={5}
                  value={periodForm.ok}
                  onChange={(event) =>
                    setPeriodForm((f) => (f ? { ...f, ok: event.target.value } : f))
                  }
                />
              </div>

              {periodFormError ? (
                <div className="period-form-error">{periodFormError}</div>
              ) : null}

              <div className="modal-actions" style={{ marginTop: 4 }}>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={closePeriodForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-modal-save"
                  onClick={handleSavePeriod}
                  disabled={periodBusy}
                >
                  {periodBusy ? "Saving…" : "Save period"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="card">
            <div className="card-label">Data</div>
            <div className="setting-row">
              <div>
                <div className="setting-key">Clear all entries</div>
                <div className="setting-hint">Cannot be undone</div>
              </div>
              <button
                type="button"
                className="btn-clear"
                onClick={handleClearAll}
                disabled={busy}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* COMMENT MODAL */}
        {selectedDate &&
          (() => {
            const entry = entries.find((e) => e.date === selectedDate);
            const modalCfg = configForDate(periods, selectedDate);
            const duration = entry ? calcDur(entry.sleep, entry.wake) : null;
            const style = entry ? heatStyle(entry, modalCfg) : null;
            const label = entry ? heatLabel(entry, modalCfg) : null;
            const displayDate = new Date(
              `${selectedDate}T12:00:00`,
            ).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            });

            return (
              <div
                className="modal-backdrop"
                onClick={() => setSelectedDate(null)}
              >
                <div
                  className="modal-card"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <div className="modal-title">{displayDate}</div>
                    <button
                      type="button"
                      className="modal-close"
                      onClick={() => setSelectedDate(null)}
                      aria-label="Close"
                    >
                      <i className="ti ti-x" />
                    </button>
                  </div>

                  {entry && style ? (
                    <>
                      <div className="modal-stat-row">
                        <div className="modal-stat">
                          <div className="modal-stat-label">Status</div>
                          <div
                            className="modal-stat-value"
                            style={{ color: style.bg }}
                          >
                            {label}
                          </div>
                        </div>
                        <div className="modal-stat">
                          <div className="modal-stat-label">Bedtime</div>
                          <div className="modal-stat-value">
                            {fmt12(entry.sleep)}
                          </div>
                        </div>
                        <div className="modal-stat">
                          <div className="modal-stat-label">Wake</div>
                          <div className="modal-stat-value">
                            {fmt12(entry.wake)}
                          </div>
                        </div>
                      </div>
                      {duration !== null && (
                        <div
                          className="modal-stat"
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            className="modal-stat-label"
                            style={{ margin: 0 }}
                          >
                            Duration
                          </div>
                          <div className="modal-stat-value">
                            {Math.floor(duration / 60)}h {duration % 60}m
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.875rem",
                      }}
                    >
                      No sleep logged for this day.
                    </div>
                  )}

                  <div>
                    <div className="modal-comment-label">Note</div>
                    <textarea
                      className="modal-comment-textarea"
                      placeholder="Add a note for this day…"
                      value={modalComment}
                      onChange={(e) => setModalComment(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-modal-cancel"
                      onClick={() => setSelectedDate(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-modal-save"
                      onClick={handleSaveComment}
                      disabled={commentBusy}
                    >
                      {commentBusy ? "Saving…" : "Save note"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}