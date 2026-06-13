import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

async function loadAppConfig(env: Record<string, string>) {
  vi.resetModules();

  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }

  return import('../src/config/app.config');
}

describe('v1.0 frontend runtime config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('keeps missing public infrastructure config empty instead of using sample values', async () => {
    const { appConfig } = await loadAppConfig({
      APP_PROFILE: 'local',
      NEXT_PUBLIC_FIREBASE_PUBLIC_CONFIG: '',
      NEXT_PUBLIC_FIREBASE_API_KEY: '',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: '',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '',
      NEXT_PUBLIC_FIREBASE_APP_ID: '',
      NEXT_PUBLIC_FIREBASE_VAPID_KEY: '',
      NEXT_PUBLIC_SUPABASE_PUBLIC_CONFIG: '',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
    });

    expect(appConfig.firebase).toEqual({
      apiKey: '',
      authDomain: '',
      projectId: '',
      messagingSenderId: '',
      appId: '',
    });
    expect(appConfig.supabase).toEqual({
      url: '',
      publishableKey: '',
    });
    expect(appConfig.vapidKey).toBe('');
    expect(appConfig).not.toHaveProperty('useMockData');
  });

  it('does not expose the removed Admin shortcut config in local development', async () => {
    const { appConfig } = await loadAppConfig({
      APP_PROFILE: 'local',
      NODE_ENV: 'development',
      NEXT_PUBLIC_ENABLE_ADMIN_TEST_BYPASS: '',
    });

    expect(appConfig).not.toHaveProperty('enableAdminTestBypass');
  });

  it('uses the public app profile in browser-safe runtime config', async () => {
    const { appConfig, activeProfile } = await loadAppConfig({
      APP_PROFILE: '',
      NEXT_PUBLIC_APP_PROFILE: 'prod',
      NEXT_PUBLIC_SUPABASE_PUBLIC_CONFIG: '{"url":"https://project.supabase.co","publishableKey":"publishable"}',
    });

    expect(activeProfile).toBe('prod');
    expect(appConfig.profile).toBe('prod');
  });
});

describe('global viewport shell UX contract', () => {
  const root = process.cwd();

  it('keeps viewport zoom control accessible and notch-aware', () => {
    const layoutSource = readFileSync(join(root, 'src/app/layout.tsx'), 'utf8');

    expect(layoutSource).toContain('maximumScale: 1');
    expect(layoutSource).toContain('viewportFit: "cover"');
    expect(layoutSource).toContain('width: "device-width"');
    expect(layoutSource).toContain('themeColor: "var(--brand-primary)"');
    expect(layoutSource).not.toContain('userScalable');
  });

  it('keeps the mobile shell touch and input zoom safeguards in global CSS', () => {
    const cssSource = readFileSync(join(root, 'src/app/globals.css'), 'utf8');

    expect(cssSource).toContain('--bottom-nav-height: 72px');
    expect(cssSource).toContain('--header-height: 56px');
    expect(cssSource).toContain('--glass-bg: rgba(255, 255, 255, 0.85)');
    expect(cssSource).toContain('--glass-bg: rgba(255, 255, 255, 0.12)');
    expect(cssSource).toContain('@supports ((backdrop-filter: blur(1px))');
    expect(cssSource).toContain('-webkit-text-size-adjust: 100%');
    expect(cssSource).toContain('touch-action: pan-y');
    expect(cssSource).toContain('font-size: 16px !important');
    expect(cssSource).toContain('.app-viewport::before');
    expect(cssSource).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
