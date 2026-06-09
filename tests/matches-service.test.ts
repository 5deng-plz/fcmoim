import { describe, expect, it, vi } from 'vitest';

type MembershipRole = 'admin' | 'operator' | 'member';
type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
type MatchStatus = 'scheduled' | 'locker_room' | 'finished' | 'cancelled';

async function loadService(repositories: {
  memberships: {
    findByAccountAndClub: ReturnType<typeof vi.fn>;
  };
  seasons?: {
    findActiveByClub: ReturnType<typeof vi.fn>;
  };
  matches: {
    listUpcoming: ReturnType<typeof vi.fn>;
    listCalendar?: ReturnType<typeof vi.fn>;
    findNonCancelledMatchOnDate: ReturnType<typeof vi.fn>;
    findMaxRoundBySeason: ReturnType<typeof vi.fn>;
    create?: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    updateLineupConfirmation?: ReturnType<typeof vi.fn>;
    publishLineup?: ReturnType<typeof vi.fn>;
  };
  attendees?: {
    listForMatch: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
  };
  lineups: {
    listForMatch: ReturnType<typeof vi.fn>;
    replaceForMatch: ReturnType<typeof vi.fn>;
    addPick: ReturnType<typeof vi.fn>;
  };
}) {
  const { createMatchService } = await import('../src/services/matches');

  return createMatchService(repositories as unknown as Parameters<typeof createMatchService>[0]);
}

function createRepositories(options?: {
  role?: MembershipRole;
  membershipStatus?: MembershipStatus;
  matchStatus?: MatchStatus;
  hasActiveSeason?: boolean;
}) {
  const membership = {
    id: 'operator-membership',
    clubId: 'club-1',
    role: options?.role ?? 'operator',
    status: options?.membershipStatus ?? 'approved',
  };
  const match = {
    id: 'match-1',
    clubId: 'club-1',
    seasonId: 'season-1',
    round: null as number | null,
    title: '3월 친선 경기',
    date: '2026-03-21T09:00:00.000Z',
    location: '서울 용산 풋살장',
    type: 'match' as const,
    status: options?.matchStatus ?? 'scheduled',
    ourScore: null,
    oppScore: null,
    tacticsCompleted: false,
    redLeaderConfirmed: false,
    blueLeaderConfirmed: false,
    memo: null,
    createdByMembershipId: 'operator-membership',
    cancellationReason: null,
    cancelledAt: null,
    updatedAt: '2026-03-21T09:00:00.000Z',
  };

  return {
    memberships: {
      findByAccountAndClub: vi.fn(async () => membership),
    },
    seasons: {
      findActiveByClub: vi.fn(async () => (options?.hasActiveSeason === false ? null : { id: 'season-active' })),
    },
    matches: {
      listUpcoming: vi.fn(async () => [match]),
      listCalendar: vi.fn(async () => [
        match,
        { ...match, id: 'finished-match', status: 'finished', ourScore: 2, oppScore: 4 },
      ]),
      findNonCancelledMatchOnDate: vi.fn(async () => null as typeof match | null),
      findMaxRoundBySeason: vi.fn(async () => 12),
      create: vi.fn(async (input) => ({
        ...match,
        id: 'match-created',
        seasonId: input.seasonId,
        round: input.round,
        title: input.title,
        date: input.date,
        location: input.location,
        type: input.type,
        memo: input.memo,
        createdByMembershipId: input.createdByMembershipId,
      })),
      findById: vi.fn(async () => match),
      cancel: vi.fn(async (input) => ({
        ...match,
        status: 'cancelled',
        cancellationReason: input.cancellationReason,
        cancelledAt: '2026-03-20T10:00:00.000Z',
      })),
      updateLineupConfirmation: vi.fn(async (input) => {
        const redLeaderConfirmed = input.teamNumber === 1 ? input.confirmed : input.redLeaderConfirmed;
        const blueLeaderConfirmed = input.teamNumber === 2 ? input.confirmed : input.blueLeaderConfirmed;
        return {
          ...match,
          redLeaderConfirmed,
          blueLeaderConfirmed,
          tacticsCompleted: redLeaderConfirmed && blueLeaderConfirmed,
        };
      }),
      publishLineup: vi.fn(async () => ({
        ...match,
        redLeaderConfirmed: true,
        blueLeaderConfirmed: true,
        tacticsCompleted: true,
      })),
    },
    attendees: {
      listForMatch: vi.fn(async () => []),
      add: vi.fn(async () => []),
    },
    lineups: {
      listForMatch: vi.fn(async () => []),
      replaceForMatch: vi.fn(async () => []),
      addPick: vi.fn(async () => []),
    },
  };
}

