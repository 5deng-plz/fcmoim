'use client';

import { useEffect, useState } from 'react';
import { Banknote, Bell as BellIcon, CheckCheck, Circle } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { appConfig } from '@/config/app.config';

type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  targetUrl: string | null;
  createdAt: string;
};

export default function NotificationPanel() {
  const {
    activeClubId,
    showNotifications,
    setShowNotifications,
    settlementNotification,
    setActiveTab,
    setRecordsSubTab,
    setUnreadNotificationCount,
  } = useAppStore();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    if (!showNotifications) {
      return;
    }

    const controller = new AbortController();
    fetch(`/api/notifications?clubId=${encodeURIComponent(activeClubId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Notification list request failed.');
        }
        return response.json() as Promise<{ notifications?: AppNotification[] }>;
      })
      .then((data) => {
        const nextNotifications = data.notifications ?? [];
        setNotifications(nextNotifications);
        setUnreadNotificationCount(nextNotifications.filter((item) => !item.isRead).length);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error('[FC Moim] Notification list sync failed:', error);
        }
      })

    return () => {
      controller.abort();
    };
  }, [activeClubId, setUnreadNotificationCount, showNotifications]);

  if (!showNotifications) return null;

  const hasNotifications = Boolean(settlementNotification) || (notifications?.length ?? 0) > 0;

  const markAllRead = async () => {
    setNotifications((items) => items?.map((item) => ({ ...item, isRead: true })) ?? []);
    setUnreadNotificationCount(0);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clubId: activeClubId, markAllRead: true }),
    }).catch((error) => {
      console.error('[FC Moim] Mark all notifications as read failed:', error);
    });
  };

  const openNotification = async (notification: AppNotification) => {
    if (!notification.isRead) {
      setNotifications((items) => items?.map((item) => (
        item.id === notification.id ? { ...item, isRead: true } : item
      )) ?? []);
      setUnreadNotificationCount(Math.max(0, (notifications ?? []).filter((item) => !item.isRead).length - 1));
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId: notification.id }),
      }).catch((error) => {
        console.error('[FC Moim] Mark notification as read failed:', error);
      });
    }

    if (notification.targetUrl) {
      openTargetUrl(notification.targetUrl, { setActiveTab, setRecordsSubTab });
    }
    setShowNotifications(false);
  };

  return (
    <Modal
      title="알림"
      isOpen={showNotifications}
      onClose={() => setShowNotifications(false)}
    >
      {notifications?.some((notification) => !notification.isRead) ? (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-secondary transition-all hover:bg-surface-hover hover:text-primary active:scale-95"
          >
            <CheckCheck size={14} aria-hidden="true" />
            모두 읽음
          </button>
        </div>
      ) : null}

      {hasNotifications ? (
        <div className="space-y-3">
          {notifications?.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onOpen={() => void openNotification(notification)}
            />
          ))}
          {settlementNotification ? (
            <SettlementNoticeCard title={settlementNotification.title} />
          ) : null}
        </div>
      ) : notifications === null ? (
        <div className="py-10 text-center text-sm font-bold text-secondary">
          알림을 불러오는 중입니다
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

function NotificationCard({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-xl border border-border-subtle bg-surface-card p-4 text-left transition-all hover:bg-surface-hover active:scale-[0.99]"
    >
      <div className="mt-1 text-brand-primary">
        {notification.isRead ? <BellIcon size={17} aria-hidden="true" /> : <Circle size={10} fill="currentColor" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-sm font-black leading-snug text-primary">{notification.title}</p>
          <time className="shrink-0 text-[11px] font-bold text-secondary">
            {formatNotificationTime(notification.createdAt)}
          </time>
        </div>
        <p className="mt-1 text-xs font-medium leading-relaxed text-secondary">{notification.body}</p>
      </div>
    </button>
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

function openTargetUrl(
  targetUrl: string,
  actions: {
    setActiveTab: ReturnType<typeof useAppStore.getState>['setActiveTab'];
    setRecordsSubTab: ReturnType<typeof useAppStore.getState>['setRecordsSubTab'];
  },
) {
  const url = new URL(targetUrl, window.location.origin);
  const tab = url.searchParams.get('tab');
  const section = url.searchParams.get('section');

  if (tab === 'home' || tab === 'schedule' || tab === 'records' || tab === 'locker_room' || tab === 'community') {
    actions.setActiveTab(tab);
    if (tab === 'records' && section === 'announcements') {
      actions.setRecordsSubTab('board');
    }
    return;
  }

  window.location.assign(url.href);
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
