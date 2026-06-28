import type { SupabaseClient } from '@supabase/supabase-js';

import { AppError } from '../../types/api';

import type { AnnouncementRow, EventCommentRow, EventCommentTargetType, TeamMembershipRow } from '../../types/domain';

import type { AnnouncementRepositories } from '../announcements';

import type { CommentRepositories } from '../comments';

import type { FeedContentType, FeedPostRepositories, FeedReactionType } from '../feed-posts';

type AnnouncementMembershipDbRow = {
  id: string;
  club_id: string;
  role: TeamMembershipRow['role'];
  status: TeamMembershipRow['status'];
};

type AnnouncementDbRow = {
  id: string;
  club_id: string;
  season_id: string | null;
  title: string;
  content: string;
  author_membership_id: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

type MatchMembershipDbRow = {
  id: string;
  club_id: string;
  role: TeamMembershipRow['role'];
  status: TeamMembershipRow['status'];
};

type EventCommentDbRow = {
  id: string;
  target_type: EventCommentTargetType;
  target_id: string;
  membership_id: string;
  content: string;
  created_at: string;
  team_memberships: {
    profile_name: string;
  } | null;
};

type FeedPostDbRow = {
  id: string;
  club_id: string;
  membership_id: string;
  match_id: string | null;
  content_type: FeedContentType;
  text_content: string | null;
  media_url: string | null;
  created_at: string;
  updated_at: string;
  team_memberships: {
    profile_name: string;
  } | null;
};

type FeedReactionDbRow = {
  post_id: string;
  membership_id: string;
  reaction_type: FeedReactionType;
};

type FeedCommentCountDbRow = {
  target_id: string;
};

export function createSupabaseAnnouncementRepositories(
  supabase: SupabaseClient,
): AnnouncementRepositories {
  return {
    memberships: {
      async findCurrentMembership(accountId, clubId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select('id, club_id, role, status')
          .eq('account_id', accountId)
          .eq('club_id', clubId)
          .maybeSingle<AnnouncementMembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch announcement membership.', { cause: error });
        }

        return data
          ? {
              id: data.id,
              clubId: data.club_id,
              role: data.role,
              status: data.status,
            }
          : null;
      },
    },
    announcements: {
      async listForTeam(clubId) {
        const { data, error } = await supabase
          .from('announcements')
          .select(ANNOUNCEMENT_SELECT)
          .eq('club_id', clubId)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .returns<AnnouncementDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch announcements.', { cause: error });
        }

        return (data ?? []).map(mapAnnouncement);
      },

      async findById(announcementId, teamId) {
        const { data, error } = await supabase
          .from('announcements')
          .select(ANNOUNCEMENT_SELECT)
          .eq('id', announcementId)
          .eq('club_id', teamId)
          .maybeSingle<AnnouncementDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch announcement.', { cause: error });
        }

        return data ? mapAnnouncement(data) : null;
      },

      async create(input) {
        const { data, error } = await supabase
          .from('announcements')
          .insert({
            club_id: input.clubId,
            season_id: input.seasonId,
            title: input.title,
            content: input.content,
            author_membership_id: input.authorMembershipId,
            is_pinned: input.isPinned,
          })
          .select(ANNOUNCEMENT_SELECT)
          .single<AnnouncementDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to create announcement.', { cause: error });
        }

        return mapAnnouncement(data);
      },

      async update(input) {
        const { data, error } = await supabase
          .from('announcements')
          .update({
            title: input.title,
            content: input.content,
            is_pinned: input.isPinned,
          })
          .eq('id', input.announcementId)
          .select(ANNOUNCEMENT_SELECT)
          .single<AnnouncementDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to update announcement.', { cause: error });
        }

        return mapAnnouncement(data);
      },

      async delete(announcementId) {
        const { error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', announcementId);

        if (error) {
          throw new AppError('internal_error', 'Failed to delete announcement.', { cause: error });
        }
      },
    },
  };
}