describe('upcoming match service', () => {
  it('requests only future scheduled or locker room matches for approved members', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T14:50:00.000Z'));

    try {
      const repositories = createRepositories();
      const service = await loadService(repositories);

      await expect(
        service.listUpcomingMatches({
          auth: {
            user: {
              id: 'operator-auth-user',
              email: 'operator@example.com',
            },
          },
          clubId: 'club-1',
        }),
      ).resolves.toEqual([expect.objectContaining({ id: 'match-1' })]);

      expect(repositories.matches.listUpcoming).toHaveBeenCalledWith({
        clubId: 'club-1',
        now: '2026-05-20T14:50:00.000Z',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('manual match creation service', () => {
  it('creates a match for the active season and defaults match titles', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.createMatch({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        type: 'match',
        title: '   ',
        date: '2026-03-21',
        time: '18:00',
        location: '  서울 용산 풋살장  ',
        memo: '  늦지 않게 와주세요  ',
      }),
    ).resolves.toMatchObject({
      id: 'match-created',
      seasonId: 'season-active',
      round: 13,
      title: 'Round 13',
      date: '2026-03-21T18:00:00+09:00',
      location: '서울 용산 풋살장',
      type: 'match',
      memo: '늦지 않게 와주세요',
    });

    expect(repositories.matches.create).toHaveBeenCalledWith({
      clubId: 'club-1',
      seasonId: 'season-active',
      round: 13,
      title: 'Round 13',
      date: '2026-03-21T18:00:00+09:00',
      location: '서울 용산 풋살장',
      type: 'match',
      memo: '늦지 않게 와주세요',
      createdByMembershipId: 'operator-membership',
    });
    expect(repositories.matches.findMaxRoundBySeason).toHaveBeenCalledWith('season-active');
    expect(repositories.matches.findNonCancelledMatchOnDate).toHaveBeenCalledWith({
      clubId: 'club-1',
      date: '2026-03-21T18:00:00+09:00',
    });
  });

  it('blocks a second match on the same KST date', async () => {
    const repositories = createRepositories();
    repositories.matches.findNonCancelledMatchOnDate.mockResolvedValueOnce({
      id: 'existing-match',
      clubId: 'club-1',
      seasonId: 'season-active',
      round: 7,
      title: 'Round 7',
      date: '2026-05-20T18:00:00+09:00',
      location: '상암 풋살장',
      type: 'match',
      status: 'scheduled',
      ourScore: null,
      oppScore: null,
      tacticsCompleted: false,
      redLeaderConfirmed: false,
      blueLeaderConfirmed: false,
      memo: null,
      createdByMembershipId: 'operator-membership',
      cancellationReason: null,
      cancelledAt: null,
      updatedAt: '2026-05-20T00:00:00.000Z',
    });
    const service = await loadService(repositories);

    await expect(
      service.createMatch({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        type: 'match',
        title: 'Round 8',
        date: '2026-05-20',
        time: '21:00',
        location: '잠실 풋살파크',
      }),
    ).rejects.toMatchObject({
      code: 'conflict',
      message: '이미 같은 날짜에 등록된 경기가 있어요.',
    });
    expect(repositories.matches.create).not.toHaveBeenCalled();
  });

  it('preserves a provided custom match title', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await service.createMatch({
      auth: {
        user: {
          id: 'operator-auth-user',
          email: 'operator@example.com',
        },
      },
      clubId: 'club-1',
      type: 'match',
      title: '  컵대회 결승전  ',
      date: '2026-05-27',
      time: '20:00',
      location: '목동 풋살장',
      memo: null,
    });

    expect(repositories.matches.create).toHaveBeenCalledWith(expect.objectContaining({
      round: 13,
      title: '컵대회 결승전',
      type: 'match',
    }));
  });

  it('allows non-match event types on dates that already have matches', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await service.createMatch({
      auth: {
        user: {
          id: 'operator-auth-user',
          email: 'operator@example.com',
        },
      },
      clubId: 'club-1',
      type: 'training',
      title: '전지훈련',
      date: '2026-05-20',
      time: '21:00',
      location: '하남 훈련장',
      memo: null,
    });

    expect(repositories.matches.findNonCancelledMatchOnDate).not.toHaveBeenCalled();
    expect(repositories.matches.create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'training',
      round: null,
    }));
  });

  it('requires an active season before creating a manual match', async () => {
    const repositories = createRepositories({ hasActiveSeason: false });
    const service = await loadService(repositories);

    await expect(
      service.createMatch({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        type: 'match',
        title: null,
        date: '2026-03-21',
        time: '18:00',
        location: '서울 용산 풋살장',
        memo: null,
      }),
    ).rejects.toMatchObject({
      code: 'bad_request',
      message: '활성 시즌이 없어 일정을 만들 수 없어요.',
    });

    expect(repositories.matches.create).not.toHaveBeenCalled();
  });

  it.each([
    ['member', 'approved', 'forbidden'],
    ['operator', 'pending', 'forbidden'],
  ] satisfies Array<[MembershipRole, MembershipStatus, string]>)(
    'denies manual match creation for %s/%s',
    async (role, membershipStatus, code) => {
      const repositories = createRepositories({ role, membershipStatus });
      const service = await loadService(repositories);

      await expect(
        service.createMatch({
          auth: {
            user: {
              id: 'operator-auth-user',
              email: 'operator@example.com',
            },
          },
          clubId: 'club-1',
          type: 'match',
          title: null,
          date: '2026-03-21',
          time: '18:00',
          location: '서울 용산 풋살장',
          memo: null,
        }),
      ).rejects.toMatchObject({ code });
      expect(repositories.matches.create).not.toHaveBeenCalled();
    },
  );
});

