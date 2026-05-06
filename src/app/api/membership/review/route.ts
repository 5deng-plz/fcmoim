import { appErrorResponse } from '../../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createAccountMembershipService } from '../../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../../services/supabase-repositories';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(supabase),
    );

    const membership = await service.reviewMembership({
      auth,
      clubId: body.clubId,
      membershipId: body.membershipId,
      decision: body.decision,
      authUid: body.authUid,
    });

    return Response.json(membership);
  } catch (error) {
    return appErrorResponse(error);
  }
}

