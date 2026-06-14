'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { appConfig } from '@/config/app.config';
import {
  onForegroundMessage,
  requestFCMToken,
  requestNotificationPermission,
} from '@/lib/fcm';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';

const PUSH_PROMPT_DISMISSED_KEY = 'fcmoim.pushPrompt.dismissed';
const PUSH_TOKEN_REGISTERED_KEY = 'fcmoim.pushPrompt.registered';

export type PushPromptMode = 'enable' | 'install-ios';

export function usePushNotification() {
  const {
    activeClubId,
    isAuthenticated,
    userStatus,
    setUnreadNotificationCount,
    incrementUnreadNotificationCount,
  } = useAppStore();
  const authUser = useAuthStore((state) => state.authUser);
  const showToast = useToastStore((state) => state.showToast);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const support = useMemo(() => getPushSupport(), []);
  const canUsePush = Boolean(
    appConfig.vapidKey &&
      support.hasNotification &&
      support.hasServiceWorker &&
      support.hasPushManager &&
      isAuthenticated &&
      userStatus === 'approved' &&
      authUser,
  );
  const promptMode: PushPromptMode = support.isIOS && !support.isStandalone
    ? 'install-ios'
    : 'enable';
  const shouldShowPrompt =
    canUsePush &&
    !isDismissed &&
    !isRegistered &&
    permission === 'default';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setIsDismissed(window.localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY) === 'true');
    setIsRegistered(window.localStorage.getItem(PUSH_TOKEN_REGISTERED_KEY) === 'true');
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || userStatus !== 'approved' || !activeClubId) {
      setUnreadNotificationCount(0);
      return;
    }

    let cancelled = false;
    fetch(`/api/notifications?clubId=${encodeURIComponent(activeClubId)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Notification list request failed.');
        }
        return response.json() as Promise<{ notifications?: Array<{ isRead?: boolean }> }>;
      })
      .then((data) => {
        if (!cancelled) {
          setUnreadNotificationCount((data.notifications ?? []).filter((item) => !item.isRead).length);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('[FC Moim] Notification count sync failed:', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeClubId, isAuthenticated, setUnreadNotificationCount, userStatus]);

  useEffect(() => {
    if (!canUsePush || permission !== 'granted') {
      return;
    }

    return onForegroundMessage((payload) => {
      if (payload.body) {
        showToast(payload.body);
      }
      incrementUnreadNotificationCount();
    });
  }, [canUsePush, incrementUnreadNotificationCount, permission, showToast]);

  const dismissPrompt = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, 'true');
    }
    setIsDismissed(true);
  }, []);

  const enablePush = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const granted = await requestNotificationPermission();
      setPermission(typeof Notification === 'undefined' ? 'default' : Notification.permission);
      if (!granted) {
        dismissPrompt();
        return false;
      }

      const token = await requestFCMToken();
      if (!token) {
        return false;
      }

      const response = await fetch('/api/fcm-tokens', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          deviceInfo: {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('FCM token registration failed.');
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PUSH_TOKEN_REGISTERED_KEY, 'true');
        window.localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, 'true');
      }
      setIsRegistered(true);
      setIsDismissed(true);
      showToast('알림을 받을 준비가 끝났어요.');
      return true;
    } catch (error) {
      console.error('[FC Moim] Push registration failed:', error);
      showToast('알림 설정을 완료하지 못했어요.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [dismissPrompt, showToast]);

  return {
    canUsePush,
    shouldShowPrompt,
    promptMode,
    isSubmitting,
    enablePush,
    dismissPrompt,
  };
}

function getPushSupport() {
  if (typeof window === 'undefined') {
    return {
      hasNotification: false,
      hasServiceWorker: false,
      hasPushManager: false,
      isIOS: false,
      isStandalone: false,
    };
  }

  const userAgent = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (
    window.navigator.platform === 'MacIntel' &&
    window.navigator.maxTouchPoints > 1
  );
  const standaloneQuery = window.matchMedia?.('(display-mode: standalone)').matches === true;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return {
    hasNotification: 'Notification' in window,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    isIOS,
    isStandalone: standaloneQuery || navigatorWithStandalone.standalone === true,
  };
}
