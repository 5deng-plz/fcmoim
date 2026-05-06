import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

const requiredContracts = [
  { type: 'column', table: 'matches', column: 'cancelled_at' },
  { type: 'column', table: 'matches', column: 'cancellation_reason' },
  { type: 'column', table: 'matches', column: 'updated_by' },
  { type: 'column', table: 'schedule_polls', column: 'cancelled_at' },
  { type: 'column', table: 'schedule_polls', column: 'cancellation_reason' },
  { type: 'column', table: 'schedule_polls', column: 'updated_by' },
  { type: 'enumValue', enumName: 'match_status', value: 'cancelled' },
  { type: 'enumValue', enumName: 'schedule_poll_status', value: 'cancelled' }
];

const forbiddenSqlIgnorePatterns = new Set([
  'supabase/**/*.sql',
  '/supabase/**/*.sql'
]);

const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function walk(relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];

  const entries = fs.readdirSync(absoluteDirectory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return walk(relativePath);
    return [relativePath];
  });
}

function assertSqlFilesAreTracked(sqlFiles) {
  for (const sqlFile of sqlFiles) {
    try {
      execFileSync('git', ['check-ignore', '--quiet', sqlFile], { cwd: root });
      errors.push(`Supabase SQL must not be ignored by git: ${sqlFile}`);
    } catch (error) {
      if (error.status !== 1) {
        errors.push(`Could not check git ignore status for ${sqlFile}: ${error.message}`);
      }
    }
  }

  if (!exists('.gitignore')) return;

  const ignoredSqlLines = read('.gitignore')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => !line.startsWith('#') && forbiddenSqlIgnorePatterns.has(line));

  for (const line of ignoredSqlLines) {
    errors.push(`Remove blanket Supabase SQL ignore pattern from .gitignore: ${line}`);
  }
}

function parseSqlSchema(sql) {
  const tables = new Map();
  const enumValues = new Map();

  const ensureTable = (table) => {
    if (!tables.has(table)) tables.set(table, new Set());
    return tables.get(table);
  };

  const ensureEnum = (enumName) => {
    if (!enumValues.has(enumName)) enumValues.set(enumName, new Set());
    return enumValues.get(enumName);
  };

  for (const match of sql.matchAll(/create\s+type\s+(?:public\.)?([a-z_][\w]*)\s+as\s+enum\s*\(([\s\S]*?)\);/gi)) {
    const values = ensureEnum(match[1]);
    for (const value of match[2].matchAll(/'((?:''|[^'])*)'/g)) {
      values.add(value[1].replaceAll("''", "'"));
    }
  }

  for (const match of sql.matchAll(/alter\s+type\s+(?:public\.)?([a-z_][\w]*)\s+add\s+value\s+(?:if\s+not\s+exists\s+)?'((?:''|[^'])*)'/gi)) {
    ensureEnum(match[1]).add(match[2].replaceAll("''", "'"));
  }

  for (const match of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][\w]*)\s*\(([\s\S]*?)\);/gi)) {
    const columns = ensureTable(match[1]);
    for (const fragment of splitTopLevel(match[2])) {
      const trimmed = fragment.trim();
      if (!trimmed) continue;
      if (/^(constraint|primary|foreign|unique|check|exclude)\b/i.test(trimmed)) continue;

      const column = /^"?([a-z_][\w]*)"?\s+/i.exec(trimmed)?.[1];
      if (column) columns.add(column);
    }
  }

  for (const match of sql.matchAll(/alter\s+table\s+(?:public\.)?([a-z_][\w]*)\s+([\s\S]*?);/gi)) {
    const columns = ensureTable(match[1]);
    for (const columnMatch of match[2].matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_][\w]*)"?/gi)) {
      columns.add(columnMatch[1]);
    }
  }

  return { enumValues, tables };
}

function splitTopLevel(input) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const previous = input[index - 1];

    if (quote) {
      if (character === quote && previous !== '\\') quote = null;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;

    if (character === ',' && depth === 0) {
      parts.push(input.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(input.slice(start));
  return parts;
}

const sqlFiles = walk('supabase')
  .filter((file) => file.endsWith('.sql'))
  .sort();

if (sqlFiles.length === 0) {
  errors.push('No Supabase SQL files found under supabase/.');
} else {
  assertSqlFilesAreTracked(sqlFiles);
}

const sql = sqlFiles.map((file) => read(file)).join('\n\n');
const schema = parseSqlSchema(sql);

for (const contract of requiredContracts) {
  if (contract.type === 'column') {
    if (!schema.tables.get(contract.table)?.has(contract.column)) {
      errors.push(`Missing Supabase column contract: ${contract.table}.${contract.column}`);
    }
  }

  if (contract.type === 'enumValue') {
    if (!schema.enumValues.get(contract.enumName)?.has(contract.value)) {
      errors.push(`Missing Supabase enum contract: ${contract.enumName}.${contract.value}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Supabase contract check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Supabase contract check passed (${sqlFiles.length} SQL file${sqlFiles.length === 1 ? '' : 's'}).`);
