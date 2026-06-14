import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createPrivilegedSupabaseClient } from './supabase-server';
import { NOTIFICATION_TEMPLATES, type NotificationType } from './fcm';
import type { MembershipRole } from '@/types/domain';

type JsonObject = Record<string, string | number | boolean | null>;

export type PushPayload = {
  type: NotificationType;
  title?: string;
  body?: string;
  targetUrl?: string | null;
  metadata?: JsonObject;
};

type PushRecipient = {
  membershipId: string;
  accountId: string;
};

type FCMTokenRow = {
  token: string;
  account_id: string;
};

const INVALID_FCM_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

export function fireAndForgetPush(label: string, task: () => Promise<void>) {
  void task().catch((error) => {
    console.error(`[FC Moim] Push notification failed after ${label}:`, error);
  });
}

export async function sendPushToAccount(accountId: string, payload: PushPayload) {
  const supabase = createPrivilegedSupabaseClient();
  const recipients = await getMembershipRecipientsByAccount(supabase, accountId);
  await sendPushToRecipients(supabase, recipients, payload);
}

export async function sendPushToMembership(membershipId: string, payload: PushPayload) {
  const supabase = createPrivilegedSupabaseClient();
  const recipient = await getMembershipRecipientById(supabase, membershipId);
  await sendPushToRecipients(supabase, recipient ? [recipient] : [], payload);
}

export async function sendPushToClubMembers(
  clubId: string,
  payload: PushPayload,
  options: { excludeAccountId?: string | null } = {},
) {
  const supabase = createPrivilegedSupabaseClient();
  const recipients = await getMembershipRecipientsByClub(supabase, clubId, {
    excludeAccountId: options.excludeAccountId ?? null,
  });
  await sendPushToRecipients(supabase, recipients, payload);
}

export async function sendPushToClubOperators(
  clubId: string,
  payload: PushPayload,
  options: { excludeAccountId?: string | null } = {},
) {
  const supabase = createPrivilegedSupabaseClient();
  const recipients = await getMembershipRecipientsByClub(supabase, clubId, {
    roles: ['admin', 'operator'],
    excludeAccountId: options.excludeAccountId ?? null,
  });
  await sendPushToRecipients(supabase, recipients, payload);
}

async function sendPushToRecipients(
  supabase: SupabaseClient,
  recipients: PushRecipient[],
  payload: PushPayload,
) {
  if (recipients.length === 0) {
    return;
  }

  const notification = normalizePayload(payload);
  await createNotificationRows(supabase, recipients, notification);

  const tokens = await getTokensForRecipients(supabase, recipients);
  if (tokens.length === 0) {
    return;
  }

  const staleTokens = await sendFCMMulticast(tokens.map((row) => row.token), notification);
  if (staleTokens.length > 0) {
    await deleteStaleTokens(supabase, staleTokens);
  }
}

function normalizePayload(payload: PushPayload) {
  return {
    type: payload.type,
    title: payload.title ?? 'FC moim',
    body: payload.body ?? NOTIFICATION_TEMPLATES[payload.type],
    targetUrl: payload.targetUrl ?? '/',
    metadata: payload.metadata ?? {},
  };
}

async function createNotificationRows(
  supabase: SupabaseClient,
  recipients: PushRecipient[],
  notification: ReturnType<typeof normalizePayload>,
) {
  const rows = recipients.map((recipient) => ({
    membership_id: recipient.membershipId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    target_url: notification.targetUrl,
    metadata: notification.metadata,
  }));

  const { error } = await supabase.from('notifications').insert(rows);
  if (error) {
    throw error;
  }
}

async function getTokensForRecipients(
  supabase: SupabaseClient,
  recipients: PushRecipient[],
): Promise<FCMTokenRow[]> {
  const accountIds = [...new Set(recipients.map((recipient) => recipient.accountId))];
  const { data, error } = await supabase
    .from('fcm_tokens')
    .select('token, account_id')
    .in('account_id', accountIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as FCMTokenRow[];
}

async function getMembershipRecipientsByAccount(
  supabase: SupabaseClient,
  accountId: string,
): Promise<PushRecipient[]> {
  const { data, error } = await supabase
    .from('team_memberships')
    .select('id, account_id')
    .eq('account_id', accountId);

  if (error) {
    throw error;
  }

  return mapMembershipRecipients(data);
}

async function getMembershipRecipientById(
  supabase: SupabaseClient,
  membershipId: string,
): Promise<PushRecipient | null> {
  const { data, error } = await supabase
    .from('team_memberships')
    .select('id, account_id')
    .eq('id', membershipId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const [recipient] = mapMembershipRecipients(data ? [data] : []);
  return recipient ?? null;
}

async function getMembershipRecipientsByClub(
  supabase: SupabaseClient,
  clubId: string,
  options: { roles?: MembershipRole[]; excludeAccountId?: string | null } = {},
): Promise<PushRecipient[]> {
  let query = supabase
    .from('team_memberships')
    .select('id, account_id')
    .eq('club_id', clubId)
    .eq('status', 'approved');

  if (options.roles?.length) {
    query = query.in('role', options.roles);
  }
  if (options.excludeAccountId) {
    query = query.neq('account_id', options.excludeAccountId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return mapMembershipRecipients(data);
}

function mapMembershipRecipients(rows: unknown): PushRecipient[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      const candidate = row as { id?: unknown; account_id?: unknown };
      return typeof candidate.id === 'string' && typeof candidate.account_id === 'string'
        ? { membershipId: candidate.id, accountId: candidate.account_id }
        : null;
    })
    .filter((recipient): recipient is PushRecipient => recipient !== null);
}

async function sendFCMMulticast(
  tokens: string[],
  notification: ReturnType<typeof normalizePayload>,
): Promise<string[]> {
  const messaging = getMessaging(getFirebaseAdminApp());
  const staleTokens: string[] = [];
  const uniqueTokens = [...new Set(tokens)];

  for (let index = 0; index < uniqueTokens.length; index += 500) {
    const chunk = uniqueTokens.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        type: notification.type,
        targetUrl: notification.targetUrl,
        metadata: JSON.stringify(notification.metadata),
      },
      webpush: {
        fcmOptions: {
          link: notification.targetUrl,
        },
        notification: {
          icon: '/brand/fcmoimLogo.svg',
          badge: '/brand/fcmoimLogo.svg',
        },
      },
    });

    response.responses.forEach((result, responseIndex) => {
      if (result.error && INVALID_FCM_TOKEN_CODES.has(result.error.code)) {
        staleTokens.push(chunk[responseIndex]);
      }
    });
  }

  return staleTokens;
}

async function deleteStaleTokens(supabase: SupabaseClient, tokens: string[]) {
  const { error } = await supabase.from('fcm_tokens').delete().in('token', tokens);
  if (error) {
    throw error;
  }
}

function getFirebaseAdminApp() {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
    });
  }

  return initializeApp({
    credential: applicationDefault(),
  });
}
