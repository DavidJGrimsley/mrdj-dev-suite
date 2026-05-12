#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { cancel, isCancel, log, text } from '@clack/prompts';
import { SUPER_STACK_SUCCESS_MESSAGE, collectOnboardPlan, defaultOnboardPlan } from '@mrdj/cli/onboarding';
import { scaffoldProjectMemory } from '@mrdj/cli/project-memory';

import type { OnboardArgv } from '@mrdj/cli/onboarding';

export interface ParsedArgs {
  projectName?: string;
  createExpoStackArgs: string[];
  mrdj: {
    appName?: string;
    audience?: string;
    coreFlows?: string;
    dataNeeds?: string;
    dataStart?: 'local' | 'supabase';
    deploymentTarget?: string;
    defaults?: string[];
    createExpoStackBin?: string;
    force: boolean;
    guidelinesTemplate?: boolean;
    guidelinesTemplatePath?: string;
    rich?: boolean;
    skipExpoFix: boolean;
    testToMain?: boolean;
    projectParentDir?: string;
    yes: boolean;
    skipCreate: boolean;
    platforms?: string[];
    firstPlatform?: string;
    platformStrategy?: 'folders' | 'files-only';
    webOutput?: 'static' | 'server' | 'spa' | 'none';
    deployedServer?: 'standard-expo' | 'custom' | 'none';
    createExpoComponents?: boolean;
    latestExpoSdk?: boolean;
    expoUi?: boolean;
    expoNativeTabs?: boolean;
    easUses?: string[];
  };
}

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
const DEFAULT_PROJECT_NAME = 'my-expo-app';
const CURRENT_EXPO_SDK_MAJOR = 55;

interface CommandSpec {
  command: string;
  args: string[];
  display: string;
  shell?: boolean;
  env?: Record<string, string>;
}

interface ExpoProjectCheckOptions {
  useLatestExpoSdk?: boolean;
}

export async function main(): Promise<void> {
  const initialParsed = parseArgs(process.argv.slice(2));
  const parsed = withResolvedProjectName(initialParsed, await promptForMissingProjectName(initialParsed));
  validateCreateExpoStackArgs(parsed.createExpoStackArgs);
  const projectName = parsed.projectName ?? DEFAULT_PROJECT_NAME;
  const projectParentDir = parsed.mrdj.projectParentDir ?? process.cwd();

  printIntro(projectName, parsed.createExpoStackArgs, projectParentDir);

  if (!parsed.mrdj.skipCreate) {
    await runCreateExpoStack(parsed.createExpoStackArgs, parsed.mrdj.createExpoStackBin, projectParentDir);
  } else {
    console.log('Skipping create-expo-stack because --mrdj-skip-create was passed.');
  }

  const projectPath = await resolveGeneratedProjectPath(projectParentDir, projectName);
  const easSelected = await detectEasSetup(projectPath, parsed.createExpoStackArgs);
  const onboardArgv = buildOnboardArgv(projectPath, parsed, easSelected);
  const plan = parsed.mrdj.yes
    ? defaultOnboardPlan(onboardArgv, projectPath)
    : await collectOnboardPlan(onboardArgv, projectPath);
  const written = await scaffoldProjectMemory(projectPath, plan.answers, {
    force: parsed.mrdj.force,
    guidelinesTemplate: plan.guidelinesTemplate,
    guidelinesTemplatePath: plan.guidelinesTemplatePath,
    manageUniwind: parsed.mrdj.skipCreate,
    richBoilerplate: plan.richBoilerplate,
  });
  const identifierRepairs = await repairExpoProjectIdentifiers(projectPath, projectName);

  console.log();
  console.log('MrDJ onboarding complete.');
  for (const result of written) {
    console.log(`${result.wrote ? 'CREATED' : 'KEPT'} ${path.relative(process.cwd(), result.filePath)}`);
  }
  for (const result of identifierRepairs) {
    console.log(`UPDATED ${path.relative(process.cwd(), result)}`);
  }

  const packageManager = await detectPackageManager(projectPath, parsed.createExpoStackArgs);
  const noInstallRequested = hasNoInstallFlag(parsed.createExpoStackArgs);
  if (shouldRunExpoProjectChecks(parsed, noInstallRequested)) {
    await runExpoProjectChecks(projectPath, packageManager, {
      useLatestExpoSdk: plan.answers.useLatestExpoSdk,
    });
  } else if (noInstallRequested) {
    console.log();
    console.log('Skipped install and Expo dependency repair because create-expo-stack was run with --no-install.');
  }

  console.log();
  console.log('Onboarding next steps:');
  console.log('1. Play with styling in the style-guide page.');
  console.log('2. Browse exposition pages to understand included base packages.');
  console.log('3. Review project/ files for accuracy and planning adjustments.');
  console.log('4. Tell the agent to commence development phase by phase.');
  console.log();
  console.log('Next steps:');
  console.log(`  cd ${quoteDisplayArg(path.relative(process.cwd(), projectPath) || '.')}`);
  if (noInstallRequested || parsed.mrdj.skipExpoFix || parsed.mrdj.skipCreate) {
    console.log(`  ${buildInstallCommand(packageManager).display}`);
    if (plan.answers.useLatestExpoSdk && (await shouldRunExpoLatestSdkCommand(projectPath))) {
      console.log(`  ${buildExpoLatestSdkCommand(packageManager).display}`);
    }
    console.log(`  ${buildExpoInstallFixCommand(packageManager).display}`);
    if (await shouldInstallExpoFontPeer(projectPath)) {
      console.log(`  ${buildExpoFontInstallCommand(packageManager).display}`);
    }
    console.log(`  ${buildExpoDoctorCommand(packageManager).display}`);
  }
  console.log(`  ${buildRunScriptCommand(packageManager, 'clear-expo-start')}`);
  console.log();
  console.log(SUPER_STACK_SUCCESS_MESSAGE);
  console.log();
  console.log('For the full dev-suite locally, use the generated scripts or install @mrdj/cli in the app.');
}

