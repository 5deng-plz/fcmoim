import type { SupabaseClient } from '@supabase/supabase-js';

import { AppError } from '../../types/api';

import type { UserStats } from '../../types';

import { normalizeUserStats } from '../../utils/stats';

import { createPrivilegedSupabaseClient } from '../../lib/supabase-server';

import type { MatchEventType, MatchLineupEntryRow, MatchLineupTeamNumber, MatchRow, MatchStatus, SchedulePollOptionRow, SchedulePollRow, SchedulePollStatus, SchedulePollVoteRow, TeamMembershipRow } from '../../types/domain';

import type { MatchResultRepositories } from '../match-results';

import type { MatchRepositories } from '../matches';

import type { SchedulePollRepositories } from '../schedule-polls';

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

type SchedulePollApprovedMembershipDbRow = {
  id: string;
};

type SchedulePollDateConflictDbRow = {
  option_date: string;
};

type ScheduleMatchDateConflictDbRow = {
  date: string;
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
  red_leader_confirmed: boolean;
  blue_leader_confirmed: boolean;
  memo: string | null;
  created_by: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  feedback_deadline: string | null;
  updated_at: string;
};

type MatchTeamDbRow = {
  id: string;
  match_id: string;
  membership_id: string;
  team_number: MatchLineupTeamNumber;
  is_leader: boolean;
  position: TeamMembershipRow['position'];
  formation_slot: number | null;
  team_memberships: {
    profile_name: string;
    main_position: TeamMembershipRow['position'];
    photo_url: string | null;
    ovr: number;
    match_points: number;
  } | null;
};

type MatchAttendeeDbRow = {
  match_id: string;
  membership_id: string;
  status: 'attend';
  team_memberships: {
    profile_name: string;
    photo_url: string | null;
    ovr: number;
    match_points: number;
  } | null;
};

