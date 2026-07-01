import { createClient } from "@/lib/supabase/client";
import type { SleepConfig, SleepEntry, SettingsRow, CommentsMap } from "./types";
import { trimTime } from "./utils";

const DEFAULT_CONFIG: SleepConfig = {
  targetSleep: "23:00",
  targetWake: "07:00",
  threshGood: 15,
  threshOk: 30,
};

// ✅ Removed comment — lives in sleep_comments now
function rowToEntry(row: {
  date: string;
  sleep_time: string;
  wake_time: string;
}): SleepEntry {
  return {
    date: row.date,
    sleep: trimTime(row.sleep_time),
    wake: trimTime(row.wake_time),
  };
}

function rowToConfig(row: SettingsRow): SleepConfig {
  return {
    targetSleep: trimTime(row.target_sleep),
    targetWake: trimTime(row.target_wake),
    threshGood: row.thresh_good,
    threshOk: row.thresh_ok,
  };
}

export async function loadSleepData(): Promise<{
  entries: SleepEntry[];
  config: SleepConfig;
  settingsId: string | null;
  comments: CommentsMap;
}> {
  const supabase = createClient();

  // ✅ All 3 results captured
  const [logsResult, settingsResult, commentsResult] = await Promise.all([
    supabase
      .from("sleep_logs")
      .select("date, sleep_time, wake_time")
      .order("date", { ascending: true }),
    supabase.from("settings").select("*").limit(1).maybeSingle(),
    supabase.from("sleep_comments").select("date, comment"),
  ]);

  if (logsResult.error) throw logsResult.error;
  if (settingsResult.error) throw settingsResult.error;
  if (commentsResult.error) throw commentsResult.error;

  const comments: CommentsMap = {};
  for (const row of commentsResult.data ?? []) {
    comments[row.date] = row.comment;
  }

  return {
    entries: (logsResult.data ?? []).map(rowToEntry),
    config: settingsResult.data
      ? rowToConfig(settingsResult.data)
      : DEFAULT_CONFIG,
    settingsId: settingsResult.data?.id ?? null,
    comments, // ✅ Was missing from return
  };
}

export async function upsertSleepLog(
  date: string,
  sleep: string,
  wake: string,
): Promise<SleepEntry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sleep_logs")
    .upsert(
      { date, sleep_time: sleep, wake_time: wake },
      { onConflict: "date" },
    )
    .select("date, sleep_time, wake_time") // ✅ Removed comment
    .single();

  if (error) throw error;
  return rowToEntry(data);
}

export async function saveSettings(
  settingsId: string | null,
  config: SleepConfig,
): Promise<{ config: SleepConfig; settingsId: string }> {
  const supabase = createClient();
  const payload = {
    target_sleep: config.targetSleep,
    target_wake: config.targetWake,
    thresh_good: config.threshGood,
    thresh_ok: config.threshOk,
  };

  if (settingsId) {
    const { data, error } = await supabase
      .from("settings")
      .update(payload)
      .eq("id", settingsId)
      .select("*")
      .single();

    if (error) throw error;
    return { config: rowToConfig(data), settingsId: data.id };
  }

  const { data, error } = await supabase
    .from("settings")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return { config: rowToConfig(data), settingsId: data.id };
}

export async function clearSleepLogs() {
  const supabase = createClient();
  const { error } = await supabase
    .from("sleep_logs")
    .delete()
    .gte("date", "1900-01-01");

  if (error) throw error;
}

export async function saveComment(
  date: string,
  comment: string,
): Promise<void> {
  const supabase = createClient();
  const trimmed = comment.trim();

  if (!trimmed) {
    const { error } = await supabase
      .from("sleep_comments")
      .delete()
      .eq("date", date);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("sleep_comments")
      .upsert({ date, comment: trimmed }, { onConflict: "date" });
    if (error) throw error;
  }
}