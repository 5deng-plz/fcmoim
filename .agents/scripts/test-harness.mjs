import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sourceRoot = process.cwd();
const fixtures = JSON.parse(fs.readFileSync(path.join(sourceRoot, '.agents/fixtures/negative-fixtures.json'), 'utf8'));
const errors = [];

for (const fixture of fixtures.cases) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `harness-${fixture.id}-`));
  try {
    setupFixture(directory, fixture);
    const result = spawnSync(fixture.command, {
      cwd: directory,
      shell: true,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    if (result.status !== fixture.expectedExit) {
      errors.push(`${fixture.id} expected exit ${fixture.expectedExit}, received ${result.status}`);
    }
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
}

const bootstrapDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-bootstrap-'));
try {
  copyDirectory(path.join(sourceRoot, '.agents'), path.join(bootstrapDirectory, '.agents'));
  const result = spawnSync('node .agents/scripts/bootstrap-harness.mjs', {
    cwd: bootstrapDirectory,
    shell: true,
    stdio: 'pipe',
    encoding: 'utf8'
  });
  if (result.status !== 0) errors.push(`bootstrap expected exit 0, received ${result.status}`);
  for (const file of ['AGENT.md', 'docs/agent-rules.json']) {
    if (!fs.existsSync(path.join(bootstrapDirectory, file))) errors.push(`bootstrap missing ${file}`);
  }
} finally {
  fs.rmSync(bootstrapDirectory, { force: true, recursive: true });
}

if (errors.length > 0) {
  console.error('Harness regression failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Harness regression passed (${fixtures.cases.length} negative cases).`);

function setupFixture(directory, fixture) {
  copyDirectory(path.join(sourceRoot, '.agents'), path.join(directory, '.agents'));
  fs.mkdirSync(path.join(directory, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'app/allowed'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'app/allowed/base.txt'), 'base');

  execFileSync('git', ['init'], { cwd: directory, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: directory });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: directory });

  const rules = mergeDeep(createRules(), fixture.rulesPatch || {});
  fs.writeFileSync(path.join(directory, 'docs/agent-rules.json'), JSON.stringify(rules, null, 2));

  const state = createState();
  fs.writeFileSync(path.join(directory, 'docs/state.json'), JSON.stringify(state, null, 2));

  execFileSync('git', ['add', '.'], { cwd: directory });
  execFileSync('git', ['commit', '-m', 'baseline'], { cwd: directory, stdio: 'ignore' });
  const baselineCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim();

  const patchedState = replaceMarkers(mergeDeep(state, fixture.statePatch || {}), baselineCommit);
  patchedState.activeWork.baselineCommit = baselineCommit;
  fs.writeFileSync(path.join(directory, 'docs/state.json'), JSON.stringify(patchedState, null, 2));

  for (const mutation of fixture.mutations || []) {
    const target = path.join(directory, mutation.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, mutation.content);
  }
}

function createRules() {
  return {
    schemaVersion: '1.0.0',
    project: {
      name: 'fixture',
      docs: { context: 'docs/state.json' }
    },
    agents: [
      { id: 'writer', owns: ['app/allowed/**', 'app/view/**'], forbidden: ['app/blocked/**'] }
    ],
    sharedAllowedPaths: [],
    surfaces: [
      { id: 'interface', paths: ['app/view/**'] }
    ],
    commands: {
      baseline: 'node .agents/scripts/validate-harness.mjs',
      ci: 'node .agents/scripts/validate-harness.mjs',
      harnessTest: 'node .agents/scripts/test-harness.mjs',
      preCommit: 'node .agents/scripts/validate-harness.mjs',
      prePush: 'node .agents/scripts/validate-harness.mjs',
      verify: 'node .agents/scripts/validate-harness.mjs'
    },
    evidencePolicy: {
      interface: { requiredEvidence: [{ type: 'visual', maxAgeMinutes: 1440, requireConsoleClean: true }] }
    },
    reviewPolicy: { required: true, readyStatus: 'ready' },
    hookPolicy: { requiredPath: '.agents/hooks' },
    bypassPolicy: {
      allowedProfiles: ['preCommit'],
      blockedProfiles: ['prePush', 'ci', 'handoff'],
      bypassableSteps: ['guardDiffStaged'],
      requiredReasonEnv: 'HARNESS_BYPASS_REASON'
    },
    coordinationPolicy: {
      allowedPathLeases: {
        enabled: true,
        source: 'activeWork.allowedPaths',
        scope: 'task',
        issuer: 'main-orchestrator',
        cannotOverrideForbidden: true
      }
    },
    statePolicy: {
      updateVersionRequired: true,
      writer: 'main-orchestrator',
      incrementOnWrite: true
    },
    designPolicy: {
      tokenDefinitionFiles: ['app/styles/tokens.css'],
      guardedPaths: ['app/view/**'],
      allowedTailwindColorPrefixes: ['gray'],
      exemptPatterns: [],
      layoutPolicy: {
        forbiddenClasses: ['overflow-x-auto', 'overflow-x-scroll'],
        forbidArbitraryMinWidth: true
      },
      semanticSlots: [
        {
          id: 'fixture-condition-slot',
          paths: ['app/view/Locker.tsx'],
          requiredContent: ['ConditionIcon', 'level="normal"'],
          forbiddenContent: ['CircleCheck', '컨디션 정상']
        }
      ]
    },
    harnessPurity: { forbiddenTokens: [] }
  };
}

function createState() {
  return {
    schemaVersion: '1.0.0',
    projectName: 'fixture',
    updateVersion: 0,
    updatedAt: new Date().toISOString(),
    updatedBy: 'main-orchestrator',
    currentPhase: 'fixture',
    agents: {},
    activeWork: {
      agentId: 'writer',
      taskId: 'fixture-task',
      status: 'ready',
      startedAt: '2026-01-01T00:00:00.000Z',
      baselineCommit: null,
      changedFiles: [],
      changedSurfaces: ['interface'],
      allowedPaths: [],
      evidence: {},
      reviewVerdict: { status: 'ready', blockers: [] },
      blockers: [],
      guardResults: {}
    },
    workstreams: [],
    handoffs: [],
    blockers: [],
    nextActions: []
  };
}

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, targetPath);
    else fs.copyFileSync(sourcePath, targetPath);
  }
}

function mergeDeep(base, patch) {
  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeDeep(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function replaceMarkers(value, baselineCommit) {
  if (typeof value === 'string') return value.replaceAll('__BASELINE_COMMIT__', baselineCommit);
  if (Array.isArray(value)) return value.map((item) => replaceMarkers(item, baselineCommit));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceMarkers(item, baselineCommit)]));
  }
  return value;
}
