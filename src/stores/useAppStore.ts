'use client';

import { create } from 'zustand';
import { appConfig } from '@/config/app.config';
import type { UserRole, UserStatus, Tab, AttendanceStatus } from '@/types';

export interface ClubOption {
  membershipId: string;
  clubId: string;
  clubName: string;
  role: UserRole;
}

const SELECTED_JOIN_CLUB_KEY = 'fcmoim.selectedJoinClubId';

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

  // ─── 참석 응답 ───
  attendStatus: AttendanceStatus;
  setAttendStatus: (status: AttendanceStatus) => void;

  // ─── 팀 정보 ───
  activeClubId: string;
  setActiveClubId: (clubId: string) => void;
  selectedJoinClubId: string;
  setSelectedJoinClubId: (clubId: string) => void;
  teamName: string;
  setTeamName: (name: string) => void;
  availableClubs: ClubOption[];
  setAvailableClubs: (clubs: ClubOption[]) => void;
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
  userRole: 'member',
  setUserRole: (role) => set({ userRole: role }),
  userStatus: 'guest',
  setUserStatus: (status) => set({ userStatus: status }),

  // ─── 참석 응답 ───
  attendStatus: 'none',
  setAttendStatus: (status) => set({ attendStatus: status }),

  // ─── 팀 정보 ───
  activeClubId: appConfig.defaultClubId,
  setActiveClubId: (clubId) => set({ activeClubId: clubId }),
  selectedJoinClubId: readSelectedJoinClubId(),
  setSelectedJoinClubId: (clubId) => {
    persistSelectedJoinClubId(clubId);
    set({ selectedJoinClubId: clubId });
  },
  teamName: 'FC Moim',
  setTeamName: (name) => set({ teamName: name }),
  availableClubs: [],
  setAvailableClubs: (clubs) => set({ availableClubs: clubs }),
}));

function readSelectedJoinClubId() {
  if (typeof window === 'undefined') {
    return appConfig.defaultClubId;
  }

  return window.sessionStorage.getItem(SELECTED_JOIN_CLUB_KEY) || appConfig.defaultClubId;
}

function persistSelectedJoinClubId(clubId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(SELECTED_JOIN_CLUB_KEY, clubId);
}
