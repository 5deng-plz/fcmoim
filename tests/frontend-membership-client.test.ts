import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildJoinProfileRequest,
  mapMembershipSnapshotToUser,
  membershipStateToUserStatus,
  shouldShowJoinRequest,
  submitJoinRequest,
  type MembershipSnapshot,
} from '../src/stores/membershipClient';
import type { AuthUser } from '../src/lib/auth';

describe('frontend membership state mapping', () => {
  it.each([
    ['new', 'guest', true],
    ['pending', 'pending', false],
    ['approved', 'approved', false],
    ['rejected', 'rejected', false],
    ['suspended', 'suspended', false],
  ] as const)('maps API membershipState %s into UI status %s', (apiState, uiStatus, showJoinForm) => {
    expect(membershipStateToUserStatus(apiState)).toBe(uiStatus);
    expect(shouldShowJoinRequest(apiState)).toBe(showJoinForm);
  });

  it('only builds an approved member profile from an approved membership snapshot', () => {
    const authUser = {
      id: 'auth-user-1',
      email: 'player@example.com',
      user_metadata: {},
    } as AuthUser;

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
        photoUrl: null,
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
    });

    expect(mapMembershipSnapshotToUser({ ...approvedSnapshot, membershipState: 'pending' }, authUser)).toBeNull();
    expect(mapMembershipSnapshotToUser({ ...approvedSnapshot, membership: null, membershipState: 'new' }, authUser)).toBeNull();
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
      birthYear: '',
      birthMonth: '',
    })).toEqual({
      nickname: '새 회원',
      position: 'MF',
      heightCm: null,
      weightKg: null,
      birthDate: null,
      photoUrl: null,
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
        },
      }),
    }));

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit).toBeDefined();
    expect(JSON.parse(requestInit?.body as string)).not.toHaveProperty('authUid');
  });
});
