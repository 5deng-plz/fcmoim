import { describe, expect, it, vi } from 'vitest';

type AuthContext = {
  user: {
    id: string;
    email: string | null;
  };
};

type MembershipRole = 'admin' | 'operator' | 'member';
type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

type Membership = {
  id: string;
  accountId: string;
  clubId: string;
  role: MembershipRole;
  status: MembershipStatus;
};

type SchedulePollService = {
  createPoll(input: {
    auth: AuthContext;
    authUid?: string;
    clubId: string;
    seasonId?: string | null;
    title: string;
    commonTime: string;
    location: string;
    optionDates: string[];
    memo?: string | null;
    closesAt?: string | null;
  }): Promise<unknown>;
  listActivePolls(input: {
    auth: AuthContext;
    clubId: string;
  }): Promise<unknown[]>;
  votePoll(input: {
    auth: AuthContext;
    clubId: string;
    pollId: string;
    selectedOptionIds: string[];
  }): Promise<unknown>;
  promotePoll(input: {
    auth: AuthContext;
    clubId: string;
    pollId: string;
    optionId: string;
  }): Promise<unknown>;
  cancelPoll(input: {
    auth: AuthContext;
    clubId: string;
    pollId: string;
    cancellationReason: string;
  }): Promise<unknown>;
};

async function loadService(repositories: {
  memberships: {
    findByAccountAndClub: ReturnType<typeof vi.fn>;
  };
  seasons: {
    findActiveByClub: ReturnType<typeof vi.fn>;
  };
  polls: {
    create: ReturnType<typeof vi.fn>;
    listActive: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findActiveDateConflicts: ReturnType<typeof vi.fn>;
    replaceVote: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    promoteToMatch: ReturnType<typeof vi.fn>;
  };
}): Promise<SchedulePollService> {
  const { createSchedulePollService } = await import('../src/services/schedule-polls');

  return createSchedulePollService(
    repositories as unknown as Parameters<typeof createSchedulePollService>[0],
  );
}

function createRepositories(options?: {
  membership?: Membership | null;
  pollStatus?: 'open' | 'closed' | 'promoted' | 'cancelled';
  pollSeasonId?: string | null;
  activeSeasonId?: string | null;
  activeDateConflicts?: Array<{ date: string; source: 'schedule' | 'poll' }>;
}) {
  const membership = options?.membership ?? {
    id: 'operator-membership',
    accountId: 'current-auth-user',
    clubId: 'club-1',
    role: 'operator',
    status: 'approved',
  };

  const poll = {
    id: 'poll-1',
    clubId: 'club-1',
    seasonId: options?.pollSeasonId === undefined ? 'season-1' : options.pollSeasonId,
    title: '3월 친선 경기 일정 투표',
    status: options?.pollStatus ?? 'open',
    commonTime: '18:00',
    location: '서울 용산 풋살장',
    memo: null,
    closesAt: null,
    createdByMembershipId: 'operator-membership',
    cancellationReason: null,
    cancelledAt: null,
    promotedMatchId: null,
    options: [
      { id: 'option-1', pollId: 'poll-1', optionDate: '2026-03-21', sortOrder: 0 },
      { id: 'option-2', pollId: 'poll-1', optionDate: '2026-03-22', sortOrder: 1 },
    ],
    votes: [
      { id: 'vote-red', pollId: 'poll-1', optionId: 'option-1', membershipId: 'member-red', isAvailable: true },
      { id: 'vote-blue', pollId: 'poll-1', optionId: 'option-1', membershipId: 'member-blue', isAvailable: true },
      { id: 'vote-away', pollId: 'poll-1', optionId: 'option-2', membershipId: 'member-away', isAvailable: true },
    ],
  };

  return {
    memberships: {
      findByAccountAndClub: vi.fn(async (accountId: string, clubId: string) => {
        if (!membership || membership.accountId !== accountId || membership.clubId !== clubId) {
          return null;
        }

        return membership;
      }),
    },
    seasons: {
      findActiveByClub: vi.fn(async () => (
        options?.activeSeasonId === null ? null : { id: options?.activeSeasonId ?? 'season-1' }
      )),
    },
    polls: {
      create: vi.fn(async (input) => ({
        ...poll,
        ...input,
        id: 'created-poll',
        status: 'open',
      })),
      listActive: vi.fn(async () => [poll]),
      findById: vi.fn(async () => poll),
      findActiveDateConflicts: vi.fn(async () => options?.activeDateConflicts ?? []),
      replaceVote: vi.fn(async (input) => ({
        ...poll,
        votes: input.selectedOptionIds.map((optionId: string) => ({
          id: `vote-${optionId}`,
          pollId: input.pollId,
          optionId,
          membershipId: input.membershipId,
          isAvailable: true,
        })),
      })),
      cancel: vi.fn(async (input) => ({
        ...poll,
        status: 'cancelled',
        cancellationReason: input.cancellationReason,
        cancelledAt: '2026-03-20T10:00:00.000Z',
      })),
      promoteToMatch: vi.fn(async () => ({
        pollId: 'poll-1',
        matchId: 'match-created-from-poll',
      })),
    },
  };
}

