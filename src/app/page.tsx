'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import HomeTab from '@/components/tabs/HomeTab';
import ScheduleTab from '@/components/tabs/ScheduleTab';
import RecordsTab from '@/components/tabs/RecordsTab';
import LockerRoomTab from '@/components/tabs/LockerRoomTab';
import MyPage from '@/components/tabs/MyPage';
import CommunityPage from '@/components/tabs/CommunityPage';
import NotificationPanel from '@/components/features/NotificationPanel';
import MatchCreateModal from '@/components/features/MatchCreateModal';
import PollCreateModal from '@/components/features/PollCreateModal';
import AnnouncementCreateModal from '@/components/features/AnnouncementCreateModal';
import LoginScreen from '@/components/features/LoginScreen';
import GuestDashboard from '@/components/features/GuestDashboard';
import JoinRequestForm from '@/components/features/JoinRequestForm';
import Toast from '@/components/ui/Toast';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { appConfig } from '@/config/app.config';
import { Ban, Clock4, ShieldAlert } from 'lucide-react';

function PhoneFrame({ children, surface = 'white' }: { children: ReactNode; surface?: 'white' | 'soft' }) {
  return (
    <div className="app-viewport">
      <div className={`phone-shell ${surface === 'soft' ? 'bg-gray-50' : 'bg-white'}`}>
        {children}
      </div>
    </div>
  );
}

// ─── 승인 대기 화면 ───
function PendingScreen() {
  const { setIsAuthenticated, setUserStatus, setAuthView } = useAppStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 space-y-6">
      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
        <Clock4 className="text-green-500" size={40} />
      </div>
      <div>
        <h2 className="text-xl font-black text-gray-900 mb-2">
          가입 승인 대기 중
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          관리자가 빠르게 확인할거예요~ 🙏
          <br />
          승인 떨어지면 풋살 고고!
        </p>
      </div>
      <div className="space-y-2 w-full max-w-[240px]">
        {appConfig.useMockData ? (
          <button
            onClick={() => {
              setIsAuthenticated(true);
              setUserStatus('approved');
              setAuthView('login');
            }}
            className="w-full bg-gray-900 text-white font-bold py-3 px-6 rounded-xl text-sm hover:bg-gray-800 active:scale-95 transition-all"
          >
            (데모) 관리자 승인 완료
          </button>
        ) : null}
        <button
          onClick={() => {
            setUserStatus('guest');
            setAuthView('guest');
          }}
          className="w-full text-gray-400 font-medium py-2 text-xs hover:text-gray-600 transition-colors"
        >
          둘러보기로 돌아가기
        </button>
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
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
        <Icon className="text-red-500" size={40} />
      </div>
      <div>
        <h2 className="text-xl font-black text-gray-900 mb-2">
          {isSuspended ? '이용이 일시 중지되었어요' : '가입 신청이 반려되었어요'}
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          {isSuspended
            ? '팀 운영진에게 멤버십 상태 확인을 요청해주세요.'
            : '입력한 정보 확인이 필요해요. 팀 운영진에게 문의해주세요.'}
        </p>
      </div>
      <button
        onClick={() => void signOut()}
        className="w-full max-w-[240px] bg-gray-900 text-white font-bold py-3 px-6 rounded-xl text-sm hover:bg-gray-800 active:scale-95 transition-all"
      >
        다른 계정으로 로그인
      </button>
    </div>
  );
}

// ─── 메인 앱 쉘 (인증 완료 사용자) ───
function AppShell() {
  const { activeTab, showMyPage, showCommunity, showJoinForm } = useAppStore();

  const renderContent = () => {
    if (showJoinForm) return <JoinRequestForm />;
    if (showMyPage) return <MyPage />;
    if (showCommunity) return <CommunityPage />;
    switch (activeTab) {
      case 'home':
        return <HomeTab />;
      case 'schedule':
        return <ScheduleTab />;
      case 'records':
        return <RecordsTab />;
      case 'locker_room':
        return <LockerRoomTab />;
      default:
        return <HomeTab />;
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        <div className="absolute inset-0 p-4 pb-[env(safe-area-inset-bottom)]">
          {renderContent()}
        </div>
      </main>
      <BottomNav />

      <NotificationPanel />
      <MatchCreateModal />
      <PollCreateModal />
      <AnnouncementCreateModal />
      <Toast />
    </>
  );
}

// ─── 루트 페이지 ───
export default function Home() {
  const { authView, userStatus, isAuthenticated, showJoinForm } = useAppStore();
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col items-center justify-center space-y-3 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-green-200 border-t-green-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-gray-600">인증 상태를 확인하는 중입니다</p>
        </div>
      </PhoneFrame>
    );
  }

  // 1) 가입 신청 완료 → 승인 대기 화면
  if (!isAuthenticated && userStatus === 'pending') {
    return (
      <PhoneFrame>
        <PendingScreen />
      </PhoneFrame>
    );
  }

  // 2) 미인증 + 둘러보기 모드
  if (!isAuthenticated && authView === 'guest') {
    return (
      <PhoneFrame surface="soft">
        {showJoinForm ? <JoinRequestForm /> : <GuestDashboard />}
        <Toast />
      </PhoneFrame>
    );
  }

  if (isAuthenticated && showJoinForm) {
    return (
      <PhoneFrame surface="soft">
        <main className="flex-1 overflow-y-auto no-scrollbar p-4">
          <JoinRequestForm />
        </main>
        <Toast />
      </PhoneFrame>
    );
  }

  // 3) 미인증 → 소셜 로그인 화면
  if (!isAuthenticated) {
    return (
      <PhoneFrame>
        <LoginScreen />
      </PhoneFrame>
    );
  }

  // 4) pending → 승인 대기 화면
  if (userStatus === 'pending') {
    return (
      <PhoneFrame>
        <PendingScreen />
      </PhoneFrame>
    );
  }

  if (userStatus === 'rejected' || userStatus === 'suspended') {
    return (
      <PhoneFrame>
        <MembershipBlockedScreen type={userStatus} />
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
