alter type public.membership_status add value if not exists 'withdrawn';

alter table public.clubs
  add column if not exists is_public boolean not null default true;

alter table public.team_memberships
  add column if not exists residence text;

alter table public.team_memberships
  drop constraint if exists team_memberships_residence_length;

alter table public.team_memberships
  add constraint team_memberships_residence_length
  check (residence is null or char_length(btrim(residence)) between 1 and 80);

update public.clubs
set description = 'FC Guppy는 함께 뛰고 성장하는 풋살 팀입니다. 정기 경기와 기록 관리를 통해 즐겁고 꾸준한 팀 문화를 만들어갑니다.',
    is_public = true
where id = '00000000-0000-0000-0000-000000000001';
