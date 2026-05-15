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
  memo: string | null;
  createdByMembershipId: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
};

export type CancelMatchRequest = {
  clubId: string;
  matchId: string;
  cancellationReason: string;
};

export type MatchLineupEntry = {
  id: string;
  matchId: string;
  membershipId: string;
  teamNumber: 1 | 2;
  isLeader: boolean;
  position: 'FW' | 'MF' | 'DF';
  playerName: string;
  playerPosition: string | null;
  playerOvr: number;
  playerPhotoUrl: string | null;
};

export type SaveMatchLineupEntry = {
  membershipId: string;
  teamNumber: 1 | 2;
  isLeader: boolean;
  position: 'FW' | 'MF' | 'DF';
};

export type SaveMatchLineupRequest = {
  clubId: string;
  matchId: string;
  entries: SaveMatchLineupEntry[];
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
