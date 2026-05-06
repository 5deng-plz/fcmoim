// ========================================
// FC Moim — Supabase Auth 클라이언트 모듈
// 소셜 로그인 (Google + Kakao)
// ========================================

import type { Provider, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from './supabase';

async function signInWithProvider(provider: Provider) {
  const redirectTo =
    typeof window === 'undefined' ? undefined : `${window.location.origin}/`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });

  if (error) {
    throw error;
  }
}

export const signInWithGoogle = () => signInWithProvider('google');

export const signInWithKakao = () => signInWithProvider('kakao');

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session?.user ?? null;
}

export function onAuthChange(callback: (user: AuthUser | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}

export type { AuthUser };