export function parseArgs(args: string[]): ParsedArgs {
  const createExpoStackArgs: string[] = [];
  const mrdj: ParsedArgs['mrdj'] = {
    force: false,
    skipExpoFix: false,
    yes: false,
    skipCreate: false,
  };
  let projectName: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    if (!arg.startsWith('--') && !projectName) {
      projectName = arg;
      createExpoStackArgs.push(arg);
      continue;
    }

    if (arg === '--mrdj-force') {
      mrdj.force = true;
      continue;
    }

    if (arg === '--mrdj-no-rich') {
      mrdj.rich = false;
      continue;
    }

    if (arg === '--mrdj-rich') {
      mrdj.rich = true;
      continue;
    }

    if (arg === '--mrdj-yes' || arg === '--mrdj-non-interactive') {
      mrdj.yes = true;
      continue;
    }

    if (arg === '--mrdj-skip-create') {
      mrdj.skipCreate = true;
      continue;
    }

    if (arg === '--mrdj-skip-expo-fix' || arg === '--mrdj-no-expo-fix') {
      mrdj.skipExpoFix = true;
      continue;
    }

    if (arg.startsWith('--mrdj-create-expo-stack-bin=')) {
      mrdj.createExpoStackBin = arg.slice('--mrdj-create-expo-stack-bin='.length);
      continue;
    }

    if (arg === '--mrdj-guidelines-template') {
      mrdj.guidelinesTemplate = true;
      continue;
    }

    if (arg.startsWith('--mrdj-guidelines-template=')) {
      mrdj.guidelinesTemplate = true;
      mrdj.guidelinesTemplatePath = arg.slice('--mrdj-guidelines-template='.length);
      continue;
    }

    if (arg.startsWith('--mrdj-guidelines-template-path=')) {
      mrdj.guidelinesTemplate = true;
      mrdj.guidelinesTemplatePath = arg.slice('--mrdj-guidelines-template-path='.length);
      continue;
    }

    if (arg.startsWith('--mrdj-defaults=')) {
      mrdj.defaults = splitList(arg.slice('--mrdj-defaults='.length));
      continue;
    }

    if (arg.startsWith('--mrdj-app-name=')) {
      mrdj.appName = arg.slice('--mrdj-app-name='.length);
      continue;
    }

    if (arg.startsWith('--mrdj-audience=')) {
      mrdj.audience = arg.slice('--mrdj-audience='.length);
      continue;
    }

    if (arg.startsWith('--mrdj-core-flows=')) {
      mrdj.coreFlows = arg.slice('--mrdj-core-flows='.length);
      continue;
    }

    if (arg.startsWith('--mrdj-data-needs=')) {
      mrdj.dataNeeds = arg.slice('--mrdj-data-needs='.length);
      continue;
    }

    if (arg.startsWith('--mrdj-data-start=')) {
      const value = arg.slice('--mrdj-data-start='.length);
      if (value === 'local' || value === 'supabase') {
        mrdj.dataStart = value;
      }
      continue;
    }

    if (arg.startsWith('--mrdj-deployment-target=')) {
      mrdj.deploymentTarget = arg.slice('--mrdj-deployment-target='.length);
      continue;
    }

    if (arg === '--mrdj-test-to-main') {
      mrdj.testToMain = true;
      continue;
    }

    if (arg === '--mrdj-no-test-to-main') {
      mrdj.testToMain = false;
      continue;
    }

    if (arg.startsWith('--mrdj-platforms=')) {
      mrdj.platforms = splitList(arg.slice('--mrdj-platforms='.length));
      continue;
    }

    if (arg.startsWith('--mrdj-first-platform=')) {
      mrdj.firstPlatform = arg.slice('--mrdj-first-platform='.length);
      continue;
    }

    if (arg.startsWith('--mrdj-platform-strategy=')) {
      const value = arg.slice('--mrdj-platform-strategy='.length);
      if (value === 'folders' || value === 'files-only') {
        mrdj.platformStrategy = value;
      }
      continue;
    }

    if (arg.startsWith('--mrdj-web-output=')) {
      const value = arg.slice('--mrdj-web-output='.length);
      if (value === 'static' || value === 'server' || value === 'spa' || value === 'none') {
        mrdj.webOutput = value;
      }
      continue;
    }

    if (arg.startsWith('--mrdj-deployed-server=')) {
      const value = arg.slice('--mrdj-deployed-server='.length);
      if (value === 'standard-expo' || value === 'custom' || value === 'none') {
        mrdj.deployedServer = value;
      }
      continue;
    }

    if (arg === '--mrdj-create-expo-components') {
      mrdj.createExpoComponents = true;
      continue;
    }

    if (arg === '--mrdj-no-create-expo-components') {
      mrdj.createExpoComponents = false;
      continue;
    }

    if (arg === '--mrdj-latest-expo-sdk') {
      mrdj.latestExpoSdk = true;
      continue;
    }

    if (arg === '--mrdj-no-latest-expo-sdk') {
      mrdj.latestExpoSdk = false;
      continue;
    }

    if (arg === '--mrdj-expo-ui') {
      mrdj.expoUi = true;
      continue;
    }

    if (arg === '--mrdj-no-expo-ui') {
      mrdj.expoUi = false;
      continue;
    }

    if (arg === '--mrdj-expo-native-tabs') {
      mrdj.expoNativeTabs = true;
      continue;
    }

    if (arg === '--mrdj-no-expo-native-tabs') {
      mrdj.expoNativeTabs = false;
      continue;
    }

    if (arg.startsWith('--mrdj-eas-uses=')) {
      mrdj.easUses = splitList(arg.slice('--mrdj-eas-uses='.length));
      continue;
    }

    createExpoStackArgs.push(arg);
  }

  return {
    projectName,
    createExpoStackArgs,
    mrdj,
  };
}

