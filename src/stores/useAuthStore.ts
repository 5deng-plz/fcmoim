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
  signInWithGoogle,
  signInWithKakao,
  type AuthUser,
} from '@/lib/auth';
import { updateUserStatus } from '@/lib/api';
import { useAppStore } from './useAppStore';

let unsubscribeAuthListener: (() => void) | null = null;

interface AuthState {
  authUser: AuthUser | null;
  memberProfile: User | null;
  isLoading: boolean;
  lastTenant: string | null;

  initialize: () => Promise<void>;
  signInGoogle: () => Promise<void>;
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
  if (authUser) {
    const memberProfile: User = {
      ...MOCK_USER_DEFAULT,
      id: authUser.id,
      authUid: authUser.id,
      name:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.user_metadata?.nickname ||
        authUser.email?.split('@')[0] ||
        'FC Moim 회원',
      photoUrl:
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        null,
      role: 'member',
      status: 'approved',
    };

    set({
      authUser,
      memberProfile,
      isLoading: false,
    });

    useAppStore.setState({
      isAuthenticated: true,
      userStatus: 'approved',
      userRole: memberProfile.role,
      authView: 'login',
    });
    return;
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

  // ─── Google 로그인 ───
  signInGoogle: async () => {
    if (appConfig.useMockData) {
      const mockUser = {
        id: 'mock-google',
        email: 'test@gmail.com',
        user_metadata: { name: '구글 테스트' },
      } as unknown as AuthUser;

      set({
        authUser: mockUser,
        memberProfile: { ...MOCK_USER_DEFAULT, name: '구글 테스트', authUid: 'mock-google' },
        isLoading: false,
      });
      useAppStore.setState({
        isAuthenticated: true,
        userStatus: 'approved',
        authView: 'login',
      });
      return;
    }

    await signInWithGoogle();
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
