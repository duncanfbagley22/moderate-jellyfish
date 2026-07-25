export type Platform = "face cards" | "pen & paper";
export type PlatformFilter = Platform | "either";

// Centralized so this is the one file to touch when platform categories
// change — FilterForm, GameCard, and AddGameForm all read from here rather
// than hardcoding values/labels themselves.
export const PLATFORM_VALUES: Platform[] = ["face cards", "pen & paper"];

export const PLATFORM_LABELS: Record<Platform, string> = {
  "face cards": "Face Cards",
  "pen & paper": "Pen & Paper",
};

export interface Game {
  id: string;
  name: string;
  min_players: number;
  max_players: number;
  time_estimate_mins: number;
  platform: Platform[];
  rules_short: string;
  rules_long: string;
}

export interface GameFilters {
  // How many people you actually have — a single headcount, not a range.
  // A game matches when this falls within that game's own
  // [min_players, max_players] range.
  players: number;
  timeAvailableMins: number;
  platform: PlatformFilter;
}
