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
  signInDevAdmin: () => void;
  signOut: () => Promise<void>;
  setMemberProfile: (user: User | null) => void;
  approveUser: (userId: string) => Promise<void>;
}

const DEV_ADMIN_SESSION_KEY = 'fcmoim.devAdminSession';
const DEV_ADMIN_ACCOUNT_ID = '00000000-0000-0000-0000-000000000011';
const DEV_ADMIN_MEMBERSHIP_ID = '00000000-0000-0000-0000-000000000211';
const DEV_ADMIN_EMAIL = 'e2e-admin@fcmoim.test';
const AUTH_INIT_TIMEOUT_MS = 2500;
let memoryDevAdminSession = false;

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
    if (hasDevAdminSession()) {
      applyDevAdminSession(set);
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

function applyDevAdminSession(set: (partial: Partial<AuthState>) => void) {
  const authUser = createDevAdminAuthUser();
  const memberProfile = createDevAdminProfile();

  set({
    authUser,
    memberProfile,
    isLoading: false,
  });

  useAppStore.setState({
    isAuthenticated: true,
    userStatus: 'approved',
    userRole: 'admin',
    authView: 'login',
    showJoinForm: false,
  });
}

function persistDevAdminSession() {
  if (!appConfig.enableAdminTestBypass || typeof window === 'undefined') return;
  if (typeof window.localStorage?.setItem === 'function') {
    window.localStorage.setItem(DEV_ADMIN_SESSION_KEY, 'admin');
    return;
  }

  memoryDevAdminSession = true;
}

function clearDevAdminSession() {
  memoryDevAdminSession = false;

  if (typeof window === 'undefined') return;
  if (typeof window.localStorage?.removeItem === 'function') {
    window.localStorage.removeItem(DEV_ADMIN_SESSION_KEY);
  }
}

function hasDevAdminSession() {
  if (!appConfig.enableAdminTestBypass) {
    return false;
  }

  if (typeof window === 'undefined') {
    return memoryDevAdminSession;
  }

  if (typeof window.localStorage?.getItem === 'function') {
    return window.localStorage.getItem(DEV_ADMIN_SESSION_KEY) === 'admin';
  }

  return memoryDevAdminSession;
}

function createDevAdminAuthUser(): AuthUser {
  const now = new Date(0).toISOString();

  return {
    id: DEV_ADMIN_ACCOUNT_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: DEV_ADMIN_EMAIL,
    app_metadata: {
      provider: 'dev-admin',
      providers: ['dev-admin'],
    },
    user_metadata: {
      name: 'E2E Admin',
    },
    created_at: now,
    updated_at: now,
  } as AuthUser;
}

function createDevAdminProfile(): User {
  const now = new Date(0).toISOString();

  return {
    id: DEV_ADMIN_MEMBERSHIP_ID,
    authUid: DEV_ADMIN_ACCOUNT_ID,
    name: 'E2E Admin',
    mainPosition: 'MF',
    subPosition: null,
    ovr: 60,
    stats: {
      speed: 60,
      shooting: 60,
      passing: 60,
      defense: 60,
      physical: 60,
      dribble: 60,
    },
    matchPoints: 0,
    photoUrl: null,
    role: 'admin',
    status: 'approved',
    height: null,
    weight: null,
    birth: null,
    preferredFoot: '오른발',
    createdAt: now,
    updatedAt: now,
  };
}

async function getCurrentAuthUserWithTimeout() {
  return Promise.race([
    getCurrentAuthUser(),
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), AUTH_INIT_TIMEOUT_MS);
    }),
  ]);
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
      if (hasDevAdminSession()) {
        applyDevAdminSession(set);
        return;
      }

      const user = await getCurrentAuthUserWithTimeout();
      applyAuthState(set, user);
    } catch (error) {
      console.error('[FC Moim] Auth initialization failed:', error);
      if (hasDevAdminSession()) {
        applyDevAdminSession(set);
        return;
      }

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

  signInDevAdmin: () => {
    if (!appConfig.enableAdminTestBypass) return;
    persistDevAdminSession();
    applyDevAdminSession(set);
  },

  // ─── 로그아웃 ───
  signOut: async () => {
    clearDevAdminSession();
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
