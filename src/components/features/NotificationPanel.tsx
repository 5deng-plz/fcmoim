'use client';

import { Banknote, Bell as BellIcon } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { appConfig } from '@/config/app.config';

export default function NotificationPanel() {
  const { showNotifications, setShowNotifications, settlementNotification } = useAppStore();

  if (!showNotifications) return null;

  const hasNotifications = Boolean(settlementNotification);

  return (
    <Modal
      title="알림"
      isOpen={showNotifications}
      onClose={() => setShowNotifications(false)}
    >
      {hasNotifications ? (
        <div className="space-y-3">
          {settlementNotification ? (
            <SettlementNoticeCard title={settlementNotification.title} />
          ) : null}
        </div>
      ) : (
        <div className="py-10">
          <EmptyState
            icon={<BellIcon size={28} />}
            message="새로운 알림이 없어요"
          />
        </div>
      )}
    </Modal>
  );
}

function SettlementNoticeCard({ title }: { title: string }) {
  const openSettlement = () => {
    if (appConfig.settlementUrl) {
      window.open(appConfig.settlementUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    void navigator.clipboard?.writeText(appConfig.settlementAccountLabel);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-glass-border bg-glass-bg shadow-glass-shadow backdrop-blur-md settlement-cta-flow">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-feedback-warning-border bg-feedback-warning-bg text-feedback-warning">
            <Banknote size={17} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 truncate text-sm font-black leading-snug text-primary">졌다.. 겜비내자</p>
            <p className="truncate text-xs font-medium leading-snug text-secondary">
              {appConfig.settlementUrl ? title : appConfig.settlementAccountLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openSettlement}
          className="shrink-0 rounded-lg bg-feedback-warning px-3 py-2 text-xs font-black text-white transition-all hover:brightness-110 active:scale-95"
        >
          정산하기
        </button>
      </div>
    </section>
  );
}
