-- Fantasy Coach – initieel datamodel
-- Referentiedata (sporten, spellen, wedstrijden, spelers) is leesbaar voor ingelogde gebruikers
-- en schrijfbaar voor service_role/admins. Gebruikersdata is via RLS strikt per gebruiker.
-- Er bestaat bewust GEEN kolom voor wachtwoorden of inloggegevens van externe platforms.

create extension if not exists "pgcrypto";

-- ───────────────────────────── Gebruikers ─────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  risk_profile text not null default 'balanced' check (risk_profile in ('safe','balanced','aggressive')),
  prefs jsonb not null default '{}'::jsonb,           -- zie PreferencesSchema in src/engine/types.ts
  notification_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ───────────────────────────── Referentiedata ─────────────────────────────
create table public.sports (
  id text primary key,                                -- 'football', 'darts'
  name text not null
);

create table public.competitions (
  id text primary key,                                -- 'ucl', 'eredivisie'
  sport_id text not null references public.sports(id),
  name text not null,
  country text
);

create table public.seasons (
  id text primary key,                                -- 'ucl-2026-27'
  competition_id text not null references public.competitions(id),
  name text not null,
  starts_on date,
  ends_on date
);

create table public.fantasy_games (
  id text primary key,                                -- 'champ-coach'
  sport_id text not null references public.sports(id),
  competition_id text not null references public.competitions(id),
  season_id text references public.seasons(id),
  name text not null,
  module text not null,                               -- verwijst naar src/games/<module>
  is_active boolean not null default true
);

create table public.fantasy_game_rules (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.fantasy_games(id) on delete cascade,
  version int not null default 1,
  rules jsonb not null,                               -- RuleSet (gevalideerd in de app met Zod)
  is_current boolean not null default true,
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now(),
  unique (game_id, version)
);
create unique index fantasy_game_rules_current on public.fantasy_game_rules(game_id) where is_current;

create table public.rounds (
  id text primary key,                                -- 'cc-md5-tue-2100'
  game_id text not null references public.fantasy_games(id) on delete cascade,
  season_id text references public.seasons(id),
  name text not null,
  phase text,                                         -- 'league'
  matchday int,
  deadline timestamptz not null,
  captain_multiplier numeric,                         -- override, null = standaard
  match_of_the_round_fixture_id text,
  sort_order int not null default 0
);
create index rounds_game_deadline on public.rounds(game_id, deadline);

create table public.clubs_or_teams (
  id text primary key,
  sport_id text not null references public.sports(id),
  name text not null,
  short_name text not null,
  country text,
  strength_attack numeric,                            -- genormaliseerd, 1.0 = gemiddeld
  strength_defense numeric
);

create table public.fixtures (
  id text primary key,
  competition_id text not null references public.competitions(id),
  round_id text references public.rounds(id),
  home_id text not null references public.clubs_or_teams(id),
  away_id text not null references public.clubs_or_teams(id),
  kickoff timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished','postponed')),
  home_score int,
  away_score int,
  bracket_round text,                                 -- darts: 'R1','QF', ...
  bracket_slot int
);
create index fixtures_round on public.fixtures(round_id);
create index fixtures_kickoff on public.fixtures(kickoff);

create table public.players (
  id text primary key,
  sport_id text not null references public.sports(id),
  club_id text references public.clubs_or_teams(id),
  name text not null,
  nationality text,
  active boolean not null default true
);
create index players_club on public.players(club_id);

create table public.player_positions (
  player_id text not null references public.players(id) on delete cascade,
  game_id text not null references public.fantasy_games(id) on delete cascade,
  position text not null,                             -- 'GK','DEF','MID','FWD' of 'DARTER'
  price numeric,
  price_change numeric default 0,
  primary key (player_id, game_id)
);

create table public.player_roles (
  player_id text not null references public.players(id) on delete cascade,
  role text not null,                                 -- 'penalty_1','freekick','corner','attacking_fullback','wingback','striker'
  rank int not null default 1,
  primary key (player_id, role)
);

create table public.player_statistics (
  id bigint generated always as identity primary key,
  player_id text not null references public.players(id) on delete cascade,
  fixture_id text references public.fixtures(id),
  season_id text references public.seasons(id),
  minutes int, goals int, assists int,
  xg numeric, xa numeric, shots int, key_passes int,
  clean_sheet boolean, yellow int, red int,
  -- darts
  three_dart_avg numeric, checkout_pct numeric, first9_avg numeric, one_eighties int,
  fantasy_points numeric,
  recorded_at timestamptz not null default now()
);
create index player_statistics_player on public.player_statistics(player_id, recorded_at desc);

create table public.predicted_lineups (
  fixture_id text not null references public.fixtures(id) on delete cascade,
  player_id text not null references public.players(id) on delete cascade,
  start_probability numeric not null check (start_probability between 0 and 1),
  expected_minutes numeric,
  source_id text,
  updated_at timestamptz not null default now(),
  primary key (fixture_id, player_id)
);

create table public.confirmed_lineups (
  fixture_id text not null references public.fixtures(id) on delete cascade,
  player_id text not null references public.players(id) on delete cascade,
  status text not null check (status in ('starting','bench','absent')),
  published_at timestamptz not null default now(),
  primary key (fixture_id, player_id)
);

