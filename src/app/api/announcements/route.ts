import { appErrorResponse } from '../../../types/api';
import { getServerTeamId } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { fireAndForgetPush, sendPushToClubMembers } from '../../../lib/push-sender';
import { createAnnouncementService } from '../../../services/announcements';
import { createSupabaseAnnouncementRepositories } from '../../../services/supabase-repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    searchParams.get('clubId');
    const clubId = getServerTeamId();

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
      clubId: getServerTeamId(),
      seasonId: body.seasonId,
      title: body.title,
      content: body.content,
      isPinned: body.isPinned,
    });

    fireAndForgetPush('announcement creation', () => sendPushToClubMembers(announcement.clubId, {
      type: 'ANNOUNCEMENT_POSTED',
      title: '새 공지사항이 등록됐어요',
      targetUrl: '/?tab=records&section=announcements',
      metadata: { clubId: announcement.clubId, announcementId: announcement.id },
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
