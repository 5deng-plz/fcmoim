import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getRequiredServerAuthContext,
  isE2ETestAuthBypassEnabled,
} from '../src/lib/supabase-server';

function createSupabaseWithUser(result: unknown) {
  return {
    auth: {
      getUser: vi.fn(async () => result),
    },
  } as never;
}

describe('v1.0 server auth context', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses Supabase user data when a server session is valid', async () => {
    const auth = await getRequiredServerAuthContext(createSupabaseWithUser({
      data: {
        user: {
          id: 'real-auth-user',
          email: 'real@example.com',
        },
      },
      error: null,
    }));

    expect(auth).toEqual({
      user: {
        id: 'real-auth-user',
        email: 'real@example.com',
      },
    });
  });

  it('rejects missing Supabase user data when the E2E bypass is disabled', async () => {
    vi.stubEnv('ENABLE_E2E_TEST_AUTH_BYPASS', 'false');

    await expect(
      getRequiredServerAuthContext(createSupabaseWithUser({
        data: { user: null },
        error: null,
      })),
    ).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('rejects stale claim-only sessions that no longer resolve to an auth user', async () => {
    vi.stubEnv('ENABLE_E2E_TEST_AUTH_BYPASS', 'false');

    await expect(
      getRequiredServerAuthContext(createSupabaseWithUser({
        data: { user: null },
        error: new Error('User from sub claim does not exist.'),
      })),
    ).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('allows a deterministic local E2E auth user only behind the server bypass flag', async () => {
    vi.stubEnv('APP_PROFILE', 'local');
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ENABLE_E2E_TEST_AUTH_BYPASS', 'true');
    vi.stubEnv('E2E_TEST_AUTH_USER_ID', '00000000-0000-0000-0000-000000000012');
    vi.stubEnv('E2E_TEST_AUTH_EMAIL', 'e2e-operator@fcmoim.test');

    await expect(
      getRequiredServerAuthContext(createSupabaseWithUser({
        data: { user: null },
        error: null,
      })),
    ).resolves.toEqual({
      user: {
        id: '00000000-0000-0000-0000-000000000012',
        email: 'e2e-operator@fcmoim.test',
      },
    });
  });

  it('keeps the local development server bypass off unless explicitly enabled', async () => {
    vi.stubEnv('APP_PROFILE', 'local');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ENABLE_E2E_TEST_AUTH_BYPASS', '');

    await expect(
      getRequiredServerAuthContext(createSupabaseWithUser({
        data: { user: null },
        error: null,
      })),
    ).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it.each([
    ['production node env', { NODE_ENV: 'production', APP_PROFILE: 'local' }],
    ['prod app profile', { NODE_ENV: 'test', APP_PROFILE: 'prod' }],
  ])('does not allow the E2E bypass in %s', async (_label, env) => {
    vi.stubEnv('ENABLE_E2E_TEST_AUTH_BYPASS', 'true');
    vi.stubEnv('NODE_ENV', env.NODE_ENV);
    vi.stubEnv('APP_PROFILE', env.APP_PROFILE);

    await expect(
      getRequiredServerAuthContext(createSupabaseWithUser({
        data: { user: null },
        error: null,
      })),
    ).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('exposes the same safety gate for E2E privileged server clients', () => {
    vi.stubEnv('ENABLE_E2E_TEST_AUTH_BYPASS', '');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('APP_PROFILE', 'local');
    expect(isE2ETestAuthBypassEnabled()).toBe(false);

    vi.stubEnv('ENABLE_E2E_TEST_AUTH_BYPASS', 'false');
    expect(isE2ETestAuthBypassEnabled()).toBe(false);

    vi.stubEnv('ENABLE_E2E_TEST_AUTH_BYPASS', 'true');
    vi.stubEnv('NODE_ENV', 'test');
    expect(isE2ETestAuthBypassEnabled()).toBe(true);

    vi.stubEnv('NODE_ENV', 'production');
    expect(isE2ETestAuthBypassEnabled()).toBe(false);
  });
});
