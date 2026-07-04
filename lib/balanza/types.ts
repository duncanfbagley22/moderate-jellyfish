export type Tier = 'clean_up' | 'maintenance' | 'growth';

export type Topic = 'work' | 'exercise' | 'spiritual' | 'social' | 'financial' | 'creative' | 'home' | 'other';
export type Timeframe = 'short_term' | 'long_term';
export type Intent = 'brainstorm' | 'blueprint';
export type Platform = 'physical' | 'code' | 'spreadsheet';
export type ModelEngine = 'gemini-flash' | 'gemini-flash-lite';

export interface PromptParams {
  tier: Tier;
  topic: Topic;
  timeframe: Timeframe;
  intent: Intent;
  platform: Platform;
  friction: number; // 0-100 slider
  model: ModelEngine;
}

export interface SavedBlueprint {
  id: string;
  session_id: string;
  tier: Tier;
  metadata: PromptParams;
  payload_md: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// The force acting on a project (sandbox config context — e.g. "brainstorming
// under the Clean Up force").
export const TIER_FORCE_LABEL: Record<Tier, string> = {
  clean_up: 'Clean Up',
  maintenance: 'Maintenance',
  growth: 'Growth',
};

// The state a node represents — matches the reference diagram's node labels.
export const TIER_STATE_LABEL: Record<Tier, string> = {
  clean_up: 'Deficit',
  maintenance: 'Status Quo',
  growth: 'Growth',
};

// One-line summary shown under the state label in the left-panel stack.
export const TIER_SUMMARY: Record<Tier, string> = {
  clean_up: "What you're lacking",
  maintenance: 'Where you are',
  growth: 'Where you want to be',
};