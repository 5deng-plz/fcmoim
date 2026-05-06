-- FC Moim Stage 1 Supabase initialization.
-- Canonical source for a fresh Stage 1 schema, RLS policies, helper functions,
-- indexes, and minimal seed data.
--
-- Do not run this against live data without a backup or a Data Agent migration plan.

create extension if not exists pgcrypto;

create schema if not exists private;

do $$
begin
  create type public.user_role as enum ('admin', 'operator', 'member');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.membership_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.position as enum ('FW', 'MF', 'DF');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.preferred_foot as enum ('left', 'right', 'both');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_type as enum ('match', 'vote_match', 'training', 'seminar', 'etc');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.match_status as enum ('scheduled', 'locker_room', 'finished', 'cancelled');
exception when duplicate_object then null;
end $$;

alter type public.match_status add value if not exists 'cancelled';

do $$
begin
  create type public.attendance_status as enum ('attend', 'absent', 'none');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.schedule_poll_status as enum ('open', 'closed', 'promoted', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.card_grade as enum ('beginner', 'amateur', 'semi_pro', 'pro', 'legend');
exception when duplicate_object then null;
end $$;

create table if not exists public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  created_by uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clubs_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  profile_name text not null check (char_length(btrim(profile_name)) between 1 and 50),
  main_position public.position not null default 'MF',
  sub_position public.position,
  ovr integer not null default 60 check (ovr between 1 and 99),
  stats jsonb not null default '{"speed":60,"shooting":60,"passing":60,"defense":60,"physical":60,"dribble":60}'::jsonb,
  match_points integer not null default 100 check (match_points >= 0),
  photo_url text,
  role public.user_role not null default 'member',
  status public.membership_status not null default 'pending',
  height integer check (height is null or height between 100 and 230),
  weight integer check (weight is null or weight between 30 and 180),
  birth date check (birth is null or birth <= current_date),
  preferred_foot public.preferred_foot not null default 'right',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, club_id),
  constraint team_memberships_stats_object check (jsonb_typeof(stats) = 'object')
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_valid_range check (start_date <= end_date)
);

create unique index if not exists seasons_one_active_per_club
  on public.seasons (club_id)
  where is_active;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  round integer,
  title text not null,
  date timestamptz not null,
  location text not null,
  type public.event_type not null default 'match',
  status public.match_status not null default 'scheduled',
  our_score integer check (our_score is null or our_score between 0 and 99),
  opp_score integer check (opp_score is null or opp_score between 0 and 99),
  tactics_completed boolean not null default false,
  memo text,
  created_by uuid references public.team_memberships(id) on delete set null,
  updated_by uuid references public.team_memberships(id) on delete set null,
  cancellation_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists matches_unique_round_per_season
  on public.matches (season_id, round)
  where round is not null;

create table if not exists public.schedule_polls (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  status public.schedule_poll_status not null default 'open',
  common_time time not null,
  location text not null check (char_length(btrim(location)) between 1 and 120),
  memo text,
  closes_at timestamptz,
  created_by uuid not null references public.team_memberships(id) on delete restrict,
  updated_by uuid references public.team_memberships(id) on delete set null,
  cancellation_reason text,
  cancelled_at timestamptz,
  promoted_match_id uuid references public.matches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_polls_closes_after_created check (closes_at is null or closes_at > created_at)
);

alter table public.matches
  add column if not exists updated_by uuid references public.team_memberships(id) on delete set null,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz;

alter table public.schedule_polls
  add column if not exists updated_by uuid references public.team_memberships(id) on delete set null,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz;

create table if not exists public.schedule_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.schedule_polls(id) on delete cascade,
  option_date date not null,
  sort_order integer not null default 0 check (sort_order between 0 and 99),
  created_at timestamptz not null default now(),
  unique (poll_id, id),
  unique (poll_id, option_date)
);

create table if not exists public.schedule_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.schedule_polls(id) on delete cascade,
  option_id uuid not null,
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (option_id, membership_id),
  constraint schedule_poll_votes_option_poll_fk
    foreign key (poll_id, option_id)
    references public.schedule_poll_options(poll_id, id)
    on delete cascade
);

create table if not exists public.attendances (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  status public.attendance_status not null default 'none',
  responded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, membership_id)
);

create table if not exists public.match_teams (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  team_number integer not null check (team_number in (1, 2)),
  is_leader boolean not null default false,
  position public.position not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, membership_id)
);

