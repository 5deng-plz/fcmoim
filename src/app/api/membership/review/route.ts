import { appErrorResponse } from '../../../../types/api';
import { getServerTeamContext } from '../../../../config/server-team';
import { createPrivilegedSupabaseClient, createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { fireAndForgetPush, sendPushToMembership } from '../../../../lib/push-sender';
import { createAccountMembershipService } from '../../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../../services/supabase-repositories';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(createPrivilegedSupabaseClient()),
      getServerTeamContext(),
    );

    const membership = await service.reviewMembership({
      auth,
      membershipId: body.membershipId,
      decision: body.decision,
      authUid: body.authUid,
    });

    const isApproved = membership.status === 'approved';
    fireAndForgetPush('membership review', () => sendPushToMembership(membership.id, {
      type: isApproved ? 'JOIN_APPROVED' : 'JOIN_REJECTED',
      title: isApproved ? '입단이 승인됐어요' : '입단 신청이 반려됐어요',
      targetUrl: isApproved ? '/?tab=home' : '/',
      metadata: { clubId: membership.clubId, membershipId: membership.id },
    }));

    return Response.json(membership);
  } catch (error) {
    return appErrorResponse(error);
  }
}
