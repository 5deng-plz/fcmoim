import { type SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../types/api';
import type { AuthContext } from '../types/domain';

const CLUB_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const OWNER_LIMIT_MESSAGE = '계정당 최대 2개의 팀만 생성할 수 있습니다.';

export type ClubCreateInput = {
  name: string;
  slug: string;
  description: string;
};

export type ClubCreateResult = {
  success: true;
  clubId: string;
};

export function normalizeClubSlug(slug: string) {
  return slug.trim().toLowerCase();
}

export function validateClubSlug(slug: string) {
  const normalized = normalizeClubSlug(slug);
  return normalized.length >= 3 && normalized.length <= 50 && CLUB_SLUG_PATTERN.test(normalized);
}

export function createClubCreationService(supabase: SupabaseClient) {
  return {
    async checkSlug(slug: string) {
      const normalizedSlug = normalizeClubSlug(slug);
      if (!validateClubSlug(normalizedSlug)) {
        throw new AppError('bad_request', 'Slug parameter is required or invalid.');
      }

      const { data, error } = await supabase
        .from('clubs')
        .select('id')
        .eq('slug', normalizedSlug)
        .maybeSingle<{ id: string }>();

      if (error) {
        throw new AppError('internal_error', 'Failed to check club slug.', { cause: error });
      }

      return { exists: Boolean(data) };
    },

    async getCreationEligibility(auth: AuthContext) {
      const { count, error } = await supabase
        .from('clubs')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', auth.user.id);

      if (error) {
        throw new AppError('internal_error', 'Failed to check club ownership.', { cause: error });
      }

      const ownedClubCount = count ?? 0;
      return { ownedClubCount, canCreate: ownedClubCount < 2 };
    },

    async createClub(input: ClubCreateInput & { auth: AuthContext }): Promise<ClubCreateResult> {
      const name = input.name.trim();
      const slug = normalizeClubSlug(input.slug);
      const description = input.description.trim();
      validateClubCreateInput({ name, slug, description });

      const { data, error } = await supabase.rpc('create_club_with_owner', {
        p_account_id: input.auth.user.id,
        p_email: input.auth.user.email,
        p_name: name,
        p_slug: slug,
        p_description: description,
      });

      if (error) throw mapClubCreateError(error);
      if (typeof data !== 'string' || data.length === 0) {
        throw new AppError('internal_error', 'Created club id was not returned.');
      }

      return { success: true, clubId: data };
    },
  };
}

function validateClubCreateInput(input: ClubCreateInput) {
  if (input.name.length < 3 || input.name.length > 50) {
    throw new AppError('bad_request', '팀 이름은 3자 이상 50자 이하로 입력해주세요.');
  }
  if (!validateClubSlug(input.slug)) {
    throw new AppError('bad_request', '팀 주소는 영문 소문자, 숫자, 하이픈으로 3자 이상 입력해주세요.');
  }
  if (input.description.length < 1 || input.description.length > 200) {
    throw new AppError('bad_request', '팀 소개는 1자 이상 200자 이하로 입력해주세요.');
  }
}

function mapClubCreateError(error: { code?: string; message?: string }) {
  const message = error.message ?? '';
  if (error.code === '23505' || message.includes('clubs_slug_key')) {
    return new AppError('conflict', '이미 사용 중인 주소입니다.', { cause: error });
  }
  if (message.includes('club_owner_limit_exceeded')) {
    return new AppError('bad_request', OWNER_LIMIT_MESSAGE, { cause: error });
  }
  if (
    error.code === '22023'
    || message.includes('team_name_invalid')
    || message.includes('club_slug_invalid')
    || message.includes('club_description_invalid')
  ) {
    return new AppError('bad_request', '팀 생성 입력값을 확인해주세요.', { cause: error });
  }
  if (error.code === '42501') {
    return new AppError('forbidden', '팀 생성 권한을 확인하지 못했습니다.', { cause: error });
  }
  return new AppError('internal_error', '팀 생성에 실패했습니다.', { cause: error });
}
