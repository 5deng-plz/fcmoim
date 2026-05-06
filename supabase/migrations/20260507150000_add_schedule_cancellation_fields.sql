alter type public.match_status add value if not exists 'cancelled';

alter table public.matches
  add column if not exists updated_by uuid references public.team_memberships(id) on delete set null,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz;

alter table public.schedule_polls
  add column if not exists updated_by uuid references public.team_memberships(id) on delete set null,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz;
