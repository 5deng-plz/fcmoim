alter table public.team_memberships
  add column if not exists selected_trait_id text;

create table if not exists public.trait_catalog (
  trait_id text primary key,
  name text not null,
  grade text not null check (grade in ('amateur', 'semi-pro', 'pro', 'legend')),
  category text not null,
  position_group text not null check (position_group in ('FW', 'MF', 'DF', 'GK', 'ALL')),
  price integer not null check (price >= 0),
  is_default boolean not null default false,
  display_order integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.unlocked_traits (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  trait_id text not null references public.trait_catalog(trait_id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  unique (membership_id, trait_id)
);

create index if not exists unlocked_traits_membership_idx
  on public.unlocked_traits (membership_id, unlocked_at desc);

insert into public.trait_catalog (trait_id, name, grade, category, position_group, price, is_default, display_order)
values
  ('target-man', '타깃맨', 'amateur', '포스트 플레이', 'FW', 0, true, 10),
  ('anchor-man', '앵커맨', 'amateur', '포백 수비 보호', 'MF', 0, true, 20),
  ('classic-no10', '클래식 No. 10', 'amateur', '정통 사령탑', 'MF', 0, true, 30),
  ('build-up-df', '빌드업 수비수', 'amateur', '최후방 시발점', 'DF', 0, true, 40),
  ('off-fullback', '공격형 사이드백', 'amateur', '적극 오버래핑', 'DF', 0, true, 50),
  ('def-fullback', '수비형 사이드백', 'amateur', '수비 전념', 'DF', 0, true, 60),
  ('off-gk', '공격형 골키퍼', 'amateur', '전진 스윕', 'GK', 0, true, 70),
  ('def-gk', '수비형 골키퍼', 'amateur', '라인 사수', 'GK', 0, true, 80),
  ('dummy-runner', '미끼 공격수', 'semi-pro', '미끼 플레이', 'FW', 150, false, 110),
  ('extra-frontman', '오버랩 수비수', 'semi-pro', '전진형 센터백', 'DF', 150, false, 120),
  ('prolific-winger', '윙 스트라이커', 'amateur', '터치라인 돌파', 'FW', 200, false, 130),
  ('box-to-box', '산소탱크', 'semi-pro', '전천후 엔진', 'MF', 200, false, 140),
  ('destroyer', '하드 워커', 'semi-pro', '터프 압박 수비', 'MF', 200, false, 150),
  ('cross-specialist', '크로스 플레이어', 'amateur', '측면 배달', 'MF', 200, false, 160),
  ('line-breaker', '라인 브레이커', 'pro', '침투형 공격', 'FW', 250, false, 170),
  ('fox-in-the-box', '박스 안의 여우', 'pro', '피니셔', 'FW', 250, false, 180),
  ('roaming-flank', '인사이드 리시버', 'pro', '컷인 플레이', 'FW', 250, false, 190),
  ('creative-pm', '찬스 메이커', 'pro', '기회 창출', 'FW', 250, false, 200),
  ('fb-finisher', '인사이드 사이드백', 'pro', '하프스페이스 타격', 'DF', 250, false, 210),
  ('hole-player', '2선 침투', 'pro', '기습 침투', 'MF', 300, false, 220),
  ('orchestrator', '플레이메이커', 'pro', '경기 조율', 'MF', 300, false, 230),
  ('captaincy', '통솔력', 'legend', '리더 패시브', 'ALL', 400, false, 240),
  ('fighting-spirit', '투지', 'legend', '강철 정신력', 'ALL', 400, false, 250),
  ('super-sub', '슈퍼 조커', 'legend', '흐름 체인저', 'ALL', 450, false, 260)
on conflict (trait_id) do update
set
  name = excluded.name,
  grade = excluded.grade,
  category = excluded.category,
  position_group = excluded.position_group,
  price = excluded.price,
  is_default = excluded.is_default,
  display_order = excluded.display_order;

alter table public.trait_catalog enable row level security;
alter table public.unlocked_traits enable row level security;

drop policy if exists "Anyone can read trait catalog" on public.trait_catalog;
create policy "Anyone can read trait catalog"
  on public.trait_catalog for select
  using (true);

drop policy if exists "Members can read own unlocked traits" on public.unlocked_traits;
create policy "Members can read own unlocked traits"
  on public.unlocked_traits for select
  using (
    exists (
      select 1
      from public.team_memberships tm
      where tm.id = unlocked_traits.membership_id
        and tm.account_id = auth.uid()
    )
  );

grant select on public.trait_catalog to anon, authenticated;
grant select on public.unlocked_traits to authenticated;

create or replace function public.purchase_trait(
  p_account_id uuid,
  p_club_id uuid,
  p_trait_id text
)
returns table (
  membership_id uuid,
  trait_id text,
  remaining_points integer,
  already_unlocked boolean
)
language plpgsql
set search_path = public
as $$
declare
  v_membership public.team_memberships%rowtype;
  v_trait public.trait_catalog%rowtype;
begin
  select *
    into v_membership
    from public.team_memberships
   where account_id = p_account_id
     and club_id = p_club_id
     and status = 'approved'
   for update;

  if not found then
    raise exception 'Approved membership is required.';
  end if;

  select *
    into v_trait
    from public.trait_catalog
   where trait_catalog.trait_id = p_trait_id
     and is_default = false;

  if not found then
    raise exception 'Purchasable trait was not found.';
  end if;

  if exists (
    select 1
      from public.unlocked_traits
     where unlocked_traits.membership_id = v_membership.id
       and unlocked_traits.trait_id = p_trait_id
  ) then
    return query select v_membership.id, p_trait_id, v_membership.match_points, true;
    return;
  end if;

  if v_membership.match_points < v_trait.price then
    raise exception 'Not enough match points.';
  end if;

  update public.team_memberships
     set match_points = match_points - v_trait.price
   where id = v_membership.id
   returning * into v_membership;

  insert into public.unlocked_traits (membership_id, trait_id)
  values (v_membership.id, p_trait_id);

  insert into public.point_ledger (
    membership_id,
    amount,
    reason,
    source_type,
    source_id
  )
  values (
    v_membership.id,
    -v_trait.price,
    'shop_purchase',
    'trait_shop',
    null
  );

  return query select v_membership.id, p_trait_id, v_membership.match_points, false;
end;
$$;

revoke all on function public.purchase_trait(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.purchase_trait(uuid, uuid, text) to service_role;
