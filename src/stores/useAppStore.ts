'use client';

import { create } from 'zustand';
import type { UserRole, UserStatus, Tab, AttendanceStatus } from '@/types';

interface AppState {
  // ─── 탭 네비게이션 ───
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // ─── 서브페이지 ───
  showMyPage: boolean;
  setShowMyPage: (show: boolean) => void;
  showCommunity: boolean;
  setShowCommunity: (show: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  showJoinForm: boolean;
  setShowJoinForm: (show: boolean) => void;

  // ─── 인증 & 권한 ───
  authView: 'login' | 'guest';
  setAuthView: (view: 'login' | 'guest') => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  userStatus: UserStatus;
  setUserStatus: (status: UserStatus) => void;

  // ─── 참석 투표 (데모용) ───
  attendStatus: AttendanceStatus;
  setAttendStatus: (status: AttendanceStatus) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // ─── 탭 네비게이션 ───
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab, showMyPage: false, showCommunity: false, showJoinForm: false }),

  // ─── 서브페이지 ───
  showMyPage: false,
  setShowMyPage: (show) => set({ showMyPage: show, showCommunity: false, showJoinForm: false }),
  showCommunity: false,
  setShowCommunity: (show) => set({ showCommunity: show, showMyPage: false, showJoinForm: false }),
  showNotifications: false,
  setShowNotifications: (show) => set({ showNotifications: show }),
  showJoinForm: false,
  setShowJoinForm: (show) => set({ showJoinForm: show, showMyPage: false, showCommunity: false }),

  // ─── 인증 & 권한 ───
  authView: 'login',
  setAuthView: (view) => set({ authView: view }),
  isAuthenticated: false,
  setIsAuthenticated: (auth) => set({ isAuthenticated: auth }),
  userRole: 'admin',
  setUserRole: (role) => set({ userRole: role }),
  userStatus: 'guest',
  setUserStatus: (status) => set({ userStatus: status }),

  // ─── 참석 투표 (데모용) ───
  attendStatus: 'none',
  setAttendStatus: (status) => set({ attendStatus: status }),
}));
