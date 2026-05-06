import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDirectory = path.join(root, 'docs');
const guidePath = path.join(root, 'AGENT.md');
const rulesPath = path.join(docsDirectory, 'agent-rules.json');
const contextPath = path.join(docsDirectory, 'project-' + 'context.json');
const decisionsPath = path.join(docsDirectory, 'dec' + 'isions.md');

fs.mkdirSync(docsDirectory, { recursive: true });

writeIfMissing(guidePath, `# Agent Harness Guide

Read project rules before each task. Follow ownership, evidence, and review gates configured there.
`);

writeIfMissing(decisionsPath, `# Decision Log

Record only durable decisions that future sessions must know.
`);

writeIfMissing(contextPath, JSON.stringify({
  schemaVersion: '1.0.0',
  projectName: path.basename(root),
  updatedAt: new Date().toISOString(),
  updatedBy: 'main-orchestrator',
  currentPhase: 'initialized',
  agents: {},
  activeWork: {
    agentId: null,
    taskId: null,
    status: 'idle',
    startedAt: null,
    baselineCommit: null,
    changedFiles: [],
    changedSurfaces: [],
    allowedPaths: [],
    evidence: {},
    reviewVerdict: null,
    blockers: [],
    guardResults: {}
  },
  workstreams: [],
  handoffs: [],
  blockers: [],
  nextActions: []
}, null, 2) + '\n');

writeIfMissing(rulesPath, JSON.stringify({
  schemaVersion: '1.0.0',
  project: {
    name: path.basename(root),
    docs: {
      context: path.relative(root, contextPath).replaceAll(path.sep, '/'),
      decisions: path.relative(root, decisionsPath).replaceAll(path.sep, '/')
    }
  },
  agents: [],
  sharedAllowedPaths: [],
  surfaces: [],
  commands: {
    baseline: 'node .agents/scripts/validate-harness.mjs',
    ci: 'node .agents/scripts/validate-harness.mjs',
    harnessTest: 'node .agents/scripts/test-harness.mjs',
    preCommit: 'node .agents/scripts/validate-harness.mjs',
    prePush: 'node .agents/scripts/validate-harness.mjs',
    verify: 'node .agents/scripts/validate-harness.mjs'
  },
  guardProfiles: {
    preCommit: { steps: ['validateHarness', 'validateProject', 'guardHooks', 'guardDiffStaged', 'projectPreCommit'] },
    prePush: { steps: ['projectPrePush', 'guardEvidence', 'guardReview'] },
    ci: { steps: ['validateHarness', 'validateProject', 'harnessTest', 'projectCi'] },
    handoff: { steps: ['guardDiff', 'guardEvidence', 'guardReview'] }
  },
  hookPolicy: { requiredPath: '.agents/hooks' },
  bypassPolicy: {
    allowedProfiles: ['preCommit'],
    blockedProfiles: ['prePush', 'ci', 'handoff'],
    bypassableSteps: ['guardDiffStaged'],
    requiredReasonEnv: 'HARNESS_BYPASS_REASON'
  },
  evidencePolicy: {},
  reviewPolicy: { required: true, readyStatus: 'ready' },
  harnessPurity: { forbiddenTokens: [] }
}, null, 2) + '\n');

console.log('Harness bootstrap complete.');

function writeIfMissing(file, content) {
  if (fs.existsSync(file)) return;
  fs.writeFileSync(file, content);
}
