'use client';

import { create } from 'zustand';
import { appConfig } from '@/config/app.config';
import type { User, UserStatus } from '@/types';
import {
  getCurrentAuthUser,
  logout,
  onAuthChange,
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithKakao,
  type AuthUser,
} from '@/lib/auth';
import { useAppStore } from './useAppStore';
import { useToastStore } from './useToastStore';
import {
  fetchClubMemberships,
  fetchMembershipSnapshot,
  mapMembershipSnapshotToUser,
  membershipStateToUserStatus,
  patchMembershipPhoto,
  patchMembershipProfile,
} from './membershipClient';

let unsubscribeAuthListener: (() => void) | null = null;

interface AuthState {
  authUser: AuthUser | null;
  memberProfile: User | null;
  isLoading: boolean;

  initialize: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInKakao: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setMemberProfile: (user: User | null) => void;
  saveMemberPhoto: (clubId: string, photoUrl: string | null) => Promise<void>;
  saveMemberProfile: (input: {
    clubId: string;
    nickname?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    birthDate?: string | null;
    residence?: string | null;
  }) => Promise<void>;
  switchClub: (clubId: string) => Promise<void>;
  approveUser: (userId: string) => Promise<void>;
}

const AUTH_INIT_TIMEOUT_MS = 2500;

function syncAppAuthState(isAuthenticated: boolean, userStatus: UserStatus, userRole: User['role']) {
  useAppStore.setState({
    isAuthenticated,
    userStatus,
    userRole,
    authView: isAuthenticated ? 'login' : useAppStore.getState().authView,
  });
}

async function applyAuthState(
  set: (partial: Partial<AuthState>) => void,
  authUser: AuthUser | null,
) {
  if (!authUser) {
    set({
      authUser: null,
      memberProfile: null,
      isLoading: false,
    });

    useAppStore.setState({
      availableClubs: [],
      activeClubId: appConfig.defaultClubId,
      teamName: 'FC moim',
      isAuthenticated: false,
      userStatus: 'guest',
      authView: 'login',
      showJoinForm: false,
    });
    return;
  }

  set({
    authUser,
    isLoading: true,
  });

  const appState = useAppStore.getState();
  const joinIntent = appState.joinIntent;
  const joinClubId = joinIntent?.clubId || appConfig.defaultClubId;

  try {
    const snapshot = await fetchMembershipSnapshot(joinClubId);
    const memberProfile = mapMembershipSnapshotToUser(snapshot, authUser);
    const availableClubs = await fetchClubMemberships().catch(() => []);
    const requestedStatus = membershipStateToUserStatus(snapshot.membershipState);
    const currentClubId = memberProfile?.status === 'approved'
      ? snapshot.membership?.clubId || joinClubId
      : availableClubs[0]?.clubId || appConfig.defaultClubId;
    const currentClub = availableClubs.find((club) => club.clubId === currentClubId) || availableClubs[0];
    const shouldShowJoinForm =
      Boolean(joinIntent) && (snapshot.membershipState === 'new' || snapshot.membershipState === 'pending');

    set({
      authUser,
      memberProfile,
      isLoading: false,
    });

    useAppStore.setState({
      activeClubId: currentClubId,
      selectedJoinClubId: joinClubId,
      availableClubs,
      teamName: currentClub?.clubName || 'FC moim',
      isAuthenticated: true,
      userStatus: requestedStatus,
      userRole: memberProfile?.role || snapshot.membership?.role || 'member',
      authView: 'login',
      showJoinForm: shouldShowJoinForm,
      joinIntent: shouldShowJoinForm ? joinIntent : null,
    });

    if (joinIntent && !shouldShowJoinForm) {
      useAppStore.getState().clearJoinIntent();
    }
    if (joinIntent && snapshot.membershipState === 'approved') {
      useToastStore.getState().showToast('이미 이 팀의 멤버입니다.');
    }
  } catch (error) {
    console.error('[FC Moim] Membership state initialization failed:', error);
    set({
      authUser,
      memberProfile: null,
      isLoading: false,
    });

    useAppStore.setState({
      availableClubs: [],
      activeClubId: appConfig.defaultClubId,
      teamName: 'FC moim',
      isAuthenticated: false,
      userStatus: 'guest',
      authView: 'login',
      showJoinForm: false,
    });
    throw error;
  }
}

