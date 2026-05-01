// ========================================
// FC Moim - Supabase data access layer
// ========================================
//
// Legacy component-facing helpers backed by the v1.0 Account + TeamMembership
// schema. New server workflows should prefer route handlers and services.

import {
  DEFAULT_STATS,
  type Announcement,
  type EventType,
  type Match,
  type MatchStatusType,
  type PlayerStat,
  type Position,
  type Season,
  type User,
  type UserRole,
  type UserStats,
  type UserStatus,
} from '@/types';
import { supabase } from './supabase';

type DbMatchStatus = 'scheduled' | 'locker_room' | 'finished';
type DbPreferredFoot = 'left' | 'right' | 'both';
type DbMembershipStatus = Exclude<UserStatus, 'guest'>;

type TeamMembershipDbRow = {
  id: string;
  account_id: string;
  profile_name: string;
  main_position: Position;
  sub_position: Position | null;
  ovr: number;
  stats: unknown;
  match_points: number;
  photo_url: string | null;
  role: UserRole;
  status: DbMembershipStatus;
  height: number | null;
  weight: number | null;
  birth: string | null;
  preferred_foot: DbPreferredFoot;
  created_at: string;
  updated_at: string;
};

type MatchDbRow = {
  id: string;
  season_id: string;
  round: number | null;
  title: string;
  date: string;
  location: string;
  type: EventType;
  status: DbMatchStatus;
  our_score: number | null;
  opp_score: number | null;
  tactics_completed: boolean;
  memo: string | null;
};

type PlayerStatDbRow = {
  id: string;
  match_id: string;
  membership_id: string;
  goals: number;
  assists: number;
  is_mom: boolean;
  ai_rating: number | null;
};

type AnnouncementDbRow = {
  id: string;
  season_id: string | null;
  title: string;
  content: string;
  author_membership_id: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

type SeasonDbRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

const TEAM_MEMBERSHIP_SELECT =
  'id, account_id, profile_name, main_position, sub_position, ovr, stats, match_points, photo_url, role, status, height, weight, birth, preferred_foot, created_at, updated_at';

const MATCH_SELECT =
  'id, season_id, round, title, date, location, type, status, our_score, opp_score, tactics_completed, memo';

// --- Queries ---

export async function getUpcomingEvents(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .neq('status', 'finished')
    .order('date', { ascending: true })
    .returns<MatchDbRow[]>();

  if (error) {
    throw new Error('Failed to fetch upcoming events.', { cause: error });
  }

  return (data ?? []).map(mapMatch);
}

export async function getMatchDetail(matchId: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('id', matchId)
    .maybeSingle<MatchDbRow>();

  if (error) {
    throw new Error('Failed to fetch match detail.', { cause: error });
  }

  return data ? mapMatch(data) : null;
}

export async function getAvailablePlayers(matchId: string): Promise<User[]> {
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('club_id')
    .eq('id', matchId)
    .maybeSingle<{ club_id: string }>();

  if (matchError) {
    throw new Error('Failed to resolve match club.', { cause: matchError });
  }
  if (!match) {
    return [];
  }

  const { data, error } = await supabase
    .from('team_memberships')
    .select(TEAM_MEMBERSHIP_SELECT)
    .eq('club_id', match.club_id)
    .eq('status', 'approved')
    .order('profile_name', { ascending: true })
    .returns<TeamMembershipDbRow[]>();

  if (error) {
    throw new Error('Failed to fetch available team memberships.', { cause: error });
  }

  return (data ?? []).map(mapTeamMembershipToUser);
}

export async function getSeasonRanking(): Promise<User[]> {
  const { data, error } = await supabase
    .from('team_memberships')
    .select(TEAM_MEMBERSHIP_SELECT)
    .eq('status', 'approved')
    .order('ovr', { ascending: false })
    .order('profile_name', { ascending: true })
    .returns<TeamMembershipDbRow[]>();

  if (error) {
    throw new Error('Failed to fetch season ranking.', { cause: error });
  }

  return (data ?? []).map(mapTeamMembershipToUser);
}

export async function getPlayerMatchHistory(userId: string): Promise<PlayerStat[]> {
  const { data, error } = await supabase
    .from('player_stats')
    .select('id, match_id, membership_id, goals, assists, is_mom, ai_rating')
    .eq('membership_id', userId)
    .order('created_at', { ascending: false })
    .returns<PlayerStatDbRow[]>();

  if (error) {
    throw new Error('Failed to fetch player match history.', { cause: error });
  }

  return (data ?? []).map(mapPlayerStat);
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, season_id, title, content, author_membership_id, is_pinned, created_at, updated_at')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<AnnouncementDbRow[]>();

  if (error) {
    throw new Error('Failed to fetch announcements.', { cause: error });
  }

  return (data ?? []).map(mapAnnouncement);
}

export async function getPendingUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('team_memberships')
    .select(TEAM_MEMBERSHIP_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .returns<TeamMembershipDbRow[]>();

  if (error) {
    throw new Error('Failed to fetch pending team memberships.', { cause: error });
  }

  return (data ?? []).map(mapTeamMembershipToUser);
}

export async function getCurrentSeason(): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .select('id, name, start_date, end_date, is_active')
    .eq('is_active', true)
    .maybeSingle<SeasonDbRow>();

  if (error) {
    throw new Error('Failed to fetch current season.', { cause: error });
  }
  if (!data) {
    throw new Error('Active season was not found.');
  }

  return mapSeason(data);
}

