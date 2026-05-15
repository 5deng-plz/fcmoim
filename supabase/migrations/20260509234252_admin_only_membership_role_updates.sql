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
