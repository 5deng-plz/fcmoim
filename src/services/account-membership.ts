import { AppError } from '../types/api';
import type { TeamContext } from '../config/server-team';
import type {
  AccountRow,
  ApprovedMemberAction,
  AuthContext,
  ClubMembershipSummaryRow,
  JoinProfileInput,
  MembershipStats,
  MembershipProfilePatch,
  MembershipStatus,
  NormalizedJoinProfile,
  PendingMembershipReviewRow,
  TeamMembershipRow,
} from '../types/domain';
import { calculateStatsOvr } from '../utils/stats';

const MAX_PROFILE_STATS_SUM = 400;
const MEMBERSHIP_STAT_KEYS: Array<keyof MembershipStats> = [
  'attack',
  'defense',
  'stamina',
  'mentality',
  'speed',
  'manner',
];

type AccountRepository = {
  upsertFromAuthUser(input: { id: string; email: string | null }): Promise<AccountRow>;
};

type MembershipRepository = {
  findByAccountAndClub(accountId: string, clubId: string): Promise<TeamMembershipRow | null>;
  findById(membershipId: string): Promise<TeamMembershipRow | null>;
  listClubMemberships(accountId: string): Promise<ClubMembershipSummaryRow[]>;
  listApprovedByClub(clubId: string): Promise<TeamMembershipRow[]>;
  listPendingByClub(clubId: string): Promise<PendingMembershipReviewRow[]>;
  createPending(input: {
    accountId: string;
    clubId: string;
    profile: NormalizedJoinProfile;
  }): Promise<TeamMembershipRow>;
  updateStatus(input: {
    membershipId: string;
    status: Exclude<MembershipStatus, 'pending'>;
    reviewedByAccountId: string;
  }): Promise<TeamMembershipRow>;
  updateRole(input: {
    membershipId: string;
    role: TeamMembershipRow['role'];
  }): Promise<TeamMembershipRow>;
  updatePhoto(input: {
    membershipId: string;
    photoUrl: string | null;
  }): Promise<TeamMembershipRow>;
  updateProfile(input: {
    membershipId: string;
    profile: MembershipProfilePatch;
  }): Promise<TeamMembershipRow>;
  listUnlockedTraitIds(membershipId: string): Promise<string[]>;
};

export type AccountMembershipRepositories = {
  accounts: AccountRepository;
  memberships: MembershipRepository;
};

