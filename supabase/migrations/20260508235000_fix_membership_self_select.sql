drop policy if exists "Members can read club memberships" on public.team_memberships;
create policy "Members can read club memberships"
  on public.team_memberships for select
  to authenticated
  using (
    account_id = (select auth.uid())
    or private.has_club_role(club_id, array['admin', 'operator']::public.user_role[])
    or (
      status = 'approved'::public.membership_status
      and private.is_member_of_club(club_id)
    )
  );
