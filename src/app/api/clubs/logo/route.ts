import { appErrorResponse, AppError } from '../../../../types/api';
import { createPrivilegedSupabaseClient, createSupabaseServerClient, getRequiredServerAuthContext } from '../../../../lib/supabase-server';
import { createClubAdminService } from '../../../../services/club-admin';
import { createSupabaseClubAdminRepositories } from '../../../../services/supabase-repositories';

const CLUB_LOGO_BUCKET = 'club-logos';
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function POST(request: Request) {
  try {
    const body = await request.formData();
    const clubId = body.get('clubId');
    const file = body.get('file');

    if (typeof clubId !== 'string' || !clubId.trim()) {
      return Response.json({ error: { code: 'bad_request', message: 'clubId is required.' } }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return Response.json({ error: { code: 'bad_request', message: 'Logo file is required.' } }, { status: 400 });
    }
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      throw new AppError('bad_request', '팀 로고는 PNG, JPG, WEBP 이미지만 업로드할 수 있어요.');
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new AppError('bad_request', '팀 로고는 2MB 이하로 업로드해주세요.');
    }

    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const privilegedSupabase = createPrivilegedSupabaseClient();
    const service = createClubAdminService(
      createSupabaseClubAdminRepositories(privilegedSupabase),
    );

    await service.getClubSettings({ auth, clubId });

    const extension = getExtension(file.type);
    const objectPath = `${clubId}/${Date.now()}.${extension}`;
    const upload = await privilegedSupabase.storage
      .from(CLUB_LOGO_BUCKET)
      .upload(objectPath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });

    if (upload.error) {
      throw new AppError('internal_error', '팀 로고 업로드에 실패했습니다.', { cause: upload.error });
    }

    const { data } = privilegedSupabase.storage
      .from(CLUB_LOGO_BUCKET)
      .getPublicUrl(objectPath);

    return Response.json(await service.updateClubLogo({
      auth,
      clubId,
      logoUrl: data.publicUrl,
    }));
  } catch (error) {
    return appErrorResponse(error);
  }
}

function getExtension(mimeType: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}
