import { createHash } from 'node:crypto';
import {
  access,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import {
  getLibraryItem,
  readLibraryAsset,
  resolveLibraryItem,
} from '@mr.dj2u/library-registry';
import {
  buildAddCommand,
  buildExpoInstallCommand,
  detectPackageManager,
  runProjectCommand,
  shouldInstallProjectDependencies,
  validateInstalledPackages,
} from './package-install.js';

import type { PackageManager } from './package-install.js';

import type {
  LibraryAsset,
  LibraryDependency,
  LibraryNavigation,
  LibraryNavigationLayout as RegistryLibraryNavigationLayout,
  LibraryPlatform,
  LibraryProjectContext,
  LibraryResolutionIssue,
  LibraryResolvedAsset,
  LibraryResolvedItem,
  LibraryStyling,
} from '@mr.dj2u/library-registry';

export type LibraryPackageManager = PackageManager;

export type LibraryNavigationLayout = RegistryLibraryNavigationLayout;

export interface LibraryProjectInspection extends LibraryProjectContext {
  projectPath: string;
  packageManager: LibraryPackageManager;
  projectName?: string;
  projectAudience?: string;
  navigationLayout: LibraryNavigationLayout;
  dependencies: Record<string, string>;
  runtimeDependencies: Record<string, string>;
  developmentDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  files: string[];
  componentsDirectory: string;
  featuresDirectory: string;
}

export type LibraryPlannedFileAction = 'create' | 'skip-identical' | 'conflict';

export interface LibraryPlannedFile {
  itemId: string;
  variantId?: string;
  source: string;
  destination: string;
  absolutePath: string;
  encoding: 'utf8' | 'binary';
  role?: 'source' | 'route' | 'support' | 'static';
  action: LibraryPlannedFileAction;
  contentHash: string;
  existingHash?: string;
}

export type LibraryPlannedDependencyAction = 'install' | 'satisfied' | 'conflict';

export interface LibraryPlannedDependency extends LibraryDependency {
  action: LibraryPlannedDependencyAction;
  currentVersion?: string;
}

export type LibraryAddConflictCode =
  | 'not-expo-project'
  | 'incompatible-item'
  | 'unsafe-destination'
  | 'file-conflict'
  | 'integration-conflict'
  | 'dependency-version-conflict'
  | 'missing-content-token'
  | 'unsupported-content-token';

export interface LibraryAddConflict {
  code: LibraryAddConflictCode;
  message: string;
  itemId?: string;
  path?: string;
  dependency?: string;
}

export interface LibraryDependencyCommand {
  command: string;
  args: string[];
  display: string;
  installer: 'expo' | 'package-manager';
  kind: 'runtime' | 'development';
  dependencies: string[];
}

export interface LibraryAddPlanOptions {
  variant?: string;
}

export interface LibraryAddPlan {
  planHash: string;
  projectPath: string;
  id: string;
  variant?: string;
  compatible: boolean;
  canApply: boolean;
  context: LibraryProjectInspection;
  items: LibraryResolvedItem[];
  files: LibraryPlannedFile[];
  dependencies: LibraryPlannedDependency[];
  commands: LibraryDependencyCommand[];
  integration: string[];
  placementGuidance: string[];
  issues: LibraryResolutionIssue[];
  conflicts: LibraryAddConflict[];
}

export interface LibraryCommandRunnerOptions {
  cwd: string;
}

export type LibraryCommandRunner = (
  command: string,
  args: readonly string[],
  options: LibraryCommandRunnerOptions
) => Promise<void>;

export interface ApplyLibraryAddOptions extends LibraryAddPlanOptions {
  confirmed: boolean;
  /** The unchanged hash returned by planLibraryAdd. */
  planHash?: string;
  /** Backwards-compatible alias for callers that use a more explicit name. */
  expectedPlanHash?: string;
  dryRun?: boolean;
  installDependencies?: boolean;
  runner?: LibraryCommandRunner;
}

export interface LibraryAddResult {
  projectPath: string;
  id: string;
  variant?: string;
  planHash: string;
  applied: boolean;
  dryRun: boolean;
  writtenFiles: string[];
  repairedFiles: string[];
  skippedFiles: string[];
  executedCommands: string[];
  pendingCommands: string[];
  dependenciesInstalled: boolean;
  plan: LibraryAddPlan;
}

interface PackageJsonSubset {
  name?: unknown;
  packageManager?: unknown;
  dependencies?: unknown;
  devDependencies?: unknown;
  optionalDependencies?: unknown;
  peerDependencies?: unknown;
  expo?: unknown;
}

interface AppConfigSubset {
  expo?: {
    name?: unknown;
    platforms?: unknown;
    ios?: unknown;
    android?: unknown;
    web?: unknown;
  };
}

interface RenderedAsset {
  content: Buffer;
  conflict?: LibraryAddConflict;
}

const IGNORED_SCAN_DIRECTORIES = new Set([
  '.agents',
  '.cache',
  '.changeset',
  '.claude',
  '.expo',
  '.git',
  '.pnpm-store',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);

const CONTENT_TOKEN_VALUES = {
  __MDS_APP_NAME__: (context: LibraryProjectInspection) => context.projectName,
  __MDS_APP_AUDIENCE__: (context: LibraryProjectInspection) => context.projectAudience,
} satisfies Record<string, (context: LibraryProjectInspection) => string | undefined>;

export async function inspectLibraryProject(projectPath = '.'): Promise<LibraryProjectInspection> {
  const resolvedProjectPath = path.resolve(projectPath);
  const packageJson = await readRequiredPackageJson(resolvedProjectPath);
  const files = await collectProjectFiles(resolvedProjectPath);
  const fileSet = new Set(files);
  const runtimeDependencies = readDependencyRecord(packageJson.dependencies);
  const developmentDependencies = readDependencyRecord(packageJson.devDependencies);
  const optionalDependencies = readDependencyRecord(packageJson.optionalDependencies);
  const peerDependencies = readDependencyRecord(packageJson.peerDependencies);
  const dependencies = {
    ...peerDependencies,
    ...optionalDependencies,
    ...developmentDependencies,
    ...runtimeDependencies,
  };
  const appConfig = await readAppConfig(resolvedProjectPath, packageJson);
  const appDirectory = await detectAppDirectory(resolvedProjectPath, dependencies);
  const componentsDirectory = await detectSourceDirectory(
    resolvedProjectPath,
    appDirectory,
    'components'
  );
  const featuresDirectory = await detectSourceDirectory(
    resolvedProjectPath,
    appDirectory,
    'features'
  );
  const navigation = detectNavigation(dependencies, appDirectory, fileSet);
  const projectInfo = await readProjectInfo(resolvedProjectPath);

  return {
    projectPath: resolvedProjectPath,
    packageManager: await detectPackageManager(resolvedProjectPath, {
      packageManager: packageJson.packageManager,
    }),
    projectName:
      projectInfo.name ??
      readString(appConfig?.expo?.name) ??
      normalizePackageName(readString(packageJson.name)),
    projectAudience: projectInfo.audience,
    expoSdk: dependencies.expo,
    appDirectory,
    componentsDirectory,
    featuresDirectory,
    navigation,
    navigationLayout: await detectNavigationLayout(
      resolvedProjectPath,
      appDirectory,
      navigation,
      files
    ),
    styling: detectStyling(dependencies, files),
    platforms: detectPlatforms(appConfig, dependencies),
    aliases: await readTypeScriptAliases(resolvedProjectPath),
    dependencies,
    runtimeDependencies,
    developmentDependencies,
    optionalDependencies,
    peerDependencies,
    files,
  };
}

export async function planLibraryAdd(
  projectPath: string,
  id: string,
  options: LibraryAddPlanOptions = {}
): Promise<LibraryAddPlan> {
  const item = getLibraryItem(id);
  if (!item) {
    throw new Error(`Unknown library item: ${id}`);
  }

  const context = await inspectLibraryProject(projectPath);
  const resolution = resolveLibraryItem(id, context, { variant: options.variant });
  const conflicts: LibraryAddConflict[] = [];

  if (!context.dependencies.expo) {
    conflicts.push({
      code: 'not-expo-project',
      message: 'The target package does not declare Expo as a dependency.',
      itemId: id,
    });
  }

  for (const issue of resolution.issues) {
    if (!isBlockingResolutionIssue(issue)) {
      continue;
    }
    if (
      issue.code === 'dependency-version-conflict' &&
      issue.dependency &&
      context.dependencies[issue.dependency]
    ) {
      // planDependencies reports the project declaration conflict with a stable,
      // actionable shape. Preserve resolver-only composition conflicts here.
      continue;
    }
    conflicts.push({
      code: conflictCodeForResolutionIssue(issue),
      message: issue.message,
      itemId: issue.itemId,
      path: issue.path,
      dependency: issue.dependency,
    });
  }

  const files = await planFiles(context, resolution.assets, conflicts);
  const dependencies = planDependencies(context, resolution.dependencies, conflicts);
  const commands = buildDependencyCommands(
    context.packageManager,
    dependencies.filter((dependency) => dependency.action === 'install')
  );
  const placementGuidance = buildPlacementGuidance(id, item.kind, files, context);
  const uniqueConflicts = deduplicateConflicts(conflicts);
  const compatible = resolution.compatible && !uniqueConflicts.some(isCompatibilityConflict);
  const hashInput = {
    projectPath: normalizeAbsolutePath(context.projectPath),
    id,
    variant: options.variant ?? null,
    compatible,
    items: resolution.items,
    files: files.map(({ absolutePath: _absolutePath, ...file }) => file),
    dependencies,
    commands,
    integration: resolution.integration,
    placementGuidance,
    issues: resolution.issues,
    conflicts: uniqueConflicts,
    context: hashableProjectContext(context),
  };
  const planHash = sha256(Buffer.from(stableStringify(hashInput), 'utf8'));

  return {
    planHash,
    projectPath: context.projectPath,
    id,
    variant: resolution.variant?.id,
    compatible,
    canApply: uniqueConflicts.length === 0,
    context,
    items: resolution.items,
    files,
    dependencies,
    commands,
    integration: resolution.integration,
    placementGuidance,
    issues: resolution.issues,
    conflicts: uniqueConflicts,
  };
}

export async function applyLibraryAdd(
  projectPath: string,
  id: string,
  options: ApplyLibraryAddOptions
): Promise<LibraryAddResult> {
  if (!options.confirmed) {
    throw new Error('Library add requires explicit confirmation. Pass confirmed: true.');
  }

  const expectedPlanHash = options.planHash ?? options.expectedPlanHash;
  if (!expectedPlanHash) {
    throw new Error('Library add requires the planHash returned by planLibraryAdd.');
  }

  const plan = await planLibraryAdd(projectPath, id, { variant: options.variant });
  if (plan.planHash !== expectedPlanHash) {
    throw new Error(
      'Library add plan is stale. Run planLibraryAdd again and confirm the new planHash.'
    );
  }
  if (!plan.canApply) {
    throw new Error(formatBlockedPlanError(plan));
  }

  const skippedFiles = plan.files
    .filter((file) => file.action === 'skip-identical')
    .map((file) => file.destination);
  if (options.dryRun) {
    return {
      projectPath: plan.projectPath,
      id,
      variant: plan.variant,
      planHash: plan.planHash,
      applied: false,
      dryRun: true,
      writtenFiles: [],
      repairedFiles: [],
      skippedFiles,
      executedCommands: [],
      pendingCommands: plan.commands.map((command) => command.display),
      dependenciesInstalled: false,
      plan,
    };
  }

  const createFiles = plan.files.filter((file) => file.action === 'create');
  const assetByDestination = await resolveAssetsByDestination(plan, options.variant);
  const stagedFiles: Array<{ file: LibraryPlannedFile; content: Buffer }> = [];
  for (const file of createFiles) {
    const asset = assetByDestination.get(file.destination);
    if (!asset) {
      throw new Error(`Library asset disappeared while applying: ${file.source}`);
    }
    const rawContent = await readLibraryAsset(asset);
    const rendered = renderAssetContent(asset, rawContent, plan.context);
    if (
      rendered.conflict ||
      hashPlannedFileContent(rendered.content, asset.encoding) !== file.contentHash
    ) {
      throw new Error(
        'Library add plan is stale because bundled asset content changed. Plan the add again.'
      );
    }
    stagedFiles.push({ file, content: rendered.content });
  }

  // Revalidate every destination immediately before the first write. This prevents a
  // changed file from being overwritten between planning and application.
  const revalidated = await planLibraryAdd(projectPath, id, { variant: options.variant });
  if (revalidated.planHash !== expectedPlanHash || !revalidated.canApply) {
    throw new Error('Library add plan changed during preflight. No files were written.');
  }

  const writtenFiles: string[] = [];
  try {
    for (const staged of stagedFiles) {
      await mkdir(path.dirname(staged.file.absolutePath), { recursive: true });
      await writeFile(staged.file.absolutePath, staged.content, { flag: 'wx' });
      writtenFiles.push(staged.file.destination);
    }
  } catch (error) {
    await rollbackCreatedFiles(plan.projectPath, writtenFiles);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Library add could not complete safely; created files were rolled back: ${message}`);
  }

  const shouldInstallDependencies = shouldInstallProjectDependencies(options.installDependencies);
  const executedCommands: string[] = [];
  if (shouldInstallDependencies) {
    for (const command of plan.commands) {
      await runProjectCommand(command, {
        cwd: plan.projectPath,
        runner: options.runner,
      });
      executedCommands.push(command.display);
    }
    const installedNames = plan.dependencies
      .filter((dependency) => dependency.action === 'install')
      .map((dependency) => dependency.name);
    if (installedNames.length > 0) {
      await validateInstalledPackages(plan.projectPath, installedNames);
    }
  }

  const repairedFiles = await runPostLibraryAddRepairs(plan);

  return {
    projectPath: plan.projectPath,
    id,
    variant: plan.variant,
    planHash: plan.planHash,
    applied: true,
    dryRun: false,
    writtenFiles,
    repairedFiles,
    skippedFiles,
    executedCommands,
    pendingCommands: shouldInstallDependencies
      ? []
      : plan.commands.map((command) => command.display),
    dependenciesInstalled: shouldInstallDependencies && plan.commands.length > 0,
    plan,
  };
}

async function runPostLibraryAddRepairs(plan: LibraryAddPlan): Promise<string[]> {
  const repairedFiles: string[] = [];
  if (plan.id === 'mds/auth' || plan.id === 'mds/onboarding-auth-supabase') {
    const layoutPath = path.join(
      plan.projectPath,
      plan.context.appDirectory === 'src/app' ? 'src/app/_layout.tsx' : 'app/_layout.tsx'
    );
    const repaired = await wireAuthIntoMdsRootLayout(layoutPath, plan.context);
    if (repaired) {
      repairedFiles.push(path.relative(plan.projectPath, layoutPath).replace(/\\/g, '/'));
    }
  }

  if (plan.id === 'mds/onboarding-auth-supabase') {
    const persistenceRepaired = await writeSupabaseOnboardingAdapter(plan);
    if (persistenceRepaired) {
      repairedFiles.push(persistenceRepaired);
    }
  }

  return repairedFiles;
}

async function writeSupabaseOnboardingAdapter(
  plan: LibraryAddPlan
): Promise<string | undefined> {
  const usesZustand = Boolean(plan.context.dependencies?.zustand);
  const resolutions = [
    resolveLibraryItem('mds/onboarding-state', plan.context, {
      variant: usesZustand ? 'zustand-supabase' : 'supabase',
    }),
    resolveLibraryItem('mds/auth', plan.context, { variant: 'with-supabase' }),
  ];
  const overwriteSuffixes = [
    'onboarding-state/onboarding-state-adapter.ts',
    'auth/auth-adapter.tsx',
  ];
  let wroteAdapter: string | undefined;

  for (const resolution of resolutions) {
    for (const asset of resolution.assets) {
      if (asset.encoding !== 'utf8') {
        continue;
      }
      const destination = path.join(plan.projectPath, ...asset.destination.split('/'));
      const shouldOverwrite = overwriteSuffixes.some((suffix) =>
        asset.destination.endsWith(suffix)
      );
      try {
        await access(destination);
        if (!shouldOverwrite) {
          continue;
        }
      } catch {
        // File is missing and should be created.
      }
      const contents = (await readLibraryAsset(asset)).toString('utf8');
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, contents, 'utf8');
      if (asset.destination.endsWith('onboarding-state/onboarding-state-adapter.ts')) {
        wroteAdapter = asset.destination;
      }
    }
  }

  return wroteAdapter;
}

async function wireAuthIntoMdsRootLayout(
  layoutPath: string,
  context: LibraryProjectInspection
): Promise<boolean> {
  let source: string;
  try {
    source = await readFile(layoutPath, 'utf8');
  } catch {
    return false;
  }
  if (source.includes('AuthProvider')) {
    return false;
  }
  if (!source.includes('function LayoutInner()') || !source.includes('<AppThemeProvider>')) {
    return false;
  }

  const layoutDir = path.dirname(layoutPath);
  const authProviderPath = path.join(context.projectPath, context.featuresDirectory, 'auth', 'auth-provider');
  let authImport = path.relative(layoutDir, authProviderPath).replace(/\\/g, '/');
  if (!authImport.startsWith('.')) {
    authImport = `./${authImport}`;
  }

  let next = source.replace(
    /(import \{ AppThemeProvider, useAppTheme \} from ['"][^'"]+['"];)/u,
    `$1\nimport { AuthProvider, useAuth } from '${authImport}';`
  );
  if (next === source) {
    return false;
  }
  next = next.replace(
    /(function LayoutInner\(\) \{\r?\n\s+const theme = useAppTheme\(\);\r?\n)/u,
    `$1  const auth = useAuth();\n\n  if (auth.isLoading) {\n    return null;\n  }\n`
  );
  next = wrapMdsStackScreensForAuth(next);
  next = next.replace(
    /(<AppThemeProvider>\r?\n)(\s+<LayoutInner \/>\r?\n)(\s+<\/AppThemeProvider>)/u,
    `$1      <AuthProvider>\n        <LayoutInner />\n      </AuthProvider>\n$3`
  );

  if (next === source || next.includes('const auth = useAuth();') === false) {
    return false;
  }
  await writeFile(layoutPath, next, 'utf8');
  return true;
}

function wrapMdsStackScreensForAuth(source: string): string {
  const stackOpenIndex = source.indexOf('            <Stack');
  if (stackOpenIndex < 0) {
    return source;
  }
  const stackOpenEnd = source.indexOf('              }}>') + '              }}>'.length + 1;
  if (stackOpenEnd <= stackOpenIndex) {
    return source;
  }
  const stackCloseIndex = source.indexOf('            </Stack>', stackOpenEnd);
  if (stackCloseIndex < 0) {
    return source;
  }

  const before = source.slice(0, stackOpenEnd);
  const inner = source.slice(stackOpenEnd, stackCloseIndex);
  const after = source.slice(stackCloseIndex);
  if (inner.includes('<Stack.Protected') || inner.includes('(auth)/sign-in')) {
    return source;
  }

  const publicAuthScreens = [
    '              <Stack.Protected guard={!auth.isAuthenticated}>',
    '                <Stack.Screen name="(auth)/sign-in" options={{ title: \'Sign In\' }} />',
    '                <Stack.Screen name="(auth)/sign-up" options={{ title: \'Sign Up\' }} />',
    '                <Stack.Screen name="(auth)/reset-password" options={{ title: \'Reset Password\' }} />',
    '              </Stack.Protected>',
  ];

  const publicScreens: string[] = [];
  const protectedScreens: string[] = [];
  for (const line of inner.split(/\r?\n/u)) {
    if (!line.trim()) {
      continue;
    }
    if (isPublicAuthAddScreen(line)) {
      publicScreens.push(line);
    } else {
      protectedScreens.push(line.replace(/^ {14}/u, '                '));
    }
  }
  if (protectedScreens.length === 0) {
    return source;
  }

  const replacement = [
    ...publicAuthScreens,
    ...publicScreens,
    '              <Stack.Protected guard={auth.isAuthenticated}>',
    ...protectedScreens,
    '              </Stack.Protected>',
    '',
  ].join('\n');

  return `${before}${replacement}${after}`;
}

function isPublicAuthAddScreen(line: string): boolean {
  return (
    line.includes('name="onboarding') ||
    line.includes("name='onboarding") ||
    line.includes('name="terms"') ||
    line.includes("name='terms'") ||
    line.includes('name="privacy"') ||
    line.includes("name='privacy'") ||
    line.includes('name="legal/') ||
    line.includes("name='legal/")
  );
}

export async function runLibraryCommand(
  command: string,
  args: readonly string[],
  options: LibraryCommandRunnerOptions
): Promise<void> {
  await runProjectCommand(
    {
      command,
      args: [...args],
      display: [command, ...args].join(' '),
    },
    { cwd: options.cwd }
  );
}

async function planFiles(
  context: LibraryProjectInspection,
  assets: readonly LibraryResolvedAsset[],
  conflicts: LibraryAddConflict[]
): Promise<LibraryPlannedFile[]> {
  const files: LibraryPlannedFile[] = [];
  const destinationContents = new Map<string, { hash: string; source: string }>();

  for (const asset of assets) {
    const safeDestination = await resolveSafeDestination(context.projectPath, asset.destination);
    const rawContent = await readLibraryAsset(asset);
    const rendered = renderAssetContent(asset, rawContent, context);
    const contentHash = hashPlannedFileContent(rendered.content, asset.encoding);
    const normalizedDestination = normalizeProjectRelativePath(asset.destination);

    if (!safeDestination) {
      const conflict: LibraryAddConflict = {
        code: 'unsafe-destination',
        message: `Asset destination escapes the target project: ${asset.destination}`,
        itemId: asset.itemId,
        path: asset.destination,
      };
      conflicts.push(conflict);
      files.push({
        itemId: asset.itemId,
        variantId: asset.variantId,
        source: asset.path,
        destination: normalizedDestination,
        absolutePath: path.resolve(context.projectPath, asset.destination),
        encoding: asset.encoding,
        role: asset.role,
        action: 'conflict',
        contentHash,
      });
      continue;
    }

    if (rendered.conflict) {
      conflicts.push(rendered.conflict);
    }

    const duplicate = destinationContents.get(normalizedDestination);
    if (duplicate) {
      if (duplicate.hash !== contentHash) {
        conflicts.push({
          code: 'integration-conflict',
          message: `Multiple library assets produce different content for ${normalizedDestination}.`,
          itemId: asset.itemId,
          path: normalizedDestination,
        });
      }
      continue;
    }
    destinationContents.set(normalizedDestination, { hash: contentHash, source: asset.path });

    const existing = await readExistingDestination(safeDestination);
    let action: LibraryPlannedFileAction = 'create';
    let existingHash: string | undefined;
    if (existing.kind === 'file') {
      existingHash = hashPlannedFileContent(existing.content, asset.encoding);
      action = existingHash === contentHash ? 'skip-identical' : 'conflict';
      if (action === 'conflict') {
        conflicts.push({
          code: asset.role === 'route' ? 'integration-conflict' : 'file-conflict',
          message: `Refusing to overwrite customized file ${normalizedDestination}.`,
          itemId: asset.itemId,
          path: normalizedDestination,
        });
      }
    } else if (existing.kind === 'other') {
      action = 'conflict';
      conflicts.push({
        code: 'file-conflict',
        message: `Destination is not a regular file: ${normalizedDestination}.`,
        itemId: asset.itemId,
        path: normalizedDestination,
      });
    }
    if (rendered.conflict) {
      action = 'conflict';
    }

    files.push({
      itemId: asset.itemId,
      variantId: asset.variantId,
      source: asset.path,
      destination: normalizedDestination,
      absolutePath: safeDestination,
      encoding: asset.encoding,
      role: asset.role,
      action,
      contentHash,
      existingHash,
    });
  }

  return files.sort((left, right) => left.destination.localeCompare(right.destination));
}

function planDependencies(
  context: LibraryProjectInspection,
  dependencies: readonly LibraryDependency[],
  conflicts: LibraryAddConflict[]
): LibraryPlannedDependency[] {
  return [...dependencies]
    .sort((left, right) =>
      `${left.installer}:${left.kind}:${left.name}`.localeCompare(
        `${right.installer}:${right.kind}:${right.name}`
      )
    )
    .map((dependency) => {
      const declaration = findDependencyDeclaration(context, dependency.name);
      if (!declaration) {
        return { ...dependency, action: 'install' as const };
      }
      const { version: currentVersion, section } = declaration;
      const sectionSatisfies =
        section === 'dependencies' ||
        (dependency.kind === 'development' && section === 'devDependencies');
      if (!sectionSatisfies) {
        conflicts.push({
          code: 'dependency-version-conflict',
          message: `${dependency.name} is declared in ${section}, but the library requires it in ${
            dependency.kind === 'runtime' ? 'dependencies' : 'devDependencies or dependencies'
          }.`,
          dependency: dependency.name,
        });
        return { ...dependency, action: 'conflict' as const, currentVersion };
      }
      if (declaredRangeSatisfies(currentVersion, dependency.version)) {
        return { ...dependency, action: 'satisfied' as const, currentVersion };
      }

      conflicts.push({
        code: 'dependency-version-conflict',
        message: `${dependency.name} is declared as ${currentVersion}, but the library requires ${dependency.version}.`,
        dependency: dependency.name,
      });
      return { ...dependency, action: 'conflict' as const, currentVersion };
    });
}

function buildDependencyCommands(
  packageManager: LibraryPackageManager,
  dependencies: readonly LibraryPlannedDependency[]
): LibraryDependencyCommand[] {
  const groups = new Map<string, LibraryPlannedDependency[]>();
  for (const dependency of dependencies) {
    const key = `${dependency.installer}:${dependency.kind}`;
    const group = groups.get(key) ?? [];
    group.push(dependency);
    groups.set(key, group);
  }

  const commands: LibraryDependencyCommand[] = [];
  for (const installer of ['expo', 'package-manager'] as const) {
    for (const kind of ['runtime', 'development'] as const) {
      const group = groups.get(`${installer}:${kind}`);
      if (!group || group.length === 0) {
        continue;
      }
      const specifications = group.map(formatDependencySpecification);
      commands.push(
        installer === 'expo'
          ? toLibraryDependencyCommand(
              buildExpoInstallCommand(packageManager, kind, specifications),
              installer,
              kind,
              specifications
            )
          : toLibraryDependencyCommand(
              buildAddCommand(packageManager, kind, specifications),
              installer,
              kind,
              specifications
            )
      );
    }
  }
  return commands;
}

function toLibraryDependencyCommand(
  spec: {
    command: string;
    args: string[];
    display: string;
  },
  installer: 'expo' | 'package-manager',
  kind: 'runtime' | 'development',
  dependencies: string[]
): LibraryDependencyCommand {
  return {
    command: spec.command,
    args: spec.args,
    display: spec.display,
    installer,
    kind,
    dependencies,
  };
}

function findDependencyDeclaration(
  context: LibraryProjectInspection,
  dependencyName: string
): { section: 'dependencies' | 'devDependencies' | 'optionalDependencies' | 'peerDependencies'; version: string } | null {
  if (context.runtimeDependencies[dependencyName]) {
    return { section: 'dependencies', version: context.runtimeDependencies[dependencyName] };
  }
  if (context.developmentDependencies[dependencyName]) {
    return { section: 'devDependencies', version: context.developmentDependencies[dependencyName] };
  }
  if (context.optionalDependencies[dependencyName]) {
    return { section: 'optionalDependencies', version: context.optionalDependencies[dependencyName] };
  }
  if (context.peerDependencies[dependencyName]) {
    return { section: 'peerDependencies', version: context.peerDependencies[dependencyName] };
  }
  return null;
}

async function resolveAssetsByDestination(
  plan: LibraryAddPlan,
  variant: string | undefined
): Promise<Map<string, LibraryResolvedAsset>> {
  const resolution = resolveLibraryItem(plan.id, plan.context, { variant });
  const result = new Map<string, LibraryResolvedAsset>();
  for (const asset of resolution.assets) {
    result.set(normalizeProjectRelativePath(asset.destination), asset);
  }
  return result;
}

function renderAssetContent(
  asset: LibraryResolvedAsset,
  content: Buffer,
  context: LibraryProjectInspection
): RenderedAsset {
  if (asset.encoding === 'binary') {
    return { content };
  }

  let rendered = content.toString('utf8');
  const declaredTokens = readAssetContentTokens(asset);
  const discoveredTokens = Object.keys(CONTENT_TOKEN_VALUES).filter((token) =>
    rendered.includes(token)
  );
  const requiredTokens = Array.from(new Set([...declaredTokens, ...discoveredTokens]));

  for (const token of requiredTokens) {
    const readValue = CONTENT_TOKEN_VALUES[token as keyof typeof CONTENT_TOKEN_VALUES];
    if (!readValue) {
      return {
        content: Buffer.from(rendered, 'utf8'),
        conflict: {
          code: 'unsupported-content-token',
          message: `Library asset ${asset.path} requires unsupported content token ${token}.`,
          itemId: asset.itemId,
          path: asset.destination,
        },
      };
    }
    const value = readValue(context)?.trim();
    if (!value) {
      return {
        content: Buffer.from(rendered, 'utf8'),
        conflict: {
          code: 'missing-content-token',
          message: `Library asset ${asset.path} requires ${token}. Add the corresponding project information and plan again.`,
          itemId: asset.itemId,
          path: asset.destination,
        },
      };
    }
    rendered = rendered.split(token).join(value);
  }

  return { content: Buffer.from(rendered, 'utf8') };
}

function readAssetContentTokens(asset: LibraryAsset): string[] {
  const candidate = asset as LibraryAsset & { contentTokens?: readonly string[] };
  return Array.isArray(candidate.contentTokens)
    ? candidate.contentTokens.filter((token): token is string => typeof token === 'string')
    : [];
}

async function resolveSafeDestination(
  projectPath: string,
  destination: string
): Promise<string | null> {
  if (!destination.trim() || destination.includes('\0')) {
    return null;
  }
  const normalizedInput = destination.replace(/\\/g, '/');
  if (path.posix.isAbsolute(normalizedInput) || path.win32.isAbsolute(destination)) {
    return null;
  }
  const segments = normalizedInput.split('/');
  if (segments.some((segment) => segment === '..') || segments.every((segment) => !segment || segment === '.')) {
    return null;
  }

  const absoluteProjectPath = path.resolve(projectPath);
  const absoluteDestination = path.resolve(absoluteProjectPath, ...segments);
  if (!pathIsWithin(absoluteProjectPath, absoluteDestination) || absoluteDestination === absoluteProjectPath) {
    return null;
  }

  const realProjectPath = await realpath(absoluteProjectPath);
  const nearestExistingPath = await findNearestExistingPath(absoluteDestination);
  if (nearestExistingPath) {
    const realExistingPath = await realpath(nearestExistingPath);
    if (!pathIsWithin(realProjectPath, realExistingPath) && realExistingPath !== realProjectPath) {
      return null;
    }
  }
  return absoluteDestination;
}

async function findNearestExistingPath(candidate: string): Promise<string | null> {
  let current = candidate;
  for (;;) {
    try {
      await lstat(current);
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  }
}

async function readExistingDestination(
  filePath: string
): Promise<{ kind: 'missing' } | { kind: 'file'; content: Buffer } | { kind: 'other' }> {
  try {
    const stats = await lstat(filePath);
    if (!stats.isFile()) {
      return { kind: 'other' };
    }
    return { kind: 'file', content: await readFile(filePath) };
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return { kind: 'missing' };
    }
    throw error;
  }
}

async function rollbackCreatedFiles(projectPath: string, destinations: readonly string[]): Promise<void> {
  for (const destination of [...destinations].reverse()) {
    const safePath = await resolveSafeDestination(projectPath, destination);
    if (safePath) {
      await rm(safePath, { force: true });
    }
  }
}

function isBlockingResolutionIssue(issue: LibraryResolutionIssue): boolean {
  if (issue.severity !== 'error') {
    return false;
  }
  return issue.code !== 'destination-exists' && issue.code !== 'missing-dependency';
}

function conflictCodeForResolutionIssue(issue: LibraryResolutionIssue): LibraryAddConflictCode {
  if (issue.code === 'unsafe-destination') return 'unsafe-destination';
  if (issue.code === 'destination-collision') return 'integration-conflict';
  if (issue.code === 'dependency-version-conflict') return 'dependency-version-conflict';
  return 'incompatible-item';
}

function deduplicateConflicts(conflicts: readonly LibraryAddConflict[]): LibraryAddConflict[] {
  const seen = new Set<string>();
  return conflicts.filter((conflict) => {
    const key = stableStringify(conflict);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isCompatibilityConflict(conflict: LibraryAddConflict): boolean {
  return (
    conflict.code === 'not-expo-project' ||
    conflict.code === 'incompatible-item' ||
    conflict.code === 'dependency-version-conflict'
  );
}

function formatBlockedPlanError(plan: LibraryAddPlan): string {
  const details = plan.conflicts.map((conflict) => conflict.message).join(' ');
  return `Library add is blocked by ${plan.conflicts.length} conflict(s). ${details}`.trim();
}

function buildPlacementGuidance(
  id: string,
  kind: string,
  files: readonly LibraryPlannedFile[],
  context: LibraryProjectInspection
): string[] {
  const sourceFiles = files
    .filter((file) => file.role !== 'support' && file.encoding === 'utf8')
    .map((file) => file.destination);
  const fallbackFiles = (sourceFiles.length > 0 ? sourceFiles : files.map((file) => file.destination))
    .filter(Boolean)
    .slice(0, 4);
  const fallbackDescription =
    fallbackFiles.length === 0
      ? 'the default source-copy location'
      : fallbackFiles.length === 1
        ? `the default source-copy location (${fallbackFiles[0]})`
        : `the default source-copy locations (${fallbackFiles.join(', ')})`;
  const appTarget =
    context.navigation === 'expo-router'
      ? `a route under ${context.appDirectory ?? 'app'}`
      : 'the screen or navigator entry where it should appear';
  const targetPrompt =
    kind === 'integration'
      ? 'where or how they want it wired into the app'
      : `where they want to see or use it in the app (${appTarget})`;
  const followUp =
    kind === 'integration'
      ? 'If they already named a setup location, provider boundary, route group, or configuration choice, copy the source first, then wire it there and run the relevant typecheck.'
      : 'If they already named a screen, route, or component slot, copy the source first, then import/use it there and run the relevant typecheck.';

  return [
    `Before applying ${id}, ask the developer ${targetPrompt}.`,
    followUp,
    `If they are not sure, use ${fallbackDescription} and report the import path as the fallback.`,
  ];
}

function hashableProjectContext(context: LibraryProjectInspection): Record<string, unknown> {
  return {
    expoSdk: context.expoSdk ?? null,
    styling: context.styling ?? null,
    appDirectory: context.appDirectory ?? null,
    navigation: context.navigation ?? null,
    navigationLayout: context.navigationLayout,
    platforms: context.platforms ?? [],
    aliases: context.aliases ?? {},
    dependencies: context.dependencies,
    runtimeDependencies: context.runtimeDependencies,
    developmentDependencies: context.developmentDependencies,
    optionalDependencies: context.optionalDependencies,
    peerDependencies: context.peerDependencies,
    componentsDirectory: context.componentsDirectory,
    featuresDirectory: context.featuresDirectory,
    projectName: context.projectName ?? null,
    projectAudience: context.projectAudience ?? null,
    packageManager: context.packageManager,
  };
}

async function readRequiredPackageJson(projectPath: string): Promise<PackageJsonSubset> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  let raw: string;
  try {
    raw = await readFile(packageJsonPath, 'utf8');
  } catch {
    throw new Error(`MDS Library requires a package.json at ${packageJsonPath}.`);
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      throw new Error('package.json must contain an object.');
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse ${packageJsonPath}: ${message}`);
  }
}

async function readAppConfig(
  projectPath: string,
  packageJson: PackageJsonSubset
): Promise<AppConfigSubset | null> {
  for (const configPath of ['app.json', 'app.config.json']) {
    const appJson = await readOptionalJson(path.join(projectPath, configPath));
    if (appJson) {
      return appJson as AppConfigSubset;
    }
  }
  for (const configPath of [
    'app.config.ts',
    'app.config.js',
    'app.config.mjs',
    'app.config.cjs',
  ]) {
    const appConfig = await readStaticAppConfigSource(path.join(projectPath, configPath));
    if (appConfig) {
      return appConfig;
    }
  }
  if (isRecord(packageJson.expo)) {
    return { expo: packageJson.expo } as AppConfigSubset;
  }
  return null;
}

async function readStaticAppConfigSource(configPath: string): Promise<AppConfigSubset | null> {
  let raw: string;
  try {
    raw = await readFile(configPath, 'utf8');
  } catch {
    return null;
  }

  const name =
    readQuotedProperty(raw, ['name']) ??
    readQuotedProperty(raw, ['expo', 'name']) ??
    undefined;
  const platforms =
    readPlatformArrayLiteral(raw, ['platforms']) ??
    readPlatformArrayLiteral(raw, ['expo', 'platforms']) ??
    undefined;
  const hasIos = hasObjectProperty(raw, ['ios']) || hasObjectProperty(raw, ['expo', 'ios']);
  const hasAndroid =
    hasObjectProperty(raw, ['android']) || hasObjectProperty(raw, ['expo', 'android']);
  const hasWeb = hasObjectProperty(raw, ['web']) || hasObjectProperty(raw, ['expo', 'web']);

  if (!name && !platforms && !hasIos && !hasAndroid && !hasWeb) {
    return null;
  }

  return {
    expo: {
      ...(name ? { name } : {}),
      ...(platforms ? { platforms } : {}),
      ...(hasIos ? { ios: {} } : {}),
      ...(hasAndroid ? { android: {} } : {}),
      ...(hasWeb ? { web: {} } : {}),
    },
  };
}

async function readProjectInfo(
  projectPath: string
): Promise<{ name?: string; audience?: string }> {
  let raw: string;
  try {
    raw = await readFile(path.join(projectPath, 'project', 'info.md'), 'utf8');
  } catch {
    return {};
  }
  return {
    name: readMarkdownSectionValue(raw, ['App Name']),
    audience: readMarkdownSectionValue(raw, ['Target Users', 'Audience']),
  };
}

function readMarkdownSectionValue(markdown: string, headings: readonly string[]): string | undefined {
  const lines = markdown.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index]?.match(/^##\s+(.+?)\s*$/)?.[1]?.trim().toLowerCase();
    if (!heading || !headings.some((candidate) => candidate.toLowerCase() === heading)) {
      continue;
    }
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const value = lines[cursor]?.trim();
      if (!value) {
        continue;
      }
      if (value.startsWith('#')) {
        break;
      }
      return value.replace(/^[-*]\s+/, '').trim() || undefined;
    }
  }
  return undefined;
}

