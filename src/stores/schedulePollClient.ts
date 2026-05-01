'use client';

import { appConfig } from '@/config/app.config';

export type SchedulePollStatus = 'open' | 'closed' | 'promoted' | 'cancelled';

export type SchedulePollOption = {
  id: string;
  pollId: string;
  optionDate: string;
  sortOrder: number;
  displayTime?: string;
  displayLocation?: string;
};

export type SchedulePollVote = {
  id: string;
  pollId: string;
  optionId: string;
  membershipId: string;
  isAvailable: boolean;
};

export type SchedulePoll = {
  id: string;
  clubId: string;
  seasonId: string | null;
  title: string;
  status: SchedulePollStatus;
  commonTime: string;
  location: string;
  memo: string | null;
  closesAt: string | null;
  createdByMembershipId: string;
  promotedMatchId: string | null;
  options: SchedulePollOption[];
  votes: SchedulePollVote[];
};

export type CreateSchedulePollRequest = {
  clubId: string;
  seasonId: string | null;
  title: string;
  commonTime: string;
  location: string;
  memo: string | null;
  closesAt: string | null;
  optionDates: string[];
};

export type VoteSchedulePollRequest = {
  clubId: string;
  pollId: string;
  selectedOptionIds: string[];
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class SchedulePollApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, options: { status: number; code: string }) {
    super(message);
    this.name = 'SchedulePollApiError';
    this.status = options.status;
    this.code = options.code;
  }
}

export async function fetchActiveSchedulePolls(
  clubId = appConfig.defaultClubId,
): Promise<SchedulePoll[]> {
  const response = await fetch(`/api/schedule-polls?clubId=${encodeURIComponent(clubId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw await buildApiError(response, '일정 투표를 불러오지 못했어요.');
  }

  return response.json() as Promise<SchedulePoll[]>;
}

export async function createSchedulePoll(
  input: CreateSchedulePollRequest,
): Promise<SchedulePoll> {
  const response = await fetch('/api/schedule-polls', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await buildApiError(response, '일정 투표를 생성하지 못했어요.');
  }

  return response.json() as Promise<SchedulePoll>;
}

export async function voteSchedulePoll(
  input: VoteSchedulePollRequest,
): Promise<SchedulePoll> {
  const response = await fetch('/api/schedule-polls/vote', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await buildApiError(response, '투표를 저장하지 못했어요.');
  }

  return response.json() as Promise<SchedulePoll>;
}

export function getSchedulePollErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
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
