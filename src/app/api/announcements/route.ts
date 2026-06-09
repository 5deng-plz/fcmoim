import { appErrorResponse } from '../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { createAnnouncementService } from '../../../services/announcements';
import { createSupabaseAnnouncementRepositories } from '../../../services/supabase-repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    if (!clubId) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAnnouncementService(createSupabaseAnnouncementRepositories(supabase));

    return Response.json(await service.listAnnouncements({ auth, clubId }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAnnouncementService(createSupabaseAnnouncementRepositories(supabase));

    const announcement = await service.createAnnouncement({
      auth,
      clubId: body.clubId,
      seasonId: body.seasonId,
      title: body.title,
      content: body.content,
      isPinned: body.isPinned,
    });

    return Response.json(announcement, { status: 201 });
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAnnouncementService(createSupabaseAnnouncementRepositories(supabase));

    const announcement = await service.updateAnnouncement({
      auth,
      announcementId: body.announcementId,
      title: body.title,
      content: body.content,
      isPinned: body.isPinned,
    });

    return Response.json(announcement);
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAnnouncementService(createSupabaseAnnouncementRepositories(supabase));

    await service.deleteAnnouncement({
      auth,
      announcementId: body.announcementId,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return appErrorResponse(error);
  }
}
