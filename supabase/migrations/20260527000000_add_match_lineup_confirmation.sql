alter table public.matches
  add column if not exists red_leader_confirmed boolean not null default false,
  add column if not exists blue_leader_confirmed boolean not null default false;
