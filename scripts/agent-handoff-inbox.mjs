#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HANDOFF_DIRECTORY = 'docs/handoff';
const STATUS_PRIORITY = new Map([
  ['requested', 0],
  ['accepted', 1],
  ['implemented', 2],
  ['verified', 3],
  ['integrated', 4],
]);

function runGit(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function stripCode(value) {
  return value.trim().replace(/^`|`$/g, '');
}

export function parseHandoff(content) {
  const metadata = {};

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^- (id|from|to|status|requestedAt|updatedAt):\s*(.+)$/);
    if (match) {
      metadata[match[1]] = stripCode(match[2]);
    }
  }

  const title = content.match(/^# Agent Handoff:\s*(.+)$/m)?.[1]?.trim();
  if (!metadata.id || !metadata.from || !metadata.to || !metadata.status) {
    return null;
  }

  return { ...metadata, title: title || metadata.id };
}

function listRefs(cwd) {
  const output = runGit(
    [
      'for-each-ref',
      '--format=%(refname)',
      'refs/heads/main',
      'refs/heads/agent',
      'refs/remotes/origin/main',
      'refs/remotes/origin/agent',
    ],
    cwd,
  );

  return output ? output.split('\n').filter(Boolean) : [];
}

function displayRef(ref) {
  return ref.replace(/^refs\/heads\//, '').replace(/^refs\/remotes\//, '');
}

function listHandoffPaths(ref, cwd) {
  const output = runGit(
    ['ls-tree', '-r', '--name-only', ref, '--', HANDOFF_DIRECTORY],
    cwd,
  );

  return output
    ? output
        .split('\n')
        .filter((file) => file.endsWith('.md') && !file.endsWith('/TEMPLATE.md'))
    : [];
}

function getFileCommit(ref, file, cwd) {
  return runGit(['log', '-1', '--format=%H%x09%cI', ref, '--', file], cwd);
}

function candidatePriority(candidate) {
  return STATUS_PRIORITY.get(candidate.status) ?? -1;
}

function chooseCurrentCandidate(current, candidate) {
  if (!current) return candidate;

  const statusDifference = candidatePriority(candidate) - candidatePriority(current);
  if (statusDifference !== 0) {
    return statusDifference > 0 ? candidate : current;
  }

  const candidateUpdatedAt = Date.parse(candidate.updatedAt || candidate.committedAt) || 0;
  const currentUpdatedAt = Date.parse(current.updatedAt || current.committedAt) || 0;
  if (candidateUpdatedAt !== currentUpdatedAt) {
    return candidateUpdatedAt > currentUpdatedAt ? candidate : current;
  }

  const candidateIsLocal = candidate.ref.startsWith('refs/heads/');
  const currentIsLocal = current.ref.startsWith('refs/heads/');
  if (candidateIsLocal !== currentIsLocal) {
    return candidateIsLocal ? candidate : current;
  }

  return candidate.ref.localeCompare(current.ref) < 0 ? candidate : current;
}

export function collectHandoffs({ cwd = process.cwd() } = {}) {
  const byId = new Map();

  for (const ref of listRefs(cwd)) {
    for (const file of listHandoffPaths(ref, cwd)) {
      const parsed = parseHandoff(runGit(['show', `${ref}:${file}`], cwd));
      if (!parsed) continue;

      const [commit, committedAt] = getFileCommit(ref, file, cwd).split('\t');
      const candidate = {
        ...parsed,
        file,
        ref,
        source: displayRef(ref),
        commit,
        committedAt,
      };
      byId.set(parsed.id, chooseCurrentCandidate(byId.get(parsed.id), candidate));
    }
  }

  return [...byId.values()].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt || left.committedAt) || 0;
    const rightTime = Date.parse(right.updatedAt || right.committedAt) || 0;
    return rightTime - leftTime || left.id.localeCompare(right.id);
  });
}

export function getInbox({ role, all = false, cwd = process.cwd() }) {
  return collectHandoffs({ cwd }).filter(
    (handoff) =>
      handoff.to === role &&
      (all ? handoff.status !== 'integrated' : handoff.status === 'requested'),
  );
}

function parseArguments(argv) {
  const roleArgument = argv.find((argument) => argument.startsWith('--role='));
  const role = roleArgument?.slice('--role='.length);

  if (!['codex', 'agy'].includes(role)) {
    throw new Error('Usage: npm run agents:handoff:inbox -- --role=codex|agy [--all] [--json]');
  }

  return {
    role,
    all: argv.includes('--all'),
    json: argv.includes('--json'),
  };
}

function formatInbox(handoffs, role) {
  if (handoffs.length === 0) {
    return `No requested handoffs for ${role}.`;
  }

  return handoffs
    .map(
      (handoff) =>
        `[${handoff.status}] ${handoff.title}\n` +
        `source: ${handoff.source}\n` +
        `commit: ${handoff.commit.slice(0, 7)}\n` +
        `file: ${handoff.file}`,
    )
    .join('\n\n');
}

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const handoffs = getInbox(options);
    console.log(options.json ? JSON.stringify(handoffs, null, 2) : formatInbox(handoffs, options.role));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  main();
}
