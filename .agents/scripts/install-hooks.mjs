import { execFileSync } from 'node:child_process';

execFileSync('git', ['config', 'core.hooksPath', '.agents/hooks'], { stdio: 'inherit' });
console.log('Installed harness hooks: core.hooksPath=.agents/hooks');
