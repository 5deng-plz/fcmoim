import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signInWithGoogle, signInWithKakao } from '../src/lib/auth';

const { mockSignInWithOAuth } = vi.hoisted(() => ({
  mockSignInWithOAuth: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  },
}));

describe('Supabase OAuth sign-in', () => {
  beforeEach(() => {
    mockSignInWithOAuth.mockReset();
    window.history.pushState({}, '', 'http://localhost:3000/login');
  });

  it('starts Google OAuth with the current app origin as redirect target', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ error: null });

    await signInWithGoogle();

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:3000/' },
    });
  });

  it('starts Kakao OAuth with the same redirect contract', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ error: null });

    await signInWithKakao();

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'kakao',
      options: { redirectTo: 'http://localhost:3000/' },
    });
  });

  it('throws provider errors back to the login surface', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ error: new Error('provider disabled') });

    await expect(signInWithGoogle()).rejects.toThrow('provider disabled');
  });
});
