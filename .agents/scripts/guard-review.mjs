import { fail, getArgValue, getChangedFiles, loadRules, loadState, resolveWork } from './harness-lib.mjs';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const rules = loadRules();
const state = loadState(rules);
const work = resolveWork(state, getArgValue('task'));
const policy = rules.reviewPolicy || {};
const verdict = work?.reviewVerdict;
const blockers = work?.blockers || [];
const errors = [];
const fingerprint = changedFilesFingerprint(getChangedFiles('worktree'));

if (policy.required) {
  if (!verdict) errors.push('Missing review verdict.');
  if (verdict && verdict.status !== policy.readyStatus) {
    errors.push(`Review verdict must be ${policy.readyStatus}; received ${verdict.status}.`);
  }
  if (verdict) {
    for (const field of ['reviewedAt', 'reviewedBy', 'summary', 'worktreeFingerprint']) {
      if (!verdict[field]) errors.push(`Review verdict missing field: ${field}`);
    }
    if (verdict.reviewedBy && verdict.reviewedBy === work?.agentId) {
      errors.push('Review verdict must be produced by an evaluator different from the active work agent.');
    }
    if (fingerprint && verdict.worktreeFingerprint !== fingerprint) {
      errors.push('Review verdict worktree fingerprint does not match current changed files.');
    }
    if (!Array.isArray(verdict.evidenceReviewed) || verdict.evidenceReviewed.length === 0) {
      errors.push('Review verdict must list evidenceReviewed.');
    }
    if (!Array.isArray(verdict.checks) || verdict.checks.length === 0) {
      errors.push('Review verdict must include concrete checks.');
    }
  }
}

if (blockers.length > 0) errors.push(`Active work has ${blockers.length} blocker(s).`);
if (verdict?.blockers?.length > 0) errors.push(`Review verdict has ${verdict.blockers.length} blocker(s).`);

if (work?.status === 'complete' && errors.length > 0) {
  errors.push('Active work cannot be complete while review guard fails.');
}

fail(errors, 'Review guard failed');
console.log('Review guard passed.');

function changedFilesFingerprint(files) {
  const fingerprintFiles = files.filter((file) => file !== rules.project?.docs?.context);
  if (fingerprintFiles.length === 0) return '';
  const hash = createHash('sha256');
  for (const file of [...fingerprintFiles].sort()) {
    hash.update(file);
    hash.update('\0');
    try {
      hash.update(fs.readFileSync(path.join(process.cwd(), file), 'utf8'));
    } catch {
      hash.update('');
    }
    hash.update('\0');
  }
  return hash.digest('hex');
}
