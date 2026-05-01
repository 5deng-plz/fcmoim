import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from '../config/app.config';
import { AppError } from '../types/api';
import type { AuthContext } from '../types/domain';

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(appConfig.supabase.url, appConfig.supabase.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies; Route Handlers can.
        }
      },
    },
  });
}

export async function getRequiredServerAuthContext(
  supabase: SupabaseClient,
): Promise<AuthContext> {
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    throw new AppError('unauthorized', 'Authentication is required.', {
      cause: error,
      status: 401,
    });
  }

  return {
    user: {
      id: data.claims.sub,
      email: typeof data.claims.email === 'string' ? data.claims.email : null,
    },
  };
}

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
