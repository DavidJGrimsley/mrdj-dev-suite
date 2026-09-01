import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  checkAppArchitecture,
  checkAnimationPerformance,
  checkApiSafety,
  checkEnvHygiene,
  checkExpoConfiguration,
  checkGitignoreEnv,
  checkRuntimeSecurity,
  checkPackageScripts,
  checkProjectDocs,
  checkRouterSafety,
  checkSeoMetadata,
  checkStylingDependencies,
  checkSupabaseEnvironment,
  checkTodoForContextMarkers,
  runExpoDoctorCheck,
  runScriptChecks,
} from './checks/index.js';
import { DEFAULT_DOCTOR_MODE, normalizeDoctorMode } from './modes.js';
import { createReport } from './reporter.js';
import type {
  DoctorCheckResult,
  DoctorOptions,
  DoctorReport,
  DoctorWorkspaceAppReport,
  DoctorWorkspaceManifest,
} from './types.js';
import { findFiles, pathExists, readPackageJson, readOptionalText } from './utils.js';
import {
  discoverDoctorWorkspace,
  normalizeWorkspaceRelativePath,
  readWorkspaceManifest,
  resolveWorkspacePath,
} from './workspace-manifest.js';

export type {
  DoctorCheckResult,
  DoctorCheckStatus,
  DoctorMode,
  DoctorModeSelection,
  DoctorOptions,
  DoctorReport,
  DoctorTargetMetadata,
  DoctorWorkspaceAppReport,
  DoctorWorkspaceManifest,
  DoctorWorkspaceMetadata,
  DoctorWorkspacePackageReport,
  PackageJson,
  ScanFileOptions,
} from './types.js';

export {
  DEFAULT_DOCTOR_MODE,
  FULL_MODE_GUIDANCE,
  createModeSelection,
  formatModeHelp,
  normalizeDoctorMode,
} from './modes.js';
export { createReport, formatHumanReport, formatJsonReport } from './reporter.js';
export { scanFile } from './scan-file.js';
export {
  discoverDoctorWorkspace,
  normalizeWorkspaceRelativePath,
  readWorkspaceManifest,
  resolveWorkspacePath,
} from './workspace-manifest.js';

export async function runDoctor(
  projectPath: string,
  options: DoctorOptions = {}
): Promise<DoctorReport> {
  const resolvedInputPath = path.resolve(projectPath);
  const target = options.target ? normalizeWorkspaceRelativePath(options.target) : undefined;
  const workspace = await discoverDoctorWorkspace(resolvedInputPath);
  const resolvedWorkspacePath = workspace?.workspacePath ?? resolvedInputPath;
  const workspaceMemoryPath = workspace?.controlPlanePath
    ? path.dirname(workspace.controlPlanePath)
    : resolvedWorkspacePath;
  if (!target && workspace) {
    return runWorkspaceDoctor(
      resolvedWorkspacePath,
      workspace.manifest,
      options,
      workspaceMemoryPath,
      workspace.controlPlanePath
    );
  }
  const manifest = workspace?.manifest ?? (await readWorkspaceManifest(resolvedWorkspacePath));
  const registeredApp = target ? manifest?.apps.find((app) => app.path === target) : undefined;
  const registeredPackage = target
    ? manifest?.sharedPackages.find((item) => item.path === target)
    : undefined;
  if (target && manifest && !registeredApp && !registeredPackage) {
    throw new Error(`Doctor target is not registered in project/workspace.json: ${target}`);
  }
  const resolvedProjectPath = target
    ? resolveWorkspacePath(resolvedWorkspacePath, target)
    : resolvedWorkspacePath;
  const targetMetadata = target
    ? {
        workspacePath: resolvedWorkspacePath,
        target,
        targetPath: resolvedProjectPath,
        ...(registeredApp
          ? {
              appId: registeredApp.id,
              packageName: registeredApp.packageName,
              kind: registeredApp.kind,
            }
          : {}),
        ...(registeredPackage
          ? {
              packageName: registeredPackage.packageName,
              kind: 'shared' as const,
            }
          : {}),
      }
    : undefined;
  return runProjectDoctor(
    resolvedProjectPath,
    options,
    targetMetadata,
    target ? resolvedWorkspacePath : undefined,
    target ? workspaceMemoryPath : undefined
  );
}

