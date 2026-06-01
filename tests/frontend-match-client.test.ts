import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelMatch,
  confirmMatchLineup,
  createMatch,
  fetchMatchLineup,
  fetchUpcomingMatches,
  publishMatchLineup,
  saveMatchLineup,
  type MatchLineupEntry,
  type UpcomingMatch,
} from '../src/stores/matchClient';

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

const apiLineup: MatchLineupEntry[] = [{
  id: 'lineup-1',
  matchId: 'match-1',
  membershipId: 'member-red',
  teamNumber: 1,
  isLeader: true,
  position: 'FW',
  formationSlot: 6,
  playerName: 'Red Player',
  playerPosition: 'FW',
  playerOvr: 70,
  playerPhotoUrl: null,
  playerMatchPoints: 900,
}];

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

  it('posts manual match creation without client authUid', async () => {
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify(apiMatch), { status: 201 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createMatch({
      clubId: 'club-1',
      type: 'match',
      title: null,
      date: '2026-03-21',
      time: '18:00',
      location: '서울 용산 풋살장',
      memo: '늦지 않게 와주세요',
    })).resolves.toEqual(apiMatch);

    expect(fetchMock).toHaveBeenCalledWith('/api/matches', expect.objectContaining({
      method: 'POST',
    }));

    const requestInit = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(requestInit.body as string);

    expect(body).toEqual({
      clubId: 'club-1',
      type: 'match',
      title: null,
      date: '2026-03-21',
      time: '18:00',
      location: '서울 용산 풋살장',
      memo: '늦지 않게 와주세요',
    });
    expect(body).not.toHaveProperty('authUid');
  });

  it('fetches match lineup by club and match id', async () => {
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify(apiLineup), { status: 200 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchMatchLineup({ clubId: 'club 1', matchId: 'match 1' })).resolves.toEqual(apiLineup);

    expect(fetchMock).toHaveBeenCalledWith('/api/matches/lineup?clubId=club+1&matchId=match+1', expect.objectContaining({
      method: 'GET',
      headers: { Accept: 'application/json' },
    }));
  });

  it('posts lineup entries without client authUid', async () => {
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify(apiLineup), { status: 200 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await saveMatchLineup({
      clubId: 'club-1',
      matchId: 'match-1',
      entries: [
        { membershipId: 'member-red', teamNumber: 1, isLeader: true, position: 'FW' },
        { membershipId: 'member-blue', teamNumber: 2, isLeader: true, position: 'DF' },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/matches/lineup', expect.objectContaining({
      method: 'POST',
    }));

    const requestInit = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(requestInit.body as string);

    expect(body).toEqual({
      clubId: 'club-1',
      matchId: 'match-1',
      entries: [
        { membershipId: 'member-red', teamNumber: 1, isLeader: true, position: 'FW' },
        { membershipId: 'member-blue', teamNumber: 2, isLeader: true, position: 'DF' },
      ],
    });
    expect(body).not.toHaveProperty('authUid');
  });

  it('posts lineup publish requests without client authUid', async () => {
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify({
        ...apiMatch,
        redLeaderConfirmed: true,
        blueLeaderConfirmed: true,
        tacticsCompleted: true,
      }), { status: 200 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await publishMatchLineup({
      clubId: 'club-1',
      matchId: 'match-1',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/matches/lineup/publish', expect.objectContaining({
      method: 'POST',
    }));

    const requestInit = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(requestInit.body as string);

    expect(body).toEqual({
      clubId: 'club-1',
      matchId: 'match-1',
    });
    expect(body).not.toHaveProperty('authUid');
  });

  it('posts lineup unconfirm requests without client authUid', async () => {
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify({
        ...apiMatch,
        redLeaderConfirmed: false,
        blueLeaderConfirmed: true,
        tacticsCompleted: false,
      }), { status: 200 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    await confirmMatchLineup({
      clubId: 'club-1',
      matchId: 'match-1',
      teamNumber: 1,
      confirmed: false,
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/matches/lineup/confirm', expect.objectContaining({
      method: 'POST',
    }));

    const requestInit = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(requestInit.body as string);

    expect(body).toEqual({
      clubId: 'club-1',
      matchId: 'match-1',
      teamNumber: 1,
      confirmed: false,
    });
    expect(body).not.toHaveProperty('authUid');
  });

  it('surfaces lineup publish API errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => (
      new Response(JSON.stringify({
        error: { code: 'forbidden', message: '운영진만 전술을 공개할 수 있어요.' },
      }), { status: 403 })
    )));

    await expect(publishMatchLineup({
      clubId: 'club-1',
      matchId: 'match-1',
    })).rejects.toMatchObject({
      code: 'forbidden',
      message: '운영진만 전술을 공개할 수 있어요.',
    });
  });
});
