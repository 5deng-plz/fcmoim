import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../types/api';
import { createPrivilegedSupabaseClient } from '../lib/supabase-server';
import type {
  AccountRow,
  NormalizedJoinProfile,
  SchedulePollOptionRow,
  SchedulePollRow,
  SchedulePollStatus,
  SchedulePollVoteRow,
  TeamMembershipRow,
} from '../types/domain';
import type { AccountMembershipRepositories } from './account-membership';
import type { MatchResultRepositories } from './match-results';
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
};

type AccountDbRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
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
  promoted_match_id: string | null;
  schedule_poll_options?: SchedulePollOptionDbRow[] | null;
  schedule_poll_votes?: SchedulePollVoteDbRow[] | null;
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
          .eq('status', 'open')
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

const MEMBERSHIP_SELECT =
  'id, account_id, club_id, role, status, profile_name, main_position, height, weight, birth, photo_url';

const SCHEDULE_POLL_SELECT =
  'id, club_id, season_id, title, status, common_time, location, memo, closes_at, created_by, promoted_match_id, schedule_poll_options(id, poll_id, option_date, sort_order), schedule_poll_votes(id, poll_id, option_id, membership_id, is_available)';

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
    promotedMatchId: row.promoted_match_id,
    options: mapSchedulePollOptions(row.schedule_poll_options ?? []),
    votes: mapSchedulePollVotes(row.schedule_poll_votes ?? []),
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
