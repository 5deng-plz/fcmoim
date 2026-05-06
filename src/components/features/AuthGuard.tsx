// ========================================
// FC Moim — AuthGuard 래퍼 컴포넌트
// v1.0 인증 상태별 UI 분기
// ========================================

'use client';

import { useAppStore } from '@/stores/useAppStore';
import LoginScreen from '@/components/features/LoginScreen';
import GuestDashboard from '@/components/features/GuestDashboard';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard — 인증 상태에 따라 적절한 화면을 렌더링
 * - 미인증 → LoginScreen
 * - guest → GuestDashboard (제한된 공개)
 * - pending → PendingScreen (page.tsx에서 처리)
 * - approved → children (풀 대시보드)
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { authView, isAuthenticated, userStatus } = useAppStore();

  if (!isAuthenticated && userStatus === 'pending') {
    return <>{children}</>;
  }

  if (!isAuthenticated && authView !== 'guest') {
    return <LoginScreen />;
  }

  if (!isAuthenticated && authView === 'guest') {
    return <GuestDashboard />;
  }

  // 승인된 사용자 → 풀 대시보드
  return <>{children}</>;
}
