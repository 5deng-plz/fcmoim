'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import HomeTab from '@/components/tabs/HomeTab';
import ScheduleTab from '@/components/tabs/ScheduleTab';
import RecordsTab from '@/components/tabs/RecordsTab';
import LockerRoomTab from '@/components/tabs/LockerRoomTab';
import MyPage from '@/components/tabs/MyPage';
import CommunityPage from '@/components/tabs/CommunityPage';
import NotificationPanel from '@/components/features/NotificationPanel';
import PushPermissionPrompt from '@/components/features/PushPermissionPrompt';
import MatchCreateModal from '@/components/features/MatchCreateModal';
import PollCreateModal from '@/components/features/PollCreateModal';
import AnnouncementCreateModal from '@/components/features/AnnouncementCreateModal';
import LoginScreen from '@/components/features/LoginScreen';
import GuestDashboard from '@/components/features/GuestDashboard';
import JoinRequestForm from '@/components/features/JoinRequestForm';
import Toast from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import ScrollPositionRail from '@/components/ui/ScrollPositionRail';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useModalStore } from '@/stores/useModalStore';
import { useSmartScroll } from '@/hooks/useSmartScroll';
import { Ban, ShieldAlert, X, Shield, Award, Users, Info, Activity } from 'lucide-react';
import { fetchMatchAttendees, fetchMatchLineup, saveMatchLineup, type MatchLineupEntry } from '@/stores/matchClient';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import type { Player } from '@/components/features/TacticsDragBuilder';

function PhoneFrame({ children, surface = 'white' }: { children: ReactNode; surface?: 'white' | 'soft' }) {
  const { focusedMatchId, setFocusedMatchId, activeClubId } = useAppStore();

  return (
    <div className="app-viewport chzzk-layout text-primary">
      {/* Chzzk Live Stream Player Area (Visible only on Desktop) */}
      <div className="flex-1 h-full relative bg-black flex flex-col justify-between hidden lg:flex overflow-hidden select-none border-r border-[#25283e]" data-exempt=":// design-exempt(reason: chzzk layout border, expires: 2026-12-31)">
        
        {focusedMatchId ? (
          <DesktopTacticsStudio 
            matchId={focusedMatchId} 
            activeClubId={activeClubId} 
            onClose={() => setFocusedMatchId(null)} 
          />
        ) : (
          <>
            {/* Stream Header */}
            <div className="p-4 bg-gradient-to-b from-black/95 to-transparent flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                <span className="flex h-5 items-center justify-center rounded bg-[#00ffa3] px-2.5 text-[10px] font-black text-black gap-1 shadow-[0_0_8px_rgba(0,255,163,0.4)]" data-exempt=":// design-exempt(reason: chzzk header badge, expires: 2026-12-31)">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" data-exempt=":// design-exempt(reason: red live status dot, expires: 2026-12-31)" />
                  실시간 중계
                </span>
                <span className="text-sm font-black text-white tracking-wide">
                  [라이브] 🏟️ FC Guppy 주말 아침 친선 매치 & 전술 전광판 (땀 흘리고 막걸리 내기)
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-black text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffa3] opacity-75" data-exempt=":// design-exempt(reason: chzzk green live ping, expires: 2026-12-31)"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ffa3]" data-exempt=":// design-exempt(reason: chzzk green live dot, expires: 2026-12-31)"></span>
                  </span>
                  <span className="text-[#00ffa3] font-bold" data-exempt=":// design-exempt(reason: chzzk green text, expires: 2026-12-31)">송출 양호 (1080p)</span>
                </span>
                <span className="border-l border-gray-800 pl-3">참석회원 10명 (풀방)</span>
              </div>
            </div>
     
            {/* Video Player Display (Winning Eleven Intro Theme + Danmaku Chat) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070914] winning-bg-grid z-0" data-exempt=":// design-exempt(reason: chzzk player background, expires: 2026-12-31)">
              {/* Neon Glow Effects */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00ffa3]/10 via-transparent to-[#00b872]/15 mix-blend-color-dodge animate-pulse" style={{ animationDuration: '4s' }} data-exempt=":// design-exempt(reason: chzzk glow effects, expires: 2026-12-31)" />
              
              {/* Winning Eleven Title Card */}
              <div className="text-center space-y-5 z-10 animate-fadeIn">
                <div className="inline-block bg-gradient-to-r from-[#00b872] to-[#00ffa3] text-black font-black text-6xl tracking-wider px-8 py-3.5 transform -skew-x-12 border-[5px] border-black shadow-[0_0_30px_rgba(0,255,163,0.25)]" data-exempt=":// design-exempt(reason: chzzk winning eleven title card, expires: 2026-12-31)">
                  WINNING MOIM
                </div>
                <div className="text-md font-black text-[#00ffa3] tracking-widest uppercase" data-exempt=":// design-exempt(reason: chzzk green text, expires: 2026-12-31)">
                  FC GUPPY 2026 SEASON
                </div>
                <div className="pt-8">
                  <button className="flex items-center gap-2 mx-auto rounded-full bg-[#00e58f] hover:bg-[#00ffa3] active:scale-95 transition-all px-8 py-3.5 text-xs font-black text-black shadow-lg shadow-[#00ffa3]/25" data-exempt=":// design-exempt(reason: chzzk play button, expires: 2026-12-31)">
                    ▶ 인트로 재생
                  </button>
                </div>
              </div>
     
              {/* Clean video screen without floating chat text */}
            </div>
     
            {/* Video Player Controls */}
            <div className="p-4 bg-gradient-to-t from-black/95 to-transparent flex items-center justify-between z-20">
              <div className="flex items-center gap-4 text-white">
                <button className="text-xs font-black text-gray-400 hover:text-white transition-colors">
                  ⏸ 일시정지
                </button>
                <div className="text-[11px] font-black text-gray-400">
                  02:12 / 03:00
                </div>
                <div className="text-xs text-[#00ffa3] font-black flex items-center gap-1.5" data-exempt=":// design-exempt(reason: chzzk live indicator text, expires: 2026-12-31)">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffa3] opacity-75" data-exempt=":// design-exempt(reason: chzzk live indicator ping, expires: 2026-12-31)"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00ffa3]" data-exempt=":// design-exempt(reason: chzzk live indicator dot, expires: 2026-12-31)"></span>
                  </span>
                  LIVE
                </div>
              </div>
              <div className="flex items-center gap-5 text-[11px] font-black text-gray-400">
                <span className="hover:text-white transition-colors cursor-pointer">1080P SOURCE</span>
                <span className="hover:text-white transition-colors cursor-pointer">SCREEN 16:9</span>
              </div>
            </div>
          </>
        )}
      </div>
 
      {/* PWA App Sidebar (Acts as Chzzk Chat Panel on Desktops) */}
      <div className={`phone-shell chzzk-chat-panel ${surface === 'soft' ? 'bg-surface-bg' : 'bg-surface-card'}`}>
        {children}
      </div>
    </div>
  );
}
 