async function runProjectDoctor(
  resolvedProjectPath: string,
  options: DoctorOptions,
  targetMetadata?: {
    workspacePath: string;
    target: string;
    targetPath: string;
    appId?: string;
    packageName?: string;
    kind?: 'expo' | 'non-expo' | 'shared';
  },
  workspaceRootPath?: string,
  workspaceMemoryPath?: string,
  scriptStrategy: 'all' | 'expo-only' | 'none' = 'all'
): Promise<DoctorReport> {
  const mode = normalizeDoctorMode(options.mode);
  const runScripts = options.runScripts !== false;
  const selectionDefaultMode = options.selectionDefaultMode ?? DEFAULT_DOCTOR_MODE;
  const checks = [];

  if (!(await pathExists(resolvedProjectPath))) {
    const isFocusedTarget = Boolean(targetMetadata);
    checks.push({
      name: isFocusedTarget ? 'target package' : 'project path',
      status: 'error' as const,
      message: `${isFocusedTarget ? 'Target package' : 'Project'} path does not exist: ${resolvedProjectPath}`,
    });
    return createReport(
      resolvedProjectPath,
      mode,
      checks,
      runScripts,
      selectionDefaultMode,
      targetMetadata
    );
  }

  const packageJsonPath = path.join(resolvedProjectPath, 'package.json');
  const packageJson = await readPackageJson(packageJsonPath);
  if (workspaceMemoryPath) {
    const workspaceDocs = await checkProjectDocs(workspaceMemoryPath);
    checks.push({ ...workspaceDocs, name: 'workspace project docs' });
  }
  checks.push(await checkProjectDocs(resolvedProjectPath));
  checks.push(await checkTodoForContextMarkers(resolvedProjectPath));
  checks.push(await checkGitignoreEnv(workspaceRootPath ?? resolvedProjectPath));

  if (!packageJson) {
    checks.push({
      name: 'package.json',
      status: 'warn' as const,
      message: 'No package.json found; package scripts and dependency checks were skipped.',
    });
    return createReport(
      resolvedProjectPath,
      mode,
      checks,
      runScripts,
      selectionDefaultMode,
      targetMetadata
    );
  }

  checks.push(checkPackageScripts(packageJson, resolvedProjectPath));
  checks.push(checkStylingDependencies(packageJson));
  checks.push(await checkExpoConfiguration(packageJson, resolvedProjectPath));
  checks.push(await checkEnvHygiene(resolvedProjectPath));
  checks.push(await checkRuntimeSecurity(resolvedProjectPath));
  checks.push(await checkSupabaseEnvironment(resolvedProjectPath, packageJson));
  checks.push(await checkAppArchitecture(packageJson, resolvedProjectPath));
  checks.push(await checkRouterSafety(resolvedProjectPath));
  checks.push(await checkApiSafety(packageJson, resolvedProjectPath));
  checks.push(await checkAnimationPerformance(resolvedProjectPath));
  checks.push(await checkSeoMetadata(resolvedProjectPath));

  if (scriptStrategy === 'all') {
    checks.push(
      ...(await runScriptChecks({
        packageJson,
        projectPath: resolvedProjectPath,
        mode,
        fix: options.fix ?? false,
        runScripts,
        timeoutMs: options.timeoutMs ?? 120_000,
        reactDoctorRunner: options.reactDoctorRunner,
      }))
    );
  } else if (scriptStrategy === 'expo-only' && runScripts) {
    const expoDoctor = await runExpoDoctorCheck({
      packageJson,
      projectPath: resolvedProjectPath,
      mode,
      timeoutMs: options.timeoutMs ?? 120_000,
    });
    if (expoDoctor) checks.push(expoDoctor);
  }

  return createReport(
    resolvedProjectPath,
    mode,
    checks,
    runScripts,
    selectionDefaultMode,
    targetMetadata
  );
}

