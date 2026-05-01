import { describe, expect, it, vi } from 'vitest';

type AuthContext = {
  user: {
    id: string;
    email: string;
  };
};

type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
type MembershipRole = 'admin' | 'operator' | 'member';

type AccountRow = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type MembershipRow = {
  id: string;
  accountId: string;
  clubId: string;
  role: MembershipRole;
  status: MembershipStatus;
  nickname: string;
  position: string | null;
  heightCm: number | null;
  weightKg: number | null;
  birthDate: string | null;
  photoUrl: string | null;
};

type AccountMembershipService = {
  bootstrapProfile(input: { auth: AuthContext; clubId: string }): Promise<{
    account: AccountRow;
    membership: MembershipRow | null;
    membershipState: 'new' | MembershipStatus;
  }>;
  joinClub(input: {
    auth: AuthContext;
    clubId: string;
    authUid?: string;
    profile: {
      nickname: string;
      position?: string | null;
      heightCm?: number | null;
      weightKg?: number | null;
      birthDate?: string | null;
      photoUrl?: string | null;
    };
  }): Promise<MembershipRow>;
  reviewMembership(input: {
    auth: AuthContext;
    clubId: string;
    membershipId: string;
    decision: Exclude<MembershipStatus, 'pending'>;
    authUid?: string;
  }): Promise<MembershipRow>;
  assertApprovedMemberAction(input: {
    auth: AuthContext;
    clubId: string;
    action: 'create-match' | 'save-match-result' | 'write-announcement';
  }): Promise<{ allowed: true }>;
};

type MembershipRepository = {
  findByAccountAndClub: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  createPending: ReturnType<typeof vi.fn>;
  updateStatus: ReturnType<typeof vi.fn>;
};

async function loadService(repositories: {
  accounts: {
    upsertFromAuthUser: ReturnType<typeof vi.fn>;
  };
  memberships: MembershipRepository;
}): Promise<AccountMembershipService> {
  const serviceModulePath = '../src/services/account-membership';
  const { createAccountMembershipService } = await import(serviceModulePath);

  return createAccountMembershipService(repositories);
}

function createRepositories(options?: {
  existingMembership?: MembershipRow | null;
  reviewerMembership?: Pick<MembershipRow, 'role' | 'status'> | null;
}) {
  const account: AccountRow = {
    id: 'auth-current-user',
    email: 'player@example.com',
    displayName: null,
    avatarUrl: null,
  };

  const existingMembership = options?.existingMembership ?? null;
  const reviewerMembership = options?.reviewerMembership ?? null;

  const accounts = {
    upsertFromAuthUser: vi.fn(async () => account),
  };

  const memberships: MembershipRepository = {
    findByAccountAndClub: vi.fn(async (accountId: string) => {
      if (accountId === 'reviewer-auth-user') {
        return reviewerMembership;
      }

      return existingMembership;
    }),
    findById: vi.fn(async () => ({
      id: 'membership-under-review',
      accountId: 'joining-account',
      clubId: 'club-1',
      role: 'member',
      status: 'pending',
      nickname: 'New Player',
      position: null,
      heightCm: null,
      weightKg: null,
      birthDate: null,
      photoUrl: null,
    })),
    createPending: vi.fn(async (input) => ({
      id: 'membership-created',
      accountId: input.accountId,
      clubId: input.clubId,
      role: 'member',
      status: 'pending',
      nickname: input.profile.nickname,
      position: input.profile.position,
      heightCm: input.profile.heightCm,
      weightKg: input.profile.weightKg,
      birthDate: input.profile.birthDate,
      photoUrl: input.profile.photoUrl,
    })),
    updateStatus: vi.fn(async ({ membershipId, status }) => ({
      id: membershipId,
      accountId: 'joining-account',
      clubId: 'club-1',
      role: 'member',
      status,
      nickname: 'New Player',
      position: null,
      heightCm: null,
      weightKg: null,
      birthDate: null,
      photoUrl: null,
    })),
  };

  return { accounts, memberships };
}

