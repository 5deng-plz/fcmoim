create table if not exists public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  token text not null unique,
  device_info jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fcm_tokens_device_info_object check (jsonb_typeof(device_info) = 'object')
);

alter table public.notifications
  add column if not exists target_url text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.notifications
  drop constraint if exists notifications_metadata_object;

alter table public.notifications
  add constraint notifications_metadata_object
  check (jsonb_typeof(metadata) = 'object');

create index if not exists fcm_tokens_account_last_seen_idx
  on public.fcm_tokens (account_id, last_seen_at desc);

create index if not exists notifications_membership_unread_idx
  on public.notifications (membership_id, is_read, created_at desc);

drop trigger if exists fcm_tokens_touch_updated_at on public.fcm_tokens;
create trigger fcm_tokens_touch_updated_at before update on public.fcm_tokens
  for each row execute function private.touch_updated_at();

alter table public.fcm_tokens enable row level security;

grant select, insert, update, delete on public.fcm_tokens to authenticated;

drop policy if exists "Users can read own FCM tokens" on public.fcm_tokens;
create policy "Users can read own FCM tokens"
  on public.fcm_tokens for select
  to authenticated
  using (account_id = (select auth.uid()));

drop policy if exists "Users can register own FCM tokens" on public.fcm_tokens;
create policy "Users can register own FCM tokens"
  on public.fcm_tokens for insert
  to authenticated
  with check (account_id = (select auth.uid()));

drop policy if exists "Users can refresh own FCM tokens" on public.fcm_tokens;
create policy "Users can refresh own FCM tokens"
  on public.fcm_tokens for update
  to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

drop policy if exists "Users can delete own FCM tokens" on public.fcm_tokens;
create policy "Users can delete own FCM tokens"
  on public.fcm_tokens for delete
  to authenticated
  using (account_id = (select auth.uid()));
