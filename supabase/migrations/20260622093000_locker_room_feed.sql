create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  content_type text not null check (content_type in ('text', 'image', 'video')),
  text_content text check (text_content is null or char_length(text_content) <= 500),
  media_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feed_posts_club_created_idx
  on public.feed_posts(club_id, created_at desc);

create table if not exists public.feed_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('fire', 'laugh', 'goat', 'clap')),
  created_at timestamptz not null default now(),
  unique (post_id, membership_id, reaction_type)
);

create index if not exists feed_reactions_post_idx
  on public.feed_reactions(post_id);

grant select, insert, delete on public.feed_posts to authenticated;
grant select, insert, delete on public.feed_reactions to authenticated;

alter table public.comments
  drop constraint if exists comments_target_type_check;

alter table public.comments
  add constraint comments_target_type_check
  check (target_type in ('match', 'schedule_poll_option', 'feed_post'));

create or replace function private.comment_target_club_id(target_type text, target_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
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
    when target_type = 'feed_post' then (
      select fp.club_id from public.feed_posts fp where fp.id = target_id
    )
    else null
  end;
$$;

alter table public.feed_posts enable row level security;
alter table public.feed_reactions enable row level security;

drop policy if exists "Approved members can read feed posts" on public.feed_posts;
create policy "Approved members can read feed posts"
  on public.feed_posts for select
  using (private.is_member_of_club(club_id));

drop policy if exists "Members can create own feed posts" on public.feed_posts;
create policy "Members can create own feed posts"
  on public.feed_posts for insert
  with check (
    private.is_current_membership(membership_id)
    and private.membership_belongs_to_club(club_id, membership_id)
  );

drop policy if exists "Members can delete own feed posts" on public.feed_posts;
create policy "Members can delete own feed posts"
  on public.feed_posts for delete
  using (
    private.is_current_membership(membership_id)
    or private.has_club_role(club_id, array['admin', 'operator']::public.user_role[])
  );

drop policy if exists "Approved members can read feed reactions" on public.feed_reactions;
create policy "Approved members can read feed reactions"
  on public.feed_reactions for select
  using (
    exists (
      select 1
      from public.feed_posts fp
      where fp.id = feed_reactions.post_id
        and private.is_member_of_club(fp.club_id)
    )
  );

drop policy if exists "Members can create own feed reactions" on public.feed_reactions;
create policy "Members can create own feed reactions"
  on public.feed_reactions for insert
  with check (
    private.is_current_membership(membership_id)
    and exists (
      select 1
      from public.feed_posts fp
      where fp.id = feed_reactions.post_id
        and private.membership_belongs_to_club(fp.club_id, membership_id)
    )
  );

drop policy if exists "Members can delete own feed reactions" on public.feed_reactions;
create policy "Members can delete own feed reactions"
  on public.feed_reactions for delete
  using (private.is_current_membership(membership_id));

drop trigger if exists feed_posts_touch_updated_at on public.feed_posts;
create trigger feed_posts_touch_updated_at before update on public.feed_posts
  for each row execute function private.touch_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feed-media',
  'feed-media',
  false,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Club members can read feed media" on storage.objects;
create policy "Club members can read feed media"
  on storage.objects for select
  using (
    bucket_id = 'feed-media'
    and private.is_member_of_club((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "Club members can upload feed media" on storage.objects;
create policy "Club members can upload feed media"
  on storage.objects for insert
  with check (
    bucket_id = 'feed-media'
    and private.is_member_of_club((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "Club members can update own feed media" on storage.objects;
create policy "Club members can update own feed media"
  on storage.objects for update
  using (
    bucket_id = 'feed-media'
    and owner = auth.uid()
    and private.is_member_of_club((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'feed-media'
    and owner = auth.uid()
    and private.is_member_of_club((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "Club members can delete own feed media" on storage.objects;
create policy "Club members can delete own feed media"
  on storage.objects for delete
  using (
    bucket_id = 'feed-media'
    and owner = auth.uid()
    and private.is_member_of_club((storage.foldername(name))[1]::uuid)
  );
