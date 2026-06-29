import {
  fail,
  getArgValue,
  getChangedFiles,
  hasArg,
  loadRules,
  readJson,
} from './harness-lib.mjs';
import { findRoleViolations } from './role-boundaries.mjs';

const role = getArgValue('role');
const mode = hasArg('staged') ? 'staged' : 'worktree';
const rules = loadRules();
const boundaryConfigPath = rules.roleBoundaries?.config;
const boundaryConfig = boundaryConfigPath ? readJson(boundaryConfigPath) : rules.roleBoundaries;
const roleConfig = boundaryConfig?.roles?.[role];

if (!role) {
  fail(['Missing --role=<role>.'], 'Role guard failed');
}
if (!roleConfig) {
  fail([`Unknown or unconfigured role: ${role}.`], 'Role guard failed');
}

const files = getChangedFiles(mode);
const errors = findRoleViolations(files, roleConfig);

fail(errors, `Role guard failed for ${role}`);
console.log(`Role guard passed for ${role} (${files.length} changed file${files.length === 1 ? '' : 's'}).`);
