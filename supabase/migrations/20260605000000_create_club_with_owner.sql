create or replace function public.create_club_with_owner(
  p_account_id uuid,
  p_email text,
  p_name text,
  p_slug text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_description text := btrim(coalesce(p_description, ''));
  v_owned_count integer := 0;
  v_club_id uuid;
  v_profile_name text;
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
$$;

revoke all on function public.create_club_with_owner(uuid, text, text, text, text) from public;
grant execute on function public.create_club_with_owner(uuid, text, text, text, text) to service_role;
