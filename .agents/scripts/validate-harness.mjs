import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const harnessRoot = path.join(root, '.agents');
const errors = [];

const requiredAgentIds = [
  'architect',
  'backend',
  'data',
  'devops',
  'frontend',
  'main-orchestrator',
  'qa',
  'review'
];

const requiredFiles = [
  '.agents/agents/architect.md',
  '.agents/agents/backend.md',
  '.agents/agents/data.md',
  '.agents/agents/devops.md',
  '.agents/agents/frontend.md',
  '.agents/agents/main-orchestrator.md',
  '.agents/agents/qa.md',
  '.agents/agents/review.md',
  '.agents/contracts/agent-contracts.json',
  '.agents/fixtures/negative-fixtures.json',
  '.agents/hooks/pre-commit',
  '.agents/hooks/pre-push',
  '.agents/manifest.json',
  '.agents/scripts/bootstrap-harness.mjs',
  '.agents/scripts/guard-design.mjs',
  '.agents/scripts/guard-diff.mjs',
  '.agents/scripts/guard-evidence.mjs',
  '.agents/scripts/guard-hooks.mjs',
  '.agents/scripts/guard-review.mjs',
  '.agents/scripts/guard-runner.mjs',
  '.agents/scripts/harness-lib.mjs',
  '.agents/scripts/install-hooks.mjs',
  '.agents/scripts/test-harness.mjs',
  '.agents/scripts/validate-harness.mjs',
  '.agents/scripts/validate-project-rules.mjs',
  '.agents/state/project-context.schema.json'
];

const expectedDirectoryEntries = {
  '.agents': ['agents', 'contracts', 'fixtures', 'hooks', 'manifest.json', 'scripts', 'state'],
  '.agents/agents': [
    'architect.md',
    'backend.md',
    'data.md',
    'devops.md',
    'frontend.md',
    'main-orchestrator.md',
    'qa.md',
    'review.md'
  ],
  '.agents/contracts': ['agent-contracts.json'],
  '.agents/fixtures': ['negative-fixtures.json'],
  '.agents/hooks': ['pre-commit', 'pre-push'],
  '.agents/scripts': [
    'bootstrap-harness.mjs',
    'guard-design.mjs',
    'guard-diff.mjs',
    'guard-evidence.mjs',
    'guard-hooks.mjs',
    'guard-review.mjs',
    'guard-runner.mjs',
    'harness-lib.mjs',
    'install-hooks.mjs',
    'test-harness.mjs',
    'validate-harness.mjs',
    'validate-project-rules.mjs'
  ],
  '.agents/state': ['project-context.schema.json']
};

const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const isNonEmptyArray = (value) => Array.isArray(value) && value.length > 0;
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Missing required file: ${file}`);
}

for (const [directory, expectedEntries] of Object.entries(expectedDirectoryEntries)) {
  if (!exists(directory)) {
    errors.push(`Missing required directory: ${directory}`);
    continue;
  }
  const actualEntries = fs.readdirSync(path.join(root, directory)).sort();
  const expected = [...expectedEntries].sort();
  if (JSON.stringify(actualEntries) !== JSON.stringify(expected)) {
    errors.push(`${directory} entries must be exactly: ${expected.join(', ')}`);
  }
}

let contracts;
let manifest;
let schema;

try {
  contracts = readJson('.agents/contracts/agent-contracts.json');
} catch (error) {
  errors.push(`Invalid contracts JSON: ${error.message}`);
}

try {
  manifest = readJson('.agents/manifest.json');
} catch (error) {
  errors.push(`Invalid manifest JSON: ${error.message}`);
}

try {
  schema = readJson('.agents/state/project-context.schema.json');
} catch (error) {
  errors.push(`Invalid project context schema JSON: ${error.message}`);
}

if (contracts) {
  for (const id of requiredAgentIds) {
    const contract = contracts.agents?.[id];
    if (!contract) {
      errors.push(`Contracts missing Agent: ${id}`);
      continue;
    }

    for (const key of ['capabilities', 'requiredOutputs']) {
      if (!isNonEmptyArray(contract[key])) {
        errors.push(`Contract ${id}.${key} must be a non-empty array`);
      }
    }
  }
}

if (manifest) {
  for (const [key, value] of Object.entries(manifest.sourceOfTruth || {})) {
    if (!isNonEmptyString(value)) {
      errors.push(`manifest.sourceOfTruth.${key} must be a non-empty path`);
    } else if (!exists(value)) {
      errors.push(`manifest.sourceOfTruth.${key} path missing: ${value}`);
    }
  }

  const manifestAgentIds = new Set((manifest.agents || []).map((agent) => agent.id));
  for (const id of requiredAgentIds) {
    if (!manifestAgentIds.has(id)) errors.push(`Manifest missing Agent: ${id}`);
  }

  const requiredGateIds = [
    'baseline',
    'deterministic-verify',
    'independent-review',
    'runtime-evidence'
  ];
  const manifestGateIds = new Set((manifest.qualityGates || []).map((gate) => gate.id));
  for (const id of requiredGateIds) {
    if (!manifestGateIds.has(id)) errors.push(`Manifest missing quality gate: ${id}`);
  }

  for (const agent of manifest.agents || []) {
    if (!agent.prompt || !exists(agent.prompt)) errors.push(`Manifest Agent prompt missing: ${agent.id}`);
    if (agent.id === 'main-orchestrator' && agent.mayUpdateProjectState !== true) {
      errors.push('main-orchestrator must be allowed to update project state');
    }
    if (agent.id !== 'main-orchestrator' && agent.mayUpdateProjectState !== false) {
      errors.push(`Worker Agent mayUpdateProjectState must be false: ${agent.id}`);
    }
  }
}

if (schema) {
  const requiredStateFields = ['activeWork', 'agents', 'currentPhase', 'schemaVersion', 'updatedAt', 'updatedBy'];
  for (const field of requiredStateFields) {
    if (!schema.required?.includes(field)) errors.push(`Project context schema must require ${field}`);
  }
}

const projectRulesPath = path.join(root, 'docs/agent-rules.json');
const forbiddenTokens = fs.existsSync(projectRulesPath)
  ? (JSON.parse(fs.readFileSync(projectRulesPath, 'utf8')).harnessPurity?.forbiddenTokens || [])
  : [];

for (const file of walk(harnessRoot)) {
  const content = fs.readFileSync(file, 'utf8').toLowerCase();
  for (const token of forbiddenTokens) {
    if (token && content.includes(String(token).toLowerCase())) {
      errors.push(`Harness purity violation in ${path.relative(root, file)}: ${token}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Harness validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Harness validation passed.');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolutePath);
    return [absolutePath];
  });
}
