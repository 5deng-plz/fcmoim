import type { SupabaseClient } from '@supabase/supabase-js';

import { AppError } from '../../types/api';

import { createPrivilegedSupabaseClient } from '../../lib/supabase-server';

import type { MatchEventType, MatchStatus, TeamProfile, TeamProfileDetail, PublicMatchSummaryRow, PublicSeasonSummaryRow, TeamMembershipRow } from '../../types/domain';

import type { ClubAdminRepositories } from '../club-admin';

import type { PublicClubRepositories } from '../public-clubs';

type PublicClubDbRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_public?: boolean;
};

type TeamProfileDbProjection = TeamProfile & {
  id: string;
  slug: string;
};

type PublicSeasonDbRow = {
  id: string;
  club_id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type PublicMatchDbRow = {
  id: string;
  club_id: string;
  title: string;
  date: string;
  location: string;
  type: MatchEventType;
  status: MatchStatus;
  our_score: number | null;
  opp_score: number | null;
};

type PublicMembershipCountDbRow = {
  club_id: string;
};

type PublicAttendanceDbRow = {
  match_id: string;
};

export function createSupabasePublicClubRepositories(
  supabase: SupabaseClient,
  getPrivilegedClient: () => SupabaseClient = createPrivilegedSupabaseClient,
): PublicClubRepositories {
  return {
    clubs: {
      async findTeamProfile(clubId) {
        const { data, error } = await selectPublicClubById(supabase, clubId);

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch public club.', { cause: error });
        }
        if (!data) {
          return null;
        }

        const privilegedSupabase = getPrivilegedClient();
        const aggregates = await fetchPublicClubAggregates(privilegedSupabase, [clubId]);
        const memberCount = aggregates.memberCounts.get(clubId) ?? 0;
        const [recentMatches, upcomingMatches] = await Promise.all([
          fetchPublicMatches(privilegedSupabase, clubId, 'recent', memberCount),
          fetchPublicMatches(privilegedSupabase, clubId, 'upcoming', memberCount),
        ]);

        const detail = {
          ...mapPublicClubSummary(data, aggregates),
          recentMatches,
          upcomingMatches,
        };
        return {
          name: detail.name,
          description: detail.description,
          logoUrl: detail.logoUrl,
          isPublic: detail.isPublic,
          memberCount: detail.memberCount,
          activeSeason: detail.activeSeason,
          recentMatchCount: detail.recentMatchCount,
          upcomingMatchCount: detail.upcomingMatchCount,
          recentMatches: detail.recentMatches,
          upcomingMatches: detail.upcomingMatches,
        } satisfies TeamProfileDetail;
      },
    },
  };
}

export function createSupabaseClubAdminRepositories(
  supabase: SupabaseClient,
): ClubAdminRepositories {
  return {
    memberships: {
      async findCurrentMembership(accountId, clubId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select('role, status')
          .eq('account_id', accountId)
          .eq('club_id', clubId)
          .maybeSingle<Pick<TeamMembershipRow, 'role' | 'status'>>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch membership.', { cause: error });
        }

        return data;
      },
    },
    clubs: {
      async findSettings(clubId) {
        const { data, error } = await supabase
          .from('clubs')
          .select('id, name, slug, description, logo_url, is_public')
          .eq('id', clubId)
          .maybeSingle<PublicClubDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch club settings.', { cause: error });
        }
        if (!data) return null;

        return mapPublicClubSummary(data, {
          memberCounts: new Map(),
          activeSeasons: new Map(),
          recentMatchCounts: new Map(),
          upcomingMatchCounts: new Map(),
        });
      },
      async updateSettings(input) {
        const { data, error } = await supabase
          .from('clubs')
          .update({
            description: input.description,
            is_public: input.isPublic,
          })
          .eq('id', input.clubId)
          .select('id, name, slug, description, logo_url, is_public')
          .single<PublicClubDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to update club settings.', { cause: error });
        }

        return mapPublicClubSummary(data, {
          memberCounts: new Map(),
          activeSeasons: new Map(),
          recentMatchCounts: new Map(),
          upcomingMatchCounts: new Map(),
        });
      },
      async updateLogo(input) {
        const { data, error } = await supabase
          .from('clubs')
          .update({
            logo_url: input.logoUrl,
          })
          .eq('id', input.clubId)
          .select('id, name, slug, description, logo_url, is_public')
          .single<PublicClubDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to update club logo.', { cause: error });
        }

        return mapPublicClubSummary(data, {
          memberCounts: new Map(),
          activeSeasons: new Map(),
          recentMatchCounts: new Map(),
          upcomingMatchCounts: new Map(),
        });
      },
    },
  };
}

type PublicClubAggregates = {
  memberCounts: Map<string, number>;
  activeSeasons: Map<string, PublicSeasonSummaryRow>;
  recentMatchCounts: Map<string, number>;
  upcomingMatchCounts: Map<string, number>;
};

async function selectPublicClubById(supabase: SupabaseClient, clubId: string) {
  const result = await supabase
    .from('clubs')
    .select('id, name, slug, description, logo_url, is_public')
    .eq('id', clubId)
    .eq('is_public', true)
    .maybeSingle<PublicClubDbRow>();

  if (!isMissingColumnError(result.error, 'is_public')) {
    return result;
  }

  return supabase
    .from('clubs')
    .select('id, name, slug, description, logo_url')
    .eq('id', clubId)
    .maybeSingle<PublicClubDbRow>();
}

