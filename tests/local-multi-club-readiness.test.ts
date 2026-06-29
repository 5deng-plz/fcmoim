import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const secondTeamId = '00000000-0000-4000-8000-000000000222';
const secondSeasonId = '00000000-0000-4000-8000-000000000223';
const describeLocal = process.env.FC_RUN_LOCAL_SUPABASE_API_TESTS === 'true'
  ? describe
  : describe.skip;
let authorization = '';
let admin: SupabaseClient;
let member: SupabaseClient;
let memberAccountId = '';

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
  headers: vi.fn(async () => new Headers(authorization ? { authorization } : {})),
}));

describeLocal('local multi-club readiness', () => {
  beforeAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const password = process.env.QA_LOCAL_ACCOUNT_PASSWORD;
    if (!url || !publicKey || !secretKey || !password) {
      throw new Error('Local multi-club tests require Supabase and QA env vars.');
    }

    admin = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    member = createClient(url, publicKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await member.auth.signInWithPassword({
      email: 'qa-member1@fcmoim.test',
      password,
    });
    if (error || !data.session) throw new Error(error?.message ?? 'QA sign-in failed.');
    authorization = `Bearer ${data.session.access_token}`;
    memberAccountId = data.user.id;

    await admin.from('clubs').delete().eq('id', secondTeamId);
    const { error: clubError } = await admin.from('clubs').insert({
      id: secondTeamId,
      name: 'FC Multi Readiness',
      slug: 'fc-multi-readiness',
      description: 'Cross-club isolation fixture',
      is_public: true,
    });
    if (clubError) throw new Error(clubError.message);
    const { error: seasonError } = await admin.from('seasons').insert({
      id: secondSeasonId,
      club_id: secondTeamId,
      name: 'Multi readiness season',
      start_date: '2035-01-01',
      end_date: '2035-12-31',
      is_active: true,
    });
    if (seasonError) throw new Error(seasonError.message);
  });

  afterAll(async () => {
    if (admin) await admin.from('clubs').delete().eq('id', secondTeamId);
    authorization = '';
  });

  it('hides club creation APIs while the feature flag is disabled', async () => {
    const previous = process.env.MULTI_CLUB_ENABLED;
    process.env.MULTI_CLUB_ENABLED = 'false';
    try {
      const route = await import('../src/app/api/clubs/route');
      const response = await route.POST(new Request('http://localhost/api/clubs', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Blocked Club',
          slug: 'blocked-club',
          description: 'must stay blocked',
        }),
      }));
      expect(response.status).toBe(404);
    } finally {
      process.env.MULTI_CLUB_ENABLED = previous;
    }
  });

  it('allows service-role multi-club rows but denies cross-club member reads', async () => {
    const { data: clubs, error: clubError } = await admin
      .from('clubs')
      .select('id')
      .in('id', ['00000000-0000-0000-0000-000000000001', secondTeamId]);
    expect(clubError).toBeNull();
    expect(clubs).toHaveLength(2);

    const { data: denied, error: deniedError } = await member
      .from('seasons')
      .select('id')
      .eq('club_id', secondTeamId);
    expect(deniedError).toBeNull();
    expect(denied).toEqual([]);
  });

  it('allows the same account to access each approved club independently', async () => {
    const membershipId = '00000000-0000-4000-8000-000000000224';
    const { error: membershipError } = await admin.from('team_memberships').insert({
      id: membershipId,
      account_id: memberAccountId,
      club_id: secondTeamId,
      profile_name: 'Multi Member',
      role: 'member',
      status: 'approved',
    });
    expect(membershipError).toBeNull();

    const { data, error } = await member
      .from('seasons')
      .select('id, club_id')
      .eq('club_id', secondTeamId);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: secondSeasonId, club_id: secondTeamId }]);
  });

  it('denies direct authenticated club inserts even in a multi-club schema', async () => {
    const { error } = await member.from('clubs').insert({
      name: 'Direct Insert',
      slug: 'direct-insert',
      description: 'must be denied',
      is_public: true,
      created_by: memberAccountId,
    });
    expect(error).not.toBeNull();
  });
});
