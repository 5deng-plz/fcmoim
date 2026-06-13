'use client';

import { appConfig } from '../config/app.config';
import { DEFAULT_STATS, type Position, type User, type UserRole, type UserStats, type UserStatus } from '../types';
import type { AuthUser } from '../lib/auth';
import type { ClubOption } from './useAppStore';

type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'withdrawn';
export type ApiMembershipState = 'new' | MembershipStatus;
export type PreferredFootCode = 'left' | 'right' | 'both';

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
  residence: string | null;
  photoUrl: string | null;
  ovr: number;
  stats: UserStats;
  matchPoints: number;
  preferredFoot: PreferredFootCode;
};

export type MembershipSnapshot = {
  account: ApiAccount;
  membership: ApiMembership | null;
  membershipState: ApiMembershipState;
};

export type ClubMembershipSummary = {
  membershipId: string;
  clubId: string;
  clubName: string;
  logoUrl?: string | null;
  role: UserRole;
  status: MembershipStatus;
};

export type JoinProfileRequest = {
  nickname: string;
  position: Position | null;
  heightCm: number | null;
  weightKg: number | null;
  birthDate: string | null;
  photoUrl: string | null;
  preferredFoot: PreferredFootCode | null;
  residence?: string | null;
  stats?: UserStats | null;
  ovr?: number | null;
};

export type JoinFormValues = {
  name: string;
  mainPosition: Position;
  height: string;
  weight: string;
  preferredFoot: '왼발' | '오른발' | '양발';
  birthDate?: string;
  birthYear?: string;
  birthMonth?: string;
  residence?: string;
  photoUrl?: string | null;
};

export type PublicSeasonSummary = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type PublicMatchSummary = {
  id: string;
  title: string;
  date: string;
  location: string;
  type: string;
  status: string;
  ourScore: number | null;
  oppScore: number | null;
  attendeeCount: number;
  attendeeTotal: number;
};

export type PublicClubSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isPublic: boolean;
  memberCount: number;
  activeSeason: PublicSeasonSummary | null;
  recentMatchCount: number;
  upcomingMatchCount: number;
};

export type PublicClubDetail = PublicClubSummary & {
  recentMatches: PublicMatchSummary[];
  upcomingMatches: PublicMatchSummary[];
};

export type ClubCreateRequest = {
  name: string;
  slug: string;
  description: string;
};

export type ClubCreateResponse = {
  success: true;
  clubId: string;
};

export type PendingMembershipReview = {
  id: string;
  accountId: string;
  clubId: string;
  nickname: string;
  position: Position | string | null;
  heightCm: number | null;
  weightKg: number | null;
  preferredFoot: PreferredFootCode;
  createdAt: string;
};

export type ApprovedMembership = ApiMembership;

export type MatchPointLedgerEntry = {
  id: string;
  amount: number;
  reason: string;
  sourceType: string;
  sourceId: string | null;
  createdAt: string;
};

export type MembershipProfilePatchRequest = {
  clubId: string;
  nickname?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  birthDate?: string | null;
  residence?: string | null;
  photoUrl?: string | null;
  preferredFoot?: PreferredFootCode | null;
};

export function membershipStateToUserStatus(state: ApiMembershipState): UserStatus {
  return state === 'new' ? 'guest' : state;
}

export function shouldShowJoinRequest(state: ApiMembershipState) {
  return state === 'new';
}

export function buildJoinProfileRequest(formData: JoinFormValues, stats?: UserStats): JoinProfileRequest {
  let birthDateVal: string | null = null;
  if (formData.birthDate) {
    birthDateVal = formData.birthDate.trim() || null;
  } else if (formData.birthYear && formData.birthMonth) {
    birthDateVal = buildBirthDate(formData.birthYear, formData.birthMonth);
  }

  const request: JoinProfileRequest = {
    nickname: formData.name.trim(),
    position: formData.mainPosition || null,
    heightCm: parseOptionalPositiveInt(formData.height),
    weightKg: parseOptionalPositiveInt(formData.weight),
    birthDate: birthDateVal,
    photoUrl: formData.photoUrl ?? null,
    preferredFoot: mapPreferredFoot(formData.preferredFoot),
  };

  if (formData.residence !== undefined) {
    request.residence = formData.residence.trim() || null;
  }

  if (stats) {
    request.stats = stats;
    // calculate OVR
    const total = Object.values(stats).reduce((sum, val) => sum + val, 0);
    request.ovr = Math.round(total / 6);
  }

  return request;
}

