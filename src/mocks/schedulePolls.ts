import type { CreateSchedulePollRequest, SchedulePoll, SchedulePollVote } from '@/stores/schedulePollClient';

const MOCK_CURRENT_MEMBERSHIP_ID = 'mock-current-member';

export function getMockActiveSchedulePolls(): SchedulePoll[] {
  const pollId = 'mock-poll-march-friendly';

  return [
    {
      id: pollId,
      clubId: '00000000-0000-0000-0000-000000000001',
      seasonId: null,
      title: '3월 친선 경기 일정 투표',
      status: 'open',
      commonTime: '19:00',
      location: '서울 용산 풋살장',
      memo: '가능한 일정을 모두 선택해주세요',
      closesAt: null,
      createdByMembershipId: 'mock-operator-membership',
      promotedMatchId: null,
      options: [
        {
          id: 'mock-poll-option-1',
          pollId,
          optionDate: '2026-03-21',
          sortOrder: 0,
          displayTime: '19:00',
          displayLocation: '서울 용산 풋살장',
          demoVoteCount: 5,
          demoTotalCount: 12,
        },
        {
          id: 'mock-poll-option-2',
          pollId,
          optionDate: '2026-03-22',
          sortOrder: 1,
          displayTime: '10:00',
          displayLocation: '광명 롯데몰 옥상경기장',
          demoVoteCount: 3,
          demoTotalCount: 12,
        },
      ],
      votes: [
        ...createMockVotes(pollId, 'mock-poll-option-1', 5),
        ...createMockVotes(pollId, 'mock-poll-option-2', 3, 5),
      ],
    },
  ];
}

export function createMockSchedulePoll(input: CreateSchedulePollRequest): SchedulePoll {
  const pollId = `mock-poll-${Date.now()}`;

  return {
    id: pollId,
    clubId: input.clubId,
    seasonId: input.seasonId,
    title: input.title,
    status: 'open',
    commonTime: input.commonTime,
    location: input.location,
    memo: input.memo,
    closesAt: input.closesAt,
    createdByMembershipId: 'mock-operator-membership',
    promotedMatchId: null,
    options: input.optionDates.map((optionDate, sortOrder) => ({
      id: `${pollId}-option-${sortOrder + 1}`,
      pollId,
      optionDate,
      sortOrder,
    })),
    votes: [],
  };
}

export function applyMockSchedulePollVote(
  poll: SchedulePoll,
  selectedOptionIds: string[],
): SchedulePoll {
  const otherVotes = poll.votes.filter((vote) => vote.membershipId !== MOCK_CURRENT_MEMBERSHIP_ID);
  const nextVotes = selectedOptionIds.map((optionId, index): SchedulePollVote => ({
    id: `${poll.id}-${MOCK_CURRENT_MEMBERSHIP_ID}-${index + 1}`,
    pollId: poll.id,
    optionId,
    membershipId: MOCK_CURRENT_MEMBERSHIP_ID,
    isAvailable: true,
  }));

  return {
    ...poll,
    votes: [...otherVotes, ...nextVotes],
  };
}

function createMockVotes(
  pollId: string,
  optionId: string,
  count: number,
  offset = 0,
): SchedulePollVote[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${pollId}-${optionId}-vote-${index + 1}`,
    pollId,
    optionId,
    membershipId: `mock-member-${offset + index + 1}`,
    isAvailable: true,
  }));
}
