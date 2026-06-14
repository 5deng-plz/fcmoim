import { appConfig } from '@/config/app.config';

const firebaseConfig = appConfig.firebase;

export const dynamic = 'force-dynamic';

export function GET(): Response {
  const body = `
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(firebaseConfig)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'FC moim';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/brand/fcmoimLogo.svg',
    badge: '/brand/fcmoimLogo.svg',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.targetUrl || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const absoluteTargetUrl = new URL(targetUrl, self.location.origin).href;
      if (clientList.length > 0) {
        const matchingClient = clientList.find((client) => client.url === absoluteTargetUrl);
        if (matchingClient) {
          return matchingClient.focus();
        }
        return clientList[0].navigate(absoluteTargetUrl).then((client) => client?.focus());
      }
      return clients.openWindow(absoluteTargetUrl);
    }),
  );
});
`.trimStart();

  return new Response(body, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
    },
  });
}
