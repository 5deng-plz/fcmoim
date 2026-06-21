'use client';

import { appConfig } from '@/config/app.config';
import type { EventType } from '@/types';
import { SchedulePollApiError } from './schedulePollClient';

export type MatchStatus = 'scheduled' | 'locker_room' | 'finished' | 'cancelled';

export type UpcomingMatch = {
  id: string;
  clubId: string;
  seasonId: string;
  round: number | null;
  title: string;
  date: string;
  location: string;
  type: EventType;
  status: MatchStatus;
  ourScore: number | null;
  oppScore: number | null;
  tacticsCompleted: boolean;
  redLeaderConfirmed?: boolean;
  blueLeaderConfirmed?: boolean;
  memo: string | null;
  createdByMembershipId: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  feedbackDeadline?: string | null;
  updatedAt?: string | null;
};

export type CancelMatchRequest = {
  clubId: string;
  matchId: string;
  cancellationReason: string;
};

export type CreateMatchRequest = {
  clubId: string;
  type: Exclude<EventType, 'vote_match'>;
  title?: string | null;
  date: string;
  time: string;
  location: string;
  memo?: string | null;
};

export type MatchAttendee = {
  matchId: string;
  membershipId: string;
  status: 'attend';
  playerName: string;
  playerOvr: number;
  playerPhotoUrl: string | null;
  matchPoints: number;
};

export type MatchLineupEntry = {
  id: string;
  matchId: string;
  membershipId: string;
  teamNumber: 1 | 2;
  isLeader: boolean;
  position: 'FW' | 'MF' | 'DF';
  formationSlot: number | null;
  playerName: string;
  playerPosition: string | null;
  playerOvr: number;
  playerPhotoUrl: string | null;
  playerMatchPoints: number;
};

export type SaveMatchLineupEntry = {
  membershipId: string;
  teamNumber: 1 | 2;
  isLeader: boolean;
  position: 'FW' | 'MF' | 'DF';
  formationSlot?: number | null;
};

export type SaveMatchLineupRequest = {
  clubId: string;
  matchId: string;
  entries: SaveMatchLineupEntry[];
};

export type SaveMatchResultRequest = {
  clubId: string;
  matchId: string;
  score: {
    home: number;
    away: number;
  };
  playerStats: Array<{
    membershipId: string;
    goals: number;
    assists: number;
  }>;
};

export type MatchFeedbackParticipant = {
  membershipId: string;
  playerName: string;
  playerPhotoUrl: string | null;
  playerOvr: number;
};