export function createSupabaseFeedPostRepositories(
  supabase: SupabaseClient,
): FeedPostRepositories {
  return {
    memberships: {
      async findCurrentMembership(accountId, clubId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select('id, club_id, role, status')
          .eq('account_id', accountId)
          .eq('club_id', clubId)
          .maybeSingle<MatchMembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch feed membership.', { cause: error });
        }

        return data
          ? {
              id: data.id,
              clubId: data.club_id,
              role: data.role,
              status: data.status,
            }
          : null;
      },
    },
    matches: {
      async findClubId(matchId) {
        const { data, error } = await supabase
          .from('matches')
          .select('club_id')
          .eq('id', matchId)
          .maybeSingle<{ club_id: string }>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch feed match target.', { cause: error });
        }

        return data?.club_id ?? null;
      },
    },
    posts: {
      async list(input) {
        let query = supabase
          .from('feed_posts')
          .select(FEED_POST_SELECT)
          .eq('club_id', input.clubId)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.contentType) {
          query = query.eq('content_type', input.contentType);
        }

        const { data, error } = await query.returns<FeedPostDbRow[]>();
        if (error) {
          throw new AppError('internal_error', 'Failed to fetch feed posts.', { cause: error });
        }

        return hydrateFeedPosts(supabase, data ?? [], input.membershipId);
      },

      async create(input) {
        const { data, error } = await supabase
          .from('feed_posts')
          .insert({
            club_id: input.clubId,
            membership_id: input.membershipId,
            match_id: input.matchId,
            content_type: input.contentType,
            text_content: input.textContent,
            media_url: input.mediaUrl,
          })
          .select(FEED_POST_SELECT)
          .single<FeedPostDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to create feed post.', { cause: error });
        }

        return (await hydrateFeedPosts(supabase, [data], input.membershipId))[0];
      },

      async findById(postId, teamId) {
        const { data, error } = await supabase
          .from('feed_posts')
          .select('id, club_id, membership_id')
          .eq('id', postId)
          .eq('club_id', teamId)
          .maybeSingle<{ id: string; club_id: string; membership_id: string }>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch feed post.', { cause: error });
        }

        return data ? { id: data.id, clubId: data.club_id, membershipId: data.membership_id } : null;
      },

      async delete(postId) {
        const { error } = await supabase
          .from('feed_posts')
          .delete()
          .eq('id', postId);

        if (error) {
          throw new AppError('internal_error', 'Failed to delete feed post.', { cause: error });
        }
      },
    },
    reactions: {
      async toggle(input) {
        const { data, error } = await supabase
          .from('feed_reactions')
          .select('id')
          .eq('post_id', input.postId)
          .eq('membership_id', input.membershipId)
          .eq('reaction_type', input.reactionType)
          .maybeSingle<{ id: string }>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch feed reaction.', { cause: error });
        }

        if (data) {
          const { error: deleteError } = await supabase
            .from('feed_reactions')
            .delete()
            .eq('id', data.id);

          if (deleteError) {
            throw new AppError('internal_error', 'Failed to delete feed reaction.', { cause: deleteError });
          }
          return;
        }

        const { error: insertError } = await supabase
          .from('feed_reactions')
          .insert({
            post_id: input.postId,
            membership_id: input.membershipId,
            reaction_type: input.reactionType,
          });

        if (insertError) {
          throw new AppError('internal_error', 'Failed to create feed reaction.', { cause: insertError });
        }
      },
    },
  };
}

export function createSupabaseCommentRepositories(
  supabase: SupabaseClient,
): CommentRepositories {
  return {
    memberships: {
      async findCurrentMembership(accountId, clubId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select('id, club_id, role, status')
          .eq('account_id', accountId)
          .eq('club_id', clubId)
          .maybeSingle<MatchMembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch comment membership.', { cause: error });
        }

        return data
          ? {
              id: data.id,
              clubId: data.club_id,
              role: data.role,
              status: data.status,
            }
          : null;
      },
    },
    targets: {
      async findClubId(targetType, targetId) {
        if (targetType === 'match') {
          const { data, error } = await supabase
            .from('matches')
            .select('club_id')
            .eq('id', targetId)
            .maybeSingle<{ club_id: string }>();

          if (error) {
            throw new AppError('internal_error', 'Failed to fetch comment match target.', { cause: error });
          }

          return data?.club_id ?? null;
        }

        if (targetType === 'feed_post') {
          const { data, error } = await supabase
            .from('feed_posts')
            .select('club_id')
            .eq('id', targetId)
            .maybeSingle<{ club_id: string }>();

          if (error) {
            throw new AppError('internal_error', 'Failed to fetch comment feed target.', { cause: error });
          }

          return data?.club_id ?? null;
        }

        const { data, error } = await supabase
          .from('schedule_poll_options')
          .select('schedule_polls(club_id)')
          .eq('id', targetId)
          .maybeSingle<{ schedule_polls: { club_id: string } | null }>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch comment poll option target.', { cause: error });
        }

        return data?.schedule_polls?.club_id ?? null;
      },
    },
    comments: {
      async listForTarget(input) {
        return fetchEventCommentsByTarget(supabase, input.targetType, input.targetId);
      },

      async create(input) {
        const { data, error } = await supabase
          .from('comments')
          .insert({
            target_type: input.targetType,
            target_id: input.targetId,
            membership_id: input.membershipId,
            content: input.content,
          })
          .select(EVENT_COMMENT_SELECT)
          .single<EventCommentDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to create event comment.', { cause: error });
        }

        return mapEventComment(data);
      },
    },
  };
}

