import { appErrorResponse } from '../../../../types/api';
import { getServerTeamContext } from '../../../../config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createAccountMembershipService } from '../../../../services/account-membership';
import { createPublicClubService } from '../../../../services/public-clubs';
import { createSupabaseAccountMembershipRepositories } from '../../../../services/repositories';
import { createSupabasePublicClubRepositories } from '../../../../services/repositories';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const teamContext = getServerTeamContext();
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(supabase),
      teamContext,
    );
    const teamService = createPublicClubService(
      createSupabasePublicClubRepositories(supabase),
      teamContext,
    );
    const [{ membership }, team] = await Promise.all([
      service.bootstrapProfile({ auth }),
      teamService.getTeam(),
    ]);

    return Response.json(membership ? [{
      membershipId: membership.id,
      clubId: teamContext.teamId,
      clubName: team.name,
      logoUrl: team.logoUrl,
      role: membership.role,
      status: membership.status,
    }] : []);
  } catch (error) {
    return appErrorResponse(error);
  }
}
