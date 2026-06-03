export type AppProfile = 'local' | 'prod';

function resolveProfile(value: string | undefined): AppProfile {
  return value === 'prod' ? 'prod' : 'local';
}

export const activeProfile: AppProfile = resolveProfile(
  process.env.NEXT_PUBLIC_APP_PROFILE || process.env.APP_PROFILE,
);

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
}

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export interface AppConfig {
  profile: AppProfile;
  firebase: FirebaseConfig;
  supabase: SupabaseConfig;
  vapidKey: string;
  defaultClubId: string;
  settlementUrl: string;
  settlementAccountLabel: string;
}

function parseJsonConfig<T extends object>(value: string | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value) as Partial<T>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

const firebasePublicConfig = parseJsonConfig<FirebaseConfig & { vapidKey?: string }>(
  process.env.NEXT_PUBLIC_FIREBASE_PUBLIC_CONFIG,
  {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
  },
);

const supabasePublicConfig = parseJsonConfig<SupabaseConfig>(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_CONFIG,
  {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  },
);

assertSupabaseProfileBoundary(activeProfile, supabasePublicConfig.url);

const defaultClubId =
  process.env.NEXT_PUBLIC_DEFAULT_CLUB_ID ||
  '00000000-0000-0000-0000-000000000001';
const settlementUrl = process.env.NEXT_PUBLIC_SETTLEMENT_URL || '';
const settlementAccountLabel = process.env.NEXT_PUBLIC_SETTLEMENT_ACCOUNT || '총무에게 계좌 확인';

const localConfig: AppConfig = {
  profile: 'local',
  firebase: {
    apiKey: firebasePublicConfig.apiKey,
    authDomain: firebasePublicConfig.authDomain,
    projectId: firebasePublicConfig.projectId,
    messagingSenderId: firebasePublicConfig.messagingSenderId,
    appId: firebasePublicConfig.appId,
  },
  supabase: supabasePublicConfig,
  vapidKey: firebasePublicConfig.vapidKey || '',
  defaultClubId,
  settlementUrl,
  settlementAccountLabel,
};

const prodConfig: AppConfig = {
  profile: 'prod',
  firebase: {
    apiKey: firebasePublicConfig.apiKey,
    authDomain: firebasePublicConfig.authDomain,
    projectId: firebasePublicConfig.projectId,
    messagingSenderId: firebasePublicConfig.messagingSenderId,
    appId: firebasePublicConfig.appId,
  },
  supabase: supabasePublicConfig,
  vapidKey: firebasePublicConfig.vapidKey || '',
  defaultClubId,
  settlementUrl,
  settlementAccountLabel,
};

const profiles: Record<AppProfile, AppConfig> = {
  local: localConfig,
  prod: prodConfig,
};

export const appConfig = profiles[activeProfile] as AppConfig & Record<string, unknown>;

function assertSupabaseProfileBoundary(profile: AppProfile, supabaseUrl: string) {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true' || !supabaseUrl) {
    return;
  }

  const isLocalSupabase =
    supabaseUrl.startsWith('http://127.0.0.1:') ||
    supabaseUrl.startsWith('http://localhost:') ||
    supabaseUrl.startsWith('https://127.0.0.1:') ||
    supabaseUrl.startsWith('https://localhost:');

  if (profile === 'local' && !isLocalSupabase) {
    throw new Error(
      '[FC Moim] APP_PROFILE=local requires a local Supabase URL. ' +
      'Run `npm run dev` after `npm run db:local:start`, or set NEXT_PUBLIC_SUPABASE_URL to http://127.0.0.1:54321.',
    );
  }

  if (profile === 'prod' && isLocalSupabase) {
    throw new Error(
      '[FC Moim] APP_PROFILE=prod cannot use a localhost Supabase URL. ' +
      'Set production Supabase environment variables before starting the app.',
    );
  }
}
