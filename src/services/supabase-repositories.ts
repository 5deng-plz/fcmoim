import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../types/api';
import { DEFAULT_STATS, type UserStats } from '../types';
import { createPrivilegedSupabaseClient } from '../lib/supabase-server';
import type {
  AccountRow,
  ClubMembershipSummaryRow,
  MatchEventType,
  MatchLineupEntryRow,
  MatchLineupTeamNumber,
  MatchRow,
  MatchStatus,
  NormalizedJoinProfile,
  PendingMembershipReviewRow,
  PublicClubDetailRow,
  PublicClubSummaryRow,
  PublicMatchSummaryRow,
  PublicSeasonSummaryRow,
  SchedulePollOptionRow,
  SchedulePollRow,
  SchedulePollStatus,
  SchedulePollVoteRow,
  TeamMembershipRow,
} from '../types/domain';
import type { AccountMembershipRepositories } from './account-membership';
import type { MatchResultRepositories } from './match-results';
import type { MatchRepositories } from './matches';
import type { PublicClubRepositories } from './public-clubs';
import type { SchedulePollRepositories } from './schedule-polls';

type MembershipDbRow = {
  id: string;
  account_id: string;
  club_id: string;
  role: TeamMembershipRow['role'];
  status: TeamMembershipRow['status'];
  profile_name: string;
  main_position: string | null;
  height: number | null;
  weight: number | null;
  birth: string | null;
  photo_url: string | null;
  ovr: number;
  stats: unknown;
  match_points: number;
  preferred_foot: TeamMembershipRow['preferredFoot'];
};

type PendingMembershipDbRow = {
  id: string;
  account_id: string;
  club_id: string;
  profile_name: string;
  main_position: string | null;
  height: number | null;
  weight: number | null;
  preferred_foot: PendingMembershipReviewRow['preferredFoot'];
  created_at: string;
};

type ClubMembershipDbRow = {
  id: string;
  club_id: string;
  role: TeamMembershipRow['role'];
  status: TeamMembershipRow['status'];
  clubs: {
    name: string;
  } | null;
};

type AccountDbRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type PublicClubDbRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
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

type SchedulePollMembershipDbRow = {
  id: string;
  club_id: string;
  role: TeamMembershipRow['role'];
  status: TeamMembershipRow['status'];
};

type SchedulePollOptionDbRow = {
  id: string;
  poll_id: string;
  option_date: string;
  sort_order: number;
};

type SchedulePollVoteDbRow = {
  id: string;
  poll_id: string;
  option_id: string;
  membership_id: string;
  is_available: boolean;
};

type SchedulePollDbRow = {
  id: string;
  club_id: string;
  season_id: string | null;
  title: string;
  status: SchedulePollStatus;
  common_time: string;
  location: string;
  memo: string | null;
  closes_at: string | null;
  created_by: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  promoted_match_id: string | null;
  schedule_poll_options?: SchedulePollOptionDbRow[] | null;
  schedule_poll_votes?: SchedulePollVoteDbRow[] | null;
};

type MatchMembershipDbRow = {
  id: string;
  club_id: string;
  role: TeamMembershipRow['role'];
  status: TeamMembershipRow['status'];
};

type MatchDbRow = {
  id: string;
  club_id: string;
  season_id: string;
  round: number | null;
  title: string;
  date: string;
  location: string;
  type: MatchEventType;
  status: MatchStatus;
  our_score: number | null;
  opp_score: number | null;
  tactics_completed: boolean;
  memo: string | null;
  created_by: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
};

type MatchTeamDbRow = {
  id: string;
  match_id: string;
  membership_id: string;
  team_number: MatchLineupTeamNumber;
  is_leader: boolean;
  position: TeamMembershipRow['position'];
  team_memberships: {
    profile_name: string;
    main_position: TeamMembershipRow['position'];
    photo_url: string | null;
    ovr: number;
  } | null;
};

