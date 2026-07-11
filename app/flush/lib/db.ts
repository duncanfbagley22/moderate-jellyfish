import { createClient } from "@/lib/supabase/client";
import type { Game, GameFilters } from "./types";

/**
 * Fetches games whose [min_players, max_players] range overlaps the
 * requested group-size range, that fit within the available time, and
 * (optionally) support the requested platform.
 *
 * Range-overlap logic: a game qualifies if its min_players is at or below
 * our max, AND its max_players is at or above our min — i.e. the two
 * ranges intersect rather than requiring an exact match.
 */
export async function fetchGames(filters: GameFilters): Promise<Game[]> {
  const supabase = createClient();

  let query = supabase
    .from("flush_games")
    .select(
      "id, name, min_players, max_players, time_estimate_mins, platform, rules_short, rules_long",
    )
    .lte("min_players", filters.maxPlayers)
    .gte("max_players", filters.minPlayers)
    .lte("time_estimate_mins", filters.timeAvailableMins);

  if (filters.platform !== "either") {
    // platform is a Postgres text[] column — .contains() maps to the `@>`
    // array-containment operator, i.e. "does this game's platform list
    // include the one we're filtering for."
    query = query.contains("platform", [filters.platform]);
  }

  const { data, error } = await query.order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Game[];
}

/**
 * Inserts a new game row. Relies on the `flush_games` public-insert RLS
 * policy (no auth for MVP — see scripts/sql/flush_games.sql). Returns the
 * inserted row (including its generated id) so the caller can drop it
 * straight into local state without a refetch.
 */
export async function insertGame(input: Omit<Game, "id">): Promise<Game> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("flush_games")
    .insert({
      name: input.name,
      min_players: input.min_players,
      max_players: input.max_players,
      time_estimate_mins: input.time_estimate_mins,
      platform: input.platform,
      rules_short: input.rules_short,
      rules_long: input.rules_long,
    })
    .select(
      "id, name, min_players, max_players, time_estimate_mins, platform, rules_short, rules_long",
    )
    .single();

  if (error) throw error;
  return data as Game;
}
