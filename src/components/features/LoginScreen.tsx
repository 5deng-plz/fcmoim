'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Eye, Mail, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import FcmoimLogo from '@/components/brand/FcmoimLogo';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';

const QA_EMAILS = [
  'qa-admin@fcmoim.test',
  'qa-operator@fcmoim.test',
  'qa-member1@fcmoim.test',
  'qa-member2@fcmoim.test',
  'qa-member3@fcmoim.test',
  'qa-member4@fcmoim.test',
  'qa-new@fcmoim.test',
];

export default function LoginScreen() {
  const { signInEmail, signInGoogle, signInKakao } = useAuthStore();
  const { setAuthView, setUserStatus } = useAppStore();
  const [isDevTestEnabled, setIsDevTestEnabled] = useState(false);
  const [email, setEmail] = useState(QA_EMAILS[0]);
  const [password, setPassword] = useState('');
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    fetch('/api/dev-test', {
      headers: { Accept: 'application/json' },
    })
      .then((response) => response.ok ? response.json() as Promise<{ enabled?: boolean }> : { enabled: false })
      .then((data) => {
        if (isActive) setIsDevTestEnabled(data.enabled === true);
      })
      .catch(() => {
        if (isActive) setIsDevTestEnabled(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleKakaoLogin = async () => {
    setLoginError(null);

    try {
      await signInKakao();
    } catch (error) {
      console.error('[FC Moim] Kakao OAuth login failed:', error);
      setLoginError('카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError(null);

    try {
      await signInGoogle();
    } catch (error) {
      console.error('[FC Moim] Google OAuth login failed:', error);
      setLoginError('Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleGuestMode = () => {
    setAuthView('guest');
    setUserStatus('guest');
  };

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setIsEmailSubmitting(true);

    try {
      await signInEmail(email.trim(), password);
    } catch (error) {
      if (!isInvalidLoginCredentialsError(error)) {
        console.error('[FC Moim] Email login failed:', error);
      }
      setLoginError(getEmailLoginErrorMessage(error));
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-7">
      {/* 로고 & 팀명 */}
      <div className="text-center space-y-2">
        <div className="mx-auto mb-2 h-20 w-20">
          <FcmoimLogo size="100%" className="block h-full w-full" />
        </div>
        <h1 className="text-2xl font-black login-title-gradient tracking-tight">FC Guppy</h1>
      </div>

      {isDevTestEnabled ? (
        <form onSubmit={handleEmailLogin} className="w-full max-w-[280px] space-y-2">
          <select
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 outline-none transition-colors focus:border-green-500"
            aria-label="QA 이메일 계정"
          >
            {QA_EMAILS.map((qaEmail) => (
              <option key={qaEmail} value={qaEmail}>
                {qaEmail}
              </option>
            ))}
          </select>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 outline-none transition-colors focus:border-green-500"
            placeholder="QA password"
            aria-label="비밀번호"
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={isEmailSubmitting || email.trim().length === 0 || password.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2.5 text-xs font-black text-white transition-all hover:bg-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mail size={15} aria-hidden="true" />
            {isEmailSubmitting ? '로그인 중' : 'QA 이메일 로그인'}
          </button>
        </form>
      ) : null}

      {/* 둘러보기 */}
      <button
        onClick={handleGuestMode}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:text-gray-700 active:scale-[0.98]"
      >
        <Eye size={16} />
        팀 둘러보기
      </button>

      <div className="flex items-center justify-center gap-8">
        <button
          type="button"
          onClick={handleGoogleLogin}
          aria-label="Google로 계속하기"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.96]"
        >
          <Image
            src="/brand/google-g.svg"
            alt=""
            width={26}
            height={26}
            aria-hidden="true"
            className="h-[26px] w-[26px]"
          />
        </button>
        <button
          type="button"
          onClick={handleKakaoLogin}
          aria-label="카카오로 시작하기"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-award-mvp text-gray-900 shadow-sm transition-all hover:brightness-95 active:scale-[0.96]"
        >
          <MessageCircle size={25} fill="currentColor" strokeWidth={0} aria-hidden="true" />
        </button>
      </div>

      {loginError ? (
        <p role="alert" className="w-full max-w-[280px] rounded-lg border border-result-loss/20 bg-result-loss/10 px-3 py-2 text-xs font-bold text-result-loss">
          {loginError}
        </p>
      ) : null}
    </div>
  );
}

function getEmailLoginErrorMessage(error: unknown) {
  if (isInvalidLoginCredentialsError(error)) {
    return '비밀번호가 올바르지 않습니다.';
  }

  if (isMembershipBootstrapError(error)) {
    return '로그인은 되었지만 멤버십 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
  }

  return '이메일 로그인을 완료하지 못했습니다.';
}

function isInvalidLoginCredentialsError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return message.toLowerCase().includes('invalid login credentials');
}

function isMembershipBootstrapError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return message.includes('멤버십 상태를 확인하지 못했습니다.') ||
    message.includes('Failed to bootstrap account');
}
