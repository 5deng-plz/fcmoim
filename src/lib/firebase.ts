// ========================================
// FC Moim — Firebase 초기화
// FCM / App Hosting 보조 기능용
// ========================================

import { getApp, getApps, initializeApp } from 'firebase/app';
import { appConfig } from '@/config/app.config';

const app = !getApps().length ? initializeApp(appConfig.firebase) : getApp();

export { app };