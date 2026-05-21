#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { access, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { cancel, isCancel, log, text } from '@clack/prompts';
import {
  SUPER_STACK_SUCCESS_MESSAGE,
  collectOnboardPlan,
  defaultOnboardPlan,
  savePersonalOnboardDefaults,
} from '@mr.dj2u/cli/onboarding';
import { scaffoldProjectMemory } from '@mr.dj2u/cli/project-memory';

import type { OnboardArgv } from '@mr.dj2u/cli/onboarding';

export interface ParsedArgs {
  projectName?: string;
  createExpoStackArgs: string[];
  helpRequested: boolean;
  mds: {
    appName?: string;
    audience?: string;
    coreFlows?: string;
    screens?: string;
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
    appDirectory?: 'src' | 'root';
    platformLayouts?: 'shared' | 'platform-specific';
    webOutput?: 'static' | 'server' | 'spa' | 'none';
    deployedServer?: 'standard-expo' | 'custom' | 'none';
    createExpoComponents?: boolean;
    latestExpoSdk?: boolean;
    expoUi?: boolean;
    expoNativeTabs?: boolean;
    easUses?: string[];
    saveDefaults?: boolean;
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
  if (initialParsed.helpRequested) {
    console.log(renderHelpText());
    return;
  }
  const parsed = withResolvedProjectName(initialParsed, await promptForMissingProjectName(initialParsed));
  validateCreateExpoStackArgs(parsed.createExpoStackArgs);
  const projectName = parsed.projectName ?? DEFAULT_PROJECT_NAME;
  const projectParentDir = parsed.mds.projectParentDir ?? process.cwd();
  const createExpoStackArgs = prepareCreateExpoStackArgsForWrapper(parsed.createExpoStackArgs, parsed.mds.skipExpoFix);

  printIntro(projectName, createExpoStackArgs, projectParentDir);

  if (!parsed.mds.skipCreate) {
    await runCreateExpoStack(createExpoStackArgs, parsed.mds.createExpoStackBin, projectParentDir);
  } else {
    console.log('Skipping create-expo-stack because --mds-skip-create was passed.');
  }

  const projectPath = await resolveGeneratedProjectPath(projectParentDir, projectName);
  const easSelected = await detectEasSetup(projectPath, parsed.createExpoStackArgs);
  const onboardArgv = buildOnboardArgv(projectPath, parsed, easSelected);
  const plan = parsed.mds.yes
    ? defaultOnboardPlan(onboardArgv, projectPath)
    : await collectOnboardPlan(onboardArgv, projectPath);
  const movedAppDir = !parsed.mds.skipCreate && plan.answers.appDirectory === 'src'
    ? await moveRootAppIntoSrc(projectPath)
    : null;
  const movedImportRepairs = movedAppDir
    ? await repairMovedSrcAppImports(projectPath)
    : [];
  const written = await scaffoldProjectMemory(projectPath, plan.answers, {
    force: parsed.mds.force,
    guidelinesTemplate: plan.guidelinesTemplate,
    guidelinesTemplatePath: plan.guidelinesTemplatePath,
    manageUniwind: parsed.mds.skipCreate,
    richBoilerplate: plan.richBoilerplate,
  });
  const identifierRepairs = await repairExpoProjectIdentifiers(projectPath, projectName, plan.answers.targetPlatforms);

  console.log();
  console.log('MDS onboarding complete.');
  for (const result of written) {
    console.log(`${result.wrote ? 'CREATED' : 'KEPT'} ${path.relative(process.cwd(), result.filePath)}`);
  }
  if (movedAppDir) {
    console.log(`MOVED ${path.relative(process.cwd(), movedAppDir.from)} -> ${path.relative(process.cwd(), movedAppDir.to)}`);
  }
  for (const result of movedImportRepairs) {
    console.log(`UPDATED ${path.relative(process.cwd(), result)}`);
  }
  for (const result of identifierRepairs) {
    console.log(`UPDATED ${path.relative(process.cwd(), result)}`);
  }
  if (plan.saveDefaults) {
    const defaultsPath = savePersonalOnboardDefaults(plan.answers);
    if (defaultsPath) {
      console.log(`Saved personal onboarding defaults: ${defaultsPath}`);
    }
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
  console.log("1. Play with styling in the 'Stylist' page and save theme tokens.");
  console.log('2. Browse exposition pages to understand included base packages.');
  console.log('3. Review project/ files for accuracy and planning adjustments.');
  console.log('4. Tell the agent to commence development phase by phase.');
  console.log();
  console.log('Next steps:');
  console.log(`  cd ${quoteDisplayArg(path.relative(process.cwd(), projectPath) || '.')}`);
  if (noInstallRequested || parsed.mds.skipExpoFix || parsed.mds.skipCreate) {
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
  console.log('For the full dev-suite locally, use the generated scripts or install @mr.dj2u/cli in the app.');
}

export function prepareCreateExpoStackArgsForWrapper(args: string[], skipExpoFix = false): string[] {
  if (skipExpoFix || hasNoInstallFlag(args)) {
    return args;
  }

  return [...args, '--no-install'];
}

export function parseArgs(args: string[]): ParsedArgs {
  const createExpoStackArgs: string[] = [];
  const mds: ParsedArgs['mds'] = {
    force: false,
    skipExpoFix: false,
    yes: false,
    skipCreate: false,
  };
  let projectName: string | undefined;
  let helpRequested = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    if (!arg.startsWith('--') && !projectName) {
      if (arg === '-h') {
        helpRequested = true;
        continue;
      }
      projectName = arg;
      createExpoStackArgs.push(arg);
      continue;
    }

    if (arg === '--help' || arg === '-h' || arg === '--mds-help') {
      helpRequested = true;
      continue;
    }

    if (arg === '--mds-force') {
      mds.force = true;
      continue;
    }

    if (arg === '--mds-no-rich') {
      mds.rich = false;
      continue;
    }

    if (arg === '--mds-rich') {
      mds.rich = true;
      continue;
    }

    if (arg === '--mds-save-defaults') {
      mds.saveDefaults = true;
      continue;
    }

    if (arg === '--mds-no-save-defaults') {
      mds.saveDefaults = false;
      continue;
    }

    if (arg === '--mds-yes' || arg === '--mds-non-interactive') {
      mds.yes = true;
      continue;
    }

    if (arg === '--mds-skip-create') {
      mds.skipCreate = true;
      continue;
    }

    if (arg === '--mds-skip-expo-fix' || arg === '--mds-no-expo-fix') {
      mds.skipExpoFix = true;
      continue;
    }

    if (arg.startsWith('--mds-create-expo-stack-bin=')) {
      mds.createExpoStackBin = arg.slice('--mds-create-expo-stack-bin='.length);
      continue;
    }

    if (arg === '--mds-guidelines-template') {
      mds.guidelinesTemplate = true;
      continue;
    }

    if (arg.startsWith('--mds-guidelines-template=')) {
      mds.guidelinesTemplate = true;
      mds.guidelinesTemplatePath = arg.slice('--mds-guidelines-template='.length);
      continue;
    }

    if (arg.startsWith('--mds-guidelines-template-path=')) {
      mds.guidelinesTemplate = true;
      mds.guidelinesTemplatePath = arg.slice('--mds-guidelines-template-path='.length);
      continue;
    }

    if (arg.startsWith('--mds-defaults=')) {
      mds.defaults = splitList(arg.slice('--mds-defaults='.length));
      continue;
    }

    if (arg.startsWith('--mds-app-name=')) {
      mds.appName = arg.slice('--mds-app-name='.length);
      continue;
    }

    if (arg.startsWith('--mds-audience=')) {
      mds.audience = arg.slice('--mds-audience='.length);
      continue;
    }

    if (arg.startsWith('--mds-core-flows=')) {
      mds.coreFlows = arg.slice('--mds-core-flows='.length);
      continue;
    }

    if (arg.startsWith('--mds-screens=')) {
      mds.screens = arg.slice('--mds-screens='.length);
      continue;
    }

    if (arg.startsWith('--mds-data-needs=')) {
      mds.dataNeeds = arg.slice('--mds-data-needs='.length);
      continue;
    }

    if (arg.startsWith('--mds-data-start=')) {
      const value = arg.slice('--mds-data-start='.length);
      if (value === 'local' || value === 'supabase') {
        mds.dataStart = value;
      }
      continue;
    }

    if (arg.startsWith('--mds-deployment-target=')) {
      mds.deploymentTarget = arg.slice('--mds-deployment-target='.length);
      continue;
    }

    if (arg === '--mds-test-to-main') {
      mds.testToMain = true;
      continue;
    }

    if (arg === '--mds-no-test-to-main') {
      mds.testToMain = false;
      continue;
    }

    if (arg.startsWith('--mds-platforms=')) {
      mds.platforms = splitList(arg.slice('--mds-platforms='.length));
      continue;
    }

    if (arg.startsWith('--mds-first-platform=')) {
      mds.firstPlatform = arg.slice('--mds-first-platform='.length);
      continue;
    }

    if (arg.startsWith('--mds-platform-strategy=')) {
      const value = arg.slice('--mds-platform-strategy='.length);
      if (value === 'folders' || value === 'files-only') {
        mds.platformStrategy = value;
      }
      continue;
    }

    if (arg.startsWith('--mds-app-directory=')) {
      const value = arg.slice('--mds-app-directory='.length);
      if (value === 'src' || value === 'root') {
        mds.appDirectory = value;
      }
      continue;
    }

    if (arg.startsWith('--mds-platform-layouts=')) {
      const value = arg.slice('--mds-platform-layouts='.length);
      if (value === 'shared' || value === 'platform-specific') {
        mds.platformLayouts = value;
      }
      continue;
    }

    if (arg.startsWith('--mds-web-output=')) {
      const value = arg.slice('--mds-web-output='.length);
      if (value === 'static' || value === 'server' || value === 'spa' || value === 'none') {
        mds.webOutput = value;
      }
      continue;
    }

    if (arg.startsWith('--mds-deployed-server=')) {
      const value = arg.slice('--mds-deployed-server='.length);
      if (value === 'standard-expo' || value === 'custom' || value === 'none') {
        mds.deployedServer = value;
      }
      continue;
    }

    if (arg === '--mds-create-expo-components') {
      mds.createExpoComponents = true;
      continue;
    }

    if (arg === '--mds-no-create-expo-components') {
      mds.createExpoComponents = false;
      continue;
    }

    if (arg === '--mds-latest-expo-sdk') {
      mds.latestExpoSdk = true;
      continue;
    }

    if (arg === '--mds-no-latest-expo-sdk') {
      mds.latestExpoSdk = false;
      continue;
    }

    if (arg === '--mds-expo-ui') {
      mds.expoUi = true;
      continue;
    }

    if (arg === '--mds-no-expo-ui') {
      mds.expoUi = false;
      continue;
    }

    if (arg === '--mds-expo-native-tabs') {
      mds.expoNativeTabs = true;
      continue;
    }

    if (arg === '--mds-no-expo-native-tabs') {
      mds.expoNativeTabs = false;
      continue;
    }

    if (arg.startsWith('--mds-eas-uses=')) {
      mds.easUses = splitList(arg.slice('--mds-eas-uses='.length));
      continue;
    }

    createExpoStackArgs.push(arg);
  }

  return {
    projectName,
    createExpoStackArgs,
    helpRequested,
    mds,
  };
}

export function renderHelpText(): string {
  return [
    'create-expo-super-stack',
    '',
    'Usage:',
    '  create-expo-super-stack [project-name] [create-expo-stack options] [mds options]',
    '',
    'Examples:',
    '  create-expo-super-stack my-app --expo-router --uniwind',
    '  create-expo-super-stack ../MyApp --expo-router --mds-yes',
    '',
    'Common mds options:',
    '  --mds-yes                     Run non-interactive onboarding defaults',
    '  --mds-save-defaults           Save onboarding answers as personal defaults',
    '  --mds-no-save-defaults        Do not save onboarding answers as personal defaults',
    '  --mds-skip-create             Skip create-expo-stack and only run onboarding in an existing app',
    '  --mds-skip-expo-fix           Skip dependency install/fix/doctor repair pass',
    '  --mds-guidelines-template     Use bundled MDS project/guidelines template',
    '  --mds-app-name=<name>         Set display app name for project memory',
    '  --mds-screens=                List must-include screens for project memory',
    '',
    'Help:',
    '  -h, --help                     Show this help and exit',
    '',
    'Note:',
    '  Unknown non-mds flags are forwarded to create-expo-stack.',
  ].join('\n');
}

export function withResolvedProjectName(parsed: ParsedArgs, projectName: string): ParsedArgs {
  const target = resolveProjectTarget(parsed.projectName ?? projectName);
  const resolvedProjectName = target.projectName;
  const createExpoStackArgs = parsed.mds.skipCreate
    ? parsed.createExpoStackArgs
    : replaceProjectArg(parsed.createExpoStackArgs, resolvedProjectName);

  if (parsed.projectName) {
    return {
      ...parsed,
      projectName: resolvedProjectName,
      createExpoStackArgs,
      mds: {
        ...parsed.mds,
        projectParentDir: target.parentDir,
        appName: parsed.mds.appName ?? resolvedProjectName,
      },
    };
  }

  return {
    ...parsed,
    projectName: resolvedProjectName,
    createExpoStackArgs,
    mds: {
      ...parsed.mds,
      projectParentDir: target.parentDir,
      appName: parsed.mds.appName ?? resolvedProjectName,
    },
  };
}

async function promptForMissingProjectName(parsed: ParsedArgs): Promise<string> {
  if (parsed.projectName) {
    return parsed.projectName;
  }

  if (parsed.mds.yes || parsed.mds.skipCreate) {
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
  console.log('This uses create-expo-stack under the hood, then applies MDS onboarding.');
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
  console.log('Installing MDS-added dependencies, then running Expo dependency repair and doctor.');
  await runProjectCommand(projectPath, buildInstallCommand(packageManager));
  const missingWindowsOxideBinding = await resolveMissingWindowsTailwindOxideBinding(projectPath);
  if (missingWindowsOxideBinding) {
    await runProjectCommand(projectPath, buildAddDevDependencyCommand(packageManager, missingWindowsOxideBinding));
  }
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

  const scopedForkCandidates = [
    path.join(packageRoot, 'node_modules', '@mr.dj2u', 'create-expo-stack', 'bin', 'create-expo-stack.js'),
    path.join(packageRoot, '..', '..', 'node_modules', '@mr.dj2u', 'create-expo-stack', 'bin', 'create-expo-stack.js'),
  ];

  for (const candidate of scopedForkCandidates) {
    if (await pathExists(candidate)) {
      return {
        command: process.execPath,
        args: [candidate],
        display: `node ${candidate}`,
        shell: false,
      };
    }
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

async function moveRootAppIntoSrc(projectPath: string): Promise<{ from: string; to: string } | null> {
  const rootAppDir = path.join(projectPath, 'app');
  const srcAppDir = path.join(projectPath, 'src', 'app');
  if (!(await pathExists(rootAppDir)) || (await pathExists(srcAppDir))) {
    return null;
  }

  await mkdir(path.dirname(srcAppDir), { recursive: true });
  await rename(rootAppDir, srcAppDir);
  return { from: rootAppDir, to: srcAppDir };
}

export async function repairMovedSrcAppImports(projectPath: string): Promise<string[]> {
  const tabsLayoutPath = path.join(projectPath, 'src', 'app', '(tabs)', '_layout.tsx');
  const raw = await readOptionalText(tabsLayoutPath);
  if (!raw) {
    return [];
  }

  const updated = raw
    .replace('"../../components/HeaderButton"', '"../../../components/HeaderButton"')
    .replace('"../../components/TabBarIcon"', '"../../../components/TabBarIcon"');

  if (updated === raw) {
    return [];
  }

  await writeFile(tabsLayoutPath, updated, 'utf8');
  return [tabsLayoutPath];
}

export async function repairExpoProjectIdentifiers(
  projectPath: string,
  projectName: string,
  targetPlatforms: string[] = []
): Promise<string[]> {
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
  const shouldIncludeWeb = targetPlatforms.includes('web');
  const currentPlatforms = Array.isArray(expo.platforms) ? expo.platforms : [];
  if (shouldIncludeWeb && !currentPlatforms.includes('web')) {
    expo.platforms = [...currentPlatforms, 'web'];
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
  return !parsed.mds.skipCreate && !parsed.mds.skipExpoFix && !noInstallRequested;
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
        args: ['install', '--config.strict-dep-builds=false', '--ignore-workspace'],
        display: 'pnpm install --config.strict-dep-builds=false --ignore-workspace',
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
        args: ['--ignore-workspace', 'exec', 'expo', 'install', '--fix'],
        display: 'pnpm --ignore-workspace exec expo install --fix',
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
        args: ['--ignore-workspace', 'exec', 'expo', 'install', 'expo@latest'],
        display: 'pnpm --ignore-workspace exec expo install expo@latest',
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
        args: ['--ignore-workspace', 'exec', 'expo', 'install', 'expo-font'],
        display: 'pnpm --ignore-workspace exec expo install expo-font',
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
        args: ['--ignore-workspace', 'dlx', 'expo-doctor'],
        display: 'pnpm --ignore-workspace dlx expo-doctor',
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

export function buildAddDevDependencyCommand(packageManager: PackageManager, dependency: string): CommandSpec {
  switch (packageManager) {
    case 'pnpm':
      return {
        command: 'pnpm',
        args: ['--ignore-workspace', 'add', '-D', dependency],
        display: `pnpm --ignore-workspace add -D ${dependency}`,
        env: { PNPM_CONFIG_STRICT_DEP_BUILDS: 'false' },
      };
    case 'yarn':
      return {
        command: 'yarn',
        args: ['add', '--dev', dependency],
        display: `yarn add --dev ${dependency}`,
      };
    case 'bun':
      return {
        command: 'bun',
        args: ['add', '--dev', dependency],
        display: `bun add --dev ${dependency}`,
      };
    case 'npm':
      return {
        command: 'npm',
        args: ['install', '--save-dev', dependency],
        display: `npm install --save-dev ${dependency}`,
      };
  }
}

export function resolveWindowsTailwindOxidePackage({
  platform = process.platform,
  arch = process.arch,
  nodeTargetType = (process.config?.variables as unknown as Record<string, string | undefined> | undefined)?.node_target_type,
  shlibSuffix = (process.config?.variables as unknown as Record<string, string | undefined> | undefined)?.shlib_suffix,
}: {
  platform?: string;
  arch?: string;
  nodeTargetType?: string | undefined;
  shlibSuffix?: string | undefined;
} = {}): string | undefined {
  if (platform !== 'win32') {
    return undefined;
  }

  if (arch === 'x64') {
    const usesGnu = shlibSuffix === 'dll.a' || nodeTargetType === 'shared_library';
    return usesGnu ? '@tailwindcss/oxide-win32-x64-gnu' : '@tailwindcss/oxide-win32-x64-msvc';
  }

  if (arch === 'ia32') {
    return '@tailwindcss/oxide-win32-ia32-msvc';
  }

  if (arch === 'arm64') {
    return '@tailwindcss/oxide-win32-arm64-msvc';
  }

  return undefined;
}

export async function resolveMissingWindowsTailwindOxideBinding(projectPath: string): Promise<string | undefined> {
  const packageName = resolveWindowsTailwindOxidePackage();
  if (!packageName) {
    return undefined;
  }

  const packageJson = await readJson(path.join(projectPath, 'package.json'));
  const dependencies = isRecord(packageJson.dependencies) ? packageJson.dependencies : {};
  const devDependencies = isRecord(packageJson.devDependencies) ? packageJson.devDependencies : {};
  const hasUniwind = typeof dependencies.uniwind === 'string' || typeof devDependencies.uniwind === 'string';
  if (!hasUniwind) {
    return undefined;
  }

  if (await pathExists(path.join(projectPath, 'node_modules', packageName))) {
    return undefined;
  }

  const oxidePackageJsonPath = path.join(projectPath, 'node_modules', '@tailwindcss', 'oxide', 'package.json');
  const oxidePackage = await readJson(oxidePackageJsonPath);
  const oxideVersion = readString(oxidePackage.version);
  return oxideVersion ? `${packageName}@${oxideVersion}` : packageName;
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
    yes: parsed.mds.yes,
    force: parsed.mds.force,
    rich: parsed.mds.rich,
    guidelinesTemplate: parsed.mds.guidelinesTemplate,
    guidelinesTemplatePath: parsed.mds.guidelinesTemplatePath,
    easSelected,
    appName: parsed.mds.appName,
    audience: parsed.mds.audience,
    coreFlows: parsed.mds.coreFlows,
    screens: parsed.mds.screens,
    dataNeeds: parsed.mds.dataNeeds,
    dataStart: parsed.mds.dataStart,
    deploymentTarget: parsed.mds.deploymentTarget,
    defaults: parsed.mds.defaults,
    saveDefaults: parsed.mds.saveDefaults,
    testToMain: parsed.mds.testToMain,
    platforms: parsed.mds.platforms,
    firstPlatform: parsed.mds.firstPlatform,
    platformStrategy: parsed.mds.platformStrategy,
    appDirectory: parsed.mds.appDirectory ?? 'src',
    platformLayouts: parsed.mds.platformLayouts,
    webOutput: parsed.mds.webOutput,
    deployedServer: parsed.mds.deployedServer,
    createExpoComponents: parsed.mds.createExpoComponents,
    latestExpoSdk: parsed.mds.latestExpoSdk,
    expoUi: parsed.mds.expoUi,
    expoNativeTabs: parsed.mds.expoNativeTabs,
    easUses: parsed.mds.easUses,
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
