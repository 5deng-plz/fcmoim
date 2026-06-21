'use client';

import { SchedulePollApiError } from './schedulePollClient';

export type EventCommentTargetType = 'match' | 'schedule_poll_option' | 'feed_post';

export type EventComment = {
  id: string;
  targetType: EventCommentTargetType;
  targetId: string;
  membershipId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export async function fetchEventComments(input: {
  clubId: string;
  targetType: EventCommentTargetType;
  targetId: string;
}): Promise<EventComment[]> {
  const params = new URLSearchParams({
    clubId: input.clubId,
    targetType: input.targetType,
    targetId: input.targetId,
  });
  const response = await fetch(`/api/comments?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw await buildApiError(response, '코멘트를 불러오지 못했어요.');
  }

  const comments = await response.json();
  return Array.isArray(comments) ? comments as EventComment[] : [];
}

export async function createEventComment(input: {
  clubId: string;
  targetType: EventCommentTargetType;
  targetId: string;
  content: string;
}): Promise<EventComment> {
  const response = await fetch('/api/comments', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await buildApiError(response, '코멘트를 등록하지 못했어요.');
  }

  return response.json() as Promise<EventComment>;
}

async function buildApiError(response: Response, fallback: string) {
  let message = fallback;
  let code = `http_${response.status}`;

  try {
    const body = await response.json() as ApiErrorBody;
    message = body.error?.message || message;
    code = body.error?.code || code;
  } catch {
    // Keep the domain-specific fallback when the server returns non-JSON.
  }

  return new SchedulePollApiError(message, { status: response.status, code });
}
