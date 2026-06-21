import { AppError } from '../types/api';
import type { AuthContext, TeamMembershipRow } from '../types/domain';

export type FeedContentType = 'text' | 'image' | 'video';
export type FeedReactionType = 'fire' | 'laugh' | 'goat' | 'clap';

export type FeedPostRow = {
  id: string;
  clubId: string;
  membershipId: string;
  authorName: string;
  matchId: string | null;
  contentType: FeedContentType;
  textContent: string | null;
  mediaUrl: string | null;
  createdAt: string;
  updatedAt: string;
  reactionCounts: Record<FeedReactionType, number>;
  myReactions: FeedReactionType[];
  commentCount: number;
};

type FeedMembership = Pick<TeamMembershipRow, 'id' | 'clubId' | 'role' | 'status'>;

export type FeedPostRepositories = {
  memberships: {
    findByAccountAndClub(accountId: string, clubId: string): Promise<FeedMembership | null>;
  };
  matches: {
    findClubId(matchId: string): Promise<string | null>;
  };
  posts: {
    list(input: {
      clubId: string;
      membershipId: string;
      contentType?: Extract<FeedContentType, 'image' | 'video'> | null;
      limit: number;
      offset: number;
    }): Promise<FeedPostRow[]>;
    create(input: {
      clubId: string;
      membershipId: string;
      contentType: FeedContentType;
      textContent: string | null;
      mediaUrl: string | null;
      matchId: string | null;
    }): Promise<FeedPostRow>;
    findById(postId: string): Promise<Pick<FeedPostRow, 'id' | 'clubId' | 'membershipId'> | null>;
    delete(postId: string): Promise<void>;
  };
  reactions: {
    toggle(input: {
      postId: string;
      membershipId: string;
      reactionType: FeedReactionType;
    }): Promise<void>;
  };
};

export function createFeedPostService(repositories: FeedPostRepositories) {
  return {
    async listPosts(input: {
      auth: AuthContext;
      clubId: string;
      contentType?: string | null;
      page?: number | null;
      limit?: number | null;
    }) {
      const membership = await requireApprovedMembership(input.auth, input.clubId);
      return repositories.posts.list({
        clubId: input.clubId,
        membershipId: membership.id,
        contentType: normalizeContentTypeFilter(input.contentType),
        limit: normalizeLimit(input.limit),
        offset: Math.max(0, ((input.page ?? 1) - 1) * normalizeLimit(input.limit)),
      });
    },

    async createPost(input: {
      auth: AuthContext;
      clubId: string;
      contentType: string;
      textContent?: string | null;
      mediaUrl?: string | null;
      matchId?: string | null;
    }) {
      const membership = await requireApprovedMembership(input.auth, input.clubId);
      const contentType = normalizeContentType(input.contentType);
      const textContent = normalizeTextContent(input.textContent);
      const mediaUrl = normalizeMediaUrl(input.mediaUrl);
      const matchId = normalizeOptionalText(input.matchId);
      validatePostPayload({ contentType, textContent, mediaUrl });
      if (matchId) {
        const matchClubId = await repositories.matches.findClubId(matchId);
        if (matchClubId !== input.clubId) {
          throw new AppError('not_found', '연결할 경기를 찾을 수 없어요.');
        }
      }

      return repositories.posts.create({
        clubId: input.clubId,
        membershipId: membership.id,
        contentType,
        textContent,
        mediaUrl,
        matchId,
      });
    },

    async deletePost(input: {
      auth: AuthContext;
      clubId: string;
      postId: string;
    }) {
      const membership = await requireApprovedMembership(input.auth, input.clubId);
      const post = await repositories.posts.findById(input.postId);
      if (!post || post.clubId !== input.clubId) {
        throw new AppError('not_found', '게시글을 찾을 수 없어요.');
      }
      if (post.membershipId !== membership.id && membership.role !== 'admin' && membership.role !== 'operator') {
        throw new AppError('forbidden', '게시글을 삭제할 권한이 없어요.');
      }
      await repositories.posts.delete(input.postId);
      return { postId: input.postId, deleted: true as const };
    },

    async toggleReaction(input: {
      auth: AuthContext;
      clubId: string;
      postId: string;
      reactionType: string;
    }) {
      const membership = await requireApprovedMembership(input.auth, input.clubId);
      const post = await repositories.posts.findById(input.postId);
      if (!post || post.clubId !== input.clubId) {
        throw new AppError('not_found', '게시글을 찾을 수 없어요.');
      }
      await repositories.reactions.toggle({
        postId: input.postId,
        membershipId: membership.id,
        reactionType: normalizeReactionType(input.reactionType),
      });
      return { postId: input.postId, toggled: true as const };
    },
  };

  async function requireApprovedMembership(auth: AuthContext, clubId: string) {
    const membership = await repositories.memberships.findByAccountAndClub(auth.user.id, clubId);
    if (!membership || membership.status !== 'approved') {
      throw new AppError('membership_not_approved', '승인된 회원만 피드를 사용할 수 있어요.');
    }
    return membership;
  }
}

function normalizeContentType(value: string): FeedContentType {
  if (value === 'text' || value === 'image' || value === 'video') return value;
  throw new AppError('bad_request', 'contentType is invalid.');
}

function normalizeContentTypeFilter(value: string | null | undefined) {
  if (value == null || value === '') return null;
  if (value === 'image' || value === 'video') return value;
  throw new AppError('bad_request', 'contentType filter is invalid.');
}

function normalizeReactionType(value: string): FeedReactionType {
  if (value === 'fire' || value === 'laugh' || value === 'goat' || value === 'clap') return value;
  throw new AppError('bad_request', 'reactionType is invalid.');
}

function normalizeTextContent(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value);
  if (normalized && normalized.length > 500) {
    throw new AppError('bad_request', 'textContent must be 500 characters or fewer.');
  }
  return normalized;
}

function normalizeMediaUrl(value: string | null | undefined) {
  return normalizeOptionalText(value);
}

function normalizeOptionalText(value: string | null | undefined) {
  if (value == null) return null;
  const normalized = value.trim();
  return normalized || null;
}

function validatePostPayload(input: {
  contentType: FeedContentType;
  textContent: string | null;
  mediaUrl: string | null;
}) {
  if (input.contentType === 'text' && !input.textContent) {
    throw new AppError('bad_request', 'textContent is required for text posts.');
  }
  if ((input.contentType === 'image' || input.contentType === 'video') && !input.mediaUrl) {
    throw new AppError('bad_request', 'mediaUrl is required for media posts.');
  }
  if (input.contentType === 'text' && input.mediaUrl) {
    throw new AppError('bad_request', 'mediaUrl is not allowed for text posts.');
  }
}

function normalizeLimit(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isInteger(value)) return 20;
  return Math.min(50, Math.max(1, value));
}
