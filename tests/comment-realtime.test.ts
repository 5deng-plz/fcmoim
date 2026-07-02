import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EventCommentRow } from '../src/types/domain';

const comment: EventCommentRow = {
  id: 'comment-1',
  targetType: 'feed_post',
  targetId: 'post-1',
  membershipId: 'membership-1',
  authorName: '테스터',
  content: '실시간 코멘트',
  createdAt: '2026-07-02T13:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Supabase comment realtime publisher', () => {
  it('sends the persisted comment to the private REST broadcast endpoint', async () => {
    const fetchImpl = vi.fn(async (endpoint: URL | RequestInfo, init?: RequestInit) => {
      void endpoint;
      void init;
      return new Response(null, { status: 202 });
    });
    const { createSupabaseCommentRealtimePublisher } = await import('../src/lib/supabase-comment-realtime');
    const publisher = createSupabaseCommentRealtimePublisher({
      supabaseUrl: 'https://project.supabase.co',
      secretKey: 'server-secret',
      fetchImpl,
    });

    await publisher.publishCreated(comment);

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [endpoint, init] = fetchImpl.mock.calls[0]!;
    const url = new URL(String(endpoint));
    expect(url.pathname).toBe(
      '/realtime/v1/api/broadcast/comments%3Afeed_post%3Apost-1/events/comment.created.v1',
    );
    expect(url.searchParams.get('private')).toBe('true');
    expect(init).toEqual(expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(comment),
      headers: {
        apikey: 'server-secret',
        'content-type': 'application/json',
      },
      signal: expect.any(AbortSignal),
    }));
  });

  it('reports provider failures without exposing the server secret', async () => {
    const fetchImpl = vi.fn(async (endpoint: URL | RequestInfo, init?: RequestInit) => {
      void endpoint;
      void init;
      return new Response('provider unavailable', { status: 503 });
    });
    const { createSupabaseCommentRealtimePublisher } = await import('../src/lib/supabase-comment-realtime');
    const publisher = createSupabaseCommentRealtimePublisher({
      supabaseUrl: 'https://project.supabase.co',
      secretKey: 'do-not-log-this-secret',
      fetchImpl,
    });

    let error: Error | null = null;
    try {
      await publisher.publishCreated(comment);
    } catch (caught) {
      error = caught as Error;
    }

    expect(error).not.toBeNull();
    expect(error?.message).toContain('status 503');
    expect(error?.message).toContain('provider unavailable');
    expect(error?.message).not.toContain('do-not-log-this-secret');
  });

  it('aborts a stalled provider request at the configured timeout', async () => {
    const fetchImpl = vi.fn((_endpoint: URL | RequestInfo, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
      })
    ));
    const { createSupabaseCommentRealtimePublisher } = await import('../src/lib/supabase-comment-realtime');
    const publisher = createSupabaseCommentRealtimePublisher({
      supabaseUrl: 'https://project.supabase.co',
      secretKey: 'server-secret',
      fetchImpl,
      timeoutMs: 5,
    });

    await expect(publisher.publishCreated(comment)).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('defers unsupported provider errors until best-effort publication', async () => {
    vi.stubEnv('COMMENT_REALTIME_PROVIDER', 'unknown');
    const { createCommentRealtimePublisher } = await import('../src/lib/supabase-comment-realtime');

    const publisher = createCommentRealtimePublisher();

    await expect(publisher.publishCreated(comment)).rejects.toThrow(
      'Unsupported COMMENT_REALTIME_PROVIDER: unknown',
    );
  });
});