function readQuotedProperty(source: string, propertyPath: readonly string[]): string | null {
  const propertyPattern = propertyPath
    .map((segment) => `${escapeRegex(segment)}\\s*:`)
    .join('[\\s\\S]*?');
  for (const quote of [`'`, `"`, '`']) {
    const escapedQuote = escapeRegex(quote);
    const match = source.match(
      new RegExp(`${propertyPattern}\\s*${escapedQuote}([^\\r\\n]+?)${escapedQuote}`, 'm')
    );
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }
  return null;
}

function readPlatformArrayLiteral(
  source: string,
  propertyPath: readonly string[]
): LibraryPlatform[] | null {
  const propertyPattern = propertyPath
    .map((segment) => `${escapeRegex(segment)}\\s*:`)
    .join('[\\s\\S]*?');
  const match = source.match(new RegExp(`${propertyPattern}\\s*\\[([\\s\\S]*?)\\]`, 'm'));
  if (!match?.[1]) {
    return null;
  }
  const platforms = Array.from(
    match[1].matchAll(/['"`](android|ios|web)['"`]/g),
    (entry) => entry[1]
  ).filter(isLibraryPlatform);
  return platforms.length > 0 ? Array.from(new Set(platforms)) : null;
}

function hasObjectProperty(source: string, propertyPath: readonly string[]): boolean {
  const propertyPattern = propertyPath
    .map((segment) => `${escapeRegex(segment)}\\s*:`)
    .join('[\\s\\S]*?');
  return new RegExp(`${propertyPattern}\\s*\\{`, 'm').test(source);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function readTypeScriptAliases(projectPath: string): Promise<Record<string, string>> {
  const tsconfig = await readOptionalLooseJson(path.join(projectPath, 'tsconfig.json'));
  if (!tsconfig || !isRecord(tsconfig.compilerOptions) || !isRecord(tsconfig.compilerOptions.paths)) {
    return {};
  }
  const aliases: Record<string, string> = {};
  for (const [alias, value] of Object.entries(tsconfig.compilerOptions.paths)) {
    let target: string | undefined;
    if (typeof value === 'string') {
      target = value;
    } else if (Array.isArray(value)) {
      const first = value.find((entry): entry is string => typeof entry === 'string');
      if (first) target = first;
    }
    if (target) {
      aliases[alias] = target;
      if (alias.endsWith('/*')) {
        const baseAlias = alias.slice(0, -2);
        const baseTarget = target.endsWith('/*') ? target.slice(0, -2) : target;
        aliases[baseAlias] = baseTarget;
      }
    }
  }
  return aliases;
}

async function collectProjectFiles(projectPath: string): Promise<string[]> {
  const result: string[] = [];
  async function visit(directoryPath: string, relativeDirectory: string): Promise<void> {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      if (entry.isDirectory()) {
        if (!IGNORED_SCAN_DIRECTORIES.has(entry.name)) {
          await visit(path.join(directoryPath, entry.name), relativePath);
        }
      } else {
        result.push(relativePath.replace(/\\/g, '/'));
      }
    }
  }
  await visit(projectPath, '');
  return result.sort();
}

async function detectAppDirectory(
  projectPath: string,
  dependencies: Readonly<Record<string, string>>
): Promise<'app' | 'src/app'> {
  const srcApp = path.join(projectPath, 'src', 'app');
  const rootApp = path.join(projectPath, 'app');
  const srcLayout = await pathExists(path.join(srcApp, '_layout.tsx'));
  const rootLayout = await pathExists(path.join(rootApp, '_layout.tsx'));
  if (srcLayout !== rootLayout) return srcLayout ? 'src/app' : 'app';
  const hasSrcApp = await isDirectory(srcApp);
  const hasRootApp = await isDirectory(rootApp);
  if (hasSrcApp !== hasRootApp) return hasSrcApp ? 'src/app' : 'app';
  if (dependencies['expo-router'] && (await isDirectory(path.join(projectPath, 'src')))) {
    return 'src/app';
  }
  return 'app';
}

async function detectSourceDirectory(
  projectPath: string,
  appDirectory: 'app' | 'src/app',
  directoryName: 'components' | 'features'
): Promise<string> {
  const srcCandidate = `src/${directoryName}`;
  const rootCandidate = directoryName;
  const hasSrcCandidate = await isDirectory(path.join(projectPath, srcCandidate));
  const hasRootCandidate = await isDirectory(path.join(projectPath, rootCandidate));
  if (hasSrcCandidate !== hasRootCandidate) return hasSrcCandidate ? srcCandidate : rootCandidate;
  if (appDirectory === 'src/app' || (await isDirectory(path.join(projectPath, 'src')))) {
    return srcCandidate;
  }
  return rootCandidate;
}

function detectNavigation(
  dependencies: Readonly<Record<string, string>>,
  appDirectory: 'app' | 'src/app',
  files: ReadonlySet<string>
): LibraryNavigation | undefined {
  if (dependencies['expo-router'] || files.has(`${appDirectory}/_layout.tsx`)) {
    return 'expo-router';
  }
  if (dependencies['@react-navigation/native']) {
    return 'react-navigation';
  }
  return undefined;
}

async function detectNavigationLayout(
  projectPath: string,
  appDirectory: 'app' | 'src/app',
  navigation: LibraryNavigation | undefined,
  files: readonly string[]
): Promise<LibraryNavigationLayout> {
  const appPrefix = `${appDirectory}/`;
  if (files.some((file) => file.startsWith(appPrefix) && file.includes('(drawer)'))) {
    return 'drawer+tabs';
  }
  if (files.some((file) => file.startsWith(appPrefix) && file.includes('(tabs)'))) {
    return 'tabs';
  }
  const layout = await readOptionalText(path.join(projectPath, appDirectory, '_layout.tsx'));
  if (/\bDrawer\b/.test(layout ?? '')) return 'drawer+tabs';
  if (/\bTabs\b/.test(layout ?? '') || /<[A-Z][A-Za-z0-9_]*Tabs\b/.test(layout ?? '')) {
    return 'tabs';
  }
  return 'stack';
}

function detectStyling(
  dependencies: Readonly<Record<string, string>>,
  files: readonly string[]
): LibraryStyling {
  if (files.some((file) => /(^|\/)components\/nativewindui\//i.test(file))) return 'nativewindui';
  if (dependencies.uniwind) return 'uniwind';
  if (dependencies.nativewind) return 'nativewind';
  if (dependencies.tamagui || dependencies['@tamagui/core']) return 'tamagui';
  if (dependencies['@shopify/restyle']) return 'restyle';
  return 'stylesheet';
}

function detectPlatforms(
  appConfig: AppConfigSubset | null,
  dependencies: Readonly<Record<string, string>>
): LibraryPlatform[] {
  const explicit = appConfig?.expo?.platforms;
  if (Array.isArray(explicit)) {
    const platforms = explicit.filter(isLibraryPlatform);
    if (platforms.length > 0) return Array.from(new Set(platforms));
  }

  const configured: LibraryPlatform[] = [];
  if (appConfig?.expo && 'android' in appConfig.expo) configured.push('android');
  if (appConfig?.expo && 'ios' in appConfig.expo) configured.push('ios');
  if (appConfig?.expo && 'web' in appConfig.expo) configured.push('web');
  if (configured.length > 0) return configured;
  if (dependencies.expo) return ['android', 'ios', 'web'];
  return [];
}

function readDependencyRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function declaredRangeSatisfies(current: string, required: string): boolean {
  const normalizedCurrent = current.trim();
  const normalizedRequired = required.trim();
  if (
    normalizedCurrent === normalizedRequired ||
    normalizedRequired === '*' ||
    normalizedRequired.toLowerCase() === 'latest'
  ) {
    return true;
  }
  if (/^(workspace:|file:|link:)/.test(normalizedCurrent)) {
    return false;
  }

  const actual = parseVersion(normalizedCurrent);
  const expected = parseVersion(normalizedRequired);
  if (!actual || !expected) return false;
  const atLeastExpected = compareVersions(actual, expected) >= 0;
  if (normalizedRequired.startsWith('^')) {
    if (!atLeastExpected || actual[0] !== expected[0]) return false;
    if (expected[0] === 0 && actual[1] !== expected[1]) return false;
    if (expected[0] === 0 && expected[1] === 0 && actual[2] !== expected[2]) return false;
    return true;
  }
  if (normalizedRequired.startsWith('~')) {
    return actual[0] === expected[0] && actual[1] === expected[1] && atLeastExpected;
  }
  return compareVersions(actual, expected) === 0;
}

function parseVersion(input: string): [number, number, number] | null {
  const match = input.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match?.[1]) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

function compareVersions(
  left: [number, number, number],
  right: [number, number, number]
): number {
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function formatDependencySpecification(dependency: LibraryDependency): string {
  if (dependency.version === '*' || dependency.version.toLowerCase() === 'latest') {
    return dependency.name;
  }
  return `${dependency.name}@${dependency.version}`;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortForStableSerialization(value));
}

function sortForStableSerialization(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForStableSerialization);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, sortForStableSerialization(entryValue)])
  );
}