async function runWorkspaceDoctor(
  workspacePath: string,
  manifest: DoctorWorkspaceManifest,
  options: DoctorOptions,
  workspaceMemoryPath = workspacePath,
  controlPlanePath?: string
): Promise<DoctorReport> {
  const mode = normalizeDoctorMode(options.mode);
  const runScripts = options.runScripts !== false;
  const selectionDefaultMode = options.selectionDefaultMode ?? DEFAULT_DOCTOR_MODE;
  const checks: DoctorCheckResult[] = [];
  checks.push(await checkProjectDocs(workspaceMemoryPath));
  checks.push(await checkTodoForContextMarkers(workspaceMemoryPath));
  checks.push(await checkGitignoreEnv(workspacePath));
  checks.push(...(await checkWorkspaceStructure(workspacePath, manifest)));

  const packageJson = await readPackageJson(path.join(workspacePath, 'package.json'));
  if (packageJson) {
    checks.push(checkPackageScripts(packageJson, workspacePath));
    checks.push(
      ...(await runScriptChecks({
        packageJson,
        projectPath: workspacePath,
        mode,
        fix: options.fix ?? false,
        runScripts,
        timeoutMs: options.timeoutMs ?? 120_000,
      }))
    );
  } else {
    checks.push({
      name: 'workspace package.json',
      status: 'error',
      message: 'Workspace package.json is missing.',
    });
  }

  const apps: DoctorWorkspaceAppReport[] = [];
  for (const app of manifest.apps) {
    const appPath = resolveWorkspacePath(workspacePath, app.path);
    if (app.kind === 'non-expo' && !(await pathExists(path.join(appPath, 'package.json')))) {
      apps.push({
        id: app.id,
        displayName: app.displayName,
        path: app.path,
        kind: app.kind,
        status: 'registered',
      });
      checks.push({
        name: `registered app ${app.id}`,
        status: 'skip',
        message: `${app.path} is registered for later implementation; no framework checks were run.`,
      });
      continue;
    }
    const report = await runProjectDoctor(
      appPath,
      options,
      undefined,
      workspacePath,
      workspaceMemoryPath,
      app.kind === 'expo' ? 'expo-only' : 'none'
    );
    const status =
      report.summary.errors > 0 ? 'error' : report.summary.warnings > 0 ? 'warn' : 'pass';
    apps.push({
      id: app.id,
      displayName: app.displayName,
      path: app.path,
      kind: app.kind,
      status,
      report,
    });
  }

  return createReport(
    workspacePath,
    mode,
    checks,
    runScripts,
    selectionDefaultMode,
    undefined,
    {
      name: manifest.name,
      displayName: manifest.displayName,
      packageManager: manifest.packageManager,
      taskRunner: manifest.taskRunner,
      ...(controlPlanePath ? { controlPlanePath } : {}),
      apps,
      sharedPackages: manifest.sharedPackages,
    },
    apps.flatMap((app) => (app.report ? [app.report] : []))
  );
}

