'use client';

import { Eye } from 'lucide-react';
import FcmoimLogo from '@/components/brand/FcmoimLogo';
import { appConfig } from '@/config/app.config';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';

export default function LoginScreen() {
  const { signInKakao, signInDevAdmin } = useAuthStore();
  const { setAuthView, setUserStatus } = useAppStore();

  const handleKakaoLogin = async () => {
    await signInKakao();
  };

  const handleGuestMode = () => {
    setAuthView('guest');
    setUserStatus('guest');
  };

  const handleDevLogin = () => {
    signInDevAdmin();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-10">
      {/* 로고 & 팀명 */}
      <div className="text-center space-y-2">
        <div className="mx-auto mb-2 h-20 w-20">
          <FcmoimLogo size="100%" className="block h-full w-full" />
        </div>
        <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">FC Moim</h1>
      </div>

      {/* 소셜 로그인 버튼 */}
      <div className="w-full max-w-[280px] space-y-3">
        {/* 카카오 로그인 */}
        <button
          onClick={handleKakaoLogin}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] hover:brightness-95"
          style={{ backgroundColor: '#FEE500', color: '#191919' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1C4.58 1 1 3.9 1 7.46c0 2.32 1.53 4.35 3.83 5.51l-.97 3.6c-.06.22.18.4.37.28l4.3-2.85c.16.01.31.02.47.02 4.42 0 8-2.9 8-6.46S13.42 1 9 1z" fill="#191919"/>
          </svg>
          카카오로 시작하기
        </button>
      </div>

      {/* 둘러보기 */}
      <button
        onClick={handleGuestMode}
        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors text-sm font-medium"
      >
        <Eye size={16} />
        먼저 둘러볼게요
      </button>

      {appConfig.enableAdminTestBypass ? (
        <button
          onClick={handleDevLogin}
          className="mt-8 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-400 transition-colors hover:bg-gray-200 active:scale-95"
        >
          테스트 관리자 로그인 (Admin)
        </button>
      ) : null}
    </div>
  );
}
