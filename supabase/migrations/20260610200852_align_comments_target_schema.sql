alter table public.comments
  add column if not exists target_type text,
  add column if not exists target_id uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'comments'
      and column_name = 'match_id'
  ) then
    execute $sql$
      update public.comments
      set
        target_type = 'match',
        target_id = match_id
      where target_id is null
        and match_id is not null
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from public.comments
    where target_type is null
       or target_id is null
  ) then
    raise exception 'comments target backfill failed: target_type and target_id must be present before enforcing not null';
  end if;
end $$;

alter table public.comments
  alter column target_type set not null,
  alter column target_id set not null;

alter table public.comments
  drop constraint if exists comments_target_type_check;

alter table public.comments
  add constraint comments_target_type_check
  check (target_type in ('match', 'schedule_poll_option'));

create or replace function private.comment_target_club_id(target_type text, target_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
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
    else null
  end;
$$;

create or replace function private.is_member_for_comment_target(target_type text, target_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_member_of_club(private.comment_target_club_id(target_type, target_id));
$$;

create or replace function private.membership_can_comment_on_target(
  target_type text,
  target_id uuid,
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
      and tm.status = 'approved'::public.membership_status
      and tm.club_id = private.comment_target_club_id(target_type, target_id)
  );
$$;

create or replace function private.has_comment_target_role(target_type text, target_id uuid, allowed_roles public.user_role[])
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.has_club_role(private.comment_target_club_id(target_type, target_id), allowed_roles);
$$;

drop policy if exists "Approved members can read match comments" on public.comments;
drop policy if exists "Members can create match comments" on public.comments;
drop policy if exists "Members can update own match comments" on public.comments;
drop policy if exists "Members and operators can delete match comments" on public.comments;

drop policy if exists "Approved members can read comments" on public.comments;
create policy "Approved members can read comments"
  on public.comments for select
  to authenticated
  using (private.is_member_for_comment_target(target_type, target_id));

drop policy if exists "Members can create comments" on public.comments;
create policy "Members can create comments"
  on public.comments for insert
  to authenticated
  with check (
    private.is_current_membership(membership_id)
    and private.membership_can_comment_on_target(target_type, target_id, membership_id)
  );

drop policy if exists "Members can update own comments" on public.comments;
create policy "Members can update own comments"
  on public.comments for update
  to authenticated
  using (private.is_current_membership(membership_id))
  with check (
    private.is_current_membership(membership_id)
    and private.membership_can_comment_on_target(target_type, target_id, membership_id)
  );

drop policy if exists "Members and operators can delete comments" on public.comments;
create policy "Members and operators can delete comments"
  on public.comments for delete
  to authenticated
  using (
    private.is_current_membership(membership_id)
    or private.has_comment_target_role(target_type, target_id, array['admin', 'operator']::public.user_role[])
  );

create index if not exists comments_target_created_idx
  on public.comments (target_type, target_id, created_at);

create index if not exists comments_membership_idx
  on public.comments (membership_id);
