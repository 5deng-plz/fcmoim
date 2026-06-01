import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadDotenv('.env.local');

const supabaseUrl = firstEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
const serviceRoleKey = firstEnv('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
const password = process.env.QA_TEST_PASSWORD;

if (process.env.DEV_TEST !== 'true') {
  throw new Error('DEV_TEST=true is required before seeding QA auth users.');
}
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
}
if (!serviceRoleKey) {
  throw new Error('SUPABASE_SECRET_KEY is required.');
}
if (!password || password.length < 8) {
  throw new Error('QA_TEST_PASSWORD must be at least 8 characters.');
}

const qaUsers = [
  { email: 'qa-admin@fcmoim.test', name: 'QA 관리자', role: 'admin', position: 'MF' },
  { email: 'qa-operator@fcmoim.test', name: 'QA 운영진', role: 'operator', position: 'DF' },
  { email: 'qa-member1@fcmoim.test', name: 'QA 멤버 1', role: 'member', position: 'FW' },
  { email: 'qa-member2@fcmoim.test', name: 'QA 멤버 2', role: 'member', position: 'MF' },
  { email: 'qa-member3@fcmoim.test', name: 'QA 멤버 3', role: 'member', position: 'DF' },
  { email: 'qa-member4@fcmoim.test', name: 'QA 멤버 4', role: 'member', position: 'MF' },
  { email: 'qa-new@fcmoim.test', name: 'QA 신규', role: 'member', position: 'MF' },
];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

for (const qaUser of qaUsers) {
  const user = await ensureAuthUser(qaUser);

  const { error: accountError } = await supabase
    .from('accounts')
    .upsert({
      id: user.id,
      display_name: qaUser.name,
    });
  if (accountError) {
    throw new Error(`Failed to upsert account for ${qaUser.email}: ${accountError.message}`);
  }

  console.log(`${qaUser.email}: auth ready`);
}

console.log(`Seeded ${qaUsers.length} QA auth users. Demo memberships are seeded by seed-local-demo-data.`);

async function ensureAuthUser(qaUser) {
  const existing = await findUserByEmail(qaUser.email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { name: qaUser.name },
    });
    if (error) {
      throw new Error(`Failed to update auth user ${qaUser.email}: ${error.message}`);
    }
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: qaUser.email,
    password,
    email_confirm: true,
    user_metadata: { name: qaUser.name },
  });
  if (error) {
    throw new Error(`Failed to create auth user ${qaUser.email}: ${error.message}`);
  }
  return data.user;
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) return null;
  }

  throw new Error('Could not find QA user within first 20000 auth users.');
}

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return '';
}

function loadDotenv(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return;

  const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (process.env[key] !== undefined) continue;

    process.env[key] = unquote(trimmed.slice(separatorIndex + 1).trim());
  }
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