{/* Desktop Brand & App Info Panel */}
const DesktopIntroBackup = () => (
  <div className="hidden lg:flex flex-col justify-center max-w-sm text-left mr-16 animate-fadeIn space-y-6 select-none">
    <div className="space-y-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-black text-green-500 border border-green-500/20">
        🏟️ FC Guppy 전용 대기실
      </span>
      <h1 className="text-4xl font-black tracking-tight text-white leading-tight">
        형님들, 이번 주말에<br />공 차러 나오십니까?<br />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600" data-exempt=":// design-exempt(reason: chzzk intro description gradient and brand name, expires: 2026-12-31)">FC Guppy</span>
      </h1>
      <p className="text-sm text-gray-400 font-bold leading-relaxed">
        지각 및 미참석 벌금 엄격 적용합니다! 10명 남짓 정예 멤버로 다치지 않게 땀 흘리고 시원하게 막걸리 한 잔 나누기 위한 회원 전용 폐쇄형 아지트입니다.
      </p>
    </div>
    
    <div className="border-t border-gray-800 my-4" />

    <div className="space-y-3.5 text-[11px] font-bold text-gray-500 leading-normal">
      <div className="flex items-start gap-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-800 text-[10px] font-black text-gray-300">⚽</span>
        <span className="pt-0.5">뒤로가기 누르다가 화면 꺼지는 에러 완벽 차단. 뒤로 가도 모달만 부드럽게 슥 닫힙니다.</span>
      </div>
      <div className="flex items-start gap-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-800 text-[10px] font-black text-gray-300">🍶</span>
        <span className="pt-0.5">글자 입력할 땐 아래 메뉴판이 눈치껏 사라집니다. 작은 화면 폰 쓰시는 분들도 이제 답답함 없이 시원하게 치세요!</span>
      </div>
      <div className="flex items-start gap-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-800 text-[10px] font-black text-gray-300">🤝</span>
        <span className="pt-0.5">삐까뻔쩍한 억지 감성 효과 싹 빼고 큼직하고 선명하게 글씨 잘 보이도록 눈 편안한 황밸로 맞췄습니다.</span>
      </div>
    </div>
  </div>
);

function MembershipBlockedScreen({ type }: { type: 'rejected' | 'suspended' }) {
  const { signOut } = useAuthStore();
  const isSuspended = type === 'suspended';
  const Icon = isSuspended ? ShieldAlert : Ban;

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 space-y-6">
      <div className="w-20 h-20 bg-result-loss/10 rounded-full flex items-center justify-center">
        <Icon className="text-result-loss" size={40} />
      </div>
      <div>
        <h2 className="text-xl font-black text-primary mb-2">
          {isSuspended ? '이용이 일시 중지되었어요' : '가입 신청이 반려되었어요'}
        </h2>
        <p className="text-sm text-secondary leading-relaxed">
          {isSuspended
            ? '팀 운영진에게 멤버십 상태 확인을 요청해주세요.'
            : '입력한 정보 확인이 필요해요. 팀 운영진에게 문의해주세요.'}
        </p>
      </div>
      <button
        onClick={() => void signOut()}
        className="w-full max-w-[240px] bg-action-secondary text-background font-bold py-3 px-6 rounded-xl text-sm hover:bg-action-secondary-hover active:scale-95 transition-all"
      >
        다른 계정으로 로그인
      </button>
    </div>
  );
}