// --- Mutations ---

export async function updateAttendance(
  matchId: string,
  userId: string,
  status: 'attend' | 'absent',
): Promise<void> {
  const { error } = await supabase
    .from('attendances')
    .upsert(
      {
        match_id: matchId,
        membership_id: userId,
        status,
        responded_at: new Date().toISOString(),
      },
      { onConflict: 'match_id,membership_id' },
    );

  if (error) {
    throw new Error('Failed to update attendance.', { cause: error });
  }
}

export async function saveTactics(
  matchId: string,
  redTeam: string[],
  blueTeam: string[],
): Promise<void> {
  void matchId;
  void redTeam;
  void blueTeam;
}

export async function finalizeTactics(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ tactics_completed: true })
    .eq('id', matchId);

  if (error) {
    throw new Error('Failed to finalize tactics.', { cause: error });
  }
}

export async function updateProfile(userId: string, data: Partial<User>): Promise<void> {
  const payload = toTeamMembershipUpdate(data);
  if (Object.keys(payload).length === 0) {
    return;
  }

  const { error } = await supabase
    .from('team_memberships')
    .update(payload)
    .eq('id', userId);

  if (error) {
    throw new Error('Failed to update team membership profile.', { cause: error });
  }
}

export async function createMatch(data: Partial<Match>): Promise<string> {
  if (!data.seasonId || !data.title || !data.date || !data.location) {
    return '';
  }

  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select('club_id')
    .eq('id', data.seasonId)
    .maybeSingle<{ club_id: string }>();

  if (seasonError) {
    throw new Error('Failed to resolve match season.', { cause: seasonError });
  }
  if (!season) {
    return '';
  }

  const { data: row, error } = await supabase
    .from('matches')
    .insert({
      club_id: season.club_id,
      season_id: data.seasonId,
      round: data.round ?? null,
      title: data.title,
      date: toIsoDateTime(data.date),
      location: data.location,
      type: data.type ?? 'match',
      status: toDbMatchStatus(data.status ?? '예정'),
      our_score: data.ourScore ?? null,
      opp_score: data.oppScore ?? null,
      tactics_completed: data.tacticsCompleted ?? false,
      memo: data.memo ?? null,
    })
    .select('id')
    .single<{ id: string }>();

  if (error) {
    throw new Error('Failed to create match.', { cause: error });
  }

  return row.id;
}

export async function updateUserStatus(userId: string, status: string): Promise<void> {
  if (!isMembershipStatus(status)) {
    return;
  }

  const { error } = await supabase
    .from('team_memberships')
    .update({ status })
    .eq('id', userId);

  if (error) {
    throw new Error('Failed to update team membership status.', { cause: error });
  }
}

export async function savePlayerStat(stat: Partial<PlayerStat>): Promise<void> {
  if (!stat.matchId || !stat.userId) {
    return;
  }

  const { error } = await supabase
    .from('player_stats')
    .upsert(
      {
        match_id: stat.matchId,
        membership_id: stat.userId,
        goals: stat.goals ?? 0,
        assists: stat.assists ?? 0,
        is_mom: stat.isMom ?? false,
        ai_rating: stat.aiRating ?? null,
      },
      { onConflict: 'match_id,membership_id' },
    );

  if (error) {
    throw new Error('Failed to save player stat.', { cause: error });
  }
}

