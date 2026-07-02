import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const password = process.env.QA_LOCAL_ACCOUNT_PASSWORD || '';
const clubId = process.env.FC_GUPPY_CLUB_ID || '00000000-0000-0000-0000-000000000001';
const clientCount = positiveInteger('COMMENT_REALTIME_LOAD_CLIENTS', 50);
const durationSeconds = positiveInteger('COMMENT_REALTIME_LOAD_DURATION_SECONDS', 600);
const eventsPerSecond = positiveInteger('COMMENT_REALTIME_LOAD_EVENTS_PER_SECOND', 1);
const expectedEvents = durationSeconds * eventsPerSecond;

assertLocalOnly();

const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const auth = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: signInData, error: signInError } = await auth.auth.signInWithPassword({
  email: 'qa-member1@fcmoim.test',
  password,
});
if (signInError || !signInData.session?.access_token) {
  throw new Error(`Realtime load sign-in failed: ${signInError?.message ?? 'missing access token'}`);
}

const { data: membership, error: membershipError } = await admin
  .from('team_memberships')
  .select('id, profile_name')
  .eq('account_id', signInData.user.id)
  .eq('club_id', clubId)
  .eq('status', 'approved')
  .single();
if (membershipError || !membership) {
  throw new Error(`Realtime load membership lookup failed: ${membershipError?.message ?? 'missing membership'}`);
}

const { data: post, error: postError } = await admin
  .from('feed_posts')
  .insert({
    club_id: clubId,
    membership_id: membership.id,
    content_type: 'text',
    text_content: '[LOAD_TEST] comment realtime',
  })
  .select('id')
  .single();
if (postError || !post) {
  throw new Error(`Realtime load post creation failed: ${postError?.message ?? 'missing post'}`);
}

const topic = `comments:feed_post:${post.id}`;
const sentAtById = new Map();
const latencies = [];
const subscribers = [];
let connectionErrors = 0;

try {
  for (let index = 0; index < clientCount; index += 1) {
    const client = createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: `comment-realtime-load-${index}`,
      },
    });
    await client.realtime.setAuth(signInData.session.access_token);
    const receivedIds = new Set();
    const channel = client
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: 'comment.created.v1' }, (message) => {
        const payload = message.payload ?? message;
        if (!payload?.id || receivedIds.has(payload.id)) return;
        receivedIds.add(payload.id);
        const sentAt = sentAtById.get(payload.id);
        if (sentAt) latencies.push(Date.now() - sentAt);
      });
    await subscribe(channel, () => {
      connectionErrors += 1;
    });
    subscribers.push({ channel, client, receivedIds });
  }

  const startedAt = Date.now();
  for (let eventIndex = 0; eventIndex < expectedEvents; eventIndex += 1) {
    const { data: comment, error: commentError } = await admin
      .from('comments')
      .insert({
        target_type: 'feed_post',
        target_id: post.id,
        membership_id: membership.id,
        content: `load comment ${eventIndex + 1}`,
      })
      .select('id, target_type, target_id, membership_id, content, created_at')
      .single();
    if (commentError || !comment) {
      throw new Error(`Realtime load comment insert failed: ${commentError?.message ?? 'missing comment'}`);
    }

    const payload = {
      id: comment.id,
      targetType: comment.target_type,
      targetId: comment.target_id,
      membershipId: comment.membership_id,
      authorName: membership.profile_name,
      content: comment.content,
      createdAt: comment.created_at,
    };
    sentAtById.set(comment.id, Date.now());
    await broadcast(topic, payload);

    const nextEventAt = startedAt + Math.floor(((eventIndex + 1) / eventsPerSecond) * 1000);
    await delay(Math.max(0, nextEventAt - Date.now()));
  }

  await delay(2_000);
  const expectedDeliveries = clientCount * expectedEvents;
  const delivered = subscribers.reduce((sum, subscriber) => sum + subscriber.receivedIds.size, 0);
  const deliveryRate = expectedDeliveries === 0 ? 1 : delivered / expectedDeliveries;
  const sortedLatencies = latencies.toSorted((left, right) => left - right);
  const p95 = percentile(sortedLatencies, 0.95);

  console.log(JSON.stringify({
    clients: clientCount,
    durationSeconds,
    eventsPerSecond,
    expectedDeliveries,
    delivered,
    deliveryRate,
    p95LatencyMs: p95,
    connectionErrors,
  }, null, 2));

  if (deliveryRate < 0.99 || p95 > 500 || connectionErrors > 0) {
    throw new Error('Comment realtime load acceptance failed.');
  }
} finally {
  await Promise.all(subscribers.map(({ client, channel }) => client.removeChannel(channel)));
  await auth.auth.signOut();
  await admin.from('feed_posts').delete().eq('id', post.id);
}

async function broadcast(topicName, payload) {
  const endpoint = new URL(
    `/realtime/v1/api/broadcast/${encodeURIComponent(topicName)}/events/comment.created.v1`,
    ensureTrailingSlash(supabaseUrl),
  );
  endpoint.searchParams.set('private', 'true');
  const headers = {
    apikey: secretKey,
    'content-type': 'application/json',
  };
  if (secretKey.split('.').length === 3) {
    headers.authorization = `Bearer ${secretKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Realtime load broadcast failed with status ${response.status}.`);
  }
}

function subscribe(channel, onError) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Realtime load subscription timed out.')), 10_000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        onError();
        reject(new Error(`Realtime load subscription failed: ${status}`));
      }
    });
  });
}

function percentile(values, ratio) {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  return values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)];
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function assertLocalOnly() {
  if (process.env.FC_RUN_LOCAL_SUPABASE_API_TESTS !== 'true') {
    throw new Error('FC_RUN_LOCAL_SUPABASE_API_TESTS=true is required.');
  }
  if (!/^https?:\/\/(127\.0\.0\.1|localhost):54321\b/i.test(supabaseUrl)) {
    throw new Error(`Refusing realtime load outside Local Supabase: ${supabaseUrl}`);
  }
  if (!publishableKey || !secretKey || !password) {
    throw new Error('Local Supabase keys and QA_LOCAL_ACCOUNT_PASSWORD are required.');
  }
}
