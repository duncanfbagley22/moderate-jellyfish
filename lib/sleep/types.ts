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

export type SettingsRow = {
  id: string;
  target_sleep: string;
  target_wake: string;
  thresh_good: number;
  thresh_ok: number;
};

export type UiState = {
  dark: boolean;
  calOffset: number;
};
