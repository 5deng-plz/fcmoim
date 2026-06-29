import { matchAny } from './harness-lib.mjs';

export function findRoleViolations(files, roleConfig) {
  const forbiddenPaths = roleConfig?.forbiddenPaths || [];
  const allowedExceptions = roleConfig?.allowedExceptions || [];

  return files
    .filter((file) => (
      matchAny(file, forbiddenPaths)
      && !matchAny(file, allowedExceptions)
    ))
    .map((file) => `Role boundary violation: ${file}`);
}
