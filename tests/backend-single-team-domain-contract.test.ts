import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const serviceFiles = [
  'account-membership.ts',
  'announcements.ts',
  'club-admin.ts',
  'comments.ts',
  'feed-posts.ts',
  'match-feedback.ts',
  'match-results.ts',
  'matches.ts',
  'public-clubs.ts',
  'records.ts',
  'schedule-polls.ts',
];

describe('Backend single-team domain contract', () => {
  it('injects TeamContext into every team-scoped service factory', () => {
    for (const file of serviceFiles) {
      const source = fs.readFileSync(path.join(root, 'src/services', file), 'utf8');
      expect(source, file).toMatch(/create\w+Service\([\s\S]*teamContext:\s*TeamContext/);
    }
  });

  it('keeps client clubId out of public service method inputs', () => {
    for (const file of serviceFiles) {
      const source = fs.readFileSync(path.join(root, 'src/services', file), 'utf8');
      const publicMethods = [...source.matchAll(/async\s+\w+\(input:\s*\{([\s\S]*?)\n\s{4}\}\)/g)];
      for (const method of publicMethods) {
        expect(method[1], file).not.toMatch(/\bclubId\s*:/);
      }
    }
  });

  it('exposes the five repository domains through a composition index', () => {
    const repositoryRoot = path.join(root, 'src/services/repositories');
    for (const file of ['team.ts', 'membership.ts', 'schedule.ts', 'records.ts', 'community.ts', 'index.ts']) {
      expect(fs.existsSync(path.join(repositoryRoot, file)), file).toBe(true);
    }
    expect(fs.existsSync(path.join(root, 'src/services/supabase-repositories.ts'))).toBe(false);
  });

  it('has no legacy multi-team seed command or fixture file', () => {
    const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
    const fixtureSource = fs.readFileSync(path.join(root, 'scripts/local-demo-fixtures.mjs'), 'utf8');
    expect(packageJson).not.toContain('db:local:seed-demo:legacy');
    expect(fs.existsSync(path.join(root, 'scripts/seed-local-demo-data.mjs'))).toBe(false);
    expect(fixtureSource).not.toMatch(/FC (Orca|Lynx)|fc-(orca|lynx)/i);
  });
});