async function checkWorkspaceStructure(
  workspacePath: string,
  manifest: DoctorWorkspaceManifest
): Promise<DoctorCheckResult[]> {
  const checks: DoctorCheckResult[] = [];
  const duplicateValues = (values: string[]): string[] =>
    values.filter((value, index) => values.indexOf(value) !== index);
  const duplicateIds = duplicateValues(manifest.apps.map((app) => app.id));
  const duplicatePaths = duplicateValues([
    ...manifest.apps.map((app) => app.path),
    ...manifest.sharedPackages.map((item) => item.path),
  ]);
  const duplicatePackageNames = duplicateValues(
    [
      ...manifest.apps.map((app) => app.packageName),
      ...manifest.sharedPackages.map((item) => item.packageName),
    ].filter((value): value is string => Boolean(value))
  );
  const ports = manifest.apps.filter((app) => app.kind === 'expo').map((app) => app.port);
  const duplicatePorts = ports.filter(
    (port, index) => port !== undefined && ports.indexOf(port) !== index
  );
  const registryProblems = [
    ...duplicateIds.map((value) => `duplicate id ${value}`),
    ...duplicatePaths.map((value) => `duplicate path ${value}`),
    ...duplicatePackageNames.map((value) => `duplicate package ${value}`),
    ...duplicatePorts.map((value) => `duplicate port ${value}`),
  ];
  checks.push({
    name: 'workspace app registry',
    status: registryProblems.length > 0 ? 'error' : 'pass',
    message:
      registryProblems.length > 0
        ? 'Workspace app and package identities must be unique.'
        : 'Registered app paths, package names, and ports are unique.',
    ...(registryProblems.length > 0 ? { details: { registryProblems } } : {}),
  });
  const missingPaths: string[] = [];
  for (const entry of [...manifest.apps, ...manifest.sharedPackages]) {
    if (!(await pathExists(resolveWorkspacePath(workspacePath, entry.path))))
      missingPaths.push(entry.path);
  }
  checks.push({
    name: 'workspace paths',
    status: missingPaths.length > 0 ? 'error' : 'pass',
    message:
      missingPaths.length > 0
        ? 'One or more registered workspace paths are missing.'
        : 'All registered workspace paths exist.',
    ...(missingPaths.length > 0 ? { details: { missingPaths } } : {}),
  });
  const requiredRootFiles = ['turbo.json', 'tsconfig.base.json'];
  if (manifest.packageManager === 'pnpm') requiredRootFiles.push('pnpm-workspace.yaml');
  const lockfile = {
    pnpm: 'pnpm-lock.yaml',
    npm: 'package-lock.json',
    yarn: 'yarn.lock',
    bun: 'bun.lock',
  }[manifest.packageManager];
  requiredRootFiles.push(lockfile);
  const missingRootFiles: string[] = [];
  for (const file of requiredRootFiles) {
    if (!(await pathExists(path.join(workspacePath, file)))) missingRootFiles.push(file);
  }
  checks.push({
    name: 'workspace configuration',
    status: missingRootFiles.length > 0 ? 'error' : 'pass',
    message:
      missingRootFiles.length > 0
        ? 'Workspace configuration is incomplete.'
        : 'Turbo and workspace configuration are present.',
    ...(missingRootFiles.length > 0 ? { details: { missingRootFiles } } : {}),
  });

  const rootPackage = await readJsonObject(path.join(workspacePath, 'package.json'));
  const rootScripts = isRecord(rootPackage?.scripts) ? rootPackage.scripts : {};
  const requiredScripts = ['dev', 'build', 'lint', 'test', 'typecheck', 'clean'];
  const missingScripts = requiredScripts.filter(
    (script) => typeof rootScripts[script] !== 'string'
  );
  const declaredManager =
    typeof rootPackage?.packageManager === 'string' ? rootPackage.packageManager : '';
  const configuredWorkspaces = Array.isArray(rootPackage?.workspaces)
    ? rootPackage.workspaces.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const pnpmWorkspace =
    manifest.packageManager === 'pnpm'
      ? ((await readOptionalText(path.join(workspacePath, 'pnpm-workspace.yaml'))) ?? '')
      : '';
  const hasConfiguredWorkspaceGlobs =
    manifest.packageManager === 'pnpm'
      ? ['apps/*', 'packages/*'].every((pattern) => pnpmWorkspace.includes(pattern))
      : configuredWorkspaces.includes('apps/*') && configuredWorkspaces.includes('packages/*');
  const configurationProblems = [
    ...(declaredManager.startsWith(`${manifest.packageManager}@`)
      ? []
      : [`packageManager does not declare ${manifest.packageManager}`]),
    ...(!hasConfiguredWorkspaceGlobs
      ? ['workspace configuration does not include apps/* and packages/*']
      : []),
    ...missingScripts.map((script) => `missing root script ${script}`),
  ];
  checks.push({
    name: 'workspace package manager and scripts',
    status: configurationProblems.length > 0 ? 'error' : 'pass',
    message:
      configurationProblems.length > 0
        ? 'Root package-manager or script configuration does not match the workspace manifest.'
        : 'Root package manager, workspace globs, and scripts match the workspace manifest.',
    ...(configurationProblems.length > 0 ? { details: { configurationProblems } } : {}),
  });

  const turbo = await readJsonObject(path.join(workspacePath, 'turbo.json'));
  const turboTasks = isRecord(turbo?.tasks) ? turbo.tasks : {};
  const missingTurboTasks = requiredScripts.filter((task) => !isRecord(turboTasks[task]));
  checks.push({
    name: 'Turbo task graph',
    status: missingTurboTasks.length > 0 ? 'error' : 'pass',
    message:
      missingTurboTasks.length > 0
        ? 'Turbo is missing one or more required workspace tasks.'
        : 'Turbo defines every required root task.',
    ...(missingTurboTasks.length > 0 ? { details: { missingTurboTasks } } : {}),
  });

  const dependencyProblems: string[] = [];
  for (const sharedPackage of manifest.sharedPackages) {
    const packageJson = await readJsonObject(
      path.join(workspacePath, sharedPackage.path, 'package.json')
    );
    if (packageJson?.name !== sharedPackage.packageName) {
      dependencyProblems.push(
        `${sharedPackage.path} package name does not match ${sharedPackage.packageName}`
      );
    }
    if (!isRecord(packageJson?.exports)) {
      dependencyProblems.push(`${sharedPackage.path} does not define package exports`);
    } else {
      for (const [exportName, exportTarget] of Object.entries(packageJson.exports)) {
        if (
          typeof exportTarget === 'string' &&
          exportTarget.startsWith('./') &&
          !(await pathExists(path.join(workspacePath, sharedPackage.path, exportTarget)))
        ) {
          dependencyProblems.push(
            `${sharedPackage.path} export ${exportName} points to missing ${exportTarget}`
          );
        }
      }
    }
  }
  for (const app of manifest.apps.filter((entry) => entry.kind === 'expo')) {
    const packageJson = await readJsonObject(path.join(workspacePath, app.path, 'package.json'));
    if (packageJson?.name !== app.packageName) {
      dependencyProblems.push(`${app.path} package name does not match ${app.packageName}`);
    }
    const dependencies = isRecord(packageJson?.dependencies) ? packageJson.dependencies : {};
    for (const requiredPackage of [
      `${manifest.packageScope}/config`,
      `${manifest.packageScope}/ui`,
    ]) {
      if (dependencies[requiredPackage] !== 'workspace:*') {
        dependencyProblems.push(
          `${app.path} does not depend on ${requiredPackage} with workspace:*`
        );
      }
    }
    for (const otherApp of manifest.apps) {
      if (otherApp.id !== app.id && otherApp.packageName && dependencies[otherApp.packageName]) {
        dependencyProblems.push(
          `${app.path} depends directly on app package ${otherApp.packageName}`
        );
      }
    }
  }
  dependencyProblems.push(...(await findWorkspaceImportProblems(workspacePath, manifest)));
  checks.push({
    name: 'internal workspace dependencies',
    status: dependencyProblems.length > 0 ? 'error' : 'pass',
    message:
      dependencyProblems.length > 0
        ? 'Internal package names, exports, or workspace dependencies are inconsistent.'
        : 'Internal package names, exports, and workspace dependencies are consistent.',
    ...(dependencyProblems.length > 0 ? { details: { dependencyProblems } } : {}),
  });

  const nestedRepositoryProblems: string[] = [];
  for (const app of manifest.apps) {
    const appPath = resolveWorkspacePath(workspacePath, app.path);
    for (const item of [
      '.git',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'bun.lock',
      'bun.lockb',
    ]) {
      if (await pathExists(path.join(appPath, item))) {
        nestedRepositoryProblems.push(`${app.path}/${item}`);
      }
    }
  }
  checks.push({
    name: 'workspace repository ownership',
    status: nestedRepositoryProblems.length > 0 ? 'error' : 'pass',
    message:
      nestedRepositoryProblems.length > 0
        ? 'Apps contain nested repositories or lockfiles.'
        : 'The workspace owns one dependency tree and app folders contain no nested repositories or lockfiles.',
    ...(nestedRepositoryProblems.length > 0 ? { details: { nestedRepositoryProblems } } : {}),
  });
  return checks;
}

