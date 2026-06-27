alter table public.match_teams
  drop constraint if exists match_teams_formation_slot_check;

alter table public.match_teams
  add constraint match_teams_formation_slot_check check (formation_slot between 0 and 35);
