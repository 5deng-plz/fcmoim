import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const apiRoot = path.join(root, 'src/app/api');

describe('single-team API contract', () => {
  it('keeps multi-club entrypoints behind the server-only feature gate', () => {
    for (const relativePath of [
      'clubs/route.ts',
      'clubs/check-slug/route.ts',
    ]) {
      const source = fs.readFileSync(path.join(apiRoot, relativePath), 'utf8');
      expect(source, relativePath).toContain('assertMultiClubEnabled()');
    }
    expect(fs.existsSync(path.join(root, 'src/services/club-create.ts'))).toBe(true);
  });

  it('provides canonical single-team entrypoints', () => {
    for (const relativePath of [
      'team/route.ts',
      'team/settings/route.ts',
      'team/logo/route.ts',
      'membership/current/route.ts',
    ]) {
      expect(fs.existsSync(path.join(apiRoot, relativePath)), relativePath).toBe(true);
    }
  });

  it('does not pass a client-provided clubId from API routes into Backend operations', () => {
    const routeSources = listRouteFiles(apiRoot)
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');

    expect(routeSources).not.toMatch(/clubId:\s*body\.clubId/);
    expect(routeSources).not.toMatch(/\.eq\(['"]club_id['"],\s*body\.clubId\)/);
    expect(routeSources).not.toContain('clubId is required');
  });
});

function listRouteFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listRouteFiles(entryPath);
    return entry.name === 'route.ts' ? [entryPath] : [];
  });
}
