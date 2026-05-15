grant usage on schema public to anon, authenticated;
grant select on public.clubs to anon;

drop policy if exists "Authenticated users can read club catalog" on public.clubs;
drop policy if exists "Anyone can read club catalog" on public.clubs;
create policy "Anyone can read club catalog"
  on public.clubs for select
  to anon, authenticated
  using (true);

drop policy if exists "Members can read club memberships" on public.team_memberships;
create policy "Members can read club memberships"
  on public.team_memberships for select
  to authenticated
  using (
    private.is_current_membership(id)
    or private.has_club_role(club_id, array['admin', 'operator']::public.user_role[])
    or (
      status = 'approved'::public.membership_status
      and private.is_member_of_club(club_id)
    )
  );

drop policy if exists "Users can request membership or operators can add members" on public.team_memberships;
create policy "Users can request membership or operators can add members"
  on public.team_memberships for insert
  to authenticated
  with check (
    (
      private.is_current_account(account_id)
      and role = 'member'::public.user_role
      and status = 'pending'::public.membership_status
      and exists (
        select 1
        from public.clubs c
        where c.id = team_memberships.club_id
      )
    )
    or private.has_club_role(club_id, array['admin', 'operator']::public.user_role[])
  );
