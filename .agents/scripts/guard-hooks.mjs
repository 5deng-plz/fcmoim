import { fail, gitConfig, loadRules } from './harness-lib.mjs';

const rules = loadRules();
const expected = rules.hookPolicy?.requiredPath;
const actual = gitConfig('core.hooksPath');
const errors = [];

if (!expected) errors.push('Project rules missing hookPolicy.requiredPath.');
if (expected && actual !== expected) {
  errors.push(`core.hooksPath must be ${expected}; received ${actual || '<unset>'}.`);
}

fail(errors, 'Hook guard failed');
console.log('Hook guard passed.');
