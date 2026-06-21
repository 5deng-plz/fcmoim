alter table public.matches
  add column if not exists feedback_deadline timestamptz;

create table if not exists public.match_mvp_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  voter_membership_id uuid not null references public.team_memberships(id) on delete cascade,
  candidate_membership_id uuid not null references public.team_memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (match_id, voter_membership_id)
);

create index if not exists match_mvp_votes_match_idx
  on public.match_mvp_votes(match_id);

create table if not exists public.match_peer_ratings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  rater_membership_id uuid not null references public.team_memberships(id) on delete cascade,
  ratee_membership_id uuid not null references public.team_memberships(id) on delete cascade,
  rating numeric(3, 1) not null check (rating between 1.0 and 10.0),
  badges text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  check (rater_membership_id <> ratee_membership_id),
  unique (match_id, rater_membership_id, ratee_membership_id)
);

create index if not exists match_peer_ratings_match_idx
  on public.match_peer_ratings(match_id);

create index if not exists match_peer_ratings_ratee_idx
  on public.match_peer_ratings(ratee_membership_id);

alter table public.match_mvp_votes enable row level security;
alter table public.match_peer_ratings enable row level security;

drop policy if exists "Members can read MVP votes for club matches" on public.match_mvp_votes;
create policy "Members can read MVP votes for club matches"
  on public.match_mvp_votes for select
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_mvp_votes.match_id
        and private.is_member_of_club(m.club_id)
    )
  );

drop policy if exists "Members can upsert own MVP votes" on public.match_mvp_votes;
create policy "Members can upsert own MVP votes"
  on public.match_mvp_votes for insert
  with check (
    private.is_current_membership(voter_membership_id)
    and exists (
      select 1
      from public.matches m
      where m.id = match_mvp_votes.match_id
        and private.membership_belongs_to_club(m.club_id, voter_membership_id)
        and private.membership_belongs_to_club(m.club_id, candidate_membership_id)
    )
  );

drop policy if exists "Members can update own MVP votes" on public.match_mvp_votes;
create policy "Members can update own MVP votes"
  on public.match_mvp_votes for update
  using (private.is_current_membership(voter_membership_id))
  with check (
    private.is_current_membership(voter_membership_id)
    and exists (
      select 1
      from public.matches m
      where m.id = match_mvp_votes.match_id
        and private.membership_belongs_to_club(m.club_id, voter_membership_id)
        and private.membership_belongs_to_club(m.club_id, candidate_membership_id)
    )
  );

drop policy if exists "Members can read peer ratings for club matches" on public.match_peer_ratings;
create policy "Members can read peer ratings for club matches"
  on public.match_peer_ratings for select
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_peer_ratings.match_id
        and private.is_member_of_club(m.club_id)
    )
  );

drop policy if exists "Members can upsert own peer ratings" on public.match_peer_ratings;
create policy "Members can upsert own peer ratings"
  on public.match_peer_ratings for insert
  with check (
    private.is_current_membership(rater_membership_id)
    and exists (
      select 1
      from public.matches m
      where m.id = match_peer_ratings.match_id
        and private.membership_belongs_to_club(m.club_id, rater_membership_id)
        and private.membership_belongs_to_club(m.club_id, ratee_membership_id)
    )
  );

drop policy if exists "Members can update own peer ratings" on public.match_peer_ratings;
create policy "Members can update own peer ratings"
  on public.match_peer_ratings for update
  using (private.is_current_membership(rater_membership_id))
  with check (
    private.is_current_membership(rater_membership_id)
    and exists (
      select 1
      from public.matches m
      where m.id = match_peer_ratings.match_id
        and private.membership_belongs_to_club(m.club_id, rater_membership_id)
        and private.membership_belongs_to_club(m.club_id, ratee_membership_id)
    )
  );

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
      feedback_deadline = coalesce(feedback_deadline, now() + interval '24 hours'),
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
