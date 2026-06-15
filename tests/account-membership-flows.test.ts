import { describe, expect, it, vi } from 'vitest';

type AuthContext = {
  user: {
    id: string;
    email: string;
  };
};

type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'withdrawn';
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
  residence: string | null;
  photoUrl: string | null;
  ovr: number;
  stats: {
    attack: number;
    defense: number;
    stamina: number;
    mentality: number;
    speed: number;
    manner: number;
  };
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
  withdrawMembership(input: {
    auth: AuthContext;
    clubId: string;
    membershipId: string;
  }): Promise<MembershipRow>;
  updateMembershipProfile(input: {
    auth: AuthContext;
    clubId: string;
    profile: {
      stats?: MembershipRow['stats'] | null;
      ovr?: number | null;
    };
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
  updatePhoto: ReturnType<typeof vi.fn>;
  updateProfile: ReturnType<typeof vi.fn>;
  listUnlockedTraitIds: ReturnType<typeof vi.fn>;
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
    residence: null,
    photoUrl: null,
    ovr: 60,
    stats: {
      attack: 60,
      defense: 60,
      stamina: 60,
      mentality: 60,
      speed: 60,
      manner: 60,
    },
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
      residence: input.profile.residence,
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
    updatePhoto: vi.fn(async ({ membershipId, photoUrl }) => createMembershipRow({
      id: membershipId,
      status: 'approved',
      photoUrl,
    })),
    updateProfile: vi.fn(async ({ membershipId, profile }) => createMembershipRow({
      id: membershipId,
      status: 'approved',
      ...profile,
    })),
    listUnlockedTraitIds: vi.fn(async () => []),
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
        residence: null,
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
    ['approved', '이 팀에는 새 입단신청을 보낼 수 없습니다.'],
    ['pending', '이미 입단신청이 접수되어 운영진 승인을 기다리고 있습니다.'],
    ['rejected', '이 팀의 입단신청이 반려된 상태입니다. 팀 운영진에게 문의해주세요.'],
    ['suspended', '이 팀의 멤버십이 일시 중지된 상태입니다. 팀 운영진에게 문의해주세요.'],
    ['withdrawn', '이 팀에는 새 입단신청을 제출할 수 없습니다. 팀 운영진에게 문의해주세요.'],
  ] satisfies Array<[MembershipStatus, string]>)(
    'rejects duplicate join requests when the selected club membership is already %s',
    async (status, message) => {
      const repositories = createRepositories({
        existingMembership: createMembershipRow({ status }),
      });
      const service = await loadService(repositories);

      await expect(
        service.joinClub({
          auth: {
            user: {
              id: 'auth-current-user',
              email: 'player@example.com',
            },
          },
          clubId: 'club-1',
          profile: {
            nickname: 'Duplicate Player',
          },
        }),
      ).rejects.toMatchObject({
        code: 'conflict',
        message,
      });
      expect(repositories.memberships.createPending).not.toHaveBeenCalled();
    },
  );

  it('updates membership profile stats with a server-calculated ovr', async () => {
    const repositories = createRepositories({
      existingMembership: createMembershipRow({
        id: 'membership-current-user',
        accountId: 'auth-current-user',
        status: 'approved',
      }),
    });
    const service = await loadService(repositories);
    const stats = {
      attack: 70,
      defense: 60,
      stamina: 60,
      mentality: 60,
      speed: 60,
      manner: 60,
    };

    await service.updateMembershipProfile({
      auth: {
        user: {
          id: 'auth-current-user',
          email: 'player@example.com',
        },
      },
      clubId: 'club-1',
      profile: {
        stats,
        ovr: 99,
      },
    });

    expect(repositories.memberships.updateProfile).toHaveBeenCalledWith({
      membershipId: 'membership-current-user',
      profile: {
        stats,
        ovr: 62,
      },
    });
  });

  it.each([
    ['above range', { attack: 100, defense: 60, stamina: 60, mentality: 60, speed: 60, manner: 60 }],
    ['above total', { attack: 99, defense: 99, stamina: 99, mentality: 99, speed: 99, manner: 99 }],
    ['missing field', { attack: 70, defense: 60, stamina: 60, mentality: 60, speed: 60 }],
    ['non-number field', { attack: '70', defense: 60, stamina: 60, mentality: 60, speed: 60, manner: 60 }],
  ])('rejects invalid membership profile stats: %s', async (_caseName, stats) => {
    const repositories = createRepositories({
      existingMembership: createMembershipRow({
        id: 'membership-current-user',
        accountId: 'auth-current-user',
        status: 'approved',
      }),
    });
    const service = await loadService(repositories);

    await expect(service.updateMembershipProfile({
      auth: {
        user: {
          id: 'auth-current-user',
          email: 'player@example.com',
        },
      },
      clubId: 'club-1',
      profile: {
        stats: stats as MembershipRow['stats'],
      },
    })).rejects.toMatchObject({
      code: 'bad_request',
    });
    expect(repositories.memberships.updateProfile).not.toHaveBeenCalled();
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

  it('allows approved operators to withdraw approved non-admin members', async () => {
    const repositories = createRepositories({
      reviewerMembership: { role: 'operator', status: 'approved' },
    });
    const service = await loadService(repositories);
    repositories.memberships.findById.mockResolvedValueOnce(
      createMembershipRow({ status: 'approved', role: 'member', accountId: 'other-account' }),
    );

    await expect(
      service.withdrawMembership({
        auth: {
          user: {
            id: 'reviewer-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        membershipId: 'membership-under-review',
      }),
    ).resolves.toMatchObject({ status: 'withdrawn' });

    expect(repositories.memberships.updateStatus).toHaveBeenCalledWith({
      membershipId: 'membership-under-review',
      status: 'withdrawn',
      reviewedByAccountId: 'reviewer-auth-user',
    });
  });

  it.each(['pending', 'rejected', 'suspended', 'withdrawn'] satisfies MembershipStatus[])(
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
