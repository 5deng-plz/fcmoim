import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const role = getArg('role');
const task = getArg('task');
const dryRun = process.argv.includes('--dry-run');
const allowedRoles = new Set(['codex', 'agy']);

if (!allowedRoles.has(role)) {
  fail('Use --role=codex or --role=agy.');
}
if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(task || '')) {
  fail('Use --task=<3-50 character lowercase slug>.');
}

const repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
if (path.resolve(repositoryRoot) !== path.resolve(root)) {
  fail('Run this command from the repository root.');
}

const target = path.join(path.dirname(root), `${path.basename(root)}-${role}`);
const branch = `agent/${role}/${task}`;

if (fs.existsSync(target)) {
  fail(`Target worktree already exists: ${target}`);
}
if (branchExists(branch)) {
  fail(`Branch already exists: ${branch}`);
}

if (dryRun) {
  console.log(JSON.stringify({ branch, target }, null, 2));
  process.exit(0);
}

execFileSync('git', ['worktree', 'add', '-b', branch, target, 'HEAD'], {
  cwd: root,
  stdio: 'inherit',
});
console.log(`Created ${role} worktree: ${target}`);
console.log(`Branch: ${branch}`);
console.log(`Next: cd ${target} && npm ci`);

function getArg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function branchExists(name) {
  try {
    execFileSync('git', ['show-ref', '--verify', '--quiet', `refs/heads/${name}`], {
      cwd: root,
    });
    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
