import { exists, fail, loadRules, matchAny } from './harness-lib.mjs';

const errors = [];
let rules;

try {
  rules = loadRules();
} catch (error) {
  errors.push(error.message);
}

if (rules) {
  for (const field of ['schemaVersion', 'project', 'agents', 'surfaces', 'commands', 'evidencePolicy', 'reviewPolicy']) {
    if (!(field in rules)) errors.push(`Project rules missing ${field}`);
  }

  for (const [key, value] of Object.entries(rules.project?.docs || {})) {
    if (typeof value !== 'string' || value.length === 0) errors.push(`project.docs.${key} must be a path`);
    else if (!exists(value)) errors.push(`project.docs.${key} path missing: ${value}`);
  }

  for (const command of ['baseline', 'ci', 'dataCheck', 'harnessTest', 'preCommit', 'prePush', 'verify']) {
    if (typeof rules.commands?.[command] !== 'string' || rules.commands[command].trim().length === 0) {
      errors.push(`commands.${command} must be configured`);
    }
  }

  for (const profile of ['ci', 'handoff', 'preCommit', 'prePush']) {
    if (!Array.isArray(rules.guardProfiles?.[profile]?.steps) || rules.guardProfiles[profile].steps.length === 0) {
      errors.push(`guardProfiles.${profile}.steps must be a non-empty array`);
    }
  }

  if (rules.hookPolicy?.requiredPath !== '.agents/hooks') {
    errors.push('hookPolicy.requiredPath must be .agents/hooks');
  }

  if (!rules.bypassPolicy?.requiredReasonEnv) {
    errors.push('bypassPolicy.requiredReasonEnv must be configured');
  }

  for (const agent of rules.agents || []) {
    if (!agent.id) errors.push('Agent rule missing id');
    if (!Array.isArray(agent.owns)) errors.push(`Agent ${agent.id} owns must be an array`);
    if (!Array.isArray(agent.forbidden)) errors.push(`Agent ${agent.id} forbidden must be an array`);
  }

  for (const surface of rules.surfaces || []) {
    if (!surface.id) errors.push('Surface rule missing id');
    if (!Array.isArray(surface.paths) || surface.paths.length === 0) {
      errors.push(`Surface ${surface.id} paths must be a non-empty array`);
    }
  }

  const surfaceIds = new Set((rules.surfaces || []).map((surface) => surface.id));
  for (const [surfaceId, policy] of Object.entries(rules.evidencePolicy || {})) {
    if (!surfaceIds.has(surfaceId)) errors.push(`Evidence policy references unknown surface: ${surfaceId}`);
    if (!Array.isArray(policy.requiredEvidence)) {
      errors.push(`Evidence policy ${surfaceId}.requiredEvidence must be an array`);
    } else {
      for (const requirement of policy.requiredEvidence) {
        if (!requirement.type) errors.push(`Evidence policy ${surfaceId} requirement missing type`);
        if (!Number.isFinite(requirement.maxAgeMinutes)) {
          errors.push(`Evidence policy ${surfaceId}.${requirement.type || '<unknown>'} missing maxAgeMinutes`);
        }
      }
    }
  }

  const allOwnPatterns = (rules.agents || []).flatMap((agent) => agent.owns || []);
  for (const surface of rules.surfaces || []) {
    for (const surfacePath of surface.paths || []) {
      if (!matchAny(surfacePath.replace(/\*\*?/g, 'placeholder'), allOwnPatterns) && !surfacePath.startsWith('.')) {
        errors.push(`Surface path has no obvious owner pattern: ${surfacePath}`);
      }
    }
  }
}

fail(errors, 'Project rules validation failed');
console.log('Project rules validation passed.');