export function withResolvedProjectName(parsed: ParsedArgs, projectName: string): ParsedArgs {
  const target = resolveProjectTarget(parsed.projectName ?? projectName);
  const resolvedProjectName = target.projectName;
  const createExpoStackArgs = parsed.mrdj.skipCreate
    ? parsed.createExpoStackArgs
    : replaceProjectArg(parsed.createExpoStackArgs, resolvedProjectName);

  if (parsed.projectName) {
    return {
      ...parsed,
      projectName: resolvedProjectName,
      createExpoStackArgs,
      mrdj: {
        ...parsed.mrdj,
        projectParentDir: target.parentDir,
        appName: parsed.mrdj.appName ?? resolvedProjectName,
      },
    };
  }

  return {
    ...parsed,
    projectName: resolvedProjectName,
    createExpoStackArgs,
    mrdj: {
      ...parsed.mrdj,
      projectParentDir: target.parentDir,
      appName: parsed.mrdj.appName ?? resolvedProjectName,
    },
  };
}

async function promptForMissingProjectName(parsed: ParsedArgs): Promise<string> {
  if (parsed.projectName) {
    return parsed.projectName;
  }

  if (parsed.mrdj.yes || parsed.mrdj.skipCreate) {
    return DEFAULT_PROJECT_NAME;
  }

  const answer = await text({
    message: 'What do you want to name your Expo app?',
    placeholder: DEFAULT_PROJECT_NAME,
    defaultValue: DEFAULT_PROJECT_NAME,
    validate: (value) => {
      if (!value.trim()) {
        return 'Please enter an app name, or press Enter to use the visible default.';
      }
      return undefined;
    },
  });

  if (isCancel(answer)) {
    cancel('Cancelled. You can rerun create-expo-super-stack whenever you are ready.');
    process.exit(0);
  }

  const projectName = answer.trim() || DEFAULT_PROJECT_NAME;
  log.success(`Great, creating ${projectName}.`);
  return projectName;
}

