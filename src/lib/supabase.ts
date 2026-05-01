// ========================================
// FC Moim — Supabase 클라이언트
// Auth / RLS / 서버 작업 공용 진입점
// ========================================
//
// 사용법:
//   1. .env.local 또는 App Hosting Secret에 Supabase public config 설정
//   2. 브라우저에서는 export된 supabase 싱글턴 사용
//

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from '../config/app.config';

// ─── Public (Anonymous) 클라이언트 ───
// 브라우저 세션과 함께 사용하는 기본 클라이언트
export const supabase: SupabaseClient = createBrowserClient(
  appConfig.supabase.url,
  appConfig.supabase.publishableKey,
);
