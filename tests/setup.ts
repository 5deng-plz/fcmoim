import '@testing-library/jest-dom/vitest';

process.env.APP_PROFILE ??= 'local';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test-project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'test-publishable-key';
process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??= 'test-firebase-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??= 'test.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= 'test-project';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??= '100000000000';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??= '1:100000000000:web:test';
process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ??= 'test-vapid-key';
process.env.NEXT_PUBLIC_DEFAULT_CLUB_ID ??= 'club-test';
