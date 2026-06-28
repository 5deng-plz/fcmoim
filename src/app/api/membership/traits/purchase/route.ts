import { AppError, appErrorResponse } from '../../../../../types/api';
import { getServerTeamId } from '@/config/server-team';
import { createPrivilegedSupabaseClient, createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../../lib/supabase-server';
import { fetchMembershipTraitState } from '../trait-route-helpers';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      clubId?: string;
      traitId?: string;
    };

    if (!body.traitId) {
      return Response.json({ error: { code: 'bad_request', message: 'traitId is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const privileged = createPrivilegedSupabaseClient();
    const teamId = getServerTeamId();
    const { error } = await privileged.rpc('purchase_trait', {
      p_account_id: auth.user.id,
      p_club_id: teamId,
      p_trait_id: body.traitId,
    });

    if (error) {
      throw new AppError('conflict', error.message || 'Failed to purchase trait.', { cause: error });
    }

    return Response.json(await fetchMembershipTraitState(privileged, auth.user.id, teamId));
  } catch (error) {
    return appErrorResponse(error);
  }
}
