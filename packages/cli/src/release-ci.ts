import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ReleaseCiAnswers {
  targetPlatforms: string[];
  easUses: string[];
  testToMainSafeguards: boolean;
  releaseCiReady: boolean;
}

export interface ReleaseCiWriteResult {
  filePath: string;
  wrote: boolean;
}

interface JsonRecord {
  [key: string]: unknown;
}

const IOS_PUBLISHING_USE = 'publishing mobile applications';
const TESTFLIGHT_WORKFLOW_FILE = 'mds-testflight.yml';
const PRODUCTION_WORKFLOW_FILE = 'mds-production.yml';

export function isReleaseCiEligible(answers: ReleaseCiAnswers): boolean {
  return (
    answers.releaseCiReady &&
    answers.testToMainSafeguards &&
    answers.targetPlatforms.includes('ios') &&
    answers.easUses.includes(IOS_PUBLISHING_USE)
  );
}

export function renderTestFlightWorkflow(): string {
  return [
    'name: MDS TestFlight',
    '',
    'on:',
    '  push:',
    '    branches: [test]',
    '',
    'jobs:',
    '  build_ios:',
    '    name: Build iOS for TestFlight',
    '    type: build',
    '    environment: preview',
    '    params:',
    '      platform: ios',
    '      profile: production',
    '',
    '  distribute_testflight:',
    '    name: Distribute to TestFlight',
    '    needs: [build_ios]',
    '    type: testflight',
    '    environment: preview',
    '    params:',
    '      build_id: ${{ needs.build_ios.outputs.build_id }}',
    '      profile: production',
    '',
  ].join('\n');
}

export function renderProductionWorkflow(): string {
  return [
    'name: MDS Production',
    '',
    'on:',
    '  push:',
    '    branches: [main]',
    '',
    'jobs:',
    '  build_ios:',
    '    name: Build iOS for production',
    '    type: build',
    '    environment: production',
    '    params:',
    '      platform: ios',
    '      profile: production',
    '',
    '  submit_ios:',
    '    name: Upload to App Store Connect',
    '    needs: [build_ios]',
    '    type: submit',
    '    environment: production',
    '    params:',
    '      build_id: ${{ needs.build_ios.outputs.build_id }}',
    '      profile: production',
    '',
  ].join('\n');
}

export function mergeReleaseCiEasConfig(input: JsonRecord): JsonRecord {
  const config = JSON.parse(JSON.stringify(input)) as JsonRecord;
  const cli = ensureRecord(config, 'cli');
  const appVersionSource = cli.appVersionSource;
  if (appVersionSource !== undefined && appVersionSource !== 'remote') {
    throw new Error(
      'Release CI requires eas.json cli.appVersionSource to be "remote". Resolve the existing setting before enabling --release-ci-ready.',
    );
  }
  cli.appVersionSource = 'remote';

  const build = ensureRecord(config, 'build');
  const productionBuild = ensureRecord(build, 'production');
  if (productionBuild.autoIncrement === false) {
    throw new Error(
      'Release CI requires eas.json build.production.autoIncrement to be enabled. Resolve the existing false value before enabling --release-ci-ready.',
    );
  }
  if (productionBuild.autoIncrement === undefined) {
    productionBuild.autoIncrement = true;
  }

  const submit = ensureRecord(config, 'submit');
  ensureRecord(submit, 'production');
  return config;
}

export async function scaffoldReleaseCi(
  projectPath: string,
  answers: ReleaseCiAnswers,
  options: { force?: boolean } = {},
): Promise<ReleaseCiWriteResult[]> {
  if (!isReleaseCiEligible(answers)) return [];

  const easJsonPath = path.join(projectPath, 'eas.json');
  const existingConfig = await readOptionalJson(easJsonPath);
  const mergedConfig = mergeReleaseCiEasConfig(existingConfig ?? {});
  const results: ReleaseCiWriteResult[] = [];
  const nextConfig = `${JSON.stringify(mergedConfig, null, 2)}\n`;
  const existingConfigText = existingConfig
    ? `${JSON.stringify(existingConfig, null, 2)}\n`
    : undefined;
  if (nextConfig !== existingConfigText) {
    await writeFile(easJsonPath, nextConfig, 'utf8');
    results.push({ filePath: easJsonPath, wrote: true });
  }

  const workflowDirectory = path.join(projectPath, '.eas', 'workflows');
  results.push(
    await writeIfAllowed(
      path.join(workflowDirectory, TESTFLIGHT_WORKFLOW_FILE),
      renderTestFlightWorkflow(),
      Boolean(options.force),
    ),
    await writeIfAllowed(
      path.join(workflowDirectory, PRODUCTION_WORKFLOW_FILE),
      renderProductionWorkflow(),
      Boolean(options.force),
    ),
  );
  return results;
}

async function readOptionalJson(filePath: string): Promise<JsonRecord | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    if (!isRecord(parsed)) {
      throw new Error('eas.json must contain a JSON object.');
    }
    return parsed;
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') return null;
    throw error;
  }
}

async function writeIfAllowed(
  filePath: string,
  content: string,
  force: boolean,
): Promise<ReleaseCiWriteResult> {
  await mkdir(path.dirname(filePath), { recursive: true });
  if (!force && (await pathExists(filePath))) {
    return { filePath, wrote: false };
  }
  await writeFile(filePath, content, 'utf8');
  return { filePath, wrote: true };
}

function ensureRecord(target: JsonRecord, key: string): JsonRecord {
  const value = target[key];
  if (value === undefined) {
    const record: JsonRecord = {};
    target[key] = record;
    return record;
  }
  if (!isRecord(value)) {
    throw new Error(`Release CI requires eas.json ${key} to be an object.`);
  }
  return value;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
