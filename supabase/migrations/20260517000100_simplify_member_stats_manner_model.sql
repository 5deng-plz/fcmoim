alter table public.team_memberships
  alter column stats set default '{"attack":60,"defense":60,"stamina":60,"mentality":60,"speed":60,"manner":60}'::jsonb;

with reset_stats as (
  select
    id,
    jsonb_build_object(
      'attack', 55 + (get_byte(decode(substr(md5(id::text || ':attack'), 1, 2), 'hex'), 0) % 36),
      'defense', 55 + (get_byte(decode(substr(md5(id::text || ':defense'), 1, 2), 'hex'), 0) % 36),
      'stamina', 55 + (get_byte(decode(substr(md5(id::text || ':stamina'), 1, 2), 'hex'), 0) % 36),
      'mentality', 55 + (get_byte(decode(substr(md5(id::text || ':mentality'), 1, 2), 'hex'), 0) % 36),
      'speed', 55 + (get_byte(decode(substr(md5(id::text || ':speed'), 1, 2), 'hex'), 0) % 36),
      'manner', 55 + (get_byte(decode(substr(md5(id::text || ':manner'), 1, 2), 'hex'), 0) % 36)
    ) as stats
  from public.team_memberships
)
update public.team_memberships as membership
set
  stats = reset_stats.stats,
  ovr = round((
    (reset_stats.stats->>'attack')::numeric +
    (reset_stats.stats->>'defense')::numeric +
    (reset_stats.stats->>'stamina')::numeric +
    (reset_stats.stats->>'mentality')::numeric +
    (reset_stats.stats->>'speed')::numeric +
    (reset_stats.stats->>'manner')::numeric
  ) / 6)::integer,
  updated_at = now()
from reset_stats
where membership.id = reset_stats.id;
