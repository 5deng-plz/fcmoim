import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error('Usage: node scripts/with-local-supabase-env.mjs <command> [...args]');
  process.exit(1);
}

const status = spawnSync('npx', ['supabase', 'status', '-o', 'env'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (status.status !== 0) {
  process.stderr.write(status.stderr);
  process.stderr.write(status.stdout);
  process.exit(status.status ?? 1);
}

const localEnv = {};
for (const line of status.stdout.split(/\r?\n/)) {
  const match = /^([A-Z0-9_]+)="(.*)"$/.exec(line.trim());
  if (!match) continue;
  localEnv[match[1]] = match[2];
}

const requiredKeys = ['API_URL', 'PUBLISHABLE_KEY', 'SECRET_KEY'];
const missingKeys = requiredKeys.filter((key) => !localEnv[key]);
if (missingKeys.length > 0) {
  console.error(`Missing local Supabase status keys: ${missingKeys.join(', ')}`);
  process.exit(1);
}

const dotenvEnv = loadDotenv('.env.local');
const qaLocalAccountPassword =
  process.env.QA_LOCAL_ACCOUNT_PASSWORD ||
  dotenvEnv.QA_LOCAL_ACCOUNT_PASSWORD ||
  'password';
const defaultClubId =
  process.env.NEXT_PUBLIC_DEFAULT_CLUB_ID ||
  dotenvEnv.NEXT_PUBLIC_DEFAULT_CLUB_ID ||
  '00000000-0000-0000-0000-000000000001';

const child = spawnSync(command, args, {
  env: {
    ...process.env,
    APP_PROFILE: 'local',
    DEV_TEST: 'true',
    FC_RUN_LOCAL_SUPABASE_API_TESTS: 'true',
    NEXT_PUBLIC_SUPABASE_URL: localEnv.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: localEnv.PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLIC_CONFIG: JSON.stringify({
      url: localEnv.API_URL,
      publishableKey: localEnv.PUBLISHABLE_KEY,
    }),
    SUPABASE_SECRET_KEY: localEnv.SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: localEnv.SERVICE_ROLE_KEY || localEnv.SECRET_KEY,
    QA_LOCAL_ACCOUNT_PASSWORD: qaLocalAccountPassword,
    NEXT_PUBLIC_DEFAULT_CLUB_ID: defaultClubId,
  },
  stdio: 'inherit',
});

process.exit(child.status ?? 1);

function loadDotenv(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return {};

  const env = {};
  const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    env[key] = unquote(trimmed.slice(separatorIndex + 1).trim());
  }

  return env;
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
