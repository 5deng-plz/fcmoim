import { exists, fail, loadRules, loadState, matchAny } from './harness-lib.mjs';

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
  requireProfileSteps('prePush', ['guardDesign', 'guardEvidence', 'guardReview']);
  requireProfileSteps('ci', ['validateHarness', 'validateProject', 'harnessTest', 'guardDesign', 'guardEvidence', 'guardReview']);
  requireProfileSteps('handoff', ['guardDiff', 'guardDesign', 'guardEvidence', 'guardReview']);

  if (rules.hookPolicy?.requiredPath !== '.agents/hooks') {
    errors.push('hookPolicy.requiredPath must be .agents/hooks');
  }

  if (!rules.bypassPolicy?.requiredReasonEnv) {
    errors.push('bypassPolicy.requiredReasonEnv must be configured');
  }

  validateCoordinationPolicy(rules.coordinationPolicy);
  validateStatePolicy(rules.statePolicy);

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

  if (rules.designPolicy) {
    const dp = rules.designPolicy;
    if (!Array.isArray(dp.allowedTailwindColorPrefixes) || dp.allowedTailwindColorPrefixes.length === 0) {
      errors.push('designPolicy.allowedTailwindColorPrefixes must be a non-empty array');
    }
    if (!Array.isArray(dp.guardedPaths) || dp.guardedPaths.length === 0) {
      errors.push('designPolicy.guardedPaths must be a non-empty array');
    }
    if (!Array.isArray(dp.tokenDefinitionFiles) || dp.tokenDefinitionFiles.length === 0) {
      errors.push('designPolicy.tokenDefinitionFiles must be a non-empty array');
    }
    if (typeof dp.docs === 'string' && dp.docs.length > 0 && !exists(dp.docs)) {
      errors.push(`designPolicy.docs path missing: ${dp.docs}`);
    }
    if (dp.semanticSlots !== undefined) {
      if (!Array.isArray(dp.semanticSlots)) {
        errors.push('designPolicy.semanticSlots must be an array when configured');
      } else {
        for (const slot of dp.semanticSlots) {
          if (typeof slot.id !== 'string' || slot.id.length === 0) {
            errors.push('designPolicy.semanticSlots[].id must be a non-empty string');
          }
          if (!Array.isArray(slot.paths) || slot.paths.length === 0) {
            errors.push(`designPolicy.semanticSlots.${slot.id || '<unknown>'}.paths must be a non-empty array`);
          }
          for (const key of ['requiredContent', 'forbiddenContent']) {
            if (slot[key] !== undefined && !Array.isArray(slot[key])) {
              errors.push(`designPolicy.semanticSlots.${slot.id || '<unknown>'}.${key} must be an array`);
            }
          }
        }
      }
    }
  }

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

function requireProfileSteps(profile, requiredSteps) {
  const steps = rules.guardProfiles?.[profile]?.steps || [];
  for (const step of requiredSteps) {
    if (!steps.includes(step)) errors.push(`guardProfiles.${profile}.steps must include ${step}`);
  }
}

function validateCoordinationPolicy(policy) {
  if (policy === undefined) return;
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    errors.push('coordinationPolicy must be an object when configured');
    return;
  }

  const leases = policy.allowedPathLeases;
  if (leases === undefined) return;
  if (!leases || typeof leases !== 'object' || Array.isArray(leases)) {
    errors.push('coordinationPolicy.allowedPathLeases must be an object when configured');
    return;
  }

  if (typeof leases.enabled !== 'boolean') {
    errors.push('coordinationPolicy.allowedPathLeases.enabled must be a boolean');
  }
  if (leases.source !== 'activeWork.allowedPaths') {
    errors.push('coordinationPolicy.allowedPathLeases.source must be activeWork.allowedPaths');
  }
  if (leases.scope !== 'task') {
    errors.push('coordinationPolicy.allowedPathLeases.scope must be task');
  }
  if (leases.issuer !== 'main-orchestrator') {
    errors.push('coordinationPolicy.allowedPathLeases.issuer must be main-orchestrator');
  }
  if (leases.cannotOverrideForbidden !== true) {
    errors.push('coordinationPolicy.allowedPathLeases.cannotOverrideForbidden must be true');
  }
}

function validateStatePolicy(policy) {
  if (policy === undefined) return;
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    errors.push('statePolicy must be an object when configured');
    return;
  }

  if (typeof policy.updateVersionRequired !== 'boolean') {
    errors.push('statePolicy.updateVersionRequired must be a boolean');
  }
  if (policy.writer !== undefined && policy.writer !== 'main-orchestrator') {
    errors.push('statePolicy.writer must be main-orchestrator when configured');
  }
  if (policy.incrementOnWrite !== undefined && typeof policy.incrementOnWrite !== 'boolean') {
    errors.push('statePolicy.incrementOnWrite must be a boolean when configured');
  }

  if (policy.updateVersionRequired === true) {
    try {
      const state = loadState(rules);
      if (!Number.isInteger(state.updateVersion) || state.updateVersion < 0) {
        errors.push('Project state updateVersion must be a non-negative integer when statePolicy.updateVersionRequired is true');
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
}