describe('calendar match service', () => {
  it('lists monthly scheduled, locker room, and finished matches for approved members', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.listCalendarMatches({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        from: '2026-03-01',
        to: '2026-04-01',
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'match-1', status: 'scheduled' }),
      expect.objectContaining({ id: 'finished-match', status: 'finished' }),
    ]);

    expect(repositories.matches.listCalendar).toHaveBeenCalledWith({
      clubId: 'club-1',
      from: '2026-03-01',
      to: '2026-04-01',
    });
  });

  it('keeps past scheduled matches as scheduled instead of auto-finishing them', async () => {
    const repositories = createRepositories();
    repositories.matches.listCalendar.mockResolvedValueOnce([
      {
        id: 'past-scheduled-match',
        clubId: 'club-1',
        seasonId: 'season-1',
        round: null,
        title: 'Round 6',
        date: '2026-05-15T18:00:00+09:00',
        location: '서울 영등포 SKY풋살파크',
        type: 'match',
        status: 'scheduled',
        ourScore: null,
        oppScore: null,
        tacticsCompleted: false,
        redLeaderConfirmed: false,
        blueLeaderConfirmed: false,
        memo: null,
        createdByMembershipId: 'operator-membership',
        cancellationReason: null,
        cancelledAt: null,
        updatedAt: '2026-05-15T18:00:00+09:00',
      },
    ]);
    const service = await loadService(repositories);

    await expect(
      service.listCalendarMatches({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        from: '2026-05-01',
        to: '2026-06-01',
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'past-scheduled-match', status: 'scheduled' }),
    ]);
  });

});

