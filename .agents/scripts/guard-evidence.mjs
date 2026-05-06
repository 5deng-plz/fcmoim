import { classifySurfaces, fail, getArgValue, getChangedFiles, hasArg, loadRules, loadState, resolveWork } from './harness-lib.mjs';

const rules = loadRules();
const state = loadState(rules);
const work = resolveWork(state, getArgValue('task'));
const mode = hasArg('staged') ? 'staged' : 'worktree';
const files = getChangedFiles(mode);
const surfaces = [...new Set([...classifySurfaces(files, rules), ...(work?.changedSurfaces || [])])].sort();
const evidence = work?.evidence || {};
const errors = [];
const startedAt = parseDate(work?.startedAt);
const baselineCommit = work?.baselineCommit;

for (const surface of surfaces) {
  const policy = rules.evidencePolicy?.[surface];
  if (!policy) continue;
  for (const requirement of policy.requiredEvidence || []) {
    const evidenceType = typeof requirement === 'string' ? requirement : requirement.type;
    const maxAgeMinutes = typeof requirement === 'string' ? undefined : requirement.maxAgeMinutes;
    const entry = evidence[evidenceType];
    if (!entry || entry.status !== 'passed') {
      errors.push(`Missing required ${evidenceType} evidence for changed surface: ${surface}`);
      continue;
    }

    for (const field of ['checkedAt', 'commit', 'errors', 'provider', 'status', 'summary', 'surface', 'target', 'verifiedBy']) {
      if (!(field in entry)) errors.push(`Evidence ${evidenceType} missing field: ${field}`);
    }

    const checkedAt = parseDate(entry.checkedAt);
    if (!checkedAt) {
      errors.push(`Evidence ${evidenceType} has invalid checkedAt`);
    } else {
      if (startedAt && checkedAt < startedAt) {
        errors.push(`Evidence ${evidenceType} is older than active work start.`);
      }
      if (Number.isFinite(maxAgeMinutes)) {
        const ageMinutes = (Date.now() - checkedAt.getTime()) / 60000;
        if (ageMinutes > maxAgeMinutes) {
          errors.push(`Evidence ${evidenceType} is stale (${Math.round(ageMinutes)}m > ${maxAgeMinutes}m).`);
        }
      }
    }

    if (baselineCommit && entry.commit !== baselineCommit) {
      errors.push(`Evidence ${evidenceType} commit does not match active work baseline.`);
    }
  }
}

if (work?.status === 'complete' && errors.length > 0) {
  errors.push('Active work cannot be complete while required evidence is missing.');
}

fail(errors, 'Evidence guard failed');
console.log(`Evidence guard passed (${surfaces.length} changed surface${surfaces.length === 1 ? '' : 's'}).`);

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
