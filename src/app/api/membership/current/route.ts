import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createAccountMembershipService } from '../../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../../services/repositories';
import { resolveTeamContext } from '../../../../services/team-context';
import { appErrorResponse } from '../../../../types/api';

export async function GET(request?: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const teamContext = await resolveTeamContext(supabase, {
      requestedTeamId: request
        ? new URL(request.url).searchParams.get('clubId')
        : null,
      accountId: auth.user.id,
      access: 'membership',
    });
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(supabase),
      teamContext,
    );

    return Response.json(await service.bootstrapProfile({ auth }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
