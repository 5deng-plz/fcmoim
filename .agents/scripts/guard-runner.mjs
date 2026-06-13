import { loadRules, runCommand } from './harness-lib.mjs';

const profile = process.argv[2];
if (!profile) {
  console.error('Usage: guard-runner.mjs <profile>');
  process.exit(1);
}

const rules = loadRules();
const commands = rules.commands || {};
const profileKey = toProfileKey(profile);
const steps = rules.guardProfiles?.[profileKey]?.steps;

if (!steps) {
  console.error(`Unknown guard profile: ${profile}`);
  process.exit(1);
}

for (const step of steps) {
  runStep(step);
}

console.log(`Guard profile "${profile}" passed.`);

function runStep(step) {
  if (step === 'validateHarness') runCommand('node .agents/scripts/validate-harness.mjs', step);
  else if (step === 'guardDiff') runCommand('node .agents/scripts/guard-diff.mjs', step);
  else if (step === 'guardDiffStaged') runCommand('node .agents/scripts/guard-diff.mjs --staged', step);
  else if (step === 'guardDesign') runCommand('node .agents/scripts/guard-design.mjs', step);
  else if (step === 'guardDesignStaged') runCommand('node .agents/scripts/guard-design.mjs --staged', step);
  else if (step === 'guardEvidence') runCommand('node .agents/scripts/guard-evidence.mjs', step);
  else if (step === 'guardTokenSync') runCommand('node .agents/scripts/guard-token-sync.mjs', step);
  else if (step === 'projectPreCommit') runCommand(commands.preCommit || 'true', step);
  else if (step === 'projectVerify') runCommand(commands.verify || 'true', step);
  else {
    console.error(`Unknown guard step: ${step}`);
    process.exit(1);
  }
}

function toProfileKey(value) {
  if (value === 'pre-commit') return 'preCommit';
  return value;
}