describe('match cancellation service', () => {
  it('allows an approved operator to cancel an upcoming match with a trimmed reason', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.cancelMatch({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        cancellationReason: '  강설로 인한 취소  ',
      }),
    ).resolves.toMatchObject({
      id: 'match-1',
      status: 'cancelled',
      cancellationReason: '강설로 인한 취소',
    });

    expect(repositories.matches.cancel).toHaveBeenCalledWith({
      matchId: 'match-1',
      cancelledByMembershipId: 'operator-membership',
      cancellationReason: '강설로 인한 취소',
    });
  });

  it.each([
    ['member', 'approved', 'scheduled', 'forbidden'],
    ['operator', 'pending', 'scheduled', 'forbidden'],
    ['operator', 'approved', 'finished', 'conflict'],
    ['operator', 'approved', 'cancelled', 'conflict'],
  ] satisfies Array<[MembershipRole, MembershipStatus, MatchStatus, string]>)(
    'denies match cancellation for %s/%s on %s matches',
    async (role, membershipStatus, matchStatus, code) => {
      const repositories = createRepositories({ role, membershipStatus, matchStatus });
      const service = await loadService(repositories);

      await expect(
        service.cancelMatch({
          auth: {
            user: {
              id: 'operator-auth-user',
              email: 'operator@example.com',
            },
          },
          clubId: 'club-1',
          matchId: 'match-1',
          cancellationReason: '강설로 인한 취소',
        }),
      ).rejects.toMatchObject({ code });
      expect(repositories.matches.cancel).not.toHaveBeenCalled();
    },
  );

  it('requires a cancellation reason', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.cancelMatch({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        cancellationReason: '   ',
      }),
    ).rejects.toMatchObject({ code: 'bad_request' });
    expect(repositories.matches.cancel).not.toHaveBeenCalled();
  });
});

