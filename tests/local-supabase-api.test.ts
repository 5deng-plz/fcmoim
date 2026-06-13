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
const schedulePollTitle = 'Local Demo API smoke poll';
let authorization = '';
let authClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;
let resultFixtureDay = 1;
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
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
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

async function ensureAccount(accountId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('accounts')
    .upsert({ id: accountId });

  if (error) {
    throw new Error(`Failed to ensure account ${accountId}: ${error.message}`);
  }
}

async function deleteClubsBySlugs(slugs: string[]) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('clubs')
    .delete()
    .in('slug', slugs);

  if (error) {
    throw new Error(`Failed to clean clubs by slugs: ${error.message}`);
  }
}

async function insertOwnedClub(input: { accountId: string; slug: string; name: string }) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('clubs')
    .insert({
      created_by: input.accountId,
      slug: input.slug,
      name: input.name,
      description: 'Owned club for creation limit test',
    });

  if (error) {
    throw new Error(`Failed to insert owned club ${input.slug}: ${error.message}`);
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

async function deleteCommentsByTargetIds(targetIds: string[]) {
  if (targetIds.length === 0) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from('comments')
    .delete()
    .in('target_id', targetIds);

  if (error) {
    throw new Error(`Failed to clean comments by target ids: ${error.message}`);
  }
}

async function deleteAnnouncementsByTitles(clubId: string, titles: string[]) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('announcements')
    .delete()
    .eq('club_id', clubId)
    .in('title', titles);

  if (error) {
    throw new Error(`Failed to clean announcements: ${error.message}`);
  }
}

async function getMembershipByAccount(accountId: string, clubId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('team_memberships')
    .select('id, ovr, match_points')
    .eq('account_id', accountId)
    .eq('club_id', clubId)
    .single<{ id: string; ovr: number; match_points: number }>();

  if (error) {
    throw new Error(`Failed to fetch membership for ${accountId}/${clubId}: ${error.message}`);
  }

  return data;
}

async function createMatchResultFixture(input: {
  matchId?: string;
  status?: 'scheduled' | 'locker_room' | 'finished' | 'cancelled';
  clubId?: string;
  date?: string;
  operatorMembershipId: string;
  memberMembershipId: string;
}) {
  const admin = createAdminClient();
  const matchId = input.matchId ?? crypto.randomUUID();
  const clubId = input.clubId ?? clubIds.guppy;
  const status = input.status ?? 'scheduled';
  const date = input.date ?? `2026-02-${String(resultFixtureDay++).padStart(2, '0')}T20:00:00.000+09:00`;

  const { error: matchError } = await admin
    .from('matches')
    .insert({
      id: matchId,
      club_id: clubId,
      season_id: clubId === clubIds.guppy ? '00000000-0000-0000-0000-000000000101' : '00000000-0000-0000-0000-000000000102',
      round: null,
      title: 'QA Result Round',
      date,
      location: 'QA 풋살장',
      type: 'match',
      status,
      our_score: status === 'finished' ? 1 : null,
      opp_score: status === 'finished' ? 1 : null,
      tactics_completed: true,
      red_leader_confirmed: true,
      blue_leader_confirmed: true,
      memo: 'local match result API test',
      created_by: input.operatorMembershipId,
      cancellation_reason: status === 'cancelled' ? 'QA cancellation' : null,
      cancelled_at: status === 'cancelled' ? new Date().toISOString() : null,
    });

  if (matchError) {
    throw new Error(`Failed to insert match fixture: ${matchError.message}`);
  }

  const { error: attendanceError } = await admin
    .from('attendances')
    .insert([
      { match_id: matchId, membership_id: input.memberMembershipId, status: 'attend' },
      { match_id: matchId, membership_id: input.operatorMembershipId, status: 'attend' },
    ]);

  if (attendanceError) {
    throw new Error(`Failed to insert attendance fixture: ${attendanceError.message}`);
  }

  const { error: lineupError } = await admin
    .from('match_teams')
    .insert([
      { match_id: matchId, membership_id: input.memberMembershipId, team_number: 1, is_leader: true, position: 'FW', formation_slot: 6 },
      { match_id: matchId, membership_id: input.operatorMembershipId, team_number: 2, is_leader: true, position: 'DF', formation_slot: 11 },
    ]);

  if (lineupError) {
    throw new Error(`Failed to insert lineup fixture: ${lineupError.message}`);
  }

  return matchId;
}

