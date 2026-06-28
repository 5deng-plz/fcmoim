import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const qaPassword = process.env.QA_LOCAL_ACCOUNT_PASSWORD || '';

const tablesToTruncate = [
  'membership_badges',
  'point_ledger',
  'locker_items',
  'comments',
  'player_stats',
  'match_teams',
  'attendances',
  'schedule_poll_votes',
  'schedule_poll_options',
  'schedule_polls',
  'matches',
  'team_memberships',
  'seasons',
  'clubs',
];

const expectedCounts = {
  clubs: 1,
  seasons: 1,
  team_memberships: 6,
  matches: 8,
  schedule_polls: 2,
  schedule_poll_options: 4,
  schedule_poll_votes: 9,
  attendances: 14,
  match_teams: 14,
  player_stats: 14,
  point_ledger: 14,
};

assertLocalOnly();
await assertQaLoginReady();
truncateLocalDemoTables();

// Base club/account/member data is prepared directly because it is foundational
// fixture setup. Calendar, poll, lineup, and result rows remain deterministic
// and are wiped before each rebuild to avoid dirty local data.
await import('./local-demo-fixtures.mjs');

await verifyCounts();
console.log('Rebuilt clean local demo data.');
console.log('OVR note: initial fixture OVR may change later when match-result APIs are exercised.');

function assertLocalOnly() {
  if (process.env.FC_RUN_LOCAL_SUPABASE_API_TESTS !== 'true') {
    throw new Error('FC_RUN_LOCAL_SUPABASE_API_TESTS=true is required for local demo rebuild.');
  }
  if (!/^https?:\/\/(127\.0\.0\.1|localhost):54321\b/i.test(supabaseUrl)) {
    throw new Error(`Refusing to rebuild demo data outside local Supabase: ${supabaseUrl}`);
  }
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required.');
  }
  if (qaPassword !== 'password') {
    throw new Error('QA_LOCAL_ACCOUNT_PASSWORD must be password for local demo rebuild.');
  }
}

async function assertQaLoginReady() {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.');
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email: 'qa-operator@fcmoim.test',
    password: qaPassword,
  });
  if (error) {
    throw new Error(`QA auth login failed. Run npm run qa:seed-auth:local first: ${error.message}`);
  }
}

function truncateLocalDemoTables() {
  const container = findLocalDbContainer();
  const sql = `truncate table ${tablesToTruncate.join(', ')} restart identity cascade;`;
  const result = spawnSync('docker', [
    'exec',
    '-i',
    container,
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    sql,
  ], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.stderr.write(result.stdout);
    throw new Error(`Failed to truncate local demo tables in ${container}.`);
  }

  console.log(`Truncated local demo tables via ${container}.`);
}

function findLocalDbContainer() {
  const result = spawnSync('docker', [
    'ps',
    '--format',
    '{{.Names}}',
    '--filter',
    'name=supabase_db_',
  ], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status === 0) {
    const names = result.stdout
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
    const exact = names.find((name) => name === 'supabase_db_fcmoim');
    if (exact) return exact;
    if (names.length === 1) return names[0];
  }

  return 'supabase_db_fcmoim';
}

async function verifyCounts() {
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  for (const [table, expected] of Object.entries(expectedCounts)) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      throw new Error(`Failed to count ${table}: ${error.message}`);
    }
    if (count !== expected) {
      throw new Error(`Unexpected ${table} count: expected ${expected}, got ${count}`);
    }
  }

  const { count: guppyApproved, error } = await supabase
    .from('team_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', process.env.NEXT_PUBLIC_DEFAULT_CLUB_ID || '00000000-0000-0000-0000-000000000001')
    .eq('status', 'approved');
  if (error) {
    throw new Error(`Failed to count FC Guppy approved members: ${error.message}`);
  }
  if (guppyApproved !== 6) {
    throw new Error(`Unexpected FC Guppy approved member count: expected 6, got ${guppyApproved}`);
  }
}
