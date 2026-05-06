import { appErrorResponse } from '../../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createAccountMembershipService } from '../../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../../services/supabase-repositories';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(supabase),
    );

    return Response.json(await service.listClubMemberships({ auth }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