create table if not exists public.player_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  goals integer not null default 0 check (goals >= 0),
  assists integer not null default 0 check (assists >= 0),
  is_mom boolean not null default false,
  ai_rating numeric(3, 1) check (ai_rating is null or ai_rating between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, membership_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locker_items (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  card_name text not null,
  card_effect text not null,
  grade public.card_grade not null default 'beginner',
  is_equipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  title text not null,
  content text not null,
  author_membership_id uuid references public.team_memberships(id) on delete set null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  amount integer not null,
  reason text not null,
  source_type text not null,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.reward_badges (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  code text not null,
  name text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, code)
);

create table if not exists public.membership_badges (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  badge_id uuid not null references public.reward_badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (membership_id, badge_id)
);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_current_account(target_account_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select (select auth.uid()) = target_account_id;
$$;

create or replace function private.is_member_of_club(target_club_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.account_id = (select auth.uid())
      and tm.club_id = target_club_id
      and tm.status = 'approved'::public.membership_status
  );
$$;

create or replace function private.has_club_role(target_club_id uuid, allowed_roles public.user_role[])
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.account_id = (select auth.uid())
      and tm.club_id = target_club_id
      and tm.status = 'approved'::public.membership_status
      and tm.role = any(allowed_roles)
  );
$$;

create or replace function private.is_current_membership(target_membership_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.id = target_membership_id
      and tm.account_id = (select auth.uid())
  );
$$;

create or replace function private.is_member_for_match(target_match_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = target_match_id
      and private.is_member_of_club(m.club_id)
  );
$$;

create or replace function private.has_match_role(target_match_id uuid, allowed_roles public.user_role[])
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = target_match_id
      and private.has_club_role(m.club_id, allowed_roles)
  );
$$;

create or replace function private.membership_can_participate_in_match(
  target_match_id uuid,
  target_membership_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.matches m
    join public.team_memberships tm on tm.club_id = m.club_id
    where m.id = target_match_id
      and tm.id = target_membership_id
      and tm.status = 'approved'::public.membership_status
  );
$$;

create or replace function private.membership_belongs_to_club(
  target_club_id uuid,
  target_membership_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.id = target_membership_id
      and tm.club_id = target_club_id
      and tm.status = 'approved'::public.membership_status
  );
$$;

create or replace function private.is_member_for_schedule_poll(target_poll_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.schedule_polls sp
    where sp.id = target_poll_id
      and private.is_member_of_club(sp.club_id)
  );
$$;

create or replace function private.has_schedule_poll_role(
  target_poll_id uuid,
  allowed_roles public.user_role[]
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.schedule_polls sp
    where sp.id = target_poll_id
      and private.has_club_role(sp.club_id, allowed_roles)
  );
$$;

create or replace function private.is_schedule_poll_open(target_poll_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.schedule_polls sp
    where sp.id = target_poll_id
      and sp.status = 'open'::public.schedule_poll_status
      and (sp.closes_at is null or sp.closes_at > now())
  );
$$;

create or replace function private.schedule_poll_option_belongs_to_poll(
  target_poll_id uuid,
  target_option_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.schedule_poll_options spo
    where spo.poll_id = target_poll_id
      and spo.id = target_option_id
  );
$$;

create or replace function private.membership_can_vote_schedule_poll(
  target_poll_id uuid,
  target_membership_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.schedule_polls sp
    join public.team_memberships tm on tm.club_id = sp.club_id
    where sp.id = target_poll_id
      and tm.id = target_membership_id
      and tm.status = 'approved'::public.membership_status
      and sp.status = 'open'::public.schedule_poll_status
      and (sp.closes_at is null or sp.closes_at > now())
  );
$$;

create or replace function private.guard_membership_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.account_id is distinct from old.account_id
    or new.club_id is distinct from old.club_id
  then
    raise exception 'Membership account and club cannot be changed.';
  end if;

  if (select auth.uid()) = old.account_id
    and not private.has_club_role(old.club_id, array['admin', 'operator']::public.user_role[])
    and (
      new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.ovr is distinct from old.ovr
      or new.stats is distinct from old.stats
      or new.match_points is distinct from old.match_points
    )
  then
    raise exception 'Only club operators can change privileged membership fields.';
  end if;

  return new;
end;
$$;

drop trigger if exists team_memberships_guard_privileged_fields on public.team_memberships;
create trigger team_memberships_guard_privileged_fields
  before update on public.team_memberships
  for each row execute function private.guard_membership_privileged_fields();