function hashPlannedFileContent(content: Buffer, encoding: LibraryAsset['encoding']): string {
  if (encoding === 'binary') {
    return sha256(content);
  }
  return sha256(Buffer.from(normalizeTextLineEndings(content.toString('utf8')), 'utf8'));
}

function normalizeTextLineEndings(content: string): string {
  return content.replace(/\r\n?/g, '\n');
}

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function normalizeAbsolutePath(value: string): string {
  const normalized = path.resolve(value).replace(/\\/g, '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function normalizeProjectRelativePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function normalizePackageName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const unscoped = value.includes('/') ? value.slice(value.lastIndexOf('/') + 1) : value;
  return unscoped || undefined;
}

function pathIsWithin(parentPath: string, candidatePath: string): boolean {
  const relative = path.relative(parentPath, candidatePath);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function isLibraryPlatform(value: unknown): value is LibraryPlatform {
  return value === 'android' || value === 'ios' || value === 'web';
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is Error & { code: string } {
  return error instanceof Error && 'code' in error && typeof error.code === 'string';
}

async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function readOptionalJson(filePath: string): Promise<Record<string, unknown> | null> {
  const raw = await readOptionalText(filePath);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function readOptionalLooseJson(filePath: string): Promise<Record<string, unknown> | null> {
  const raw = await readOptionalText(filePath);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(stripJsonComments(raw).replace(/,\s*([}\]])/g, '$1')) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function stripJsonComments(input: string): string {
  let result = '';
  let inString = false;
  let escaping = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < input.length; index += 1) {
    const current = input[index] ?? '';
    const next = input[index + 1] ?? '';
    if (lineComment) {
      if (current === '\n') {
        lineComment = false;
        result += current;
      }
      continue;
    }
    if (blockComment) {
      if (current === '*' && next === '/') {
        blockComment = false;
        index += 1;
      } else if (current === '\n') {
        result += current;
      }
      continue;
    }
    if (inString) {
      result += current;
      if (escaping) escaping = false;
      else if (current === '\\') escaping = true;
      else if (current === '"') inString = false;
      continue;
    }
    if (current === '"') {
      inString = true;
      result += current;
    } else if (current === '/' && next === '/') {
      lineComment = true;
      index += 1;
    } else if (current === '/' && next === '*') {
      blockComment = true;
      index += 1;
    } else {
      result += current;
    }
  }
  return result;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    return (await lstat(filePath)).isDirectory();
  } catch {
    return false;
  }
}
