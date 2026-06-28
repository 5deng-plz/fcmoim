import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const teamId = '00000000-0000-0000-0000-000000000001';
const arbitraryTeamId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
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
  const password = process.env.QA_LOCAL_ACCOUNT_PASSWORD;

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

async function deleteFcmTokens(tokens: string[]) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('fcm_tokens')
    .delete()
    .in('token', tokens);

  if (error) {
    throw new Error(`Failed to clean FCM tokens: ${error.message}`);
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

async function deleteFeedPostsByIds(postIds: string[]) {
  if (postIds.length === 0) return;

  const admin = createAdminClient();
  await admin.from('feed_reactions').delete().in('post_id', postIds);
  await admin.from('comments').delete().in('target_id', postIds);
  const { error } = await admin.from('feed_posts').delete().in('id', postIds);

  if (error) {
    throw new Error(`Failed to clean feed posts: ${error.message}`);
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
    .select('id, ovr, stats, match_points, selected_trait_id')
    .eq('account_id', accountId)
    .eq('club_id', clubId)
    .single<{
      id: string;
      ovr: number;
      stats: { attack: number; defense: number; stamina: number; mentality: number; speed: number; manner: number };
      match_points: number;
      selected_trait_id: string | null;
    }>();

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
  const clubId = input.clubId ?? teamId;
  const status = input.status ?? 'scheduled';
  const date = input.date ?? `2026-02-${String(resultFixtureDay++).padStart(2, '0')}T20:00:00.000+09:00`;

  const { error: matchError } = await admin
    .from('matches')
    .insert({
      id: matchId,
      club_id: clubId,
      season_id: '00000000-0000-0000-0000-000000000101',
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

async function restoreMembershipSnapshot(snapshot: { id: string; ovr: number; match_points: number; selected_trait_id?: string | null }) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('team_memberships')
    .update({
      ovr: snapshot.ovr,
      match_points: snapshot.match_points,
      selected_trait_id: snapshot.selected_trait_id ?? null,
    })
    .eq('id', snapshot.id);

  if (error) {
    throw new Error(`Failed to restore membership ${snapshot.id}: ${error.message}`);
  }
}

async function cleanTraitShopState(membershipId: string, traitIds: string[]) {
  const admin = createAdminClient();
  await admin
    .from('point_ledger')
    .delete()
    .eq('membership_id', membershipId)
    .eq('source_type', 'trait_shop');
  await admin
    .from('unlocked_traits')
    .delete()
    .eq('membership_id', membershipId)
    .in('trait_id', traitIds);
}

describeLocal('local Supabase API integration', () => {
  beforeAll(async () => {
    process.env.ENABLE_E2E_TEST_AUTH_BYPASS = 'false';
    await signIn('qa-operator@fcmoim.test');
  });

  it('serves only FC Guppy through canonical and compatibility public APIs', async () => {
    authorization = '';
    const listRoute = await import('../src/app/api/public/clubs/route');
    const detailRoute = await import('../src/app/api/public/clubs/[clubId]/route');
    const teamRoute = await import('../src/app/api/team/route');

    const listResponse = await listRoute.GET();
    const clubs = await listResponse.json();
    const teamResponse = await teamRoute.GET();
    const team = await teamResponse.json();

    expect(listResponse.status).toBe(200);
    expect(teamResponse.status).toBe(200);
    expect(clubs).toHaveLength(1);
    expect(clubs[0]).toEqual(expect.objectContaining({ id: teamId, name: 'FC Guppy' }));
    expect(team).toEqual(expect.objectContaining({ name: 'FC Guppy' }));
    expect(team).not.toHaveProperty('id');
    expect(team).not.toHaveProperty('slug');
    for (const club of clubs) {
      expect(Object.keys(club).sort()).toEqual([...publicClubSummaryKeys].sort());
    }

    const detailResponse = await detailRoute.GET(
      new Request(`http://localhost/api/public/clubs/${arbitraryTeamId}`),
      { params: Promise.resolve({ clubId: arbitraryTeamId }) },
    );
    const detail = await detailResponse.json();

    expect(detailResponse.status).toBe(200);
    expect(Object.keys(detail).sort()).toEqual([...publicClubDetailKeys].sort());
    expect(detail).toEqual(expect.objectContaining({
      id: teamId,
      name: 'FC Guppy',
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
    const currentRoute = await import('../src/app/api/membership/current/route');

    const response = await route.GET();
    const body = await response.json();
    const currentResponse = await currentRoute.GET();
    const current = await currentResponse.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clubId: teamId,
          role: 'operator',
          status: 'approved',
        }),
      ]),
    );
    expect(currentResponse.status).toBe(200);
    expect(current).toEqual(expect.objectContaining({
      membershipState: 'approved',
      membership: expect.objectContaining({ role: 'operator' }),
    }));
    expect(current.membership).not.toHaveProperty('clubId');
  });

  it('filters compatibility memberships to FC Guppy', async () => {
    await signIn('qa-member2@fcmoim.test');
    const route = await import('../src/app/api/membership/clubs/route');

    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({ clubId: teamId, clubName: 'FC Guppy', status: 'approved' }),
    ]);
  });

  it('patches profile stats, recalculates ovr, persists valid stats, and rejects invalid stats', async () => {
    const accountId = await signIn('qa-member1@fcmoim.test');
    const membership = await getMembershipByAccount(accountId, teamId);
    const profileRoute = await import('../src/app/api/membership/profile/route');
    const membershipRoute = await import('../src/app/api/membership/route');
    const admin = createAdminClient();
    const nextStats = {
      attack: 70,
      defense: 60,
      stamina: 60,
      mentality: 60,
      speed: 60,
      manner: 60,
    };

    try {
      const updateResponse = await profileRoute.PATCH(new Request('http://localhost/api/membership/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          clubId: teamId,
          stats: nextStats,
          ovr: 99,
        }),
      }));
      const updated = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updated).toEqual(expect.objectContaining({
        stats: nextStats,
        ovr: 62,
      }));

      const snapshotResponse = await membershipRoute.GET(
        new Request(`http://localhost/api/membership?clubId=${teamId}`),
      );
      const snapshot = await snapshotResponse.json();

      expect(snapshotResponse.status).toBe(200);
      expect(snapshot.membership).toEqual(expect.objectContaining({
        stats: nextStats,
        ovr: 62,
      }));

      const invalidTotalResponse = await profileRoute.PATCH(new Request('http://localhost/api/membership/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          clubId: teamId,
          stats: {
            attack: 99,
            defense: 99,
            stamina: 99,
            mentality: 99,
            speed: 99,
            manner: 99,
          },
        }),
      }));
      expect(invalidTotalResponse.status).toBe(400);

      const invalidShapeResponse = await profileRoute.PATCH(new Request('http://localhost/api/membership/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          clubId: teamId,
          stats: {
            attack: 70,
            defense: 60,
            stamina: 60,
            mentality: 60,
            speed: 60,
          },
        }),
      }));
      expect(invalidShapeResponse.status).toBe(400);
    } finally {
      const { error } = await admin
        .from('team_memberships')
        .update({
          stats: membership.stats,
          ovr: membership.ovr,
        })
        .eq('id', membership.id);

      if (error) {
        throw new Error(`Failed to restore membership stats: ${error.message}`);
      }
    }
  });

  it('ignores a foreign join target and keeps the existing FC Guppy membership', async () => {
    await signIn('qa-member2@fcmoim.test');
    const membershipRoute = await import('../src/app/api/membership/route');
    const clubsRoute = await import('../src/app/api/membership/clubs/route');

    const joinResponse = await membershipRoute.POST(new Request('http://localhost/api/membership', {
      method: 'POST',
      body: JSON.stringify({
        clubId: arbitraryTeamId,
        profile: {
          nickname: '추가대기',
          position: 'MF',
        },
      }),
    }));
    expect(joinResponse.status).toBe(409);

    const listResponse = await clubsRoute.GET();
    const body = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({ clubId: teamId, clubName: 'FC Guppy', status: 'approved' }),
    ]);
  });

  it('ignores foreign clubId throughout join, review, and bootstrap flows', async () => {
    const newAccountId = await signIn('qa-new@fcmoim.test');
    await deleteMembershipForAccountId(newAccountId, teamId);
    const membershipRoute = await import('../src/app/api/membership/route');
    const pendingRoute = await import('../src/app/api/membership/pending/route');
    const reviewRoute = await import('../src/app/api/membership/review/route');

    try {
      const initialResponse = await membershipRoute.GET(
        new Request(`http://localhost/api/membership?clubId=${arbitraryTeamId}`),
      );
      const initial = await initialResponse.json();

      expect(initialResponse.status).toBe(200);
      expect(initial.membershipState).toBe('new');

      const createResponse = await membershipRoute.POST(new Request('http://localhost/api/membership', {
        method: 'POST',
        body: JSON.stringify({
          clubId: arbitraryTeamId,
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

      expect(createResponse.status, JSON.stringify(created)).toBe(201);
      expect(created).toEqual(expect.objectContaining({
        status: 'pending',
        nickname: '오현우',
      }));

      const duplicateResponse = await membershipRoute.POST(new Request('http://localhost/api/membership', {
        method: 'POST',
        body: JSON.stringify({
          clubId: arbitraryTeamId,
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
        new Request(`http://localhost/api/membership/pending?clubId=${arbitraryTeamId}`),
      );
      const pending = await pendingResponse.json();

      expect(pendingResponse.status).toBe(200);
      expect(pending).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: created.id, nickname: '오현우' }),
      ]));

      const reviewResponse = await reviewRoute.PATCH(new Request('http://localhost/api/membership/review', {
        method: 'PATCH',
        body: JSON.stringify({
          clubId: arbitraryTeamId,
          membershipId: created.id,
          decision: 'approved',
        }),
      }));
      const reviewed = await reviewResponse.json();

      expect(reviewResponse.status).toBe(200);
      expect(reviewed).toEqual(expect.objectContaining({
        id: created.id,
        status: 'approved',
      }));

      await signIn('qa-new@fcmoim.test');
      const approvedResponse = await membershipRoute.GET(
        new Request(`http://localhost/api/membership?clubId=${arbitraryTeamId}`),
      );
      const approved = await approvedResponse.json();

      expect(approvedResponse.status).toBe(200);
      expect(approved.membershipState).toBe('approved');
      expect(approved.membership).toEqual(expect.objectContaining({
        id: created.id,
        status: 'approved',
      }));
    } finally {
      await deleteMembershipForAccountId(newAccountId, teamId);
    }
  });

  it('allows members to manage only their own FCM tokens', async () => {
    const memberOneAccountId = await signIn('qa-member1@fcmoim.test');
    const memberTwoAccountId = await signIn('qa-member2@fcmoim.test');
    const route = await import('../src/app/api/fcm-tokens/route');
    const tokenOne = `local-token-${Date.now()}-one`;
    const tokenTwo = `local-token-${Date.now()}-two`;

    try {
      await deleteFcmTokens([tokenOne, tokenTwo]);
      await signIn('qa-member1@fcmoim.test');

      const createResponse = await route.POST(new Request('http://localhost/api/fcm-tokens', {
        method: 'POST',
        headers: { 'user-agent': 'Vitest Local API' },
        body: JSON.stringify({ token: tokenOne, deviceInfo: { platform: 'vitest' } }),
      }));
      expect(createResponse.status).toBe(200);

      const admin = createAdminClient();
      const { error: insertOtherError } = await admin.from('fcm_tokens').upsert({
        account_id: memberTwoAccountId,
        token: tokenTwo,
        device_info: { platform: 'other' },
      }, { onConflict: 'token' });
      expect(insertOtherError).toBeNull();

      const { data: visibleTokens, error: visibleTokensError } = await authClient!
        .from('fcm_tokens')
        .select('token, account_id')
        .in('token', [tokenOne, tokenTwo]);

      expect(visibleTokensError).toBeNull();
      expect(visibleTokens).toEqual([
        expect.objectContaining({ token: tokenOne, account_id: memberOneAccountId }),
      ]);

      const deleteResponse = await route.DELETE(new Request('http://localhost/api/fcm-tokens', {
        method: 'DELETE',
        body: JSON.stringify({ token: tokenOne }),
      }));
      expect(deleteResponse.status).toBe(200);

      const { data: remainingOwnToken, error: remainingError } = await admin
        .from('fcm_tokens')
        .select('token')
        .eq('token', tokenOne);
      expect(remainingError).toBeNull();
      expect(remainingOwnToken).toEqual([]);
    } finally {
      await deleteFcmTokens([tokenOne, tokenTwo]);
    }
  });

  it('rejects pending list and review access for a regular member', async () => {
    await signIn('qa-member1@fcmoim.test');
    const pendingRoute = await import('../src/app/api/membership/pending/route');
    const reviewRoute = await import('../src/app/api/membership/review/route');

    const pendingResponse = await pendingRoute.GET(
      new Request(`http://localhost/api/membership/pending?clubId=${arbitraryTeamId}`),
    );
    const pending = await pendingResponse.json();

    expect(pendingResponse.status).toBe(403);
    expect(pending.error.code).toBe('forbidden');

    const reviewResponse = await reviewRoute.PATCH(new Request('http://localhost/api/membership/review', {
      method: 'PATCH',
      body: JSON.stringify({
        clubId: arbitraryTeamId,
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
    await deleteSchedulePollsByOptionDates(teamId, schedulePollOptionDates);

    const createResponse = await route.POST(new Request('http://localhost/api/schedule-polls', {
      method: 'POST',
      body: JSON.stringify({
        clubId: teamId,
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
      title,
      status: 'open',
      eligibleVoterCount: expect.any(Number),
      options: expect.arrayContaining([
        expect.objectContaining({ optionDate: schedulePollOptionDates[0] }),
        expect.objectContaining({ optionDate: schedulePollOptionDates[1] }),
      ]),
    }));
    expect(created).not.toHaveProperty('clubId');
    expect(created).not.toHaveProperty('teamId');

    expect(typeof firstOptionId).toBe('string');
    const emptyCommentsResponse = await commentsRoute.GET(
      new Request(`http://localhost/api/comments?clubId=${teamId}&targetType=schedule_poll_option&targetId=${firstOptionId}`),
    );
    const emptyComments = await emptyCommentsResponse.json();

    expect(emptyCommentsResponse.status).toBe(200);
    expect(emptyComments).toEqual([]);

    const createCommentResponse = await commentsRoute.POST(new Request('http://localhost/api/comments', {
      method: 'POST',
      body: JSON.stringify({
        clubId: teamId,
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
      new Request(`http://localhost/api/schedule-polls?clubId=${teamId}`),
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
    await deleteSchedulePollsByOptionDates(teamId, schedulePollOptionDates);
  });

  it('enforces feed media storage bucket policies for club members', async () => {
    await signIn('qa-member1@fcmoim.test');
    const admin = createAdminClient();
    const { data: bucket, error: bucketError } = await admin.storage.getBucket('feed-media');

    expect(bucketError).toBeNull();
    expect(bucket).toEqual(expect.objectContaining({ id: 'feed-media', public: false }));

    if (!authClient) {
      throw new Error('Expected authenticated Supabase client.');
    }

    const ownedPath = `${teamId}/local-api-${crypto.randomUUID()}.png`;
    const deniedPath = `${arbitraryTeamId}/local-api-${crypto.randomUUID()}.png`;

    try {
      const upload = await authClient.storage
        .from('feed-media')
        .upload(ownedPath, new Uint8Array([137, 80, 78, 71]), {
          contentType: 'image/png',
          upsert: false,
        });

      expect(upload.error).toBeNull();

      const download = await authClient.storage.from('feed-media').download(ownedPath);
      expect(download.error).toBeNull();

      const deniedUpload = await authClient.storage
        .from('feed-media')
        .upload(deniedPath, new Uint8Array([137, 80, 78, 71]), {
          contentType: 'image/png',
          upsert: false,
        });

      expect(deniedUpload.error).not.toBeNull();
    } finally {
      await admin.storage.from('feed-media').remove([ownedPath, deniedPath]);
    }
  });

  it('creates feed posts with reactions and shared comments through API routes', async () => {
    await signIn('qa-member1@fcmoim.test');
    const feedRoute = await import('../src/app/api/feed-posts/route');
    const reactionRoute = await import('../src/app/api/feed-posts/[id]/react/route');
    const commentsRoute = await import('../src/app/api/comments/route');
    const createdPostIds: string[] = [];

    try {
      const createResponse = await feedRoute.POST(new Request('http://localhost/api/feed-posts', {
        method: 'POST',
        body: JSON.stringify({
          clubId: teamId,
          contentType: 'text',
          textContent: 'local feed post smoke',
        }),
      }));
      const created = await createResponse.json();

      expect(createResponse.status, JSON.stringify(created)).toBe(201);
      expect(typeof created.id).toBe('string');
      createdPostIds.push(created.id);
      expect(created).toEqual(expect.objectContaining({
        clubId: teamId,
        contentType: 'text',
        textContent: 'local feed post smoke',
      }));

      const reactionResponse = await reactionRoute.POST(new Request(`http://localhost/api/feed-posts/${created.id}/react`, {
        method: 'POST',
        body: JSON.stringify({
          clubId: teamId,
          reactionType: 'up',
        }),
      }), { params: Promise.resolve({ id: created.id }) });

      expect(reactionResponse.status).toBe(200);
      expect(await reactionResponse.json()).toEqual(expect.objectContaining({
        postId: created.id,
        toggled: true,
      }));

      const createCommentResponse = await commentsRoute.POST(new Request('http://localhost/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          clubId: teamId,
          targetType: 'feed_post',
          targetId: created.id,
          content: 'feed post comment smoke',
        }),
      }));
      const createdComment = await createCommentResponse.json();

      expect(createCommentResponse.status).toBe(201);
      expect(createdComment).toEqual(expect.objectContaining({
        targetType: 'feed_post',
        targetId: created.id,
        content: 'feed post comment smoke',
      }));

      const listResponse = await feedRoute.GET(
        new Request(`http://localhost/api/feed-posts?clubId=${teamId}`),
      );
      const posts = await listResponse.json();

      expect(listResponse.status).toBe(200);
      expect(posts).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          reactionCounts: expect.objectContaining({ up: 1 }),
          commentCount: 1,
        }),
      ]));
    } finally {
      await deleteFeedPostsByIds(createdPostIds);
    }
  });

  it('serves rich local demo announcements and records through API routes', async () => {
    await signIn('qa-operator@fcmoim.test');
    const announcementsRoute = await import('../src/app/api/announcements/route');
    const recordsRoute = await import('../src/app/api/records/season-summary/route');

    const announcementsResponse = await announcementsRoute.GET(
      new Request(`http://localhost/api/announcements?clubId=${teamId}`),
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
      new Request(`http://localhost/api/records/season-summary?clubId=${teamId}`),
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
    await deleteAnnouncementsByTitles(teamId, titles);

    try {
      await signIn('qa-operator@fcmoim.test');
      const createResponse = await route.POST(new Request('http://localhost/api/announcements', {
        method: 'POST',
        body: JSON.stringify({
          clubId: teamId,
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
        new Request(`http://localhost/api/announcements?clubId=${teamId}`),
      );
      const announcements = await listResponse.json();
      expect(announcements).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ id: created.id }),
      ]));
    } finally {
      await deleteAnnouncementsByTitles(teamId, titles);
    }
  });

  it('rejects member announcement update and delete attempts through API routes', async () => {
    const route = await import('../src/app/api/announcements/route');
    const titles = ['QA Round 권한 확인', 'QA Round 권한 실패'];
    await deleteAnnouncementsByTitles(teamId, titles);

    try {
      await signIn('qa-operator@fcmoim.test');
      const createResponse = await route.POST(new Request('http://localhost/api/announcements', {
        method: 'POST',
        body: JSON.stringify({
          clubId: teamId,
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
      await deleteAnnouncementsByTitles(teamId, titles);
    }
  });

  it('lets operators finish match results through the API with server-side settlement', async () => {
    const operatorAccountId = await signIn('qa-operator@fcmoim.test');
    const route = await import('../src/app/api/match-results/route');
    const memberAccountId = await signIn('qa-member1@fcmoim.test');
    await signIn('qa-operator@fcmoim.test');
    const operatorMembership = await getMembershipByAccount(operatorAccountId, teamId);
    const memberMembership = await getMembershipByAccount(memberAccountId, teamId);
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
          clubId: teamId,
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

  it('purchases and equips locker room traits through authenticated API routes', async () => {
    const memberAccountId = await signIn('qa-member1@fcmoim.test');
    const purchaseRoute = await import('../src/app/api/membership/traits/purchase/route');
    const equipRoute = await import('../src/app/api/membership/traits/equip/route');
    const memberMembership = await getMembershipByAccount(memberAccountId, teamId);
    const memberSnapshot = { ...memberMembership };
    const admin = createAdminClient();
    const traitId = 'dummy-runner';

    try {
      await cleanTraitShopState(memberMembership.id, [traitId, 'line-breaker']);
      const { error: prepError } = await admin
        .from('team_memberships')
        .update({ match_points: 200, selected_trait_id: null })
        .eq('id', memberMembership.id);
      if (prepError) throw new Error(`Failed to prepare trait shop fixture: ${prepError.message}`);

      const purchaseResponse = await purchaseRoute.POST(new Request('http://localhost/api/membership/traits/purchase', {
        method: 'POST',
        body: JSON.stringify({
          clubId: teamId,
          traitId,
        }),
      }));
      const purchaseBody = await purchaseResponse.json();

      expect(purchaseResponse.status).toBe(200);
      expect(purchaseBody.membership).toEqual(expect.objectContaining({
        id: memberMembership.id,
        matchPoints: 50,
        selectedTraitId: null,
      }));
      expect(purchaseBody.unlockedTraitIds).toContain(traitId);

      const duplicateResponse = await purchaseRoute.POST(new Request('http://localhost/api/membership/traits/purchase', {
        method: 'POST',
        body: JSON.stringify({
          clubId: teamId,
          traitId,
        }),
      }));
      const duplicateBody = await duplicateResponse.json();

      expect(duplicateResponse.status).toBe(200);
      expect(duplicateBody.membership.matchPoints).toBe(50);

      const equipResponse = await equipRoute.PATCH(new Request('http://localhost/api/membership/traits/equip', {
        method: 'PATCH',
        body: JSON.stringify({
          clubId: teamId,
          traitId,
        }),
      }));
      const equipBody = await equipResponse.json();

      expect(equipResponse.status).toBe(200);
      expect(equipBody.membership.selectedTraitId).toBe(traitId);

      const lockedResponse = await equipRoute.PATCH(new Request('http://localhost/api/membership/traits/equip', {
        method: 'PATCH',
        body: JSON.stringify({
          clubId: teamId,
          traitId: 'line-breaker',
        }),
      }));

      expect(lockedResponse.status).toBe(403);

      const { data: ledger } = await admin
        .from('point_ledger')
        .select('membership_id, amount, reason, source_type')
        .eq('membership_id', memberMembership.id)
        .eq('source_type', 'trait_shop');
      expect(ledger).toEqual([
        {
          membership_id: memberMembership.id,
          amount: -150,
          reason: 'shop_purchase',
          source_type: 'trait_shop',
        },
      ]);
    } finally {
      await cleanTraitShopState(memberMembership.id, [traitId, 'line-breaker']);
      await restoreMembershipSnapshot(memberSnapshot);
    }
  });

  it('rejects invalid match result saves and ignores a foreign clubId for a valid FC Guppy match', async () => {
    const operatorAccountId = await signIn('qa-operator@fcmoim.test');
    const memberAccountId = await signIn('qa-member1@fcmoim.test');
    const route = await import('../src/app/api/match-results/route');
    const operatorMembership = await getMembershipByAccount(operatorAccountId, teamId);
    const memberMembership = await getMembershipByAccount(memberAccountId, teamId);
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
          clubId: teamId,
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
            clubId: teamId,
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
          clubId: arbitraryTeamId,
          matchId: scheduledMatchId,
          score: { home: 1, away: 0 },
          playerStats: [],
        }),
      }));
      expect(crossClubResponse.status).toBe(200);
    } finally {
      await signIn('qa-operator@fcmoim.test');
      await Promise.all(matchIds.map((matchId) => deleteMatchResultFixture(matchId)));
    }
  });
});
