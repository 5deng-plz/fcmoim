'use client';

import { appConfig } from '@/config/app.config';

export type Announcement = {
  id: string;
  clubId: string;
  seasonId: string | null;
  title: string;
  content: string;
  authorMembershipId: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAnnouncementRequest = {
  clubId: string;
  seasonId: string | null;
  title: string;
  content: string;
  isPinned: boolean;
};

type ApiErrorBody = {
  error?: {
    message?: string;
  };
};

export async function fetchAnnouncements(clubId = appConfig.defaultClubId): Promise<Announcement[]> {
  const response = await fetch(`/api/announcements?clubId=${encodeURIComponent(clubId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '공지사항을 불러오지 못했어요.'));
  }

  return response.json() as Promise<Announcement[]>;
}

export async function createAnnouncement(input: CreateAnnouncementRequest): Promise<Announcement> {
  const response = await fetch('/api/announcements', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '공지사항을 등록하지 못했어요.'));
  }

  return response.json() as Promise<Announcement>;
}

async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json() as ApiErrorBody;
    return body.error?.message || fallback;
  } catch {
    return fallback;
  }
}
