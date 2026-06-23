alter table public.feed_reactions
  drop constraint if exists feed_reactions_reaction_type_check;

with normalized as (
  select
    post_id,
    membership_id,
    reaction_type,
    case reaction_type
      when 'fire' then 'up'
      when 'clap' then 'up'
      when 'goat' then 'check'
      when 'laugh' then 'smile'
      else reaction_type
    end as normalized_type,
    row_number() over (
      partition by post_id, membership_id,
        case reaction_type
          when 'fire' then 'up'
          when 'clap' then 'up'
          when 'goat' then 'check'
          when 'laugh' then 'smile'
          else reaction_type
        end
      order by created_at asc
    ) as duplicate_rank
  from public.feed_reactions
)
delete from public.feed_reactions fr
using normalized n
where fr.post_id = n.post_id
  and fr.membership_id = n.membership_id
  and fr.reaction_type = n.reaction_type
  and n.duplicate_rank > 1;

update public.feed_reactions
set reaction_type = case reaction_type
  when 'fire' then 'up'
  when 'clap' then 'up'
  when 'goat' then 'check'
  when 'laugh' then 'smile'
  else reaction_type
end
where reaction_type in ('fire', 'clap', 'goat', 'laugh');

alter table public.feed_reactions
  add constraint feed_reactions_reaction_type_check
  check (reaction_type in ('up', 'down', 'check', 'smile', 'sad'));
