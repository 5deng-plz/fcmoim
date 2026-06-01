'use client';

import { appConfig } from '@/config/app.config';

export type RecordsRankingRow = {
  membershipId: string;
  nickname: string;
  photoUrl: string | null;
  ovr: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  leaguePoints: number;
  goals: number;
  assists: number;
  momCount: number;
  appearances: number;
};

export type RecordsLeader = {
  membershipId: string;
  nickname: string;
  value: number;
} | null;

export type RecordsSeasonSummary = {
  totalMatches: number;
  topVenue: {
    location: string;
    count: number;
  } | null;
  topAppearance: RecordsLeader;
  topGoals: RecordsLeader;
  topAssists: RecordsLeader;
  topMom: RecordsLeader;
};

export type RecordsSeasonSummaryResponse = {
  seasonId: string | null;
  rankingRows: RecordsRankingRow[];
  seasonSummary: RecordsSeasonSummary;
};

export async function fetchRecordsSeasonSummary(
  clubId = appConfig.defaultClubId,
): Promise<RecordsSeasonSummaryResponse> {
  const response = await fetch(`/api/records/season-summary?clubId=${encodeURIComponent(clubId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '시즌 기록을 불러오지 못했어요.'));
  }

  return response.json() as Promise<RecordsSeasonSummaryResponse>;
}

async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: { message?: string } };
    return body.error?.message || fallback;
  } catch {
    return fallback;
  }
}
