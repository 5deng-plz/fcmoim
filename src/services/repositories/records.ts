import type { SupabaseClient } from '@supabase/supabase-js';

import { AppError } from '../../types/api';

import type { UserStats } from '../../types';

import { normalizeUserStats } from '../../utils/stats';

import { createPrivilegedSupabaseClient } from '../../lib/supabase-server';

import type { MatchEventType, MatchLineupEntryRow, MatchLineupTeamNumber, MatchRow, MatchStatus, TeamMembershipRow } from '../../types/domain';

import type { MatchFeedbackRepositories } from '../match-feedback';

import type { RecordsRepositories } from '../records';

type AnnouncementMembershipDbRow = {
  id: string;
  club_id: string;
  role: TeamMembershipRow['role'];
  status: TeamMembershipRow['status'];
};

type RecordsAttendanceDbRow = {
  match_id: string;
  membership_id: string;
};

type RecordsPlayerStatDbRow = {
  membership_id: string;
  goals: number;
  assists: number;
  is_mom: boolean;
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

type MatchFeedbackVoteDbRow = {
  voter_membership_id: string;
  candidate_membership_id: string;
};

type MatchPeerRatingDbRow = {
  rater_membership_id: string;
  ratee_membership_id: string;
  rating: number;
  badges: string[];
};

export function createSupabaseRecordsRepositories(
  supabase: SupabaseClient,
): RecordsRepositories {
  return {
    memberships: {
      async findCurrentMembership(accountId, clubId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select('id, club_id, role, status')
          .eq('account_id', accountId)
          .eq('club_id', clubId)
          .maybeSingle<AnnouncementMembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch records membership.', { cause: error });
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

      async listApproved(clubId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select('id, profile_name, photo_url, main_position, preferred_foot, selected_trait_id, stats, ovr')
          .eq('club_id', clubId)
          .eq('status', 'approved')
          .returns<Array<{
            id: string;
            profile_name: string;
            photo_url: string | null;
            main_position: TeamMembershipRow['position'];
            preferred_foot: TeamMembershipRow['preferredFoot'];
            selected_trait_id: string | null;
            stats: unknown;
            ovr: number;
          }>>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch records memberships.', { cause: error });
        }

        return (data ?? []).map((member) => ({
          id: member.id,
          nickname: member.profile_name,
          photoUrl: member.photo_url,
          position: member.main_position,
          preferredFoot: member.preferred_foot,
          selectedTraitId: member.selected_trait_id,
          stats: normalizeStats(member.stats),
          ovr: member.ovr,
        }));
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
          throw new AppError('internal_error', 'Failed to fetch records active season.', { cause: error });
        }

        return data;
      },
    },
    matches: {
      async listFinishedBySeason(clubId, seasonId) {
        const { data, error } = await supabase
          .from('matches')
          .select('id, club_id, season_id, round, title, date, location, type, status, our_score, opp_score, tactics_completed, red_leader_confirmed, blue_leader_confirmed, memo, created_by, cancellation_reason, cancelled_at, updated_at')
          .eq('club_id', clubId)
          .eq('season_id', seasonId)
          .eq('status', 'finished')
          .returns<MatchDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch records matches.', { cause: error });
        }

        return (data ?? []).map((match) => ({
          id: match.id,
          location: match.location,
          ourScore: match.our_score,
          oppScore: match.opp_score,
        }));
      },
    },
    attendances: {
      async listAttendingByMatchIds(matchIds) {
        const { data, error } = await supabase
          .from('attendances')
          .select('match_id, membership_id')
          .in('match_id', matchIds)
          .eq('status', 'attend')
          .returns<RecordsAttendanceDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch records attendances.', { cause: error });
        }

        return (data ?? []).map((attendance) => ({
          matchId: attendance.match_id,
          membershipId: attendance.membership_id,
        }));
      },
    },
    playerStats: {
      async listByMatchIds(matchIds) {
        const { data, error } = await supabase
          .from('player_stats')
          .select('membership_id, goals, assists, is_mom')
          .in('match_id', matchIds)
          .returns<RecordsPlayerStatDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch records player stats.', { cause: error });
        }

        return (data ?? []).map((stat) => ({
          membershipId: stat.membership_id,
          goals: stat.goals,
          assists: stat.assists,
          isMom: stat.is_mom,
        }));
      },
    },
  };
}

