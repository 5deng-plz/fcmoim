import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createSupabaseServerClientMock,
  getRequiredServerAuthContextMock,
  createPrivilegedSupabaseClientMock,
  sendEachForMulticastMock,
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  getRequiredServerAuthContextMock: vi.fn(),
  createPrivilegedSupabaseClientMock: vi.fn(),
  sendEachForMulticastMock: vi.fn(),
}));

vi.mock('../src/lib/supabase-server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
  getRequiredServerAuthContext: getRequiredServerAuthContextMock,
  createPrivilegedSupabaseClient: createPrivilegedSupabaseClientMock,
}));

vi.mock('firebase-admin/app', () => ({
  applicationDefault: vi.fn(() => ({})),
  cert: vi.fn((value) => value),
  getApps: vi.fn(() => [{ name: 'test-app' }]),
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => ({
    sendEachForMulticast: sendEachForMulticastMock,
  })),
}));

describe('FCM token API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRequiredServerAuthContextMock.mockResolvedValue({
      user: { id: 'account-1', email: 'member@example.com' },
    });
  });

  it('upserts the current account FCM token with device info', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    createSupabaseServerClientMock.mockResolvedValue({
      from: vi.fn(() => ({ upsert })),
    });
    const route = await import('../src/app/api/fcm-tokens/route');

    const response = await route.POST(new Request('http://localhost/api/fcm-tokens', {
      method: 'POST',
      headers: { 'user-agent': 'Vitest Browser' },
      body: JSON.stringify({ token: 'fcm-token', deviceInfo: { platform: 'MacIntel' } }),
    }));

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: 'account-1',
        token: 'fcm-token',
        device_info: expect.objectContaining({
          platform: 'MacIntel',
          userAgent: 'Vitest Browser',
        }),
      }),
      { onConflict: 'token' },
    );
  });

  it('deletes a token through the authenticated Supabase client', async () => {
    const eq = vi.fn(async () => ({ error: null }));
    const deleteToken = vi.fn(() => ({ eq }));
    createSupabaseServerClientMock.mockResolvedValue({
      from: vi.fn(() => ({ delete: deleteToken })),
    });
    const route = await import('../src/app/api/fcm-tokens/route');

    const response = await route.DELETE(new Request('http://localhost/api/fcm-tokens', {
      method: 'DELETE',
      body: JSON.stringify({ token: 'fcm-token' }),
    }));

    expect(response.status).toBe(200);
    expect(deleteToken).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('token', 'fcm-token');
  });
});

describe('notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRequiredServerAuthContextMock.mockResolvedValue({
      user: { id: 'account-1', email: 'member@example.com' },
    });
  });

  it('lists notifications for the current club membership', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'team_memberships') {
          return createQuery({ data: { id: 'membership-1' }, error: null }, { maybeSingle: true });
        }
        return createQuery({
          data: [{
            id: 'notification-1',
            membership_id: 'membership-1',
            type: 'MATCH_CREATED',
            title: '새 일정',
            body: '확인해주세요',
            is_read: false,
            target_url: '/?tab=schedule',
            metadata: { matchId: 'match-1' },
            created_at: '2026-06-13T12:00:00.000Z',
            updated_at: '2026-06-13T12:00:00.000Z',
          }],
          error: null,
        });
      }),
    };
    createSupabaseServerClientMock.mockResolvedValue(supabase);
    const route = await import('../src/app/api/notifications/route');

    const response = await route.GET(new Request('http://localhost/api/notifications?clubId=club-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifications).toEqual([
      expect.objectContaining({
        id: 'notification-1',
        membershipId: 'membership-1',
        isRead: false,
        targetUrl: '/?tab=schedule',
      }),
    ]);
  });

  it('marks all notifications as read for the current club membership', async () => {
    const update = vi.fn(() => createQuery({ data: [], error: null }));
    createSupabaseServerClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'team_memberships') {
          return createQuery({ data: { id: 'membership-1' }, error: null }, { maybeSingle: true });
        }
        return { update };
      }),
    });
    const route = await import('../src/app/api/notifications/route');

    const response = await route.PATCH(new Request('http://localhost/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ clubId: 'club-1', markAllRead: true }),
    }));

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ is_read: true });
  });
});

describe('push sender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates DB notifications, sends FCM multicast, and removes stale tokens', async () => {
    const notificationInsert = vi.fn(async () => ({ error: null }));
    const staleDeleteIn = vi.fn(async () => ({ error: null }));
    const staleDelete = vi.fn(() => ({ in: staleDeleteIn }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'team_memberships') {
          return createQuery({
            data: [{ id: 'membership-2', account_id: 'account-2' }],
            error: null,
          });
        }
        if (table === 'fcm_tokens') {
          return {
            select: () => createQuery({
              data: [
                { token: 'token-ok', account_id: 'account-2' },
                { token: 'token-stale', account_id: 'account-2' },
              ],
              error: null,
            }),
            delete: staleDelete,
          };
        }
        return { insert: notificationInsert };
      }),
    };
    createPrivilegedSupabaseClientMock.mockReturnValue(supabase);
    sendEachForMulticastMock.mockResolvedValue({
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
    });
    const { sendPushToClubMembers } = await import('../src/lib/push-sender');

    await sendPushToClubMembers('club-1', {
      type: 'MATCH_CREATED',
      title: '새 일정',
      targetUrl: '/?tab=schedule',
      metadata: { matchId: 'match-1' },
    }, { excludeAccountId: 'account-1' });

    expect(notificationInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        membership_id: 'membership-2',
        type: 'MATCH_CREATED',
        target_url: '/?tab=schedule',
      }),
    ]);
    expect(sendEachForMulticastMock).toHaveBeenCalledWith(expect.objectContaining({
      tokens: ['token-ok', 'token-stale'],
      data: expect.objectContaining({
        type: 'MATCH_CREATED',
        targetUrl: '/?tab=schedule',
      }),
    }));
    expect(staleDeleteIn).toHaveBeenCalledWith('token', ['token-stale']);
  });
});

function createQuery(
  result: { data: unknown; error: unknown },
  options: { maybeSingle?: boolean } = {},
) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    neq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) => (
      Promise.resolve(result).then(resolve, reject)
    ),
  };

  if (!options.maybeSingle) {
    query.maybeSingle = vi.fn(async () => {
      throw new Error('maybeSingle was not expected.');
    });
  }

  return query;
}
