import type { UiState } from "./types";

const UI_KEY = "sleepy_v5_ui";

const DEFAULT_UI: UiState = { dark: false, calOffset: 0 };

export function loadUiState(): UiState {
  if (typeof window === "undefined") return DEFAULT_UI;

  try {
    const raw = localStorage.getItem(UI_KEY);
    if (!raw) return DEFAULT_UI;
    const parsed = JSON.parse(raw) as Partial<UiState>;
    return {
      dark: Boolean(parsed.dark),
      calOffset: Number.isFinite(parsed.calOffset) ? Number(parsed.calOffset) : 0,
    };
  } catch {
    return DEFAULT_UI;
  }
}

export function saveUiState(state: UiState) {
  localStorage.setItem(UI_KEY, JSON.stringify(state));
}
