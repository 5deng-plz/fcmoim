import { fail, loadRules } from './harness-lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rules = loadRules();
const policy = rules.designPolicy;
const errors = [];

if (!policy?.tokenSync) {
  console.log('Token sync guard skipped (no designPolicy.tokenSync configured).');
  process.exit(0);
}

const docsPath = policy.tokenSync.docs || policy.docs;
if (!docsPath) {
  console.log('Token sync guard skipped (no design token docs configured).');
  process.exit(0);
}

const absoluteDocsPath = path.join(root, docsPath);
if (!fs.existsSync(absoluteDocsPath)) {
  errors.push(`Design token docs not found: ${docsPath}`);
} else {
  validateDocumentedPrefixes(fs.readFileSync(absoluteDocsPath, 'utf8'));
}

fail(errors, 'Token sync guard failed');
console.log('Token sync guard passed.');

function validateDocumentedPrefixes(content) {
  const allowedPrefixes = policy.allowedTailwindColorPrefixes || [];
  const ignoredPrefixes = new Set(policy.tokenSync.ignoredDocumentPrefixes || []);
  const allowedSection = content.split(/^## 금지 사항/m)[0] || content;
  const documentedPrefixes = new Set();

  for (const line of allowedSection.split(/\r?\n/)) {
    for (const match of line.matchAll(/`([a-z][a-z0-9-]*)-\*`/g)) {
      const prefix = match[1];
      if (ignoredPrefixes.has(prefix)) continue;
      documentedPrefixes.add(prefix);
    }
  }

  for (const prefix of [...documentedPrefixes].sort()) {
    if (!isPrefixAllowed(prefix, allowedPrefixes)) {
      errors.push(`Documented design token prefix is missing from designPolicy.allowedTailwindColorPrefixes: ${prefix}-*`);
    }
  }
}

function isPrefixAllowed(prefix, allowedPrefixes) {
  return allowedPrefixes.some((allowed) => prefix === allowed || prefix.startsWith(`${allowed}-`));
}
