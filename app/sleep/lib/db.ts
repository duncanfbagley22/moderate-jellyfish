import { createClient } from "@/lib/supabase/client";
import type { SleepConfig, SleepEntry, SettingsPeriod, SettingsPeriodRow, CommentsMap } from "./types";
import { trimTime } from "./utils";

function rowToEntry(row: { date: string; sleep_time: string; wake_time: string }): SleepEntry {
  return { date: row.date, sleep: trimTime(row.sleep_time), wake: trimTime(row.wake_time) };
}

function rowToPeriod(row: SettingsPeriodRow): SettingsPeriod {
  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    targetSleep: trimTime(row.target_sleep),
    targetWake: trimTime(row.target_wake),
    threshGood: row.thresh_good,
    threshOk: row.thresh_ok,
  };
}

export async function loadSleepData(): Promise<{
  entries: SleepEntry[];
  periods: SettingsPeriod[];
  comments: CommentsMap;
}> {
  const supabase = createClient();
  const [logsResult, periodsResult, commentsResult] = await Promise.all([
    supabase.from("sleep_logs").select("date, sleep_time, wake_time").order("date", { ascending: true }),
    supabase.from("settings_periods").select("*").order("start_date", { ascending: true }),
    supabase.from("sleep_comments").select("date, comment"),
  ]);

  if (logsResult.error) throw logsResult.error;
  if (periodsResult.error) throw periodsResult.error;
  if (commentsResult.error) throw commentsResult.error;

  const comments: CommentsMap = {};
  for (const row of commentsResult.data ?? []) comments[row.date] = row.comment;

  return {
    entries: (logsResult.data ?? []).map(rowToEntry),
    periods: (periodsResult.data ?? []).map(rowToPeriod),
    comments,
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

export async function savePeriod(
  period: (SleepConfig & { startDate: string; endDate: string | null; id?: string }),
): Promise<SettingsPeriod> {
  const supabase = createClient();
  const payload = {
    start_date: period.startDate,
    end_date: period.endDate,
    target_sleep: period.targetSleep,
    target_wake: period.targetWake,
    thresh_good: period.threshGood,
    thresh_ok: period.threshOk,
  };

  if (period.id) {
    const { data, error } = await supabase
      .from("settings_periods").update(payload).eq("id", period.id).select("*").single();
    if (error) throw error;
    return rowToPeriod(data);
  }

  const { data, error } = await supabase
    .from("settings_periods").insert(payload).select("*").single();
  if (error) throw error;
  return rowToPeriod(data);
}

export async function closePeriodEndDate(id: string, endDate: string): Promise<SettingsPeriod> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("settings_periods").update({ end_date: endDate }).eq("id", id).select("*").single();
  if (error) throw error;
  return rowToPeriod(data);
}

export async function deletePeriod(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("settings_periods").delete().eq("id", id);
  if (error) throw error;
}