import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const clubIds = {
  guppy: '00000000-0000-0000-0000-000000000001',
  orca: '00000000-0000-0000-0000-000000000002',
  lynx: '00000000-0000-0000-0000-000000000003',
} as const;
const publicClubSummaryKeys = [
  'id',
  'name',
  'slug',
  'description',
  'logoUrl',
  'isPublic',
  'memberCount',
  'activeSeason',
  'recentMatchCount',
  'upcomingMatchCount',
] as const;
const publicClubDetailKeys = [
  ...publicClubSummaryKeys,
  'recentMatches',
  'upcomingMatches',
] as const;
const schedulePollOptionDates = ['2031-01-11', '2031-01-12'];
let authorization = '';
let authClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;
const describeLocal =
  process.env.FC_RUN_LOCAL_SUPABASE_API_TESTS === 'true' ? describe : describe.skip;

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
  headers: vi.fn(async () => new Headers(authorization ? { authorization } : {})),
}));

async function signIn(email: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const password = process.env.QA_TEST_PASSWORD;

  if (!supabaseUrl || !publishableKey || !password) {
    throw new Error('Local Supabase API tests require local Supabase env vars.');
  }

  if (!authClient) {
    authClient = createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`Failed to sign in ${email}: ${error?.message ?? 'missing access token'}`);
  }

  authorization = `Bearer ${data.session.access_token}`;
  return data.user.id;
}

function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new Error('Local Supabase API tests require local Supabase service role env vars.');
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

async function deleteMembershipForAccountId(accountId: string, clubId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('team_memberships')
    .delete()
    .eq('account_id', accountId)
    .eq('club_id', clubId);

  if (error) {
    throw new Error(`Failed to clean membership ${accountId}/${clubId}: ${error.message}`);
  }
}

async function deleteSchedulePollsByOptionDates(clubId: string, optionDates: string[]) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('schedule_poll_options')
    .select('poll_id, schedule_polls!inner(club_id)')
    .in('option_date', optionDates)
    .eq('schedule_polls.club_id', clubId)
    .returns<Array<{ poll_id: string }>>();

  if (error) {
    throw new Error(`Failed to find schedule polls for cleanup: ${error.message}`);
  }

  const pollIds = [...new Set((data ?? []).map((row) => row.poll_id))];
  if (pollIds.length === 0) return;

  const { error: deleteError } = await admin
    .from('schedule_polls')
    .delete()
    .in('id', pollIds);

  if (deleteError) {
    throw new Error(`Failed to clean schedule polls: ${deleteError.message}`);
  }
}