export function createAccountMembershipService(
  repositories: AccountMembershipRepositories,
  teamContext: TeamContext,
) {
  const { teamId } = teamContext;

  function assertCanManageMembership(membership: TeamMembershipRow | Pick<TeamMembershipRow, 'role' | 'status'> | null) {
    if (
      !membership ||
      membership.status !== 'approved' ||
      (membership.role !== 'admin' && membership.role !== 'operator')
    ) {
      throw new AppError('forbidden', 'Only approved club operators can manage memberships.');
    }
  }

  async function changeMembershipRole(input: {
    auth: AuthContext;
    membershipId: string;
    role: 'operator' | 'member';
  }) {
    const adminMembership = await repositories.memberships.findByAccountAndClub(
      input.auth.user.id,
      teamId,
    );
    assertCanAssignOperatorRole(adminMembership);

    const target = await repositories.memberships.findById(input.membershipId);
    if (!target || target.clubId !== teamId) {
      throw new AppError('not_found', 'Membership was not found for this club.');
    }
    if (target.status !== 'approved') {
      throw new AppError('conflict', 'Only approved memberships can have roles changed.');
    }
    if (target.role === 'admin') {
      throw new AppError('conflict', 'Admin memberships cannot be changed here.');
    }
    if (target.role === input.role) {
      return target;
    }

    return repositories.memberships.updateRole({
      membershipId: input.membershipId,
      role: input.role,
    });
  }

  return {
    async bootstrapProfile(input: { auth: AuthContext }) {
      const account = await repositories.accounts.upsertFromAuthUser({
        id: input.auth.user.id,
        email: input.auth.user.email,
      });
      const membership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        teamId,
      );
      const membershipWithTraits = membership
        ? {
            ...membership,
            unlockedTraitIds: await repositories.memberships.listUnlockedTraitIds(membership.id),
          }
        : null;

      return {
        account,
        membership: membershipWithTraits,
        membershipState: membershipWithTraits?.status ?? 'new',
      };
    },

    async listCompatibleMemberships(input: { auth: AuthContext }) {
      const memberships = await repositories.memberships.listClubMemberships(input.auth.user.id);
      return memberships.filter((membership) => membership.clubId === teamId);
    },

    async listPendingMemberships(input: { auth: AuthContext }) {
      const reviewerMembership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        teamId,
      );
      assertCanReviewMembership(reviewerMembership);

      return repositories.memberships.listPendingByClub(teamId);
    },

    async listApprovedMemberships(input: { auth: AuthContext }) {
      const membership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        teamId,
      );
      assertApprovedMembership(membership);

      return repositories.memberships.listApprovedByClub(teamId);
    },

    async joinClub(input: {
      auth: AuthContext;
      authUid?: string;
      profile: JoinProfileInput;
    }) {
      void input.authUid;
      const existingMembership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        teamId,
      );
      if (existingMembership) {
        throw new AppError('conflict', getExistingJoinMessage(existingMembership.status));
      }

      const profile = normalizeJoinProfile(input.profile);

      return repositories.memberships.createPending({
        accountId: input.auth.user.id,
        clubId: teamId,
        profile,
      });
    },

    async reviewMembership(input: {
      auth: AuthContext;
      membershipId: string;
      decision: Exclude<MembershipStatus, 'pending'>;
      authUid?: string;
    }) {
      void input.authUid;
      if (!isReviewDecision(input.decision)) {
        throw new AppError('bad_request', 'Unsupported membership review decision.');
      }

      const reviewerMembership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        teamId,
      );
      assertCanReviewMembership(reviewerMembership);

      const target = await repositories.memberships.findById(input.membershipId);
      if (!target || target.clubId !== teamId) {
        throw new AppError('not_found', 'Membership was not found for this club.');
      }
      if (target.status !== 'pending') {
        throw new AppError('conflict', 'Only pending memberships can be reviewed.');
      }

      return repositories.memberships.updateStatus({
        membershipId: input.membershipId,
        status: input.decision,
        reviewedByAccountId: input.auth.user.id,
      });
    },

    changeMembershipRole,

    async assignOperatorRole(input: {
      auth: AuthContext;
      membershipId: string;
    }) {
      return changeMembershipRole({ ...input, role: 'operator' });
    },

    async updateMembershipPhoto(input: {
      auth: AuthContext;
      photoUrl: string | null;
    }) {
      return this.updateMembershipProfile({
        auth: input.auth,
        profile: { photoUrl: input.photoUrl },
      });
    },

    async updateMembershipProfile(input: {
      auth: AuthContext;
      profile: MembershipProfilePatch;
    }) {
      const membership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        teamId,
      );

      if (!membership) {
        throw new AppError('not_found', 'Membership was not found for this club.');
      }

      const profile = normalizeMembershipProfilePatch(input.profile);
      return repositories.memberships.updateProfile({
        membershipId: membership.id,
        profile,
      });
    },

    async withdrawMembership(input: {
      auth: AuthContext;
      membershipId: string;
    }) {
      const target = await repositories.memberships.findById(input.membershipId);
      if (!target || target.clubId !== teamId) {
        throw new AppError('not_found', 'Membership was not found for this club.');
      }

      // If the caller is withdrawing their own membership:
      if (target.accountId === input.auth.user.id) {
        if (target.role === 'admin') {
          throw new AppError('conflict', 'Admin memberships cannot be withdrawn here.');
        }
        if (target.status === 'withdrawn') {
          return target;
        }
        return repositories.memberships.updateStatus({
          membershipId: input.membershipId,
          status: 'withdrawn',
          reviewedByAccountId: input.auth.user.id,
        });
      }

      // If the caller is withdrawing someone else's membership:
      const managerMembership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        teamId,
      );
      assertCanManageMembership(managerMembership);

      if (target.role === 'admin') {
        throw new AppError('conflict', 'Admin memberships cannot be withdrawn here.');
      }
      if (target.status === 'withdrawn') {
        return target;
      }
      if (target.status !== 'approved' && target.status !== 'pending') {
        throw new AppError('conflict', 'Only approved or pending memberships can be withdrawn.');
      }

      return repositories.memberships.updateStatus({
        membershipId: input.membershipId,
        status: 'withdrawn',
        reviewedByAccountId: input.auth.user.id,
      });
    },

    async assertApprovedMemberAction(input: {
      auth: AuthContext;
      action: ApprovedMemberAction;
    }) {
      void input.action;
      const membership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        teamId,
      );

      if (!membership || membership.status !== 'approved') {
        throw new AppError(
          'membership_not_approved',
          'This action requires an approved team membership.',
          { status: 403 },
        );
      }

      return { allowed: true as const };
    },
  };
}