describe('v1.0 Account + TeamMembership flows', () => {
  it('bootstraps an authenticated Supabase user as an Account and returns new when no TeamMembership exists', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    const result = await service.bootstrapProfile({
      auth: {
        user: {
          id: 'auth-current-user',
          email: 'player@example.com',
        },
      },
      clubId: 'club-1',
    });

    expect(repositories.accounts.upsertFromAuthUser).toHaveBeenCalledWith({
      id: 'auth-current-user',
      email: 'player@example.com',
    });
    expect(repositories.memberships.findByAccountAndClub).toHaveBeenCalledWith(
      'auth-current-user',
      'club-1',
    );
    expect(result).toEqual({
      account: {
        id: 'auth-current-user',
        email: 'player@example.com',
        displayName: null,
        avatarUrl: null,
      },
      membership: null,
      membershipState: 'new',
    });
  });

  it('creates a pending TeamMembership on join and preserves unknown profile fields as null', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    const membership = await service.joinClub({
      auth: {
        user: {
          id: 'auth-current-user',
          email: 'player@example.com',
        },
      },
      clubId: 'club-1',
      profile: {
        nickname: 'No Defaults Please',
      },
    });

    expect(repositories.memberships.createPending).toHaveBeenCalledWith({
      accountId: 'auth-current-user',
      clubId: 'club-1',
      profile: {
        nickname: 'No Defaults Please',
        position: null,
        heightCm: null,
        weightKg: null,
        birthDate: null,
        photoUrl: null,
      },
    });
    expect(membership).toMatchObject({
      accountId: 'auth-current-user',
      clubId: 'club-1',
      role: 'member',
      status: 'pending',
      position: null,
      heightCm: null,
      weightKg: null,
      birthDate: null,
      photoUrl: null,
    });
  });

  it('ignores client-submitted authUid and uses server auth context as the joining account', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await service.joinClub({
      auth: {
        user: {
          id: 'auth-current-user',
          email: 'player@example.com',
        },
      },
      authUid: 'spoofed-other-user',
      clubId: 'club-1',
      profile: {
        nickname: 'Current User Only',
      },
    });

    expect(repositories.memberships.createPending).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'auth-current-user',
      }),
    );
    expect(repositories.memberships.createPending).not.toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'spoofed-other-user',
      }),
    );
  });

  it.each([
    ['member', 'approved'],
    ['operator', 'pending'],
    ['admin', 'suspended'],
  ] satisfies Array<[MembershipRole, MembershipStatus]>)(
    'denies membership review when caller is %s/%s',
    async (role, status) => {
      const repositories = createRepositories({
        reviewerMembership: { role, status },
      });
      const service = await loadService(repositories);

      await expect(
        service.reviewMembership({
          auth: {
            user: {
              id: 'reviewer-auth-user',
              email: 'reviewer@example.com',
            },
          },
          authUid: 'admin-impersonation-attempt',
          clubId: 'club-1',
          membershipId: 'membership-under-review',
          decision: 'approved',
        }),
      ).rejects.toMatchObject({
        code: 'forbidden',
      });
      expect(repositories.memberships.updateStatus).not.toHaveBeenCalled();
    },
  );

  it.each(['operator', 'admin'] satisfies MembershipRole[])(
    'allows %s to transition pending membership to approved, rejected, and suspended',
    async (role) => {
      const repositories = createRepositories({
        reviewerMembership: { role, status: 'approved' },
      });
      const service = await loadService(repositories);

      for (const decision of ['approved', 'rejected', 'suspended'] as const) {
        await expect(
          service.reviewMembership({
            auth: {
              user: {
                id: 'reviewer-auth-user',
                email: 'reviewer@example.com',
              },
            },
            authUid: 'spoofed-other-user',
            clubId: 'club-1',
            membershipId: 'membership-under-review',
            decision,
          }),
        ).resolves.toMatchObject({
          id: 'membership-under-review',
          status: decision,
        });
      }

      expect(repositories.memberships.updateStatus).toHaveBeenCalledWith({
        membershipId: 'membership-under-review',
        status: 'approved',
        reviewedByAccountId: 'reviewer-auth-user',
      });
      expect(repositories.memberships.updateStatus).not.toHaveBeenCalledWith(
        expect.objectContaining({
          reviewedByAccountId: 'spoofed-other-user',
        }),
      );
    },
  );

  it.each(['pending', 'rejected', 'suspended'] satisfies MembershipStatus[])(
    'denies approved-member actions while membership is %s',
    async (status) => {
      const repositories = createRepositories({
        existingMembership: {
          id: `${status}-membership`,
          accountId: 'auth-current-user',
          clubId: 'club-1',
          role: 'member',
          status,
          nickname: 'Blocked Member',
          position: null,
          heightCm: null,
          weightKg: null,
          birthDate: null,
          photoUrl: null,
        },
      });
      const service = await loadService(repositories);

      await expect(
        service.assertApprovedMemberAction({
          auth: {
            user: {
              id: 'auth-current-user',
              email: 'player@example.com',
            },
          },
          clubId: 'club-1',
          action: 'save-match-result',
        }),
      ).rejects.toMatchObject({
        code: 'membership_not_approved',
      });
    },
  );
});