async function deleteMatchResultFixture(matchId: string) {
  const admin = createAdminClient();
  await admin.from('point_ledger').delete().eq('source_id', matchId);
  await admin.from('player_stats').delete().eq('match_id', matchId);
  await admin.from('match_teams').delete().eq('match_id', matchId);
  await admin.from('attendances').delete().eq('match_id', matchId);
  await admin.from('matches').delete().eq('id', matchId);
}

async function restoreMembershipSnapshot(snapshot: { id: string; ovr: number; match_points: number }) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('team_memberships')
    .update({ ovr: snapshot.ovr, match_points: snapshot.match_points })
    .eq('id', snapshot.id);

  if (error) {
    throw new Error(`Failed to restore membership ${snapshot.id}: ${error.message}`);
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

  it('checks club slug availability through the public API route', async () => {
    authorization = '';
    const route = await import('../src/app/api/clubs/check-slug/route');

    const availableResponse = await route.GET(new Request('http://localhost/api/clubs/check-slug?slug=qa-unused-club'));
    const available = await availableResponse.json();
    const existingResponse = await route.GET(new Request('http://localhost/api/clubs/check-slug?slug=fc-guppy'));
    const existing = await existingResponse.json();
    const invalidResponse = await route.GET(new Request('http://localhost/api/clubs/check-slug?slug=aa'));

    expect(availableResponse.status).toBe(200);
    expect(available).toEqual({ exists: false });
    expect(existingResponse.status).toBe(200);
    expect(existing).toEqual({ exists: true });
    expect(invalidResponse.status).toBe(400);
  });

  it('creates a club and approved admin membership atomically for an authenticated guest account', async () => {
    const accountId = await signIn('qa-new@fcmoim.test');
    const slug = 'qa-created-club';
    await deleteClubsBySlugs([slug]);
    const route = await import('../src/app/api/clubs/route');

    try {
      const response = await route.POST(new Request('http://localhost/api/clubs', {
        method: 'POST',
        body: JSON.stringify({
          name: 'QA 생성팀',
          slug,
          description: '로컬 API 테스트에서 생성한 팀입니다.',
        }),
      }));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual(expect.objectContaining({ success: true, clubId: expect.any(String) }));

      const admin = createAdminClient();
      const { data: club } = await admin
        .from('clubs')
        .select('id, created_by, slug')
        .eq('slug', slug)
        .single();
      const { data: membership } = await admin
        .from('team_memberships')
        .select('account_id, club_id, role, status')
        .eq('account_id', accountId)
        .eq('club_id', body.clubId)
        .single();
      const { data: seasons } = await admin
        .from('seasons')
        .select('club_id, name, is_active')
        .eq('club_id', body.clubId)
        .eq('is_active', true);

      expect(club).toEqual(expect.objectContaining({
        id: body.clubId,
        created_by: accountId,
        slug,
      }));
      expect(membership).toEqual(expect.objectContaining({
        account_id: accountId,
        club_id: body.clubId,
        role: 'admin',
        status: 'approved',
      }));
      expect(seasons).toEqual([
        expect.objectContaining({
          club_id: body.clubId,
          name: `${new Date().getFullYear()} 시즌`,
          is_active: true,
        }),
      ]);
    } finally {
      await deleteClubsBySlugs([slug]);
    }
  });

  it('blocks club creation after two owned clubs for the authenticated account', async () => {
    const accountId = await signIn('qa-new@fcmoim.test');
    const slugs = ['qa-limit-one', 'qa-limit-two', 'qa-limit-three'];
    await deleteClubsBySlugs(slugs);
    await ensureAccount(accountId);
    await insertOwnedClub({ accountId, slug: slugs[0], name: 'QA 한도팀 하나' });
    await insertOwnedClub({ accountId, slug: slugs[1], name: 'QA 한도팀 둘' });
    const route = await import('../src/app/api/clubs/route');

    try {
      const response = await route.POST(new Request('http://localhost/api/clubs', {
        method: 'POST',
        body: JSON.stringify({
          name: 'QA 한도팀 셋',
          slug: slugs[2],
          description: '생성 한도를 넘는 요청입니다.',
        }),
      }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.message).toBe('계정당 최대 2개의 팀만 생성할 수 있습니다.');
    } finally {
      await deleteClubsBySlugs(slugs);
    }
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

  it('serves approved and pending clubs together for additional join monitoring', async () => {
    const accountId = await signIn('qa-member2@fcmoim.test');
    await deleteMembershipForAccountId(accountId, clubIds.lynx);
    const membershipRoute = await import('../src/app/api/membership/route');
    const clubsRoute = await import('../src/app/api/membership/clubs/route');

    try {
      const joinResponse = await membershipRoute.POST(new Request('http://localhost/api/membership', {
        method: 'POST',
        body: JSON.stringify({
          clubId: clubIds.lynx,
          profile: {
            nickname: '추가대기',
            position: 'MF',
            heightCm: null,
            weightKg: null,
            birthDate: null,
            residence: null,
            photoUrl: null,
            preferredFoot: 'right',
            stats: null,
            ovr: null,
          },
        }),
      }));

      expect(joinResponse.status).toBe(201);

      const listResponse = await clubsRoute.GET();
      const body = await listResponse.json();

      expect(listResponse.status).toBe(200);
      expect(body).toEqual(expect.arrayContaining([
        expect.objectContaining({ clubId: clubIds.guppy, clubName: 'FC Guppy', status: 'approved' }),
        expect.objectContaining({ clubId: clubIds.orca, clubName: 'FC Orca', status: 'approved' }),
        expect.objectContaining({ clubId: clubIds.lynx, clubName: 'FC Lynx', status: 'pending' }),
      ]));
    } finally {
      await deleteMembershipForAccountId(accountId, clubIds.lynx);
    }
  });

  it('creates a selected-team pending membership, blocks duplicate joins, and enters approved after operator review', async () => {
    const newAccountId = await signIn('qa-new@fcmoim.test');
    await deleteMembershipForAccountId(newAccountId, clubIds.lynx);
    const membershipRoute = await import('../src/app/api/membership/route');
    const pendingRoute = await import('../src/app/api/membership/pending/route');
    const reviewRoute = await import('../src/app/api/membership/review/route');

    try {
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
            nickname: '오현우',
            position: 'MF',
            heightCm: 175,
            weightKg: 71,
            birthDate: '1996-01-27',
            residence: '서울 은평구',
            photoUrl: null,
            preferredFoot: 'right',
            stats: { attack: 61, defense: 60, stamina: 66, mentality: 63, speed: 65, manner: 69 },
            ovr: 64,
          },
        }),
      }));
      const created = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(created).toEqual(expect.objectContaining({
        clubId: clubIds.lynx,
        status: 'pending',
        nickname: '오현우',
      }));

      const duplicateResponse = await membershipRoute.POST(new Request('http://localhost/api/membership', {
        method: 'POST',
        body: JSON.stringify({
          clubId: clubIds.lynx,
          profile: {
            nickname: '오현우',
            position: 'MF',
            heightCm: 175,
            weightKg: 71,
            birthDate: '1996-01-27',
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
        expect.objectContaining({ id: created.id, clubId: clubIds.lynx, nickname: '오현우' }),
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
    } finally {
      await deleteMembershipForAccountId(newAccountId, clubIds.lynx);
    }
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
    const commentsRoute = await import('../src/app/api/comments/route');
    const title = schedulePollTitle;
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
    const firstOptionId = created.options[0]?.id;
    expect(created).toEqual(expect.objectContaining({
      clubId: clubIds.guppy,
      title,
      status: 'open',
      eligibleVoterCount: expect.any(Number),
      options: expect.arrayContaining([
        expect.objectContaining({ optionDate: schedulePollOptionDates[0] }),
        expect.objectContaining({ optionDate: schedulePollOptionDates[1] }),
      ]),
    }));

    expect(typeof firstOptionId).toBe('string');
    const emptyCommentsResponse = await commentsRoute.GET(
      new Request(`http://localhost/api/comments?clubId=${clubIds.guppy}&targetType=schedule_poll_option&targetId=${firstOptionId}`),
    );
    const emptyComments = await emptyCommentsResponse.json();

    expect(emptyCommentsResponse.status).toBe(200);
    expect(emptyComments).toEqual([]);

    const createCommentResponse = await commentsRoute.POST(new Request('http://localhost/api/comments', {
      method: 'POST',
      body: JSON.stringify({
        clubId: clubIds.guppy,
        targetType: 'schedule_poll_option',
        targetId: firstOptionId,
        content: 'poll option comment smoke',
      }),
    }));
    const createdComment = await createCommentResponse.json();

    expect(createCommentResponse.status).toBe(201);
    expect(createdComment).toEqual(expect.objectContaining({
      targetType: 'schedule_poll_option',
      targetId: firstOptionId,
      content: 'poll option comment smoke',
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
          eligibleVoterCount: expect.any(Number),
        }),
      ]),
    );

    await deleteCommentsByTargetIds([firstOptionId]);
    await deleteSchedulePollsByOptionDates(clubIds.guppy, schedulePollOptionDates);
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
          title: 'Round 7 공지',
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
      topGoals: expect.objectContaining({ nickname: '이영식' }),
    }));
  });

  it('lets operators update and delete announcements through API routes', async () => {
    const route = await import('../src/app/api/announcements/route');
    const titles = ['QA Round 수정 전', 'QA Round 수정 후'];
    await deleteAnnouncementsByTitles(clubIds.guppy, titles);

    try {
      await signIn('qa-operator@fcmoim.test');
      const createResponse = await route.POST(new Request('http://localhost/api/announcements', {
        method: 'POST',
        body: JSON.stringify({
          clubId: clubIds.guppy,
          seasonId: null,
          title: titles[0],
          content: '수정 전 공지입니다.',
          isPinned: false,
        }),
      }));
      const created = await createResponse.json();
      expect(createResponse.status).toBe(201);

      const updateResponse = await route.PATCH(new Request('http://localhost/api/announcements', {
        method: 'PATCH',
        body: JSON.stringify({
          announcementId: created.id,
          title: titles[1],
          content: '수정 후 공지입니다.',
          isPinned: true,
        }),
      }));
      const updated = await updateResponse.json();
      expect(updateResponse.status).toBe(200);
      expect(updated).toEqual(expect.objectContaining({
        id: created.id,
        title: titles[1],
        content: '수정 후 공지입니다.',
        isPinned: true,
      }));

      const deleteResponse = await route.DELETE(new Request('http://localhost/api/announcements', {
        method: 'DELETE',
        body: JSON.stringify({ announcementId: created.id }),
      }));
      expect(deleteResponse.status).toBe(200);

      const listResponse = await route.GET(
        new Request(`http://localhost/api/announcements?clubId=${clubIds.guppy}`),
      );
      const announcements = await listResponse.json();
      expect(announcements).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ id: created.id }),
      ]));
    } finally {
      await deleteAnnouncementsByTitles(clubIds.guppy, titles);
    }
  });

  it('rejects member announcement update and delete attempts through API routes', async () => {
    const route = await import('../src/app/api/announcements/route');
    const titles = ['QA Round 권한 확인', 'QA Round 권한 실패'];
    await deleteAnnouncementsByTitles(clubIds.guppy, titles);

    try {
      await signIn('qa-operator@fcmoim.test');
      const createResponse = await route.POST(new Request('http://localhost/api/announcements', {
        method: 'POST',
        body: JSON.stringify({
          clubId: clubIds.guppy,
          seasonId: null,
          title: titles[0],
          content: '권한 확인용 공지입니다.',
          isPinned: false,
        }),
      }));
      const created = await createResponse.json();
      expect(createResponse.status).toBe(201);

      await signIn('qa-member1@fcmoim.test');
      const updateResponse = await route.PATCH(new Request('http://localhost/api/announcements', {
        method: 'PATCH',
        body: JSON.stringify({
          announcementId: created.id,
          title: titles[1],
          content: '수정되면 안 됩니다.',
          isPinned: true,
        }),
      }));
      expect(updateResponse.status).toBe(403);

      const deleteResponse = await route.DELETE(new Request('http://localhost/api/announcements', {
        method: 'DELETE',
        body: JSON.stringify({ announcementId: created.id }),
      }));
      expect(deleteResponse.status).toBe(403);
    } finally {
      await deleteAnnouncementsByTitles(clubIds.guppy, titles);
    }
  });

  it('lets operators finish match results through the API with server-side settlement', async () => {
    const operatorAccountId = await signIn('qa-operator@fcmoim.test');
    const route = await import('../src/app/api/match-results/route');
    const memberAccountId = await signIn('qa-member1@fcmoim.test');
    await signIn('qa-operator@fcmoim.test');
    const operatorMembership = await getMembershipByAccount(operatorAccountId, clubIds.guppy);
    const memberMembership = await getMembershipByAccount(memberAccountId, clubIds.guppy);
    const operatorSnapshot = { ...operatorMembership };
    const memberSnapshot = { ...memberMembership };
    const matchId = await createMatchResultFixture({
      operatorMembershipId: operatorMembership.id,
      memberMembershipId: memberMembership.id,
    });

    try {
      const response = await route.POST(new Request('http://localhost/api/match-results', {
        method: 'POST',
        body: JSON.stringify({
          clubId: clubIds.guppy,
          matchId,
          score: { home: 2, away: 1 },
          playerStats: [
            { membershipId: memberMembership.id, goals: 2, assists: 1 },
          ],
        }),
      }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ matchId, saved: true });

      const admin = createAdminClient();
      const { data: match } = await admin
        .from('matches')
        .select('status, our_score, opp_score')
        .eq('id', matchId)
        .single();
      const { data: playerStats } = await admin
        .from('player_stats')
        .select('membership_id, goals, assists')
        .eq('match_id', matchId)
        .order('membership_id', { ascending: true });
      const { data: ledger } = await admin
        .from('point_ledger')
        .select('membership_id, amount, reason, source_type, source_id')
        .eq('source_id', matchId)
        .order('amount', { ascending: false });
      const { data: updatedWinner } = await admin
        .from('team_memberships')
        .select('ovr, match_points')
        .eq('id', memberMembership.id)
        .single<{ ovr: number; match_points: number }>();

      expect(match).toEqual({ status: 'finished', our_score: 2, opp_score: 1 });
      expect(playerStats).toEqual(expect.arrayContaining([
        expect.objectContaining({ membership_id: memberMembership.id, goals: 2, assists: 1 }),
        expect.objectContaining({ membership_id: operatorMembership.id, goals: 0, assists: 0 }),
      ]));
      expect(ledger).toEqual(expect.arrayContaining([
        expect.objectContaining({
          membership_id: memberMembership.id,
          amount: 525,
          reason: 'match_result',
          source_type: 'match_result',
          source_id: matchId,
        }),
        expect.objectContaining({
          membership_id: operatorMembership.id,
          amount: 200,
          reason: 'match_result',
          source_type: 'match_result',
          source_id: matchId,
        }),
      ]));
      expect(updatedWinner?.match_points).toBe(memberSnapshot.match_points + 525);
    } finally {
      await deleteMatchResultFixture(matchId);
      await restoreMembershipSnapshot(operatorSnapshot);
      await restoreMembershipSnapshot(memberSnapshot);
    }
  });

  it('rejects member, future, cancelled, finished, and cross-club match result saves', async () => {
    const operatorAccountId = await signIn('qa-operator@fcmoim.test');
    const memberAccountId = await signIn('qa-member1@fcmoim.test');
    const route = await import('../src/app/api/match-results/route');
    const operatorMembership = await getMembershipByAccount(operatorAccountId, clubIds.guppy);
    const memberMembership = await getMembershipByAccount(memberAccountId, clubIds.guppy);
    const matchIds: string[] = [];

    try {
      const scheduledMatchId = await createMatchResultFixture({
        operatorMembershipId: operatorMembership.id,
        memberMembershipId: memberMembership.id,
      });
      matchIds.push(scheduledMatchId);

      await signIn('qa-member1@fcmoim.test');
      const memberResponse = await route.POST(new Request('http://localhost/api/match-results', {
        method: 'POST',
        body: JSON.stringify({
          clubId: clubIds.guppy,
          matchId: scheduledMatchId,
          score: { home: 1, away: 0 },
          playerStats: [],
        }),
      }));
      expect(memberResponse.status).toBe(403);

      await signIn('qa-operator@fcmoim.test');
      for (const fixture of [
        { status: 'scheduled' as const, date: '2031-01-01T20:00:00.000+09:00', expected: 400 },
        { status: 'cancelled' as const, date: '2026-02-20T20:00:00.000+09:00', expected: 409 },
        { status: 'finished' as const, date: '2026-02-21T20:00:00.000+09:00', expected: 409 },
      ]) {
        const matchId = await createMatchResultFixture({
          status: fixture.status,
          date: fixture.date,
          operatorMembershipId: operatorMembership.id,
          memberMembershipId: memberMembership.id,
        });
        matchIds.push(matchId);
        const response = await route.POST(new Request('http://localhost/api/match-results', {
          method: 'POST',
          body: JSON.stringify({
            clubId: clubIds.guppy,
            matchId,
            score: { home: 1, away: 0 },
            playerStats: [],
          }),
        }));
        expect(response.status).toBe(fixture.expected);
      }

      const crossClubResponse = await route.POST(new Request('http://localhost/api/match-results', {
        method: 'POST',
        body: JSON.stringify({
          clubId: clubIds.orca,
          matchId: scheduledMatchId,
          score: { home: 1, away: 0 },
          playerStats: [],
        }),
      }));
      expect(crossClubResponse.status).toBe(404);
    } finally {
      await signIn('qa-operator@fcmoim.test');
      await Promise.all(matchIds.map((matchId) => deleteMatchResultFixture(matchId)));
    }
  });
});