function getExistingJoinMessage(status: MembershipStatus) {
  if (status === 'approved') {
    return '이 팀에는 새 입단신청을 보낼 수 없습니다.';
  }
  if (status === 'pending') {
    return '이미 입단신청이 접수되어 운영진 승인을 기다리고 있습니다.';
  }
  if (status === 'rejected') {
    return '이 팀의 입단신청이 반려된 상태입니다. 팀 운영진에게 문의해주세요.';
  }
  if (status === 'suspended') {
    return '이 팀의 멤버십이 일시 중지된 상태입니다. 팀 운영진에게 문의해주세요.';
  }
  return '이 팀에는 새 입단신청을 제출할 수 없습니다. 팀 운영진에게 문의해주세요.';
}

function normalizeJoinProfile(profile: JoinProfileInput): NormalizedJoinProfile {
  const nickname = profile.nickname.trim();
  if (!nickname) {
    throw new AppError('bad_request', 'Nickname is required.');
  }

  const result: NormalizedJoinProfile = {
    nickname,
    position: profile.position ?? null,
    heightCm: profile.heightCm ?? null,
    weightKg: profile.weightKg ?? null,
    birthDate: profile.birthDate ?? null,
    residence: normalizeResidence(profile.residence),
    photoUrl: profile.photoUrl ?? null,
    preferredFoot: profile.preferredFoot ?? null,
  };

  if (profile.stats) {
    result.stats = profile.stats;
  }
  if (typeof profile.ovr === 'number') {
    result.ovr = profile.ovr;
  }

  return result;
}

function normalizeMembershipProfilePatch(profile: MembershipProfilePatch): MembershipProfilePatch {
  const normalized: MembershipProfilePatch = {};

  if ('nickname' in profile) {
    const nickname = profile.nickname?.trim() ?? '';
    if (!nickname) {
      throw new AppError('bad_request', 'Nickname is required.');
    }
    normalized.nickname = nickname;
  }

  if ('heightCm' in profile) normalized.heightCm = normalizeNullableInteger(
    profile.heightCm,
    100,
    230,
    '키는 100cm 이상 230cm 이하로 입력해주세요.',
  );
  if ('weightKg' in profile) normalized.weightKg = normalizeNullableInteger(
    profile.weightKg,
    30,
    180,
    '몸무게는 30kg 이상 180kg 이하로 입력해주세요.',
  );
  if ('birthDate' in profile) normalized.birthDate = normalizeBirthDate(profile.birthDate);
  if ('residence' in profile) normalized.residence = normalizeResidence(profile.residence);
  if ('photoUrl' in profile) normalized.photoUrl = normalizePhotoUrl(profile.photoUrl ?? null);
  if ('preferredFoot' in profile) normalized.preferredFoot = normalizePreferredFoot(profile.preferredFoot);
  if ('stats' in profile) {
    normalized.stats = normalizeProfileStats(profile.stats);
    normalized.ovr = calculateStatsOvr(normalized.stats);
  }

  if (Object.keys(normalized).length === 0) {
    throw new AppError('bad_request', '저장할 프로필 정보가 없습니다.');
  }

  return normalized;
}

