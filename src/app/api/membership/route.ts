import { appErrorResponse } from '../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { createAccountMembershipService } from '../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../services/supabase-repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    if (!clubId) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(supabase),
    );

    return Response.json(await service.bootstrapProfile({ auth, clubId }));
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
    );

    const membership = await service.joinClub({
      auth,
      clubId: body.clubId,
      authUid: body.authUid,
      profile: body.profile,
    });

    return Response.json(membership, { status: 201 });
  } catch (error) {
    return appErrorResponse(error);
  }
}