async function getCurrentAuthUserWithTimeout() {
  return Promise.race([
    getCurrentAuthUser(),
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), AUTH_INIT_TIMEOUT_MS);
    }),
  ]);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  authUser: null,
  memberProfile: null,
  isLoading: true,

  // ─── 초기화 ───
  initialize: async () => {
    if (!unsubscribeAuthListener) {
      unsubscribeAuthListener = onAuthChange((user) => {
        void applyAuthState(set, user).catch((error) => {
          console.error('[FC Moim] Auth listener synchronization failed:', error);
        });
      });
    }

    try {
      const user = await getCurrentAuthUserWithTimeout();
      applyAuthState(set, user);
    } catch (error) {
      console.error('[FC Moim] Auth initialization failed:', error);

      set({ isLoading: false });
      useAppStore.setState({
        isAuthenticated: false,
        userStatus: 'guest',
        authView: 'login',
      });
    }
  },

  // ─── 카카오 로그인 ───
  signInKakao: async () => {
    await signInWithKakao();
  },

  signInGoogle: async () => {
    await signInWithGoogle();
  },

  signInEmail: async (email, password) => {
    const user = await signInWithEmailPassword(email, password);
    await applyAuthState(set, user);
  },

  // ─── 로그아웃 ───
  signOut: async () => {
    await logout();
    set({
      authUser: null,
      memberProfile: null,
      isLoading: false,
    });
    useAppStore.setState({
      availableClubs: [],
      activeClubId: appConfig.defaultClubId,
      teamName: 'FC moim',
      isAuthenticated: false,
      userStatus: 'guest',
      authView: 'login',
      joinIntent: null,
    });
    useAppStore.getState().clearJoinIntent();
  },

  // ─── 상태 업데이트 ───
  setMemberProfile: (user) => {
    set({ memberProfile: user });
    syncAppAuthState(Boolean(user), user?.status || 'guest', user?.role || 'member');
  },

  saveMemberPhoto: async (clubId, photoUrl) => {
    const membership = await patchMembershipPhoto({ clubId, photoUrl });
    set((state) => ({
      memberProfile: state.memberProfile
        ? {
            ...state.memberProfile,
            photoUrl: membership.photoUrl,
          }
        : state.memberProfile,
    }));
  },

  saveMemberProfile: async (input) => {
    const membership = await patchMembershipProfile(input);
    set((state) => ({
      memberProfile: state.memberProfile
        ? {
            ...state.memberProfile,
            name: membership.nickname,
            height: membership.heightCm,
            weight: membership.weightKg,
            birth: membership.birthDate ? new Date(membership.birthDate) : null,
            residence: membership.residence,
          }
        : state.memberProfile,
    }));
  },

  switchClub: async (clubId) => {
    const { authUser } = get();
    if (!authUser) return;

    const snapshot = await fetchMembershipSnapshot(clubId);
    const memberProfile = mapMembershipSnapshotToUser(snapshot, authUser);
    const { availableClubs } = useAppStore.getState();
    const currentClub = availableClubs.find((club) => club.clubId === clubId);

    set({
      authUser,
      memberProfile,
    });

    useAppStore.setState({
      activeClubId: clubId,
      teamName: currentClub?.clubName || 'FC moim',
      isAuthenticated: true,
      userStatus: membershipStateToUserStatus(snapshot.membershipState),
      userRole: memberProfile?.role || snapshot.membership?.role || 'member',
      authView: 'login',
      showJoinForm: false,
    });
  },

  // ─── 관리자: 회원 승인 ───
  approveUser: async (userId: string) => {
    const clubId = useAppStore.getState().activeClubId;
    const response = await fetch('/api/membership/review', {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clubId,
        membershipId: userId,
        decision: 'approved',
      }),
    });

    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, '회원 승인을 처리하지 못했습니다.'));
    }
  },
}));

async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json() as { error?: { message?: string } };
    return data.error?.message || fallback;
  } catch {
    return fallback;
  }
}