// ─── 메인 앱 쉘 (인증 완료 사용자) ───
function AppShell() {
  const {
    activeTab,
    showMyPage,
    showJoinForm,
    showTeamBrowse,
    teamBrowseJoinStatus,
    setActiveTab,
    setJoinIntent,
    setSelectedJoinClubId,
    setShowJoinForm,
    setShowTeamBrowse,
    setTeamBrowseJoinStatus,
  } = useAppStore();
  const { switchClub } = useAuthStore();
  const mainRef = useRef<HTMLElement | null>(null);

  useSmartScroll(mainRef);

  const renderContent = () => {
    if (showTeamBrowse && showJoinForm) {
      return (
        <JoinRequestForm
          mode="secondary"
          targetStatus={teamBrowseJoinStatus ?? 'new'}
          onSecondaryClose={() => {
            setShowJoinForm(false);
            setTeamBrowseJoinStatus(null);
          }}
        />
      );
    }
    if (showTeamBrowse) {
      return (
        <GuestDashboard
          onOpenJoinRequest={({ clubId, status }) => {
            setSelectedJoinClubId(clubId);
            setJoinIntent({ clubId });
            setTeamBrowseJoinStatus(status);
            setShowJoinForm(true);
          }}
          onCreatedClub={async (clubId) => {
            await switchClub(clubId);
            setShowTeamBrowse(false);
            setActiveTab('home');
          }}
        />
      );
    }
    if (showJoinForm) return <JoinRequestForm />;
    if (showMyPage) return <MyPage />;
    switch (activeTab) {
      case 'home':
        return <HomeTab />;
      case 'schedule':
        return <ScheduleTab />;
      case 'records':
        return <RecordsTab />;
      case 'locker_room':
        return <LockerRoomTab />;
      case 'community':
        return <CommunityPage />;
      default:
        return <HomeTab />;
    }
  };

  return (
    <>
      <Header />
      <main ref={mainRef} className="flex-1 overflow-y-auto no-scrollbar relative">
        <div className="min-h-full p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {renderContent()}
        </div>
        <ScrollPositionRail containerRef={mainRef} />
      </main>
      <BottomNav />

      <NotificationPanel />
      <PushPermissionPrompt />
      <MatchCreateModal />
      <PollCreateModal />
      <AnnouncementCreateModal />
      <Toast />
    </>
  );
}

function JoinRequestModal() {
  const { showJoinForm, setShowJoinForm, clearJoinIntent } = useAppStore();

  return (
    <Modal
      title="입단신청"
      isOpen={showJoinForm}
      onClose={() => {
        clearJoinIntent();
        setShowJoinForm(false);
      }}
      presentation="sheet"
    >
      <JoinRequestForm showHeader={false} />
    </Modal>
  );
}

