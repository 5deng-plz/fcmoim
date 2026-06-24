'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
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
import { Ban, ShieldAlert } from 'lucide-react';

function PhoneFrame({ children, surface = 'white' }: { children: ReactNode; surface?: 'white' | 'soft' }) {
  return (
    <div className="app-viewport chzzk-layout text-primary">
      {/* Chzzk Live Stream Player Area (Visible only on Desktop) */}
      <div className="flex-1 h-full relative bg-black flex flex-col justify-between hidden lg:flex overflow-hidden select-none border-r border-default">
        
        {/* Stream Header */}
        <div className="p-4 bg-gradient-to-b from-black/95 to-transparent flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <span className="flex h-5 items-center justify-center rounded bg-brand-primary px-2.5 text-[10px] font-black text-black gap-1 shadow-[0_0_8px_var(--brand-primary-bg)]">
              <span className="w-1.5 h-1.5 rounded-full bg-result-loss animate-pulse" />
              실시간 중계
            </span>
            <span className="text-sm font-black text-white tracking-wide">
              [라이브] 🏟️ FC Guppy 주말 아침 친선 매치 & 전술 전광판 (땀 흘리고 막걸리 내기)
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-black text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
              </span>
              <span className="text-brand-primary font-bold">송출 양호 (1080p)</span>
            </span>
            <span className="border-l border-border-default pl-3">참석회원 10명 (풀방)</span>
          </div>
        </div>
 
        {/* Video Player Display (Winning Eleven Intro Theme + Danmaku Chat) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-bg winning-bg-grid z-0">
          {/* Neon Glow Effects */}
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 via-transparent to-fcgreen-600/15 mix-blend-color-dodge animate-pulse" style={{ animationDuration: '4s' }} />
          
          {/* Winning Eleven Title Card */}
          <div className="text-center space-y-5 z-10 animate-fadeIn">
            <div className="inline-block bg-gradient-to-r from-fcgreen-600 to-brand-primary text-black font-black text-6xl tracking-wider px-8 py-3.5 transform -skew-x-12 border-[5px] border-black shadow-[0_0_30px_var(--brand-primary-bg)]">
              WINNING MOIM
            </div>
            <div className="text-md font-black text-brand-primary tracking-widest uppercase">
              FC GUPPY 2026 SEASON
            </div>
            <div className="pt-8">
              <button className="flex items-center gap-2 mx-auto rounded-full bg-brand-primary-hover hover:bg-brand-primary active:scale-95 transition-all px-8 py-3.5 text-xs font-black text-black shadow-lg shadow-brand-primary/25">
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
            <div className="text-xs text-brand-primary font-black flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-primary"></span>
              </span>
              LIVE
            </div>
          </div>
          <div className="flex items-center gap-5 text-[11px] font-black text-gray-400">
            <span className="hover:text-white transition-colors cursor-pointer">1080P SOURCE</span>
            <span className="hover:text-white transition-colors cursor-pointer">SCREEN 16:9</span>
          </div>
        </div>
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
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-fcgreen-600">FC Guppy</span>
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
