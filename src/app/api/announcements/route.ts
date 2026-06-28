import { appErrorResponse } from '../../../types/api';
import { getServerTeamContext, getServerTeamId } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { fireAndForgetPush, sendPushToClubMembers } from '../../../lib/push-sender';
import { createAnnouncementService } from '../../../services/announcements';
import { createSupabaseAnnouncementRepositories } from '../../../services/repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    searchParams.get('clubId');
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAnnouncementService(createSupabaseAnnouncementRepositories(supabase), getServerTeamContext());

    return Response.json(await service.listAnnouncements({ auth }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createAnnouncementService(createSupabaseAnnouncementRepositories(supabase), getServerTeamContext());

    const announcement = await service.createAnnouncement({
      auth,
      seasonId: body.seasonId,
      title: body.title,
      content: body.content,
      isPinned: body.isPinned,
    });

    const teamId = getServerTeamId();
    fireAndForgetPush('announcement creation', () => sendPushToClubMembers(teamId, {
      type: 'ANNOUNCEMENT_POSTED',
      title: '새 공지사항이 등록됐어요',
      targetUrl: '/?tab=records&section=announcements',
      metadata: { clubId: teamId, announcementId: announcement.id },
    }, { excludeAccountId: auth.user.id }));

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
    const service = createAnnouncementService(createSupabaseAnnouncementRepositories(supabase), getServerTeamContext());

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
    const service = createAnnouncementService(createSupabaseAnnouncementRepositories(supabase), getServerTeamContext());

    await service.deleteAnnouncement({
      auth,
      announcementId: body.announcementId,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return appErrorResponse(error);
  }
}
