import { fail, getArgValue, getChangedFiles, hasArg, loadRules, loadState, matchAny, resolveWork } from './harness-lib.mjs';

const rules = loadRules();
const state = loadState(rules);
const work = resolveWork(state, getArgValue('task'));
const mode = hasArg('staged') ? 'staged' : getArgValue('mode', 'worktree');
const agentId = getArgValue('agent', process.env.HARNESS_AGENT_ID);
const errors = [];

if (!agentId) errors.push('No agent id. Set HARNESS_AGENT_ID or pass --agent=<id>.');
if (agentId && work?.agentId && agentId !== work.agentId) {
  errors.push(`Agent mismatch: input ${agentId} does not match active work ${work.agentId}.`);
}

const agent = (rules.agents || []).find((candidate) => candidate.id === agentId);
if (agentId && !agent) errors.push(`No project rule for active agent: ${agentId}`);
const activeAllowedPaths = work?.allowedPaths || [];

const files = getChangedFiles(mode);
if (files.length === 0) {
  console.log('Diff guard passed (no changed files).');
  process.exit(0);
}

if (agent) {
  for (const file of files) {
    if (matchAny(file, agent.forbidden || [])) {
      errors.push(`${agent.id} cannot change forbidden path: ${file}`);
    }
    if (
      !matchAny(file, agent.owns || []) &&
      !matchAny(file, activeAllowedPaths) &&
      !matchAny(file, rules.sharedAllowedPaths || [])
    ) {
      errors.push(`${agent.id} does not own changed path: ${file}`);
    }
  }
}

fail(errors, 'Diff guard failed');
console.log(`Diff guard passed (${files.length} changed file${files.length === 1 ? '' : 's'}).`);