export function createSupabaseMatchFeedbackRepositories(
  supabase: SupabaseClient,
  getPrivilegedClient: () => SupabaseClient = createPrivilegedSupabaseClient,
): MatchFeedbackRepositories {
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
          throw new AppError('internal_error', 'Failed to fetch feedback membership.', { cause: error });
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
      async findById(matchId, teamId) {
        const { data, error } = await supabase
          .from('matches')
          .select(MATCH_SELECT)
          .eq('id', matchId)
          .eq('club_id', teamId)
          .maybeSingle<MatchDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch feedback match.', { cause: error });
        }

        return data ? mapFeedbackMatch(data) : null;
      },
    },
    participants: {
      async listForMatch(matchId) {
        const lineup = await fetchMatchLineupByMatchId(supabase, matchId);
        if (lineup.length > 0) {
          return lineup.map((entry) => ({
            membershipId: entry.membershipId,
            playerName: entry.playerName,
            playerPhotoUrl: entry.playerPhotoUrl,
            playerOvr: entry.playerOvr,
          }));
        }

        const attendees = await fetchMatchAttendeesByMatchId(supabase, matchId);
        return attendees.map((attendee) => ({
          membershipId: attendee.membershipId,
          playerName: attendee.playerName,
          playerPhotoUrl: attendee.playerPhotoUrl,
          playerOvr: attendee.playerOvr,
        }));
      },
    },
    feedback: {
      async listMvpVotes(matchId) {
        const { data, error } = await supabase
          .from('match_mvp_votes')
          .select('voter_membership_id, candidate_membership_id')
          .eq('match_id', matchId)
          .returns<MatchFeedbackVoteDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch MVP votes.', { cause: error });
        }

        return (data ?? []).map((vote) => ({
          voterMembershipId: vote.voter_membership_id,
          candidateMembershipId: vote.candidate_membership_id,
        }));
      },

      async listPeerRatings(matchId) {
        const { data, error } = await supabase
          .from('match_peer_ratings')
          .select('rater_membership_id, ratee_membership_id, rating, badges')
          .eq('match_id', matchId)
          .returns<MatchPeerRatingDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch peer ratings.', { cause: error });
        }

        return (data ?? []).map((rating) => ({
          raterMembershipId: rating.rater_membership_id,
          rateeMembershipId: rating.ratee_membership_id,
          rating: Number(rating.rating),
          badges: Array.isArray(rating.badges) ? rating.badges : [],
        }));
      },

      async upsertMvpVote(input) {
        const { error } = await supabase
          .from('match_mvp_votes')
          .upsert({
            match_id: input.matchId,
            voter_membership_id: input.voterMembershipId,
            candidate_membership_id: input.candidateMembershipId,
            created_at: new Date().toISOString(),
          }, { onConflict: 'match_id,voter_membership_id' });

        if (error) {
          throw new AppError('internal_error', 'Failed to save MVP vote.', { cause: error });
        }
      },

      async upsertPeerRatings(input) {
        const { error } = await supabase
          .from('match_peer_ratings')
          .upsert(input.ratings.map((rating) => ({
            match_id: input.matchId,
            rater_membership_id: input.raterMembershipId,
            ratee_membership_id: rating.rateeMembershipId,
            rating: rating.rating,
            badges: rating.badges,
            created_at: new Date().toISOString(),
          })), { onConflict: 'match_id,rater_membership_id,ratee_membership_id' });

        if (error) {
          throw new AppError('internal_error', 'Failed to save peer ratings.', { cause: error });
        }
      },

      async settle(input) {
        const privilegedSupabase = getPrivilegedClient();
        const ratingByMembershipId = new Map(input.ratingAverages.map((rating) => [
          rating.membershipId,
          rating.averageRating,
        ]));
        const affectedMembershipIds = [...new Set([
          ...ratingByMembershipId.keys(),
          ...(input.winnerMembershipId ? [input.winnerMembershipId] : []),
        ])];

        if (affectedMembershipIds.length > 0) {
          const { data: existingStats, error: statsError } = await privilegedSupabase
            .from('player_stats')
            .select('membership_id, goals, assists')
            .eq('match_id', input.matchId)
            .in('membership_id', affectedMembershipIds)
            .returns<Array<{ membership_id: string; goals: number; assists: number }>>();

          if (statsError) {
            throw new AppError('internal_error', 'Failed to fetch settled player stats.', { cause: statsError });
          }

          const baseByMembershipId = new Map((existingStats ?? []).map((stat) => [stat.membership_id, stat]));
          const { error: upsertError } = await privilegedSupabase
            .from('player_stats')
            .upsert(affectedMembershipIds.map((membershipId) => {
              const existing = baseByMembershipId.get(membershipId);
              return {
                match_id: input.matchId,
                membership_id: membershipId,
                goals: existing?.goals ?? 0,
                assists: existing?.assists ?? 0,
                is_mom: input.winnerMembershipId === membershipId,
                ai_rating: ratingByMembershipId.get(membershipId) ?? null,
              };
            }), { onConflict: 'match_id,membership_id' });

          if (upsertError) {
            throw new AppError('internal_error', 'Failed to settle player feedback stats.', { cause: upsertError });
          }
        }

        const pointRows = [
          ...(input.winnerMembershipId
            ? [{
                membership_id: input.winnerMembershipId,
                amount: 50,
                reason: 'mvp_award',
                source_type: 'mvp_award',
                source_id: input.matchId,
              }]
            : []),
          ...input.participationMembershipIds.map((membershipId) => ({
            membership_id: membershipId,
            amount: 30,
            reason: 'feedback_participation',
            source_type: 'feedback_participation',
            source_id: input.matchId,
          })),
        ];
        const { data: existingLedger, error: existingLedgerError } = await privilegedSupabase
          .from('point_ledger')
          .select('membership_id, amount')
          .eq('source_id', input.matchId)
          .in('source_type', ['mvp_award', 'feedback_participation'])
          .returns<Array<{ membership_id: string; amount: number }>>();

        if (existingLedgerError) {
          throw new AppError('internal_error', 'Failed to fetch feedback point ledger.', { cause: existingLedgerError });
        }

        const pointAdjustments = new Map<string, number>();
        for (const row of existingLedger ?? []) {
          pointAdjustments.set(row.membership_id, (pointAdjustments.get(row.membership_id) ?? 0) - row.amount);
        }
        for (const row of pointRows) {
          pointAdjustments.set(row.membership_id, (pointAdjustments.get(row.membership_id) ?? 0) + row.amount);
        }

        const { error: clearLedgerError } = await privilegedSupabase
          .from('point_ledger')
          .delete()
          .eq('source_id', input.matchId)
          .in('source_type', ['mvp_award', 'feedback_participation']);

        if (clearLedgerError) {
          throw new AppError('internal_error', 'Failed to clear feedback point ledger.', { cause: clearLedgerError });
        }

        if (pointRows.length > 0) {
          const { error: ledgerError } = await privilegedSupabase
            .from('point_ledger')
            .insert(pointRows);

          if (ledgerError) {
            throw new AppError('internal_error', 'Failed to settle feedback points.', { cause: ledgerError });
          }
        }

        const adjustedMembershipIds = [...pointAdjustments.entries()]
          .filter(([, delta]) => delta !== 0)
          .map(([membershipId]) => membershipId);
        if (adjustedMembershipIds.length > 0) {
          const { data: memberships, error: membershipError } = await privilegedSupabase
            .from('team_memberships')
            .select('id, match_points')
            .in('id', adjustedMembershipIds)
            .returns<Array<{ id: string; match_points: number }>>();

          if (membershipError) {
            throw new AppError('internal_error', 'Failed to fetch feedback point memberships.', { cause: membershipError });
          }

          for (const membership of memberships ?? []) {
            const delta = pointAdjustments.get(membership.id) ?? 0;
            const { error: updateError } = await privilegedSupabase
              .from('team_memberships')
              .update({
                match_points: Math.max(0, membership.match_points + delta),
                updated_at: new Date().toISOString(),
              })
              .eq('id', membership.id);

            if (updateError) {
              throw new AppError('internal_error', 'Failed to update feedback match points.', { cause: updateError });
            }
          }
        }
      },
    },
  };
}

function isMissingColumnError(error: { code?: string; message?: string } | null, columnName: string) {
  return error?.code === '42703' && Boolean(error.message?.includes(columnName));
}

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

function mapFeedbackMatch(row: MatchDbRow): MatchRow & { feedbackDeadline: string | null } {
  return {
    ...mapMatch(row),
    feedbackDeadline: row.feedback_deadline,
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
