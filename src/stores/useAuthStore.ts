'use client';

import { create } from 'zustand';
import { appConfig } from '@/config/app.config';
import type { User, UserStatus } from '@/types';
import {
  getCurrentAuthUser,
  logout,
  onAuthChange,
  signInWithKakao,
  type AuthUser,
} from '@/lib/auth';
import { useAppStore } from './useAppStore';
import {
  fetchMembershipSnapshot,
  mapMembershipSnapshotToUser,
  membershipStateToUserStatus,
  shouldShowJoinRequest,
} from './membershipClient';

let unsubscribeAuthListener: (() => void) | null = null;

interface AuthState {
  authUser: AuthUser | null;
  memberProfile: User | null;
  isLoading: boolean;

  initialize: () => Promise<void>;
  signInKakao: () => Promise<void>;
  signOut: () => Promise<void>;
  setMemberProfile: (user: User | null) => void;
  approveUser: (userId: string) => Promise<void>;
}

function syncAppAuthState(isAuthenticated: boolean, userStatus: UserStatus, userRole: User['role']) {
  useAppStore.setState({
    isAuthenticated,
    userStatus,
    userRole,
    authView: isAuthenticated ? 'login' : useAppStore.getState().authView,
  });
}

function applyAuthState(
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

  void fetchMembershipSnapshot()
    .then((snapshot) => {
      const memberProfile = mapMembershipSnapshotToUser(snapshot, authUser);
      set({
        authUser,
        memberProfile,
        isLoading: false,
      });

      useAppStore.setState({
        isAuthenticated: true,
        userStatus: membershipStateToUserStatus(snapshot.membershipState),
        userRole: memberProfile?.role || snapshot.membership?.role || 'member',
        authView: 'login',
        showJoinForm: shouldShowJoinRequest(snapshot.membershipState),
      });
    })
    .catch((error) => {
      console.error('[FC Moim] Membership state initialization failed:', error);
      set({
        authUser,
        memberProfile: null,
        isLoading: false,
      });

      useAppStore.setState({
        isAuthenticated: false,
        userStatus: 'guest',
        authView: 'login',
        showJoinForm: false,
      });
    });
}

export const useAuthStore = create<AuthState>((set) => ({
  authUser: null,
  memberProfile: null,
  isLoading: true,

  // ─── 초기화 ───
  initialize: async () => {
    if (!unsubscribeAuthListener) {
      unsubscribeAuthListener = onAuthChange((user) => {
        applyAuthState(set, user);
      });
    }

    try {
      const user = await getCurrentAuthUser();
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

  // ─── 로그아웃 ───
  signOut: async () => {
    await logout();
    set({
      authUser: null,
      memberProfile: null,
      isLoading: false,
    });
    useAppStore.setState({
      isAuthenticated: false,
      userStatus: 'guest',
      authView: 'login',
    });
  },

  // ─── 상태 업데이트 ───
  setMemberProfile: (user) => {
    set({ memberProfile: user });
    syncAppAuthState(Boolean(user), user?.status || 'guest', user?.role || 'member');
  },

  // ─── 관리자: 회원 승인 ───
  approveUser: async (userId: string) => {
    const response = await fetch('/api/membership/review', {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clubId: appConfig.defaultClubId,
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
