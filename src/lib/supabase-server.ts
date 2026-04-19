import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from '@/config/app.config';

export function createPrivilegedSupabaseClient(): SupabaseClient {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      '[FC Moim] SUPABASE_SECRET_KEY 환경변수가 설정되지 않았습니다. ' +
      '.env.local 파일을 확인하세요.',
    );
  }
  return createClient(appConfig.supabase.url, secretKey);
}