function normalizeProfileStats(value: MembershipProfilePatch['stats']): MembershipStats {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('bad_request', '능력치 정보가 올바르지 않습니다.');
  }

  const normalized = {} as MembershipStats;
  let total = 0;

  for (const key of MEMBERSHIP_STAT_KEYS) {
    const statValue = value[key];

    if (typeof statValue !== 'number' || !Number.isFinite(statValue)) {
      throw new AppError('bad_request', '능력치는 숫자로 입력해주세요.');
    }

    const roundedValue = Math.round(statValue);
    if (roundedValue !== statValue || roundedValue < 0 || roundedValue > 99) {
      throw new AppError('bad_request', '능력치는 0 이상 99 이하의 정수여야 합니다.');
    }

    normalized[key] = roundedValue;
    total += roundedValue;
  }

  if (total > MAX_PROFILE_STATS_SUM) {
    throw new AppError('bad_request', `능력치 총합은 ${MAX_PROFILE_STATS_SUM}점을 초과할 수 없습니다.`);
  }

  return normalized;
}

function normalizeNullableInteger(value: number | null | undefined, min: number, max: number, message: string) {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new AppError('bad_request', message);
  }
  return value;
}

function normalizeBirthDate(value: string | null | undefined) {
  if (value === null || value === undefined || !value.trim()) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new AppError('bad_request', '생년월일은 YYYY-MM-DD 형식으로 입력해주세요.');
  }
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date > new Date()) {
    throw new AppError('bad_request', '올바른 생년월일을 입력해주세요.');
  }
  return trimmed;
}

function normalizeResidence(value: string | null | undefined) {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 80) {
    throw new AppError('bad_request', '거주지는 80자 이하로 입력해주세요.');
  }
  return trimmed;
}

function normalizePreferredFoot(value: MembershipProfilePatch['preferredFoot']) {
  if (value === null || value === undefined) return null;
  if (value !== 'left' && value !== 'right' && value !== 'both') {
    throw new AppError('bad_request', '주발 값이 올바르지 않습니다.');
  }
  return value;
}

function normalizePhotoUrl(photoUrl: string | null) {
  if (photoUrl === null) {
    return null;
  }

  const trimmed = photoUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith('data:image/')) {
    throw new AppError('bad_request', '이미지 파일만 업로드할 수 있습니다.');
  }

  if (trimmed.length > 2_000_000) {
    throw new AppError('bad_request', '업로드한 이미지 용량이 너무 큽니다.');
  }

  return trimmed;
}

function assertCanReviewMembership(membership: TeamMembershipRow | Pick<TeamMembershipRow, 'role' | 'status'> | null) {
  if (
    !membership ||
    membership.status !== 'approved' ||
    (membership.role !== 'admin' && membership.role !== 'operator')
  ) {
    throw new AppError('forbidden', 'Only approved club operators can review memberships.');
  }
}

function isReviewDecision(status: MembershipStatus): status is 'approved' | 'rejected' | 'suspended' {
  return status === 'approved' || status === 'rejected' || status === 'suspended';
}

function assertApprovedMembership(membership: TeamMembershipRow | Pick<TeamMembershipRow, 'status'> | null) {
  if (!membership || membership.status !== 'approved') {
    throw new AppError('forbidden', 'Only approved club members can view memberships.');
  }
}

function assertCanAssignOperatorRole(membership: TeamMembershipRow | Pick<TeamMembershipRow, 'role' | 'status'> | null) {
  if (!membership || membership.status !== 'approved' || membership.role !== 'admin') {
    throw new AppError('forbidden', 'Only approved club admins can assign operator roles.');
  }
}
