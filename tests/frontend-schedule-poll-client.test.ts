import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSchedulePoll,
  fetchActiveSchedulePolls,
  SchedulePollApiError,
  voteSchedulePoll,
  type SchedulePoll,
} from '../src/stores/schedulePollClient';

const apiPoll: SchedulePoll = {
  id: 'poll-1',
  clubId: 'club-1',
  seasonId: null,
  title: '3월 친선 경기 일정 투표',
  status: 'open',
  commonTime: '18:00',
  location: '서울 용산 풋살장',
  memo: null,
  closesAt: null,
  createdByMembershipId: 'membership-operator',
  promotedMatchId: null,
  options: [
    { id: 'option-1', pollId: 'poll-1', optionDate: '2026-03-21', sortOrder: 0 },
    { id: 'option-2', pollId: 'poll-1', optionDate: '2026-03-22', sortOrder: 1 },
  ],
  votes: [],
};

describe('frontend schedule poll API client', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches active polls with the clubId query parameter', async () => {
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify([apiPoll]), { status: 200 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchActiveSchedulePolls('club 1')).resolves.toEqual([apiPoll]);

    expect(fetchMock).toHaveBeenCalledWith('/api/schedule-polls?clubId=club%201', expect.objectContaining({
      method: 'GET',
      headers: { Accept: 'application/json' },
    }));
  });

  it('posts schedule poll creation without client authUid', async () => {
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify(apiPoll), { status: 201 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await createSchedulePoll({
      clubId: 'club-1',
      seasonId: null,
      title: '3월 친선 경기 일정 투표',
      commonTime: '18:00',
      location: '서울 용산 풋살장',
      memo: null,
      closesAt: null,
      optionDates: ['2026-03-21', '2026-03-22'],
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/schedule-polls', expect.objectContaining({
      method: 'POST',
    }));

    const requestInit = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(requestInit.body as string);

    expect(body).toEqual({
      clubId: 'club-1',
      seasonId: null,
      title: '3월 친선 경기 일정 투표',
      commonTime: '18:00',
      location: '서울 용산 풋살장',
      memo: null,
      closesAt: null,
      optionDates: ['2026-03-21', '2026-03-22'],
    });
    expect(body).not.toHaveProperty('authUid');
  });

  it('posts vote submissions without client authUid', async () => {
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify({ ...apiPoll, votes: [{ id: 'vote-1', pollId: 'poll-1', optionId: 'option-1', membershipId: 'membership-1', isAvailable: true }] }), { status: 200 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await voteSchedulePoll({
      clubId: 'club-1',
      pollId: 'poll-1',
      selectedOptionIds: ['option-1'],
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/schedule-polls/vote', expect.objectContaining({
      method: 'POST',
    }));

    const requestInit = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(requestInit.body as string);

    expect(body).toEqual({
      clubId: 'club-1',
      pollId: 'poll-1',
      selectedOptionIds: ['option-1'],
    });
    expect(body).not.toHaveProperty('authUid');
  });

  it('surfaces API errors instead of pretending success', async () => {
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify({
        error: {
          code: 'membership_not_approved',
          message: 'This action requires an approved team membership.',
        },
      }), { status: 403 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(voteSchedulePoll({
      clubId: 'club-1',
      pollId: 'poll-1',
      selectedOptionIds: ['option-1'],
    })).rejects.toMatchObject({
      status: 403,
      code: 'membership_not_approved',
      message: 'This action requires an approved team membership.',
    } satisfies Partial<SchedulePollApiError>);
  });
});