export async function fetchPublicClubs(): Promise<PublicClubSummary[]> {
  const response = await fetch('/api/public/clubs', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '팀 목록을 불러오지 못했습니다.'));
  }

  return response.json() as Promise<PublicClubSummary[]>;
}

export async function fetchPublicClubDetail(clubId: string): Promise<PublicClubDetail> {
  const response = await fetch(`/api/public/clubs/${encodeURIComponent(clubId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '팀 정보를 불러오지 못했습니다.'));
  }

  return response.json() as Promise<PublicClubDetail>;
}

export async function checkClubSlug(slug: string) {
  const response = await fetch(`/api/clubs/check-slug?slug=${encodeURIComponent(slug)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '팀 주소를 확인하지 못했습니다.'));
  }

  return response.json() as Promise<{ exists: boolean }>;
}

export async function fetchClubCreationEligibility() {
  const response = await fetch('/api/clubs', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '팀 생성 가능 여부를 확인하지 못했습니다.'));
  }

  return response.json() as Promise<{ ownedClubCount: number; canCreate: boolean }>;
}

export async function createClub(input: ClubCreateRequest) {
  const response = await fetch('/api/clubs', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '팀을 생성하지 못했습니다.'));
  }

  return response.json() as Promise<ClubCreateResponse>;
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

export async function fetchMatchPointLedger(clubId = appConfig.defaultClubId): Promise<MatchPointLedgerEntry[]> {
  const response = await fetch(`/api/membership/points?clubId=${encodeURIComponent(clubId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '경기 Point 내역을 불러오지 못했습니다.'));
  }

  return response.json() as Promise<MatchPointLedgerEntry[]>;
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

export async function fetchClubMemberships(): Promise<ClubOption[]> {
  const response = await fetch('/api/membership/clubs', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '소속 팀 목록을 불러오지 못했습니다.'));
  }

  const memberships = await response.json() as ClubMembershipSummary[];
  return memberships
    .map((membership) => ({
      membershipId: membership.membershipId,
      clubId: membership.clubId,
      clubName: membership.clubName,
      logoUrl: membership.logoUrl ?? null,
      role: membership.role,
      status: membership.status,
    }))
    .sort((left, right) => {
      const leftIsApproved = left.status === 'approved';
      const rightIsApproved = right.status === 'approved';
      if (leftIsApproved !== rightIsApproved) return leftIsApproved ? -1 : 1;
      if (left.clubId === appConfig.defaultClubId) return -1;
      if (right.clubId === appConfig.defaultClubId) return 1;
      return left.clubName.localeCompare(right.clubName, 'ko');
    });
}

export async function patchMembershipPhoto(input: { clubId: string; photoUrl: string | null }) {
  return patchMembershipProfile(input);
}

export async function patchMembershipProfile(input: MembershipProfilePatchRequest) {
  const response = await fetch('/api/membership/profile', {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '프로필 정보를 저장하지 못했습니다.'));
  }

  return response.json() as Promise<ApiMembership>;
}

export async function patchClubSettings(input: { clubId: string; description: string | null; isPublic: boolean }) {
  const response = await fetch('/api/clubs/settings', {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '팀 설정을 저장하지 못했습니다.'));
  }

  return response.json() as Promise<PublicClubSummary>;
}

export async function uploadClubLogo(input: { clubId: string; file: File }) {
  const formData = new FormData();
  formData.append('clubId', input.clubId);
  formData.append('file', input.file);

  const response = await fetch('/api/clubs/logo', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '팀 로고를 업로드하지 못했습니다.'));
  }

  return response.json() as Promise<PublicClubSummary>;
}

export async function fetchClubSettings(clubId: string) {
  const response = await fetch(`/api/clubs/settings?clubId=${encodeURIComponent(clubId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '팀 설정을 불러오지 못했습니다.'));
  }

  return response.json() as Promise<PublicClubSummary>;
}