create table public.injuries_and_suspensions (
  id bigint generated always as identity primary key,
  player_id text not null references public.players(id) on delete cascade,
  kind text not null check (kind in ('injury','suspension','illness','withdrawn','doubtful')),
  description text,
  expected_return date,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index injuries_active on public.injuries_and_suspensions(player_id) where is_active;

create table public.betting_probabilities (
  fixture_id text primary key references public.fixtures(id) on delete cascade,
  p_home numeric, p_draw numeric, p_away numeric,
  exp_goals_home numeric, exp_goals_away numeric,
  source_id text,
  updated_at timestamptz not null default now()
);

create table public.data_sources (
  id text primary key,
  name text not null,
  kind text not null,                                 -- 'seed','api','csv','json','ocr'
  is_mock boolean not null default false,
  terms_url text,
  notes text
);

create table public.data_import_logs (
  id uuid primary key default gen_random_uuid(),
  source_id text references public.data_sources(id),
  user_id uuid references public.users(id) on delete set null,
  data_type text not null,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  rows_total int, rows_ok int, rows_failed int,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- ───────────────────────────── Gebruikersdata ─────────────────────────────
create table public.user_game_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  game_id text not null references public.fantasy_games(id) on delete cascade,
  team_name text,
  budget numeric,
  rule_overrides jsonb not null default '{}'::jsonb,  -- bijv. alleen 21:00-wedstrijden
  created_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create table public.user_squads (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.user_game_entries(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  round_id text references public.rounds(id),
  variant text not null default 'chosen' check (variant in ('chosen','safe','aggressive','final')),
  is_final boolean not null default false,
  finalized_at timestamptz,
  expected_points numeric,
  actual_points numeric,
  created_at timestamptz not null default now()
);
create index user_squads_entry_round on public.user_squads(entry_id, round_id);

create table public.user_squad_players (
  squad_id uuid not null references public.user_squads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  player_id text not null references public.players(id),
  slot text not null,                                 -- 'GK1','DEF1', ... of 'BENCH1'
  is_starter boolean not null default true,
  primary key (squad_id, player_id)
);

create table public.captains (
  squad_id uuid primary key references public.user_squads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  player_id text not null references public.players(id),
  vice_player_id text references public.players(id),
  multiplier numeric not null default 2
);

create table public.used_players (
  entry_id uuid not null references public.user_game_entries(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  player_id text not null references public.players(id),
  round_id text references public.rounds(id),
  source text not null default 'manual' check (source in ('manual','final_team','import')),
  created_at timestamptz not null default now(),
  primary key (entry_id, player_id)
);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.user_game_entries(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  round_id text references public.rounds(id),
  player_out_id text references public.players(id),
  player_in_id text references public.players(id),
  price_out numeric, price_in numeric,
  created_at timestamptz not null default now()
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  entry_id uuid references public.user_game_entries(id) on delete cascade,
  round_id text references public.rounds(id),
  variant text not null,
  payload jsonb not null,                             -- volledig teamadvies
  expected_points numeric,
  engine_version text not null,
  created_at timestamptz not null default now()
);
create index recommendations_user_round on public.recommendations(user_id, round_id, created_at desc);

create table public.recommendation_explanations (
  id bigint generated always as identity primary key,
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  player_id text references public.players(id),
  decision text not null check (decision in ('pick','captain','save','bench','avoid','replace')),
  summary text not null,
  factors jsonb not null default '[]'::jsonb
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  game_id text references public.fantasy_games(id) on delete cascade,
  kind text not null check (kind in ('deadline','lineup_published','player_not_starting','captain_not_starting','injury','new_recommendation','final_check')),
  title text not null,
  body text,
  payload jsonb,
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread on public.notifications(user_id) where read_at is null;
create index notifications_due on public.notifications(scheduled_for) where sent_at is null;

-- ───────────────────────────── Row-level security ─────────────────────────────
alter table public.users enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_game_entries enable row level security;
alter table public.user_squads enable row level security;
alter table public.user_squad_players enable row level security;
alter table public.captains enable row level security;
alter table public.used_players enable row level security;
alter table public.transfers enable row level security;
alter table public.recommendations enable row level security;
alter table public.recommendation_explanations enable row level security;
alter table public.notifications enable row level security;
alter table public.data_import_logs enable row level security;

create policy "own profile" on public.users for all using (id = auth.uid()) with check (id = auth.uid() and is_admin = false);

do $$
declare t text;
begin
  foreach t in array array['user_preferences','user_game_entries','user_squads','user_squad_players','captains',
                           'used_players','transfers','recommendations','recommendation_explanations','notifications']
  loop
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

create policy "own imports" on public.data_import_logs for select using (user_id = auth.uid());
create policy "create own imports" on public.data_import_logs for insert with check (user_id = auth.uid());

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.users where id = auth.uid()), false)
$$;

-- Referentiedata: lezen voor ingelogde gebruikers, schrijven voor admins.
do $$
declare t text;
begin
  foreach t in array array['sports','competitions','seasons','fantasy_games','fantasy_game_rules','rounds','clubs_or_teams',
                           'fixtures','players','player_positions','player_roles','player_statistics','predicted_lineups',
                           'confirmed_lineups','injuries_and_suspensions','betting_probabilities','data_sources']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "read reference" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Profiel automatisch aanmaken bij registratie.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Realtime voor binnenkomende officiële opstellingen.
alter publication supabase_realtime add table public.confirmed_lineups;

-- Privacy: verwijder alle gegevens van de ingelogde gebruiker (cascade via users → auth.users).
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
