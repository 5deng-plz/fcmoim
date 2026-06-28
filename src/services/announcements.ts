import { AppError } from '../types/api';
import type { TeamContext } from '../config/server-team';
import type { AnnouncementRow, AuthContext, TeamMembershipRow } from '../types/domain';

type AnnouncementMembership = Pick<TeamMembershipRow, 'id' | 'role' | 'status'>;

export type AnnouncementRepositories = {
  memberships: {
    findCurrentMembership(accountId: string, clubId: string): Promise<AnnouncementMembership | null>;
  };
  announcements: {
    listForTeam(clubId: string): Promise<AnnouncementRow[]>;
    findById(announcementId: string, teamId: string): Promise<AnnouncementRow | null>;
    create(input: {
      clubId: string;
      seasonId: string | null;
      title: string;
      content: string;
      authorMembershipId: string;
      isPinned: boolean;
    }): Promise<AnnouncementRow>;
    update(input: {
      announcementId: string;
      title: string;
      content: string;
      isPinned: boolean;
    }): Promise<AnnouncementRow>;
    delete(announcementId: string): Promise<void>;
  };
};

export function createAnnouncementService(
  repositories: AnnouncementRepositories,
  teamContext: TeamContext,
) {
  const teamId = teamContext.teamId;

  return {
    async listAnnouncements(input: { auth: AuthContext }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertApprovedMember(membership);

      return repositories.announcements.listForTeam(teamId);
    },

    async createAnnouncement(input: {
      auth: AuthContext;
      seasonId?: string | null;
      title: string;
      content: string;
      isPinned?: boolean;
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertCanWriteAnnouncements(membership);

      return repositories.announcements.create({
        clubId: teamId,
        seasonId: input.seasonId ?? null,
        title: normalizeRequiredText(input.title, '공지 제목을 입력해주세요.'),
        content: normalizeRequiredText(input.content, '공지 내용을 입력해주세요.'),
        authorMembershipId: membership.id,
        isPinned: input.isPinned === true,
      });
    },

    async updateAnnouncement(input: {
      auth: AuthContext;
      announcementId: string;
      title: string;
      content: string;
      isPinned?: boolean;
    }) {
      const announcement = await getExistingAnnouncement(repositories, input.announcementId, teamId);
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertCanWriteAnnouncements(membership);

      return repositories.announcements.update({
        announcementId: announcement.id,
        title: normalizeRequiredText(input.title, '공지 제목을 입력해주세요.'),
        content: normalizeRequiredText(input.content, '공지 내용을 입력해주세요.'),
        isPinned: input.isPinned === true,
      });
    },

    async deleteAnnouncement(input: {
      auth: AuthContext;
      announcementId: string;
    }) {
      const announcement = await getExistingAnnouncement(repositories, input.announcementId, teamId);
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertCanWriteAnnouncements(membership);

      await repositories.announcements.delete(announcement.id);
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

async function getExistingAnnouncement(
  repositories: AnnouncementRepositories,
  announcementId: string | null | undefined,
  teamId: string,
) {
  const normalizedId = normalizeRequiredText(announcementId, 'announcementId is required.');
  const announcement = await repositories.announcements.findById(normalizedId, teamId);
  if (!announcement) {
    throw new AppError('not_found', '공지사항을 찾을 수 없어요.');
  }

  return announcement;
}
