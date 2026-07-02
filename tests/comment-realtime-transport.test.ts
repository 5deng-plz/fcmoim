import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  COMMENT_CREATED_EVENT,
  subscribeToCommentCreated,
} from '../src/lib/comment-realtime-transport';

function createFixture() {
  let broadcastHandler: ((message: { payload: unknown }) => void) | undefined;
  let statusHandler: ((status: string, error?: Error) => void) | undefined;
  const channel = {
    on: vi.fn((_type, _filter, handler) => {
      broadcastHandler = handler;
      return channel;
    }),
    subscribe: vi.fn((handler) => {
      statusHandler = handler;
      return channel;
    }),
  } as unknown as RealtimeChannel;
  const setAuth = vi.fn(async () => {});
  const removeChannel = vi.fn(async () => 'ok' as const);
  const client = {
    realtime: { setAuth },
    channel: vi.fn(() => channel),
    removeChannel,
  } as unknown as SupabaseClient;

  return {
    client,
    channel,
    setAuth,
    removeChannel,
    emitBroadcast: (payload: unknown) => broadcastHandler?.({ payload }),
    emitStatus: (status: string, error?: Error) => statusHandler?.(status, error),
  };
}

describe('comment realtime transport', () => {
  it('authenticates before creating a private channel and forwards valid comments', async () => {
    const fixture = createFixture();
    const onComment = vi.fn();
    const onSubscribed = vi.fn();
    const onError = vi.fn();

    const subscription = await subscribeToCommentCreated({
      client: fixture.client,
      accessToken: 'access-token',
      postId: 'post-1',
      onComment,
      onSubscribed,
      onError,
    });

    expect(fixture.setAuth).toHaveBeenCalledWith('access-token');
    expect(fixture.client.channel).toHaveBeenCalledWith('comments:feed_post:post-1', {
      config: { private: true },
    });
    expect(fixture.setAuth.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(fixture.client.channel).mock.invocationCallOrder[0]!,
    );
    expect(fixture.channel.on).toHaveBeenCalledWith(
      'broadcast',
      { event: COMMENT_CREATED_EVENT },
      expect.any(Function),
    );

    fixture.emitStatus('SUBSCRIBED');
    fixture.emitBroadcast({
      id: 'comment-1',
      targetType: 'feed_post',
      targetId: 'post-1',
      membershipId: 'member-1',
      authorName: '형님',
      content: '안녕하세요',
      createdAt: '2026-07-03T00:00:00.000Z',
    });

    expect(onSubscribed).toHaveBeenCalledOnce();
    expect(onComment).toHaveBeenCalledWith(expect.objectContaining({ id: 'comment-1' }));
    expect(onError).not.toHaveBeenCalled();

    await subscription.unsubscribe();
    expect(fixture.removeChannel).toHaveBeenCalledWith(fixture.channel);
    fixture.emitBroadcast({
      id: 'comment-after-close',
      targetType: 'feed_post',
      targetId: 'post-1',
      membershipId: 'member-1',
      authorName: '형님',
      content: '닫힌 구독',
      createdAt: '2026-07-03T00:00:00.000Z',
    });
    expect(onComment).toHaveBeenCalledOnce();
  });

  it('drops malformed or cross-topic payloads', async () => {
    const fixture = createFixture();
    const onComment = vi.fn();

    await subscribeToCommentCreated({
      client: fixture.client,
      accessToken: 'access-token',
      postId: 'post-1',
      onComment,
      onSubscribed: vi.fn(),
      onError: vi.fn(),
    });

    fixture.emitBroadcast({ id: 'missing-fields' });
    fixture.emitBroadcast({
      id: 'comment-2',
      targetType: 'feed_post',
      targetId: 'post-2',
      membershipId: 'member-1',
      authorName: '형님',
      content: '다른 topic',
      createdAt: '2026-07-03T00:00:00.000Z',
    });

    expect(onComment).not.toHaveBeenCalled();
  });

  it('reports channel failures and requires an authenticated session', async () => {
    const fixture = createFixture();
    const onError = vi.fn();

    await expect(subscribeToCommentCreated({
      client: fixture.client,
      accessToken: '',
      postId: 'post-1',
      onComment: vi.fn(),
      onSubscribed: vi.fn(),
      onError,
    })).rejects.toThrow('Authenticated session is required');

    await subscribeToCommentCreated({
      client: fixture.client,
      accessToken: 'access-token',
      postId: 'post-1',
      onComment: vi.fn(),
      onSubscribed: vi.fn(),
      onError,
    });
    fixture.emitStatus('CHANNEL_ERROR', new Error('unauthorized'));

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'unauthorized' }));
  });
});