export function createSupabaseAccountMembershipRepositories(
  supabase: SupabaseClient,
): AccountMembershipRepositories {
  return {
    accounts: {
      async upsertFromAuthUser(input) {
        const { data, error } = await supabase
          .from('accounts')
          .upsert({ id: input.id })
          .select('id, display_name, avatar_url')
          .single<AccountDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to bootstrap account.', { cause: error });
        }

        return {
          id: data.id,
          email: input.email,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
        } satisfies AccountRow;
      },
    },
    memberships: {
      async findByAccountAndClub(accountId, clubId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select(MEMBERSHIP_SELECT)
          .eq('account_id', accountId)
          .eq('club_id', clubId)
          .maybeSingle<MembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch membership.', { cause: error });
        }

        return data ? mapMembership(data) : null;
      },
      async findById(membershipId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select(MEMBERSHIP_SELECT)
          .eq('id', membershipId)
          .maybeSingle<MembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch membership.', { cause: error });
        }

        return data ? mapMembership(data) : null;
      },
      async listClubMemberships(accountId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select('id, club_id, role, status, clubs(name)')
          .eq('account_id', accountId)
          .eq('status', 'approved')
          .returns<ClubMembershipDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch club memberships.', { cause: error });
        }

        return (data ?? []).map((row) => ({
          membershipId: row.id,
          clubId: row.club_id,
          clubName: row.clubs?.name || '이름 없는 팀',
          role: row.role,
          status: row.status,
        }) satisfies ClubMembershipSummaryRow);
      },
      async listPendingByClub(clubId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select('id, account_id, club_id, profile_name, main_position, height, weight, preferred_foot, created_at')
          .eq('club_id', clubId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .returns<PendingMembershipDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch pending memberships.', { cause: error });
        }

        return (data ?? []).map(mapPendingMembership);
      },
      async listApprovedByClub(clubId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select(MEMBERSHIP_SELECT)
          .eq('club_id', clubId)
          .eq('status', 'approved')
          .order('profile_name', { ascending: true })
          .returns<MembershipDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch approved memberships.', { cause: error });
        }

        return (data ?? []).map(mapMembership);
      },
      async createPending(input) {
        const payload = toPendingMembershipInsert(input);
        const { data, error } = await supabase
          .from('team_memberships')
          .insert(payload)
          .select(MEMBERSHIP_SELECT)
          .single<MembershipDbRow>();

        if (error) {
          throw new AppError('conflict', 'Failed to create pending membership.', { cause: error });
        }

        return mapMembership(data);
      },
      async updateStatus(input) {
        const { data, error } = await supabase
          .from('team_memberships')
          .update({ status: input.status })
          .eq('id', input.membershipId)
          .select(MEMBERSHIP_SELECT)
          .single<MembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to update membership status.', {
            cause: error,
            details: { reviewedByAccountId: input.reviewedByAccountId },
          });
        }

        return mapMembership(data);
      },
      async updateRole(input) {
        const { data, error } = await supabase
          .from('team_memberships')
          .update({ role: input.role })
          .eq('id', input.membershipId)
          .select(MEMBERSHIP_SELECT)
          .single<MembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to update membership role.', { cause: error });
        }

        return mapMembership(data);
      },
      async updatePhoto(input) {
        const { data, error } = await supabase
          .from('team_memberships')
          .update({ photo_url: input.photoUrl })
          .eq('id', input.membershipId)
          .select(MEMBERSHIP_SELECT)
          .single<MembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to update membership photo.', { cause: error });
        }

        return mapMembership(data);
      },
    },
  };
}

