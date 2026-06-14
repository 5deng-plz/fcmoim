import { AppError, appErrorResponse } from '../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    if (!clubId) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const membershipId = await getCurrentMembershipId(supabase, auth.user.id, clubId);

    const { data, error } = await supabase
      .from('notifications')
      .select('id, membership_id, type, title, body, is_read, target_url, metadata, created_at, updated_at')
      .eq('membership_id', membershipId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return Response.json({
      notifications: (data ?? []).map((row) => ({
        id: row.id,
        membershipId: row.membership_id,
        type: row.type,
        title: row.title,
        body: row.body,
        isRead: row.is_read,
        targetUrl: row.target_url,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);

    if (body.markAllRead === true) {
      const clubId = typeof body.clubId === 'string' ? body.clubId : '';
      if (!clubId) {
        return Response.json({ error: { code: 'bad_request', message: 'clubId is required.' } }, { status: 400 });
      }

      const membershipId = await getCurrentMembershipId(supabase, auth.user.id, clubId);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('membership_id', membershipId)
        .eq('is_read', false);

      if (error) {
        throw error;
      }

      return Response.json({ ok: true });
    }

    const notificationId = typeof body.notificationId === 'string' ? body.notificationId : '';
    if (!notificationId) {
      return Response.json(
        { error: { code: 'bad_request', message: 'notificationId is required.' } },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      throw error;
    }

    return Response.json({ ok: true });
  } catch (error) {
    return appErrorResponse(error);
  }
}

async function getCurrentMembershipId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  accountId: string,
  clubId: string,
) {
  const { data, error } = await supabase
    .from('team_memberships')
    .select('id')
    .eq('account_id', accountId)
    .eq('club_id', clubId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data?.id) {
    throw new AppError('not_found', 'Membership was not found.');
  }

  return data.id;
}
