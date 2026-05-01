// ========================================
// FC Moim — Supabase Auth Zustand Store
// Profile에 따라 mock 또는 실제 Auth 자동 분기
// ========================================

'use client';

import { create } from 'zustand';
import { appConfig } from '@/config/app.config';
import type { User, UserStatus } from '@/types';
import { MOCK_USER_DEFAULT } from '@/mocks/data';
import {
  getCurrentAuthUser,
  logout,
  onAuthChange,
  signInWithKakao,
  type AuthUser,
} from '@/lib/auth';
import { updateUserStatus } from '@/lib/api';
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
  lastTenant: string | null;

  initialize: () => Promise<void>;
  signInKakao: () => Promise<void>;
  signOut: () => Promise<void>;
  setMemberProfile: (user: User | null) => void;
  setLastTenant: (tenant: string | null) => void;
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
  lastTenant: null,

  // ─── 초기화 ───
  initialize: async () => {
    if (appConfig.useMockData) {
      set({ isLoading: false });
      useAppStore.setState({
        isAuthenticated: false,
        userStatus: 'guest',
        authView: 'login',
      });
      return;
    }

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
    if (appConfig.useMockData) {
      const mockUser = {
        id: 'mock-kakao',
        email: 'test@kakao.com',
        user_metadata: { name: '카카오 테스트' },
      } as unknown as AuthUser;

      set({
        authUser: mockUser,
        memberProfile: { ...MOCK_USER_DEFAULT, name: '카카오 테스트', authUid: 'mock-kakao' },
        isLoading: false,
      });
      useAppStore.setState({
        isAuthenticated: true,
        userStatus: 'approved',
        authView: 'login',
      });
      return;
    }

    await signInWithKakao();
  },

  // ─── 로그아웃 ───
  signOut: async () => {
    if (!appConfig.useMockData) {
      await logout();
    }
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
  setLastTenant: (tenant) => {
    set({ lastTenant: tenant });
  },

  // ─── 관리자: 회원 승인 ───
  approveUser: async (userId: string) => {
    await updateUserStatus(userId, 'approved');
  },
}));
