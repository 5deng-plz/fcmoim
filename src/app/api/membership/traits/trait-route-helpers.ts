import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../../../types/api';
import type { UserStats } from '../../../../types';
import { normalizeUserStats } from '../../../../utils/stats';

type PreferredFootCode = 'left' | 'right' | 'both';

type MembershipTraitDbRow = {
  id: string;
  account_id: string;
  club_id: string;
  role: 'admin' | 'operator' | 'member';
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'withdrawn';
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
  preferred_foot: PreferredFootCode;
};

export async function fetchMembershipTraitState(
  supabase: SupabaseClient,
  accountId: string,
  clubId: string,
) {
  const { data: membership, error: membershipError } = await supabase
    .from('team_memberships')
    .select('id, account_id, club_id, role, status, profile_name, main_position, height, weight, birth, residence, photo_url, ovr, stats, match_points, selected_trait_id, preferred_foot')
    .eq('account_id', accountId)
    .eq('club_id', clubId)
    .eq('status', 'approved')
    .single<MembershipTraitDbRow>();

  if (membershipError) {
    throw new AppError('not_found', 'Approved membership was not found.', { cause: membershipError });
  }

  const unlockedTraitIds = await fetchUnlockedTraitIds(supabase, membership.id);

  return {
    membership: {
      id: membership.id,
      accountId: membership.account_id,
      clubId: membership.club_id,
      role: membership.role,
      status: membership.status,
      nickname: membership.profile_name,
      position: membership.main_position,
      heightCm: membership.height,
      weightKg: membership.weight,
      birthDate: membership.birth,
      residence: membership.residence,
      photoUrl: membership.photo_url,
      ovr: membership.ovr,
      stats: normalizeUserStats(membership.stats) as UserStats,
      matchPoints: membership.match_points,
      selectedTraitId: membership.selected_trait_id,
      unlockedTraitIds,
      preferredFoot: membership.preferred_foot,
    },
    unlockedTraitIds,
  };
}

export async function fetchUnlockedTraitIds(supabase: SupabaseClient, membershipId: string) {
  const { data, error } = await supabase
    .from('unlocked_traits')
    .select('trait_id')
    .eq('membership_id', membershipId)
    .returns<Array<{ trait_id: string }>>();

  if (error) {
    throw new AppError('internal_error', 'Failed to fetch unlocked traits.', { cause: error });
  }

  return (data ?? []).map((row) => row.trait_id);
}
