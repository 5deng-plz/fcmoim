'use client';

import { Eye } from 'lucide-react';
import FcMoimMark from '@/components/brand/FcMoimMark';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';

export default function LoginScreen() {
  const { signInGoogle, signInKakao } = useAuthStore();
  const { setAuthView, setUserStatus } = useAppStore();

  const handleGoogleLogin = async () => {
    await signInGoogle();
  };

  const handleKakaoLogin = async () => {
    await signInKakao();
  };

  const handleGuestMode = () => {
    setAuthView('guest');
    setUserStatus('guest');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-10">
      {/* 로고 & 팀명 */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-3xl mb-2">
          <FcMoimMark size={44} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">FC Moim</h1>
        <p className="text-sm text-gray-400">아마추어 풋살 동호회 매니지먼트</p>
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

        {/* 구글 로그인 */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 py-3.5 rounded-xl font-bold text-sm text-gray-700 transition-all active:scale-[0.98] hover:border-gray-300 hover:bg-gray-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92a8.78 8.78 0 002.68-6.62z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A8.99 8.99 0 009 18z" fill="#34A853"/>
            <path d="M3.96 10.71A5.41 5.41 0 013.64 9c0-.6.11-1.17.32-1.71V4.96H.96A8.99 8.99 0 000 9c0 1.45.35 2.82.96 4.04l3-2.33z" fill="#FBBC05"/>
            <path d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A8.99 8.99 0 00.96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Google로 시작하기
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
    </div>
  );
}
