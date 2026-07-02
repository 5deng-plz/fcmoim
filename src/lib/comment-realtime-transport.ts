import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { EventCommentRow } from '../types/domain';

export const COMMENT_CREATED_EVENT = 'comment.created.v1';

export type CommentRealtimeSubscription = {
  unsubscribe: () => Promise<void>;
};

type SubscribeToCommentCreatedOptions = {
  client: SupabaseClient;
  accessToken: string;
  postId: string;
  onComment: (comment: EventCommentRow) => void;
  onSubscribed: () => void;
  onError: (error: Error) => void;
};

export async function subscribeToCommentCreated(
  options: SubscribeToCommentCreatedOptions,
): Promise<CommentRealtimeSubscription> {
  if (!options.accessToken) {
    throw new Error('Authenticated session is required for private comment realtime.');
  }

  await options.client.realtime.setAuth(options.accessToken);

  let active = true;
  const channel = options.client
    .channel(`comments:feed_post:${options.postId}`, {
      config: { private: true },
    })
    .on('broadcast', { event: COMMENT_CREATED_EVENT }, (message) => {
      if (!active) return;
      const comment = parseCommentCreatedPayload(message.payload, options.postId);
      if (comment) options.onComment(comment);
    })
    .subscribe((status, error) => {
      if (!active) return;
      if (status === 'SUBSCRIBED') {
        options.onSubscribed();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        options.onError(error ?? new Error(`Comment realtime subscription failed: ${status}`));
      }
    });

  return {
    unsubscribe: async () => {
      if (!active) return;
      active = false;
      await removeChannel(options.client, channel);
    },
  };
}

function parseCommentCreatedPayload(
  payload: unknown,
  expectedPostId: string,
): EventCommentRow | null {
  if (!payload || typeof payload !== 'object') return null;

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== 'string' ||
    value.targetType !== 'feed_post' ||
    value.targetId !== expectedPostId ||
    typeof value.membershipId !== 'string' ||
    typeof value.authorName !== 'string' ||
    typeof value.content !== 'string' ||
    typeof value.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    targetType: 'feed_post',
    targetId: value.targetId,
    membershipId: value.membershipId,
    authorName: value.authorName,
    content: value.content,
    createdAt: value.createdAt,
  };
}

async function removeChannel(client: SupabaseClient, channel: RealtimeChannel) {
  await client.removeChannel(channel);
}