// ─── 루트 페이지 ───
export default function Home() {
  const {
    authView,
    userStatus,
    isAuthenticated,
    activeTab,
    showMyPage,
    showJoinForm,
    showTeamBrowse,
    showNotifications,
    setActiveTab,
    setShowMyPage,
    setShowJoinForm,
    setShowTeamBrowse,
    setShowNotifications,
  } = useAppStore();
  const { activeModal, openModal, closeModal } = useModalStore();
  const { initialize, isLoading } = useAuthStore();

  const isHandlingPopState = useRef(false);
  const isTestEnv = typeof window !== 'undefined' &&
    (window.navigator.userAgent.includes('jsdom') || '__vitest_environment__' in window);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // 1. PopState 리스너 (뒤로가기 가로채기 및 상태 동기화)
  useEffect(() => {
    if (typeof window === 'undefined' || isTestEnv) return;

    const handlePopState = (isInitialOrEvent: boolean | PopStateEvent = false) => {
      const isInitial = typeof isInitialOrEvent === 'boolean' ? isInitialOrEvent : false;
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const view = params.get('view');
      const modal = params.get('modal');

      // If it is the initial mount and there are no query parameters,
      // preserve the existing Zustand state (critical for testing environments)
      if (isInitial && !tab && !view && !modal) {
        return;
      }

      isHandlingPopState.current = true;

      // Tab sync
      if (tab === 'home' || tab === 'schedule' || tab === 'records' || tab === 'locker_room' || tab === 'community') {
        if (useAppStore.getState().activeTab !== tab) {
          setActiveTab(tab);
        }
      }

      // View sync
      const currentStore = useAppStore.getState();
      if (view === 'mypage') {
        if (!currentStore.showMyPage) setShowMyPage(true);
      } else if (view === 'notifications') {
        if (!currentStore.showNotifications) setShowNotifications(true);
      } else if (view === 'join-form-secondary') {
        if (!currentStore.showTeamBrowse) setShowTeamBrowse(true);
        if (!currentStore.showJoinForm) setShowJoinForm(true);
      } else if (view === 'team-browse') {
        if (!currentStore.showTeamBrowse) setShowTeamBrowse(true);
        if (currentStore.showJoinForm) setShowJoinForm(false);
      } else if (view === 'join-form') {
        if (!currentStore.showJoinForm) setShowJoinForm(true);
        if (currentStore.showTeamBrowse) setShowTeamBrowse(false);
      } else {
        if (currentStore.showMyPage) setShowMyPage(false);
        if (currentStore.showNotifications) setShowNotifications(false);
        if (currentStore.showJoinForm) setShowJoinForm(false);
        if (currentStore.showTeamBrowse) setShowTeamBrowse(false);
      }

      // Modal sync
      if (modal === 'matchCreate' || modal === 'pollCreate' || modal === 'announcementCreate') {
        if (useModalStore.getState().activeModal !== modal) openModal(modal);
      } else {
        if (useModalStore.getState().activeModal !== null) closeModal();
      }

      isHandlingPopState.current = false;
    };

    window.addEventListener('popstate', handlePopState);
    
    // 최초 진입 시 URL 에 따라 스토어 상태 초기 동기화
    handlePopState(true);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [setActiveTab, setShowMyPage, setShowJoinForm, setShowTeamBrowse, setShowNotifications, openModal, closeModal, isTestEnv]);

  // 2. Zustand 상태 변화를 URL 파라미터에 동기화
  useEffect(() => {
    if (typeof window === 'undefined' || isTestEnv || isHandlingPopState.current) return;

    const params = new URLSearchParams(window.location.search);
    const currentView = params.get('view');
    const currentModal = params.get('modal');

    let targetView = '';
    if (showMyPage) targetView = 'mypage';
    else if (showNotifications) targetView = 'notifications';
    else if (showTeamBrowse && showJoinForm) targetView = 'join-form-secondary';
    else if (showTeamBrowse) targetView = 'team-browse';
    else if (showJoinForm) targetView = 'join-form';

    const targetModal = activeModal || '';
    const targetTab = activeTab;

    const wasViewOpen = !!currentView;
    const isViewOpenNow = !!targetView;
    const wasModalOpen = !!currentModal;
    const isModalOpenNow = !!targetModal;

    // 만약 사용자가 X 버튼 등으로 수동으로 모달/뷰를 닫았는데 URL 에는 아직 켜져있다면,
    // 브라우저 뒤로가기를 호출(history.back())해 스택을 뒤로 보낸다.
    if ((wasViewOpen && !isViewOpenNow) || (wasModalOpen && !isModalOpenNow)) {
      window.history.back();
      return;
    }

    const newParams = new URLSearchParams();
    newParams.set('tab', targetTab);
    if (targetView) newParams.set('view', targetView);
    if (targetModal) newParams.set('modal', targetModal);

    const newSearch = `?${newParams.toString()}`;
    const currentSearch = window.location.search;

    if (newSearch !== currentSearch) {
      // 뷰나 모달 오버레이가 새로 열리는 시점에만 pushState,
      // 그 외 단순 상태 변화(탭 클릭 등)는 replaceState로 처리
      const isOpening = (!currentView && targetView) || (!currentModal && targetModal);
      if (isOpening) {
        window.history.pushState(null, '', newSearch);
      } else {
        window.history.replaceState(null, '', newSearch);
      }
    }
  }, [activeTab, showMyPage, showJoinForm, showTeamBrowse, showNotifications, activeModal, isTestEnv]);

  if (isLoading) {
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col items-center justify-center space-y-3 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-brand/primary-bg border-t-brand-primary animate-spin mx-auto" />
          <p className="text-sm font-bold text-secondary">인증 상태를 확인하는 중입니다</p>
        </div>
      </PhoneFrame>
    );
  }

  // 1) 가입 신청 완료 → 승인 대기 화면 (입단신청 폼 내부에서 승인 대기 표시 및 취소 처리)
  if (!isAuthenticated && userStatus === 'pending') {
    return (
      <PhoneFrame surface="soft">
        <Header />
        <main className="flex-1 overflow-y-auto no-scrollbar p-4">
          <JoinRequestForm />
        </main>
        <Toast />
      </PhoneFrame>
    );
  }

  // 2) 미인증 + 둘러보기 모드
  if (!isAuthenticated && authView === 'guest') {
    return (
      <PhoneFrame surface="soft">
        <Header />
        {showJoinForm ? (
          <main className="flex-1 overflow-y-auto no-scrollbar p-4">
            <JoinRequestForm />
          </main>
        ) : (
          <GuestDashboard />
        )}
        <Toast />
      </PhoneFrame>
    );
  }

  // 2.5) 인증되었으나 소속된 팀이 없는 경우 (guest) -> 팀 둘러보기 또는 가입신청 폼 노출
  if (isAuthenticated && userStatus === 'guest') {
    return (
      <PhoneFrame surface="soft">
        <Header />
        <GuestDashboard />
        <JoinRequestModal />
        <Toast />
      </PhoneFrame>
    );
  }

  // 3) 미인증 → 소셜 로그인 화면
  if (!isAuthenticated) {
    return (
      <PhoneFrame>
        <LoginScreen />
        <Toast />
      </PhoneFrame>
    );
  }

  // 4) pending → 승인 대기 화면 (대기 신청 상태의 신청 정보 뷰 표시)
  if (userStatus === 'pending') {
    return (
      <PhoneFrame surface="soft">
        <Header />
        <main className="flex-1 overflow-y-auto no-scrollbar p-4">
          <JoinRequestForm />
        </main>
        <Toast />
      </PhoneFrame>
    );
  }

  if (userStatus === 'rejected' || userStatus === 'suspended' || userStatus === 'withdrawn') {
    return (
      <PhoneFrame>
        <MembershipBlockedScreen type={userStatus === 'withdrawn' ? 'rejected' : userStatus} />
      </PhoneFrame>
    );
  }

  // 5) approved → 풀 대시보드
  return (
    <PhoneFrame surface="soft">
      <AppShell />
    </PhoneFrame>
  );
}

