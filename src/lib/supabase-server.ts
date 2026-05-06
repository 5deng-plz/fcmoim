import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from '../config/app.config';
import { AppError } from '../types/api';
import type { AuthContext } from '../types/domain';

const E2E_DEFAULT_AUTH_USER_ID = '00000000-0000-0000-0000-000000000011';
const E2E_DEFAULT_AUTH_EMAIL = 'e2e-admin@fcmoim.test';

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  if (isE2ETestAuthBypassEnabled()) {
    return createPrivilegedSupabaseClient();
  }

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
    const e2eAuth = getE2ETestAuthContext();
    if (e2eAuth) {
      return e2eAuth;
    }

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

export function isE2ETestAuthBypassEnabled() {
  const explicitFlag = process.env.ENABLE_E2E_TEST_AUTH_BYPASS;

  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.APP_PROFILE !== 'prod' &&
    explicitFlag !== 'false' &&
    (process.env.NODE_ENV === 'development' || explicitFlag === 'true')
  );
}

function getE2ETestAuthContext(): AuthContext | null {
  if (!isE2ETestAuthBypassEnabled()) {
    return null;
  }

  return {
    user: {
      id: process.env.E2E_TEST_AUTH_USER_ID || E2E_DEFAULT_AUTH_USER_ID,
      email: process.env.E2E_TEST_AUTH_EMAIL || E2E_DEFAULT_AUTH_EMAIL,
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