async function findWorkspaceImportProblems(
  workspacePath: string,
  manifest: DoctorWorkspaceManifest
): Promise<string[]> {
  const problems: string[] = [];
  const knownApps = new Map(
    manifest.apps
      .filter((app): app is typeof app & { packageName: string } => Boolean(app.packageName))
      .map((app) => [app.packageName, app])
  );
  const knownSharedPackages = new Set(manifest.sharedPackages.map((item) => item.packageName));

  for (const app of manifest.apps) {
    const appPath = resolveWorkspacePath(workspacePath, app.path);
    const packageJson = await readPackageJson(path.join(appPath, 'package.json'));
    if (!packageJson) continue;
    const dependencies = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
    };
    const sourceFiles = await findFiles(appPath, (filePath) =>
      ['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(filePath))
    );
    for (const sourceFile of sourceFiles) {
      const source = await readOptionalText(sourceFile);
      if (!source) continue;
      for (const specifier of extractModuleSpecifiers(source)) {
        const targetApp = knownApps.get(specifier);
        if (targetApp && targetApp.id !== app.id) {
          problems.push(
            `${app.path} imports app package ${specifier} from ${path.relative(appPath, sourceFile)}`
          );
        }
        if (knownSharedPackages.has(specifier) && dependencies[specifier] !== 'workspace:*') {
          problems.push(`${app.path} imports ${specifier} without a workspace:* dependency`);
        }
        if (specifier.startsWith('.')) {
          const resolvedImport = path.resolve(path.dirname(sourceFile), specifier);
          for (const targetApp of manifest.apps) {
            if (
              targetApp.id !== app.id &&
              isWithinPath(resolveWorkspacePath(workspacePath, targetApp.path), resolvedImport)
            ) {
              problems.push(
                `${app.path} reaches into ${targetApp.path} with a relative import from ${path.relative(appPath, sourceFile)}`
              );
            }
          }
        }
      }
    }
  }
  return [...new Set(problems)];
}

function extractModuleSpecifiers(source: string): string[] {
  const specifiers = new Set<string>();
  const pattern = /(?:from\s*|import\s*)['"]([^'"]+)['"]/gu;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) specifiers.add(match[1]);
  }
  return [...specifiers];
}

function isWithinPath(parentPath: string, candidatePath: string): boolean {
  const relation = path.relative(parentPath, candidatePath);
  return (
    relation === '' ||
    (!relation.startsWith(`..${path.sep}`) && relation !== '..' && !path.isAbsolute(relation))
  );
}

async function readJsonObject(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    return isRecord(value) ? value : null;
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') return null;
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function fixDoctor(
  projectPath: string,
  options: Omit<DoctorOptions, 'fix'> = {}
): Promise<DoctorReport> {
  return runDoctor(projectPath, { ...options, fix: true });
}