export type MatchFeedbackResponse = {
  matchId: string;
  status: 'not_open' | 'open' | 'closed';
  feedbackDeadline: string | null;
  participants: MatchFeedbackParticipant[];
  myVote: string | null;
  myRatedMembershipIds: string[];
  voteCount: number;
  ratingCount: number;
  results: null | {
    mvpMembershipId: string | null;
    ratingAverages: Array<{
      membershipId: string;
      averageRating: number;
      ratingCount: number;
      topBadges: string[];
    }>;
  };
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export async function fetchUpcomingMatches(
  clubId = appConfig.defaultClubId,
): Promise<UpcomingMatch[]> {
  const response = await fetch(`/api/matches?clubId=${encodeURIComponent(clubId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw await buildApiError(response, '확정 일정을 불러오지 못했어요.');
  }

  return response.json() as Promise<UpcomingMatch[]>;
}

export async function fetchCalendarMatches(input: {
  clubId?: string;
  from: string;
  to: string;
}): Promise<UpcomingMatch[]> {
  const params = new URLSearchParams({
    clubId: input.clubId ?? appConfig.defaultClubId,
    from: input.from,
    to: input.to,
  });
  const response = await fetch(`/api/matches?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw await buildApiError(response, '월간 일정을 불러오지 못했어요.');
  }

  return response.json() as Promise<UpcomingMatch[]>;
}

export async function createMatch(input: CreateMatchRequest): Promise<UpcomingMatch> {
  const response = await fetch('/api/matches', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await buildApiError(response, '일정을 생성하지 못했어요.');
  }

  return response.json() as Promise<UpcomingMatch>;
}

export async function cancelMatch(input: CancelMatchRequest): Promise<UpcomingMatch> {
  const response = await fetch('/api/matches/cancel', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await buildApiError(response, '확정 일정을 취소하지 못했어요.');
  }

  return response.json() as Promise<UpcomingMatch>;
}

export async function fetchMatchLineup(input: {
  clubId: string;
  matchId: string;
}): Promise<MatchLineupEntry[]> {
  const params = new URLSearchParams({
    clubId: input.clubId,
    matchId: input.matchId,
  });
  const response = await fetch(`/api/matches/lineup?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw await buildApiError(response, '라인업을 불러오지 못했어요.');
  }

  return response.json() as Promise<MatchLineupEntry[]>;
}

export async function fetchMatchAttendees(input: {
  clubId: string;
  matchId: string;
}): Promise<MatchAttendee[]> {
  const params = new URLSearchParams({
    clubId: input.clubId,
    matchId: input.matchId,
  });
  const response = await fetch(`/api/matches/attendees?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw await buildApiError(response, '참석자 명단을 불러오지 못했어요.');
  }

  return response.json() as Promise<MatchAttendee[]>;
}

export async function addMatchAttendee(input: {
  clubId: string;
  matchId: string;
  membershipId?: string;
  membershipIds?: string[];
}): Promise<MatchAttendee[]> {
  const response = await fetch('/api/matches/attendees', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await buildApiError(response, '참석자를 추가하지 못했어요.');
  }

  return response.json() as Promise<MatchAttendee[]>;
}

export async function fetchMatchFeedback(input: {
  clubId: string;
  matchId: string;
}): Promise<MatchFeedbackResponse> {
  const params = new URLSearchParams({ clubId: input.clubId });
  const response = await fetch(`/api/matches/${encodeURIComponent(input.matchId)}/feedback?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw await buildApiError(response, '매치 피드백을 불러오지 못했어요.');
  }

  const body = await response.json() as Partial<MatchFeedbackResponse>;
  return {
    matchId: body.matchId ?? input.matchId,
    status: body.status ?? 'not_open',
    feedbackDeadline: body.feedbackDeadline ?? null,
    participants: Array.isArray(body.participants) ? body.participants : [],
    myVote: body.myVote ?? null,
    myRatedMembershipIds: Array.isArray(body.myRatedMembershipIds) ? body.myRatedMembershipIds : [],
    voteCount: typeof body.voteCount === 'number' ? body.voteCount : 0,
    ratingCount: typeof body.ratingCount === 'number' ? body.ratingCount : 0,
    results: body.results ?? null,
  };
}

export async function voteMatchMvp(input: {
  clubId: string;
  matchId: string;
  candidateMembershipId: string;
}) {
  const response = await fetch(`/api/matches/${encodeURIComponent(input.matchId)}/vote-mvp`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clubId: input.clubId,
      candidateMembershipId: input.candidateMembershipId,
    }),
  });

  if (!response.ok) {
    throw await buildApiError(response, 'MVP 투표를 저장하지 못했어요.');
  }

  return response.json() as Promise<{ matchId: string; candidateMembershipId: string; saved: true }>;
}

export async function submitMatchPeerRatings(input: {
  clubId: string;
  matchId: string;
  ratings: Array<{
    rateeMembershipId: string;
    rating: number;
    badges: string[];
  }>;
}) {
  const response = await fetch(`/api/matches/${encodeURIComponent(input.matchId)}/peer-ratings`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clubId: input.clubId,
      ratings: input.ratings,
    }),
  });

  if (!response.ok) {
    throw await buildApiError(response, '동료 평점을 저장하지 못했어요.');
  }

  return response.json() as Promise<{ matchId: string; ratingCount: number; saved: true }>;
}

export async function pickMatchLineupPlayer(input: {
  clubId: string;
  matchId: string;
  membershipId: string;
}): Promise<MatchLineupEntry[]> {
  const response = await fetch('/api/matches/lineup/pick', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await buildApiError(response, '선수를 배치하지 못했어요.');
  }

  return response.json() as Promise<MatchLineupEntry[]>;
}

export async function saveMatchLineup(input: SaveMatchLineupRequest): Promise<MatchLineupEntry[]> {
  const response = await fetch('/api/matches/lineup', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await buildApiError(response, '라인업을 저장하지 못했어요.');
  }

  return response.json() as Promise<MatchLineupEntry[]>;
}

export async function confirmMatchLineup(input: {
  clubId: string;
  matchId: string;
  teamNumber: 1 | 2;
  confirmed?: boolean;
}): Promise<UpcomingMatch> {
  const response = await fetch('/api/matches/lineup/confirm', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await buildApiError(response, '전술을 승인하지 못했어요.');
  }

  return response.json() as Promise<UpcomingMatch>;
}

export async function publishMatchLineup(input: {
  clubId: string;
  matchId: string;
}): Promise<UpcomingMatch> {
  const response = await fetch('/api/matches/lineup/publish', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await buildApiError(response, '전술을 공개하지 못했어요.');
  }

  return response.json() as Promise<UpcomingMatch>;
}

export async function saveMatchResult(input: SaveMatchResultRequest): Promise<{ matchId: string; saved: true }> {
  const response = await fetch('/api/match-results', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await buildApiError(response, '경기 결과를 저장하지 못했어요.');
  }

  return response.json() as Promise<{ matchId: string; saved: true }>;
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
