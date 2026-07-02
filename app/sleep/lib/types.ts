export type SleepEntry = {
  date: string;
  sleep: string;
  wake: string;
};

export type SleepConfig = {
  targetSleep: string;
  targetWake: string;
  threshGood: number;
  threshOk: number;
};

export type SleepLogRow = {
  id: string;
  date: string;
  sleep_time: string;
  wake_time: string;
};

export type SettingsPeriodRow = {
  id: string;
  start_date: string;
  end_date: string | null;
  target_sleep: string;
  target_wake: string;
  thresh_good: number;
  thresh_ok: number;
};

export type SettingsPeriod = SleepConfig & {
  id: string;
  startDate: string;      // "YYYY-MM-DD"
  endDate: string | null; // null = open-ended / current
};

export type UiState = {
  dark: boolean;
  calOffset: number;
};

export type CommentsMap = Record<string, string>;