async function fetchPublicClubAggregates(
  supabase: SupabaseClient,
  clubIds: string[],
): Promise<PublicClubAggregates> {
  const emptyAggregates: PublicClubAggregates = {
    memberCounts: new Map(),
    activeSeasons: new Map(),
    recentMatchCounts: new Map(),
    upcomingMatchCounts: new Map(),
  };

  if (clubIds.length === 0) {
    return emptyAggregates;
  }

  const nowIso = new Date().toISOString();
  const [memberships, seasons, recentMatches, upcomingMatches] = await Promise.all([
    supabase
      .from('team_memberships')
      .select('club_id')
      .in('club_id', clubIds)
      .eq('status', 'approved')
      .returns<PublicMembershipCountDbRow[]>(),
    supabase
      .from('seasons')
      .select('id, club_id, name, start_date, end_date')
      .in('club_id', clubIds)
      .eq('is_active', true)
      .returns<PublicSeasonDbRow[]>(),
    supabase
      .from('matches')
      .select('club_id')
      .in('club_id', clubIds)
      .lte('date', nowIso)
      .neq('status', 'cancelled')
      .returns<Pick<PublicMatchDbRow, 'club_id'>[]>(),
    supabase
      .from('matches')
      .select('club_id')
      .in('club_id', clubIds)
      .gte('date', nowIso)
      .neq('status', 'cancelled')
      .returns<Pick<PublicMatchDbRow, 'club_id'>[]>(),
  ]);

  if (memberships.error) {
    throw new AppError('internal_error', 'Failed to fetch public club member counts.', {
      cause: memberships.error,
    });
  }
  if (seasons.error) {
    throw new AppError('internal_error', 'Failed to fetch public club seasons.', {
      cause: seasons.error,
    });
  }
  if (recentMatches.error) {
    throw new AppError('internal_error', 'Failed to fetch public club recent match counts.', {
      cause: recentMatches.error,
    });
  }
  if (upcomingMatches.error) {
    throw new AppError('internal_error', 'Failed to fetch public club upcoming match counts.', {
      cause: upcomingMatches.error,
    });
  }

  return {
    memberCounts: countRowsByClub(memberships.data ?? []),
    activeSeasons: new Map((seasons.data ?? []).map((season) => [
      season.club_id,
      {
        id: season.id,
        name: season.name,
        startDate: season.start_date,
        endDate: season.end_date,
      } satisfies PublicSeasonSummaryRow,
    ])),
    recentMatchCounts: countRowsByClub(recentMatches.data ?? []),
    upcomingMatchCounts: countRowsByClub(upcomingMatches.data ?? []),
  };
}

async function fetchPublicMatches(
  supabase: SupabaseClient,
  clubId: string,
  direction: 'recent' | 'upcoming',
  attendeeTotal: number,
): Promise<PublicMatchSummaryRow[]> {
  const nowIso = new Date().toISOString();
  const baseQuery = supabase
    .from('matches')
    .select('id, club_id, title, date, location, type, status, our_score, opp_score')
    .eq('club_id', clubId)
    .neq('status', 'cancelled');

  const query = direction === 'recent'
    ? baseQuery.lte('date', nowIso).order('date', { ascending: false }).limit(3)
    : baseQuery.gte('date', nowIso).order('date', { ascending: true }).limit(3);

  const { data, error } = await query.returns<PublicMatchDbRow[]>();
  if (error) {
    throw new AppError('internal_error', 'Failed to fetch public club matches.', { cause: error });
  }

  const matches = data ?? [];
  const attendeeCounts = await fetchPublicMatchAttendeeCounts(
    supabase,
    matches.map((match) => match.id),
  );

  return matches.map((match) => ({
    id: match.id,
    title: match.title,
    date: match.date,
    location: match.location,
    type: match.type,
    status: match.status,
    ourScore: match.our_score,
    oppScore: match.opp_score,
    attendeeCount: attendeeCounts.get(match.id) ?? 0,
    attendeeTotal: Math.max(attendeeTotal, attendeeCounts.get(match.id) ?? 0, 1),
  }));
}

async function fetchPublicMatchAttendeeCounts(
  supabase: SupabaseClient,
  matchIds: string[],
) {
  const counts = new Map<string, number>();
  if (matchIds.length === 0) return counts;

  const { data, error } = await supabase
    .from('attendances')
    .select('match_id')
    .in('match_id', matchIds)
    .eq('status', 'attend')
    .returns<PublicAttendanceDbRow[]>();

  if (error) {
    throw new AppError('internal_error', 'Failed to fetch public match attendees.', { cause: error });
  }

  for (const attendance of data ?? []) {
    counts.set(attendance.match_id, (counts.get(attendance.match_id) ?? 0) + 1);
  }

  return counts;
}

function mapPublicClubSummary(
  club: PublicClubDbRow,
  aggregates: PublicClubAggregates,
): TeamProfileDbProjection {
  return {
    id: club.id,
    name: club.name,
    slug: club.slug,
    description: club.description,
    logoUrl: club.logo_url,
    isPublic: club.is_public ?? true,
    memberCount: aggregates.memberCounts.get(club.id) ?? 0,
    activeSeason: aggregates.activeSeasons.get(club.id) ?? null,
    recentMatchCount: aggregates.recentMatchCounts.get(club.id) ?? 0,
    upcomingMatchCount: aggregates.upcomingMatchCounts.get(club.id) ?? 0,
  };
}

function countRowsByClub(rows: Array<{ club_id: string }>) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.club_id, (counts.get(row.club_id) ?? 0) + 1);
  }
  return counts;
}

function isMissingColumnError(error: { code?: string; message?: string } | null, columnName: string) {
  return error?.code === '42703' && Boolean(error.message?.includes(columnName));
}