describeLocal('local Supabase API integration', () => {
  beforeAll(async () => {
    process.env.ENABLE_E2E_TEST_AUTH_BYPASS = 'false';
    await signIn('qa-operator@fcmoim.test');
  });

  it('serves three public clubs without exposing member-private data', async () => {
    authorization = '';
    const listRoute = await import('../src/app/api/public/clubs/route');
    const detailRoute = await import('../src/app/api/public/clubs/[clubId]/route');

    const listResponse = await listRoute.GET();
    const clubs = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(clubs).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: clubIds.guppy, name: 'FC Guppy' }),
      expect.objectContaining({ id: clubIds.orca, name: 'FC Orca' }),
      expect.objectContaining({ id: clubIds.lynx, name: 'FC Lynx' }),
    ]));
    for (const club of clubs) {
      expect(Object.keys(club).sort()).toEqual([...publicClubSummaryKeys].sort());
    }

    const detailResponse = await detailRoute.GET(
      new Request(`http://localhost/api/public/clubs/${clubIds.lynx}`),
      { params: Promise.resolve({ clubId: clubIds.lynx }) },
    );
    const detail = await detailResponse.json();

    expect(detailResponse.status).toBe(200);
    expect(Object.keys(detail).sort()).toEqual([...publicClubDetailKeys].sort());
    expect(detail).toEqual(expect.objectContaining({
      id: clubIds.lynx,
      name: 'FC Lynx',
      recentMatches: expect.any(Array),
      upcomingMatches: expect.any(Array),
    }));
    expect(JSON.stringify(detail)).not.toContain('qa-');
    expect(detail).not.toHaveProperty('members');
    expect(detail).not.toHaveProperty('pendingMembers');
  });

  it('serves club memberships through the authenticated API route and real RLS-backed repositories', async () => {
    await signIn('qa-operator@fcmoim.test');
    const route = await import('../src/app/api/membership/clubs/route');

    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clubId: clubIds.guppy,
          role: 'operator',
          status: 'approved',
        }),
      ]),
    );
  });

  it('serves multiple approved clubs for a multi-team member', async () => {
    await signIn('qa-member2@fcmoim.test');
    const route = await import('../src/app/api/membership/clubs/route');

    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.arrayContaining([
      expect.objectContaining({ clubId: clubIds.guppy, clubName: 'FC Guppy', status: 'approved' }),
      expect.objectContaining({ clubId: clubIds.orca, clubName: 'FC Orca', status: 'approved' }),
    ]));
  });

  it('creates a selected-team pending membership, blocks duplicate joins, and enters approved after operator review', async () => {
    const newAccountId = await signIn('qa-new@fcmoim.test');
    await deleteMembershipForAccountId(newAccountId, clubIds.lynx);
    const membershipRoute = await import('../src/app/api/membership/route');
    const pendingRoute = await import('../src/app/api/membership/pending/route');
    const reviewRoute = await import('../src/app/api/membership/review/route');

    const initialResponse = await membershipRoute.GET(
      new Request(`http://localhost/api/membership?clubId=${clubIds.lynx}`),
    );
    const initial = await initialResponse.json();

    expect(initialResponse.status).toBe(200);
    expect(initial.membershipState).toBe('new');

    const createResponse = await membershipRoute.POST(new Request('http://localhost/api/membership', {
      method: 'POST',
      body: JSON.stringify({
        clubId: clubIds.lynx,
        profile: {
          nickname: 'QA 신규',
          position: 'MF',
          heightCm: null,
          weightKg: null,
          birthDate: null,
          residence: '서울 마포구',
          photoUrl: null,
          preferredFoot: 'right',
          stats: { attack: 66, defense: 64, stamina: 70, mentality: 70, speed: 68, manner: 72 },
          ovr: 68,
        },
      }),
    }));
    const created = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(created).toEqual(expect.objectContaining({
      clubId: clubIds.lynx,
      status: 'pending',
      nickname: 'QA 신규',
    }));

    const duplicateResponse = await membershipRoute.POST(new Request('http://localhost/api/membership', {
      method: 'POST',
      body: JSON.stringify({
        clubId: clubIds.lynx,
        profile: {
          nickname: 'QA 신규',
          position: 'MF',
          heightCm: null,
          weightKg: null,
          birthDate: null,
          photoUrl: null,
          preferredFoot: 'right',
        },
      }),
    }));
    const duplicate = await duplicateResponse.json();

    expect(duplicateResponse.status).toBe(409);
    expect(duplicate.error.message).toContain('이미 입단신청이 접수');

    await signIn('qa-operator@fcmoim.test');
    const pendingResponse = await pendingRoute.GET(
      new Request(`http://localhost/api/membership/pending?clubId=${clubIds.lynx}`),
    );
    const pending = await pendingResponse.json();

    expect(pendingResponse.status).toBe(200);
    expect(pending).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: created.id, clubId: clubIds.lynx, nickname: 'QA 신규' }),
    ]));

    const reviewResponse = await reviewRoute.PATCH(new Request('http://localhost/api/membership/review', {
      method: 'PATCH',
      body: JSON.stringify({
        clubId: clubIds.lynx,
        membershipId: created.id,
        decision: 'approved',
      }),
    }));
    const reviewed = await reviewResponse.json();

    expect(reviewResponse.status).toBe(200);
    expect(reviewed).toEqual(expect.objectContaining({
      id: created.id,
      clubId: clubIds.lynx,
      status: 'approved',
    }));

    await signIn('qa-new@fcmoim.test');
    const approvedResponse = await membershipRoute.GET(
      new Request(`http://localhost/api/membership?clubId=${clubIds.lynx}`),
    );
    const approved = await approvedResponse.json();

    expect(approvedResponse.status).toBe(200);
    expect(approved.membershipState).toBe('approved');
    expect(approved.membership).toEqual(expect.objectContaining({
      id: created.id,
      clubId: clubIds.lynx,
      status: 'approved',
    }));
  });

  it('rejects pending list and review access for a regular member', async () => {
    await signIn('qa-member1@fcmoim.test');
    const pendingRoute = await import('../src/app/api/membership/pending/route');
    const reviewRoute = await import('../src/app/api/membership/review/route');

    const pendingResponse = await pendingRoute.GET(
      new Request(`http://localhost/api/membership/pending?clubId=${clubIds.lynx}`),
    );
    const pending = await pendingResponse.json();

    expect(pendingResponse.status).toBe(403);
    expect(pending.error.code).toBe('forbidden');

    const reviewResponse = await reviewRoute.PATCH(new Request('http://localhost/api/membership/review', {
      method: 'PATCH',
      body: JSON.stringify({
        clubId: clubIds.lynx,
        membershipId: '00000000-0000-0000-0000-000000000404',
        decision: 'approved',
      }),
    }));
    const review = await reviewResponse.json();

    expect(reviewResponse.status).toBe(403);
    expect(review.error.code).toBe('forbidden');
  });

  it('creates and lists a schedule poll through API routes backed by local Supabase', async () => {
    await signIn('qa-operator@fcmoim.test');
    const route = await import('../src/app/api/schedule-polls/route');
    const title = `Local API poll ${Date.now()}`;
    await deleteSchedulePollsByOptionDates(clubIds.guppy, schedulePollOptionDates);

    const createResponse = await route.POST(new Request('http://localhost/api/schedule-polls', {
      method: 'POST',
      body: JSON.stringify({
        clubId: clubIds.guppy,
        title,
        commonTime: '20:00',
        location: '로컬 풋살장',
        memo: 'local Supabase integration test',
        closesAt: null,
        optionDates: schedulePollOptionDates,
      }),
    }));
    const created = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(created).toEqual(expect.objectContaining({
      clubId: clubIds.guppy,
      title,
      status: 'open',
      options: expect.arrayContaining([
        expect.objectContaining({ optionDate: schedulePollOptionDates[0] }),
        expect.objectContaining({ optionDate: schedulePollOptionDates[1] }),
      ]),
    }));

    const listResponse = await route.GET(
      new Request(`http://localhost/api/schedule-polls?clubId=${clubIds.guppy}`),
    );
    const polls = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(polls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          title,
        }),
      ]),
    );
  });

  it('serves rich local demo announcements and records through API routes', async () => {
    await signIn('qa-operator@fcmoim.test');
    const announcementsRoute = await import('../src/app/api/announcements/route');
    const recordsRoute = await import('../src/app/api/records/season-summary/route');

    const announcementsResponse = await announcementsRoute.GET(
      new Request(`http://localhost/api/announcements?clubId=${clubIds.guppy}`),
    );
    const announcements = await announcementsResponse.json();

    expect(announcementsResponse.status).toBe(200);
    expect(announcements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: '이번 주 정기전 공지',
          isPinned: true,
        }),
      ]),
    );

    const recordsResponse = await recordsRoute.GET(
      new Request(`http://localhost/api/records/season-summary?clubId=${clubIds.guppy}`),
    );
    const records = await recordsResponse.json();

    expect(recordsResponse.status).toBe(200);
    expect(records.seasonSummary).toEqual(expect.objectContaining({
      totalMatches: 2,
      topVenue: expect.objectContaining({ location: '상암 풋살장' }),
      topGoals: expect.objectContaining({ nickname: 'QA 멤버 1' }),
    }));
  });
});
