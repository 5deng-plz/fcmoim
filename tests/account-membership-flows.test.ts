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
  ovr: number;
  matchPoints: number;
  preferredFoot: 'left' | 'right' | 'both';
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
  changeMembershipRole(input: {
    auth: AuthContext;
    clubId: string;
    membershipId: string;
    role: 'operator' | 'member';
  }): Promise<MembershipRow>;
  listPendingMemberships(input: { auth: AuthContext; clubId: string }): Promise<Array<{
    id: string;
    nickname: string;
    position: string | null;
  }>>;
  assertApprovedMemberAction(input: {
    auth: AuthContext;
    clubId: string;
    action: 'create-match' | 'save-match-result' | 'write-announcement';
  }): Promise<{ allowed: true }>;
};

type MembershipRepository = {
  findByAccountAndClub: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  listPendingByClub: ReturnType<typeof vi.fn>;
  createPending: ReturnType<typeof vi.fn>;
  updateStatus: ReturnType<typeof vi.fn>;
  updateRole: ReturnType<typeof vi.fn>;
};

function createMembershipRow(overrides: Partial<MembershipRow> = {}): MembershipRow {
  return {
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
    ovr: 60,
    matchPoints: 100,
    preferredFoot: 'right',
    ...overrides,
  };
}

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
    findById: vi.fn(async () => createMembershipRow()),
    listPendingByClub: vi.fn(async () => [
      {
        id: 'membership-under-review',
        accountId: 'joining-account',
        clubId: 'club-1',
        nickname: 'New Player',
        position: 'MF',
        heightCm: 175,
        weightKg: 70,
        preferredFoot: 'right',
        createdAt: '2026-05-08T00:00:00.000Z',
      },
    ]),
    createPending: vi.fn(async (input) => createMembershipRow({
      id: 'membership-created',
      accountId: input.accountId,
      clubId: input.clubId,
      status: 'pending',
      nickname: input.profile.nickname,
      position: input.profile.position,
      heightCm: input.profile.heightCm,
      weightKg: input.profile.weightKg,
      birthDate: input.profile.birthDate,
      photoUrl: input.profile.photoUrl,
      preferredFoot: input.profile.preferredFoot ?? 'right',
    })),
    updateStatus: vi.fn(async ({ membershipId, status }) => createMembershipRow({
      id: membershipId,
      status,
    })),
    updateRole: vi.fn(async ({ membershipId, role }) => createMembershipRow({
      id: membershipId,
      status: 'approved',
      role,
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
        preferredFoot: null,
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

  it('allows approved admins to grant and revoke operator role for approved members', async () => {
    const repositories = createRepositories({
      reviewerMembership: { role: 'admin', status: 'approved' },
    });
    const service = await loadService(repositories);

    repositories.memberships.findById
      .mockResolvedValueOnce(createMembershipRow({ status: 'approved', role: 'member' }))
      .mockResolvedValueOnce(createMembershipRow({ status: 'approved', role: 'operator' }));

    await expect(
      service.changeMembershipRole({
        auth: {
          user: {
            id: 'reviewer-auth-user',
            email: 'admin@example.com',
          },
        },
        clubId: 'club-1',
        membershipId: 'membership-under-review',
        role: 'operator',
      }),
    ).resolves.toMatchObject({ role: 'operator' });

    await expect(
      service.changeMembershipRole({
        auth: {
          user: {
            id: 'reviewer-auth-user',
            email: 'admin@example.com',
          },
        },
        clubId: 'club-1',
        membershipId: 'membership-under-review',
        role: 'member',
      }),
    ).resolves.toMatchObject({ role: 'member' });

    expect(repositories.memberships.updateRole).toHaveBeenCalledWith({
      membershipId: 'membership-under-review',
      role: 'operator',
    });
    expect(repositories.memberships.updateRole).toHaveBeenCalledWith({
      membershipId: 'membership-under-review',
      role: 'member',
    });
  });

  it('denies role changes for admin target memberships', async () => {
    const repositories = createRepositories({
      reviewerMembership: { role: 'admin', status: 'approved' },
    });
    const service = await loadService(repositories);
    repositories.memberships.findById.mockResolvedValueOnce(
      createMembershipRow({ status: 'approved', role: 'admin' }),
    );

    await expect(
      service.changeMembershipRole({
        auth: {
          user: {
            id: 'reviewer-auth-user',
            email: 'admin@example.com',
          },
        },
        clubId: 'club-1',
        membershipId: 'membership-under-review',
        role: 'member',
      }),
    ).rejects.toMatchObject({
      code: 'conflict',
    });

    expect(repositories.memberships.updateRole).not.toHaveBeenCalled();
  });

  it('allows approved operators to list pending membership review cards', async () => {
    const repositories = createRepositories({
      reviewerMembership: { role: 'operator', status: 'approved' },
    });
    const service = await loadService(repositories);

    await expect(
      service.listPendingMemberships({
        auth: {
          user: {
            id: 'reviewer-auth-user',
            email: 'reviewer@example.com',
          },
        },
        clubId: 'club-1',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'membership-under-review',
        nickname: 'New Player',
      }),
    ]);

    expect(repositories.memberships.listPendingByClub).toHaveBeenCalledWith('club-1');
  });

  it('denies pending membership list to non-operators', async () => {
    const repositories = createRepositories({
      reviewerMembership: { role: 'member', status: 'approved' },
    });
    const service = await loadService(repositories);

    await expect(
      service.listPendingMemberships({
        auth: {
          user: {
            id: 'reviewer-auth-user',
            email: 'reviewer@example.com',
          },
        },
        clubId: 'club-1',
      }),
    ).rejects.toMatchObject({
      code: 'forbidden',
    });

    expect(repositories.memberships.listPendingByClub).not.toHaveBeenCalled();
  });

  it.each(['pending', 'rejected', 'suspended'] satisfies MembershipStatus[])(
    'denies approved-member actions while membership is %s',
    async (status) => {
      const repositories = createRepositories({
        existingMembership: createMembershipRow({
          id: `${status}-membership`,
          accountId: 'auth-current-user',
          status,
          nickname: 'Blocked Member',
        }),
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
