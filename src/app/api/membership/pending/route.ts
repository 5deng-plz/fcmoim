import { appErrorResponse } from '../../../../types/api';
import { getServerTeamContext } from '../../../../config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createAccountMembershipService } from '../../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../../services/repositories';

export async function GET(request: Request) {
  try {
    new URL(request.url).searchParams.get('clubId');

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(supabase),
      getServerTeamContext(),
    );

    return Response.json(await service.listPendingMemberships({ auth }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
