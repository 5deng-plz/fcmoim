'use client';

import { SchedulePollApiError } from './schedulePollClient';

export type FeedContentType = 'text' | 'image' | 'video';
export type FeedReactionType = 'up' | 'down' | 'check' | 'smile' | 'sad';

export type FeedPost = {
  id: string;
  clubId: string;
  membershipId: string;
  authorName: string;
  matchId: string | null;
  contentType: FeedContentType;
  textContent: string | null;
  mediaUrl: string | null;
  createdAt: string;
  updatedAt: string;
  reactionCounts: Record<FeedReactionType, number>;
  myReactions: FeedReactionType[];
  commentCount: number;
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export async function fetchFeedPosts(input: {
  clubId: string;
  contentType?: Extract<FeedContentType, 'image' | 'video'> | null;
}): Promise<FeedPost[]> {
  const params = new URLSearchParams({ clubId: input.clubId });
  if (input.contentType) params.set('contentType', input.contentType);
  const response = await fetch(`/api/feed-posts?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw await buildApiError(response, '피드를 불러오지 못했어요.');
  }

  const body = await response.json();
  return Array.isArray(body) ? body as FeedPost[] : [];
}

export async function createFeedPost(input: {
  clubId: string;
  contentType: FeedContentType;
  textContent?: string | null;
  mediaUrl?: string | null;
  matchId?: string | null;
}): Promise<FeedPost> {
  const response = await fetch('/api/feed-posts', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await buildApiError(response, '피드를 등록하지 못했어요.');
  }

  return response.json() as Promise<FeedPost>;
}

export async function deleteFeedPost(input: {
  clubId: string;
  postId: string;
}) {
  const params = new URLSearchParams({ clubId: input.clubId });
  const response = await fetch(`/api/feed-posts/${encodeURIComponent(input.postId)}?${params.toString()}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw await buildApiError(response, '피드를 삭제하지 못했어요.');
  }

  return response.json() as Promise<{ postId: string; deleted: true }>;
}

export async function toggleFeedReaction(input: {
  clubId: string;
  postId: string;
  reactionType: FeedReactionType;
}) {
  const response = await fetch(`/api/feed-posts/${encodeURIComponent(input.postId)}/react`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clubId: input.clubId,
      reactionType: input.reactionType,
    }),
  });

  if (!response.ok) {
    throw await buildApiError(response, '리액션을 저장하지 못했어요.');
  }

  return response.json() as Promise<{ postId: string; toggled: true }>;
}

async function buildApiError(response: Response, fallback: string) {
  let message = fallback;
  let code = `http_${response.status}`;

  try {
    const body = await response.json() as ApiErrorBody;
    message = body.error?.message || message;
    code = body.error?.code || code;
  } catch {
    // Keep the fallback.
  }

  return new SchedulePollApiError(message, { status: response.status, code });
}
