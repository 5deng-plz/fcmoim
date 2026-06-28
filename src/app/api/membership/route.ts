import { appErrorResponse } from '../../../types/api';
import { getServerTeamContext } from '../../../config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { fireAndForgetPush, sendPushToClubOperators } from '../../../lib/push-sender';
import { createAccountMembershipService } from '../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../services/supabase-repositories';

export async function GET(request: Request) {
  try {
    new URL(request.url).searchParams.get('clubId');

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(supabase),
      getServerTeamContext(),
    );

    return Response.json(await service.bootstrapProfile({ auth }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(supabase),
      getServerTeamContext(),
    );

    const membership = await service.joinClub({
      auth,
      authUid: body.authUid,
      profile: body.profile,
    });

    fireAndForgetPush('membership request', () => sendPushToClubOperators(membership.clubId, {
      type: 'JOIN_REQUESTED',
      title: '새 입단 신청이 도착했어요',
      targetUrl: '/?tab=locker_room',
      metadata: { clubId: membership.clubId, membershipId: membership.id },
    }, { excludeAccountId: auth.user.id }));

    return Response.json(membership, { status: 201 });
  } catch (error) {
    return appErrorResponse(error);
  }
}