export function createSupabaseMatchResultRepositories(
  supabase: SupabaseClient,
  getPrivilegedClient: () => SupabaseClient = createPrivilegedSupabaseClient,
): MatchResultRepositories {
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
      async findStatsByIds(membershipIds) {
        if (membershipIds.length === 0) return [];

        const { data, error } = await supabase
          .from('team_memberships')
          .select('id, stats')
          .in('id', membershipIds)
          .returns<Array<{ id: string; stats: unknown }>>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch match result membership stats.', { cause: error });
        }

        return (data ?? []).map((row) => ({
          id: row.id,
          stats: normalizeStats(row.stats),
        }));
      },
    },
    matches: {
      async findById(matchId, teamId) {
        const { data, error } = await supabase
          .from('matches')
          .select(MATCH_SELECT)
          .eq('id', matchId)
          .eq('club_id', teamId)
          .maybeSingle<MatchDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch match.', { cause: error });
        }

        return data ? mapMatch(data) : null;
      },
    },
    lineups: {
      async listForMatch(matchId) {
        return fetchMatchLineupByMatchId(supabase, matchId);
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
      async findCurrentMembership(accountId, clubId) {
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
    seasons: {
      async findActiveForTeam(clubId) {
        const { data, error } = await supabase
          .from('seasons')
          .select('id')
          .eq('club_id', clubId)
          .eq('is_active', true)
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle<{ id: string }>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch active season.', { cause: error });
        }

        return data;
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
        const [{ data, error }, eligibleVoterCount] = await Promise.all([
          supabase
            .from('schedule_polls')
            .select(SCHEDULE_POLL_SELECT)
            .eq('club_id', clubId)
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .returns<SchedulePollDbRow[]>(),
          countApprovedMembershipsByClub(supabase, clubId),
        ]);

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch active schedule polls.', { cause: error });
        }

        return (data ?? []).map((poll) => mapSchedulePoll(poll, eligibleVoterCount));
      },

      async findById(pollId, teamId) {
        const { data, error } = await supabase
          .from('schedule_polls')
          .select(SCHEDULE_POLL_SELECT)
          .eq('id', pollId)
          .eq('club_id', teamId)
          .maybeSingle<SchedulePollDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch schedule poll.', { cause: error });
        }

        return data ? mapSchedulePoll(data, await countApprovedMembershipsByClub(supabase, data.club_id)) : null;
      },

      async findActiveDateConflicts(input) {
        const optionDates = Array.from(new Set(input.optionDates)).sort();
        if (optionDates.length === 0) return [];

        const matchRange = getKoreaDateRangeForDates(optionDates);
        const [pollOptions, matches] = await Promise.all([
          supabase
            .from('schedule_poll_options')
            .select('option_date, schedule_polls!inner(club_id, status)')
            .eq('schedule_polls.club_id', input.clubId)
            .eq('schedule_polls.status', 'open')
            .in('option_date', optionDates)
            .returns<SchedulePollDateConflictDbRow[]>(),
          supabase
            .from('matches')
            .select('date')
            .eq('club_id', input.clubId)
            .neq('status', 'cancelled')
            .gte('date', matchRange.from)
            .lt('date', matchRange.to)
            .returns<ScheduleMatchDateConflictDbRow[]>(),
        ]);

        if (pollOptions.error) {
          throw new AppError('internal_error', 'Failed to check duplicate schedule poll dates.', {
            cause: pollOptions.error,
          });
        }
        if (matches.error) {
          throw new AppError('internal_error', 'Failed to check duplicate schedule dates.', {
            cause: matches.error,
          });
        }

        const optionDateSet = new Set(optionDates);
        return [
          ...(pollOptions.data ?? []).map((row) => ({
            date: row.option_date,
            source: 'poll' as const,
          })),
          ...(matches.data ?? [])
            .map((row) => getKoreaDateOnly(row.date))
            .filter((date) => optionDateSet.has(date))
            .map((date) => ({
              date,
              source: 'schedule' as const,
            })),
        ];
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

        const poll = await fetchSchedulePollById(supabase, input.pollId);
        const votes = (input.selectedOptionIds.length > 0
          ? input.selectedOptionIds.map((optionId) => ({ optionId, isAvailable: true }))
          : poll.options.map((option) => ({ optionId: option.id, isAvailable: false }))
        ).map((vote) => ({
          poll_id: input.pollId,
          option_id: vote.optionId,
          membership_id: input.membershipId,
          is_available: vote.isAvailable,
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
        const matchDate = toKoreaIsoDateTime(selectedOption.optionDate, poll.commonTime);
        const existingMatch = await findNonCancelledMatchOnKoreaDate(supabase, input.teamId, matchDate);
        if (existingMatch) {
          throw new AppError('conflict', '이미 같은 날짜에 등록된 경기가 있어요.');
        }

        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            club_id: input.teamId,
            season_id: input.seasonId,
            title: poll.title,
            date: matchDate,
            location: poll.location,
            type: 'match',
            status: 'scheduled',
            tactics_completed: false,
            red_leader_confirmed: false,
            blue_leader_confirmed: false,
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

        const attendanceRows = Array.from(
          new Set(
            poll.votes
              .filter((vote) => vote.optionId === input.optionId && vote.isAvailable)
              .map((vote) => vote.membershipId),
          ),
        ).map((membershipId) => ({
          match_id: match.id,
          membership_id: membershipId,
          status: 'attend',
          responded_at: new Date().toISOString(),
        }));

        if (attendanceRows.length > 0) {
          const { error: attendanceError } = await supabase
            .from('attendances')
            .upsert(attendanceRows, { onConflict: 'match_id,membership_id' });

          if (attendanceError) {
            await supabase.from('matches').delete().eq('id', match.id);
            throw new AppError('internal_error', 'Failed to add promoted match attendees.', {
              cause: attendanceError,
            });
          }
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
      async findCurrentMembership(accountId, clubId) {
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
    seasons: {
      async findActiveForTeam(clubId) {
        const { data, error } = await supabase
          .from('seasons')
          .select('id')
          .eq('club_id', clubId)
          .eq('is_active', true)
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle<{ id: string }>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch match active season.', { cause: error });
        }

        return data;
      },
    },
    matches: {
      async listUpcoming(input) {
        const { data, error } = await supabase
          .from('matches')
          .select(MATCH_SELECT)
          .eq('club_id', input.clubId)
          .in('status', ['scheduled', 'locker_room'])
          .gte('date', input.now)
          .order('date', { ascending: true })
          .returns<MatchDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch upcoming matches.', { cause: error });
        }

        return (data ?? []).map(mapMatch);
      },

      async listCalendar(input) {
        const { data, error } = await supabase
          .from('matches')
          .select(MATCH_SELECT)
          .eq('club_id', input.clubId)
          .neq('status', 'cancelled')
          .gte('date', input.from)
          .lt('date', input.to)
          .order('date', { ascending: true })
          .returns<MatchDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch calendar matches.', { cause: error });
        }

        return (data ?? []).map(mapMatch);
      },

      async findNonCancelledMatchOnDate(input) {
        return findNonCancelledMatchOnKoreaDate(supabase, input.clubId, input.date);
      },

      async findMaxRoundBySeason(seasonId) {
        const { data, error } = await supabase
          .from('matches')
          .select('round')
          .eq('season_id', seasonId)
          .not('round', 'is', null)
          .order('round', { ascending: false })
          .limit(1)
          .maybeSingle<{ round: number | null }>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch latest match round.', { cause: error });
        }

        return data?.round ?? null;
      },

      async create(input) {
        const { data, error } = await supabase
          .from('matches')
          .insert({
            club_id: input.clubId,
            season_id: input.seasonId,
            round: input.round,
            title: input.title,
            date: input.date,
            location: input.location,
            type: input.type,
            status: 'scheduled',
            tactics_completed: false,
            red_leader_confirmed: false,
            blue_leader_confirmed: false,
            memo: input.memo,
            created_by: input.createdByMembershipId,
          })
          .select(MATCH_SELECT)
          .single<MatchDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to create match.', { cause: error });
        }

        return mapMatch(data);
      },

      async findById(matchId, teamId) {
        const { data, error } = await supabase
          .from('matches')
          .select(MATCH_SELECT)
          .eq('id', matchId)
          .eq('club_id', teamId)
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

      async updateLineupConfirmation(input) {
        const redLeaderConfirmed = input.teamNumber === 1 ? input.confirmed : input.redLeaderConfirmed;
        const blueLeaderConfirmed = input.teamNumber === 2 ? input.confirmed : input.blueLeaderConfirmed;
        const { data, error } = await supabase
          .from('matches')
          .update({
            red_leader_confirmed: redLeaderConfirmed,
            blue_leader_confirmed: blueLeaderConfirmed,
            tactics_completed: redLeaderConfirmed && blueLeaderConfirmed,
            updated_by: input.updatedByMembershipId,
          })
          .eq('id', input.matchId)
          .select(MATCH_SELECT)
          .single<MatchDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to confirm match lineup.', { cause: error });
        }

        return mapMatch(data);
      },

      async publishLineup(input) {
        const { data, error } = await supabase
          .from('matches')
          .update({
            red_leader_confirmed: true,
            blue_leader_confirmed: true,
            tactics_completed: true,
            updated_by: input.updatedByMembershipId,
          })
          .eq('id', input.matchId)
          .select(MATCH_SELECT)
          .single<MatchDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to publish match lineup.', { cause: error });
        }

        return mapMatch(data);
      },
    },
    attendees: {
      async listForMatch(matchId) {
        return fetchMatchAttendeesByMatchId(supabase, matchId);
      },

      async add(input) {
        const rows = input.membershipIds
          ? input.membershipIds.map((id) => ({
              match_id: input.matchId,
              membership_id: id,
              status: 'attend',
              responded_at: new Date().toISOString(),
            }))
          : [
              {
                match_id: input.matchId,
                membership_id: input.membershipId!,
                status: 'attend',
                responded_at: new Date().toISOString(),
              },
            ];

        const { error } = await supabase
          .from('attendances')
          .upsert(rows, { onConflict: 'match_id,membership_id' });

        if (error) {
          throw new AppError('internal_error', 'Failed to add match attendee.', { cause: error });
        }

        const { error: matchError } = await supabase
          .from('matches')
          .update({
            red_leader_confirmed: false,
            blue_leader_confirmed: false,
            tactics_completed: false,
          })
          .eq('id', input.matchId);

        if (matchError) {
          throw new AppError('internal_error', 'Failed to reset lineup confirmation.', { cause: matchError });
        }

        return fetchMatchAttendeesByMatchId(supabase, input.matchId);
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
            formation_slot: entry.formationSlot ?? null,
          })));

        if (insertError) {
          throw new AppError('internal_error', 'Failed to save match lineup.', { cause: insertError });
        }

        const { error: matchError } = await supabase
          .from('matches')
          .update({
            status: 'locker_room',
            red_leader_confirmed: input.redLeaderConfirmed,
            blue_leader_confirmed: input.blueLeaderConfirmed,
            tactics_completed: input.redLeaderConfirmed && input.blueLeaderConfirmed,
            updated_by: input.updatedByMembershipId,
          })
          .eq('id', input.matchId);

        if (matchError) {
          throw new AppError('internal_error', 'Failed to publish match lineup.', { cause: matchError });
        }

        return fetchMatchLineupByMatchId(supabase, input.matchId);
      },

      async addPick(input) {
        const { error: insertError } = await supabase
          .from('match_teams')
          .insert({
            match_id: input.matchId,
            membership_id: input.membershipId,
            team_number: input.teamNumber,
            is_leader: false,
            position: 'MF',
            formation_slot: input.formationSlot,
          });

        if (insertError) {
          throw new AppError('internal_error', 'Failed to save draft pick.', { cause: insertError });
        }

        const { error: matchError } = await supabase
          .from('matches')
          .update({
            status: 'locker_room',
            red_leader_confirmed: false,
            blue_leader_confirmed: false,
            tactics_completed: false,
          })
          .eq('id', input.matchId);

        if (matchError) {
          throw new AppError('internal_error', 'Failed to update draft state.', { cause: matchError });
        }

        return fetchMatchLineupByMatchId(supabase, input.matchId);
      },
    },
  };
}

