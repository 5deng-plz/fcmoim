import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../types/api';
import type { UserStats } from '../../types';
import { normalizeUserStats } from '../../utils/stats';
import { createPrivilegedSupabaseClient } from '../../lib/supabase-server';
import type {
  AccountRow,
  AnnouncementRow,
  EventCommentRow,
  EventCommentTargetType,
  MatchEventType,
  MatchLineupEntryRow,
  MatchLineupTeamNumber,
  MatchRow,
  MatchStatus,
  MembershipProfilePatch,
  NormalizedJoinProfile,
  PendingMembershipReviewRow,
  TeamProfile,
  TeamProfileDetail,
  PublicMatchSummaryRow,
  PublicSeasonSummaryRow,
  SchedulePollOptionRow,
  SchedulePollRow,
  SchedulePollStatus,
  SchedulePollVoteRow,
  TeamMembershipRow,
} from '../../types/domain';
import type { AnnouncementRepositories } from '../announcements';
import type { AccountMembershipRepositories } from '../account-membership';
import type { ClubAdminRepositories } from '../club-admin';
import type { CommentRepositories } from '../comments';
import type { FeedContentType, FeedPostRepositories, FeedReactionType } from '../feed-posts';
import type { MatchFeedbackRepositories } from '../match-feedback';
import type { MatchResultRepositories } from '../match-results';
import type { MatchRepositories } from '../matches';
import type { PublicClubRepositories } from '../public-clubs';
import type { RecordsRepositories } from '../records';
import type { SchedulePollRepositories } from '../schedule-polls';

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
  residence: string | null;
  photo_url: string | null;
  ovr: number;
  stats: unknown;
  match_points: number;
  selected_trait_id: string | null;
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

type AnnouncementMembershipDbRow = {
  id: string;
  club_id: string;
  role: TeamMembershipRow['role'];
  status: TeamMembershipRow['status'];
};

type AnnouncementDbRow = {
  id: string;
  club_id: string;
  season_id: string | null;
  title: string;
  content: string;
  author_membership_id: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
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

type EventCommentDbRow = {
  id: string;
  target_type: EventCommentTargetType;
  target_id: string;
  membership_id: string;
  content: string;
  created_at: string;
  team_memberships: {
    profile_name: string;
  } | null;
};

type FeedPostDbRow = {
  id: string;
  club_id: string;
  membership_id: string;
  match_id: string | null;
  content_type: FeedContentType;
  text_content: string | null;
  media_url: string | null;
  created_at: string;
  updated_at: string;
  team_memberships: {
    profile_name: string;
  } | null;
};

type FeedReactionDbRow = {
  post_id: string;
  membership_id: string;
  reaction_type: FeedReactionType;
};

type FeedCommentCountDbRow = {
  target_id: string;
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
      async findCurrentMembership(accountId, clubId) {
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
      async findById(membershipId, teamId) {
        const { data, error } = await supabase
          .from('team_memberships')
          .select(MEMBERSHIP_SELECT)
          .eq('id', membershipId)
          .eq('club_id', teamId)
          .maybeSingle<MembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch membership.', { cause: error });
        }

        return data ? mapMembership(data) : null;
      },
      async listPendingForTeam(clubId) {
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
      async listApprovedForTeam(clubId) {
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
        return this.updateProfile({
          membershipId: input.membershipId,
          profile: { photoUrl: input.photoUrl },
        });
      },
      async updateProfile(input) {
        const payload = toMembershipProfilePatch(input.profile);
        const { data, error } = await supabase
          .from('team_memberships')
          .update(payload)
          .eq('id', input.membershipId)
          .select(MEMBERSHIP_SELECT)
          .single<MembershipDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to update membership profile.', { cause: error });
        }

        return mapMembership(data);
      },
      async listUnlockedTraitIds(membershipId) {
        const { data, error } = await supabase
          .from('unlocked_traits')
          .select('trait_id')
          .eq('membership_id', membershipId)
          .returns<Array<{ trait_id: string }>>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch unlocked traits.', { cause: error });
        }

        return (data ?? []).map((row) => row.trait_id);
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

export function createSupabaseAnnouncementRepositories(
  supabase: SupabaseClient,
): AnnouncementRepositories {
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
          throw new AppError('internal_error', 'Failed to fetch announcement membership.', { cause: error });
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
    announcements: {
      async listForTeam(clubId) {
        const { data, error } = await supabase
          .from('announcements')
          .select(ANNOUNCEMENT_SELECT)
          .eq('club_id', clubId)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .returns<AnnouncementDbRow[]>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch announcements.', { cause: error });
        }

        return (data ?? []).map(mapAnnouncement);
      },

      async findById(announcementId, teamId) {
        const { data, error } = await supabase
          .from('announcements')
          .select(ANNOUNCEMENT_SELECT)
          .eq('id', announcementId)
          .eq('club_id', teamId)
          .maybeSingle<AnnouncementDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch announcement.', { cause: error });
        }

        return data ? mapAnnouncement(data) : null;
      },

      async create(input) {
        const { data, error } = await supabase
          .from('announcements')
          .insert({
            club_id: input.clubId,
            season_id: input.seasonId,
            title: input.title,
            content: input.content,
            author_membership_id: input.authorMembershipId,
            is_pinned: input.isPinned,
          })
          .select(ANNOUNCEMENT_SELECT)
          .single<AnnouncementDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to create announcement.', { cause: error });
        }

        return mapAnnouncement(data);
      },

      async update(input) {
        const { data, error } = await supabase
          .from('announcements')
          .update({
            title: input.title,
            content: input.content,
            is_pinned: input.isPinned,
          })
          .eq('id', input.announcementId)
          .select(ANNOUNCEMENT_SELECT)
          .single<AnnouncementDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to update announcement.', { cause: error });
        }

        return mapAnnouncement(data);
      },

      async delete(announcementId) {
        const { error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', announcementId);

        if (error) {
          throw new AppError('internal_error', 'Failed to delete announcement.', { cause: error });
        }
      },
    },
  };
}

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

