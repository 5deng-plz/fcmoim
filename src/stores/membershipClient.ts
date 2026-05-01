'use client';

import { appConfig } from '../config/app.config';
import { DEFAULT_STATS, type Position, type User, type UserRole, type UserStatus } from '../types';
import type { AuthUser } from '../lib/auth';

type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type ApiMembershipState = 'new' | MembershipStatus;

type ApiAccount = {
  id: string;
  email: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type ApiMembership = {
  id: string;
  accountId: string;
  clubId: string;
  role: UserRole;
  status: MembershipStatus;
  nickname: string;
  position: Position | string | null;
  heightCm: number | null;
  weightKg: number | null;
  birthDate: string | null;
  photoUrl: string | null;
};

export type MembershipSnapshot = {
  account: ApiAccount;
  membership: ApiMembership | null;
  membershipState: ApiMembershipState;
};

export type JoinProfileRequest = {
  nickname: string;
  position: Position | null;
  heightCm: number | null;
  weightKg: number | null;
  birthDate: string | null;
  photoUrl: string | null;
};

export type JoinFormValues = {
  name: string;
  mainPosition: Position;
  height: string;
  weight: string;
  birthYear: string;
  birthMonth: string;
};

export function membershipStateToUserStatus(state: ApiMembershipState): UserStatus {
  return state === 'new' ? 'guest' : state;
}

export function shouldShowJoinRequest(state: ApiMembershipState) {
  return state === 'new';
}

export function buildJoinProfileRequest(formData: JoinFormValues): JoinProfileRequest {
  return {
    nickname: formData.name.trim(),
    position: formData.mainPosition || null,
    heightCm: parseOptionalPositiveInt(formData.height),
    weightKg: parseOptionalPositiveInt(formData.weight),
    birthDate: buildBirthDate(formData.birthYear, formData.birthMonth),
    photoUrl: null,
  };
}

export async function fetchMembershipSnapshot(clubId = appConfig.defaultClubId): Promise<MembershipSnapshot> {
  const response = await fetch(`/api/membership?clubId=${encodeURIComponent(clubId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '멤버십 상태를 확인하지 못했습니다.'));
  }

  return response.json() as Promise<MembershipSnapshot>;
}

export async function submitJoinRequest(profile: JoinProfileRequest, clubId = appConfig.defaultClubId) {
  const response = await fetch('/api/membership', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clubId,
      profile,
    }),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '가입 신청을 제출하지 못했습니다.'));
  }

  return response.json() as Promise<ApiMembership>;
}

export function mapMembershipSnapshotToUser(
  snapshot: MembershipSnapshot,
  authUser: AuthUser,
): User | null {
  if (!snapshot.membership || snapshot.membershipState !== 'approved') {
    return null;
  }

  const membership = snapshot.membership;
  const mainPosition = normalizePosition(membership.position);
  const now = new Date().toISOString();

  return {
    id: membership.id,
    authUid: authUser.id,
    name: membership.nickname,
    mainPosition,
    subPosition: null,
    ovr: 60,
    stats: DEFAULT_STATS,
    matchPoints: 0,
    photoUrl: membership.photoUrl,
    role: membership.role,
    status: membership.status,
    height: membership.heightCm,
    weight: membership.weightKg,
    birth: membership.birthDate ? new Date(membership.birthDate) : null,
    preferredFoot: '오른발',
    createdAt: now,
    updatedAt: now,
  };
}

function normalizePosition(position: Position | string | null): Position {
  if (position === 'FW' || position === 'MF' || position === 'DF') {
    return position;
  }

  return 'MF';
}

function parseOptionalPositiveInt(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildBirthDate(year: string, month: string): string | null {
  if (!year.trim() || !month.trim()) {
    return null;
  }

  const parsedYear = Number.parseInt(year, 10);
  const parsedMonth = Number.parseInt(month, 10);
  if (
    !Number.isFinite(parsedYear) ||
    !Number.isFinite(parsedMonth) ||
    parsedYear < 1900 ||
    parsedMonth < 1 ||
    parsedMonth > 12
  ) {
    return null;
  }

  return `${parsedYear.toString().padStart(4, '0')}-${parsedMonth.toString().padStart(2, '0')}-01`;
}

async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json() as { error?: { message?: string } };
    return data.error?.message || fallback;
  } catch {
    return fallback;
  }
}
