import { fail, getChangedFiles, hasArg, loadRules, loadState, matchAny } from './harness-lib.mjs';

const rules = loadRules();
const state = loadState(rules);
const work = state.activeWork;
const mode = hasArg('staged') ? 'staged' : 'worktree';
const errors = [];

const files = getChangedFiles(mode);
if (files.length === 0) {
  console.log('Diff guard passed (no changed files).');
  process.exit(0);
}

const allowedPaths = work?.allowedPaths || [];
const sharedPaths = rules.sharedAllowedPaths || [];

for (const file of files) {
  // Skip project state file (orchestrator updates it)
  if (file === rules.project?.docs?.context) continue;

  // Check against allowed paths and shared paths
  if (matchAny(file, allowedPaths) || matchAny(file, sharedPaths)) continue;

  errors.push(`Changed file outside allowed paths: ${file}`);
}

fail(errors, 'Diff guard failed');
console.log(`Diff guard passed (${files.length} changed file${files.length === 1 ? '' : 's'}).`);
