drop policy if exists "Users can update own profile or operators can manage memberships" on public.team_memberships;
create policy "Users can update own profile or operators can manage memberships"
  on public.team_memberships for update
  to authenticated
  using (
    private.has_club_role(club_id, array['admin']::public.user_role[])
  )
  with check (
    private.has_club_role(club_id, array['admin']::public.user_role[])
  );
