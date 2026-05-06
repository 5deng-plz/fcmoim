import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelMatch, fetchUpcomingMatches, type UpcomingMatch } from '../src/stores/matchClient';

const apiMatch: UpcomingMatch = {
  id: 'match-1',
  clubId: 'club-1',
  seasonId: 'season-1',
  round: null,
  title: '3월 친선 경기',
  date: '2026-03-21T09:00:00.000Z',
  location: '서울 용산 풋살장',
  type: 'match',
  status: 'scheduled',
  ourScore: null,
  oppScore: null,
  tacticsCompleted: false,
  memo: null,
  createdByMembershipId: 'membership-operator',
  cancellationReason: null,
  cancelledAt: null,
};

describe('frontend match API client', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches upcoming matches with the clubId query parameter', async () => {
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify([apiMatch]), { status: 200 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchUpcomingMatches('club 1')).resolves.toEqual([apiMatch]);

    expect(fetchMock).toHaveBeenCalledWith('/api/matches?clubId=club%201', expect.objectContaining({
      method: 'GET',
      headers: { Accept: 'application/json' },
    }));
  });

  it('posts match cancellation reasons without client authUid', async () => {
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify({
        ...apiMatch,
        status: 'cancelled',
        cancellationReason: '강설로 인한 취소',
        cancelledAt: '2026-03-20T10:00:00.000Z',
      }), { status: 200 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await cancelMatch({
      clubId: 'club-1',
      matchId: 'match-1',
      cancellationReason: '강설로 인한 취소',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/matches/cancel', expect.objectContaining({
      method: 'POST',
    }));

    const requestInit = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(requestInit.body as string);

    expect(body).toEqual({
      clubId: 'club-1',
      matchId: 'match-1',
      cancellationReason: '강설로 인한 취소',
    });
    expect(body).not.toHaveProperty('authUid');
  });
});