function isMissingColumnError(error: { code?: string; message?: string } | null, columnName: string) {
  return error?.code === '42703' && Boolean(error.message?.includes(columnName));
}

const SCHEDULE_POLL_SELECT =
  'id, club_id, season_id, title, status, common_time, location, memo, closes_at, created_by, cancellation_reason, cancelled_at, promoted_match_id, schedule_poll_options(id, poll_id, option_date, sort_order), schedule_poll_votes(id, poll_id, option_id, membership_id, is_available)';

const MATCH_SELECT =
  'id, club_id, season_id, round, title, date, location, type, status, our_score, opp_score, tactics_completed, red_leader_confirmed, blue_leader_confirmed, memo, created_by, cancellation_reason, cancelled_at, feedback_deadline, updated_at';

const MATCH_LINEUP_SELECT =
  'id, match_id, membership_id, team_number, is_leader, position, formation_slot, team_memberships(profile_name, main_position, photo_url, ovr, match_points)';

const MATCH_LINEUP_LEGACY_SELECT =
  'id, match_id, membership_id, team_number, is_leader, position, team_memberships(profile_name, main_position, photo_url, ovr, match_points)';

const MATCH_ATTENDEE_SELECT =
  'match_id, membership_id, status, team_memberships(profile_name, photo_url, ovr, match_points)';

