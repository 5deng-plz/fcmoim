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
import { Ban, ShieldAlert } from 'lucide-react';

function PhoneFrame({ children, surface = 'white' }: { children: ReactNode; surface?: 'white' | 'soft' }) {
  return (
    <div className="app-viewport text-primary">
      <div className={`phone-shell ${surface === 'soft' ? 'bg-surface-bg' : 'bg-surface-card'}`}>
        {children}
      </div>
    </div>
  );
}

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

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // 1. PopState 리스너 (뒤로가기 가로채기 및 상태 동기화)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const view = params.get('view');
      const modal = params.get('modal');

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
    handlePopState();

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [setActiveTab, setShowMyPage, setShowJoinForm, setShowTeamBrowse, setShowNotifications, openModal, closeModal]);

  // 2. Zustand 상태 변화를 URL 파라미터에 동기화
  useEffect(() => {
    if (typeof window === 'undefined' || isHandlingPopState.current) return;

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
  }, [activeTab, showMyPage, showJoinForm, showTeamBrowse, showNotifications, activeModal]);

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