export function createSupabaseFeedPostRepositories(
  supabase: SupabaseClient,
): FeedPostRepositories {
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
          throw new AppError('internal_error', 'Failed to fetch feed membership.', { cause: error });
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
      async findClubId(matchId) {
        const { data, error } = await supabase
          .from('matches')
          .select('club_id')
          .eq('id', matchId)
          .maybeSingle<{ club_id: string }>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch feed match target.', { cause: error });
        }

        return data?.club_id ?? null;
      },
    },
    posts: {
      async list(input) {
        let query = supabase
          .from('feed_posts')
          .select(FEED_POST_SELECT)
          .eq('club_id', input.clubId)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.contentType) {
          query = query.eq('content_type', input.contentType);
        }

        const { data, error } = await query.returns<FeedPostDbRow[]>();
        if (error) {
          throw new AppError('internal_error', 'Failed to fetch feed posts.', { cause: error });
        }

        return hydrateFeedPosts(supabase, data ?? [], input.membershipId);
      },

      async create(input) {
        const { data, error } = await supabase
          .from('feed_posts')
          .insert({
            club_id: input.clubId,
            membership_id: input.membershipId,
            match_id: input.matchId,
            content_type: input.contentType,
            text_content: input.textContent,
            media_url: input.mediaUrl,
          })
          .select(FEED_POST_SELECT)
          .single<FeedPostDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to create feed post.', { cause: error });
        }

        return (await hydrateFeedPosts(supabase, [data], input.membershipId))[0];
      },

      async findById(postId, teamId) {
        const { data, error } = await supabase
          .from('feed_posts')
          .select('id, club_id, membership_id')
          .eq('id', postId)
          .eq('club_id', teamId)
          .maybeSingle<{ id: string; club_id: string; membership_id: string }>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch feed post.', { cause: error });
        }

        return data ? { id: data.id, clubId: data.club_id, membershipId: data.membership_id } : null;
      },

      async delete(postId) {
        const { error } = await supabase
          .from('feed_posts')
          .delete()
          .eq('id', postId);

        if (error) {
          throw new AppError('internal_error', 'Failed to delete feed post.', { cause: error });
        }
      },
    },
    reactions: {
      async toggle(input) {
        const { data, error } = await supabase
          .from('feed_reactions')
          .select('id')
          .eq('post_id', input.postId)
          .eq('membership_id', input.membershipId)
          .eq('reaction_type', input.reactionType)
          .maybeSingle<{ id: string }>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch feed reaction.', { cause: error });
        }

        if (data) {
          const { error: deleteError } = await supabase
            .from('feed_reactions')
            .delete()
            .eq('id', data.id);

          if (deleteError) {
            throw new AppError('internal_error', 'Failed to delete feed reaction.', { cause: deleteError });
          }
          return;
        }

        const { error: insertError } = await supabase
          .from('feed_reactions')
          .insert({
            post_id: input.postId,
            membership_id: input.membershipId,
            reaction_type: input.reactionType,
          });

        if (insertError) {
          throw new AppError('internal_error', 'Failed to create feed reaction.', { cause: insertError });
        }
      },
    },
  };
}

