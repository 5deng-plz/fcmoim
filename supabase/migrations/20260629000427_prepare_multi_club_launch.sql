


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."attendance_status" AS ENUM (
    'attend',
    'absent',
    'none'
);


ALTER TYPE "public"."attendance_status" OWNER TO "postgres";


CREATE TYPE "public"."card_grade" AS ENUM (
    'beginner',
    'amateur',
    'semi_pro',
    'pro',
    'legend'
);


ALTER TYPE "public"."card_grade" OWNER TO "postgres";


CREATE TYPE "public"."event_type" AS ENUM (
    'match',
    'vote_match',
    'training',
    'seminar',
    'etc'
);


ALTER TYPE "public"."event_type" OWNER TO "postgres";


CREATE TYPE "public"."match_status" AS ENUM (
    'scheduled',
    'locker_room',
    'finished',
    'cancelled'
);


ALTER TYPE "public"."match_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'suspended',
    'withdrawn'
);


ALTER TYPE "public"."membership_status" OWNER TO "postgres";


CREATE TYPE "public"."position" AS ENUM (
    'FW',
    'MF',
    'DF',
    'GK'
);


ALTER TYPE "public"."position" OWNER TO "postgres";


CREATE TYPE "public"."preferred_foot" AS ENUM (
    'left',
    'right',
    'both'
);


ALTER TYPE "public"."preferred_foot" OWNER TO "postgres";


CREATE TYPE "public"."schedule_poll_status" AS ENUM (
    'open',
    'closed',
    'promoted',
    'cancelled'
);