export function createSupabasePublicClubRepositories(
  supabase: SupabaseClient,
  getPrivilegedClient: () => SupabaseClient = createPrivilegedSupabaseClient,
): PublicClubRepositories {
  return {
    clubs: {
      async listPublic() {
        const { data, error } = await supabase
          .from('clubs')
          .select('id, name, slug, description, logo_url')
          .order('name', { ascending: true })
          .returns<PublicClubDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch public clubs.', { cause: error });
        }

        const clubIds = (data ?? []).map((club) => club.id);
        const aggregates = await fetchPublicClubAggregates(getPrivilegedClient(), clubIds);

        return (data ?? []).map((club) => mapPublicClubSummary(club, aggregates));
      },

      async findPublicDetail(clubId) {
        const { data, error } = await supabase
          .from('clubs')
          .select('id, name, slug, description, logo_url')
          .eq('id', clubId)
          .maybeSingle<PublicClubDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch public club.', { cause: error });
        }
        if (!data) {
          return null;
        }

        const privilegedSupabase = getPrivilegedClient();
        const aggregates = await fetchPublicClubAggregates(privilegedSupabase, [clubId]);
        const [recentMatches, upcomingMatches] = await Promise.all([
          fetchPublicMatches(privilegedSupabase, clubId, 'recent'),
          fetchPublicMatches(privilegedSupabase, clubId, 'upcoming'),
        ]);

        return {
          ...mapPublicClubSummary(data, aggregates),
          recentMatches,
          upcomingMatches,
        } satisfies PublicClubDetailRow;
      },
    },
  };
}

