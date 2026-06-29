'use client';

import { create } from 'zustand';
import { appConfig } from '@/config/app.config';
import type { UserRole, UserStatus, Tab, AttendanceStatus } from '@/types';

export interface ClubOption {
  membershipId: string;
  clubId: string;
  clubName: string;
  logoUrl?: string | null;
  role: UserRole;
  status?: UserStatus;
}

export type SettlementNotification = {
  matchId: string;
  title: string;
};

const JOIN_INTENT_KEY = 'fcmoim.joinIntent';

export type JoinIntent = {
  clubId: string;
};

export type TeamBrowseJoinStatus = 'new' | 'pending';

interface AppState {
  // ─── 탭 네비게이션 ───
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  recordsSubTab: 'season' | 'chat' | 'board' | 'stats' | 'announcements' | 'gallery';
  setRecordsSubTab: (subTab: 'season' | 'chat' | 'board' | 'stats' | 'announcements' | 'gallery') => void;

  // ─── 서브페이지 ───
  showMyPage: boolean;
  setShowMyPage: (show: boolean) => void;
  showCommunity: boolean;
  setShowCommunity: (show: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  unreadNotificationCount: number;
  setUnreadNotificationCount: (count: number) => void;
  incrementUnreadNotificationCount: () => void;
  settlementNotification: SettlementNotification | null;
  setSettlementNotification: (notification: SettlementNotification | null) => void;
  showJoinForm: boolean;
  setShowJoinForm: (show: boolean) => void;
  showTeamBrowse: boolean;
  setShowTeamBrowse: (show: boolean) => void;
  teamBrowseJoinStatus: TeamBrowseJoinStatus | null;
  setTeamBrowseJoinStatus: (status: TeamBrowseJoinStatus | null) => void;
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
  activeClubId: string;
  setActiveClubId: (clubId: string) => void;
  teamName: string;
  setTeamName: (name: string) => void;
  teamLogoUrl: string | null;
  setTeamLogoUrl: (logoUrl: string | null) => void;
  
  // ─── 데스크탑 전술 분석 & 커뮤니티 ───
  focusedMatchId: string | null;
  setFocusedMatchId: (id: string | null) => void;
  focusedPostId: string | null;
  setFocusedPostId: (id: string | null) => void;

  // ─── 하위 호환용 더미 상태 (타입 컴파일 및 테스트 호환용) ───
  availableClubs: ClubOption[];
  selectedJoinClubId: string | null;
  setSelectedJoinClubId: (id: string | null) => void;
  setAvailableClubs: (clubs: ClubOption[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // ─── 탭 네비게이션 ───
  activeTab: 'home',
  setActiveTab: (tab) => set({
    activeTab: tab,
    showMyPage: false,
    showCommunity: false,
    showJoinForm: false,
    showTeamBrowse: false,
    teamBrowseJoinStatus: null,
  }),
  recordsSubTab: 'season',
  setRecordsSubTab: (subTab) => set({ recordsSubTab: subTab }),

  // ─── 서브페이지 ───
  showMyPage: false,
  setShowMyPage: (show) => set({ showMyPage: show, showCommunity: false, showJoinForm: false, showTeamBrowse: false }),
  showCommunity: false,
  setShowCommunity: (show) => set({ showCommunity: show, showMyPage: false, showJoinForm: false, showTeamBrowse: false }),
  showNotifications: false,
  setShowNotifications: (show) => set({ showNotifications: show }),
  unreadNotificationCount: 0,
  setUnreadNotificationCount: (count) => set({ unreadNotificationCount: Math.max(0, count) }),
  incrementUnreadNotificationCount: () => set((state) => ({
    unreadNotificationCount: state.unreadNotificationCount + 1,
  })),
  settlementNotification: null,
  setSettlementNotification: (notification) => set({ settlementNotification: notification }),
  showJoinForm: false,
  setShowJoinForm: (show) => set({ showJoinForm: show, showMyPage: false, showCommunity: false }),
  showTeamBrowse: false,
  setShowTeamBrowse: (show) => set({
    showTeamBrowse: show,
    showMyPage: false,
    showCommunity: false,
    showJoinForm: false,
    teamBrowseJoinStatus: null,
  }),
  teamBrowseJoinStatus: null,
  setTeamBrowseJoinStatus: (status) => set({ teamBrowseJoinStatus: status }),
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
  teamName: 'FC moim',
  setTeamName: (name) => set({ teamName: name }),
  teamLogoUrl: null,
  setTeamLogoUrl: (logoUrl) => set({ teamLogoUrl: logoUrl }),

  // ─── 데스크탑 전술 분석 & 커뮤니티 ───
  focusedMatchId: null,
  setFocusedMatchId: (id) => set({ focusedMatchId: id }),
  focusedPostId: null,
  setFocusedPostId: (id) => set({ focusedPostId: id }),

  // ─── 하위 호환용 더미 상태 (타입 컴파일 및 테스트 호환용) ───
  availableClubs: [],
  selectedJoinClubId: null,
  setSelectedJoinClubId: (id) => set({ selectedJoinClubId: id }),
  setAvailableClubs: (clubs) => set({ availableClubs: clubs }),
}));

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