describe('match lineup service', () => {
  it('allows an approved operator to publish a Red/Blue lineup', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.saveMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        entries: [
          { membershipId: 'red-player', teamNumber: 1, isLeader: true, position: 'FW' },
          { membershipId: 'blue-player', teamNumber: 2, isLeader: true, position: 'DF' },
        ],
      }),
    ).resolves.toEqual([]);

    expect(repositories.lineups.replaceForMatch).toHaveBeenCalledWith({
      matchId: 'match-1',
      updatedByMembershipId: 'operator-membership',
      redLeaderConfirmed: false,
      blueLeaderConfirmed: false,
      entries: [
        { membershipId: 'red-player', teamNumber: 1, isLeader: true, position: 'FW', formationSlot: null },
        { membershipId: 'blue-player', teamNumber: 2, isLeader: true, position: 'DF', formationSlot: null },
      ],
    });
  });

  it('allows a team leader to update only their own team tactics', async () => {
    const repositories = createRepositories({ role: 'member' });
    repositories.lineups.listForMatch.mockResolvedValue([
      { membershipId: 'operator-membership', teamNumber: 1, isLeader: true, position: 'MF', formationSlot: 6 },
      { membershipId: 'blue-leader', teamNumber: 2, isLeader: true, position: 'DF', formationSlot: 11 },
    ] as never);
    const service = await loadService(repositories);

    await expect(
      service.saveMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'member@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        entries: [
          { membershipId: 'operator-membership', teamNumber: 1, isLeader: true, position: 'MF', formationSlot: 6 },
          { membershipId: 'red-wing', teamNumber: 1, isLeader: false, position: 'MF', formationSlot: 0 },
          { membershipId: 'blue-leader', teamNumber: 2, isLeader: true, position: 'DF', formationSlot: 11 },
        ],
      }),
    ).resolves.toEqual([]);

    expect(repositories.lineups.replaceForMatch).toHaveBeenCalledWith(expect.objectContaining({
      updatedByMembershipId: 'operator-membership',
      redLeaderConfirmed: false,
      blueLeaderConfirmed: false,
      entries: expect.arrayContaining([
        expect.objectContaining({ membershipId: 'red-wing', teamNumber: 1, formationSlot: 0 }),
      ]),
    }));
  });

  it('preserves the opponent team confirmation when only one team lineup changes', async () => {
    const repositories = createRepositories({ role: 'member' });
    repositories.matches.findById.mockResolvedValue({
      ...(await repositories.matches.findById()),
      redLeaderConfirmed: true,
      blueLeaderConfirmed: true,
      tacticsCompleted: true,
    } as never);
    repositories.lineups.listForMatch.mockResolvedValue([
      { membershipId: 'operator-membership', teamNumber: 1, isLeader: true, position: 'MF', formationSlot: 6 },
      { membershipId: 'red-wing', teamNumber: 1, isLeader: false, position: 'MF', formationSlot: 0 },
      { membershipId: 'blue-leader', teamNumber: 2, isLeader: true, position: 'DF', formationSlot: 11 },
    ] as never);
    const service = await loadService(repositories);

    await expect(
      service.saveMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'member@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        entries: [
          { membershipId: 'operator-membership', teamNumber: 1, isLeader: true, position: 'MF', formationSlot: 6 },
          { membershipId: 'red-wing', teamNumber: 1, isLeader: false, position: 'MF', formationSlot: 1 },
          { membershipId: 'blue-leader', teamNumber: 2, isLeader: true, position: 'DF', formationSlot: 11 },
        ],
      }),
    ).resolves.toEqual([]);

    expect(repositories.lineups.replaceForMatch).toHaveBeenCalledWith(expect.objectContaining({
      redLeaderConfirmed: false,
      blueLeaderConfirmed: true,
      entries: expect.arrayContaining([
        expect.objectContaining({ membershipId: 'red-wing', teamNumber: 1, formationSlot: 1 }),
        expect.objectContaining({ membershipId: 'blue-leader', teamNumber: 2, formationSlot: 11 }),
      ]),
    }));
  });

  it('rejects a team leader changing the other team tactics', async () => {
    const repositories = createRepositories({ role: 'member' });
    repositories.lineups.listForMatch.mockResolvedValue([
      { membershipId: 'operator-membership', teamNumber: 1, isLeader: true, position: 'MF', formationSlot: 6 },
      { membershipId: 'blue-leader', teamNumber: 2, isLeader: true, position: 'DF', formationSlot: 11 },
    ] as never);
    const service = await loadService(repositories);

    await expect(
      service.saveMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'member@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        entries: [
          { membershipId: 'operator-membership', teamNumber: 1, isLeader: true, position: 'MF', formationSlot: 6 },
          { membershipId: 'blue-leader', teamNumber: 2, isLeader: true, position: 'DF', formationSlot: 10 },
        ],
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });

    expect(repositories.lineups.replaceForMatch).not.toHaveBeenCalled();
  });

  it('allows operators to complete draft picks even when they are not the current team leader', async () => {
    const repositories = createRepositories();
    repositories.attendees.listForMatch.mockResolvedValue([
      { membershipId: 'red-player' },
      { membershipId: 'blue-player' },
      { membershipId: 'draft-target' },
    ] as never);
    repositories.lineups.listForMatch.mockResolvedValue([
      { membershipId: 'red-player', teamNumber: 1, isLeader: true },
      { membershipId: 'blue-player', teamNumber: 2, isLeader: true },
    ] as never);
    const service = await loadService(repositories);

    await expect(
      service.pickLineupPlayer({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        membershipId: 'draft-target',
      }),
    ).resolves.toEqual([]);

    expect(repositories.lineups.addPick).toHaveBeenCalledWith({
      matchId: 'match-1',
      membershipId: 'draft-target',
      teamNumber: 1,
      isComplete: true,
      formationSlot: 6,
    });
  });

  it('lets approved members read a published lineup', async () => {
    const repositories = createRepositories({ role: 'member' });
    const service = await loadService(repositories);

    await expect(
      service.getMatchLineup({
        auth: {
          user: {
            id: 'member-auth-user',
            email: 'member@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
      }),
    ).resolves.toEqual([]);

    expect(repositories.lineups.listForMatch).toHaveBeenCalledWith('match-1');
  });

  it.each([
    ['member', 'approved', 'scheduled', 'forbidden'],
    ['operator', 'pending', 'scheduled', 'membership_not_approved'],
    ['operator', 'approved', 'finished', 'conflict'],
  ] satisfies Array<[MembershipRole, MembershipStatus, MatchStatus, string]>)(
    'denies lineup publishing for %s/%s on %s matches',
    async (role, membershipStatus, matchStatus, code) => {
      const repositories = createRepositories({ role, membershipStatus, matchStatus });
      const service = await loadService(repositories);

      await expect(
        service.saveMatchLineup({
          auth: {
            user: {
              id: 'operator-auth-user',
              email: 'operator@example.com',
            },
          },
          clubId: 'club-1',
          matchId: 'match-1',
          entries: [
            { membershipId: 'red-player', teamNumber: 1, isLeader: true, position: 'FW' },
            { membershipId: 'blue-player', teamNumber: 2, isLeader: true, position: 'DF' },
          ],
        }),
      ).rejects.toMatchObject({ code });
      expect(repositories.lineups.replaceForMatch).not.toHaveBeenCalled();
    },
  );

  it('requires both teams and unique members', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.saveMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        entries: [
          { membershipId: 'same-player', teamNumber: 1, isLeader: true, position: 'FW' },
          { membershipId: 'same-player', teamNumber: 2, isLeader: true, position: 'DF' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'bad_request' });
    expect(repositories.lineups.replaceForMatch).not.toHaveBeenCalled();
  });

  it('allows operators to confirm either team lineup', async () => {
    const repositories = createRepositories();
    repositories.lineups.listForMatch.mockResolvedValue([
      { membershipId: 'red-leader', teamNumber: 1, isLeader: true },
      { membershipId: 'blue-leader', teamNumber: 2, isLeader: true },
    ] as never);
    const service = await loadService(repositories);

    await expect(
      service.confirmMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        teamNumber: 1,
      }),
    ).resolves.toMatchObject({
      redLeaderConfirmed: true,
      blueLeaderConfirmed: false,
      tacticsCompleted: false,
    });

    expect(repositories.matches.updateLineupConfirmation).toHaveBeenCalledWith({
      matchId: 'match-1',
      teamNumber: 1,
      confirmed: true,
      updatedByMembershipId: 'operator-membership',
      redLeaderConfirmed: false,
      blueLeaderConfirmed: false,
    });
  });

  it('allows a team leader to unconfirm their own team lineup', async () => {
    const repositories = createRepositories({ role: 'member' });
    repositories.matches.findById.mockResolvedValue({
      ...(await repositories.matches.findById()),
      redLeaderConfirmed: true,
      blueLeaderConfirmed: true,
      tacticsCompleted: true,
    } as never);
    repositories.lineups.listForMatch.mockResolvedValue([
      { membershipId: 'operator-membership', teamNumber: 1, isLeader: true },
      { membershipId: 'blue-leader', teamNumber: 2, isLeader: true },
    ] as never);
    const service = await loadService(repositories);

    await expect(
      service.confirmMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'member@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        teamNumber: 1,
        confirmed: false,
      }),
    ).resolves.toMatchObject({
      redLeaderConfirmed: false,
      blueLeaderConfirmed: true,
      tacticsCompleted: false,
    });

    expect(repositories.matches.updateLineupConfirmation).toHaveBeenCalledWith({
      matchId: 'match-1',
      teamNumber: 1,
      confirmed: false,
      updatedByMembershipId: 'operator-membership',
      redLeaderConfirmed: true,
      blueLeaderConfirmed: true,
    });
  });

  it('allows operators to unconfirm either team lineup', async () => {
    const repositories = createRepositories();
    repositories.matches.findById.mockResolvedValue({
      ...(await repositories.matches.findById()),
      redLeaderConfirmed: true,
      blueLeaderConfirmed: true,
      tacticsCompleted: true,
    } as never);
    repositories.lineups.listForMatch.mockResolvedValue([
      { membershipId: 'red-leader', teamNumber: 1, isLeader: true },
      { membershipId: 'blue-leader', teamNumber: 2, isLeader: true },
    ] as never);
    const service = await loadService(repositories);

    await expect(
      service.confirmMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        teamNumber: 2,
        confirmed: false,
      }),
    ).resolves.toMatchObject({
      redLeaderConfirmed: true,
      blueLeaderConfirmed: false,
      tacticsCompleted: false,
    });
  });

  it('allows a Red leader to confirm only Red', async () => {
    const repositories = createRepositories({ role: 'member' });
    repositories.lineups.listForMatch.mockResolvedValue([
      { membershipId: 'operator-membership', teamNumber: 1, isLeader: true },
      { membershipId: 'blue-leader', teamNumber: 2, isLeader: true },
    ] as never);
    const service = await loadService(repositories);

    await expect(
      service.confirmMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'member@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        teamNumber: 1,
      }),
    ).resolves.toMatchObject({ redLeaderConfirmed: true });

    await expect(
      service.confirmMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'member@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        teamNumber: 2,
        confirmed: false,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('marks tactics completed when both leaders have confirmed', async () => {
    const repositories = createRepositories();
    repositories.matches.findById.mockResolvedValue({
      ...(await repositories.matches.findById()),
      redLeaderConfirmed: true,
      blueLeaderConfirmed: false,
    } as never);
    repositories.lineups.listForMatch.mockResolvedValue([
      { membershipId: 'red-leader', teamNumber: 1, isLeader: true },
      { membershipId: 'blue-leader', teamNumber: 2, isLeader: true },
    ] as never);
    const service = await loadService(repositories);

    await expect(
      service.confirmMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        teamNumber: 2,
      }),
    ).resolves.toMatchObject({
      redLeaderConfirmed: true,
      blueLeaderConfirmed: true,
      tacticsCompleted: true,
    });
  });

  it('requires a leader on the confirming team', async () => {
    const repositories = createRepositories();
    repositories.lineups.listForMatch.mockResolvedValue([
      { membershipId: 'blue-leader', teamNumber: 2, isLeader: true },
    ] as never);
    const service = await loadService(repositories);

    await expect(
      service.confirmMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
        teamNumber: 1,
      }),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(repositories.matches.updateLineupConfirmation).not.toHaveBeenCalled();
  });

  it('allows operators to publish tactics in one action', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.publishMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'operator@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
      }),
    ).resolves.toMatchObject({
      redLeaderConfirmed: true,
      blueLeaderConfirmed: true,
      tacticsCompleted: true,
    });

    expect(repositories.matches.publishLineup).toHaveBeenCalledWith({
      matchId: 'match-1',
      updatedByMembershipId: 'operator-membership',
    });
  });

  it('allows admins to publish tactics in one action', async () => {
    const repositories = createRepositories({ role: 'admin' });
    const service = await loadService(repositories);

    await expect(
      service.publishMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'admin@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
      }),
    ).resolves.toMatchObject({ tacticsCompleted: true });
  });

  it('rejects regular members publishing tactics', async () => {
    const repositories = createRepositories({ role: 'member' });
    const service = await loadService(repositories);

    await expect(
      service.publishMatchLineup({
        auth: {
          user: {
            id: 'operator-auth-user',
            email: 'member@example.com',
          },
        },
        clubId: 'club-1',
        matchId: 'match-1',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });

    expect(repositories.matches.publishLineup).not.toHaveBeenCalled();
  });
});