describe('v1.0 schedule poll service', () => {
  it('allows an approved operator to create a multi-date poll using the server auth membership', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.createPoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'operator@example.com',
          },
        },
        authUid: 'spoofed-auth-user',
        clubId: 'club-1',
        seasonId: 'season-1',
        title: '  3월 친선 경기 일정 투표  ',
        commonTime: '18:00',
        location: '  서울 용산 풋살장  ',
        optionDates: ['2026-03-22', '2026-03-21', '2026-03-21'],
        memo: '',
      }),
    ).resolves.toMatchObject({
      id: 'created-poll',
    });

    expect(repositories.memberships.findByAccountAndClub).toHaveBeenCalledWith(
      'current-auth-user',
      'club-1',
    );
    expect(repositories.polls.create).toHaveBeenCalledWith({
      clubId: 'club-1',
      seasonId: 'season-1',
      title: '3월 친선 경기 일정 투표',
      commonTime: '18:00',
      location: '서울 용산 풋살장',
      memo: null,
      closesAt: null,
      createdByMembershipId: 'operator-membership',
      optionDates: ['2026-03-21', '2026-03-22'],
    });
    expect(repositories.polls.findActiveDateConflicts).toHaveBeenCalledWith({
      clubId: 'club-1',
      optionDates: ['2026-03-21', '2026-03-22'],
    });
    expect(repositories.polls.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ createdByMembershipId: 'spoofed-auth-user' }),
    );
  });

  it('rejects poll creation when an option date already has an open poll option', async () => {
    const repositories = createRepositories({
      activeDateConflicts: [{ date: '2026-03-21', source: 'poll' }],
    });
    const service = await loadService(repositories);

    await expect(
      service.createPoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        title: '3월 일정 투표',
        commonTime: '18:00',
        location: '서울 용산 풋살장',
        optionDates: ['2026-03-21', '2026-03-22'],
      }),
    ).rejects.toMatchObject({
      code: 'conflict',
      message: '이미 일정 또는 투표가 있는 날짜예요: 3월 21일',
    });

    expect(repositories.polls.create).not.toHaveBeenCalled();
  });

  it('rejects poll creation when an option date already has a non-cancelled schedule', async () => {
    const repositories = createRepositories({
      activeDateConflicts: [{ date: '2026-03-22', source: 'schedule' }],
    });
    const service = await loadService(repositories);

    await expect(
      service.createPoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        title: '3월 일정 투표',
        commonTime: '18:00',
        location: '서울 용산 풋살장',
        optionDates: ['2026-03-21', '2026-03-22'],
      }),
    ).rejects.toMatchObject({
      code: 'conflict',
      message: '이미 일정 또는 투표가 있는 날짜예요: 3월 22일',
    });

    expect(repositories.polls.create).not.toHaveBeenCalled();
  });

  it('allows a poll with one option date because absence is an explicit response', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.createPoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        title: '단일 후보 투표',
        commonTime: '18:00',
        location: '서울 용산 풋살장',
        optionDates: ['2026-03-21'],
      }),
    ).resolves.toMatchObject({
      id: 'created-poll',
    });

    expect(repositories.polls.create).toHaveBeenCalledWith(expect.objectContaining({
      optionDates: ['2026-03-21'],
    }));
  });

  it.each([
    ['member', 'approved'],
    ['operator', 'pending'],
    ['admin', 'suspended'],
  ] satisfies Array<[MembershipRole, MembershipStatus]>)(
    'denies schedule poll creation when caller is %s/%s',
    async (role, status) => {
      const repositories = createRepositories({
        membership: {
          id: 'blocked-membership',
          accountId: 'current-auth-user',
          clubId: 'club-1',
          role,
          status,
        },
      });
      const service = await loadService(repositories);

      await expect(
        service.createPoll({
          auth: {
            user: {
              id: 'current-auth-user',
              email: 'player@example.com',
            },
          },
          clubId: 'club-1',
          title: 'Blocked poll',
          commonTime: '18:00',
          location: '서울 용산 풋살장',
          optionDates: ['2026-03-21', '2026-03-22'],
        }),
      ).rejects.toMatchObject({
        code: 'forbidden',
      });
      expect(repositories.polls.create).not.toHaveBeenCalled();
    },
  );

  it('allows an approved member to list active polls and submit available dates', async () => {
    const repositories = createRepositories({
      membership: {
        id: 'member-membership',
        accountId: 'current-auth-user',
        clubId: 'club-1',
        role: 'member',
        status: 'approved',
      },
    });
    const service = await loadService(repositories);

    await expect(
      service.listActivePolls({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'member@example.com',
          },
        },
        clubId: 'club-1',
      }),
    ).resolves.toHaveLength(1);

    await expect(
      service.votePoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'member@example.com',
          },
        },
        clubId: 'club-1',
        pollId: 'poll-1',
        selectedOptionIds: ['option-2', 'option-1'],
      }),
    ).resolves.toMatchObject({
      id: 'poll-1',
    });

    expect(repositories.polls.replaceVote).toHaveBeenCalledWith({
      pollId: 'poll-1',
      membershipId: 'member-membership',
      selectedOptionIds: ['option-1', 'option-2'],
    });
  });

  it('allows an approved member to submit explicit absence with no selected dates', async () => {
    const repositories = createRepositories({
      membership: {
        id: 'member-membership',
        accountId: 'current-auth-user',
        clubId: 'club-1',
        role: 'member',
        status: 'approved',
      },
    });
    const service = await loadService(repositories);

    await expect(
      service.votePoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'member@example.com',
          },
        },
        clubId: 'club-1',
        pollId: 'poll-1',
        selectedOptionIds: [],
      }),
    ).resolves.toMatchObject({
      id: 'poll-1',
    });

    expect(repositories.polls.replaceVote).toHaveBeenCalledWith({
      pollId: 'poll-1',
      membershipId: 'member-membership',
      selectedOptionIds: [],
    });
  });

  it.each(['pending', 'rejected', 'suspended'] satisfies MembershipStatus[])(
    'denies voting while membership is %s',
    async (status) => {
      const repositories = createRepositories({
        membership: {
          id: 'blocked-membership',
          accountId: 'current-auth-user',
          clubId: 'club-1',
          role: 'member',
          status,
        },
      });
      const service = await loadService(repositories);

      await expect(
        service.votePoll({
          auth: {
            user: {
              id: 'current-auth-user',
              email: 'member@example.com',
            },
          },
          clubId: 'club-1',
          pollId: 'poll-1',
          selectedOptionIds: ['option-1'],
        }),
      ).rejects.toMatchObject({
        code: 'membership_not_approved',
      });
      expect(repositories.polls.replaceVote).not.toHaveBeenCalled();
    },
  );

  it('denies voting for closed polls and options outside the poll', async () => {
    const closedRepositories = createRepositories({ pollStatus: 'closed' });
    const closedService = await loadService(closedRepositories);

    await expect(
      closedService.votePoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        pollId: 'poll-1',
        selectedOptionIds: ['option-1'],
      }),
    ).rejects.toMatchObject({
      code: 'conflict',
    });

    const openRepositories = createRepositories();
    const openService = await loadService(openRepositories);
    await expect(
      openService.votePoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        pollId: 'poll-1',
        selectedOptionIds: ['other-poll-option'],
      }),
    ).rejects.toMatchObject({
      code: 'bad_request',
    });
  });

  it('allows an approved operator to promote a selected poll option to a confirmed match', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.promotePoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        pollId: 'poll-1',
        optionId: 'option-1',
      }),
    ).resolves.toEqual({
      pollId: 'poll-1',
      matchId: 'match-created-from-poll',
    });

    expect(repositories.polls.promoteToMatch).toHaveBeenCalledWith({
      pollId: 'poll-1',
      optionId: 'option-1',
      seasonId: 'season-1',
      promotedByMembershipId: 'operator-membership',
    });
  });

  it('uses the active season when a poll without season is promoted', async () => {
    const repositories = createRepositories({ pollSeasonId: null, activeSeasonId: 'active-season' });
    const service = await loadService(repositories);

    await expect(
      service.promotePoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        pollId: 'poll-1',
        optionId: 'option-1',
      }),
    ).resolves.toEqual({
      pollId: 'poll-1',
      matchId: 'match-created-from-poll',
    });

    expect(repositories.seasons.findActiveByClub).toHaveBeenCalledWith('club-1');
    expect(repositories.polls.promoteToMatch).toHaveBeenCalledWith({
      pollId: 'poll-1',
      optionId: 'option-1',
      seasonId: 'active-season',
      promotedByMembershipId: 'operator-membership',
    });
  });

  it('returns a Korean error when no active season exists for promotion', async () => {
    const repositories = createRepositories({ pollSeasonId: null, activeSeasonId: null });
    const service = await loadService(repositories);

    await expect(
      service.promotePoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        pollId: 'poll-1',
        optionId: 'option-1',
      }),
    ).rejects.toMatchObject({
      code: 'bad_request',
      message: '활성 시즌이 없어 확정 일정을 만들 수 없어요.',
    });
    expect(repositories.polls.promoteToMatch).not.toHaveBeenCalled();
  });

  it('allows an approved operator to cancel an open poll with a trimmed reason', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.cancelPoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        pollId: 'poll-1',
        cancellationReason: '  강설로 인한 취소  ',
      }),
    ).resolves.toMatchObject({
      id: 'poll-1',
      status: 'cancelled',
      cancellationReason: '강설로 인한 취소',
    });

    expect(repositories.polls.cancel).toHaveBeenCalledWith({
      pollId: 'poll-1',
      cancelledByMembershipId: 'operator-membership',
      cancellationReason: '강설로 인한 취소',
    });
  });

  it('denies poll cancellation for members, blank reasons, and non-open polls', async () => {
    const memberRepositories = createRepositories({
      membership: {
        id: 'member-membership',
        accountId: 'current-auth-user',
        clubId: 'club-1',
        role: 'member',
        status: 'approved',
      },
    });
    const memberService = await loadService(memberRepositories);

    await expect(
      memberService.cancelPoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'member@example.com',
          },
        },
        clubId: 'club-1',
        pollId: 'poll-1',
        cancellationReason: '강설로 인한 취소',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    expect(memberRepositories.polls.cancel).not.toHaveBeenCalled();

    const blankRepositories = createRepositories();
    const blankService = await loadService(blankRepositories);
    await expect(
      blankService.cancelPoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        pollId: 'poll-1',
        cancellationReason: '   ',
      }),
    ).rejects.toMatchObject({ code: 'bad_request' });
    expect(blankRepositories.polls.cancel).not.toHaveBeenCalled();

    const promotedRepositories = createRepositories({ pollStatus: 'promoted' });
    const promotedService = await loadService(promotedRepositories);
    await expect(
      promotedService.cancelPoll({
        auth: {
          user: {
            id: 'current-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        pollId: 'poll-1',
        cancellationReason: '강설로 인한 취소',
      }),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(promotedRepositories.polls.cancel).not.toHaveBeenCalled();
  });
});