drop trigger if exists accounts_touch_updated_at on public.accounts;
create trigger accounts_touch_updated_at before update on public.accounts
  for each row execute function private.touch_updated_at();

drop trigger if exists clubs_touch_updated_at on public.clubs;
create trigger clubs_touch_updated_at before update on public.clubs
  for each row execute function private.touch_updated_at();

drop trigger if exists team_memberships_touch_updated_at on public.team_memberships;
create trigger team_memberships_touch_updated_at before update on public.team_memberships
  for each row execute function private.touch_updated_at();

drop trigger if exists seasons_touch_updated_at on public.seasons;
create trigger seasons_touch_updated_at before update on public.seasons
  for each row execute function private.touch_updated_at();

drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at before update on public.matches
  for each row execute function private.touch_updated_at();

drop trigger if exists schedule_polls_touch_updated_at on public.schedule_polls;
create trigger schedule_polls_touch_updated_at before update on public.schedule_polls
  for each row execute function private.touch_updated_at();

drop trigger if exists schedule_poll_votes_touch_updated_at on public.schedule_poll_votes;
create trigger schedule_poll_votes_touch_updated_at before update on public.schedule_poll_votes
  for each row execute function private.touch_updated_at();

drop trigger if exists attendances_touch_updated_at on public.attendances;
create trigger attendances_touch_updated_at before update on public.attendances
  for each row execute function private.touch_updated_at();

drop trigger if exists match_teams_touch_updated_at on public.match_teams;
create trigger match_teams_touch_updated_at before update on public.match_teams
  for each row execute function private.touch_updated_at();

drop trigger if exists player_stats_touch_updated_at on public.player_stats;
create trigger player_stats_touch_updated_at before update on public.player_stats
  for each row execute function private.touch_updated_at();

drop trigger if exists comments_touch_updated_at on public.comments;
create trigger comments_touch_updated_at before update on public.comments
  for each row execute function private.touch_updated_at();

drop trigger if exists locker_items_touch_updated_at on public.locker_items;
create trigger locker_items_touch_updated_at before update on public.locker_items
  for each row execute function private.touch_updated_at();

drop trigger if exists announcements_touch_updated_at on public.announcements;
create trigger announcements_touch_updated_at before update on public.announcements
  for each row execute function private.touch_updated_at();

drop trigger if exists notifications_touch_updated_at on public.notifications;
create trigger notifications_touch_updated_at before update on public.notifications
  for each row execute function private.touch_updated_at();

drop trigger if exists reward_badges_touch_updated_at on public.reward_badges;
create trigger reward_badges_touch_updated_at before update on public.reward_badges
  for each row execute function private.touch_updated_at();

alter table public.accounts enable row level security;
alter table public.clubs enable row level security;
alter table public.team_memberships enable row level security;
alter table public.seasons enable row level security;
alter table public.matches enable row level security;
alter table public.schedule_polls enable row level security;
alter table public.schedule_poll_options enable row level security;
alter table public.schedule_poll_votes enable row level security;
alter table public.attendances enable row level security;
alter table public.match_teams enable row level security;
alter table public.player_stats enable row level security;
alter table public.comments enable row level security;
alter table public.locker_items enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.point_ledger enable row level security;
alter table public.reward_badges enable row level security;
alter table public.membership_badges enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

drop policy if exists "Accounts can read own account" on public.accounts;
create policy "Accounts can read own account"
  on public.accounts for select
  to authenticated
  using (private.is_current_account(id));

drop policy if exists "Accounts can create own account" on public.accounts;
create policy "Accounts can create own account"
  on public.accounts for insert
  to authenticated
  with check (private.is_current_account(id));

drop policy if exists "Accounts can update own account" on public.accounts;
create policy "Accounts can update own account"
  on public.accounts for update
  to authenticated
  using (private.is_current_account(id))
  with check (private.is_current_account(id));

drop policy if exists "Authenticated users can read club catalog" on public.clubs;
create policy "Authenticated users can read club catalog"
  on public.clubs for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can create clubs" on public.clubs;
create policy "Authenticated users can create clubs"
  on public.clubs for insert
  to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "Club operators can update clubs" on public.clubs;
