import { fail, loadRules, loadState, matchAny } from './harness-lib.mjs';

const rules = loadRules();
const state = loadState(rules);
const work = state.activeWork || {};
const errors = [];

const readyStatus = rules.reviewPolicy?.readyStatus || 'ready';
const files = uniqueStrings(work.changedFiles);
const surfaces = uniqueStrings(work.changedSurfaces);
const evidence = work.evidence || {};
const blockers = [
  ...normalizeBlockers(state.blockers),
  ...normalizeBlockers(work.blockers)
];
const isReady = work.reviewStatus === readyStatus || work.status === 'complete';

if (work.status === 'complete' && work.reviewStatus !== readyStatus) {
  errors.push(`Completed work must have reviewStatus "${readyStatus}".`);
}

if (isReady && blockers.length > 0) {
  errors.push('Ready or complete work must not have unresolved blockers.');
}

validateBrowserSmoke();
validateSurfaceEvidence();
validateDesignModeEvidence();
validateRetrospective();

fail(errors, 'Evidence guard failed');
console.log('Evidence guard passed.');

function validateBrowserSmoke() {
  const policy = rules.evidencePolicy?.browserSmoke;
  if (!policy) return;

  const requiredFiles = files.filter((file) => matchAny(file, policy.requiredWhenChanged || []));
  if (requiredFiles.length === 0) return;

  if (!hasPassedEvidence('browserRuntime')) {
    addMissingEvidence(
      'browserRuntime',
      `browserRuntime evidence is required for changed files: ${requiredFiles.join(', ')}`
    );
    return;
  }

  const text = evidenceText(evidence.browserRuntime);
  const passedTerms = policy.passedEvidenceTerms || [];
  const missingPassedTerms = passedTerms.filter((term) => !text.includes(String(term).toLowerCase()));
  if (missingPassedTerms.length > 0) {
    errors.push(`browserRuntime evidence marked passed must mention: ${missingPassedTerms.join(', ')}.`);
  }

  if (policy.packageReasonRequired && requiredFiles.some((file) => matchAny(file, policy.packageReasonPaths || []))) {
    const terms = policy.packageReasonTerms || [];
    if (terms.length > 0 && !terms.some((term) => text.includes(String(term).toLowerCase()))) {
      errors.push('browserRuntime evidence for package/runtime files must include the runtime impact reason.');
    }
  }
}

function validateSurfaceEvidence() {
  for (const [surface, policy] of Object.entries(rules.evidencePolicy || {})) {
    if (surface === 'browserSmoke') continue;
    if (!policy || policy.mockEvidenceAccepted !== false) continue;
    if (!surfaceChanged(surface)) continue;

    if (!hasQualifiedEvidence(policy)) {
      addMissingEvidence(
        surface,
        `Non-mock evidence is required for changed surface "${surface}".`
      );
    }
  }
}

function validateDesignModeEvidence() {
  const designMode = normalizeDesignMode(work.designMode);
  const designPolicy = rules.designPolicy || {};
  const modeProfile = designPolicy.modeProfiles?.[designMode] || {};

  if (designMode === 'redesign' && modeProfile.requireVisualReview !== false && changedGuardedUiFiles().length > 0) {
    if (!hasPassedEvidence('visualReview')) {
      addMissingEvidence(
        'visualReview',
        `visualReview evidence is required for redesign work that changes UI files: ${changedGuardedUiFiles().join(', ')}`
      );
    }
  }

  if (designMode === 'token-migration' && modeProfile.requireTokenSyncEvidence !== false && tokenDefinitionFilesChanged()) {
    if (!hasPassedEvidence('tokenSync')) {
      addMissingEvidence(
        'tokenSync',
        'tokenSync evidence is required for token-migration work that changes token definition files.'
      );
    }
  }
}

function validateRetrospective() {
  const policy = rules.retrospectivePolicy;
  if (!policy?.requiredAtCompletion || !isReady) return;

  const retrospective = work.retrospective;
  if (!retrospective || typeof retrospective !== 'object' || Array.isArray(retrospective)) {
    errors.push('Completion requires activeWork.retrospective.');
    return;
  }

  const requiredFields = policy.requiredFields || [];
  for (const field of requiredFields) {
    if (!(field in retrospective)) {
      errors.push(`activeWork.retrospective missing required field: ${field}`);
    }
  }

  const allowedRecommendations = policy.promotionRecommendations || [];
  if (allowedRecommendations.length > 0 && !allowedRecommendations.includes(retrospective.promotionRecommendation)) {
    errors.push(`activeWork.retrospective.promotionRecommendation must be one of: ${allowedRecommendations.join(', ')}`);
  }
}

function surfaceChanged(surface) {
  if (surfaces.includes(surface)) return true;
  const surfaceRule = (rules.surfaces || []).find((candidate) => candidate.id === surface);
  return surfaceRule ? files.some((file) => matchAny(file, surfaceRule.paths || [])) : false;
}

function hasPassedEvidence(key) {
  return evidenceEntryStatus(evidence[key]) === 'passed';
}

function hasQualifiedEvidence(policy) {
  return Object.values(evidence).some((entry) => {
    if (evidenceEntryStatus(entry) !== 'passed') return false;
    const text = evidenceText(entry);
    if (isMockOnly(text)) return false;

    const requiredTypes = (policy.requiredEvidence || []).map((item) => String(item.type || '').toLowerCase()).filter(Boolean);
    const providers = (policy.providers || []).map((provider) => String(provider).toLowerCase()).filter(Boolean);
    if (requiredTypes.some((type) => evidenceEntryType(entry) === type || text.includes(type))) return true;
    if (providers.some((provider) => text.includes(provider))) return true;
    return false;
  });
}

function addMissingEvidence(key, message) {
  if (!isReady && hasRelevantBlocker(key)) return;
  errors.push(message);
}

function hasRelevantBlocker(key) {
  const needle = String(key).toLowerCase();
  return blockers.some((blocker) => blocker.includes(needle) || blocker.includes('evidence'));
}

function changedGuardedUiFiles() {
  const guardedPaths = rules.designPolicy?.guardedPaths || [];
  return files.filter((file) => /\.(tsx|ts|css)$/.test(file) && matchAny(file, guardedPaths));
}

function tokenDefinitionFilesChanged() {
  const tokenDefinitionFiles = new Set((rules.designPolicy?.tokenDefinitionFiles || []).map((file) => file.replace(/^\.\//, '')));
  return files.some((file) => tokenDefinitionFiles.has(file));
}

function normalizeDesignMode(value) {
  return ['maintenance', 'redesign', 'token-migration'].includes(value) ? value : 'maintenance';
}

function evidenceEntryStatus(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return String(entry.status || '').toLowerCase();
}

function evidenceEntryType(entry) {
  if (!entry || typeof entry !== 'object') return '';
  return String(entry.type || '').toLowerCase();
}

function evidenceText(entry) {
  if (!entry || typeof entry !== 'object') return '';
  return JSON.stringify(entry).toLowerCase();
}

function isMockOnly(text) {
  return text.includes('mock') && !text.includes('non-mock') && !text.includes('real');
}

function uniqueStrings(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter((item) => typeof item === 'string' && item.trim()))];
}

function normalizeBlockers(value) {
  if (!Array.isArray(value)) return [];
  return value.map((blocker) => (
    typeof blocker === 'string' ? blocker : JSON.stringify(blocker)
  ).toLowerCase());
}