function mapTeamMembershipToUser(row: TeamMembershipDbRow): User {
  return {
    id: row.id,
    authUid: row.account_id,
    name: row.profile_name,
    mainPosition: row.main_position,
    subPosition: row.sub_position,
    ovr: row.ovr,
    stats: normalizeStats(row.stats),
    matchPoints: row.match_points,
    photoUrl: row.photo_url,
    role: row.role,
    status: row.status,
    height: row.height,
    weight: row.weight,
    birth: row.birth ? new Date(row.birth) : null,
    preferredFoot: toUserPreferredFoot(row.preferred_foot),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMatch(row: MatchDbRow): Match {
  return {
    id: row.id,
    seasonId: row.season_id,
    round: row.round,
    title: row.title,
    date: new Date(row.date),
    location: row.location,
    type: row.type,
    status: toUserMatchStatus(row.status),
    ourScore: row.our_score,
    oppScore: row.opp_score,
    tacticsCompleted: row.tactics_completed,
    memo: row.memo,
  };
}

function mapPlayerStat(row: PlayerStatDbRow): PlayerStat {
  return {
    id: row.id,
    matchId: row.match_id,
    userId: row.membership_id,
    goals: row.goals,
    assists: row.assists,
    isMom: row.is_mom,
    aiRating: row.ai_rating,
  };
}

function mapAnnouncement(row: AnnouncementDbRow): Announcement {
  return {
    id: row.id,
    seasonId: row.season_id ?? '',
    title: row.title,
    content: row.content,
    authorId: row.author_membership_id ?? '',
    isPinned: row.is_pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSeason(row: SeasonDbRow): Season {
  return {
    id: row.id,
    name: row.name,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    isActive: row.is_active,
  };
}

function normalizeStats(value: unknown): UserStats {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_STATS;
  }

  const stats = value as Partial<Record<keyof UserStats, unknown>>;
  return {
    speed: toStatNumber(stats.speed, DEFAULT_STATS.speed),
    shooting: toStatNumber(stats.shooting, DEFAULT_STATS.shooting),
    passing: toStatNumber(stats.passing, DEFAULT_STATS.passing),
    defense: toStatNumber(stats.defense, DEFAULT_STATS.defense),
    physical: toStatNumber(stats.physical, DEFAULT_STATS.physical),
    dribble: toStatNumber(stats.dribble, DEFAULT_STATS.dribble),
  };
}

function toStatNumber(value: unknown, fallback: number) {
  return typeof value === 'number' ? value : fallback;
}

function toUserPreferredFoot(value: DbPreferredFoot): User['preferredFoot'] {
  switch (value) {
    case 'left':
      return '왼발';
    case 'both':
      return '양발';
    case 'right':
    default:
      return '오른발';
  }
}

function toDbPreferredFoot(value: User['preferredFoot']): DbPreferredFoot {
  switch (value) {
    case '왼발':
      return 'left';
    case '양발':
      return 'both';
    case '오른발':
    default:
      return 'right';
  }
}

function toUserMatchStatus(value: DbMatchStatus): MatchStatusType {
  switch (value) {
    case 'locker_room':
      return '라커룸';
    case 'finished':
      return '종료';
    case 'scheduled':
    default:
      return '예정';
  }
}

function toDbMatchStatus(value: MatchStatusType): DbMatchStatus {
  switch (value) {
    case '라커룸':
      return 'locker_room';
    case '종료':
      return 'finished';
    case '예정':
    default:
      return 'scheduled';
  }
}

function toIsoDateTime(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) {
    return value;
  }

  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function toTeamMembershipUpdate(data: Partial<User>) {
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) {
    payload.profile_name = data.name;
  }
  if (data.mainPosition !== undefined) {
    payload.main_position = data.mainPosition;
  }
  if (data.subPosition !== undefined) {
    payload.sub_position = data.subPosition;
  }
  if (data.ovr !== undefined) {
    payload.ovr = data.ovr;
  }
  if (data.stats !== undefined) {
    payload.stats = data.stats;
  }
  if (data.matchPoints !== undefined) {
    payload.match_points = data.matchPoints;
  }
  if (data.photoUrl !== undefined) {
    payload.photo_url = data.photoUrl;
  }
  if (data.role !== undefined) {
    payload.role = data.role;
  }
  if (data.status !== undefined && data.status !== 'guest') {
    payload.status = data.status;
  }
  if (data.height !== undefined) {
    payload.height = data.height;
  }
  if (data.weight !== undefined) {
    payload.weight = data.weight;
  }
  if (data.birth !== undefined) {
    payload.birth = toIsoDate(data.birth);
  }
  if (data.preferredFoot !== undefined) {
    payload.preferred_foot = toDbPreferredFoot(data.preferredFoot);
  }

  return payload;
}

function isMembershipStatus(value: string): value is DbMembershipStatus {
  return ['pending', 'approved', 'rejected', 'suspended'].includes(value);
}
