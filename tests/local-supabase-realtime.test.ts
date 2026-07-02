// @vitest-environment node

import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  subscribeToCommentCreated,
  type CommentRealtimeSubscription,
} from '../src/lib/comment-realtime-transport';

const teamId = '00000000-0000-0000-0000-000000000001';
const describeLocal =
  process.env.FC_RUN_LOCAL_SUPABASE_API_TESTS === 'true' ? describe : describe.skip;
let authorization = '';

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
  headers: vi.fn(async () => new Headers(authorization ? { authorization } : {})),
}));

describeLocal('local Supabase comment realtime integration', () => {
  it('authorizes approved subscribers and broadcasts an API-persisted comment', async () => {
    const sender = await createAuthenticatedClient('qa-member1@fcmoim.test');
    const receiver = await createAuthenticatedClient('qa-member2@fcmoim.test');
    const nonMember = await createAuthenticatedClient('qa-new@fcmoim.test');
    const admin = createAdminClient();
    const feedRoute = await import('../src/app/api/feed-posts/route');
    const commentsRoute = await import('../src/app/api/comments/route');
    let approvedSubscription: CommentRealtimeSubscription | null = null;
    let nonMemberChannel: RealtimeChannel | null = null;
    let postId = '';

    try {
      authorization = `Bearer ${sender.accessToken}`;
      const createPostResponse = await feedRoute.POST(new Request('http://localhost/api/feed-posts', {
        method: 'POST',
        body: JSON.stringify({
          clubId: teamId,
          contentType: 'text',
          textContent: 'local realtime comment smoke',
        }),
      }));
      const post = await createPostResponse.json();
      expect(createPostResponse.status, JSON.stringify(post)).toBe(201);
      postId = post.id;

      let resolveComment!: (comment: Record<string, unknown>) => void;
      let rejectComment!: (error: Error) => void;
      const receivedComment = new Promise<Record<string, unknown>>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Timed out waiting for comment.created.v1')),
          8_000,
        );
        resolveComment = (comment) => {
          clearTimeout(timeout);
          resolve(comment);
        };
        rejectComment = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });
      let resolveSubscribed!: () => void;
      const subscribed = new Promise<void>((resolve) => {
        resolveSubscribed = resolve;
      });
      approvedSubscription = await subscribeToCommentCreated({
        client: receiver.client,
        accessToken: receiver.accessToken,
        postId: post.id,
        onComment: resolveComment,
        onSubscribed: resolveSubscribed,
        onError: rejectComment,
      });
      await subscribed;

      const topic = `comments:feed_post:${post.id}`;
      nonMemberChannel = nonMember.client.channel(topic, { config: { private: true } });
      expect(await waitForChannelStatus(nonMemberChannel, ['CHANNEL_ERROR', 'TIMED_OUT'])).toBe('CHANNEL_ERROR');

      const createCommentResponse = await commentsRoute.POST(new Request('http://localhost/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          clubId: teamId,
          targetType: 'feed_post',
          targetId: post.id,
          content: 'private broadcast smoke',
        }),
      }));
      const createdComment = await createCommentResponse.json();

      expect(createCommentResponse.status, JSON.stringify(createdComment)).toBe(201);
      await expect(receivedComment).resolves.toEqual(expect.objectContaining({
        id: createdComment.id,
        targetType: 'feed_post',
        targetId: post.id,
        content: 'private broadcast smoke',
      }));
    } finally {
      if (approvedSubscription) await approvedSubscription.unsubscribe();
      if (nonMemberChannel) await nonMember.client.removeChannel(nonMemberChannel);
      await Promise.all([
        sender.client.auth.signOut(),
        receiver.client.auth.signOut(),
        nonMember.client.auth.signOut(),
      ]);
      if (postId) {
        await admin.from('feed_posts').delete().eq('id', postId);
      }
    }
  }, 15_000);
});

async function createAuthenticatedClient(email: string) {
  const { supabaseUrl, publishableKey, password } = getLocalConfig();
  const client = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `realtime-${email}`,
    },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`Failed to sign in ${email}: ${error?.message ?? 'missing access token'}`);
  }

  await client.realtime.setAuth(data.session.access_token);
  return { client, accessToken: data.session.access_token };
}

function createAdminClient() {
  const { supabaseUrl } = getLocalConfig();
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error('Local Supabase service role key is required.');

  return createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function waitForChannelStatus(
  channel: RealtimeChannel,
  acceptedStatuses: string[],
  timeoutMs = 8_000,
) {
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for realtime status: ${acceptedStatuses.join(', ')}`));
    }, timeoutMs);

    channel.subscribe((status) => {
      if (acceptedStatuses.includes(status)) {
        clearTimeout(timeout);
        resolve(status);
      }
    });
  });
}

function getLocalConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const password = process.env.QA_LOCAL_ACCOUNT_PASSWORD;
  if (!supabaseUrl || !publishableKey || !password) {
    throw new Error('Local Supabase realtime tests require local Supabase env vars.');
  }
  return { supabaseUrl, publishableKey, password };
}