function printIntro(projectName: string, createExpoStackArgs: string[], projectParentDir = process.cwd()): void {
  console.log('create-expo-super-stack');
  console.log();
  console.log('This uses create-expo-stack under the hood, then applies MrDJ onboarding.');
  console.log(`Delegating: create-expo-stack ${formatDisplayArgs(createExpoStackArgs)}`);
  console.log(`Target app: ${projectName}`);
  if (projectParentDir !== process.cwd()) {
    console.log(`Target folder: ${path.join(projectParentDir, projectName)}`);
  }
  console.log();
}

async function runCreateExpoStack(args: string[], overrideBin?: string, cwd = process.cwd()): Promise<void> {
  const command = await resolveCreateExpoStackCommand(overrideBin);
  console.log(`Using create-expo-stack command: ${command.display}`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command.command, [...command.args, ...args], {
      cwd,
      shell: command.shell ?? process.platform === 'win32',
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`create-expo-stack exited with code ${code ?? 'unknown'}.`));
      }
    });
  });
}

export function resolveProjectTarget(rawProjectName: string, cwd = process.cwd()): { projectName: string; parentDir: string } {
  const trimmed = rawProjectName.trim();
  const normalized = trimmed.replace(/[\\/]+$/u, '') || DEFAULT_PROJECT_NAME;
  const hasPathSyntax = path.isAbsolute(normalized) || normalized.includes('/') || normalized.includes('\\');

  if (!hasPathSyntax) {
    return {
      projectName: normalized,
      parentDir: cwd,
    };
  }

  const projectName = path.basename(normalized) || DEFAULT_PROJECT_NAME;
  const parentDir = path.resolve(cwd, path.dirname(normalized));
  return {
    projectName,
    parentDir,
  };
}

function replaceProjectArg(args: string[], projectName: string): string[] {
  const nextArgs = [...args];
  const projectArgIndex = nextArgs.findIndex((arg) => !arg.startsWith('--'));

  if (projectArgIndex >= 0) {
    nextArgs[projectArgIndex] = projectName;
    return nextArgs;
  }

  return [projectName, ...nextArgs];
}

export function validateCreateExpoStackArgs(args: string[]): void {
  const authFlags = ['--supabase', '--firebase'].filter((flag) =>
    args.some((arg) => arg === flag || arg.startsWith(`${flag}=`)),
  );

  if (authFlags.length > 1) {
    throw new Error(
      `Choose one create-expo-stack auth provider, not ${authFlags.join(
        ' and ',
      )}. create-expo-stack scaffolds a single auth slice; Super Stack can still document future data/backend plans in project/.`,
    );
  }
}

export async function runExpoProjectChecks(
  projectPath: string,
  packageManager: PackageManager,
  options: ExpoProjectCheckOptions = {}
): Promise<void> {
  console.log();
  console.log('Installing MrDJ-added dependencies, then running Expo dependency repair and doctor.');
  await runProjectCommand(projectPath, buildInstallCommand(packageManager));
  if (options.useLatestExpoSdk && (await shouldRunExpoLatestSdkCommand(projectPath))) {
    await runProjectCommand(projectPath, buildExpoLatestSdkCommand(packageManager));
  } else if (options.useLatestExpoSdk) {
    console.log(`  Expo SDK already targets SDK ${CURRENT_EXPO_SDK_MAJOR}; skipping expo@latest.`);
  }
  await runProjectCommand(projectPath, buildExpoInstallFixCommand(packageManager));
  if (await shouldInstallExpoFontPeer(projectPath)) {
    await runProjectCommand(projectPath, buildExpoFontInstallCommand(packageManager));
  }
  await runProjectCommand(projectPath, buildExpoDoctorCommand(packageManager));
}

