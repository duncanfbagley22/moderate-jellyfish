"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  clearSleepLogs,
  loadSleepData,
  saveSettings as persistSettings,
  upsertSleepLog,
} from "@/lib/sleep/db";
import type { SleepConfig, SleepEntry } from "@/lib/sleep/types";
import { loadUiState, saveUiState } from "@/lib/sleep/ui-state";
import {
  avgDur,
  calcDur,
  calcOffset,
  fmt12,
  GRADES,
  heatLabel,
  heatStyle,
  maxCalOffset,
  offsetCard,
  score7,
  streakCount,
  todayDate,
  toGrade,
} from "@/lib/sleep/utils";
import "@/app/sleep-tracker.css";

type Tab = "log" | "dash" | "history" | "settings";

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
    </div>
  );
}

export default function SleepTracker() {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [cfg, setCfg] = useState<SleepConfig>({
    targetSleep: "23:00",
    targetWake: "07:00",
    threshGood: 15,
    threshOk: 30,
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [calOffset, setCalOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("log");
  const [inpSleep, setInpSleep] = useState("23:00");
  const [inpWake, setInpWake] = useState("07:00");
  const [setSleep, setSetSleep] = useState("23:00");
  const [setWake, setSetWake] = useState("07:00");
  const [setGood, setSetGood] = useState("15");
  const [setOk, setSetOk] = useState("30");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const data = await loadSleepData();
    setEntries(data.entries);
    setCfg(data.config);
    setSettingsId(data.settingsId);
    setSetSleep(data.config.targetSleep);
    setSetWake(data.config.targetWake);
    setSetGood(String(data.config.threshGood));
    setSetOk(String(data.config.threshOk));
  }, []);

  useEffect(() => {
    const ui = loadUiState();
    setDark(ui.dark);
    setCalOffset(ui.calOffset);

    refreshData()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => setLoading(false));
  }, [refreshData]);

  useEffect(() => {
    document.documentElement.setAttribute("data-dark", dark ? "true" : "false");
    saveUiState({ dark, calOffset });
  }, [dark, calOffset]);

  const today = todayDate();
  const todayEntry = entries.find((entry) => entry.date === today);

  const sleepPreview = inpSleep && inpWake ? offsetCard(calcOffset(inpSleep, cfg.targetSleep)) : null;
  const wakePreview = inpSleep && inpWake ? offsetCard(calcOffset(inpWake, cfg.targetWake)) : null;
  const durPreview = inpSleep && inpWake ? calcDur(inpSleep, inpWake) : null;

  const pct = score7(entries, cfg);
  const grade = toGrade(pct);
  const gradeInfo = grade ? GRADES[grade] : null;
  const streak = streakCount(entries, cfg);
  const averageDuration = avgDur(entries);
  const maxOffset = maxCalOffset(entries);

  const weekDays = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now);
      day.setDate(day.getDate() - (6 - index));
      const date = day.toISOString().split("T")[0];
      const entry = entries.find((item) => item.date === date);
      return { day, date, entry };
    });
  }, [entries]);

  const calendar = useMemo(() => {
    const now = new Date();
    const displayDate = new Date(
      now.getFullYear(),
      now.getMonth() - calOffset,
      1,
    );
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

  async function handleLogEntry() {
    if (!inpSleep || !inpWake) return;

    setBusy(true);
    setError(null);
    try {
      const entry = await upsertSleepLog(today, inpSleep, inpWake);
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

  async function handleSaveSettings() {
    const nextCfg: SleepConfig = {
      targetSleep: setSleep,
      targetWake: setWake,
      threshGood: parseInt(setGood, 10) || 15,
      threshOk: parseInt(setOk, 10) || 30,
    };

    setBusy(true);
    setError(null);
    try {
      const result = await persistSettings(settingsId, nextCfg);
      setCfg(result.config);
      setSettingsId(result.settingsId);
      showToast("Saved!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
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

  if (loading) {
    return (
      <div className="sleep-tracker-page">
        <div className="sleep-tracker-loading" aria-live="polite" aria-busy="true">
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
            <img
              src="/moderate_jellyfish.png"
              alt=""
              className="loading-logo"
              aria-hidden="true"
            />
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
          <div className="wordmark">
            sleepy<div className="wordmark-dot" />
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
              onClick={() => setActiveTab(tab)}
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

        <div className={`page ${activeTab === "log" ? "on" : ""}`}>
          <div className="card">
            <div className="card-label">Tonight&apos;s log</div>
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
              disabled={busy}
            >
              Log sleep
            </button>
            {todayEntry ? (
              <div className="today-row">
                <div
                  className="today-pip"
                  style={{ background: heatStyle(todayEntry, cfg).bg }}
                />
                <div>
                  <div className="today-text">
                    Today: {heatLabel(todayEntry, cfg)}
                  </div>
                  <div className="today-sub">
                    {fmt12(todayEntry.sleep)} — {fmt12(todayEntry.wake)} ·{" "}
                    {Math.floor(calcDur(todayEntry.sleep, todayEntry.wake) / 60)}h{" "}
                    {calcDur(todayEntry.sleep, todayEntry.wake) % 60}m
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="toast-wrap">
            <div className={`toast-pill ${toast ? "show" : ""}`}>{toast ?? ""}</div>
          </div>
        </div>

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
                  <div className="grade-sub">
                    Log a few nights to see your grade
                  </div>
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
                const style = entry
                  ? heatStyle(entry, cfg)
                  : { bg: "var(--heat-0)", num: "var(--heat-0-num)" };
                const tip = entry
                  ? `${heatLabel(entry, cfg)} · ${fmt12(entry.sleep)}–${fmt12(entry.wake)}`
                  : "No entry";

                return (
                  <div key={date} className="week-col">
                    <div className="week-day-lbl">{DOW_SHORT[day.getDay()]}</div>
                    <div className="heat-cell" style={{ background: style.bg }}>
                      <div className="heat-cell-num" style={{ color: style.num }}>
                        {day.getDate()}
                      </div>
                      <div className="tt">{tip}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Legend />
          </div>
        </div>

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

                if (cell.entry) {
                  const style = heatStyle(cell.entry, cfg);
                  const duration = calcDur(cell.entry.sleep, cell.entry.wake);
                  const tip = `${heatLabel(cell.entry, cfg)} · ${fmt12(cell.entry.sleep)}–${fmt12(cell.entry.wake)} · ${Math.floor(duration / 60)}h ${duration % 60}m`;

                  return (
                    <div
                      key={cell.date}
                      className="cal-day logged"
                      style={{ background: style.bg }}
                    >
                      <div className="tt">{tip}</div>
                      <div className="cal-day-num" style={{ color: style.num }}>
                        {cell.day}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={cell.date}
                    className="cal-day"
                    style={{ background: "var(--heat-0)" }}
                  >
                    <div className="cal-day-num" style={{ color: "var(--heat-0-num)" }}>
                      {cell.day}
                    </div>
                  </div>
                );
              })}
            </div>
            <HistoryLegend />
          </div>
        </div>

        <div className={`page ${activeTab === "settings" ? "on" : ""}`}>
          <div className="card">
            <div className="card-label">Targets</div>
            <div className="setting-row">
              <div>
                <div className="setting-key">Target bedtime</div>
                <div className="setting-hint">When you want to be asleep</div>
              </div>
              <input
                type="time"
                className="set-inp"
                value={setSleep}
                onChange={(event) => setSetSleep(event.target.value)}
              />
            </div>
            <div className="setting-row">
              <div>
                <div className="setting-key">Target wake time</div>
                <div className="setting-hint">When you want to wake up</div>
              </div>
              <input
                type="time"
                className="set-inp"
                value={setWake}
                onChange={(event) => setSetWake(event.target.value)}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-label">Tolerance bands</div>
            <div className="setting-row">
              <div>
                <div className="setting-key">On target</div>
                <div className="setting-hint">Within this many minutes</div>
              </div>
              <input
                type="number"
                className="set-inp"
                value={setGood}
                min={5}
                max={60}
                step={5}
                onChange={(event) => setSetGood(event.target.value)}
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
                value={setOk}
                min={10}
                max={90}
                step={5}
                onChange={(event) => setSetOk(event.target.value)}
              />
            </div>
          </div>
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
          <button
            type="button"
            className="btn-save"
            onClick={handleSaveSettings}
            disabled={busy}
          >
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