export function createSupabaseCommentRepositories(
  supabase: SupabaseClient,
): CommentRepositories {
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
          throw new AppError('internal_error', 'Failed to fetch comment membership.', { cause: error });
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
    targets: {
      async findClubId(targetType, targetId) {
        if (targetType === 'match') {
          const { data, error } = await supabase
            .from('matches')
            .select('club_id')
            .eq('id', targetId)
            .maybeSingle<{ club_id: string }>();

          if (error) {
            throw new AppError('internal_error', 'Failed to fetch comment match target.', { cause: error });
          }

          return data?.club_id ?? null;
        }

        if (targetType === 'feed_post') {
          const { data, error } = await supabase
            .from('feed_posts')
            .select('club_id')
            .eq('id', targetId)
            .maybeSingle<{ club_id: string }>();

          if (error) {
            throw new AppError('internal_error', 'Failed to fetch comment feed target.', { cause: error });
          }

          return data?.club_id ?? null;
        }

        const { data, error } = await supabase
          .from('schedule_poll_options')
          .select('schedule_polls(club_id)')
          .eq('id', targetId)
          .maybeSingle<{ schedule_polls: { club_id: string } | null }>();

        if (error) {
          throw new AppError('internal_error', 'Failed to fetch comment poll option target.', { cause: error });
        }

        return data?.schedule_polls?.club_id ?? null;
      },
    },
    comments: {
      async listForTarget(input) {
        return fetchEventCommentsByTarget(supabase, input.targetType, input.targetId);
      },

      async create(input) {
        const { data, error } = await supabase
          .from('comments')
          .insert({
            target_type: input.targetType,
            target_id: input.targetId,
            membership_id: input.membershipId,
            content: input.content,
          })
          .select(EVENT_COMMENT_SELECT)
          .single<EventCommentDbRow>();

        if (error) {
          throw new AppError('internal_error', 'Failed to create event comment.', { cause: error });
        }

        return mapEventComment(data);
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

const MEMBERSHIP_SELECT =
  'id, account_id, club_id, role, status, profile_name, main_position, height, weight, birth, residence, photo_url, ovr, stats, match_points, selected_trait_id, preferred_foot';

const SCHEDULE_POLL_SELECT =
  'id, club_id, season_id, title, status, common_time, location, memo, closes_at, created_by, cancellation_reason, cancelled_at, promoted_match_id, schedule_poll_options(id, poll_id, option_date, sort_order), schedule_poll_votes(id, poll_id, option_id, membership_id, is_available)';

const ANNOUNCEMENT_SELECT =
  'id, club_id, season_id, title, content, author_membership_id, is_pinned, created_at, updated_at';

const MATCH_SELECT =
  'id, club_id, season_id, round, title, date, location, type, status, our_score, opp_score, tactics_completed, red_leader_confirmed, blue_leader_confirmed, memo, created_by, cancellation_reason, cancelled_at, feedback_deadline, updated_at';

const MATCH_LINEUP_SELECT =
  'id, match_id, membership_id, team_number, is_leader, position, formation_slot, team_memberships(profile_name, main_position, photo_url, ovr, match_points)';
const MATCH_LINEUP_LEGACY_SELECT =
  'id, match_id, membership_id, team_number, is_leader, position, team_memberships(profile_name, main_position, photo_url, ovr, match_points)';

const MATCH_ATTENDEE_SELECT =
  'match_id, membership_id, status, team_memberships(profile_name, photo_url, ovr, match_points)';

const EVENT_COMMENT_SELECT =
  'id, target_type, target_id, membership_id, content, created_at, team_memberships(profile_name)';

const FEED_POST_SELECT =
  'id, club_id, membership_id, match_id, content_type, text_content, media_url, created_at, updated_at, team_memberships(profile_name)';

function mapMembership(row: MembershipDbRow): TeamMembershipRow {
  return {
    id: row.id,
    accountId: row.account_id,
    role: row.role,
    status: row.status,
    nickname: row.profile_name,
    position: row.main_position,
    heightCm: row.height,
    weightKg: row.weight,
    birthDate: row.birth,
    residence: row.residence,
    photoUrl: row.photo_url,
    ovr: row.ovr,
    stats: normalizeStats(row.stats),
    matchPoints: row.match_points,
    selectedTraitId: row.selected_trait_id,
    preferredFoot: row.preferred_foot,
  };
}

function normalizeStats(value: unknown): UserStats {
  return normalizeUserStats(value);
}

function mapPendingMembership(row: PendingMembershipDbRow): PendingMembershipReviewRow {
  return {
    id: row.id,
    accountId: row.account_id,
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
    residence: input.profile.residence,
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
  if (input.profile.stats) {
    payload.stats = input.profile.stats;
  }
  if (typeof input.profile.ovr === 'number' && input.profile.ovr !== null) {
    payload.ovr = input.profile.ovr;
  }

  return payload;
}

function toMembershipProfilePatch(profile: MembershipProfilePatch) {
  const payload: Record<string, unknown> = {};

  if ('nickname' in profile) payload.profile_name = profile.nickname;
  if ('heightCm' in profile) payload.height = profile.heightCm;
  if ('weightKg' in profile) payload.weight = profile.weightKg;
  if ('birthDate' in profile) payload.birth = profile.birthDate;
  if ('residence' in profile) payload.residence = profile.residence;
  if ('photoUrl' in profile) payload.photo_url = profile.photoUrl;
  if ('preferredFoot' in profile && profile.preferredFoot) payload.preferred_foot = profile.preferredFoot;
  if ('stats' in profile && profile.stats) payload.stats = profile.stats;
  if ('ovr' in profile && typeof profile.ovr === 'number') payload.ovr = profile.ovr;

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

function mapAnnouncement(row: AnnouncementDbRow): AnnouncementRow {
  return {
    id: row.id,
    seasonId: row.season_id,
    title: row.title,
    content: row.content,
    authorMembershipId: row.author_membership_id,
    isPinned: row.is_pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

async function fetchEventCommentsByTarget(
  supabase: SupabaseClient,
  targetType: EventCommentTargetType,
  targetId: string,
) {
  const { data, error } = await supabase
    .from('comments')
    .select(EVENT_COMMENT_SELECT)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: true })
    .returns<EventCommentDbRow[]>();

  if (error) {
    throw new AppError('internal_error', 'Failed to fetch event comments.', { cause: error });
  }

  return (data ?? []).map(mapEventComment);
}

function mapEventComment(row: EventCommentDbRow): EventCommentRow {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    membershipId: row.membership_id,
    authorName: row.team_memberships?.profile_name || '알 수 없는 멤버',
    content: row.content,
    createdAt: row.created_at,
  };
}

async function hydrateFeedPosts(
  supabase: SupabaseClient,
  rows: FeedPostDbRow[],
  membershipId: string,
) {
  const postIds = rows.map((row) => row.id);
  if (postIds.length === 0) return [];

  const [{ data: reactions, error: reactionsError }, { data: comments, error: commentsError }] = await Promise.all([
    supabase
      .from('feed_reactions')
      .select('post_id, membership_id, reaction_type')
      .in('post_id', postIds)
      .returns<FeedReactionDbRow[]>(),
    supabase
      .from('comments')
      .select('target_id')
      .eq('target_type', 'feed_post')
      .in('target_id', postIds)
      .returns<FeedCommentCountDbRow[]>(),
  ]);

  if (reactionsError) {
    throw new AppError('internal_error', 'Failed to fetch feed reactions.', { cause: reactionsError });
  }
  if (commentsError) {
    throw new AppError('internal_error', 'Failed to fetch feed comment counts.', { cause: commentsError });
  }

  const reactionsByPostId = new Map<string, FeedReactionDbRow[]>();
  for (const reaction of reactions ?? []) {
    const list = reactionsByPostId.get(reaction.post_id) ?? [];
    list.push(reaction);
    reactionsByPostId.set(reaction.post_id, list);
  }

  const commentCounts = new Map<string, number>();
  for (const comment of comments ?? []) {
    commentCounts.set(comment.target_id, (commentCounts.get(comment.target_id) ?? 0) + 1);
  }

  return rows.map((row) => {
    const postReactions = reactionsByPostId.get(row.id) ?? [];
    const reactionCounts = {
      up: 0,
      down: 0,
      check: 0,
      smile: 0,
      sad: 0,
    } satisfies Record<FeedReactionType, number>;

    for (const reaction of postReactions) {
      if (reaction.reaction_type in reactionCounts) {
        reactionCounts[reaction.reaction_type] += 1;
      }
    }

    return {
      id: row.id,
      clubId: row.club_id,
      membershipId: row.membership_id,
      authorName: row.team_memberships?.profile_name || '알 수 없는 멤버',
      matchId: row.match_id,
      contentType: row.content_type,
      textContent: row.text_content,
      mediaUrl: row.media_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reactionCounts,
      myReactions: postReactions
        .filter((reaction) => reaction.membership_id === membershipId)
        .map((reaction) => reaction.reaction_type),
      commentCount: commentCounts.get(row.id) ?? 0,
    };
  });
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
