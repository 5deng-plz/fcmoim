import { fail, getChangedFiles, hasArg, loadRules, matchAny } from './harness-lib.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rules = loadRules();
const policy = rules.designPolicy;
const errors = [];

if (!policy) {
  console.log('Design guard skipped (no designPolicy in project rules).');
  process.exit(0);
}

const mode = hasArg('staged') ? 'staged' : hasArg('all') ? 'all' : 'worktree';
const files = mode === 'all' ? getAllTrackedFiles() : getChangedFiles(mode);

if (files.length === 0) {
  console.log(mode === 'all' ? 'Design guard passed (no tracked files).' : 'Design guard passed (no changed files).');
  process.exit(0);
}

const guardedPaths = policy.guardedPaths || [];
const tokenFiles = new Set((policy.tokenDefinitionFiles || []).map((f) => f.replace(/^\.\//, '')));
const allowedPrefixes = policy.allowedTailwindColorPrefixes || [];
const exemptPatterns = (policy.exemptPatterns || []).map((p) => new RegExp(p));
const semanticSlots = policy.semanticSlots || [];
const customSvgAllowedPaths = policy.customSvgAllowedPaths || [];
const forbiddenLayoutClasses = policy.layoutPolicy?.forbiddenClasses || [];
const forbiddenLayoutClassSet = new Set(forbiddenLayoutClasses);

const guardedFiles = files.filter((file) => {
  if (tokenFiles.has(file)) return false;
  if (!matchAny(file, guardedPaths)) return false;
  return /\.(tsx|ts|css)$/.test(file);
});

if (guardedFiles.length === 0) {
  console.log('Design guard passed (no guarded files changed).');
  process.exit(0);
}

for (const file of guardedFiles) {
  const absolutePath = path.join(root, file);
  if (!fs.existsSync(absolutePath)) continue;

  const content = readGuardedContent(file, mode);
  if (content === null) continue;

  const isTsx = /\.tsx?$/.test(file);
  const uncommentedContent = stripComments(content);

  for (const { line, lineNumber } of linesWithNumbers(uncommentedContent)) {

    // Skip comments and imports
    if (/^\s*(\/\/|\/\*|\*|import\s)/.test(line)) continue;
    // Skip exempt patterns
    if (exemptPatterns.some((re) => re.test(line))) continue;

    if (isTsx) {
      // DES-001: Hardcoded hex in component code
      const hexMatches = line.matchAll(/#[0-9a-fA-F]{3,8}\b/g);
      for (const match of hexMatches) {
        // Allow hex inside var() references or CSS variable fallbacks
        const before = line.slice(0, match.index);
        if (/var\(\s*--[\w-]+,\s*$/.test(before)) continue;
        errors.push(`DES-001 [${file}:${lineNumber}] Hardcoded hex: ${match[0]}`);
      }

      // DES-002: Hardcoded rgba in component code
      if (/rgba?\(\s*\d/.test(line)) {
        errors.push(`DES-002 [${file}:${lineNumber}] Hardcoded rgba()`);
      }

      // DES-003: Inline SVG path
      if (!matchAny(file, customSvgAllowedPaths) && (/<svg[\s>]/.test(line) || /<path[\s>]/.test(line) || /<polygon[\s>]/.test(line))) {
        errors.push(`DES-003 [${file}:${lineNumber}] Inline SVG element`);
      }
    }

    // DES-004: Disallowed Tailwind color class
    for (const className of findDisallowedTailwindColorClasses(line, allowedPrefixes)) {
      errors.push(`DES-004 [${file}:${lineNumber}] Disallowed Tailwind color class: ${className}`);
    }

    // DES-006: Project-forbidden layout utilities
    for (const className of findClassTokens(line)) {
      const baseClassName = normalizeUtilityClass(className);
      if (forbiddenLayoutClassSet.has(baseClassName)) {
        errors.push(`DES-006 [${file}:${lineNumber}] Forbidden layout utility: ${baseClassName}`);
      }
      if (policy.layoutPolicy?.forbidArbitraryMinWidth && /^min-w-\[/.test(baseClassName)) {
        errors.push(`DES-006 [${file}:${lineNumber}] Arbitrary min-width can create horizontal scroll: ${baseClassName}`);
      }
    }
  }

  validateSemanticSlots(file, uncommentedContent);
}

fail(errors, 'Design guard failed');
console.log(`Design guard passed (${guardedFiles.length} guarded file${guardedFiles.length === 1 ? '' : 's'}).`);

function validateSemanticSlots(file, content) {
  for (const slot of semanticSlots) {
    if (!slot || !matchAny(file, slot.paths || [])) continue;

    for (const required of slot.requiredContent || []) {
      if (!content.includes(required)) {
        errors.push(`DES-005 [${file}] Semantic slot ${slot.id || '<unknown>'} missing required content: ${required}`);
      }
    }

    for (const forbidden of slot.forbiddenContent || []) {
      if (content.includes(forbidden)) {
        errors.push(`DES-005 [${file}] Semantic slot ${slot.id || '<unknown>'} contains forbidden content: ${forbidden}`);
      }
    }
  }
}

function readGuardedContent(file, mode) {
  if (mode === 'staged') {
    try {
      return execFileSync('git', ['show', `:${file}`], { cwd: root, encoding: 'utf8' });
    } catch {
      return null;
    }
  }
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function getAllTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).trim();
  return [...new Set([
    ...(output ? output.split(/\r?\n/) : []),
    ...getChangedFiles('worktree')
  ].filter(Boolean))].sort();
}

function linesWithNumbers(content) {
  return content.split(/\r?\n/).map((line, index) => ({ line, lineNumber: index + 1 }));
}

function findDisallowedTailwindColorClasses(line, allowed) {
  const utilityPrefixes = [
    'text', 'bg', 'border', 'ring', 'shadow', 'outline', 'accent', 'fill',
    'stroke', 'from', 'via', 'to', 'divide', 'placeholder'
  ];
  const allTailwindColors = [
    'slate', 'gray', 'zinc', 'neutral', 'stone',
    'red', 'orange', 'amber', 'yellow', 'lime', 'emerald', 'teal',
    'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia',
    'pink', 'rose', 'green'
  ];
  const tokens = line.match(/[!:-]?[A-Za-z0-9_[\]#./%()-]+/g) || [];
  const disallowed = [];

  for (const token of tokens) {
    const base = token.split(':').pop().replace(/^!/, '').replace(/^-/, '');
    const utility = utilityPrefixes.find((prefix) => base === prefix || base.startsWith(`${prefix}-`));
    if (!utility || base === utility) continue;

    const rawValue = base.slice(utility.length + 1);
    const value = rawValue.split('/')[0];
    if (value.startsWith('[')) {
      if (/[#]|(?:rgb|rgba|hsl|hsla|oklch|oklab)\(/.test(value)) disallowed.push(base);
      continue;
    }

    const isAllowed = allowed.some((prefix) => value === prefix || value.startsWith(`${prefix}-`));
    if (isAllowed) continue;

    const rootColor = value.split('-')[0];
    if (allTailwindColors.includes(rootColor)) disallowed.push(base);
  }

  return disallowed;
}

function findClassTokens(line) {
  return line.match(/[!:-]?[A-Za-z0-9_[\]#./%()-]+/g) || [];
}

function normalizeUtilityClass(className) {
  return className.split(':').pop().replace(/^!/, '').replace(/^-/, '');
}

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}
