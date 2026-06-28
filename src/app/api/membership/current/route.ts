import { getServerTeamContext } from '../../../../config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createAccountMembershipService } from '../../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../../services/supabase-repositories';
import { appErrorResponse } from '../../../../types/api';

export async function GET() {
  try {
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
