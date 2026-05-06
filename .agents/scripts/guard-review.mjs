import { fail, getArgValue, loadRules, loadState, resolveWork } from './harness-lib.mjs';

const rules = loadRules();
const state = loadState(rules);
const work = resolveWork(state, getArgValue('task'));
const policy = rules.reviewPolicy || {};
const verdict = work?.reviewVerdict;
const blockers = work?.blockers || [];
const errors = [];

if (policy.required) {
  if (!verdict) errors.push('Missing review verdict.');
  if (verdict && verdict.status !== policy.readyStatus) {
    errors.push(`Review verdict must be ${policy.readyStatus}; received ${verdict.status}.`);
  }
}

if (blockers.length > 0) errors.push(`Active work has ${blockers.length} blocker(s).`);
if (verdict?.blockers?.length > 0) errors.push(`Review verdict has ${verdict.blockers.length} blocker(s).`);

if (work?.status === 'complete' && errors.length > 0) {
  errors.push('Active work cannot be complete while review guard fails.');
}

fail(errors, 'Review guard failed');
console.log('Review guard passed.');
