import { AppError } from '../types/api';
import type {
  AuthContext,
  EventCommentRow,
  EventCommentTargetType,
  TeamMembershipRow,
} from '../types/domain';

const MAX_COMMENT_CONTENT_LENGTH = 1000;

type CommentMembership = Pick<TeamMembershipRow, 'id' | 'clubId' | 'role' | 'status'>;

export type CommentRepositories = {
  memberships: {
    findByAccountAndClub(accountId: string, clubId: string): Promise<CommentMembership | null>;
  };
  targets: {
    findClubId(targetType: EventCommentTargetType, targetId: string): Promise<string | null>;
  };
  comments: {
    listForTarget(input: {
      targetType: EventCommentTargetType;
      targetId: string;
    }): Promise<EventCommentRow[]>;
    create(input: {
      targetType: EventCommentTargetType;
      targetId: string;
      membershipId: string;
      content: string;
    }): Promise<EventCommentRow>;
  };
};

export function createCommentService(repositories: CommentRepositories) {
  return {
    async listComments(input: {
      auth: AuthContext;
      clubId: string;
      targetType: string;
      targetId: string;
    }) {
      const targetType = normalizeTargetType(input.targetType);
      const membership = await repositories.memberships.findByAccountAndClub(input.auth.user.id, input.clubId);
      assertApprovedMember(membership);
      await assertTargetInClub(repositories, targetType, input.targetId, input.clubId);

      return repositories.comments.listForTarget({
        targetType,
        targetId: normalizeRequiredText(input.targetId, 'targetId is required.'),
      });
    },

    async createComment(input: {
      auth: AuthContext;
      clubId: string;
      targetType: string;
      targetId: string;
      content: string;
    }) {
      const targetType = normalizeTargetType(input.targetType);
      const membership = await repositories.memberships.findByAccountAndClub(input.auth.user.id, input.clubId);
      assertApprovedMember(membership);
      await assertTargetInClub(repositories, targetType, input.targetId, input.clubId);

      return repositories.comments.create({
        targetType,
        targetId: normalizeRequiredText(input.targetId, 'targetId is required.'),
        membershipId: membership.id,
        content: normalizeCommentContent(input.content),
      });
    },
  };
}

async function assertTargetInClub(
  repositories: CommentRepositories,
  targetType: EventCommentTargetType,
  targetId: string,
  clubId: string,
) {
  const normalizedTargetId = normalizeRequiredText(targetId, 'targetId is required.');
  const targetClubId = await repositories.targets.findClubId(targetType, normalizedTargetId);
  if (!targetClubId || targetClubId !== clubId) {
    throw new AppError('not_found', 'Comment target was not found for this club.');
  }
}

function assertApprovedMember(membership: CommentMembership | null): asserts membership is CommentMembership {
  if (!membership || membership.status !== 'approved') {
    throw new AppError('membership_not_approved', '승인된 회원만 코멘트를 사용할 수 있어요.', { status: 403 });
  }
}

function normalizeTargetType(value: string): EventCommentTargetType {
  if (value === 'match' || value === 'schedule_poll_option') {
    return value;
  }

  throw new AppError('bad_request', 'targetType is invalid.');
}

function normalizeRequiredText(value: string | null | undefined, message: string) {
  if (typeof value !== 'string') {
    throw new AppError('bad_request', message);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new AppError('bad_request', message);
  }

  return normalized;
}

function normalizeCommentContent(value: string | null | undefined) {
  const normalized = normalizeRequiredText(value, 'Comment content is required.');
  if (normalized.length > MAX_COMMENT_CONTENT_LENGTH) {
    throw new AppError('bad_request', `Comment content must be ${MAX_COMMENT_CONTENT_LENGTH} characters or fewer.`);
  }

  return normalized;
}