create policy "Club operators can update clubs"
  on public.clubs for update
  to authenticated
  using (private.has_club_role(id, array['admin', 'operator']::public.user_role[]))
  with check (private.has_club_role(id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Members can read club memberships" on public.team_memberships;
create policy "Members can read club memberships"
  on public.team_memberships for select
  to authenticated
  using (private.is_current_membership(id) or private.is_member_of_club(club_id));

drop policy if exists "Users can request membership or operators can add members" on public.team_memberships;
create policy "Users can request membership or operators can add members"
  on public.team_memberships for insert
  to authenticated
  with check (
    (
      private.is_current_account(account_id)
      and role = 'member'::public.user_role
      and status = 'pending'::public.membership_status
    )
    or private.has_club_role(club_id, array['admin', 'operator']::public.user_role[])
  );

drop policy if exists "Users can update own profile or operators can manage memberships" on public.team_memberships;
create policy "Users can update own profile or operators can manage memberships"
  on public.team_memberships for update
  to authenticated
  using (
    private.is_current_membership(id)
    or private.has_club_role(club_id, array['admin', 'operator']::public.user_role[])
  )
  with check (
    private.is_current_membership(id)
    or private.has_club_role(club_id, array['admin', 'operator']::public.user_role[])
  );

drop policy if exists "Club operators can delete memberships" on public.team_memberships;
create policy "Club operators can delete memberships"
  on public.team_memberships for delete
  to authenticated
  using (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Approved members can read seasons" on public.seasons;
create policy "Approved members can read seasons"
  on public.seasons for select
  to authenticated
  using (private.is_member_of_club(club_id));

drop policy if exists "Club operators can insert seasons" on public.seasons;
create policy "Club operators can insert seasons"
  on public.seasons for insert
  to authenticated
  with check (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Club operators can update seasons" on public.seasons;
create policy "Club operators can update seasons"
  on public.seasons for update
  to authenticated
  using (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]))
  with check (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Club operators can delete seasons" on public.seasons;
create policy "Club operators can delete seasons"
  on public.seasons for delete
  to authenticated
  using (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Approved members can read matches" on public.matches;
create policy "Approved members can read matches"
  on public.matches for select
  to authenticated
  using (private.is_member_of_club(club_id));

drop policy if exists "Club operators can insert matches" on public.matches;
create policy "Club operators can insert matches"
  on public.matches for insert
  to authenticated
  with check (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Club operators can update matches" on public.matches;
create policy "Club operators can update matches"
  on public.matches for update
  to authenticated
  using (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]))
  with check (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Club operators can delete matches" on public.matches;
create policy "Club operators can delete matches"
  on public.matches for delete
  to authenticated
  using (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Approved members can read schedule polls" on public.schedule_polls;
create policy "Approved members can read schedule polls"
  on public.schedule_polls for select
  to authenticated
  using (private.is_member_of_club(club_id));

drop policy if exists "Club operators can insert schedule polls" on public.schedule_polls;
create policy "Club operators can insert schedule polls"
  on public.schedule_polls for insert
  to authenticated
  with check (
    private.has_club_role(club_id, array['admin', 'operator']::public.user_role[])
    and private.is_current_membership(created_by)
    and private.membership_belongs_to_club(club_id, created_by)
  );

drop policy if exists "Club operators can update schedule polls" on public.schedule_polls;
create policy "Club operators can update schedule polls"
  on public.schedule_polls for update
  to authenticated
  using (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]))
  with check (
    private.has_club_role(club_id, array['admin', 'operator']::public.user_role[])
    and private.membership_belongs_to_club(club_id, created_by)
  );

drop policy if exists "Club operators can delete schedule polls" on public.schedule_polls;
create policy "Club operators can delete schedule polls"
  on public.schedule_polls for delete
  to authenticated
  using (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Approved members can read schedule poll options" on public.schedule_poll_options;
create policy "Approved members can read schedule poll options"
  on public.schedule_poll_options for select
  to authenticated
  using (private.is_member_for_schedule_poll(poll_id));

drop policy if exists "Club operators can insert schedule poll options" on public.schedule_poll_options;
create policy "Club operators can insert schedule poll options"
  on public.schedule_poll_options for insert
  to authenticated
  with check (private.has_schedule_poll_role(poll_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Club operators can update schedule poll options" on public.schedule_poll_options;
create policy "Club operators can update schedule poll options"
  on public.schedule_poll_options for update
  to authenticated
  using (private.has_schedule_poll_role(poll_id, array['admin', 'operator']::public.user_role[]))
  with check (private.has_schedule_poll_role(poll_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Club operators can delete schedule poll options" on public.schedule_poll_options;
create policy "Club operators can delete schedule poll options"
  on public.schedule_poll_options for delete
  to authenticated
  using (private.has_schedule_poll_role(poll_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Approved members can read schedule poll votes" on public.schedule_poll_votes;
create policy "Approved members can read schedule poll votes"
  on public.schedule_poll_votes for select
  to authenticated
  using (private.is_member_for_schedule_poll(poll_id));

drop policy if exists "Members can upsert own schedule poll votes" on public.schedule_poll_votes;
create policy "Members can upsert own schedule poll votes"
  on public.schedule_poll_votes for insert
  to authenticated
  with check (
    private.is_current_membership(membership_id)
    and private.membership_can_vote_schedule_poll(poll_id, membership_id)
    and private.schedule_poll_option_belongs_to_poll(poll_id, option_id)
  );

drop policy if exists "Members can update own schedule poll votes" on public.schedule_poll_votes;
create policy "Members can update own schedule poll votes"
  on public.schedule_poll_votes for update
  to authenticated
  using (private.is_current_membership(membership_id))
  with check (
    private.is_current_membership(membership_id)
    and private.membership_can_vote_schedule_poll(poll_id, membership_id)
    and private.schedule_poll_option_belongs_to_poll(poll_id, option_id)
  );

drop policy if exists "Members can delete own schedule poll votes" on public.schedule_poll_votes;
create policy "Members can delete own schedule poll votes"
  on public.schedule_poll_votes for delete
  to authenticated
  using (private.is_current_membership(membership_id));

drop policy if exists "Approved members can read attendances" on public.attendances;
create policy "Approved members can read attendances"
  on public.attendances for select
  to authenticated
  using (private.is_member_for_match(match_id));

drop policy if exists "Members or operators can insert attendances" on public.attendances;
create policy "Members or operators can insert attendances"
  on public.attendances for insert
  to authenticated
  with check (
    (
      private.is_current_membership(membership_id)
      and private.membership_can_participate_in_match(match_id, membership_id)
    )
    or private.has_match_role(match_id, array['admin', 'operator']::public.user_role[])
  );

drop policy if exists "Members or operators can update attendances" on public.attendances;
create policy "Members or operators can update attendances"
  on public.attendances for update
  to authenticated
  using (
    private.is_current_membership(membership_id)
    or private.has_match_role(match_id, array['admin', 'operator']::public.user_role[])
  )
  with check (
    private.membership_can_participate_in_match(match_id, membership_id)
    and (
      private.is_current_membership(membership_id)
      or private.has_match_role(match_id, array['admin', 'operator']::public.user_role[])
    )
  );

drop policy if exists "Members or operators can delete attendances" on public.attendances;
create policy "Members or operators can delete attendances"
  on public.attendances for delete
  to authenticated
  using (
    private.is_current_membership(membership_id)
    or private.has_match_role(match_id, array['admin', 'operator']::public.user_role[])
  );

drop policy if exists "Approved members can read match teams" on public.match_teams;
create policy "Approved members can read match teams"
  on public.match_teams for select
  to authenticated
  using (private.is_member_for_match(match_id));

drop policy if exists "Club operators can insert match teams" on public.match_teams;
create policy "Club operators can insert match teams"
  on public.match_teams for insert
  to authenticated
  with check (
    private.has_match_role(match_id, array['admin', 'operator']::public.user_role[])
    and private.membership_can_participate_in_match(match_id, membership_id)
  );

drop policy if exists "Club operators can update match teams" on public.match_teams;
create policy "Club operators can update match teams"
  on public.match_teams for update
  to authenticated
  using (private.has_match_role(match_id, array['admin', 'operator']::public.user_role[]))
  with check (
    private.has_match_role(match_id, array['admin', 'operator']::public.user_role[])
    and private.membership_can_participate_in_match(match_id, membership_id)
  );

drop policy if exists "Club operators can delete match teams" on public.match_teams;
create policy "Club operators can delete match teams"
  on public.match_teams for delete
  to authenticated
  using (private.has_match_role(match_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Approved members can read player stats" on public.player_stats;
create policy "Approved members can read player stats"
  on public.player_stats for select
  to authenticated
  using (private.is_member_for_match(match_id));

drop policy if exists "Club operators can insert player stats" on public.player_stats;
create policy "Club operators can insert player stats"
  on public.player_stats for insert
  to authenticated
  with check (
    private.has_match_role(match_id, array['admin', 'operator']::public.user_role[])
    and private.membership_can_participate_in_match(match_id, membership_id)
  );

drop policy if exists "Club operators can update player stats" on public.player_stats;
create policy "Club operators can update player stats"
  on public.player_stats for update
  to authenticated
  using (private.has_match_role(match_id, array['admin', 'operator']::public.user_role[]))
  with check (
    private.has_match_role(match_id, array['admin', 'operator']::public.user_role[])
    and private.membership_can_participate_in_match(match_id, membership_id)
  );

drop policy if exists "Club operators can delete player stats" on public.player_stats;
create policy "Club operators can delete player stats"
  on public.player_stats for delete
  to authenticated
  using (private.has_match_role(match_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Approved members can read comments" on public.comments;
create policy "Approved members can read comments"
  on public.comments for select
  to authenticated
  using (private.is_member_for_match(match_id));

drop policy if exists "Members can create comments" on public.comments;
create policy "Members can create comments"
  on public.comments for insert
  to authenticated
  with check (
    private.is_current_membership(membership_id)
    and private.membership_can_participate_in_match(match_id, membership_id)
  );

drop policy if exists "Members can update own comments" on public.comments;
create policy "Members can update own comments"
  on public.comments for update
  to authenticated
  using (private.is_current_membership(membership_id))
  with check (private.is_current_membership(membership_id));

drop policy if exists "Members and operators can delete comments" on public.comments;
create policy "Members and operators can delete comments"
  on public.comments for delete
  to authenticated
  using (
    private.is_current_membership(membership_id)
    or private.has_match_role(match_id, array['admin', 'operator']::public.user_role[])
  );

drop policy if exists "Approved members can read locker items" on public.locker_items;
create policy "Approved members can read locker items"
  on public.locker_items for select
  to authenticated
  using (
    private.is_current_membership(membership_id)
    or exists (
      select 1
      from public.team_memberships owner
      where owner.id = locker_items.membership_id
        and private.is_member_of_club(owner.club_id)
    )
  );

drop policy if exists "Members can insert own locker items" on public.locker_items;
create policy "Members can insert own locker items"
  on public.locker_items for insert
  to authenticated
  with check (private.is_current_membership(membership_id));

drop policy if exists "Members can update own locker items" on public.locker_items;
create policy "Members can update own locker items"
  on public.locker_items for update
  to authenticated
  using (private.is_current_membership(membership_id))
  with check (private.is_current_membership(membership_id));

drop policy if exists "Members can delete own locker items" on public.locker_items;
create policy "Members can delete own locker items"
  on public.locker_items for delete
  to authenticated
  using (private.is_current_membership(membership_id));

drop policy if exists "Approved members can read announcements" on public.announcements;
create policy "Approved members can read announcements"
  on public.announcements for select
  to authenticated
  using (private.is_member_of_club(club_id));

drop policy if exists "Club operators can insert announcements" on public.announcements;
create policy "Club operators can insert announcements"
  on public.announcements for insert
  to authenticated
  with check (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Club operators can update announcements" on public.announcements;
create policy "Club operators can update announcements"
  on public.announcements for update
  to authenticated
  using (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]))
  with check (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Club operators can delete announcements" on public.announcements;
create policy "Club operators can delete announcements"
  on public.announcements for delete
  to authenticated
  using (private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select
  to authenticated
  using (private.is_current_membership(membership_id));

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (private.is_current_membership(membership_id))
  with check (private.is_current_membership(membership_id));

drop policy if exists "Members can read own point ledger" on public.point_ledger;
create policy "Members can read own point ledger"
  on public.point_ledger for select
  to authenticated
  using (
    private.is_current_membership(membership_id)
    or exists (
      select 1
      from public.team_memberships tm
      where tm.id = point_ledger.membership_id
        and private.has_club_role(tm.club_id, array['admin', 'operator']::public.user_role[])
    )
  );

drop policy if exists "Approved members and operators can read reward badges" on public.reward_badges;
drop policy if exists "Approved members can read reward badges" on public.reward_badges;
drop policy if exists "Club operators can manage reward badges" on public.reward_badges;
drop policy if exists "Club operators can insert reward badges" on public.reward_badges;
drop policy if exists "Club operators can update reward badges" on public.reward_badges;
drop policy if exists "Club operators can delete reward badges" on public.reward_badges;

create policy "Approved members and operators can read reward badges"
  on public.reward_badges for select
  to authenticated
  using (
    club_id is null
    or private.is_member_of_club(club_id)
    or private.has_club_role(club_id, array['admin', 'operator']::public.user_role[])
  );

create policy "Club operators can insert reward badges"
  on public.reward_badges for insert
  to authenticated
  with check (club_id is not null and private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

create policy "Club operators can update reward badges"
  on public.reward_badges for update
  to authenticated
  using (club_id is not null and private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]))
  with check (club_id is not null and private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

create policy "Club operators can delete reward badges"
  on public.reward_badges for delete
  to authenticated
  using (club_id is not null and private.has_club_role(club_id, array['admin', 'operator']::public.user_role[]));

drop policy if exists "Members can read awarded badges" on public.membership_badges;
create policy "Members can read awarded badges"
  on public.membership_badges for select
  to authenticated
  using (
    private.is_current_membership(membership_id)
    or exists (
      select 1
      from public.team_memberships tm
      where tm.id = membership_badges.membership_id
        and private.is_member_of_club(tm.club_id)
    )
  );

create index if not exists team_memberships_club_status_idx on public.team_memberships (club_id, status);
create index if not exists team_memberships_club_role_idx on public.team_memberships (club_id, role);
create index if not exists clubs_created_by_idx on public.clubs (created_by);
create index if not exists matches_club_date_idx on public.matches (club_id, date);
create index if not exists matches_season_date_idx on public.matches (season_id, date);
create index if not exists matches_created_by_idx on public.matches (created_by);
create index if not exists schedule_polls_club_status_idx on public.schedule_polls (club_id, status, created_at desc);
create index if not exists schedule_polls_season_idx on public.schedule_polls (season_id);
create index if not exists schedule_polls_created_by_idx on public.schedule_polls (created_by);
create index if not exists schedule_polls_promoted_match_idx on public.schedule_polls (promoted_match_id);
create index if not exists schedule_poll_options_poll_date_idx on public.schedule_poll_options (poll_id, option_date);
create index if not exists schedule_poll_votes_poll_membership_idx on public.schedule_poll_votes (poll_id, membership_id);
create index if not exists schedule_poll_votes_poll_option_idx on public.schedule_poll_votes (poll_id, option_id);
create index if not exists schedule_poll_votes_membership_idx on public.schedule_poll_votes (membership_id);
create index if not exists schedule_poll_votes_option_idx on public.schedule_poll_votes (option_id);
create index if not exists attendances_membership_idx on public.attendances (membership_id);
create index if not exists match_teams_membership_idx on public.match_teams (membership_id);
create index if not exists player_stats_membership_idx on public.player_stats (membership_id);
create index if not exists comments_match_created_idx on public.comments (match_id, created_at);
create index if not exists comments_membership_idx on public.comments (membership_id);
create index if not exists locker_items_membership_idx on public.locker_items (membership_id);
create index if not exists announcements_club_pinned_idx on public.announcements (club_id, is_pinned desc, created_at desc);
create index if not exists announcements_season_idx on public.announcements (season_id);
create index if not exists announcements_author_membership_idx on public.announcements (author_membership_id);
create index if not exists notifications_membership_read_idx on public.notifications (membership_id, is_read, created_at desc);
create index if not exists point_ledger_membership_created_idx on public.point_ledger (membership_id, created_at desc);
create index if not exists membership_badges_badge_idx on public.membership_badges (badge_id);

create or replace function private.save_match_result_atomically(
  p_match_id uuid,
  p_score jsonb,
  p_player_stats jsonb default '[]'::jsonb,
  p_point_ledger jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches%rowtype;
  v_home_score integer;
  v_away_score integer;
  v_stat jsonb;
  v_ledger jsonb;
  v_membership_id uuid;
  v_goals integer;
  v_assists integer;
  v_ovr_delta integer;
  v_amount integer;
  v_reason text;
  v_source_type text;
  v_source_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'save_match_result_atomically requires service_role.'
      using errcode = '42501';
  end if;

  if p_score is null or jsonb_typeof(p_score) <> 'object' then
    raise exception 'Score must be a JSON object.';
  end if;

  v_home_score := nullif(p_score->>'home', '')::integer;
  v_away_score := nullif(p_score->>'away', '')::integer;

  if v_home_score is null or v_away_score is null then
    raise exception 'Both home and away scores are required.';
  end if;

  if v_home_score < 0 or v_home_score > 99 or v_away_score < 0 or v_away_score > 99 then
    raise exception 'Scores must be between 0 and 99.';
  end if;

  if coalesce(jsonb_typeof(p_player_stats), 'array') <> 'array' then
    raise exception 'Player stats must be a JSON array.';
  end if;

  if coalesce(jsonb_typeof(p_point_ledger), 'array') <> 'array' then
    raise exception 'Point ledger must be a JSON array.';
  end if;

  select *
    into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found.';
  end if;

  update public.matches
  set our_score = v_home_score,
      opp_score = v_away_score,
      status = 'finished'::public.match_status,
      updated_at = now()
  where id = p_match_id;

  for v_stat in
    select value
    from jsonb_array_elements(coalesce(p_player_stats, '[]'::jsonb)) as entries(value)
  loop
    v_membership_id := nullif(v_stat->>'membershipId', '')::uuid;
    v_goals := coalesce(nullif(v_stat->>'goals', '')::integer, 0);
    v_assists := coalesce(nullif(v_stat->>'assists', '')::integer, 0);
    v_ovr_delta := coalesce(nullif(v_stat->>'ovrDelta', '')::integer, 0);

    if v_membership_id is null then
      raise exception 'Player stat membershipId is required.';
    end if;

    if v_goals < 0 or v_assists < 0 then
      raise exception 'Goals and assists cannot be negative.';
    end if;

    if not private.membership_belongs_to_club(v_match.club_id, v_membership_id) then
      raise exception 'Player stat membership does not belong to the match club.';
    end if;

    insert into public.player_stats (
      match_id,
      membership_id,
      goals,
      assists,
      updated_at
    )
    values (
      p_match_id,
      v_membership_id,
      v_goals,
      v_assists,
      now()
    )
    on conflict (match_id, membership_id) do update
    set goals = excluded.goals,
        assists = excluded.assists,
        updated_at = now();

    update public.team_memberships
    set ovr = least(99, greatest(1, ovr + v_ovr_delta)),
        updated_at = now()
    where id = v_membership_id;
  end loop;

  for v_ledger in
    select value
    from jsonb_array_elements(coalesce(p_point_ledger, '[]'::jsonb)) as entries(value)
  loop
    v_membership_id := nullif(v_ledger->>'membershipId', '')::uuid;
    v_amount := nullif(v_ledger->>'amount', '')::integer;
    v_reason := coalesce(nullif(v_ledger->>'reason', ''), 'match_result');
    v_source_type := coalesce(nullif(v_ledger->>'sourceType', ''), 'match_result');
    v_source_id := coalesce(nullif(v_ledger->>'sourceId', '')::uuid, p_match_id);

    if v_membership_id is null then
      raise exception 'Point ledger membershipId is required.';
    end if;

    if v_amount is null then
      raise exception 'Point ledger amount is required.';
    end if;

    if not private.membership_belongs_to_club(v_match.club_id, v_membership_id) then
      raise exception 'Point ledger membership does not belong to the match club.';
    end if;

    insert into public.point_ledger (
      membership_id,
      amount,
      reason,
      source_type,
      source_id
    )
    values (
      v_membership_id,
      v_amount,
      v_reason,
      v_source_type,
      v_source_id
    );

    update public.team_memberships
    set match_points = match_points + v_amount,
        updated_at = now()
    where id = v_membership_id;
  end loop;
end;
$$;

grant usage on schema private to service_role;
revoke all on function private.save_match_result_atomically(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function private.save_match_result_atomically(uuid, jsonb, jsonb, jsonb) to service_role;

create or replace function public.save_match_result_atomically(
  p_match_id uuid,
  p_score jsonb,
  p_player_stats jsonb default '[]'::jsonb,
  p_point_ledger jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'save_match_result_atomically requires service_role.'
      using errcode = '42501';
  end if;

  perform private.save_match_result_atomically(
    p_match_id,
    p_score,
    p_player_stats,
    p_point_ledger
  );
end;
$$;

revoke all on function public.save_match_result_atomically(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_match_result_atomically(uuid, jsonb, jsonb, jsonb) to service_role;

insert into public.clubs (id, name, slug, description)
values (
  '00000000-0000-0000-0000-000000000001',
  'FC Moim',
  'fcmoim',
  'FC Moim default club for Stage 1 setup.'
)
on conflict (id) do nothing;

insert into public.seasons (id, club_id, name, start_date, end_date, is_active)
values (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  '25/26',
  '2025-09-01',
  '2026-06-30',
  true
)
on conflict (id) do nothing;

-- Transaction candidates for Backend/Data implementation:
-- 1. create_match_with_round: lock active season, calculate next round, insert match.
-- 2. finalize_tactics: verify teams/leaders/attendees, set matches.tactics_completed.
-- 3. save_match_result_atomically: implemented as a service-role RPC above.
