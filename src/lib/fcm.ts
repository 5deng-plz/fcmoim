// ========================================
// FC Moim — FCM 클라이언트 모듈
// Profile에 따라 mock 또는 실제 FCM 자동 분기
// ========================================

import { appConfig } from '@/config/app.config';

// ─── 알림 메시지 템플릿 ───
export const NOTIFICATION_TEMPLATES = {
  MATCH_CREATED: '새로운 일정이 등록됐어요! 참석 여부를 알려주세요 😄',
  ATTENDANCE_REMIND: '아직 투표 안 하셨어요~ 한 번만 확인해주세요! ⚽',
  MATCH_DAY: '오늘 풋살 데이입니다! 화이팅 🔥',
  TACTICS_DONE: '라커룸 팀 편성이 완료되었습니다! 내 팀을 확인하세요 🏃‍♂️',
  STAT_UPDATE: '경기 스탯이 업데이트되었어요! 내 능력치를 확인해보세요 📊',
  SETTLEMENT_REQUEST: '구장비 정산 부탁드려요~ 💰',
  SETTLEMENT_REMIND: '아직 정산이 안 됐어요~ 확인 부탁드립니다! 🙏',
} as const;

export type NotificationType = keyof typeof NOTIFICATION_TEMPLATES;

// ─── FCM 토큰 요청 ───
export async function requestFCMToken(): Promise<string | null> {
  if (appConfig.useMockData) {
    console.log(`[${appConfig.profile}] FCM 토큰 요청 (mock)`);
    return 'mock-fcm-token';
  }

  try {
    // TODO: Firebase Console > Cloud Messaging에서 Web Push VAPID key를 발급하고
    // App Hosting 환경 변수/Secret Manager 등록 후 실제 FCM 토큰 발급을 활성화한다.
    if (!appConfig.vapidKey) {
      console.warn('FCM VAPID key가 없어 토큰 요청을 건너뜁니다.');
      return null;
    }

    const { getMessaging, getToken } = await import('firebase/messaging');
    const { app } = await import('./firebase');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: appConfig.vapidKey,
    });
    return token;
  } catch (error) {
    console.error('FCM 토큰 요청 실패:', error);
    return null;
  }
}

// ─── FCM 포그라운드 메시지 리스너 ───
export function onForegroundMessage(callback: (payload: { title: string; body: string }) => void): void {
  if (appConfig.useMockData) {
    console.log(`[${appConfig.profile}] FCM 포그라운드 리스너 등록 (mock)`);
    return;
  }

  import('firebase/messaging').then(({ getMessaging, onMessage }) => {
    import('./firebase').then(({ app }) => {
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        callback({
          title: payload.notification?.title || '',
          body: payload.notification?.body || '',
        });
      });
    });
  });
}

// ─── 알림 권한 요청 ───
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}