async function runProjectCommand(projectPath: string, spec: CommandSpec): Promise<void> {
  console.log(`  ${spec.display}`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(spec.command, spec.args, {
      cwd: projectPath,
      shell: spec.shell ?? process.platform === 'win32',
      stdio: 'inherit',
      env: spec.env ? { ...process.env, ...spec.env } : process.env,
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${spec.display} exited with code ${code ?? 'unknown'}.`));
      }
    });
  });
}

async function resolveCreateExpoStackCommand(overrideBin?: string): Promise<CommandSpec> {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const executable = process.platform === 'win32' ? 'create-expo-stack.cmd' : 'create-expo-stack';
  const override = overrideBin ?? process.env.MRDJ_CREATE_EXPO_STACK_BIN ?? process.env.CREATE_EXPO_STACK_BIN;
  if (override) {
    const overridePath = path.resolve(override);
    return {
      command: process.execPath,
      args: [overridePath],
      display: `node ${overridePath}`,
      shell: false,
    };
  }

  const localForkCliRoot = path.join(packageRoot, '..', '..', '..', 'create-expo-stack', 'cli');
  const localForkBin = path.join(localForkCliRoot, 'bin', 'create-expo-stack.js');
  if (await pathExists(localForkBin)) {
    await ensureLocalCreateExpoStackBuild(localForkCliRoot);
    return {
      command: process.execPath,
      args: [localForkBin],
      display: `node ${localForkBin}`,
      shell: false,
    };
  }

  const candidates = [
    path.join(packageRoot, 'node_modules', '.bin', executable),
    path.join(packageRoot, '..', '..', 'node_modules', '.bin', executable),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return {
        command: candidate,
        args: [],
        display: candidate,
      };
    }
  }

  return {
    command: 'create-expo-stack',
    args: [],
    display: 'create-expo-stack',
  };
}

async function ensureLocalCreateExpoStackBuild(localForkCliRoot: string): Promise<void> {
  const buildEntry = path.join(localForkCliRoot, 'build', 'cli.js');
  if (await pathExists(buildEntry)) {
    return;
  }

  console.log(`Building local create-expo-stack fork: ${localForkCliRoot}`);
  if (await commandExists('bun')) {
    await runProjectCommand(localForkCliRoot, {
      command: 'bun',
      args: ['run', 'build'],
      display: 'bun run build',
    });
    return;
  }

  console.log('Bun was not found, so using npm to build the local fork.');
  if (!(await pathExists(path.join(localForkCliRoot, 'node_modules')))) {
    await runProjectCommand(localForkCliRoot, {
      command: 'npm',
      args: ['install'],
      display: 'npm install',
    });
  }
  await runProjectCommand(localForkCliRoot, {
    command: 'npx',
    args: ['tsc', '-p', '.'],
    display: 'npx tsc -p .',
  });
  await runProjectCommand(localForkCliRoot, {
    command: 'npx',
    args: ['copyfiles', '-u', '2', '-a', './src/templates/**/*', './build/templates'],
    display: 'npx copyfiles -u 2 -a "./src/templates/**/*" ./build/templates',
  });
}

async function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, ['--version'], {
      shell: process.platform === 'win32',
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

async function resolveGeneratedProjectPath(cwd: string, projectName: string): Promise<string> {
  const directPath = path.resolve(cwd, projectName);
  if (await pathExists(path.join(directPath, 'package.json'))) {
    return directPath;
  }

  const fromCesConfig = await findProjectFromCesConfig(cwd, projectName);
  if (fromCesConfig) {
    return fromCesConfig;
  }

  return directPath;
}

export async function repairExpoProjectIdentifiers(projectPath: string, projectName: string): Promise<string[]> {
  const appJsonPath = path.join(projectPath, 'app.json');
  const raw = await readOptionalText(appJsonPath);
  if (!raw) {
    return [];
  }

  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(raw) as unknown;
    parsed = isRecord(value) ? value : {};
  } catch {
    return [];
  }

  const expo = isRecord(parsed.expo) ? parsed.expo : undefined;
  if (!expo) {
    return [];
  }

  const nextSlug = toExpoSlug(readString(expo.slug) ?? projectName);
  const currentScheme = expo.scheme;
  const hasScheme = Object.prototype.hasOwnProperty.call(expo, 'scheme');
  const nextScheme = hasScheme
    ? Array.isArray(currentScheme)
      ? currentScheme.map((item) => toExpoScheme(readString(item) ?? projectName))
      : toExpoScheme(readString(currentScheme) ?? projectName)
    : undefined;

  let changed = false;
  if (expo.slug !== nextSlug) {
    expo.slug = nextSlug;
    changed = true;
  }
  if (hasScheme && JSON.stringify(currentScheme) !== JSON.stringify(nextScheme)) {
    expo.scheme = nextScheme;
    changed = true;
  }

  if (!changed) {
    return [];
  }

  await writeFile(appJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return [appJsonPath];
}

async function findProjectFromCesConfig(cwd: string, projectName: string): Promise<string | null> {
  try {
    const entries = await readdir(cwd, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const projectPath = path.join(cwd, entry.name);
      const raw = await readOptionalText(path.join(projectPath, 'cesconfig.jsonc'));
      if (!raw) {
        continue;
      }

      const parsed = parseJsonc(raw);
      if (readString(parsed.projectName) === projectName) {
        return projectPath;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function detectPackageManager(projectPath: string, args: string[]): Promise<PackageManager> {
  if (args.includes('--pnpm')) return 'pnpm';
  if (args.includes('--yarn')) return 'yarn';
  if (args.includes('--bun')) return 'bun';
  if (args.includes('--npm')) return 'npm';

  const packageJson = await readJson(path.join(projectPath, 'package.json'));
  const declared = readString(packageJson.packageManager);
  if (declared?.startsWith('pnpm@')) return 'pnpm';
  if (declared?.startsWith('yarn@')) return 'yarn';
  if (declared?.startsWith('bun@')) return 'bun';
  if (declared?.startsWith('npm@')) return 'npm';

  if (await pathExists(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await pathExists(path.join(projectPath, 'yarn.lock'))) return 'yarn';
  if (await pathExists(path.join(projectPath, 'bun.lock')) || await pathExists(path.join(projectPath, 'bun.lockb'))) {
    return 'bun';
  }

  return 'npm';
}

function shouldRunExpoProjectChecks(parsed: ParsedArgs, noInstallRequested: boolean): boolean {
  return !parsed.mrdj.skipCreate && !parsed.mrdj.skipExpoFix && !noInstallRequested;
}

function hasNoInstallFlag(args: string[]): boolean {
  return args.some((arg) => {
    const normalized = arg.trim().toLowerCase();
    return (
      normalized === '--no-install' ||
      normalized === '--noinstall' ||
      normalized === '--no-install=true' ||
      normalized === '--install=false'
    );
  });
}

export function buildInstallCommand(packageManager: PackageManager): CommandSpec {
  switch (packageManager) {
    case 'pnpm':
      return {
        command: 'pnpm',
        args: ['install', '--config.strict-dep-builds=false'],
        display: 'pnpm install --config.strict-dep-builds=false',
        env: { PNPM_CONFIG_STRICT_DEP_BUILDS: 'false' },
      };
    case 'yarn':
      return {
        command: 'yarn',
        args: ['install'],
        display: 'yarn install',
      };
    case 'bun':
      return {
        command: 'bun',
        args: ['install'],
        display: 'bun install',
      };
    case 'npm':
      return {
        command: 'npm',
        args: ['install'],
        display: 'npm install',
      };
  }
}

export function buildExpoInstallFixCommand(packageManager: PackageManager): CommandSpec {
  switch (packageManager) {
    case 'pnpm':
      return {
        command: 'pnpm',
        args: ['exec', 'expo', 'install', '--fix'],
        display: 'pnpm exec expo install --fix',
        env: { PNPM_CONFIG_STRICT_DEP_BUILDS: 'false' },
      };
    case 'yarn':
      return {
        command: 'yarn',
        args: ['expo', 'install', '--fix'],
        display: 'yarn expo install --fix',
      };
    case 'bun':
      return {
        command: 'bunx',
        args: ['expo', 'install', '--fix'],
        display: 'bunx expo install --fix',
      };
    case 'npm':
      return {
        command: 'npx',
        args: ['expo', 'install', '--fix'],
        display: 'npx expo install --fix',
      };
  }
}

export function buildExpoLatestSdkCommand(packageManager: PackageManager): CommandSpec {
  switch (packageManager) {
    case 'pnpm':
      return {
        command: 'pnpm',
        args: ['exec', 'expo', 'install', 'expo@latest'],
        display: 'pnpm exec expo install expo@latest',
        env: { PNPM_CONFIG_STRICT_DEP_BUILDS: 'false' },
      };
    case 'yarn':
      return {
        command: 'yarn',
        args: ['expo', 'install', 'expo@latest'],
        display: 'yarn expo install expo@latest',
      };
    case 'bun':
      return {
        command: 'bunx',
        args: ['expo', 'install', 'expo@latest'],
        display: 'bunx expo install expo@latest',
      };
    case 'npm':
      return {
        command: 'npx',
        args: ['expo', 'install', 'expo@latest'],
        display: 'npx expo install expo@latest',
      };
  }
}

export async function shouldRunExpoLatestSdkCommand(projectPath: string): Promise<boolean> {
  const packageJson = await readJson(path.join(projectPath, 'package.json'));
  return shouldRunExpoLatestSdkCommandFromPackageJson(packageJson);
}

export function shouldRunExpoLatestSdkCommandFromPackageJson(packageJson: Record<string, unknown>): boolean {
  const dependencies = isRecord(packageJson.dependencies) ? packageJson.dependencies : {};
  const devDependencies = isRecord(packageJson.devDependencies) ? packageJson.devDependencies : {};
  const version = readString(dependencies.expo) ?? readString(devDependencies.expo);

  if (!version || version === 'latest') {
    return !version;
  }

  const major = readSemverMajor(version);
  return major === undefined || major < CURRENT_EXPO_SDK_MAJOR;
}

function readSemverMajor(version: string): number | undefined {
  const match = version.match(/\d+/u);
  if (!match) {
    return undefined;
  }

  return Number.parseInt(match[0], 10);
}

export function buildExpoFontInstallCommand(packageManager: PackageManager): CommandSpec {
  switch (packageManager) {
    case 'pnpm':
      return {
        command: 'pnpm',
        args: ['exec', 'expo', 'install', 'expo-font'],
        display: 'pnpm exec expo install expo-font',
        env: { PNPM_CONFIG_STRICT_DEP_BUILDS: 'false' },
      };
    case 'yarn':
      return {
        command: 'yarn',
        args: ['expo', 'install', 'expo-font'],
        display: 'yarn expo install expo-font',
      };
    case 'bun':
      return {
        command: 'bunx',
        args: ['expo', 'install', 'expo-font'],
        display: 'bunx expo install expo-font',
      };
    case 'npm':
      return {
        command: 'npx',
        args: ['expo', 'install', 'expo-font'],
        display: 'npx expo install expo-font',
      };
  }
}

export function buildExpoDoctorCommand(packageManager: PackageManager): CommandSpec {
  switch (packageManager) {
    case 'pnpm':
      return {
        command: 'pnpm',
        args: ['dlx', 'expo-doctor'],
        display: 'pnpm dlx expo-doctor',
      };
    case 'yarn':
      return {
        command: 'yarn',
        args: ['dlx', 'expo-doctor'],
        display: 'yarn dlx expo-doctor',
      };
    case 'bun':
      return {
        command: 'bunx',
        args: ['expo-doctor'],
        display: 'bunx expo-doctor',
      };
    case 'npm':
      return {
        command: 'npx',
        args: ['expo-doctor'],
        display: 'npx expo-doctor',
      };
  }
}

export async function shouldInstallExpoFontPeer(projectPath: string): Promise<boolean> {
  const packageJson = await readJson(path.join(projectPath, 'package.json'));
  return shouldInstallExpoFontPeerFromPackageJson(packageJson);
}

export function shouldInstallExpoFontPeerFromPackageJson(packageJson: Record<string, unknown>): boolean {
  const dependencies = isRecord(packageJson.dependencies) ? packageJson.dependencies : {};
  const devDependencies = isRecord(packageJson.devDependencies) ? packageJson.devDependencies : {};
  const hasVectorIcons =
    typeof dependencies['@expo/vector-icons'] === 'string' || typeof devDependencies['@expo/vector-icons'] === 'string';
  const hasExpoFont = typeof dependencies['expo-font'] === 'string' || typeof devDependencies['expo-font'] === 'string';

  return hasVectorIcons && !hasExpoFont;
}

export async function detectEasSetup(projectPath: string, createExpoStackArgs: string[]): Promise<boolean | undefined> {
  if (hasFlag(createExpoStackArgs, '--eas')) {
    return true;
  }

  if (await pathExists(path.join(projectPath, 'eas.json'))) {
    return true;
  }

  const appJson = await readJson(path.join(projectPath, 'app.json'));
  if (hasExpoEasProjectId(appJson)) {
    return true;
  }

  const appConfigJson = await readJson(path.join(projectPath, 'app.config.json'));
  if (hasExpoEasProjectId(appConfigJson)) {
    return true;
  }

  return undefined;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.some((arg) => arg === flag || arg.startsWith(`${flag}=`));
}

function hasExpoEasProjectId(config: Record<string, unknown>): boolean {
  const expo = isRecord(config.expo) ? config.expo : config;
  const extra = isRecord(expo.extra) ? expo.extra : undefined;
  const eas = extra && isRecord(extra.eas) ? extra.eas : undefined;
  return typeof eas?.projectId === 'string' && eas.projectId.trim().length > 0;
}

function buildRunScriptCommand(packageManager: PackageManager, script: string): string {
  switch (packageManager) {
    case 'pnpm':
      return `pnpm ${script}`;
    case 'yarn':
      return `yarn ${script}`;
    case 'bun':
      return `bun run ${script}`;
    case 'npm':
      return `npm run ${script}`;
  }
}

function formatDisplayArgs(args: string[]): string {
  return args.map(quoteDisplayArg).join(' ');
}

function quoteDisplayArg(value: string): string {
  if (!value || /[\s"]/u.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}

function buildOnboardArgv(projectPath: string, parsed: ParsedArgs, easSelected?: boolean): OnboardArgv {
  return {
    project: projectPath,
    yes: parsed.mrdj.yes,
    force: parsed.mrdj.force,
    rich: parsed.mrdj.rich,
    guidelinesTemplate: parsed.mrdj.guidelinesTemplate,
    guidelinesTemplatePath: parsed.mrdj.guidelinesTemplatePath,
    easSelected,
    appName: parsed.mrdj.appName,
    audience: parsed.mrdj.audience,
    coreFlows: parsed.mrdj.coreFlows,
    dataNeeds: parsed.mrdj.dataNeeds,
    dataStart: parsed.mrdj.dataStart,
    deploymentTarget: parsed.mrdj.deploymentTarget,
    defaults: parsed.mrdj.defaults,
    testToMain: parsed.mrdj.testToMain,
    platforms: parsed.mrdj.platforms,
    firstPlatform: parsed.mrdj.firstPlatform,
    platformStrategy: parsed.mrdj.platformStrategy,
    webOutput: parsed.mrdj.webOutput,
    deployedServer: parsed.mrdj.deployedServer,
    createExpoComponents: parsed.mrdj.createExpoComponents,
    latestExpoSdk: parsed.mrdj.latestExpoSdk,
    expoUi: parsed.mrdj.expoUi,
    expoNativeTabs: parsed.mrdj.expoNativeTabs,
    easUses: parsed.mrdj.easUses,
  };
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
  const raw = await readOptionalText(filePath);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonc(value: string): Record<string, unknown> {
  const cleaned = value.replace(/^\s*\/\/.*$/gm, '');
  const parsed = JSON.parse(cleaned) as unknown;
  return isRecord(parsed) ? parsed : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function toExpoSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'expo-app';
}

export function toExpoScheme(value: string): string {
  const scheme = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+.-]+/g, '-')
    .replace(/^[^a-z]+/, '')
    .replace(/-+$/g, '');

  return scheme || 'expo-app';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isCliEntryPoint(argv = process.argv): boolean {
  const entry = argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(entry).href);
}

if (isCliEntryPoint()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