// ─── 데스크탑 전술 중계 분석 스튜디오 컴포넌트 ───
function DesktopTacticsStudio({ 
  matchId, 
  activeClubId, 
  onClose 
}: { 
  matchId: string; 
  activeClubId: string; 
  onClose: () => void; 
}) {
  const { upcomingMatches, calendarMatches } = useScheduleStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    players: Player[];
    lineup: MatchLineupEntry[];
  }>({ players: [], lineup: [] });
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);

  const { userRole } = useAppStore();
  const memberProfile = useAuthStore((state) => state.memberProfile);
  const isOperator = userRole === 'admin' || userRole === 'operator';

  const match = useMemo(() => {
    const all = [...upcomingMatches, ...calendarMatches];
    return all.find((m) => m.id === matchId) || null;
  }, [matchId, upcomingMatches, calendarMatches]);

  const isMatchTacticsCompleted = match?.tacticsCompleted ?? false;

  const redLeaderId = useMemo(() => {
    return data.players.find(p => data.lineup.find(l => l.membershipId === p.id && l.teamNumber === 1 && l.isLeader))?.id;
  }, [data.players, data.lineup]);
  
  const blueLeaderId = useMemo(() => {
    return data.players.find(p => data.lineup.find(l => l.membershipId === p.id && l.teamNumber === 2 && l.isLeader))?.id;
  }, [data.players, data.lineup]);

  const isRedLeader = memberProfile?.id === redLeaderId;
  const isBlueLeader = memberProfile?.id === blueLeaderId;

  const canEdit = useMemo(() => {
    return Boolean(
      !isMatchTacticsCompleted &&
      (isOperator || isRedLeader || isBlueLeader)
    );
  }, [isMatchTacticsCompleted, isOperator, isRedLeader, isBlueLeader]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    Promise.all([
      fetchMatchAttendees({ clubId: activeClubId, matchId }),
      fetchMatchLineup({ clubId: activeClubId, matchId }),
    ])
      .then(([attendees, lineup]) => {
        if (ignore) return;
        setData({
          players: attendees.map((member) => ({
            id: member.membershipId,
            name: member.playerName,
            ovr: member.playerOvr,
            matchPoints: member.matchPoints,
            photo: member.playerPhotoUrl || member.playerName,
          })),
          lineup,
        });
        setLoading(false);
      })
      .catch(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [matchId, activeClubId]);

  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData("text/plain", playerId);
    setDraggingPlayerId(playerId);
  };

  const handleDragEnd = () => {
    setDraggingPlayerId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetTeamNumber: number, targetFormationSlot: number) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("text/plain");
    if (!playerId || !canEdit) return;

    let nextLineup = [...data.lineup];
    const sourceSlotIndex = nextLineup.findIndex(slot => slot.membershipId === playerId);
    const targetSlotIndex = nextLineup.findIndex(slot => slot.teamNumber === targetTeamNumber && slot.formationSlot === targetFormationSlot);

    if (sourceSlotIndex !== -1) {
      if (targetSlotIndex !== -1) {
        // Swap: 필드 내부의 두 선수의 위치를 맞바꿈
        const sourceMemberId = nextLineup[sourceSlotIndex].membershipId;
        const targetMemberId = nextLineup[targetSlotIndex].membershipId;
        nextLineup[sourceSlotIndex] = {
          ...nextLineup[sourceSlotIndex],
          membershipId: targetMemberId
        };
        nextLineup[targetSlotIndex] = {
          ...nextLineup[targetSlotIndex],
          membershipId: sourceMemberId
        };
      } else {
        // 빈 슬롯으로 이동: 필드 선수의 슬롯 좌표 변경
        nextLineup[sourceSlotIndex] = {
          ...nextLineup[sourceSlotIndex],
          teamNumber: targetTeamNumber as 1 | 2,
          formationSlot: targetFormationSlot
        };
      }
    } else {
      // 대기명단에서 필드로 배치
      if (targetSlotIndex !== -1) {
        // 타겟 슬롯에 이미 선수가 있다면, 기존 선수를 대기명단으로 보내고(삭제), 그 자리에 새 선수를 덮어씀
        nextLineup[targetSlotIndex] = {
          ...nextLineup[targetSlotIndex],
          membershipId: playerId
        };
      } else {
        // 타겟 슬롯이 비어있다면, 새로운 entry를 생성하여 추가
        const newPlayer = data.players.find(p => p.id === playerId);
        const newEntry: MatchLineupEntry = {
          id: `temp-${Date.now()}`,
          matchId,
          membershipId: playerId,
          teamNumber: targetTeamNumber as 1 | 2,
          isLeader: false,
          position: 'MF',
          formationSlot: targetFormationSlot,
          playerName: newPlayer?.name ?? '',
          playerPosition: null,
          playerOvr: newPlayer?.ovr ?? 0,
          playerPhotoUrl: newPlayer?.photo ?? null,
          playerMatchPoints: newPlayer?.matchPoints ?? 0
        };
        nextLineup.push(newEntry);
      }
    }

    // 빈 유령 entry(membershipId가 없거나 빈 값)는 필터링
    nextLineup = nextLineup.filter(slot => slot.membershipId && slot.membershipId !== "");

    // Optimistic Update
    setData(prev => ({
      ...prev,
      lineup: nextLineup
    }));

    const hasRed = nextLineup.some(slot => slot.teamNumber === 1);
    const hasBlue = nextLineup.some(slot => slot.teamNumber === 2);
    if (!hasRed || !hasBlue) {
      // API를 호출하지 않고 로컬 상태만 업데이트하고 종료
      return;
    }

    setLoading(true);
    try {
      const savedLineup = await saveMatchLineup({
        clubId: activeClubId,
        matchId,
        entries: nextLineup.map(slot => ({
          membershipId: slot.membershipId,
          teamNumber: slot.teamNumber,
          isLeader: Boolean(slot.isLeader),
          position: (slot.position || 'MF') as 'FW' | 'MF' | 'DF',
          formationSlot: slot.formationSlot
        }))
      });
      setData(prev => ({
        ...prev,
        lineup: savedLineup
      }));
    } catch (error) {
      console.error('[FC Moim] Failed to save desktop match lineup:', error);
      const refetchedLineup = await fetchMatchLineup({ clubId: activeClubId, matchId });
      setData(prev => ({
        ...prev,
        lineup: refetchedLineup
      }));
    } finally {
      setLoading(false);
    }
  };

  if (!match) return null;

  const avgOvr = data.players.length > 0
    ? Math.round(data.players.reduce((sum, p) => sum + (p.ovr ?? 0), 0) / data.players.length)
    : 70;

  const totalSlots = data.lineup.length;
  const attendanceRate = totalSlots > 0 ? Math.round((data.players.length / totalSlots) * 100) : 0;

  return (
    <div className="absolute inset-0 flex flex-col bg-[#070914] z-10 text-white animate-fadeIn overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center px-5 py-3.5 bg-black/40 border-b border-[#25283e] backdrop-blur-md select-none">
        <div className="flex items-center gap-3">
          <span className="flex h-5 items-center justify-center rounded bg-[#00ffa3] px-2.5 text-[9px] font-black text-black gap-1 shadow-[0_0_8px_rgba(0,255,163,0.4)]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            TACTICS 스튜디오
          </span>
          <span className="text-xs font-black tracking-wide text-white truncate max-w-[280px]">
            Stadium: {match.title}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-black/60 border border-[#25283e] text-gray-400 hover:text-white active:scale-95 transition-all hover:bg-black/95 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Main Studio Console Content */}
      <div className="flex-1 flex min-h-0 relative justify-center items-center bg-[#070914] winning-bg-grid">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-30 space-y-3">
            <div className="w-8 h-8 rounded-full border-4 border-[#00ffa3]/10 border-t-[#00ffa3] animate-spin" />
            <p className="text-[10px] text-gray-400 font-bold">전술 데이터를 송출하는 중...</p>
          </div>
        ) : null}

        {/* Left Area: E-Sports Tactical Dashboard (Floating HUD style) */}
        <div className="absolute left-0 top-0 bottom-0 w-[320px] p-4 flex flex-col bg-[#0b0c16]/85 border-r border-[#25283e] backdrop-blur-md select-none overflow-y-auto no-scrollbar justify-start space-y-3.5 z-10">
          
          {/* Team OVR Spec Card */}
          <div className="p-3 rounded-xl border border-[#25283e] bg-black/40 shadow-md">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Shield size={12} className="text-[#00ffa3]" />
              전력 OVR 분석
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-white">{avgOvr} <span className="text-[9px] text-gray-400 font-bold">AVG</span></p>
                <p className="text-[8px] font-bold text-gray-500 mt-0.5">선수 능력치 OVR 기반 환산 스쿼드 파워</p>
              </div>
              <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-gradient-to-br from-[#00ffa3]/10 to-[#00b872]/5 border border-[#00ffa3]/25 shadow-[0_0_8px_rgba(0,255,163,0.1)]">
                <Award className="text-[#00ffa3]" size={22} />
              </div>
            </div>
          </div>

          {/* Attendance Rate Mission Gauge */}
          <div className="p-3 rounded-xl border border-[#25283e] bg-black/40 shadow-md space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-black text-gray-400 tracking-wider">
              <span className="flex items-center gap-1">
                <Activity size={10} className="text-[#00ffa3] animate-pulse" />
                출석 달성 게이지
              </span>
              <span className="text-white text-xs">{attendanceRate}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-black/60 border border-[#25283e] overflow-hidden relative">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[#00ffa3] to-[#00b872] transition-all duration-700 shadow-[0_0_6px_rgba(0,255,163,0.2)]"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
            <p className="text-[8px] font-bold text-gray-500">배치 스쿼드 {totalSlots}명 중 {data.players.length}명 참여 완료</p>
          </div>

          {/* Player List Stats Table */}
          <div className="rounded-xl border border-[#25283e] bg-black/40 overflow-hidden shadow-md">
            <div className="px-3 py-2 bg-[#0d0f1a] border-b border-[#25283e]">
              <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Users size={10} className="text-[#00ffa3]" />
                스쿼드 명단 ({data.players.length}명)
              </h4>
            </div>
            <div className="divide-y divide-[#25283e]/50 max-h-[140px] overflow-y-auto no-scrollbar">
              {data.players.map((player) => (
                <div 
                  key={player.id} 
                  draggable={canEdit}
                  onDragStart={(e) => handleDragStart(e, player.id)}
                  onDragEnd={handleDragEnd}
                  className={`px-3 py-2 flex items-center justify-between text-[11px] hover:bg-[#141624]/40 transition-colors ${canEdit ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02]' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <img 
                      src={getFallbackAvatar(player.name)} 
                      alt="" 
                      className="w-3.5 h-3.5 rounded-full" 
                    />
                    <span className="font-extrabold text-white">{player.name}</span>
                  </div>
                  <span className="font-black text-[#00ffa3] bg-[#00ffa3]/10 border border-[#00ffa3]/20 px-1 py-0.5 rounded text-[8px]">
                    OVR {player.ovr}
                  </span>
                </div>
              ))}
              {data.players.length === 0 && (
                <div className="p-3 text-center text-[10px] text-gray-500 font-bold">배치된 스쿼드가 없습니다</div>
              )}
            </div>
          </div>

        </div>

        {/* Center Area: Mega Cyber Pitch (Centered overall - Expanded) */}
        <div className="flex-1 h-full flex flex-col justify-center items-center relative p-4 z-0 lg:pl-[320px]">
          {/* Pitch Container with Skew Accent */}
          <div className="w-[92%] max-w-[760px] xl:max-w-[820px] aspect-[5/3] relative rounded-3xl border border-[#00ffa3]/25 bg-soccer-pitch overflow-hidden shadow-[0_0_24px_rgba(0,255,163,0.06)] p-4 md:p-5">
            {/* Mega Cyber Pitch Lines */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              {/* 경기장 전체 안쪽 테두리선 */}
              <div className="absolute inset-4 rounded-2xl border border-[#00ffa3]/25 shadow-[0_0_8px_rgba(0,255,163,0.08)]" />
              {/* 하프라인 */}
              <div className="absolute left-1/2 top-4 h-[calc(100%-32px)] w-px -translate-x-1/2 bg-[#00ffa3]/25" />
              {/* 센터 서클 */}
              <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#00ffa3]/25 shadow-[0_0_8px_rgba(0,255,163,0.08)]" />
              {/* 센터 스팟 */}
              <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00ffa3]/55 shadow-[0_0_6px_rgba(0,255,163,0.8)]" />
              
              {/* 왼쪽 페널티 박스 (Penalty Area) */}
              <div className="absolute left-4 top-[22%] h-[56%] w-[15%] border border-l-0 border-[#00ffa3]/25 shadow-[0_0_6px_rgba(0,255,163,0.06)] rounded-r-2xl" />
              {/* 왼쪽 골 에어리어 (Goal Area) */}
              <div className="absolute left-4 top-[36%] h-[28%] w-[5%] border border-l-0 border-[#00ffa3]/25 shadow-[0_0_6px_rgba(0,255,163,0.06)] rounded-r-xl" />
              {/* 왼쪽 페널티 스팟 */}
              <div className="absolute left-[11%] top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00ffa3]/55 shadow-[0_0_4px_rgba(0,255,163,0.8)]" />

              {/* 오른쪽 페널티 박스 (Penalty Area) */}
              <div className="absolute right-4 top-[22%] h-[56%] w-[15%] border border-r-0 border-[#00ffa3]/25 shadow-[0_0_6px_rgba(0,255,163,0.06)] rounded-l-2xl" />
              {/* 오른쪽 골 에어리어 (Goal Area) */}
              <div className="absolute right-4 top-[36%] h-[28%] w-[5%] border border-r-0 border-[#00ffa3]/25 shadow-[0_0_6px_rgba(0,255,163,0.06)] rounded-l-xl" />
              {/* 오른쪽 페널티 스팟 */}
              <div className="absolute right-[11%] top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00ffa3]/55 shadow-[0_0_4px_rgba(0,255,163,0.8)]" />
            </div>

            {/* Render Slots (Red: 36, Blue: 36) */}
            {Array.from({ length: 72 }).map((_, index) => {
              const teamNumber = index < 36 ? 1 : 2;
              const formationSlot = index < 36 ? index : index - 36;
              
              // 해당 슬롯에 배치된 라인업 정보가 있는지 확인
              const slot = data.lineup.find(
                (l) => l.teamNumber === teamNumber && l.formationSlot === formationSlot
              );
              
              const player = slot 
                ? data.players.find((p) => p.id === slot.membershipId)
                : null;
                
              const { top, left } = getPlayerCoordinate(teamNumber, formationSlot);
              const isDraggingThis = draggingPlayerId === player?.id;
              
              const cardTierClass = player 
                ? (player.ovr ?? 0) >= 80 
                  ? 'border-yellow-500 bg-yellow-950/70 text-yellow-200 shadow-[0_0_8px_rgba(234,179,8,0.2)]' 
                  : (player.ovr ?? 0) >= 70 
                    ? 'border-slate-400 bg-slate-900/70 text-slate-200' 
                    : 'border-amber-700 bg-amber-950/70 text-amber-200'
                : 'border-transparent bg-transparent text-transparent pointer-events-auto';

              return (
                <div 
                  key={`${teamNumber}-${formationSlot}`} 
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-[7.5%] h-[16%] transition-all duration-500 ease-out pointer-events-auto"
                  style={{ top: `${top}%`, left: `${left}%` }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, teamNumber, formationSlot)}
                >
                  <div 
                    draggable={Boolean(player && canEdit)}
                    onDragStart={(e) => player && handleDragStart(e, player.id)}
                    onDragEnd={handleDragEnd}
                    className={`relative flex flex-col items-center justify-between p-1 md:p-1.5 rounded-lg border shadow-lg ${cardTierClass} w-11 h-14 md:w-13 md:h-[68px] scale-90 md:scale-95 transition-all duration-300 ${
                      player && canEdit ? 'cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95' : ''
                    } ${isDraggingThis ? 'opacity-30' : ''}`}
                  >
                    {player ? (
                      <>
                        <div className="text-[7px] md:text-[9px] font-black absolute top-0.5 right-1 md:top-1 md:right-1.5">{player.ovr}</div>
                        <div className="w-5 h-5 md:w-7 md:h-7 rounded-full overflow-hidden mt-1 md:mt-1.5 border border-white/20">
                          <img 
                            src={getFallbackAvatar(player.name)} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <span className="text-[7px] md:text-[9px] font-extrabold truncate max-w-full text-center w-full mb-0.5 md:mb-1 select-none">
                          {player.name}
                        </span>
                      </>
                    ) : (
                      // EMPTY SLOT 텍스트 렌더링 제거 (투명 빈 영역만 제공)
                      <div className="w-full h-full" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3.5 text-[9px] md:text-[10px] text-gray-500 font-extrabold tracking-widest uppercase flex items-center gap-1.5 select-none">
            <Info size={11} className="text-[#00ffa3]" />
            전술 보드는 우측 모바일 제어반과 실시간 동기화 중입니다
          </div>
        </div>
      </div>
    </div>
  );
}

function getPlayerCoordinate(teamNumber: number, slotIndex: number) {
  const row = Math.floor(slotIndex / 6);
  const col = slotIndex % 6;
  const top = 10 + row * 16;
  let left = 0;
  if (teamNumber === 1) {
    left = 7 + col * 7.5;
  } else {
    left = 55 + col * 7.5;
  }
  return { top, left };
}
