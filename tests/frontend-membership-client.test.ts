import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildJoinProfileRequest,
  fetchClubMemberships,
  mapMembershipSnapshotToUser,
  membershipStateToUserStatus,
  patchMembershipProfile,
  patchMembershipPhoto,
  purchaseTraitRequest,
  equipTraitRequest,
  shouldShowJoinRequest,
  submitJoinRequest,
  type MembershipSnapshot,
} from '../src/stores/membershipClient';
import { useAppStore } from '../src/stores/useAppStore';
import { useAuthStore } from '../src/stores/useAuthStore';
import type { AuthUser } from '../src/lib/auth';
import { DEFAULT_STATS } from '../src/types';

describe('frontend membership state mapping', () => {
  it.each([
    ['new', 'guest', true],
    ['pending', 'pending', false],
    ['approved', 'approved', false],
    ['rejected', 'rejected', false],
    ['suspended', 'suspended', false],
    ['withdrawn', 'withdrawn', false],
  ] as const)('maps API membershipState %s into UI status %s', (apiState, uiStatus, showJoinForm) => {
    expect(membershipStateToUserStatus(apiState)).toBe(uiStatus);
    expect(shouldShowJoinRequest(apiState)).toBe(showJoinForm);
  });

  it('only builds an approved member profile from an approved membership snapshot', () => {
    const authUser = {
      id: 'auth-user-1',
      email: 'player@example.com',
      user_metadata: {},
    } as unknown as AuthUser;

    const approvedSnapshot: MembershipSnapshot = {
      account: { id: 'auth-user-1', email: 'player@example.com' },
      membershipState: 'approved',
      membership: {
        id: 'membership-1',
        accountId: 'auth-user-1',
        clubId: '00000000-0000-0000-0000-000000000001',
        role: 'member',
        status: 'approved',
        nickname: '김풋살',
        position: 'FW',
        heightCm: null,
        weightKg: null,
        birthDate: null,
        residence: null,
        photoUrl: null,
        ovr: 74,
        stats: DEFAULT_STATS,
        matchPoints: 1280,
        selectedTraitId: 'line-breaker',
        unlockedTraitIds: ['line-breaker'],
        preferredFoot: 'both',
      },
    };

    expect(mapMembershipSnapshotToUser(approvedSnapshot, authUser)).toMatchObject({
      id: 'membership-1',
      authUid: 'auth-user-1',
      name: '김풋살',
      mainPosition: 'FW',
      status: 'approved',
      height: null,
      weight: null,
      birth: null,
      residence: null,
      ovr: 74,
      matchPoints: 1280,
      selectedTraitId: 'line-breaker',
      unlockedTraitIds: ['line-breaker'],
      preferredFoot: '양발',
    });

    expect(mapMembershipSnapshotToUser({ ...approvedSnapshot, membershipState: 'pending' }, authUser)).toBeNull();
    expect(mapMembershipSnapshotToUser({ ...approvedSnapshot, membership: null, membershipState: 'new' }, authUser)).toBeNull();
  });

  it('uses the Kakao account avatar until a membership photo overrides it', () => {
    const authUser = {
      id: 'auth-user-1',
      email: null,
      user_metadata: {},
    } as unknown as AuthUser;
    const snapshot: MembershipSnapshot = {
      account: {
        id: 'auth-user-1',
        email: null,
        avatarUrl: 'https://kakao.example/avatar.jpg',
      },
      membershipState: 'approved',
      membership: {
        id: 'membership-1',
        accountId: 'auth-user-1',
        clubId: 'club-test',
        role: 'member',
        status: 'approved',
        nickname: '김풋살',
        position: 'FW',
        heightCm: null,
        weightKg: null,
        birthDate: null,
        residence: null,
        photoUrl: null,
        ovr: 60,
        stats: DEFAULT_STATS,
        matchPoints: 100,
        selectedTraitId: null,
        unlockedTraitIds: [],
        preferredFoot: 'right',
      },
    };

    expect(mapMembershipSnapshotToUser(snapshot, authUser)).toMatchObject({
      photoUrl: 'https://kakao.example/avatar.jpg',
    });
    expect(mapMembershipSnapshotToUser({
      ...snapshot,
      membership: {
        ...snapshot.membership!,
        photoUrl: 'data:image/jpeg;base64,member-photo',
      },
    }, authUser)).toMatchObject({
      photoUrl: 'data:image/jpeg;base64,member-photo',
    });
  });
});