function normalizeStats(value: unknown): UserStats {
  return normalizeUserStats(value);
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

  return mapSchedulePoll(data, await countApprovedMembershipsByClub(supabase, data.club_id));
}

async function countApprovedMembershipsByClub(supabase: SupabaseClient, clubId: string) {
  const { count, error } = await supabase
    .from('team_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('status', 'approved')
    .returns<SchedulePollApprovedMembershipDbRow[]>();

  if (error) {
    throw new AppError('internal_error', 'Failed to count approved schedule poll voters.', { cause: error });
  }

  return count ?? 0;
}

function mapSchedulePoll(row: SchedulePollDbRow, eligibleVoterCount: number): SchedulePollRow {
  return {
    id: row.id,
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
    eligibleVoterCount,
    options: mapSchedulePollOptions(row.schedule_poll_options ?? []),
    votes: mapSchedulePollVotes(row.schedule_poll_votes ?? []),
  };
}

function mapMatch(row: MatchDbRow): MatchRow {
  return {
    id: row.id,
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
    redLeaderConfirmed: row.red_leader_confirmed,
    blueLeaderConfirmed: row.blue_leader_confirmed,
    memo: row.memo,
    createdByMembershipId: row.created_by,
    cancellationReason: row.cancellation_reason ?? null,
    cancelledAt: row.cancelled_at ?? null,
    updatedAt: row.updated_at,
  };
}

async function fetchMatchLineupByMatchId(supabase: SupabaseClient, matchId: string) {
  const result = await supabase
    .from('match_teams')
    .select(MATCH_LINEUP_SELECT)
    .eq('match_id', matchId)
    .order('team_number', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<MatchTeamDbRow[]>();

  if (isMissingColumnError(result.error, 'formation_slot')) {
    const legacyResult = await supabase
      .from('match_teams')
      .select(MATCH_LINEUP_LEGACY_SELECT)
      .eq('match_id', matchId)
      .order('team_number', { ascending: true })
      .order('created_at', { ascending: true })
      .returns<Array<Omit<MatchTeamDbRow, 'formation_slot'>>>();

    if (legacyResult.error) {
      throw new AppError('internal_error', 'Failed to fetch match lineup.', { cause: legacyResult.error });
    }

    return (legacyResult.data ?? []).map((row) => mapMatchLineupEntry({ ...row, formation_slot: null }));
  }

  if (result.error) {
    throw new AppError('internal_error', 'Failed to fetch match lineup.', { cause: result.error });
  }

  return (result.data ?? []).map(mapMatchLineupEntry);
}

async function fetchMatchAttendeesByMatchId(supabase: SupabaseClient, matchId: string) {
  const { data, error } = await supabase
    .from('attendances')
    .select(MATCH_ATTENDEE_SELECT)
    .eq('match_id', matchId)
    .eq('status', 'attend')
    .order('created_at', { ascending: true })
    .returns<MatchAttendeeDbRow[]>();

  if (error) {
    throw new AppError('internal_error', 'Failed to fetch match attendees.', { cause: error });
  }

  return (data ?? []).map((row) => ({
    matchId: row.match_id,
    membershipId: row.membership_id,
    status: 'attend' as const,
    playerName: row.team_memberships?.profile_name || '이름 없는 선수',
    playerOvr: row.team_memberships?.ovr ?? 60,
    playerPhotoUrl: row.team_memberships?.photo_url ?? null,
    matchPoints: row.team_memberships?.match_points ?? 0,
  }));
}

function mapMatchLineupEntry(row: MatchTeamDbRow): MatchLineupEntryRow {
  return {
    id: row.id,
    matchId: row.match_id,
    membershipId: row.membership_id,
    teamNumber: row.team_number,
    isLeader: row.is_leader,
    position: row.position === 'FW' || row.position === 'MF' || row.position === 'DF' ? row.position : 'MF',
    formationSlot: typeof row.formation_slot === 'number' ? row.formation_slot : null,
    playerName: row.team_memberships?.profile_name || '이름 없는 선수',
    playerPosition: row.team_memberships?.main_position ?? null,
    playerOvr: row.team_memberships?.ovr ?? 60,
    playerPhotoUrl: row.team_memberships?.photo_url ?? null,
    playerMatchPoints: row.team_memberships?.match_points ?? 0,
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

function getKoreaDateRange(value: string) {
  const date = value.slice(0, 10);
  const [year, month, day] = date.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const next = [
    nextDate.getUTCFullYear(),
    String(nextDate.getUTCMonth() + 1).padStart(2, '0'),
    String(nextDate.getUTCDate()).padStart(2, '0'),
  ].join('-');

  return {
    from: `${date}T00:00:00+09:00`,
    to: `${next}T00:00:00+09:00`,
  };
}

function getKoreaDateRangeForDates(dates: string[]) {
  const sorted = [...dates].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return {
    from: `${first}T00:00:00+09:00`,
    to: getKoreaDateRange(last).to,
  };
}

function getKoreaDateOnly(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

async function findNonCancelledMatchOnKoreaDate(
  supabase: SupabaseClient,
  clubId: string,
  date: string,
) {
  const range = getKoreaDateRange(date);
  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('club_id', clubId)
    .eq('type', 'match')
    .neq('status', 'cancelled')
    .gte('date', range.from)
    .lt('date', range.to)
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle<MatchDbRow>();

  if (error) {
    throw new AppError('internal_error', 'Failed to check duplicate match date.', { cause: error });
  }

  return data ? mapMatch(data) : null;
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
