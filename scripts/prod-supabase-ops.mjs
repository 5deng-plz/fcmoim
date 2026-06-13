import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const action = process.argv[2];
const confirmValue = 'DELETE_PRODUCTION_DATA';

if (!action || !['backup', 'reset-db', 'cleanup-auth-storage', 'verify-empty'].includes(action)) {
  console.error('Usage: node scripts/prod-supabase-ops.mjs <backup|reset-db|cleanup-auth-storage|verify-empty>');
  process.exit(1);
}

if (action === 'backup') {
  await backupLinkedDatabase();
} else if (action === 'reset-db') {
  requireConfirm('FC_PROD_RESET_CONFIRM');
  printLinkedTarget();
  run('npx', ['supabase', 'db', 'reset', '--linked', '--no-seed']);
} else if (action === 'cleanup-auth-storage') {
  requireConfirm('FC_PROD_CLEANUP_CONFIRM');
  await cleanupAuthAndStorage();
} else if (action === 'verify-empty') {
  await verifyEmpty();
}

function requireConfirm(envName) {
  if (process.env[envName] !== confirmValue) {
    throw new Error(`${envName}=${confirmValue} is required for this destructive production operation.`);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.status !== 0) {
    if (options.capture) {
      process.stderr.write(result.stderr);
      process.stderr.write(result.stdout);
    }
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

function printLinkedTarget() {
  const projectRef = readIfExists('supabase/.temp/project-ref')?.trim() || process.env.SUPABASE_PROJECT_REF || 'unknown';
  console.log(`Target linked Supabase project ref: ${projectRef}`);
  console.log('This command targets the linked remote Supabase project, not local Supabase.');
}

async function backupLinkedDatabase() {
  printLinkedTarget();
  const backupDir = path.join(os.tmpdir(), `fcmoim-supabase-backup-${timestamp()}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const schemaFile = path.join(backupDir, 'schema.sql');
  const publicDataFile = path.join(backupDir, 'public-data.sql');
  const storageDataFile = path.join(backupDir, 'storage-data.sql');

  run('npx', ['supabase', 'db', 'dump', '--linked', '--file', schemaFile]);
  run('npx', ['supabase', 'db', 'dump', '--linked', '--data-only', '--schema', 'public', '--file', publicDataFile]);
  run('npx', ['supabase', 'db', 'dump', '--linked', '--data-only', '--schema', 'storage', '--file', storageDataFile]);

  console.log(`Production backup files created outside repo: ${backupDir}`);
  console.log('Files: schema.sql, public-data.sql, storage-data.sql');
}

async function cleanupAuthAndStorage() {
  const supabase = createProductionAdminClient();
  console.log(`Target production Supabase URL: ${getProductionUrl()}`);

  const buckets = await listBuckets(supabase);
  let removedObjectCount = 0;
  for (const bucket of buckets) {
    removedObjectCount += await emptyBucket(supabase, bucket.name);
    const { error } = await supabase.storage.deleteBucket(bucket.name);
    if (error) {
      console.warn(`Could not delete bucket ${bucket.name}: ${error.message}`);
    }
  }

  const users = await listAllUsers(supabase);
  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id, false);
    if (error) {
      throw new Error(`Failed to delete auth user ${user.id}: ${error.message}`);
    }
  }

  console.log(`Removed storage objects: ${removedObjectCount}`);
  console.log(`Deleted auth users: ${users.length}`);
}

async function verifyEmpty() {
  const supabase = createProductionAdminClient();
  console.log(`Target production Supabase URL: ${getProductionUrl()}`);

  const users = await listAllUsers(supabase);
  const buckets = await listBuckets(supabase);
  let objectCount = 0;
  for (const bucket of buckets) {
    objectCount += await countBucketObjects(supabase, bucket.name);
  }

  const tableCounts = {};
  for (const table of [
    'accounts',
    'team_memberships',
    'schedule_polls',
    'matches',
    'announcements',
    'player_stats',
    'point_ledger',
  ]) {
    tableCounts[table] = await countRows(supabase, table);
  }

  console.log(JSON.stringify({
    authUsers: users.length,
    storageBuckets: buckets.length,
    storageObjects: objectCount,
    tableCounts,
  }, null, 2));

  if (users.length > 0 || objectCount > 0) {
    process.exit(1);
  }
}

function createProductionAdminClient() {
  const supabaseUrl = getProductionUrl();
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required.');
  }

  assertProductionUrl(supabaseUrl);

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getProductionUrl() {
  return process.env.PROD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

function assertProductionUrl(url) {
  if (!url) {
    throw new Error('PROD_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required.');
  }
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(url)) {
    throw new Error(`Refusing production operation against local Supabase URL: ${url}`);
  }
  if (!/^https:\/\/[^/]+\.supabase\.co$/i.test(url)) {
    throw new Error(`Refusing production operation against unexpected Supabase URL: ${url}`);
  }
}

async function listAllUsers(supabase) {
  const users = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Failed to list auth users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }

  throw new Error('Too many auth users to delete safely in one run.');
}

async function listBuckets(supabase) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Failed to list storage buckets: ${error.message}`);
  return data ?? [];
}

async function emptyBucket(supabase, bucketName, prefix = '') {
  const { data, error } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 });
  if (error) throw new Error(`Failed to list storage objects in ${bucketName}/${prefix}: ${error.message}`);

  let removed = 0;
  const files = [];
  for (const entry of data ?? []) {
    const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      removed += await emptyBucket(supabase, bucketName, objectPath);
    } else {
      files.push(objectPath);
    }
  }

  if (files.length > 0) {
    const { error: removeError } = await supabase.storage.from(bucketName).remove(files);
    if (removeError) throw new Error(`Failed to remove storage objects from ${bucketName}: ${removeError.message}`);
    removed += files.length;
  }

  return removed;
}

async function countBucketObjects(supabase, bucketName, prefix = '') {
  const { data, error } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 });
  if (error) throw new Error(`Failed to count storage objects in ${bucketName}/${prefix}: ${error.message}`);

  let count = 0;
  for (const entry of data ?? []) {
    const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    count += entry.id === null ? await countBucketObjects(supabase, bucketName, objectPath) : 1;
  }

  return count;
}

async function countRows(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true });
  if (error) throw new Error(`Failed to count ${table}: ${error.message}`);
  return count ?? 0;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function readIfExists(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : null;
}