export function createSupabaseMatchResultRepositories(
  supabase: SupabaseClient,
  getPrivilegedClient: () => SupabaseClient = createPrivilegedSupabaseClient,
): MatchResultRepositories {
  return {
    memberships: {
      async findByAccountAndClub(accountId, clubId) {
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
    async transaction(callback) {
      const commandBuffer = createMatchResultCommandBuffer();
      const result = await callback(commandBuffer.tx);
      const privilegedSupabase = getPrivilegedClient();
      if (!commandBuffer.matchId || !commandBuffer.score) {
        throw new AppError('bad_request', 'Match result transaction did not include a score.');
      }

      const { error } = await privilegedSupabase.rpc('save_match_result_atomically', {
        p_match_id: commandBuffer.matchId,
        p_score: commandBuffer.score,
        p_player_stats: commandBuffer.playerStats,
        p_point_ledger: commandBuffer.pointLedger,
      });

      if (error) {
        throw error;
      }

      return result;
    },
  };
}

export function createSupabaseSchedulePollRepositories(
  supabase: SupabaseClient,
): SchedulePollRepositories {
  return {
    memberships: {
      async findByAccountAndClub(accountId, clubId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select('id, club_id, role, status')
          .eq('account_id', accountId)
          .eq('club_id', clubId)
          .maybeSingle<SchedulePollMembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch schedule poll membership.', { cause: error });
        }

        return data
          ? {
              id: data.id,
              clubId: data.club_id,
              role: data.role,
              status: data.status,
            }
          : null;
      },
    },
    polls: {
      async create(input) {
        const { data, error } = await supabase
          .from('schedule_polls')
          .insert({
            club_id: input.clubId,
            season_id: input.seasonId,
            title: input.title,
            common_time: input.commonTime,
            location: input.location,
            memo: input.memo,
            closes_at: input.closesAt,
            created_by: input.createdByMembershipId,
          })
          .select('id')
          .single<{ id: string }>();

        if (error) {
          throw new AppError('internal_error', 'Failed to create schedule poll.', { cause: error });
        }

        const { error: optionsError } = await supabase
          .from('schedule_poll_options')
          .insert(input.optionDates.map((optionDate, sortOrder) => ({
            poll_id: data.id,
            option_date: optionDate,
            sort_order: sortOrder,
          })));

        if (optionsError) {
          await supabase.from('schedule_polls').delete().eq('id', data.id);
          throw new AppError('internal_error', 'Failed to create schedule poll options.', {
            cause: optionsError,
          });
        }

        return fetchSchedulePollById(supabase, data.id);
      },

      async listActive(clubId) {
        const { data, error } = await supabase
          .from('schedule_polls')
          .select(SCHEDULE_POLL_SELECT)
          .eq('club_id', clubId)
          .in('status', ['open', 'cancelled'])
          .order('created_at', { ascending: false })
          .returns<SchedulePollDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch active schedule polls.', { cause: error });
        }

        return (data ?? []).map(mapSchedulePoll);
      },

      async findById(pollId) {
        const { data, error } = await supabase
          .from('schedule_polls')
          .select(SCHEDULE_POLL_SELECT)
          .eq('id', pollId)
          .maybeSingle<SchedulePollDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch schedule poll.', { cause: error });
        }

        return data ? mapSchedulePoll(data) : null;
      },

      async replaceVote(input) {
        const { error: deleteError } = await supabase
          .from('schedule_poll_votes')
          .delete()
          .eq('poll_id', input.pollId)
          .eq('membership_id', input.membershipId);

        if (deleteError) {
          throw new AppError('internal_error', 'Failed to clear previous schedule poll votes.', {
            cause: deleteError,
          });
        }

        const votes = input.selectedOptionIds.map((optionId) => ({
          poll_id: input.pollId,
          option_id: optionId,
          membership_id: input.membershipId,
          is_available: true,
        }));

        if (votes.length > 0) {
          const { error: insertError } = await supabase.from('schedule_poll_votes').insert(votes);
          if (insertError) {
            throw new AppError('internal_error', 'Failed to save schedule poll votes.', {
              cause: insertError,
            });
          }
        }

        return fetchSchedulePollById(supabase, input.pollId);
      },

      async cancel(input) {
        const { error } = await supabase
          .from('schedule_polls')
          .update({
            status: 'cancelled',
            cancellation_reason: input.cancellationReason,
            cancelled_at: new Date().toISOString(),
            updated_by: input.cancelledByMembershipId,
          })
          .eq('id', input.pollId);

        if (error) {
          throw new AppError('internal_error', 'Failed to cancel schedule poll.', { cause: error });
        }

        return fetchSchedulePollById(supabase, input.pollId);
      },

      async promoteToMatch(input) {
        const poll = await fetchSchedulePollById(supabase, input.pollId);
        const selectedOption = poll.options.find((option) => option.id === input.optionId);
        if (!selectedOption) {
          throw new AppError('bad_request', 'Selected option does not belong to this poll.');
        }
        if (!poll.seasonId) {
          throw new AppError('bad_request', 'Schedule poll needs a season before promotion.');
        }

        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            club_id: poll.clubId,
            season_id: poll.seasonId,
            title: poll.title,
            date: toKoreaIsoDateTime(selectedOption.optionDate, poll.commonTime),
            location: poll.location,
            type: 'match',
            status: 'scheduled',
            memo: poll.memo,
            created_by: input.promotedByMembershipId,
          })
          .select('id')
          .single<{ id: string }>();

        if (matchError) {
          throw new AppError('internal_error', 'Failed to create match from schedule poll.', {
            cause: matchError,
          });
        }

        const { error: pollError } = await supabase
          .from('schedule_polls')
          .update({
            status: 'promoted',
            promoted_match_id: match.id,
          })
          .eq('id', input.pollId);

        if (pollError) {
          await supabase.from('matches').delete().eq('id', match.id);
          throw new AppError('internal_error', 'Failed to promote schedule poll.', {
            cause: pollError,
          });
        }

        return { pollId: input.pollId, matchId: match.id };
      },
    },
  };
}