describe('frontend join request payload', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves unknown profile fields as null', () => {
    expect(buildJoinProfileRequest({
      name: '  새 회원  ',
      mainPosition: 'MF',
      height: '',
      weight: '',
      preferredFoot: '오른발',
      birthYear: '',
      birthMonth: '',
    })).toEqual({
      nickname: '새 회원',
      position: 'MF',
      heightCm: null,
      weightKg: null,
      birthDate: null,
      photoUrl: null,
      preferredFoot: 'right',
    });
  });

  it('posts clubId and profile without client authUid', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ id: 'membership-created' }), { status: 201 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await submitJoinRequest({
      nickname: '새 회원',
      position: 'DF',
      heightCm: null,
      weightKg: null,
      birthDate: null,
      photoUrl: null,
      preferredFoot: 'right',
    }, 'club-1');

    expect(fetchMock).toHaveBeenCalledWith('/api/membership', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        clubId: 'club-1',
        profile: {
          nickname: '새 회원',
          position: 'DF',
          heightCm: null,
          weightKg: null,
          birthDate: null,
          photoUrl: null,
          preferredFoot: 'right',
        },
      }),
    }));

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit).toBeDefined();
    expect(JSON.parse(requestInit?.body as string)).not.toHaveProperty('authUid');
  });

  it('patches membership profile photos without client authUid', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({
        id: 'membership-1',
        photoUrl: 'data:image/jpeg;base64,new-photo',
      }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await patchMembershipPhoto({
      clubId: 'club-1',
      photoUrl: 'data:image/jpeg;base64,new-photo',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/membership/profile', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({
        clubId: 'club-1',
        photoUrl: 'data:image/jpeg;base64,new-photo',
      }),
    }));

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit).toBeDefined();
    expect(JSON.parse(requestInit?.body as string)).not.toHaveProperty('authUid');
  });

  it('patches membership profile stats and ovr without client authUid', async () => {
    const nextStats = {
      ...DEFAULT_STATS,
      attack: 70,
    };
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({
        id: 'membership-1',
        stats: nextStats,
        ovr: 62,
      }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await patchMembershipProfile({
      clubId: 'club-1',
      stats: nextStats,
      ovr: 62,
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/membership/profile', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({
        clubId: 'club-1',
        stats: nextStats,
        ovr: 62,
      }),
    }));

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit).toBeDefined();
    expect(JSON.parse(requestInit?.body as string)).not.toHaveProperty('authUid');
  });

  it('merges saved membership profile stats into the auth store profile', async () => {
    const nextStats = {
      ...DEFAULT_STATS,
      attack: 70,
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      id: 'membership-1',
      nickname: '김풋살',
      heightCm: null,
      weightKg: null,
      birthDate: null,
      residence: null,
      stats: nextStats,
      ovr: 62,
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    useAuthStore.setState({
      memberProfile: {
        id: 'membership-1',
        authUid: 'auth-user-1',
        name: '김풋살',
        mainPosition: 'MF',
        subPosition: null,
        ovr: 60,
        stats: DEFAULT_STATS,
        matchPoints: 100,
        photoUrl: null,
        role: 'member',
        status: 'approved',
        height: null,
        weight: null,
        birth: null,
        residence: null,
        preferredFoot: '오른발',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    await useAuthStore.getState().saveMemberProfile({
      clubId: 'club-1',
      stats: nextStats,
      ovr: 62,
    });

    expect(useAuthStore.getState().memberProfile).toMatchObject({
      stats: nextStats,
      ovr: 62,
    });
  });

  it('posts trait purchases without a client-provided price', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({
      membership: {
        id: 'membership-1',
        matchPoints: 1750,
        selectedTraitId: null,
      },
      unlockedTraitIds: ['line-breaker'],
    }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await purchaseTraitRequest('club-1', 'line-breaker');

    expect(fetchMock).toHaveBeenCalledWith('/api/membership/traits/purchase', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        clubId: 'club-1',
        traitId: 'line-breaker',
      }),
    }));
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).not.toHaveProperty('price');
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).not.toHaveProperty('authUid');
  });

  it('patches equipped traits without client authUid', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({
      membership: {
        id: 'membership-1',
        matchPoints: 1750,
        selectedTraitId: 'line-breaker',
      },
      unlockedTraitIds: ['line-breaker'],
    }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await equipTraitRequest('club-1', 'line-breaker');

    expect(fetchMock).toHaveBeenCalledWith('/api/membership/traits/equip', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({
        clubId: 'club-1',
        traitId: 'line-breaker',
      }),
    }));
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).not.toHaveProperty('authUid');
  });

  it('posts membership approval without client authUid', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ id: 'membership-1', status: 'approved' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await useAuthStore.getState().approveUser('membership-1');

    expect(fetchMock).toHaveBeenCalledWith('/api/membership/review', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({
        clubId: 'club-test',
        membershipId: 'membership-1',
        decision: 'approved',
      }),
    }));

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit).toBeDefined();
    expect(JSON.parse(requestInit?.body as string)).not.toHaveProperty('authUid');
  });

  it.skip('switches the active club and refreshes membership role/profile context', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      void init;
      expect(input).toBe('/api/membership?clubId=club-away');
      return new Response(JSON.stringify({
        account: {
          id: 'auth-user-1',
          email: 'player@example.com',
          avatarUrl: 'https://kakao.example/avatar.jpg',
        },
        membershipState: 'approved',
        membership: {
          id: 'membership-away',
          accountId: 'auth-user-1',
          clubId: 'club-away',
          role: 'operator',
          status: 'approved',
          nickname: '원정 구단주',
          position: 'DF',
          heightCm: 180,
          weightKg: null,
          birthDate: null,
          residence: '서울 마포구',
          photoUrl: null,
          ovr: 68,
          stats: DEFAULT_STATS,
          matchPoints: 760,
          preferredFoot: 'left',
        },
      }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    useAuthStore.setState({
      authUser: {
        id: 'auth-user-1',
        email: 'player@example.com',
        user_metadata: {},
      } as AuthUser,
      memberProfile: null,
      isLoading: false,
    });
    useAppStore.setState({
      activeClubId: 'club-home',
      teamName: '홈 FC',
      availableClubs: [
        { membershipId: 'membership-home', clubId: 'club-home', clubName: '홈 FC', role: 'member' },
        { membershipId: 'membership-away', clubId: 'club-away', clubName: '원정 FC', role: 'operator' },
      ],
      userRole: 'member',
      userStatus: 'approved',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (useAuthStore.getState() as any).switchClub('club-away');

    expect(useAppStore.getState()).toMatchObject({
      activeClubId: 'club-away',
      teamName: '원정 FC',
      userRole: 'operator',
      userStatus: 'approved',
      showJoinForm: false,
    });
    expect(useAuthStore.getState().memberProfile).toMatchObject({
      id: 'membership-away',
      name: '원정 구단주',
      mainPosition: 'DF',
      photoUrl: 'https://kakao.example/avatar.jpg',
      ovr: 68,
      matchPoints: 760,
      preferredFoot: '왼발',
      residence: '서울 마포구',
    });
  });

  it.skip('keeps pending clubs out of active club switching', async () => {
    vi.stubGlobal('fetch', vi.fn());
    useAuthStore.setState({
      authUser: {
        id: 'auth-user-1',
        email: 'player@example.com',
        user_metadata: {},
      } as AuthUser,
      memberProfile: null,
      isLoading: false,
    });
    useAppStore.setState({
      activeClubId: 'club-home',
      teamName: '홈 FC',
      availableClubs: [
        { membershipId: 'membership-home', clubId: 'club-home', clubName: '홈 FC', role: 'member', status: 'approved' },
        { membershipId: 'membership-pending', clubId: 'club-pending', clubName: '대기 FC', role: 'member', status: 'pending' },
      ],
      userRole: 'member',
      userStatus: 'approved',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((useAuthStore.getState() as any).switchClub('club-pending')).rejects.toThrow('승인된 팀만');

    expect(fetch).not.toHaveBeenCalled();
    expect(useAppStore.getState()).toMatchObject({
      activeClubId: 'club-home',
      teamName: '홈 FC',
      userStatus: 'approved',
    });
  });

  it.skip('preserves membership status and sorts approved clubs before pending clubs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([
      { membershipId: 'membership-pending', clubId: 'club-pending', clubName: '대기 FC', role: 'member', status: 'pending' },
      { membershipId: 'membership-approved', clubId: 'club-approved', clubName: '승인 FC', role: 'operator', status: 'approved' },
    ]), { status: 200 })));

    await expect(fetchClubMemberships()).resolves.toEqual([
      expect.objectContaining({ clubId: 'club-approved', status: 'approved' }),
      expect.objectContaining({ clubId: 'club-pending', status: 'pending' }),
    ]);
  });
});
