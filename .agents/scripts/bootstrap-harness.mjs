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
  schemaVersion: '2.0.0',
  projectName: path.basename(root),
  updateVersion: 0,
  updatedAt: new Date().toISOString(),
  updatedBy: 'orchestrator',
  currentPhase: 'initialized',
  activeWork: {
    taskId: null,
    status: 'idle',
    baselineCommit: null,
    changedFiles: [],
    changedSurfaces: [],
    allowedPaths: [],
    evidence: {},
    reviewStatus: null,
    loopCounters: {
      reviewRounds: 0,
      guardRetries: 0
    }
  },
  workstreams: [],
  blockers: [],
  nextActions: []
}, null, 2) + '\n');

writeIfMissing(rulesPath, JSON.stringify({
  schemaVersion: '2.0.0',
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
    preCommit: 'node .agents/scripts/validate-harness.mjs',
    verify: 'node .agents/scripts/validate-harness.mjs'
  },
  guardProfiles: {
    preCommit: { steps: ['validateHarness', 'guardDesignStaged', 'projectPreCommit'] },
    verify: { steps: ['validateHarness', 'guardDesign', 'guardDiff', 'projectVerify'] }
  },
  evidencePolicy: {},
  reviewPolicy: { required: true, readyStatus: 'ready' },
  loopPolicy: {
    maxGuardRetries: 3,
    maxReviewRounds: 3,
    escalationAction: 'Stop work and report current state, failure analysis, and next step suggestions'
  },
  harnessPurity: { forbiddenTokens: [] }
}, null, 2) + '\n');

console.log('Harness bootstrap complete.');

function writeIfMissing(file, content) {
  if (fs.existsSync(file)) return;
  fs.writeFileSync(file, content);
}
