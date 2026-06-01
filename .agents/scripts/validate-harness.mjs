import fs from 'node:fs';
import path from 'node:path';
import { exists, fail, loadRules, root } from './harness-lib.mjs';

const harnessRoot = path.join(root, '.agents');
const errors = [];

// ── 1. Manifest ─────────────────────────────────────────────────────────
const manifestPath = '.agents/manifest.json';
if (!exists(manifestPath)) {
  console.error('FAIL  manifest.json missing');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8'));
} catch (error) {
  console.error(`FAIL  manifest.json invalid JSON: ${error.message}`);
  process.exit(1);
}

if (!manifest.schemaVersion) errors.push('manifest.schemaVersion missing');

// ── 2. Agent prompt files ───────────────────────────────────────────────
for (const agent of manifest.agents || []) {
  if (!agent.id) { errors.push('Manifest agent missing id'); continue; }
  if (!agent.prompt) { errors.push(`Manifest agent ${agent.id} missing prompt path`); continue; }
  const promptPath = path.join(root, agent.prompt);
  if (!fs.existsSync(promptPath)) {
    errors.push(`Missing prompt file for agent "${agent.id}": ${agent.prompt}`);
  } else if (fs.readFileSync(promptPath, 'utf8').trim().length === 0) {
    errors.push(`Empty prompt file for agent "${agent.id}": ${agent.prompt}`);
  }
}

// ── 3. Source of truth files ────────────────────────────────────────────
for (const [key, value] of Object.entries(manifest.sourceOfTruth || {})) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`manifest.sourceOfTruth.${key} must be a non-empty path`);
  } else if (!exists(value)) {
    errors.push(`manifest.sourceOfTruth.${key} path missing: ${value}`);
  }
}

// ── 4. Contracts file ───────────────────────────────────────────────────
const contractsPath = manifest.sourceOfTruth?.contracts;
if (contractsPath && exists(contractsPath)) {
  try { JSON.parse(fs.readFileSync(path.join(root, contractsPath), 'utf8')); }
  catch { errors.push('Contracts file is not valid JSON.'); }
}

// ── 5. State schema ─────────────────────────────────────────────────────
const schemaPath = manifest.sourceOfTruth?.stateSchema;
if (schemaPath && exists(schemaPath)) {
  try { JSON.parse(fs.readFileSync(path.join(root, schemaPath), 'utf8')); }
  catch { errors.push('State schema is not valid JSON.'); }
}

// ── 6. Harness purity ───────────────────────────────────────────────────
let rules;
try { rules = loadRules(); } catch { rules = null; }
const forbiddenTokens = rules?.harnessPurity?.forbiddenTokens || [];

for (const file of walk(harnessRoot)) {
  const content = fs.readFileSync(file, 'utf8').toLowerCase();
  for (const token of forbiddenTokens) {
    if (token && content.includes(String(token).toLowerCase())) {
      errors.push(`Harness purity violation in ${path.relative(root, file)}: ${token}`);
    }
  }
}

// ── 7. Project rules validation ─────────────────────────────────────────
if (rules) {
  // Required top-level fields
  for (const field of ['schemaVersion', 'project', 'agents', 'surfaces', 'commands', 'evidencePolicy', 'reviewPolicy']) {
    if (!(field in rules)) errors.push(`Project rules missing: ${field}`);
  }

  // Agents match manifest
  const manifestIds = new Set((manifest.agents || []).map(a => a.id));
  const rulesIds = new Set((rules.agents || []).map(a => a.id));
  for (const id of manifestIds) {
    if (!rulesIds.has(id)) errors.push(`Manifest agent "${id}" not in project rules`);
  }
  for (const agent of rules.agents || []) {
    if (!agent.id) errors.push('Agent rule missing id');
    if (!Array.isArray(agent.owns)) errors.push(`Agent ${agent.id} owns must be an array`);
    if (!Array.isArray(agent.forbidden)) errors.push(`Agent ${agent.id} forbidden must be an array`);
  }

  // Commands
  for (const cmd of ['baseline', 'verify']) {
    if (typeof rules.commands?.[cmd] !== 'string') errors.push(`commands.${cmd} must be configured`);
  }

  // State policy
  if (rules.statePolicy && typeof rules.statePolicy.writer !== 'string') {
    errors.push('statePolicy.writer must be a string');
  }

  // Review policy
  const rp = rules.reviewPolicy;
  if (rp) {
    if (typeof rp.required !== 'boolean') errors.push('reviewPolicy.required must be a boolean');
    if (typeof rp.readyStatus !== 'string') errors.push('reviewPolicy.readyStatus must be a string');
  }

  // Design policy structure
  if (rules.designPolicy) {
    const dp = rules.designPolicy;
    if (!Array.isArray(dp.allowedTailwindColorPrefixes) || dp.allowedTailwindColorPrefixes.length === 0) {
      errors.push('designPolicy.allowedTailwindColorPrefixes must be a non-empty array');
    }
    if (!Array.isArray(dp.guardedPaths) || dp.guardedPaths.length === 0) {
      errors.push('designPolicy.guardedPaths must be a non-empty array');
    }
    if (dp.semanticSlots) {
      for (const slot of dp.semanticSlots) {
        if (!slot.id) errors.push('designPolicy.semanticSlots[].id must be non-empty');
        if (!Array.isArray(slot.paths)) errors.push(`designPolicy.semanticSlots.${slot.id || '?'}.paths must be an array`);
      }
    }
  }

  // Documentation policy line limits
  const docPol = rules.documentationPolicy;
  if (docPol && Number.isInteger(docPol.maxLines) && Array.isArray(docPol.targetPatterns)) {
    const excluded = docPol.excludePaths || [];
    for (const file of listRepositoryFiles()) {
      if (!matchDocPattern(file, docPol.targetPatterns)) continue;
      if (excluded.some(ex => matchDocPattern(file, [ex]))) continue;
      const lineCount = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/).length;
      if (lineCount > docPol.maxLines) {
        errors.push(`Documentation file exceeds ${docPol.maxLines} lines: ${file} (${lineCount})`);
      }
    }
  }
}

fail(errors, 'Harness validation failed');
console.log('Harness validation passed.');

// ── Helpers ─────────────────────────────────────────────────────────────
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const abs = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(abs);
    return [abs];
  });
}

function listRepositoryFiles() {
  const files = [];
  (function recurse(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['.git', 'node_modules', '.next'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) recurse(full);
      else files.push(path.relative(root, full).replaceAll(path.sep, '/'));
    }
  })(root);
  return files;
}

function matchDocPattern(file, patterns) {
  return patterns.some(p => {
    const regex = new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/(?<!\.)\*/g, '[^/]*') + '$');
    return regex.test(file);
  });
}