export async function withdrawMembership(input: { clubId: string; membershipId: string }) {
  const response = await fetch('/api/membership/status', {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...input,
      status: 'withdrawn',
    }),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '회원 탈퇴처리를 완료하지 못했습니다.'));
  }

  return response.json() as Promise<ApiMembership>;
}

export async function fetchPendingMemberships(clubId = appConfig.defaultClubId) {
  const response = await fetch(`/api/membership/pending?clubId=${encodeURIComponent(clubId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '입단 대기 목록을 불러오지 못했습니다.'));
  }

  return response.json() as Promise<PendingMembershipReview[]>;
}

export async function fetchApprovedMemberships(clubId = appConfig.defaultClubId) {
  const response = await fetch(`/api/membership/approved?clubId=${encodeURIComponent(clubId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '스쿼드 명단을 불러오지 못했습니다.'));
  }

  return response.json() as Promise<ApprovedMembership[]>;
}

export async function reviewMembership(input: {
  clubId: string;
  membershipId: string;
  decision: Exclude<MembershipStatus, 'pending'>;
}) {
  const response = await fetch('/api/membership/review', {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '입단신청 심사를 처리하지 못했습니다.'));
  }

  return response.json() as Promise<ApiMembership>;
}

export async function assignOperatorRole(input: {
  clubId: string;
  membershipId: string;
}) {
  return updateMembershipRole({ ...input, role: 'operator' });
}

export async function updateMembershipRole(input: {
  clubId: string;
  membershipId: string;
  role: 'operator' | 'member';
}) {
  const response = await fetch('/api/membership/role', {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clubId: input.clubId,
      membershipId: input.membershipId,
      role: input.role,
    }),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, '멤버십 권한을 변경하지 못했습니다.'));
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
    ovr: membership.ovr,
    stats: membership.stats ?? DEFAULT_STATS,
    matchPoints: membership.matchPoints,
    photoUrl: membership.photoUrl ?? snapshot.account.avatarUrl ?? null,
    role: membership.role,
    status: membership.status,
    height: membership.heightCm,
    weight: membership.weightKg,
    birth: membership.birthDate ? new Date(membership.birthDate) : null,
    residence: membership.residence,
    preferredFoot: formatPreferredFoot(membership.preferredFoot),
    createdAt: now,
    updatedAt: now,
  };
}

function formatPreferredFoot(foot: PreferredFootCode): '왼발' | '오른발' | '양발' {
  if (foot === 'left') return '왼발';
  if (foot === 'both') return '양발';
  return '오른발';
}

function normalizePosition(position: Position | string | null): Position {
  if (position === 'FW' || position === 'MF' || position === 'DF' || position === 'GK') {
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

function mapPreferredFoot(foot: JoinFormValues['preferredFoot']): PreferredFootCode {
  if (foot === '왼발') return 'left';
  if (foot === '양발') return 'both';
  return 'right';
}

async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json() as { error?: { message?: string } };
    return translateApiErrorMessage(data.error?.message) || fallback;
  } catch {
    return fallback;
  }
}

function translateApiErrorMessage(message?: string) {
  switch (message) {
    case 'Height is out of range.':
      return '키는 100cm 이상 230cm 이하로 입력해주세요.';
    case 'Weight is out of range.':
      return '몸무게는 30kg 이상 180kg 이하로 입력해주세요.';
    case 'No profile fields were provided.':
      return '저장할 프로필 정보가 없습니다.';
    case 'Birth date must be YYYY-MM-DD.':
      return '생년월일은 YYYY-MM-DD 형식으로 입력해주세요.';
    case 'Birth date is invalid.':
      return '올바른 생년월일을 입력해주세요.';
    case 'Residence is too long.':
      return '거주지는 80자 이하로 입력해주세요.';
    case 'Profile photo is too large.':
      return '프로필 사진 용량이 너무 큽니다.';
    case 'Failed to create pending membership.':
      return '이미 입단신청이 접수되었거나 가입할 수 없는 팀입니다.';
    default:
      return message;
  }
}
