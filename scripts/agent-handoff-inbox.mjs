#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HANDOFF_DIRECTORY = 'docs/handoff';
const TRACKED_HANDOFF_DOCS = new Set(['README.md', 'TEMPLATE.md']);
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
    if (match) metadata[match[1]] = stripCode(match[2]);
  }

  const title = content.match(/^# Agent Handoff:\s*(.+)$/m)?.[1]?.trim();
  if (!metadata.id || !metadata.from || !metadata.to || !metadata.status) {
    return null;
  }

  return { ...metadata, title: title || metadata.id };
}

export function listWorktreeRoots(cwd = process.cwd()) {
  const output = execFileSync('git', ['worktree', 'list', '--porcelain', '-z'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return output
    .split('\0')
    .filter((line) => line.startsWith('worktree '))
    .map((line) => line.slice('worktree '.length));
}

function listHandoffFiles(root) {
  const directory = path.join(root, HANDOFF_DIRECTORY);
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        !TRACKED_HANDOFF_DOCS.has(entry.name),
    )
    .map((entry) => path.join(directory, entry.name));
}

function worktreeSource(root) {
  try {
    const branch = runGit(['branch', '--show-current'], root);
    return branch || `detached:${path.basename(root)}`;
  } catch {
    return `local:${path.basename(root)}`;
  }
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

  const candidateUpdatedAt = Date.parse(candidate.updatedAt || candidate.modifiedAt) || 0;
  const currentUpdatedAt = Date.parse(current.updatedAt || current.modifiedAt) || 0;
  if (candidateUpdatedAt !== currentUpdatedAt) {
    return candidateUpdatedAt > currentUpdatedAt ? candidate : current;
  }

  return candidate.worktree.localeCompare(current.worktree) < 0 ? candidate : current;
}

/**
 * @param {{ cwd?: string, worktrees?: string[] }} [options]
 */
export function collectHandoffs(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const worktrees = options.worktrees ?? listWorktreeRoots(cwd);
  const byId = new Map();

  for (const root of [...new Set(worktrees.map((item) => path.resolve(item)))]) {
    const source = worktreeSource(root);
    for (const absoluteFile of listHandoffFiles(root)) {
      const parsed = parseHandoff(fs.readFileSync(absoluteFile, 'utf8'));
      if (!parsed) continue;

      const candidate = {
        ...parsed,
        file: path.relative(root, absoluteFile),
        worktree: root,
        source,
        modifiedAt: fs.statSync(absoluteFile).mtime.toISOString(),
      };
      byId.set(parsed.id, chooseCurrentCandidate(byId.get(parsed.id), candidate));
    }
  }

  return [...byId.values()].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt || left.modifiedAt) || 0;
    const rightTime = Date.parse(right.updatedAt || right.modifiedAt) || 0;
    return rightTime - leftTime || left.id.localeCompare(right.id);
  });
}

/**
 * @param {{ role?: string, all?: boolean, cwd?: string, worktrees?: string[] }} [options]
 */
export function getInbox(options = {}) {
  const role = options.role;
  const all = options.all ?? false;
  const cwd = options.cwd ?? process.cwd();
  const worktrees = options.worktrees;
  return collectHandoffs({ cwd, worktrees }).filter(
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
        `worktree: ${handoff.worktree}\n` +
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
if (isDirectExecution) main();
