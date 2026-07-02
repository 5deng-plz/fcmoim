import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { getInbox } from '../scripts/agent-handoff-inbox.mjs';

const temporaryDirectories: string[] = [];

function git(cwd: string, args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function writeHandoff(
  root: string,
  {
    id,
    from = 'codex',
    to = 'agy',
    status = 'requested',
    updatedAt = '2026-07-02T12:00:00+09:00',
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
      `- requestedAt: \`2026-07-02T11:00:00+09:00\`\n` +
      `- updatedAt: \`${updatedAt}\`\n`,
  );
}

function commitAll(root: string, message: string) {
  git(root, ['add', '.']);
  git(root, ['commit', '-m', message]);
}

function createRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fcmoim-handoff-inbox-'));
  temporaryDirectories.push(root);
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.name', 'Inbox Test']);
  git(root, ['config', 'user.email', 'inbox@example.test']);
  fs.writeFileSync(path.join(root, 'README.md'), 'fixture\n');
  commitAll(root, 'initial');
  return root;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('agent handoff inbox', () => {
  it('finds a requested handoff on another agent branch without changing the worktree', () => {
    const root = createRepository();
    git(root, ['switch', '-c', 'agent/codex/realtime']);
    writeHandoff(root, { id: '20260702-codex-to-agy-realtime' });
    commitAll(root, 'add handoff');
    git(root, ['switch', 'main']);
    fs.appendFileSync(path.join(root, 'README.md'), 'dirty\n');
    const before = git(root, ['status', '--porcelain=v1', '--branch']);

    const inbox = getInbox({ role: 'agy', cwd: root });

    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      id: '20260702-codex-to-agy-realtime',
      source: 'agent/codex/realtime',
      status: 'requested',
    });
    expect(git(root, ['status', '--porcelain=v1', '--branch'])).toBe(before);
  });

  it('deduplicates inherited handoffs and keeps the most advanced status', () => {
    const root = createRepository();
    git(root, ['switch', '-c', 'agent/codex/request']);
    writeHandoff(root, { id: '20260702-codex-to-agy-contract' });
    commitAll(root, 'request');

    git(root, ['switch', '-c', 'agent/agy/integrated']);
    writeHandoff(root, {
      id: '20260702-codex-to-agy-contract',
      status: 'integrated',
      updatedAt: '2026-07-02T13:00:00+09:00',
    });
    commitAll(root, 'integrate');
    git(root, ['switch', 'main']);

    expect(getInbox({ role: 'agy', cwd: root })).toEqual([]);
    expect(getInbox({ role: 'agy', all: true, cwd: root })).toEqual([]);
  });

  it('filters by recipient and exposes accepted work only with --all semantics', () => {
    const root = createRepository();
    git(root, ['switch', '-c', 'agent/agy/backend-request']);
    writeHandoff(root, {
      id: '20260702-agy-to-codex-api',
      from: 'agy',
      to: 'codex',
      status: 'accepted',
    });
    commitAll(root, 'request backend');

    expect(getInbox({ role: 'agy', all: true, cwd: root })).toEqual([]);
    expect(getInbox({ role: 'codex', cwd: root })).toEqual([]);
    expect(getInbox({ role: 'codex', all: true, cwd: root })).toHaveLength(1);
  });

  it('prefers main after the same handoff is integrated without a status change', () => {
    const root = createRepository();
    git(root, ['switch', '-c', 'agent/codex/request']);
    writeHandoff(root, { id: '20260702-codex-to-agy-contract' });
    commitAll(root, 'request');
    git(root, ['switch', 'main']);
    git(root, ['merge', '--ff-only', 'agent/codex/request']);

    expect(getInbox({ role: 'agy', cwd: root })[0]).toMatchObject({
      source: 'main',
      status: 'requested',
    });
  });
});