export function createSupabaseMatchRepositories(
  supabase: SupabaseClient,
): MatchRepositories {
  return {
    memberships: {
      async findByAccountAndClub(accountId, clubId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select('id, club_id, role, status')
          .eq('account_id', accountId)
          .eq('club_id', clubId)
          .maybeSingle<MatchMembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch match membership.', { cause: error });
        }

        return data
          ? {
              id: data.id,
              clubId: data.club_id,
              role: data.role,
              status: data.status,
            }
          : null;
      },
    },
    matches: {
      async listUpcoming(clubId) {
        const { data, error } = await supabase
          .from('matches')
          .select(MATCH_SELECT)
          .eq('club_id', clubId)
          .in('status', ['scheduled', 'locker_room', 'cancelled'])
          .order('date', { ascending: true })
          .returns<MatchDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch upcoming matches.', { cause: error });
        }

        return (data ?? []).map(mapMatch);
      },

      async findById(matchId) {
        const { data, error } = await supabase
          .from('matches')
          .select(MATCH_SELECT)
          .eq('id', matchId)
          .maybeSingle<MatchDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch match.', { cause: error });
        }

        return data ? mapMatch(data) : null;
      },

      async cancel(input) {
        const { data, error } = await supabase
          .from('matches')
          .update({
            status: 'cancelled',
            cancellation_reason: input.cancellationReason,
            cancelled_at: new Date().toISOString(),
            updated_by: input.cancelledByMembershipId,
          })
          .eq('id', input.matchId)
          .select(MATCH_SELECT)
          .single<MatchDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to cancel match.', { cause: error });
        }

        return mapMatch(data);
      },
    },
    lineups: {
      async listForMatch(matchId) {
        return fetchMatchLineupByMatchId(supabase, matchId);
      },

      async replaceForMatch(input) {
        const { error: deleteError } = await supabase
          .from('match_teams')
          .delete()
          .eq('match_id', input.matchId);

        if (deleteError) {
          throw new AppError('internal_error', 'Failed to clear match lineup.', { cause: deleteError });
        }

        const { error: insertError } = await supabase
          .from('match_teams')
          .insert(input.entries.map((entry) => ({
            match_id: input.matchId,
            membership_id: entry.membershipId,
            team_number: entry.teamNumber,
            is_leader: entry.isLeader,
            position: entry.position,
          })));

        if (insertError) {
          throw new AppError('internal_error', 'Failed to save match lineup.', { cause: insertError });
        }

        const { error: matchError } = await supabase
          .from('matches')
          .update({
            status: 'locker_room',
            tactics_completed: true,
            updated_by: input.updatedByMembershipId,
          })
          .eq('id', input.matchId);

        if (matchError) {
          throw new AppError('internal_error', 'Failed to publish match lineup.', { cause: matchError });
        }

        return fetchMatchLineupByMatchId(supabase, input.matchId);
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
      .lt('date', nowIso)
      .returns<Pick<PublicMatchDbRow, 'club_id'>[]>(),
    supabase
      .from('matches')
      .select('club_id')
      .in('club_id', clubIds)
      .gte('date', nowIso)
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
): Promise<PublicMatchSummaryRow[]> {
  const nowIso = new Date().toISOString();
  const baseQuery = supabase
    .from('matches')
    .select('id, club_id, title, date, location, type, status, our_score, opp_score')
    .eq('club_id', clubId);

  const query = direction === 'recent'
    ? baseQuery.lt('date', nowIso).order('date', { ascending: false }).limit(3)
    : baseQuery.gte('date', nowIso).order('date', { ascending: true }).limit(3);

  const { data, error } = await query.returns<PublicMatchDbRow[]>();
  if (error) {
    throw new AppError('internal_error', 'Failed to fetch public club matches.', { cause: error });
  }

  return (data ?? []).map((match) => ({
    id: match.id,
    title: match.title,
    date: match.date,
    location: match.location,
    type: match.type,
    status: match.status,
    ourScore: match.our_score,
    oppScore: match.opp_score,
  }));
}

function mapPublicClubSummary(
  club: PublicClubDbRow,
  aggregates: PublicClubAggregates,
): PublicClubSummaryRow {
  return {
    id: club.id,
    name: club.name,
    slug: club.slug,
    description: club.description,
    logoUrl: club.logo_url,
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

const MEMBERSHIP_SELECT =
  'id, account_id, club_id, role, status, profile_name, main_position, height, weight, birth, photo_url, ovr, stats, match_points, preferred_foot';

const SCHEDULE_POLL_SELECT =
  'id, club_id, season_id, title, status, common_time, location, memo, closes_at, created_by, cancellation_reason, cancelled_at, promoted_match_id, schedule_poll_options(id, poll_id, option_date, sort_order), schedule_poll_votes(id, poll_id, option_id, membership_id, is_available)';

const MATCH_SELECT =
  'id, club_id, season_id, round, title, date, location, type, status, our_score, opp_score, tactics_completed, memo, created_by, cancellation_reason, cancelled_at';

const MATCH_LINEUP_SELECT =
  'id, match_id, membership_id, team_number, is_leader, position, team_memberships(profile_name, main_position, photo_url, ovr)';

function mapMembership(row: MembershipDbRow): TeamMembershipRow {
  return {
    id: row.id,
    accountId: row.account_id,
    clubId: row.club_id,
    role: row.role,
    status: row.status,
    nickname: row.profile_name,
    position: row.main_position,
    heightCm: row.height,
    weightKg: row.weight,
    birthDate: row.birth,
    photoUrl: row.photo_url,
    ovr: row.ovr,
    stats: normalizeStats(row.stats),
    matchPoints: row.match_points,
    preferredFoot: row.preferred_foot,
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

function mapPendingMembership(row: PendingMembershipDbRow): PendingMembershipReviewRow {
  return {
    id: row.id,
    accountId: row.account_id,
    clubId: row.club_id,
    nickname: row.profile_name,
    position: row.main_position,
    heightCm: row.height,
    weightKg: row.weight,
    preferredFoot: row.preferred_foot,
    createdAt: row.created_at,
  };
}

function toPendingMembershipInsert(input: {
  accountId: string;
  clubId: string;
  profile: NormalizedJoinProfile;
}) {
  const payload: Record<string, unknown> = {
    account_id: input.accountId,
    club_id: input.clubId,
    profile_name: input.profile.nickname,
    height: input.profile.heightCm,
    weight: input.profile.weightKg,
    birth: input.profile.birthDate,
    photo_url: input.profile.photoUrl,
    role: 'member',
    status: 'pending',
  };

  if (input.profile.position) {
    payload.main_position = input.profile.position;
  }
  if (input.profile.preferredFoot) {
    payload.preferred_foot = input.profile.preferredFoot;
  }

  return payload;
}

async function fetchSchedulePollById(supabase: SupabaseClient, pollId: string) {
  const { data, error } = await supabase
    .from('schedule_polls')
    .select(SCHEDULE_POLL_SELECT)
    .eq('id', pollId)
    .single<SchedulePollDbRow>();

  if (error) {
    throw new AppError('internal_error', 'Failed to fetch schedule poll.', { cause: error });
  }

  return mapSchedulePoll(data);
}

function mapSchedulePoll(row: SchedulePollDbRow): SchedulePollRow {
  return {
    id: row.id,
    clubId: row.club_id,
    seasonId: row.season_id,
    title: row.title,
    status: row.status,
    commonTime: row.common_time.slice(0, 5),
    location: row.location,
    memo: row.memo,
    closesAt: row.closes_at,
    createdByMembershipId: row.created_by,
    cancellationReason: row.cancellation_reason ?? null,
    cancelledAt: row.cancelled_at ?? null,
    promotedMatchId: row.promoted_match_id,
    options: mapSchedulePollOptions(row.schedule_poll_options ?? []),
    votes: mapSchedulePollVotes(row.schedule_poll_votes ?? []),
  };
}

function mapMatch(row: MatchDbRow): MatchRow {
  return {
    id: row.id,
    clubId: row.club_id,
    seasonId: row.season_id,
    round: row.round,
    title: row.title,
    date: row.date,
    location: row.location,
    type: row.type,
    status: row.status,
    ourScore: row.our_score,
    oppScore: row.opp_score,
    tacticsCompleted: row.tactics_completed,
    memo: row.memo,
    createdByMembershipId: row.created_by,
    cancellationReason: row.cancellation_reason ?? null,
    cancelledAt: row.cancelled_at ?? null,
  };
}

async function fetchMatchLineupByMatchId(supabase: SupabaseClient, matchId: string) {
  const { data, error } = await supabase
    .from('match_teams')
    .select(MATCH_LINEUP_SELECT)
    .eq('match_id', matchId)
    .order('team_number', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<MatchTeamDbRow[]>();

  if (error) {
    throw new AppError('internal_error', 'Failed to fetch match lineup.', { cause: error });
  }

  return (data ?? []).map(mapMatchLineupEntry);
}

function mapMatchLineupEntry(row: MatchTeamDbRow): MatchLineupEntryRow {
  return {
    id: row.id,
    matchId: row.match_id,
    membershipId: row.membership_id,
    teamNumber: row.team_number,
    isLeader: row.is_leader,
    position: row.position === 'FW' || row.position === 'MF' || row.position === 'DF' ? row.position : 'MF',
    playerName: row.team_memberships?.profile_name || '이름 없는 선수',
    playerPosition: row.team_memberships?.main_position ?? null,
    playerOvr: row.team_memberships?.ovr ?? 60,
    playerPhotoUrl: row.team_memberships?.photo_url ?? null,
  };
}

function mapSchedulePollOptions(rows: SchedulePollOptionDbRow[]): SchedulePollOptionRow[] {
  return rows
    .map((row) => ({
      id: row.id,
      pollId: row.poll_id,
      optionDate: row.option_date,
      sortOrder: row.sort_order,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.optionDate.localeCompare(right.optionDate));
}

function mapSchedulePollVotes(rows: SchedulePollVoteDbRow[]): SchedulePollVoteRow[] {
  return rows.map((row) => ({
    id: row.id,
    pollId: row.poll_id,
    optionId: row.option_id,
    membershipId: row.membership_id,
    isAvailable: row.is_available,
  }));
}

function toKoreaIsoDateTime(optionDate: string, commonTime: string) {
  return `${optionDate}T${commonTime}:00+09:00`;
}

function createMatchResultCommandBuffer() {
  const buffer: {
    matchId: string | null;
    score: { home: number; away: number } | null;
    playerStats: Array<Record<string, unknown>>;
    pointLedger: Array<Record<string, unknown>>;
  } = {
    matchId: null,
    score: null,
    playerStats: [],
    pointLedger: [],
  };

  return {
    get matchId() {
      return buffer.matchId;
    },
    get score() {
      return buffer.score;
    },
    get playerStats() {
      return buffer.playerStats;
    },
    get pointLedger() {
      return buffer.pointLedger;
    },
    tx: {
      async updateMatchScore(matchId: string, score: { home: number; away: number }) {
        buffer.matchId = matchId;
        buffer.score = score;
      },
      async upsertPlayerStat(matchId: string, stat: { membershipId: string; goals: number; assists: number }) {
        buffer.matchId = matchId;
        const entry = findOrCreatePlayerStat(buffer.playerStats, stat.membershipId);
        Object.assign(entry, {
          matchId,
          membershipId: stat.membershipId,
          goals: stat.goals,
          assists: stat.assists,
        });
      },
      async updateMembershipOvr(membershipId: string, delta: number) {
        const entry = findOrCreatePlayerStat(buffer.playerStats, membershipId);
        entry.ovrDelta = delta;
      },
      async appendPointLedger(input: {
        membershipId: string;
        amount: number;
        reason: string;
        sourceType: 'match_result';
        sourceId: string;
      }) {
        buffer.pointLedger.push(input);
      },
    },
  };
}

function findOrCreatePlayerStat(playerStats: Array<Record<string, unknown>>, membershipId: string) {
  let entry = playerStats.find((stat) => stat.membershipId === membershipId);
  if (!entry) {
    entry = { membershipId };
    playerStats.push(entry);
  }
  return entry;
}
