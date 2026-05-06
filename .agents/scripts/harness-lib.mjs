import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const root = process.cwd();
export const defaultRulesPath = 'docs/agent-rules.json';
export const temporaryRoot = os.tmpdir();

export function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

export function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

export function loadRules() {
  if (!exists(defaultRulesPath)) {
    throw new Error(`Missing project rules: ${defaultRulesPath}`);
  }
  return readJson(defaultRulesPath);
}

export function loadState(rules) {
  const statePath = rules.project?.docs?.context;
  if (!statePath) throw new Error('Project rules missing project.docs.context');
  if (!exists(statePath)) throw new Error(`Missing project state: ${statePath}`);
  return readJson(statePath);
}

export function resolveWork(state, taskId = undefined) {
  if (!taskId || state.activeWork?.taskId === taskId) return state.activeWork;
  const work = (state.workstreams || []).find((candidate) => candidate.id === taskId || candidate.taskId === taskId);
  if (!work) throw new Error(`No work item found for task: ${taskId}`);
  return work;
}

export function currentCommit() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}

export function gitConfig(name) {
  try {
    return execFileSync('git', ['config', '--get', name], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

export function getChangedFiles(mode = 'worktree') {
  if (mode === 'staged') {
    const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
      cwd: root,
      encoding: 'utf8'
    }).trim();
    return output ? output.split(/\r?\n/).filter(Boolean) : [];
  }

  const modified = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR'], {
    cwd: root,
    encoding: 'utf8'
  }).trim();
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8'
  }).trim();

  return [...new Set([
    ...(modified ? modified.split(/\r?\n/) : []),
    ...(untracked ? untracked.split(/\r?\n/) : [])
  ].filter(Boolean))].sort();
}

export function matchAny(file, patterns = []) {
  return patterns.some((pattern) => matchPattern(file, pattern));
}

export function matchPattern(file, pattern) {
  const normalizedFile = normalizePath(file);
  const normalizedPattern = normalizePath(pattern);
  const expression = '^' + normalizedPattern
    .split('**').map((part) => part
      .split('*').map(escapeRegex).join('[^/]*'))
    .join('.*') + '$';
  return new RegExp(expression).test(normalizedFile);
}

export function classifySurfaces(files, rules) {
  const surfaces = new Set();
  for (const file of files) {
    for (const surface of rules.surfaces || []) {
      if (matchAny(file, surface.paths)) surfaces.add(surface.id);
    }
  }
  return [...surfaces].sort();
}

export function runCommand(command, label) {
  if (!command || !command.trim()) {
    throw new Error(`Missing configured command: ${label}`);
  }
  const result = spawnSync(command, {
    cwd: root,
    shell: true,
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${label}): ${command}`);
  }
}

export function runCommandResult(command, label, options = {}) {
  if (!command || !command.trim()) {
    throw new Error(`Missing configured command: ${label}`);
  }
  const result = spawnSync(command, {
    cwd: options.cwd || root,
    shell: true,
    stdio: options.stdio || 'inherit',
    env: options.env || process.env
  });
  return result.status ?? 1;
}

export function fail(errors, title) {
  if (errors.length === 0) return;
  console.error(`${title}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

export function getArgValue(name, fallback = undefined) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

export function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

export function quoteShell(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function normalizePath(value) {
  return value.replaceAll(path.sep, '/').replace(/^\.\//, '');
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}
