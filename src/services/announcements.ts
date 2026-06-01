import { AppError } from '../types/api';
import type { AnnouncementRow, AuthContext, TeamMembershipRow } from '../types/domain';

type AnnouncementMembership = Pick<TeamMembershipRow, 'id' | 'clubId' | 'role' | 'status'>;

export type AnnouncementRepositories = {
  memberships: {
    findByAccountAndClub(accountId: string, clubId: string): Promise<AnnouncementMembership | null>;
  };
  announcements: {
    listByClub(clubId: string): Promise<AnnouncementRow[]>;
    create(input: {
      clubId: string;
      seasonId: string | null;
      title: string;
      content: string;
      authorMembershipId: string;
      isPinned: boolean;
    }): Promise<AnnouncementRow>;
  };
};

export function createAnnouncementService(repositories: AnnouncementRepositories) {
  return {
    async listAnnouncements(input: { auth: AuthContext; clubId: string }) {
      const membership = await repositories.memberships.findByAccountAndClub(input.auth.user.id, input.clubId);
      assertApprovedMember(membership);

      return repositories.announcements.listByClub(input.clubId);
    },

    async createAnnouncement(input: {
      auth: AuthContext;
      clubId: string;
      seasonId?: string | null;
      title: string;
      content: string;
      isPinned?: boolean;
    }) {
      const membership = await repositories.memberships.findByAccountAndClub(input.auth.user.id, input.clubId);
      assertCanWriteAnnouncements(membership);

      return repositories.announcements.create({
        clubId: input.clubId,
        seasonId: input.seasonId ?? null,
        title: normalizeRequiredText(input.title, '공지 제목을 입력해주세요.'),
        content: normalizeRequiredText(input.content, '공지 내용을 입력해주세요.'),
        authorMembershipId: membership.id,
        isPinned: input.isPinned === true,
      });
    },
  };
}

function assertApprovedMember(membership: AnnouncementMembership | null): asserts membership is AnnouncementMembership {
  if (!membership || membership.status !== 'approved') {
    throw new AppError('membership_not_approved', '승인된 회원만 공지사항을 볼 수 있어요.', { status: 403 });
  }
}

function assertCanWriteAnnouncements(membership: AnnouncementMembership | null): asserts membership is AnnouncementMembership {
  if (
    !membership ||
    membership.status !== 'approved' ||
    (membership.role !== 'admin' && membership.role !== 'operator')
  ) {
    throw new AppError('forbidden', '운영진만 공지사항을 작성할 수 있어요.');
  }
}

function normalizeRequiredText(value: string | null | undefined, message: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw new AppError('bad_request', message);
  }

  return normalized;
}
