import { AppError } from '../types/api';
import type {
  AccountRow,
  ApprovedMemberAction,
  AuthContext,
  ClubMembershipSummaryRow,
  JoinProfileInput,
  MembershipStatus,
  NormalizedJoinProfile,
  TeamMembershipRow,
} from '../types/domain';

type AccountRepository = {
  upsertFromAuthUser(input: { id: string; email: string | null }): Promise<AccountRow>;
};

type MembershipRepository = {
  findByAccountAndClub(accountId: string, clubId: string): Promise<TeamMembershipRow | null>;
  findById(membershipId: string): Promise<TeamMembershipRow | null>;
  listClubMemberships(accountId: string): Promise<ClubMembershipSummaryRow[]>;
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
  updatePhoto(input: {
    membershipId: string;
    photoUrl: string | null;
  }): Promise<TeamMembershipRow>;
};

export type AccountMembershipRepositories = {
  accounts: AccountRepository;
  memberships: MembershipRepository;
};

export function createAccountMembershipService(repositories: AccountMembershipRepositories) {
  return {
    async bootstrapProfile(input: { auth: AuthContext; clubId: string }) {
      const account = await repositories.accounts.upsertFromAuthUser({
        id: input.auth.user.id,
        email: input.auth.user.email,
      });
      const membership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        input.clubId,
      );

      return {
        account,
        membership,
        membershipState: membership?.status ?? 'new',
      };
    },

    async listClubMemberships(input: { auth: AuthContext }) {
      return repositories.memberships.listClubMemberships(input.auth.user.id);
    },

    async joinClub(input: {
      auth: AuthContext;
      clubId: string;
      authUid?: string;
      profile: JoinProfileInput;
    }) {
      void input.authUid;
      const profile = normalizeJoinProfile(input.profile);

      return repositories.memberships.createPending({
        accountId: input.auth.user.id,
        clubId: input.clubId,
        profile,
      });
    },

    async reviewMembership(input: {
      auth: AuthContext;
      clubId: string;
      membershipId: string;
      decision: Exclude<MembershipStatus, 'pending'>;
      authUid?: string;
    }) {
      void input.authUid;
      const reviewerMembership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        input.clubId,
      );
      assertCanReviewMembership(reviewerMembership);

      const target = await repositories.memberships.findById(input.membershipId);
      if (!target || target.clubId !== input.clubId) {
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

    async updateMembershipPhoto(input: {
      auth: AuthContext;
      clubId: string;
      photoUrl: string | null;
    }) {
      const membership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        input.clubId,
      );

      if (!membership) {
        throw new AppError('not_found', 'Membership was not found for this club.');
      }

      const normalizedPhotoUrl = normalizePhotoUrl(input.photoUrl);
      return repositories.memberships.updatePhoto({
        membershipId: membership.id,
        photoUrl: normalizedPhotoUrl,
      });
    },

    async assertApprovedMemberAction(input: {
      auth: AuthContext;
      clubId: string;
      action: ApprovedMemberAction;
    }) {
      void input.action;
      const membership = await repositories.memberships.findByAccountAndClub(
        input.auth.user.id,
        input.clubId,
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

function normalizeJoinProfile(profile: JoinProfileInput): NormalizedJoinProfile {
  const nickname = profile.nickname.trim();
  if (!nickname) {
    throw new AppError('bad_request', 'Nickname is required.');
  }

  return {
    nickname,
    position: profile.position ?? null,
    heightCm: profile.heightCm ?? null,
    weightKg: profile.weightKg ?? null,
    birthDate: profile.birthDate ?? null,
    photoUrl: profile.photoUrl ?? null,
  };
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
    throw new AppError('bad_request', 'Only image uploads are supported.');
  }

  if (trimmed.length > 2_000_000) {
    throw new AppError('bad_request', 'The uploaded image is too large.');
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
