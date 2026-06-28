import { appErrorResponse } from '../../../../types/api';
import { getServerTeamContext } from '../../../../config/server-team';
import { createPrivilegedSupabaseClient, createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createAccountMembershipService } from '../../../../services/account-membership';
import { createSupabaseAccountMembershipRepositories } from '../../../../services/repositories';
import type { MembershipStats } from '../../../../types/domain';

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as {
      clubId?: string;
      nickname?: string | null;
      heightCm?: number | null;
      weightKg?: number | null;
      birthDate?: string | null;
      residence?: string | null;
      photoUrl?: string | null;
      preferredFoot?: 'left' | 'right' | 'both' | null;
      stats?: MembershipStats | null;
      ovr?: number | null;
    };

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAccountMembershipService(
      createSupabaseAccountMembershipRepositories(createPrivilegedSupabaseClient()),
      getServerTeamContext(),
    );

    return Response.json(await service.updateMembershipProfile({
      auth,
      profile: {
        ...('nickname' in body ? { nickname: body.nickname } : {}),
        ...('heightCm' in body ? { heightCm: body.heightCm } : {}),
        ...('weightKg' in body ? { weightKg: body.weightKg } : {}),
        ...('birthDate' in body ? { birthDate: body.birthDate } : {}),
        ...('residence' in body ? { residence: body.residence } : {}),
        ...('photoUrl' in body ? { photoUrl: body.photoUrl } : {}),
        ...('preferredFoot' in body ? { preferredFoot: body.preferredFoot } : {}),
        ...('stats' in body ? { stats: body.stats } : {}),
        ...('ovr' in body ? { ovr: body.ovr } : {}),
      },
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}
