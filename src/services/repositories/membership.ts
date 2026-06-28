import type { SupabaseClient } from '@supabase/supabase-js';

import { AppError } from '../../types/api';

import type { UserStats } from '../../types';

import { normalizeUserStats } from '../../utils/stats';

import type { AccountRow, MembershipProfilePatch, NormalizedJoinProfile, PendingMembershipReviewRow, TeamMembershipRow } from '../../types/domain';

import type { AccountMembershipRepositories } from '../account-membership';

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

const MEMBERSHIP_SELECT =
  'id, account_id, club_id, role, status, profile_name, main_position, height, weight, birth, residence, photo_url, ovr, stats, match_points, selected_trait_id, preferred_foot';

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
