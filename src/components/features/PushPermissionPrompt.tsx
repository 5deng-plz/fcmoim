'use client';

import { Bell, BellRing, Smartphone } from 'lucide-react';
import { usePushNotification } from '@/hooks/usePushNotification';

export default function PushPermissionPrompt() {
  const {
    shouldShowPrompt,
    promptMode,
    isSubmitting,
    enablePush,
    dismissPrompt,
  } = usePushNotification();

  if (!shouldShowPrompt) {
    return null;
  }

  const isInstallGuide = promptMode === 'install-ios';
  const Icon = isInstallGuide ? Smartphone : BellRing;

  return (
    <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-50">
      <section className="rounded-2xl border border-glass-border bg-glass-bg p-4 shadow-glass-shadow backdrop-blur-md">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-primary/20 bg-brand-primary/10 text-brand-primary">
            <Icon size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black leading-snug text-primary">
              {isInstallGuide ? '홈 화면에서 알림을 받을 수 있어요' : '중요한 팀 소식을 바로 받을까요?'}
            </h2>
            <p className="mt-1 text-xs font-medium leading-relaxed text-secondary">
              {isInstallGuide
                ? 'iPhone은 홈 화면에 추가한 앱에서만 Push 알림을 허용합니다.'
                : '일정, 입단 승인, 새 공지가 생기면 놓치지 않게 알려드릴게요.'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {isInstallGuide ? (
            <button
              type="button"
              onClick={dismissPrompt}
              className="flex-1 rounded-xl bg-action-secondary px-4 py-3 text-sm font-black text-background transition-all hover:bg-action-secondary-hover active:scale-95"
            >
              확인
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void enablePush()}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-action-primary px-4 py-3 text-sm font-black text-white transition-all hover:bg-action-primary-hover active:scale-95 disabled:opacity-60"
            >
              <Bell size={16} aria-hidden="true" />
              {isSubmitting ? '설정 중' : '알림 받기'}
            </button>
          )}
          <button
            type="button"
            onClick={dismissPrompt}
            className="rounded-xl border border-border-subtle bg-surface-card px-4 py-3 text-sm font-bold text-secondary transition-all hover:bg-surface-hover active:scale-95"
          >
            나중에
          </button>
        </div>
      </section>
    </div>
  );
}
