'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Eye, Mail, MessageCircle, Search } from 'lucide-react';
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
  const [emailError, setEmailError] = useState<string | null>(null);

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
    await signInKakao();
  };

  const handleGoogleLogin = async () => {
    await signInGoogle();
  };

  const handleGuestMode = () => {
    setAuthView('guest');
    setUserStatus('guest');
  };

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError(null);
    setIsEmailSubmitting(true);

    try {
      await signInEmail(email.trim(), password);
    } catch (error) {
      if (!isInvalidLoginCredentialsError(error)) {
        console.error('[FC Moim] Email login failed:', error);
      }
      setEmailError(getEmailLoginErrorMessage(error));
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
        <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">FC Moim</h1>
      </div>

      <form onSubmit={handleEmailLogin} className="w-full max-w-[280px] space-y-2">
        {isDevTestEnabled ? (
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
        ) : (
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 outline-none transition-colors focus:border-green-500"
            placeholder="이메일"
            aria-label="이메일"
            autoComplete="email"
          />
        )}
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 outline-none transition-colors focus:border-green-500"
          placeholder={isDevTestEnabled ? 'QA password' : '비밀번호'}
          aria-label="비밀번호"
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={isEmailSubmitting || email.trim().length === 0 || password.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2.5 text-xs font-black text-white transition-all hover:bg-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail size={15} aria-hidden="true" />
          {isEmailSubmitting ? '로그인 중' : isDevTestEnabled ? 'QA 이메일 로그인' : '이메일로 로그인'}
        </button>
        {emailError ? (
          <p role="alert" className="rounded-lg border border-result-loss/20 bg-result-loss/10 px-3 py-2 text-xs font-bold text-result-loss">
            {emailError}
          </p>
        ) : null}
      </form>

      <div className="w-full max-w-[280px] space-y-3">
        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-900 transition-all hover:bg-gray-50 active:scale-[0.98]"
        >
          <Search size={18} aria-hidden="true" />
          Google로 시작하기
        </button>
        <button
          onClick={handleKakaoLogin}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-award-mvp font-bold text-sm text-gray-900 transition-all active:scale-[0.98] hover:brightness-95"
        >
          <MessageCircle size={18} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          카카오로 시작하기
        </button>
      </div>

      {/* 둘러보기 */}
      <button
        onClick={handleGuestMode}
        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors text-sm font-medium"
      >
        <Eye size={16} />
        팀 둘러보기
      </button>
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
