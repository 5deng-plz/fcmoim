alter table public.match_teams
  add column if not exists formation_slot integer check (formation_slot between 0 and 17);
