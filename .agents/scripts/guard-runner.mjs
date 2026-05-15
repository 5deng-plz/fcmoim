import { loadRules, loadState, quoteShell, runCommand } from './harness-lib.mjs';

const profile = process.argv[2];
if (!profile) {
  console.error('Usage: guard-runner.mjs <profile>');
  process.exit(1);
}

const rules = loadRules();
const commands = rules.commands || {};
const state = loadState(rules);
const profileKey = toProfileKey(profile);
const steps = rules.guardProfiles?.[profileKey]?.steps || defaultSteps(profileKey);
const bypassReason = process.env[rules.bypassPolicy?.requiredReasonEnv || ''];

if (bypassReason && (rules.bypassPolicy?.blockedProfiles || []).includes(profileKey)) {
  console.error(`Harness bypass is not allowed for profile: ${profileKey}`);
  process.exit(1);
}

if (!steps) {
  console.error(`Unknown guard profile: ${profile}`);
  process.exit(1);
}

for (const step of steps) {
  if (shouldBypass(profileKey, step)) {
    console.warn(`Harness guard step bypassed for ${profileKey}: ${step}`);
    continue;
  }
  runStep(step);
}

function runStep(step) {
  const agentArg = state.activeWork?.agentId ? ` --agent=${quoteShell(state.activeWork.agentId)}` : '';
  const taskArg = state.activeWork?.taskId ? ` --task=${quoteShell(state.activeWork.taskId)}` : '';

  if (step === 'validateHarness') runCommand('node .agents/scripts/validate-harness.mjs', step);
  else if (step === 'validateProject') runCommand('node .agents/scripts/validate-project-rules.mjs', step);
  else if (step === 'guardHooks') runCommand('node .agents/scripts/guard-hooks.mjs', step);
  else if (step === 'guardDiff') runCommand(`node .agents/scripts/guard-diff.mjs${agentArg}${taskArg}`, step);
  else if (step === 'guardDiffStaged') runCommand(`node .agents/scripts/guard-diff.mjs --staged${agentArg}${taskArg}`, step);
  else if (step === 'guardEvidence') runCommand(`node .agents/scripts/guard-evidence.mjs${taskArg}`, step);
  else if (step === 'guardDesign') runCommand('node .agents/scripts/guard-design.mjs', step);
  else if (step === 'guardDesignStaged') runCommand('node .agents/scripts/guard-design.mjs --staged', step);
  else if (step === 'guardReview') runCommand(`node .agents/scripts/guard-review.mjs${taskArg}`, step);
  else if (step === 'harnessTest') runCommand(commands.harnessTest, step);
  else if (step === 'projectPreCommit') runCommand(commands.preCommit, step);
  else if (step === 'projectPrePush') runCommand(commands.prePush || commands.verify, step);
  else if (step === 'projectVerify') runCommand(commands.verify, step);
  else if (step === 'projectCi') runCommand(commands.ci, step);
  else {
    console.error(`Unknown guard step: ${step}`);
    process.exit(1);
  }
}

function shouldBypass(profileName, step) {
  if (!bypassReason) return false;
  if (!(rules.bypassPolicy?.allowedProfiles || []).includes(profileName)) return false;
  return (rules.bypassPolicy?.bypassableSteps || []).includes(step);
}

function toProfileKey(value) {
  if (value === 'pre-commit') return 'preCommit';
  if (value === 'pre-push') return 'prePush';
  return value;
}

function defaultSteps(value) {
  if (value === 'preCommit') return ['validateHarness', 'validateProject', 'guardHooks', 'guardDiffStaged', 'projectPreCommit'];
  if (value === 'prePush') return ['projectPrePush', 'guardEvidence', 'guardReview'];
  if (value === 'ci') return ['validateHarness', 'validateProject', 'harnessTest', 'projectCi'];
  if (value === 'handoff') return ['guardDiff', 'guardEvidence', 'guardReview'];
  return null;
}
