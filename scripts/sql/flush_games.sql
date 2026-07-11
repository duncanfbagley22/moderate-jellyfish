-- Flush ("Shuffle & Deal") game-recommendation mini-app
-- Table renamed from the generic "games" to "flush_games" to avoid any
-- future collision with other mini-apps in this project.

create table if not exists flush_games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_players integer not null,
  max_players integer not null,
  time_estimate_mins integer not null,
  platform text[] not null default '{}',
  rules_short text not null,
  rules_long text not null,
  created_at timestamptz not null default now()
);

alter table flush_games enable row level security;

-- Public read-only access, no auth required for MVP.
create policy "Public read access to flush_games"
  on flush_games
  for select
  using (true);

-- Public insert access, matching the "no auth for MVP" design in the
-- original spec — anyone using the app (i.e. anyone with the anon key)
-- can add a new game via the "+ Add Game" form. This is fine for a
-- personal, unlisted app; tighten this (require auth, or move writes
-- behind a server-side API route) if this app is ever made public.
create policy "Public insert access to flush_games"
  on flush_games
  for insert
  with check (true);

-- ⚠️ NOTE: the seed data below uses "physical" / "digital" as platform
-- values. The app's Platform type (app/flush/lib/types.ts) currently uses
-- "face cards" / "pen & paper" instead, and neither matches these games —
-- so platform filtering against this seed data won't produce the results
-- you'd expect until this is reconciled one way or the other. See chat for
-- details; left as-is pending confirmation of which categories you want.

-- Seed data: 10 placeholder games covering a mix of party, bluffing,
-- deduction, and light strategy titles, spanning quick (15 min) to
-- medium-length (60 min) play, and both physical and digital platforms.
insert into flush_games
  (name, min_players, max_players, time_estimate_mins, platform, rules_short, rules_long)
values
  (
    'Codenames',
    4, 8, 20,
    array['physical'],
    'Two teams race to identify their agents using one-word clues.',
    'Split into two teams, each with a Spymaster. A 5x5 grid of word cards is laid out, with a hidden key card showing which words belong to which team. Spymasters take turns giving a one-word clue plus a number, indicating how many cards on the grid relate to that clue. Their teammates guess which cards match, trying to find all their team''s agents before hitting the other team''s cards, innocent bystanders, or the assassin card, which ends the game instantly. First team to identify all their agents wins.'
  ),
  (
    'Coup',
    2, 6, 15,
    array['physical'],
    'A bluffing game of assassination, deception, and influence in a dystopian court.',
    'Each player starts with two face-down influence cards and two coins. On your turn, take an action such as collecting coins, coups, or a character-specific power like stealing or assassinating. Any character action can be bluffed, and any player may challenge a claim. If challenged and you cannot prove it, you lose an influence card. Lose both influence cards and you''re eliminated. Last player with influence remaining wins.'
  ),
  (
    'Splendor',
    2, 4, 30,
    array['physical'],
    'Collect gems and build a jewel-trading empire through engine building.',
    'Players collect gem tokens and use them to purchase development cards, which provide permanent bonus gems and, for higher-tier cards, prestige points. Some cards also attract visiting nobles, which grant additional points if you meet their gem requirements. On your turn, take gem tokens, purchase a card, or reserve a card for later. The first player to reach 15 prestige points triggers the final round; highest score wins.'
  ),
  (
    'Ticket to Ride',
    2, 5, 60,
    array['physical'],
    'Collect train cards to claim railway routes and connect cities across the map.',
    'Players collect colored train cards and use sets of matching cards to claim railway routes between cities on the board, earning points based on route length. Completing a set of secret destination tickets earns bonus points at game end, but incomplete tickets subtract points. Points are also awarded for the longest continuous route. The game ends when a player drops to two or fewer train pieces remaining; highest total score wins.'
  ),
  (
    'Werewolf',
    5, 20, 30,
    array['physical'],
    'A hidden-role party game of villagers hunting werewolves before it''s too late.',
    'Players are secretly assigned roles: a small number of Werewolves and a larger group of Villagers, often with special roles like Seer or Doctor mixed in. The game alternates between a "night" phase, where werewolves secretly choose a victim and special roles act, and a "day" phase, where all surviving players discuss and vote to eliminate someone they suspect is a werewolf. Villagers win by eliminating all werewolves; werewolves win if they equal or outnumber the remaining villagers.'
  ),
  (
    'Spyfall',
    3, 8, 15,
    array['physical', 'digital'],
    'Everyone shares a secret location except the spy, who must guess it from context.',
    'All players except one are shown the same secret location card; one player is secretly the Spy and sees no location. Players take turns asking each other subtle, location-related questions to prove they know the location without giving it away outright. The Spy tries to blend in and figure out the location from context. At any point, players can vote to accuse someone of being the Spy, or the Spy can attempt to guess the location to win outright.'
  ),
  (
    'Among Us',
    4, 10, 20,
    array['digital'],
    'Crewmates complete tasks on a spaceship while impostors secretly sabotage and eliminate them.',
    'Crewmates move around a map completing assigned tasks while one or more secret Impostors sabotage systems and eliminate Crewmates one by one. When a body is found or a meeting is called, all players discuss and vote to eject whoever they suspect is an Impostor. Crewmates win by completing all tasks or ejecting every Impostor; Impostors win by eliminating enough Crewmates to equal their numbers.'
  ),
  (
    'Jackbox Party Pack',
    3, 8, 30,
    array['digital'],
    'A collection of couch-multiplayer party games played via phones as controllers.',
    'One player hosts the game on a shared screen while everyone else joins as a controller using their own phone or tablet browser, no extra app or hardware required. Each included mini-game has its own quick rules, typically involving drawing, trivia, or writing prompts, that are explained on-screen before each round. Scoring and winners vary by mini-game, but the format is built around fast rounds and reading everyone''s submissions aloud for laughs.'
  ),
  (
    'Wavelength',
    2, 12, 30,
    array['physical'],
    'Teams try to read each other''s minds by guessing where a hidden dial lands on a spectrum.',
    'One player sees a hidden target position on a spectrum between two opposing concepts, like "hot" and "cold," and gives a one-word or short-phrase clue meant to guide their team toward that position on a dial. The team discusses and agrees on where to set the dial based on the clue. Points are awarded based on how close the guess lands to the hidden target, with bigger rewards for direct hits. Teams alternate giving and guessing across rounds.'
  ),
  (
    'Skull',
    3, 6, 20,
    array['physical'],
    'A bluffing game of nerve where you bet on how many flower cards you can flip in a row.',
    'Each player has four cards: three flowers and one skull, played face-down in front of them over several rounds. On your turn, you either add a card to your row or start a bidding phase, betting on how many cards total you can flip face-up across all players without hitting a skull. Bidding continues until someone accepts the challenge, then that player flips cards starting with their own until they either succeed or reveal a skull, in which case they lose one of their own cards.'
  );
