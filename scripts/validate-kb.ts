import Ajv2020, { type ErrorObject } from 'ajv/dist/2020';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MATERIALS } from '../src/data/materials.ts';
import { THRESHOLDS } from '../src/lib/knowledge/rules/thresholds.ts';
import { MODULE_CATALOG } from '../src/lib/knowledge/modules.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const ajv = new Ajv2020({ allErrors: true, strict: false });
const schemaCache = new Map<string, ReturnType<typeof ajv.compile>>();

function readJson(pathFromRoot: string): unknown {
  return JSON.parse(readFileSync(join(rootDir, pathFromRoot), 'utf8')) as unknown;
}

function formatError(error: ErrorObject): string {
  const path = error.instancePath || '/';
  return `  - ${path} ${error.message ?? 'schema validation failed'}`;
}

function validateSource(name: string, schemaPath: string, data: unknown): boolean {
  const validate = schemaCache.get(schemaPath) ?? ajv.compile(readJson(schemaPath));
  schemaCache.set(schemaPath, validate);
  const valid = validate(data);

  if (valid) {
    console.log(`✓ ${name}`);
    return true;
  }

  console.error(`✗ ${name}`);
  for (const error of validate.errors ?? []) {
    console.error(formatError(error));
  }
  return false;
}

const checks = [
  validateSource(
    'public/knowledge/base_v3_normalized.json',
    'src/schemas/kb.schema.json',
    readJson('public/knowledge/base_v3_normalized.json'),
  ),
  validateSource(
    'src/lib/knowledge/rules/thresholds.ts',
    'src/schemas/thresholds.schema.json',
    THRESHOLDS,
  ),
  validateSource(
    'src/data/materials.ts',
    'src/schemas/materials.schema.json',
    MATERIALS,
  ),
  ...Object.entries(MODULE_CATALOG).map(([id, moduleDefinition]) =>
    validateSource(
      `src/lib/knowledge/modules.ts#${id}`,
      'src/schemas/module.schema.json',
      moduleDefinition,
    ),
  ),
];

if (checks.some((ok) => !ok)) {
  process.exitCode = 1;
}
