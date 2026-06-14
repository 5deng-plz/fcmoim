import { appErrorResponse } from '../../../types/api';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token) {
      return Response.json({ error: { code: 'bad_request', message: 'token is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const deviceInfo = normalizeDeviceInfo(body.deviceInfo, request);

    const { error } = await supabase.from('fcm_tokens').upsert(
      {
        account_id: auth.user.id,
        token,
        device_info: deviceInfo,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );

    if (error) {
      throw error;
    }

    return Response.json({ ok: true });
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token) {
      return Response.json({ error: { code: 'bad_request', message: 'token is required.' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    await getRequiredServerAuthContext(supabase);

    const { error } = await supabase.from('fcm_tokens').delete().eq('token', token);
    if (error) {
      throw error;
    }

    return Response.json({ ok: true });
  } catch (error) {
    return appErrorResponse(error);
  }
}

function normalizeDeviceInfo(value: unknown, request: Request) {
  const deviceInfo = isRecord(value) ? { ...value } : {};
  const userAgent = request.headers.get('user-agent');
  if (userAgent && typeof deviceInfo.userAgent !== 'string') {
    deviceInfo.userAgent = userAgent;
  }
  return deviceInfo;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
