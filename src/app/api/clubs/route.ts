import { appErrorResponse } from '../../../types/api';
import { createPrivilegedSupabaseClient, createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { createClubCreationService } from '../../../services/club-create';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      name?: string;
      slug?: string;
      description?: string;
    };

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createClubCreationService(createPrivilegedSupabaseClient());

    const result = await service.createClub({
      auth,
      name: body.name ?? '',
      slug: body.slug ?? '',
      description: body.description ?? '',
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createClubCreationService(createPrivilegedSupabaseClient());

    return Response.json(await service.getCreationEligibility(auth));
  } catch (error) {
    return appErrorResponse(error);
  }
}
