import { classifySurfaces, fail, getArgValue, getChangedFiles, hasArg, loadRules, loadState, resolveWork } from './harness-lib.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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
const fingerprint = changedFilesFingerprint(files, mode);

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

    for (const field of ['artifacts', 'checkedAt', 'commit', 'errors', 'provider', 'status', 'summary', 'surface', 'target', 'verifiedBy', 'worktreeFingerprint']) {
      if (!(field in entry)) errors.push(`Evidence ${evidenceType} missing field: ${field}`);
    }
    if (!Array.isArray(entry.artifacts) || entry.artifacts.length === 0) {
      errors.push(`Evidence ${evidenceType} must include at least one artifact.`);
    } else {
      for (const [index, artifact] of entry.artifacts.entries()) {
        for (const field of ['kind', 'summary', 'target']) {
          if (!artifact?.[field]) errors.push(`Evidence ${evidenceType}.artifacts[${index}] missing field: ${field}`);
        }
        if (artifact?.path && !fs.existsSync(path.join(process.cwd(), artifact.path))) {
          errors.push(`Evidence ${evidenceType}.artifacts[${index}] path missing: ${artifact.path}`);
        }
      }
    }
    if (!Array.isArray(entry.errors)) {
      errors.push(`Evidence ${evidenceType}.errors must be an array.`);
    } else if (entry.errors.length > 0) {
      errors.push(`Evidence ${evidenceType} includes runtime errors: ${entry.errors.length}`);
    }

    if (requirement?.requireConsoleClean) {
      const consoleResult = readConsoleResult(entry);
      if (!consoleResult.found) {
        errors.push(`Evidence ${evidenceType} must include console error/warning counts.`);
      } else {
        if (consoleResult.errors > 0) {
          errors.push(`Evidence ${evidenceType} includes console errors: ${consoleResult.errors}`);
        }
        if (consoleResult.warnings > 0) {
          errors.push(`Evidence ${evidenceType} includes console warnings: ${consoleResult.warnings}`);
        }
      }
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
    if (fingerprint && entry.worktreeFingerprint !== fingerprint) {
      errors.push(`Evidence ${evidenceType} worktree fingerprint does not match current changed files.`);
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

function changedFilesFingerprint(changedFiles, mode) {
  const fingerprintFiles = changedFiles.filter((file) => file !== rules.project?.docs?.context);
  if (fingerprintFiles.length === 0) return '';
  const hash = createHash('sha256');
  for (const file of [...fingerprintFiles].sort()) {
    hash.update(file);
    hash.update('\0');
    const content = readChangedFile(file, mode);
    hash.update(content);
    hash.update('\0');
  }
  return hash.digest('hex');
}

function readChangedFile(file, mode) {
  if (mode === 'staged') {
    try {
      return execFileSync('git', ['show', `:${file}`], { encoding: 'utf8' });
    } catch {
      return '';
    }
  }
  try {
    return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
  } catch {
    return '';
  }
}

function readConsoleResult(entry) {
  const candidates = [
    { errors: entry.consoleErrors, warnings: entry.consoleWarnings },
    { errors: entry.console?.errors, warnings: entry.console?.warnings },
    ...(Array.isArray(entry.artifacts) ? entry.artifacts.map((artifact) => ({
      errors: artifact.consoleErrors,
      warnings: artifact.consoleWarnings,
      summary: artifact.summary
    })) : [])
  ];

  for (const candidate of candidates) {
    const errorsCount = numberOrNull(candidate.errors);
    const warningsCount = numberOrNull(candidate.warnings);
    if (errorsCount !== null || warningsCount !== null) {
      return {
        found: true,
        errors: errorsCount ?? 0,
        warnings: warningsCount ?? 0
      };
    }

    const parsed = parseConsoleSummary(candidate.summary);
    if (parsed.found) return parsed;
  }

  return { found: false, errors: 0, warnings: 0 };
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function parseConsoleSummary(summary) {
  if (typeof summary !== 'string') return { found: false, errors: 0, warnings: 0 };
  const errors = summary.match(/console\s+errors?\s*:\s*(\d+)/i) || summary.match(/errors?\s*:\s*(\d+)/i);
  const warnings = summary.match(/console\s+warnings?\s*:\s*(\d+)/i) || summary.match(/warnings?\s*:\s*(\d+)/i);
  if (!errors && !warnings) return { found: false, errors: 0, warnings: 0 };
  return {
    found: true,
    errors: errors ? Number(errors[1]) : 0,
    warnings: warnings ? Number(warnings[1]) : 0
  };
}
