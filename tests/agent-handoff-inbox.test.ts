import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { getInbox } from '../scripts/agent-handoff-inbox.mjs';

const temporaryDirectories: string[] = [];

function git(cwd: string, args: string[]) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function writeHandoff(
  root: string,
  {
    id,
    from = 'codex',
    to = 'agy',
    status = 'requested',
    updatedAt = '2026-07-03T00:00:00+09:00',
  }: {
    id: string;
    from?: 'codex' | 'agy';
    to?: 'codex' | 'agy';
    status?: 'requested' | 'accepted' | 'implemented' | 'verified' | 'integrated';
    updatedAt?: string;
  },
) {
  const directory = path.join(root, 'docs/handoff');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `${id}.md`);
  fs.writeFileSync(
    file,
    `# Agent Handoff: ${id}\n\n` +
      `- id: \`${id}\`\n` +
      `- from: \`${from}\`\n` +
      `- to: \`${to}\`\n` +
      `- status: \`${status}\`\n` +
      `- requestedAt: \`2026-07-02T23:00:00+09:00\`\n` +
      `- updatedAt: \`${updatedAt}\`\n`,
  );
}

function createRepository() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fcmoim-handoff-inbox-'));
  temporaryDirectories.push(base);
  const root = path.join(base, 'repo');
  fs.mkdirSync(root);
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.name', 'Inbox Test']);
  git(root, ['config', 'user.email', 'inbox@example.test']);
  fs.writeFileSync(path.join(root, 'README.md'), 'fixture\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'initial']);
  return { base, root };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('agent handoff inbox', () => {
  it('ignores reference documents without handoff metadata', () => {
    const { root } = createRepository();
    fs.mkdirSync(path.join(root, 'docs/handoff'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs/handoff/legacy-reference.md'),
      '# Legacy Reference\n\nThis is not a requested handoff.\n',
    );

    expect(getInbox({ role: 'agy', cwd: root, worktrees: [root] })).toEqual([]);
  });

  it('discovers an ignored handoff in another registered worktree without mutation', () => {
    const { base, root } = createRepository();
    const worker = path.join(base, 'worker');
    git(root, ['worktree', 'add', '-b', 'agent/codex/realtime', worker]);
    writeHandoff(worker, { id: '20260703-codex-to-agy-realtime' });
    fs.appendFileSync(path.join(root, 'README.md'), 'dirty\n');
    const before = git(root, ['status', '--porcelain=v1', '--branch']);

    const inbox = getInbox({ role: 'agy', cwd: root });

    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      id: '20260703-codex-to-agy-realtime',
      source: 'agent/codex/realtime',
      worktree: fs.realpathSync(worker),
      status: 'requested',
    });
    expect(git(root, ['status', '--porcelain=v1', '--branch'])).toBe(before);
  });

  it('deduplicates local copies and keeps the most advanced status', () => {
    const { base, root } = createRepository();
    const worker = path.join(base, 'worker');
    fs.mkdirSync(worker);
    writeHandoff(root, { id: '20260703-codex-to-agy-contract' });
    writeHandoff(worker, {
      id: '20260703-codex-to-agy-contract',
      status: 'integrated',
      updatedAt: '2026-07-03T01:00:00+09:00',
    });

    expect(getInbox({ role: 'agy', cwd: root, worktrees: [root, worker] })).toEqual([]);
    expect(getInbox({ role: 'agy', all: true, cwd: root, worktrees: [root, worker] })).toEqual([]);
  });

  it('filters by recipient and exposes accepted work only with --all semantics', () => {
    const { root } = createRepository();
    writeHandoff(root, {
      id: '20260703-agy-to-codex-api',
      from: 'agy',
      to: 'codex',
      status: 'accepted',
    });

    expect(getInbox({ role: 'agy', all: true, cwd: root, worktrees: [root] })).toEqual([]);
    expect(getInbox({ role: 'codex', cwd: root, worktrees: [root] })).toEqual([]);
    expect(getInbox({ role: 'codex', all: true, cwd: root, worktrees: [root] })).toHaveLength(1);
  });

  it('uses updatedAt to select the newest copy at the same status', () => {
    const { base, root } = createRepository();
    const worker = path.join(base, 'worker');
    fs.mkdirSync(worker);
    writeHandoff(root, {
      id: '20260703-codex-to-agy-contract',
      updatedAt: '2026-07-03T00:00:00+09:00',
    });
    writeHandoff(worker, {
      id: '20260703-codex-to-agy-contract',
      updatedAt: '2026-07-03T01:00:00+09:00',
    });

    expect(getInbox({
      role: 'agy',
      cwd: root,
      worktrees: [root, worker],
    })[0]).toMatchObject({ worktree: worker });
  });
});
