import { AppError, appErrorResponse } from '../../../../../types/api';
import { getServerTeamId } from '@/config/server-team';
import { createPrivilegedSupabaseClient, createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../../lib/supabase-server';
import { fetchMembershipTraitState, fetchUnlockedTraitIds } from '../trait-route-helpers';

type MembershipIdRow = {
  id: string;
};

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as {
      clubId?: string;
      traitId?: string | null;
    };

    if (!('traitId' in body)) {
      return Response.json({ error: { code: 'bad_request', message: 'traitId is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const privileged = createPrivilegedSupabaseClient();
    const teamId = getServerTeamId();
    const { data: membership, error: membershipError } = await privileged
      .from('team_memberships')
      .select('id')
      .eq('account_id', auth.user.id)
      .eq('club_id', teamId)
      .eq('status', 'approved')
      .single<MembershipIdRow>();

    if (membershipError) {
      throw new AppError('not_found', 'Approved membership was not found.', { cause: membershipError });
    }

    const traitId = body.traitId ?? null;

    if (traitId !== null) {
      const unlockedTraitIds = await fetchUnlockedTraitIds(privileged, membership.id);
      if (!unlockedTraitIds.includes(traitId)) {
        throw new AppError('forbidden', 'Only unlocked traits can be equipped.');
      }
    }

    const { error: updateError } = await privileged
      .from('team_memberships')
      .update({ selected_trait_id: traitId })
      .eq('id', membership.id);

    if (updateError) {
      throw new AppError('internal_error', 'Failed to equip trait.', { cause: updateError });
    }

    return Response.json(await fetchMembershipTraitState(privileged, auth.user.id, teamId));
  } catch (error) {
    return appErrorResponse(error);
  }
}
