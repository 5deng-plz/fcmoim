import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type AssetSources = Record<string, {
  sourceUrl: string;
  sha256: string;
}>;

describe('external asset provenance', () => {
  it('keeps user-specified SVGrepo assets unchanged', () => {
    const root = process.cwd();
    const sources = JSON.parse(
      readFileSync(join(root, 'public/icons/asset-sources.json'), 'utf8'),
    ) as AssetSources;

    for (const [fileName, metadata] of Object.entries(sources)) {
      const file = readFileSync(join(root, 'public/icons', fileName));
      const actualHash = createHash('sha256').update(file).digest('hex');

      expect(metadata.sourceUrl).toMatch(/^https:\/\/www\.svgrepo\.com\/show\//);
      expect(actualHash).toBe(metadata.sha256);
    }
  });
});
