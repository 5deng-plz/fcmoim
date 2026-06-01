create unique index if not exists matches_one_match_per_club_kst_date
  on public.matches (club_id, (((date at time zone 'Asia/Seoul')::date)))
  where type = 'match' and status <> 'cancelled';
