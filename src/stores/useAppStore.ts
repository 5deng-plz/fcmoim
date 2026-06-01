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

export type SettlementNotification = {
  matchId: string;
  title: string;
};

const SELECTED_JOIN_CLUB_KEY = 'fcmoim.selectedJoinClubId';
const JOIN_INTENT_KEY = 'fcmoim.joinIntent';

export type JoinIntent = {
  clubId: string;
};

interface AppState {
  // ─── 탭 네비게이션 ───
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  recordsSubTab: 'season' | 'announcements' | 'board' | 'gallery';
  setRecordsSubTab: (subTab: 'season' | 'announcements' | 'board' | 'gallery') => void;

  // ─── 서브페이지 ───
  showMyPage: boolean;
  setShowMyPage: (show: boolean) => void;
  showCommunity: boolean;
  setShowCommunity: (show: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  settlementNotification: SettlementNotification | null;
  setSettlementNotification: (notification: SettlementNotification | null) => void;
  showJoinForm: boolean;
  setShowJoinForm: (show: boolean) => void;
  joinIntent: JoinIntent | null;
  setJoinIntent: (intent: JoinIntent | null) => void;
  clearJoinIntent: () => void;

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
  // activeClubId drives the approved-member app shell; selectedJoinClubId/joinIntent
  // drive browse-and-apply flows before a user is approved for that team.
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
  recordsSubTab: 'season',
  setRecordsSubTab: (subTab) => set({ recordsSubTab: subTab }),

  // ─── 서브페이지 ───
  showMyPage: false,
  setShowMyPage: (show) => set({ showMyPage: show, showCommunity: false, showJoinForm: false }),
  showCommunity: false,
  setShowCommunity: (show) => set({ showCommunity: show, showMyPage: false, showJoinForm: false }),
  showNotifications: false,
  setShowNotifications: (show) => set({ showNotifications: show }),
  settlementNotification: null,
  setSettlementNotification: (notification) => set({ settlementNotification: notification }),
  showJoinForm: false,
  setShowJoinForm: (show) => set({ showJoinForm: show, showMyPage: false, showCommunity: false }),
  joinIntent: readJoinIntent(),
  setJoinIntent: (intent) => {
    persistJoinIntent(intent);
    set({ joinIntent: intent });
  },
  clearJoinIntent: () => {
    persistJoinIntent(null);
    set({ joinIntent: null });
  },

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

function readJoinIntent(): JoinIntent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const clubId = window.sessionStorage.getItem(JOIN_INTENT_KEY);
  return clubId ? { clubId } : null;
}

function persistJoinIntent(intent: JoinIntent | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!intent) {
    window.sessionStorage.removeItem(JOIN_INTENT_KEY);
    return;
  }

  window.sessionStorage.setItem(JOIN_INTENT_KEY, intent.clubId);
}