const ANNOUNCEMENT_SELECT =
  'id, club_id, season_id, title, content, author_membership_id, is_pinned, created_at, updated_at';

const EVENT_COMMENT_SELECT =
  'id, target_type, target_id, membership_id, content, created_at, team_memberships(profile_name)';

const FEED_POST_SELECT =
  'id, club_id, membership_id, match_id, content_type, text_content, media_url, created_at, updated_at, team_memberships(profile_name)';

function mapAnnouncement(row: AnnouncementDbRow): AnnouncementRow {
  return {
    id: row.id,
    seasonId: row.season_id,
    title: row.title,
    content: row.content,
    authorMembershipId: row.author_membership_id,
    isPinned: row.is_pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchEventCommentsByTarget(
  supabase: SupabaseClient,
  targetType: EventCommentTargetType,
  targetId: string,
) {
  const { data, error } = await supabase
    .from('comments')
    .select(EVENT_COMMENT_SELECT)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: true })
    .returns<EventCommentDbRow[]>();

  if (error) {
    throw new AppError('internal_error', 'Failed to fetch event comments.', { cause: error });
  }

  return (data ?? []).map(mapEventComment);
}

function mapEventComment(row: EventCommentDbRow): EventCommentRow {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    membershipId: row.membership_id,
    authorName: row.team_memberships?.profile_name || '알 수 없는 멤버',
    content: row.content,
    createdAt: row.created_at,
  };
}

async function hydrateFeedPosts(
  supabase: SupabaseClient,
  rows: FeedPostDbRow[],
  membershipId: string,
) {
  const postIds = rows.map((row) => row.id);
  if (postIds.length === 0) return [];

  const [{ data: reactions, error: reactionsError }, { data: comments, error: commentsError }] = await Promise.all([
    supabase
      .from('feed_reactions')
      .select('post_id, membership_id, reaction_type')
      .in('post_id', postIds)
      .returns<FeedReactionDbRow[]>(),
    supabase
      .from('comments')
      .select('target_id')
      .eq('target_type', 'feed_post')
      .in('target_id', postIds)
      .returns<FeedCommentCountDbRow[]>(),
  ]);

  if (reactionsError) {
    throw new AppError('internal_error', 'Failed to fetch feed reactions.', { cause: reactionsError });
  }
  if (commentsError) {
    throw new AppError('internal_error', 'Failed to fetch feed comment counts.', { cause: commentsError });
  }

  const reactionsByPostId = new Map<string, FeedReactionDbRow[]>();
  for (const reaction of reactions ?? []) {
    const list = reactionsByPostId.get(reaction.post_id) ?? [];
    list.push(reaction);
    reactionsByPostId.set(reaction.post_id, list);
  }

  const commentCounts = new Map<string, number>();
  for (const comment of comments ?? []) {
    commentCounts.set(comment.target_id, (commentCounts.get(comment.target_id) ?? 0) + 1);
  }

  return rows.map((row) => {
    const postReactions = reactionsByPostId.get(row.id) ?? [];
    const reactionCounts = {
      up: 0,
      down: 0,
      check: 0,
      smile: 0,
      sad: 0,
    } satisfies Record<FeedReactionType, number>;

    for (const reaction of postReactions) {
      if (reaction.reaction_type in reactionCounts) {
        reactionCounts[reaction.reaction_type] += 1;
      }
    }

    return {
      id: row.id,
      clubId: row.club_id,
      membershipId: row.membership_id,
      authorName: row.team_memberships?.profile_name || '알 수 없는 멤버',
      matchId: row.match_id,
      contentType: row.content_type,
      textContent: row.text_content,
      mediaUrl: row.media_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reactionCounts,
      myReactions: postReactions
        .filter((reaction) => reaction.membership_id === membershipId)
        .map((reaction) => reaction.reaction_type),
      commentCount: commentCounts.get(row.id) ?? 0,
    };
  });
}