ALTER TYPE "public"."schedule_poll_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'operator',
    'member'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."comment_target_club_id"("target_type" "text", "target_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case
    when target_type = 'match' then (
      select m.club_id from public.matches m where m.id = target_id
    )
    when target_type = 'schedule_poll_option' then (
      select sp.club_id
      from public.schedule_poll_options spo
      join public.schedule_polls sp on sp.id = spo.poll_id
      where spo.id = target_id
    )
    when target_type = 'feed_post' then (
      select fp.club_id from public.feed_posts fp where fp.id = target_id
    )
    else null
  end;
$$;


ALTER FUNCTION "private"."comment_target_club_id"("target_type" "text", "target_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."guard_membership_privileged_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.account_id is distinct from old.account_id
    or new.club_id is distinct from old.club_id
  then
    raise exception 'Membership account and club cannot be changed.';
  end if;

  if new.role is distinct from old.role
    and not private.has_club_role(old.club_id, array['admin']::public.user_role[])
  then
    raise exception 'Only club admins can change membership roles.';
  end if;

  if (select auth.uid()) = old.account_id
    and not private.has_club_role(old.club_id, array['admin', 'operator']::public.user_role[])
    and (
      new.status is distinct from old.status
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


ALTER FUNCTION "private"."guard_membership_privileged_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_club_role"("target_club_id" "uuid", "allowed_roles" "public"."user_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.account_id = (select auth.uid())
      and tm.club_id = target_club_id
      and tm.status = 'approved'::public.membership_status
      and tm.role = any(allowed_roles)
  );
$$;


ALTER FUNCTION "private"."has_club_role"("target_club_id" "uuid", "allowed_roles" "public"."user_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_comment_target_role"("target_type" "text", "target_id" "uuid", "allowed_roles" "public"."user_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.has_club_role(private.comment_target_club_id(target_type, target_id), allowed_roles);
$$;


ALTER FUNCTION "private"."has_comment_target_role"("target_type" "text", "target_id" "uuid", "allowed_roles" "public"."user_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_match_role"("target_match_id" "uuid", "allowed_roles" "public"."user_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.matches m
    where m.id = target_match_id
      and private.has_club_role(m.club_id, allowed_roles)
  );
$$;


ALTER FUNCTION "private"."has_match_role"("target_match_id" "uuid", "allowed_roles" "public"."user_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_schedule_poll_role"("target_poll_id" "uuid", "allowed_roles" "public"."user_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.schedule_polls sp
    where sp.id = target_poll_id
      and private.has_club_role(sp.club_id, allowed_roles)
  );
$$;


ALTER FUNCTION "private"."has_schedule_poll_role"("target_poll_id" "uuid", "allowed_roles" "public"."user_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_current_account"("target_account_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select (select auth.uid()) = target_account_id;
$$;


ALTER FUNCTION "private"."is_current_account"("target_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_current_membership"("target_membership_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.id = target_membership_id
      and tm.account_id = (select auth.uid())
  );
$$;


ALTER FUNCTION "private"."is_current_membership"("target_membership_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_member_for_comment_target"("target_type" "text", "target_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.is_member_of_club(private.comment_target_club_id(target_type, target_id));
$$;


ALTER FUNCTION "private"."is_member_for_comment_target"("target_type" "text", "target_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_member_for_match"("target_match_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.matches m
    where m.id = target_match_id
      and private.is_member_of_club(m.club_id)
  );
$$;


ALTER FUNCTION "private"."is_member_for_match"("target_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_member_for_schedule_poll"("target_poll_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.schedule_polls sp
    where sp.id = target_poll_id
      and private.is_member_of_club(sp.club_id)
  );
$$;


ALTER FUNCTION "private"."is_member_for_schedule_poll"("target_poll_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_member_of_club"("target_club_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.account_id = (select auth.uid())
      and tm.club_id = target_club_id
      and tm.status = 'approved'::public.membership_status
  );
$$;


ALTER FUNCTION "private"."is_member_of_club"("target_club_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_schedule_poll_open"("target_poll_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.schedule_polls sp
    where sp.id = target_poll_id
      and sp.status = 'open'::public.schedule_poll_status
      and (sp.closes_at is null or sp.closes_at > now())
  );
$$;


ALTER FUNCTION "private"."is_schedule_poll_open"("target_poll_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."membership_belongs_to_club"("target_club_id" "uuid", "target_membership_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.id = target_membership_id
      and tm.club_id = target_club_id
      and tm.status = 'approved'::public.membership_status
  );
$$;


ALTER FUNCTION "private"."membership_belongs_to_club"("target_club_id" "uuid", "target_membership_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."membership_can_comment_on_target"("target_type" "text", "target_id" "uuid", "target_membership_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.id = target_membership_id
      and tm.status = 'approved'::public.membership_status
      and tm.club_id = private.comment_target_club_id(target_type, target_id)
  );
$$;


ALTER FUNCTION "private"."membership_can_comment_on_target"("target_type" "text", "target_id" "uuid", "target_membership_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."membership_can_participate_in_match"("target_match_id" "uuid", "target_membership_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.matches m
    join public.team_memberships tm on tm.club_id = m.club_id
    where m.id = target_match_id
      and tm.id = target_membership_id
      and tm.status = 'approved'::public.membership_status
  );
$$;


ALTER FUNCTION "private"."membership_can_participate_in_match"("target_match_id" "uuid", "target_membership_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."membership_can_vote_schedule_poll"("target_poll_id" "uuid", "target_membership_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."membership_can_vote_schedule_poll"("target_poll_id" "uuid", "target_membership_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."save_match_result_atomically"("p_match_id" "uuid", "p_score" "jsonb", "p_player_stats" "jsonb" DEFAULT '[]'::"jsonb", "p_point_ledger" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."save_match_result_atomically"("p_match_id" "uuid", "p_score" "jsonb", "p_player_stats" "jsonb", "p_point_ledger" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."schedule_poll_option_belongs_to_poll"("target_poll_id" "uuid", "target_option_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.schedule_poll_options spo
    where spo.poll_id = target_poll_id
      and spo.id = target_option_id
  );
$$;


ALTER FUNCTION "private"."schedule_poll_option_belongs_to_poll"("target_poll_id" "uuid", "target_option_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "private"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_club_with_owner"("p_account_id" "uuid", "p_email" "text", "p_name" "text", "p_slug" "text", "p_description" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_description text := btrim(coalesce(p_description, ''));
  v_owned_count integer := 0;
  v_club_id uuid;
  v_profile_name text;
  v_year integer := extract(year from now())::integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'create_club_with_owner requires service_role.'
      using errcode = '42501';
  end if;

  if p_account_id is null then
    raise exception 'account_id is required.'
      using errcode = '22023';
  end if;

  if char_length(v_name) < 3 or char_length(v_name) > 50 then
    raise exception 'team_name_invalid'
      using errcode = '22023';
  end if;

  if char_length(v_slug) < 3 or char_length(v_slug) > 50 or v_slug !~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$' then
    raise exception 'club_slug_invalid'
      using errcode = '22023';
  end if;

  if char_length(v_description) < 1 or char_length(v_description) > 200 then
    raise exception 'club_description_invalid'
      using errcode = '22023';
  end if;

  insert into public.accounts (id)
  values (p_account_id)
  on conflict (id) do nothing;

  select count(*)
    into v_owned_count
  from public.clubs
  where created_by = p_account_id;

  if v_owned_count >= 2 then
    raise exception 'club_owner_limit_exceeded'
      using errcode = 'P0001';
  end if;

  insert into public.clubs (name, slug, description, created_by)
  values (v_name, v_slug, v_description, p_account_id)
  returning id into v_club_id;

  insert into public.seasons (club_id, name, start_date, end_date, is_active)
  values (
    v_club_id,
    v_year::text || ' 시즌',
    make_date(v_year, 1, 1),
    make_date(v_year, 12, 31),
    true
  );

  select coalesce(
      nullif(btrim(display_name), ''),
      nullif(split_part(coalesce(p_email, ''), '@', 1), ''),
      '관리자'
    )
    into v_profile_name
  from public.accounts
  where id = p_account_id;

  insert into public.team_memberships (
    account_id,
    club_id,
    profile_name,
    role,
    status
  )
  values (
    p_account_id,
    v_club_id,
    v_profile_name,
    'admin'::public.user_role,
    'approved'::public.membership_status
  );

  return v_club_id;
end;
$_$;


ALTER FUNCTION "public"."create_club_with_owner"("p_account_id" "uuid", "p_email" "text", "p_name" "text", "p_slug" "text", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_trait"("p_account_id" "uuid", "p_club_id" "uuid", "p_trait_id" "text") RETURNS TABLE("membership_id" "uuid", "trait_id" "text", "remaining_points" integer, "already_unlocked" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_membership public.team_memberships%rowtype;
  v_trait public.trait_catalog%rowtype;
begin
  select *
    into v_membership
    from public.team_memberships
   where account_id = p_account_id
     and club_id = p_club_id
     and status = 'approved'
   for update;

  if not found then
    raise exception 'Approved membership is required.';
  end if;

  select *
    into v_trait
    from public.trait_catalog
   where trait_catalog.trait_id = p_trait_id
     and is_default = false;

  if not found then
    raise exception 'Purchasable trait was not found.';
  end if;

  if exists (
    select 1
      from public.unlocked_traits
     where unlocked_traits.membership_id = v_membership.id
       and unlocked_traits.trait_id = p_trait_id
  ) then
    return query select v_membership.id, p_trait_id, v_membership.match_points, true;
    return;
  end if;

  if v_membership.match_points < v_trait.price then
    raise exception 'Not enough match points.';
  end if;

  update public.team_memberships
     set match_points = match_points - v_trait.price
   where id = v_membership.id
   returning * into v_membership;

  insert into public.unlocked_traits (membership_id, trait_id)
  values (v_membership.id, p_trait_id);

  insert into public.point_ledger (
    membership_id,
    amount,
    reason,
    source_type,
    source_id
  )
  values (
    v_membership.id,
    -v_trait.price,
    'shop_purchase',
    'trait_shop',
    null
  );

  return query select v_membership.id, p_trait_id, v_membership.match_points, false;
end;
$$;


ALTER FUNCTION "public"."purchase_trait"("p_account_id" "uuid", "p_club_id" "uuid", "p_trait_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_match_result_atomically"("p_match_id" "uuid", "p_score" "jsonb", "p_player_stats" "jsonb" DEFAULT '[]'::"jsonb", "p_point_ledger" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."save_match_result_atomically"("p_match_id" "uuid", "p_score" "jsonb", "p_player_stats" "jsonb", "p_point_ledger" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "club_id" "uuid" NOT NULL,
    "season_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "author_membership_id" "uuid",
    "is_pinned" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "status" "public"."attendance_status" DEFAULT 'none'::"public"."attendance_status" NOT NULL,
    "responded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."attendances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clubs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "is_public" boolean DEFAULT true NOT NULL,
    "logo_url" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "clubs_slug_format" CHECK (("slug" ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'::"text"))
);


ALTER TABLE "public"."clubs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "comments_content_check" CHECK ((("char_length"("content") >= 1) AND ("char_length"("content") <= 1000))),
    CONSTRAINT "comments_target_type_check" CHECK (("target_type" = ANY (ARRAY['match'::"text", 'schedule_poll_option'::"text", 'feed_post'::"text"])))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fcm_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "device_info" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fcm_tokens_device_info_object" CHECK (("jsonb_typeof"("device_info") = 'object'::"text"))
);


ALTER TABLE "public"."fcm_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feed_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "club_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "match_id" "uuid",
    "content_type" "text" NOT NULL,
    "text_content" "text",
    "media_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feed_posts_content_type_check" CHECK (("content_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'video'::"text"]))),
    CONSTRAINT "feed_posts_text_content_check" CHECK ((("text_content" IS NULL) OR ("char_length"("text_content") <= 500)))
);


ALTER TABLE "public"."feed_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feed_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "reaction_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feed_reactions_reaction_type_check" CHECK (("reaction_type" = ANY (ARRAY['up'::"text", 'down'::"text", 'check'::"text", 'smile'::"text", 'sad'::"text"])))
);


ALTER TABLE "public"."feed_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locker_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "card_name" "text" NOT NULL,
    "card_effect" "text" NOT NULL,
    "grade" "public"."card_grade" DEFAULT 'beginner'::"public"."card_grade" NOT NULL,
    "is_equipped" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."locker_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_mvp_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "voter_membership_id" "uuid" NOT NULL,
    "candidate_membership_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."match_mvp_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_peer_ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "rater_membership_id" "uuid" NOT NULL,
    "ratee_membership_id" "uuid" NOT NULL,
    "rating" numeric(3,1) NOT NULL,
    "badges" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "match_peer_ratings_check" CHECK (("rater_membership_id" <> "ratee_membership_id")),
    CONSTRAINT "match_peer_ratings_rating_check" CHECK ((("rating" >= 1.0) AND ("rating" <= 10.0)))
);


ALTER TABLE "public"."match_peer_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "team_number" integer NOT NULL,
    "is_leader" boolean DEFAULT false NOT NULL,
    "position" "public"."position" NOT NULL,
    "formation_slot" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "match_teams_formation_slot_check" CHECK ((("formation_slot" >= 0) AND ("formation_slot" <= 35))),
    CONSTRAINT "match_teams_team_number_check" CHECK (("team_number" = ANY (ARRAY[1, 2])))
);


ALTER TABLE "public"."match_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "club_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "round" integer,
    "title" "text" NOT NULL,
    "date" timestamp with time zone NOT NULL,
    "location" "text" NOT NULL,
    "type" "public"."event_type" DEFAULT 'match'::"public"."event_type" NOT NULL,
    "status" "public"."match_status" DEFAULT 'scheduled'::"public"."match_status" NOT NULL,
    "our_score" integer,
    "opp_score" integer,
    "tactics_completed" boolean DEFAULT false NOT NULL,
    "red_leader_confirmed" boolean DEFAULT false NOT NULL,
    "blue_leader_confirmed" boolean DEFAULT false NOT NULL,
    "memo" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "cancellation_reason" "text",
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "feedback_deadline" timestamp with time zone,
    CONSTRAINT "matches_opp_score_check" CHECK ((("opp_score" IS NULL) OR (("opp_score" >= 0) AND ("opp_score" <= 99)))),
    CONSTRAINT "matches_our_score_check" CHECK ((("our_score" IS NULL) OR (("our_score" >= 0) AND ("our_score" <= 99))))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "awarded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."membership_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "target_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "notifications_metadata_object" CHECK (("jsonb_typeof"("metadata") = 'object'::"text"))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "goals" integer DEFAULT 0 NOT NULL,
    "assists" integer DEFAULT 0 NOT NULL,
    "is_mom" boolean DEFAULT false NOT NULL,
    "ai_rating" numeric(3,1),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "player_stats_ai_rating_check" CHECK ((("ai_rating" IS NULL) OR (("ai_rating" >= (0)::numeric) AND ("ai_rating" <= (10)::numeric)))),
    CONSTRAINT "player_stats_assists_check" CHECK (("assists" >= 0)),
    CONSTRAINT "player_stats_goals_check" CHECK (("goals" >= 0))
);


ALTER TABLE "public"."player_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."point_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "reason" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."point_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reward_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "club_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reward_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_poll_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "poll_id" "uuid" NOT NULL,
    "option_date" "date" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "schedule_poll_options_sort_order_check" CHECK ((("sort_order" >= 0) AND ("sort_order" <= 99)))
);


ALTER TABLE "public"."schedule_poll_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_poll_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "poll_id" "uuid" NOT NULL,
    "option_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "is_available" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."schedule_poll_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_polls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "club_id" "uuid" NOT NULL,
    "season_id" "uuid",
    "title" "text" NOT NULL,
    "status" "public"."schedule_poll_status" DEFAULT 'open'::"public"."schedule_poll_status" NOT NULL,
    "common_time" time without time zone NOT NULL,
    "location" "text" NOT NULL,
    "memo" "text",
    "closes_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "cancellation_reason" "text",
    "cancelled_at" timestamp with time zone,
    "promoted_match_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "schedule_polls_closes_after_created" CHECK ((("closes_at" IS NULL) OR ("closes_at" > "created_at"))),
    CONSTRAINT "schedule_polls_location_check" CHECK ((("char_length"("btrim"("location")) >= 1) AND ("char_length"("btrim"("location")) <= 120))),
    CONSTRAINT "schedule_polls_title_check" CHECK ((("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 120)))
);


ALTER TABLE "public"."schedule_polls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "club_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "seasons_valid_range" CHECK (("start_date" <= "end_date"))
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "club_id" "uuid" NOT NULL,
    "profile_name" "text" NOT NULL,
    "main_position" "public"."position" DEFAULT 'MF'::"public"."position" NOT NULL,
    "sub_position" "public"."position",
    "ovr" integer DEFAULT 60 NOT NULL,
    "stats" "jsonb" DEFAULT '{"speed": 60, "attack": 60, "manner": 60, "defense": 60, "stamina": 60, "mentality": 60}'::"jsonb" NOT NULL,
    "match_points" integer DEFAULT 100 NOT NULL,
    "photo_url" "text",
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role" NOT NULL,
    "status" "public"."membership_status" DEFAULT 'pending'::"public"."membership_status" NOT NULL,
    "height" integer,
    "weight" integer,
    "birth" "date",
    "residence" "text",
    "preferred_foot" "public"."preferred_foot" DEFAULT 'right'::"public"."preferred_foot" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "selected_trait_id" "text",
    CONSTRAINT "team_memberships_birth_check" CHECK ((("birth" IS NULL) OR ("birth" <= CURRENT_DATE))),
    CONSTRAINT "team_memberships_height_check" CHECK ((("height" IS NULL) OR (("height" >= 100) AND ("height" <= 230)))),
    CONSTRAINT "team_memberships_match_points_check" CHECK (("match_points" >= 0)),
    CONSTRAINT "team_memberships_ovr_check" CHECK ((("ovr" >= 1) AND ("ovr" <= 99))),
    CONSTRAINT "team_memberships_profile_name_check" CHECK ((("char_length"("btrim"("profile_name")) >= 1) AND ("char_length"("btrim"("profile_name")) <= 50))),
    CONSTRAINT "team_memberships_residence_check" CHECK ((("residence" IS NULL) OR (("char_length"("btrim"("residence")) >= 1) AND ("char_length"("btrim"("residence")) <= 80)))),
    CONSTRAINT "team_memberships_residence_length" CHECK ((("residence" IS NULL) OR (("char_length"("btrim"("residence")) >= 1) AND ("char_length"("btrim"("residence")) <= 80)))),
    CONSTRAINT "team_memberships_stats_object" CHECK (("jsonb_typeof"("stats") = 'object'::"text")),
    CONSTRAINT "team_memberships_weight_check" CHECK ((("weight" IS NULL) OR (("weight" >= 30) AND ("weight" <= 180))))
);


ALTER TABLE "public"."team_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trait_catalog" (
    "trait_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "grade" "text" NOT NULL,
    "category" "text" NOT NULL,
    "position_group" "text" NOT NULL,
    "price" integer NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "display_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trait_catalog_grade_check" CHECK (("grade" = ANY (ARRAY['amateur'::"text", 'semi-pro'::"text", 'pro'::"text", 'legend'::"text"]))),
    CONSTRAINT "trait_catalog_position_group_check" CHECK (("position_group" = ANY (ARRAY['FW'::"text", 'MF'::"text", 'DF'::"text", 'GK'::"text", 'ALL'::"text"]))),
    CONSTRAINT "trait_catalog_price_check" CHECK (("price" >= 0))
);


ALTER TABLE "public"."trait_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unlocked_traits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "trait_id" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."unlocked_traits" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_match_id_membership_id_key" UNIQUE ("match_id", "membership_id");



ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fcm_tokens"
    ADD CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fcm_tokens"
    ADD CONSTRAINT "fcm_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."feed_posts"
    ADD CONSTRAINT "feed_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feed_reactions"
    ADD CONSTRAINT "feed_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feed_reactions"
    ADD CONSTRAINT "feed_reactions_post_id_membership_id_reaction_type_key" UNIQUE ("post_id", "membership_id", "reaction_type");



ALTER TABLE ONLY "public"."locker_items"
    ADD CONSTRAINT "locker_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_mvp_votes"
    ADD CONSTRAINT "match_mvp_votes_match_id_voter_membership_id_key" UNIQUE ("match_id", "voter_membership_id");



ALTER TABLE ONLY "public"."match_mvp_votes"
    ADD CONSTRAINT "match_mvp_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_peer_ratings"
    ADD CONSTRAINT "match_peer_ratings_match_id_rater_membership_id_ratee_membe_key" UNIQUE ("match_id", "rater_membership_id", "ratee_membership_id");



ALTER TABLE ONLY "public"."match_peer_ratings"
    ADD CONSTRAINT "match_peer_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_teams"
    ADD CONSTRAINT "match_teams_match_id_membership_id_key" UNIQUE ("match_id", "membership_id");



ALTER TABLE ONLY "public"."match_teams"
    ADD CONSTRAINT "match_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_badges"
    ADD CONSTRAINT "membership_badges_membership_id_badge_id_key" UNIQUE ("membership_id", "badge_id");



ALTER TABLE ONLY "public"."membership_badges"
    ADD CONSTRAINT "membership_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_stats"
    ADD CONSTRAINT "player_stats_match_id_membership_id_key" UNIQUE ("match_id", "membership_id");



ALTER TABLE ONLY "public"."player_stats"
    ADD CONSTRAINT "player_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."point_ledger"
    ADD CONSTRAINT "point_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_badges"
    ADD CONSTRAINT "reward_badges_club_id_code_key" UNIQUE ("club_id", "code");



ALTER TABLE ONLY "public"."reward_badges"
    ADD CONSTRAINT "reward_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_poll_options"
    ADD CONSTRAINT "schedule_poll_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_poll_options"
    ADD CONSTRAINT "schedule_poll_options_poll_id_id_key" UNIQUE ("poll_id", "id");



ALTER TABLE ONLY "public"."schedule_poll_options"
    ADD CONSTRAINT "schedule_poll_options_poll_id_option_date_key" UNIQUE ("poll_id", "option_date");



ALTER TABLE ONLY "public"."schedule_poll_votes"
    ADD CONSTRAINT "schedule_poll_votes_option_id_membership_id_key" UNIQUE ("option_id", "membership_id");



ALTER TABLE ONLY "public"."schedule_poll_votes"
    ADD CONSTRAINT "schedule_poll_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_polls"
    ADD CONSTRAINT "schedule_polls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_memberships"
    ADD CONSTRAINT "team_memberships_account_id_club_id_key" UNIQUE ("account_id", "club_id");



ALTER TABLE ONLY "public"."team_memberships"
    ADD CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trait_catalog"
    ADD CONSTRAINT "trait_catalog_pkey" PRIMARY KEY ("trait_id");



ALTER TABLE ONLY "public"."unlocked_traits"
    ADD CONSTRAINT "unlocked_traits_membership_id_trait_id_key" UNIQUE ("membership_id", "trait_id");



ALTER TABLE ONLY "public"."unlocked_traits"
    ADD CONSTRAINT "unlocked_traits_pkey" PRIMARY KEY ("id");



CREATE INDEX "announcements_author_membership_idx" ON "public"."announcements" USING "btree" ("author_membership_id");



CREATE INDEX "announcements_club_pinned_idx" ON "public"."announcements" USING "btree" ("club_id", "is_pinned" DESC, "created_at" DESC);



CREATE INDEX "announcements_season_idx" ON "public"."announcements" USING "btree" ("season_id");



CREATE INDEX "attendances_membership_idx" ON "public"."attendances" USING "btree" ("membership_id");



CREATE INDEX "clubs_created_by_idx" ON "public"."clubs" USING "btree" ("created_by");



CREATE INDEX "comments_membership_idx" ON "public"."comments" USING "btree" ("membership_id");



CREATE INDEX "comments_target_created_idx" ON "public"."comments" USING "btree" ("target_type", "target_id", "created_at");



CREATE INDEX "fcm_tokens_account_last_seen_idx" ON "public"."fcm_tokens" USING "btree" ("account_id", "last_seen_at" DESC);



CREATE INDEX "feed_posts_club_created_idx" ON "public"."feed_posts" USING "btree" ("club_id", "created_at" DESC);



CREATE INDEX "feed_reactions_post_idx" ON "public"."feed_reactions" USING "btree" ("post_id");



CREATE INDEX "locker_items_membership_idx" ON "public"."locker_items" USING "btree" ("membership_id");



CREATE INDEX "match_mvp_votes_match_idx" ON "public"."match_mvp_votes" USING "btree" ("match_id");



CREATE INDEX "match_peer_ratings_match_idx" ON "public"."match_peer_ratings" USING "btree" ("match_id");



CREATE INDEX "match_peer_ratings_ratee_idx" ON "public"."match_peer_ratings" USING "btree" ("ratee_membership_id");



CREATE INDEX "match_teams_membership_idx" ON "public"."match_teams" USING "btree" ("membership_id");



CREATE INDEX "matches_club_date_idx" ON "public"."matches" USING "btree" ("club_id", "date");



CREATE INDEX "matches_created_by_idx" ON "public"."matches" USING "btree" ("created_by");



CREATE UNIQUE INDEX "matches_one_match_per_club_kst_date" ON "public"."matches" USING "btree" ("club_id", ((("date" AT TIME ZONE 'Asia/Seoul'::"text"))::"date")) WHERE (("type" = 'match'::"public"."event_type") AND ("status" <> 'cancelled'::"public"."match_status"));



CREATE INDEX "matches_season_date_idx" ON "public"."matches" USING "btree" ("season_id", "date");



CREATE UNIQUE INDEX "matches_unique_round_per_season" ON "public"."matches" USING "btree" ("season_id", "round") WHERE ("round" IS NOT NULL);



CREATE INDEX "membership_badges_badge_idx" ON "public"."membership_badges" USING "btree" ("badge_id");



CREATE INDEX "notifications_membership_read_idx" ON "public"."notifications" USING "btree" ("membership_id", "is_read", "created_at" DESC);



CREATE INDEX "notifications_membership_unread_idx" ON "public"."notifications" USING "btree" ("membership_id", "is_read", "created_at" DESC);



CREATE INDEX "player_stats_membership_idx" ON "public"."player_stats" USING "btree" ("membership_id");



CREATE INDEX "point_ledger_membership_created_idx" ON "public"."point_ledger" USING "btree" ("membership_id", "created_at" DESC);



CREATE INDEX "schedule_poll_options_poll_date_idx" ON "public"."schedule_poll_options" USING "btree" ("poll_id", "option_date");



CREATE INDEX "schedule_poll_votes_membership_idx" ON "public"."schedule_poll_votes" USING "btree" ("membership_id");



CREATE INDEX "schedule_poll_votes_option_idx" ON "public"."schedule_poll_votes" USING "btree" ("option_id");



CREATE INDEX "schedule_poll_votes_poll_membership_idx" ON "public"."schedule_poll_votes" USING "btree" ("poll_id", "membership_id");



CREATE INDEX "schedule_poll_votes_poll_option_idx" ON "public"."schedule_poll_votes" USING "btree" ("poll_id", "option_id");



CREATE INDEX "schedule_polls_club_status_idx" ON "public"."schedule_polls" USING "btree" ("club_id", "status", "created_at" DESC);



CREATE INDEX "schedule_polls_created_by_idx" ON "public"."schedule_polls" USING "btree" ("created_by");



CREATE INDEX "schedule_polls_promoted_match_idx" ON "public"."schedule_polls" USING "btree" ("promoted_match_id");



CREATE INDEX "schedule_polls_season_idx" ON "public"."schedule_polls" USING "btree" ("season_id");



CREATE UNIQUE INDEX "seasons_one_active_per_club" ON "public"."seasons" USING "btree" ("club_id") WHERE "is_active";



CREATE INDEX "team_memberships_club_role_idx" ON "public"."team_memberships" USING "btree" ("club_id", "role");



CREATE INDEX "team_memberships_club_status_idx" ON "public"."team_memberships" USING "btree" ("club_id", "status");



CREATE INDEX "unlocked_traits_membership_idx" ON "public"."unlocked_traits" USING "btree" ("membership_id", "unlocked_at" DESC);



CREATE OR REPLACE TRIGGER "accounts_touch_updated_at" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "announcements_touch_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "attendances_touch_updated_at" BEFORE UPDATE ON "public"."attendances" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "clubs_touch_updated_at" BEFORE UPDATE ON "public"."clubs" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "comments_touch_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "fcm_tokens_touch_updated_at" BEFORE UPDATE ON "public"."fcm_tokens" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "feed_posts_touch_updated_at" BEFORE UPDATE ON "public"."feed_posts" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "locker_items_touch_updated_at" BEFORE UPDATE ON "public"."locker_items" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "match_teams_touch_updated_at" BEFORE UPDATE ON "public"."match_teams" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "matches_touch_updated_at" BEFORE UPDATE ON "public"."matches" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "notifications_touch_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "player_stats_touch_updated_at" BEFORE UPDATE ON "public"."player_stats" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "reward_badges_touch_updated_at" BEFORE UPDATE ON "public"."reward_badges" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "schedule_poll_votes_touch_updated_at" BEFORE UPDATE ON "public"."schedule_poll_votes" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "schedule_polls_touch_updated_at" BEFORE UPDATE ON "public"."schedule_polls" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "seasons_touch_updated_at" BEFORE UPDATE ON "public"."seasons" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "team_memberships_guard_privileged_fields" BEFORE UPDATE ON "public"."team_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."guard_membership_privileged_fields"();



CREATE OR REPLACE TRIGGER "team_memberships_touch_updated_at" BEFORE UPDATE ON "public"."team_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fcm_tokens"
    ADD CONSTRAINT "fcm_tokens_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feed_posts"
    ADD CONSTRAINT "feed_posts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feed_posts"
    ADD CONSTRAINT "feed_posts_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feed_posts"
    ADD CONSTRAINT "feed_posts_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feed_reactions"
    ADD CONSTRAINT "feed_reactions_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feed_reactions"
    ADD CONSTRAINT "feed_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locker_items"
    ADD CONSTRAINT "locker_items_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_mvp_votes"
    ADD CONSTRAINT "match_mvp_votes_candidate_membership_id_fkey" FOREIGN KEY ("candidate_membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_mvp_votes"
    ADD CONSTRAINT "match_mvp_votes_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_mvp_votes"
    ADD CONSTRAINT "match_mvp_votes_voter_membership_id_fkey" FOREIGN KEY ("voter_membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_peer_ratings"
    ADD CONSTRAINT "match_peer_ratings_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_peer_ratings"
    ADD CONSTRAINT "match_peer_ratings_ratee_membership_id_fkey" FOREIGN KEY ("ratee_membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_peer_ratings"
    ADD CONSTRAINT "match_peer_ratings_rater_membership_id_fkey" FOREIGN KEY ("rater_membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_teams"
    ADD CONSTRAINT "match_teams_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_teams"
    ADD CONSTRAINT "match_teams_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."team_memberships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."team_memberships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."membership_badges"
    ADD CONSTRAINT "membership_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."reward_badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."membership_badges"
    ADD CONSTRAINT "membership_badges_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_stats"
    ADD CONSTRAINT "player_stats_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_stats"
    ADD CONSTRAINT "player_stats_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."point_ledger"
    ADD CONSTRAINT "point_ledger_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_badges"
    ADD CONSTRAINT "reward_badges_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_poll_options"
    ADD CONSTRAINT "schedule_poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "public"."schedule_polls"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_poll_votes"
    ADD CONSTRAINT "schedule_poll_votes_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_poll_votes"
    ADD CONSTRAINT "schedule_poll_votes_option_poll_fk" FOREIGN KEY ("poll_id", "option_id") REFERENCES "public"."schedule_poll_options"("poll_id", "id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_poll_votes"
    ADD CONSTRAINT "schedule_poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "public"."schedule_polls"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_polls"
    ADD CONSTRAINT "schedule_polls_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_polls"
    ADD CONSTRAINT "schedule_polls_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."team_memberships"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."schedule_polls"
    ADD CONSTRAINT "schedule_polls_promoted_match_id_fkey" FOREIGN KEY ("promoted_match_id") REFERENCES "public"."matches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."schedule_polls"
    ADD CONSTRAINT "schedule_polls_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."schedule_polls"
    ADD CONSTRAINT "schedule_polls_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."team_memberships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_memberships"
    ADD CONSTRAINT "team_memberships_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_memberships"
    ADD CONSTRAINT "team_memberships_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."unlocked_traits"
    ADD CONSTRAINT "unlocked_traits_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."unlocked_traits"
    ADD CONSTRAINT "unlocked_traits_trait_id_fkey" FOREIGN KEY ("trait_id") REFERENCES "public"."trait_catalog"("trait_id") ON DELETE RESTRICT;



CREATE POLICY "Accounts can create own account" ON "public"."accounts" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_current_account"("id"));



CREATE POLICY "Accounts can read own account" ON "public"."accounts" FOR SELECT TO "authenticated" USING ("private"."is_current_account"("id"));



CREATE POLICY "Accounts can update own account" ON "public"."accounts" FOR UPDATE TO "authenticated" USING ("private"."is_current_account"("id")) WITH CHECK ("private"."is_current_account"("id"));



CREATE POLICY "Anyone can read club catalog" ON "public"."clubs" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Anyone can read trait catalog" ON "public"."trait_catalog" FOR SELECT USING (true);



CREATE POLICY "Approved members and operators can read reward badges" ON "public"."reward_badges" FOR SELECT TO "authenticated" USING ((("club_id" IS NULL) OR "private"."is_member_of_club"("club_id") OR "private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])));



CREATE POLICY "Approved members can read announcements" ON "public"."announcements" FOR SELECT TO "authenticated" USING ("private"."is_member_of_club"("club_id"));



CREATE POLICY "Approved members can read attendances" ON "public"."attendances" FOR SELECT TO "authenticated" USING ("private"."is_member_for_match"("match_id"));



CREATE POLICY "Approved members can read comments" ON "public"."comments" FOR SELECT TO "authenticated" USING ("private"."is_member_for_comment_target"("target_type", "target_id"));



CREATE POLICY "Approved members can read feed posts" ON "public"."feed_posts" FOR SELECT USING ("private"."is_member_of_club"("club_id"));



CREATE POLICY "Approved members can read feed reactions" ON "public"."feed_reactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."feed_posts" "fp"
  WHERE (("fp"."id" = "feed_reactions"."post_id") AND "private"."is_member_of_club"("fp"."club_id")))));



CREATE POLICY "Approved members can read locker items" ON "public"."locker_items" FOR SELECT TO "authenticated" USING (("private"."is_current_membership"("membership_id") OR (EXISTS ( SELECT 1
   FROM "public"."team_memberships" "owner"
  WHERE (("owner"."id" = "locker_items"."membership_id") AND "private"."is_member_of_club"("owner"."club_id"))))));



CREATE POLICY "Approved members can read match teams" ON "public"."match_teams" FOR SELECT TO "authenticated" USING ("private"."is_member_for_match"("match_id"));



CREATE POLICY "Approved members can read matches" ON "public"."matches" FOR SELECT TO "authenticated" USING ("private"."is_member_of_club"("club_id"));



CREATE POLICY "Approved members can read player stats" ON "public"."player_stats" FOR SELECT TO "authenticated" USING ("private"."is_member_for_match"("match_id"));



CREATE POLICY "Approved members can read schedule poll options" ON "public"."schedule_poll_options" FOR SELECT TO "authenticated" USING ("private"."is_member_for_schedule_poll"("poll_id"));



CREATE POLICY "Approved members can read schedule poll votes" ON "public"."schedule_poll_votes" FOR SELECT TO "authenticated" USING ("private"."is_member_for_schedule_poll"("poll_id"));



CREATE POLICY "Approved members can read schedule polls" ON "public"."schedule_polls" FOR SELECT TO "authenticated" USING ("private"."is_member_of_club"("club_id"));



CREATE POLICY "Approved members can read seasons" ON "public"."seasons" FOR SELECT TO "authenticated" USING ("private"."is_member_of_club"("club_id"));



CREATE POLICY "Club operators can delete announcements" ON "public"."announcements" FOR DELETE TO "authenticated" USING ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can delete match teams" ON "public"."match_teams" FOR DELETE TO "authenticated" USING ("private"."has_match_role"("match_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can delete matches" ON "public"."matches" FOR DELETE TO "authenticated" USING ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can delete memberships" ON "public"."team_memberships" FOR DELETE TO "authenticated" USING ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can delete player stats" ON "public"."player_stats" FOR DELETE TO "authenticated" USING ("private"."has_match_role"("match_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can delete reward badges" ON "public"."reward_badges" FOR DELETE TO "authenticated" USING ((("club_id" IS NOT NULL) AND "private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])));



CREATE POLICY "Club operators can delete schedule poll options" ON "public"."schedule_poll_options" FOR DELETE TO "authenticated" USING ("private"."has_schedule_poll_role"("poll_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can delete schedule polls" ON "public"."schedule_polls" FOR DELETE TO "authenticated" USING ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can delete seasons" ON "public"."seasons" FOR DELETE TO "authenticated" USING ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can insert announcements" ON "public"."announcements" FOR INSERT TO "authenticated" WITH CHECK ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can insert match teams" ON "public"."match_teams" FOR INSERT TO "authenticated" WITH CHECK (("private"."has_match_role"("match_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]) AND "private"."membership_can_participate_in_match"("match_id", "membership_id")));



CREATE POLICY "Club operators can insert matches" ON "public"."matches" FOR INSERT TO "authenticated" WITH CHECK ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can insert player stats" ON "public"."player_stats" FOR INSERT TO "authenticated" WITH CHECK (("private"."has_match_role"("match_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]) AND "private"."membership_can_participate_in_match"("match_id", "membership_id")));



CREATE POLICY "Club operators can insert reward badges" ON "public"."reward_badges" FOR INSERT TO "authenticated" WITH CHECK ((("club_id" IS NOT NULL) AND "private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])));



CREATE POLICY "Club operators can insert schedule poll options" ON "public"."schedule_poll_options" FOR INSERT TO "authenticated" WITH CHECK ("private"."has_schedule_poll_role"("poll_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can insert schedule polls" ON "public"."schedule_polls" FOR INSERT TO "authenticated" WITH CHECK (("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]) AND "private"."is_current_membership"("created_by") AND "private"."membership_belongs_to_club"("club_id", "created_by")));



CREATE POLICY "Club operators can insert seasons" ON "public"."seasons" FOR INSERT TO "authenticated" WITH CHECK ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can update announcements" ON "public"."announcements" FOR UPDATE TO "authenticated" USING ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])) WITH CHECK ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can update clubs" ON "public"."clubs" FOR UPDATE TO "authenticated" USING ("private"."has_club_role"("id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])) WITH CHECK ("private"."has_club_role"("id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can update match teams" ON "public"."match_teams" FOR UPDATE TO "authenticated" USING ("private"."has_match_role"("match_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])) WITH CHECK (("private"."has_match_role"("match_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]) AND "private"."membership_can_participate_in_match"("match_id", "membership_id")));



CREATE POLICY "Club operators can update matches" ON "public"."matches" FOR UPDATE TO "authenticated" USING ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])) WITH CHECK ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can update player stats" ON "public"."player_stats" FOR UPDATE TO "authenticated" USING ("private"."has_match_role"("match_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])) WITH CHECK (("private"."has_match_role"("match_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]) AND "private"."membership_can_participate_in_match"("match_id", "membership_id")));



CREATE POLICY "Club operators can update reward badges" ON "public"."reward_badges" FOR UPDATE TO "authenticated" USING ((("club_id" IS NOT NULL) AND "private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]))) WITH CHECK ((("club_id" IS NOT NULL) AND "private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])));



CREATE POLICY "Club operators can update schedule poll options" ON "public"."schedule_poll_options" FOR UPDATE TO "authenticated" USING ("private"."has_schedule_poll_role"("poll_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])) WITH CHECK ("private"."has_schedule_poll_role"("poll_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Club operators can update schedule polls" ON "public"."schedule_polls" FOR UPDATE TO "authenticated" USING ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])) WITH CHECK (("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]) AND "private"."membership_belongs_to_club"("club_id", "created_by")));



CREATE POLICY "Club operators can update seasons" ON "public"."seasons" FOR UPDATE TO "authenticated" USING ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])) WITH CHECK ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]));



CREATE POLICY "Members and operators can delete comments" ON "public"."comments" FOR DELETE TO "authenticated" USING (("private"."is_current_membership"("membership_id") OR "private"."has_comment_target_role"("target_type", "target_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])));



CREATE POLICY "Members can create comments" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_current_membership"("membership_id") AND "private"."membership_can_comment_on_target"("target_type", "target_id", "membership_id")));



CREATE POLICY "Members can create own feed posts" ON "public"."feed_posts" FOR INSERT WITH CHECK (("private"."is_current_membership"("membership_id") AND "private"."membership_belongs_to_club"("club_id", "membership_id")));



CREATE POLICY "Members can create own feed reactions" ON "public"."feed_reactions" FOR INSERT WITH CHECK (("private"."is_current_membership"("membership_id") AND (EXISTS ( SELECT 1
   FROM "public"."feed_posts" "fp"
  WHERE (("fp"."id" = "feed_reactions"."post_id") AND "private"."membership_belongs_to_club"("fp"."club_id", "fp"."membership_id"))))));



CREATE POLICY "Members can delete own feed posts" ON "public"."feed_posts" FOR DELETE USING (("private"."is_current_membership"("membership_id") OR "private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])));



CREATE POLICY "Members can delete own feed reactions" ON "public"."feed_reactions" FOR DELETE USING ("private"."is_current_membership"("membership_id"));



CREATE POLICY "Members can delete own locker items" ON "public"."locker_items" FOR DELETE TO "authenticated" USING ("private"."is_current_membership"("membership_id"));



CREATE POLICY "Members can delete own schedule poll votes" ON "public"."schedule_poll_votes" FOR DELETE TO "authenticated" USING ("private"."is_current_membership"("membership_id"));



CREATE POLICY "Members can insert own locker items" ON "public"."locker_items" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_current_membership"("membership_id"));



CREATE POLICY "Members can read MVP votes for club matches" ON "public"."match_mvp_votes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "match_mvp_votes"."match_id") AND "private"."is_member_of_club"("m"."club_id")))));



CREATE POLICY "Members can read awarded badges" ON "public"."membership_badges" FOR SELECT TO "authenticated" USING (("private"."is_current_membership"("membership_id") OR (EXISTS ( SELECT 1
   FROM "public"."team_memberships" "tm"
  WHERE (("tm"."id" = "membership_badges"."membership_id") AND "private"."is_member_of_club"("tm"."club_id"))))));



CREATE POLICY "Members can read club memberships" ON "public"."team_memberships" FOR SELECT TO "authenticated" USING ((("account_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]) OR (("status" = 'approved'::"public"."membership_status") AND "private"."is_member_of_club"("club_id"))));



CREATE POLICY "Members can read own point ledger" ON "public"."point_ledger" FOR SELECT TO "authenticated" USING (("private"."is_current_membership"("membership_id") OR (EXISTS ( SELECT 1
   FROM "public"."team_memberships" "tm"
  WHERE (("tm"."id" = "point_ledger"."membership_id") AND "private"."has_club_role"("tm"."club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]))))));



CREATE POLICY "Members can read own unlocked traits" ON "public"."unlocked_traits" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."team_memberships" "tm"
  WHERE (("tm"."id" = "unlocked_traits"."membership_id") AND ("tm"."account_id" = "auth"."uid"())))));



CREATE POLICY "Members can read peer ratings for club matches" ON "public"."match_peer_ratings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "match_peer_ratings"."match_id") AND "private"."is_member_of_club"("m"."club_id")))));



CREATE POLICY "Members can update own MVP votes" ON "public"."match_mvp_votes" FOR UPDATE USING ("private"."is_current_membership"("voter_membership_id")) WITH CHECK (("private"."is_current_membership"("voter_membership_id") AND (EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "match_mvp_votes"."match_id") AND "private"."membership_belongs_to_club"("m"."club_id", "match_mvp_votes"."voter_membership_id") AND "private"."membership_belongs_to_club"("m"."club_id", "match_mvp_votes"."candidate_membership_id"))))));



CREATE POLICY "Members can update own comments" ON "public"."comments" FOR UPDATE TO "authenticated" USING ("private"."is_current_membership"("membership_id")) WITH CHECK (("private"."is_current_membership"("membership_id") AND "private"."membership_can_comment_on_target"("target_type", "target_id", "membership_id")));



CREATE POLICY "Members can update own locker items" ON "public"."locker_items" FOR UPDATE TO "authenticated" USING ("private"."is_current_membership"("membership_id")) WITH CHECK ("private"."is_current_membership"("membership_id"));



CREATE POLICY "Members can update own peer ratings" ON "public"."match_peer_ratings" FOR UPDATE USING ("private"."is_current_membership"("rater_membership_id")) WITH CHECK (("private"."is_current_membership"("rater_membership_id") AND (EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "match_peer_ratings"."match_id") AND "private"."membership_belongs_to_club"("m"."club_id", "match_peer_ratings"."rater_membership_id") AND "private"."membership_belongs_to_club"("m"."club_id", "match_peer_ratings"."ratee_membership_id"))))));



CREATE POLICY "Members can update own schedule poll votes" ON "public"."schedule_poll_votes" FOR UPDATE TO "authenticated" USING ("private"."is_current_membership"("membership_id")) WITH CHECK (("private"."is_current_membership"("membership_id") AND "private"."membership_can_vote_schedule_poll"("poll_id", "membership_id") AND "private"."schedule_poll_option_belongs_to_poll"("poll_id", "option_id")));



CREATE POLICY "Members can upsert own MVP votes" ON "public"."match_mvp_votes" FOR INSERT WITH CHECK (("private"."is_current_membership"("voter_membership_id") AND (EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "match_mvp_votes"."match_id") AND "private"."membership_belongs_to_club"("m"."club_id", "match_mvp_votes"."voter_membership_id") AND "private"."membership_belongs_to_club"("m"."club_id", "match_mvp_votes"."candidate_membership_id"))))));



CREATE POLICY "Members can upsert own peer ratings" ON "public"."match_peer_ratings" FOR INSERT WITH CHECK (("private"."is_current_membership"("rater_membership_id") AND (EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "match_peer_ratings"."match_id") AND "private"."membership_belongs_to_club"("m"."club_id", "match_peer_ratings"."rater_membership_id") AND "private"."membership_belongs_to_club"("m"."club_id", "match_peer_ratings"."ratee_membership_id"))))));



CREATE POLICY "Members can upsert own schedule poll votes" ON "public"."schedule_poll_votes" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_current_membership"("membership_id") AND "private"."membership_can_vote_schedule_poll"("poll_id", "membership_id") AND "private"."schedule_poll_option_belongs_to_poll"("poll_id", "option_id")));



CREATE POLICY "Members or operators can delete attendances" ON "public"."attendances" FOR DELETE TO "authenticated" USING (("private"."is_current_membership"("membership_id") OR "private"."has_match_role"("match_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])));



CREATE POLICY "Members or operators can insert attendances" ON "public"."attendances" FOR INSERT TO "authenticated" WITH CHECK ((("private"."is_current_membership"("membership_id") AND "private"."membership_can_participate_in_match"("match_id", "membership_id")) OR "private"."has_match_role"("match_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])));



CREATE POLICY "Members or operators can update attendances" ON "public"."attendances" FOR UPDATE TO "authenticated" USING (("private"."is_current_membership"("membership_id") OR "private"."has_match_role"("match_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]))) WITH CHECK (("private"."membership_can_participate_in_match"("match_id", "membership_id") AND ("private"."is_current_membership"("membership_id") OR "private"."has_match_role"("match_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]))));



CREATE POLICY "Users can delete own FCM tokens" ON "public"."fcm_tokens" FOR DELETE TO "authenticated" USING (("account_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can read own FCM tokens" ON "public"."fcm_tokens" FOR SELECT TO "authenticated" USING (("account_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can read own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING ("private"."is_current_membership"("membership_id"));



CREATE POLICY "Users can refresh own FCM tokens" ON "public"."fcm_tokens" FOR UPDATE TO "authenticated" USING (("account_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("account_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can register own FCM tokens" ON "public"."fcm_tokens" FOR INSERT TO "authenticated" WITH CHECK (("account_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can request membership or operators can add members" ON "public"."team_memberships" FOR INSERT TO "authenticated" WITH CHECK ((("private"."is_current_account"("account_id") AND ("role" = 'member'::"public"."user_role") AND ("status" = 'pending'::"public"."membership_status") AND (EXISTS ( SELECT 1
   FROM "public"."clubs" "c"
  WHERE ("c"."id" = "team_memberships"."club_id")))) OR "private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"])));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ("private"."is_current_membership"("membership_id")) WITH CHECK ("private"."is_current_membership"("membership_id"));



CREATE POLICY "Users can update own profile or operators can manage membership" ON "public"."team_memberships" FOR UPDATE TO "authenticated" USING ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role"])) WITH CHECK ("private"."has_club_role"("club_id", ARRAY['admin'::"public"."user_role"]));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clubs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fcm_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feed_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feed_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locker_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_mvp_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_peer_ratings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."membership_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."point_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reward_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedule_poll_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedule_poll_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedule_polls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trait_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."unlocked_traits" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "private" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




























































































































































REVOKE ALL ON FUNCTION "private"."save_match_result_atomically"("p_match_id" "uuid", "p_score" "jsonb", "p_player_stats" "jsonb", "p_point_ledger" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."save_match_result_atomically"("p_match_id" "uuid", "p_score" "jsonb", "p_player_stats" "jsonb", "p_point_ledger" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_club_with_owner"("p_account_id" "uuid", "p_email" "text", "p_name" "text", "p_slug" "text", "p_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_club_with_owner"("p_account_id" "uuid", "p_email" "text", "p_name" "text", "p_slug" "text", "p_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."purchase_trait"("p_account_id" "uuid", "p_club_id" "uuid", "p_trait_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purchase_trait"("p_account_id" "uuid", "p_club_id" "uuid", "p_trait_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_match_result_atomically"("p_match_id" "uuid", "p_score" "jsonb", "p_player_stats" "jsonb", "p_point_ledger" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_match_result_atomically"("p_match_id" "uuid", "p_score" "jsonb", "p_player_stats" "jsonb", "p_point_ledger" "jsonb") TO "service_role";


















GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."attendances" TO "anon";
GRANT ALL ON TABLE "public"."attendances" TO "authenticated";
GRANT ALL ON TABLE "public"."attendances" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."clubs" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."clubs" TO "authenticated";
GRANT ALL ON TABLE "public"."clubs" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."fcm_tokens" TO "anon";
GRANT ALL ON TABLE "public"."fcm_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."fcm_tokens" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."feed_posts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."feed_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."feed_posts" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."feed_reactions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."feed_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."feed_reactions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."locker_items" TO "anon";
GRANT ALL ON TABLE "public"."locker_items" TO "authenticated";
GRANT ALL ON TABLE "public"."locker_items" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."match_mvp_votes" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."match_mvp_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."match_mvp_votes" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."match_peer_ratings" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."match_peer_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."match_peer_ratings" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."match_teams" TO "anon";
GRANT ALL ON TABLE "public"."match_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."match_teams" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."membership_badges" TO "anon";
GRANT ALL ON TABLE "public"."membership_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_badges" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."player_stats" TO "anon";
GRANT ALL ON TABLE "public"."player_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."player_stats" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."point_ledger" TO "anon";
GRANT ALL ON TABLE "public"."point_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."point_ledger" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."reward_badges" TO "anon";
GRANT ALL ON TABLE "public"."reward_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."reward_badges" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."schedule_poll_options" TO "anon";
GRANT ALL ON TABLE "public"."schedule_poll_options" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_poll_options" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."schedule_poll_votes" TO "anon";
GRANT ALL ON TABLE "public"."schedule_poll_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_poll_votes" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."schedule_polls" TO "anon";
GRANT ALL ON TABLE "public"."schedule_polls" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_polls" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."team_memberships" TO "anon";
GRANT ALL ON TABLE "public"."team_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."team_memberships" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trait_catalog" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trait_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."trait_catalog" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."unlocked_traits" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."unlocked_traits" TO "authenticated";
GRANT ALL ON TABLE "public"."unlocked_traits" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

CREATE POLICY "Club members can delete own feed media" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'feed-media'::"text") AND ("owner" = "auth"."uid"()) AND "private"."is_member_of_club"((("storage"."foldername"("name"))[1])::"uuid")));



CREATE POLICY "Club members can read feed media" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'feed-media'::"text") AND "private"."is_member_of_club"((("storage"."foldername"("name"))[1])::"uuid")));



CREATE POLICY "Club members can update own feed media" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'feed-media'::"text") AND ("owner" = "auth"."uid"()) AND "private"."is_member_of_club"((("storage"."foldername"("name"))[1])::"uuid"))) WITH CHECK ((("bucket_id" = 'feed-media'::"text") AND ("owner" = "auth"."uid"()) AND "private"."is_member_of_club"((("storage"."foldername"("name"))[1])::"uuid")));



CREATE POLICY "Club members can upload feed media" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'feed-media'::"text") AND "private"."is_member_of_club"((("storage"."foldername"("name"))[1])::"uuid")));

-- Required catalog and launch data omitted by schema-only migration squash.
INSERT INTO "public"."clubs" (
  "id", "name", "slug", "description", "is_public", "logo_url"
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'FC Guppy',
  'fc-guppy',
  'FC Guppy는 함께 뛰고 성장하는 풋살 팀입니다.',
  true,
  null
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "slug" = EXCLUDED."slug",
  "description" = EXCLUDED."description",
  "is_public" = EXCLUDED."is_public";

INSERT INTO "storage"."buckets" (
  "id", "name", "public", "file_size_limit", "allowed_mime_types"
)
VALUES
  (
    'club-logos',
    'club-logos',
    true,
    2097152,
    ARRAY['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'feed-media',
    'feed-media',
    false,
    52428800,
    ARRAY[
      'image/png', 'image/jpeg', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
  )
ON CONFLICT ("id") DO UPDATE SET
  "public" = EXCLUDED."public",
  "file_size_limit" = EXCLUDED."file_size_limit",
  "allowed_mime_types" = EXCLUDED."allowed_mime_types";

INSERT INTO "public"."trait_catalog" (
  "trait_id", "name", "grade", "category", "position_group",
  "price", "is_default", "display_order"
)
VALUES
  ('target-man', '타깃맨', 'amateur', '포스트 플레이', 'FW', 0, true, 10),
  ('anchor-man', '앵커맨', 'amateur', '포백 수비 보호', 'MF', 0, true, 20),
  ('classic-no10', '클래식 No. 10', 'amateur', '정통 사령탑', 'MF', 0, true, 30),
  ('build-up-df', '빌드업 수비수', 'amateur', '최후방 시발점', 'DF', 0, true, 40),
  ('off-fullback', '공격형 사이드백', 'amateur', '적극 오버래핑', 'DF', 0, true, 50),
  ('def-fullback', '수비형 사이드백', 'amateur', '수비 전념', 'DF', 0, true, 60),
  ('off-gk', '공격형 골키퍼', 'amateur', '전진 스윕', 'GK', 0, true, 70),
  ('def-gk', '수비형 골키퍼', 'amateur', '라인 사수', 'GK', 0, true, 80),
  ('dummy-runner', '미끼 공격수', 'semi-pro', '미끼 플레이', 'FW', 150, false, 110),
  ('extra-frontman', '오버랩 수비수', 'semi-pro', '전진형 센터백', 'DF', 150, false, 120),
  ('prolific-winger', '윙 스트라이커', 'amateur', '터치라인 돌파', 'FW', 200, false, 130),
  ('box-to-box', '산소탱크', 'semi-pro', '전천후 엔진', 'MF', 200, false, 140),
  ('destroyer', '하드 워커', 'semi-pro', '터프 압박 수비', 'MF', 200, false, 150),
  ('cross-specialist', '크로스 플레이어', 'amateur', '측면 배달', 'MF', 200, false, 160),
  ('line-breaker', '라인 브레이커', 'pro', '침투형 공격', 'FW', 250, false, 170),
  ('fox-in-the-box', '박스 안의 여우', 'pro', '피니셔', 'FW', 250, false, 180),
  ('roaming-flank', '인사이드 리시버', 'pro', '컷인 플레이', 'FW', 250, false, 190),
  ('creative-pm', '찬스 메이커', 'pro', '기회 창출', 'FW', 250, false, 200),
  ('fb-finisher', '인사이드 사이드백', 'pro', '하프스페이스 타격', 'DF', 250, false, 210),
  ('hole-player', '2선 침투', 'pro', '기습 침투', 'MF', 300, false, 220),
  ('orchestrator', '플레이메이커', 'pro', '경기 조율', 'MF', 300, false, 230),
  ('captaincy', '통솔력', 'legend', '리더 패시브', 'ALL', 400, false, 240),
  ('fighting-spirit', '투지', 'legend', '강철 정신력', 'ALL', 400, false, 250),
  ('super-sub', '슈퍼 조커', 'legend', '흐름 체인저', 'ALL', 450, false, 260)
ON CONFLICT ("trait_id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "grade" = EXCLUDED."grade",
  "category" = EXCLUDED."category",
  "position_group" = EXCLUDED."position_group",
  "price" = EXCLUDED."price",
  "is_default" = EXCLUDED."is_default",
  "display_order" = EXCLUDED."display_order";

INSERT INTO "public"."reward_badges" (
  "id", "club_id", "code", "name", "description"
)
VALUES (
  '40000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'first-mom',
  '첫 MOM',
  '첫 번째 MOM에 선정된 멤버'
)
ON CONFLICT ("id") DO UPDATE SET
  "club_id" = EXCLUDED."club_id",
  "code" = EXCLUDED."code",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description";
