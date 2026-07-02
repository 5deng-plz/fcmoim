import { appConfig } from '../config/app.config';
import {
  COMMENT_CREATED_EVENT,
  commentRealtimeTopic,
  disabledCommentRealtimePublisher,
  type CommentRealtimePublisher,
} from '../services/comment-realtime';

const DEFAULT_TIMEOUT_MS = 1_500;

type SupabaseCommentRealtimePublisherOptions = {
  supabaseUrl: string;
  secretKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export function createCommentRealtimePublisher(): CommentRealtimePublisher {
  const provider = process.env.COMMENT_REALTIME_PROVIDER || 'supabase';
  if (provider === 'disabled') {
    return disabledCommentRealtimePublisher;
  }
  if (provider !== 'supabase') {
    return failingCommentRealtimePublisher(`Unsupported COMMENT_REALTIME_PROVIDER: ${provider}`);
  }

  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) {
    return failingCommentRealtimePublisher(
      'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required for comment realtime.',
    );
  }

  return createSupabaseCommentRealtimePublisher({
    supabaseUrl: appConfig.supabase.url,
    secretKey,
  });
}

export function createSupabaseCommentRealtimePublisher(
  options: SupabaseCommentRealtimePublisherOptions,
): CommentRealtimePublisher {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async publishCreated(comment) {
      const topic = commentRealtimeTopic(comment.targetId);
      const endpoint = new URL(
        `/realtime/v1/api/broadcast/${encodeURIComponent(topic)}/events/${encodeURIComponent(COMMENT_CREATED_EVENT)}`,
        ensureTrailingSlash(options.supabaseUrl),
      );
      endpoint.searchParams.set('private', 'true');

      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: createBroadcastHeaders(options.secretKey),
        body: JSON.stringify(comment),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const responseBody = (await response.text()).slice(0, 200);
        throw new Error(
          `Supabase comment broadcast failed with status ${response.status}${responseBody ? `: ${responseBody}` : ''}`,
        );
      }
    },
  };
}

function failingCommentRealtimePublisher(message: string): CommentRealtimePublisher {
  return {
    async publishCreated() {
      throw new Error(message);
    },
  };
}

function createBroadcastHeaders(secretKey: string) {
  const headers: Record<string, string> = {
    apikey: secretKey,
    'content-type': 'application/json',
  };
  if (secretKey.split('.').length === 3) {
    headers.authorization = `Bearer ${secretKey}`;
  }
  return headers;
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`;
}
