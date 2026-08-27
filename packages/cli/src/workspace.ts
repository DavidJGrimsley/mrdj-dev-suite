import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type ProjectShape = 'single-expo-app' | 'multi-app-workspace';
export type WorkspacePackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type WorkspaceStylingSystem =
  | 'uniwind'
  | 'nativewind'
  | 'nativewindui'
  | 'tamagui'
  | 'restyle'
  | 'stylesheet';
export type WorkspaceAppKind = 'expo' | 'non-expo';
export type NonExpoAppCategory = 'website' | 'backend' | 'worker' | 'other';
export type SharedWorkspacePackageRole =
  | 'config'
  | 'ui-theme'
  | 'hooks-state'
  | 'sdk-client'
  | 'database-schema';

export interface WorkspaceApp {
  id: string;
  displayName: string;
  packageName: string;
  path: string;
  kind: WorkspaceAppKind;
  purpose: string;
  platforms?: string[];
  port?: number;
  category?: NonExpoAppCategory;
  intendedStack?: string;
}

export interface SharedWorkspacePackage {
  name: string;
  packageName: string;
  path: string;
  role: SharedWorkspacePackageRole;
}

export interface WorkspaceManifest {
  schemaVersion: 1;
  name: string;
  displayName: string;
  packageScope: string;
  packageManager: WorkspacePackageManager;
  expoVersion: string;
  stylingSystem: WorkspaceStylingSystem;
  sharedDesignDirection: string;
  taskRunner: 'turbo';
  apps: WorkspaceApp[];
  sharedPackages: SharedWorkspacePackage[];
}

export interface WorkspaceAppInput {
  displayName: string;
  slug?: string;
  kind: WorkspaceAppKind;
  purpose: string;
  platforms?: string[];
  category?: NonExpoAppCategory;
  intendedStack?: string;
}

export interface WorkspaceManifestInput {
  displayName: string;
  slug?: string;
  packageScope?: string;
  packageManager?: WorkspacePackageManager;
  expoVersion?: string;
  stylingSystem?: WorkspaceStylingSystem;
  sharedDesignDirection?: string;
  apps: WorkspaceAppInput[];
  optionalSharedPackages?: SharedWorkspacePackageRole[];
}

export interface WorkspaceDiscovery {
  manifest: WorkspaceManifest;
  hasTurboConfig: boolean;
  hasWorkspaceConfig: boolean;
}

export interface WorkspaceWriteResult {
  filePath: string;
  wrote: boolean;
}

export const WORKSPACE_MANIFEST_PATH = path.join('project', 'workspace.json');
export const DEFAULT_EXPO_PORT = 8081;

export function slugifyWorkspaceName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['’]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .replace(/-{2,}/gu, '-');
  if (!slug) throw new Error('Workspace and app names must contain at least one letter or number.');
  return slug;
}

export function derivePackageScope(workspaceName: string): string {
  return `@${slugifyWorkspaceName(workspaceName)}`;
}

export function createWorkspaceManifest(input: WorkspaceManifestInput): WorkspaceManifest {
  const name = slugifyWorkspaceName(input.slug ?? input.displayName);
  const packageScope = normalizePackageScope(input.packageScope ?? derivePackageScope(name));
  let nextPort = DEFAULT_EXPO_PORT;
  const apps = input.apps.map((entry): WorkspaceApp => {
    const id = slugifyWorkspaceName(entry.slug ?? entry.displayName);
    const expo = entry.kind === 'expo';
    return {
      id,
      displayName: entry.displayName.trim(),
      packageName: `${packageScope}/${id}`,
      path: `apps/${id}`,
      kind: entry.kind,
      purpose: entry.purpose.trim(),
      ...(expo ? { platforms: entry.platforms ?? ['web', 'ios', 'android'], port: nextPort++ } : {}),
      ...(!expo && entry.category ? { category: entry.category } : {}),
      ...(!expo && entry.intendedStack?.trim() ? { intendedStack: entry.intendedStack.trim() } : {}),
    };
  });
  const roles = new Set<SharedWorkspacePackageRole>([
    'config',
    'ui-theme',
    ...(input.optionalSharedPackages ?? []),
  ]);
  const manifest: WorkspaceManifest = {
    schemaVersion: 1,
    name,
    displayName: input.displayName.trim(),
    packageScope,
    packageManager: input.packageManager ?? 'pnpm',
    expoVersion: input.expoVersion?.trim() || '^56.0.0',
    stylingSystem: input.stylingSystem ?? 'uniwind',
    sharedDesignDirection:
      input.sharedDesignDirection?.trim() ||
      'Use one accessible theme and component foundation across every product surface.',
    taskRunner: 'turbo',
    apps,
    sharedPackages: [...roles].map((role) => createSharedPackage(role, packageScope)),
  };
  validateWorkspaceManifest(manifest);
  return manifest;
}

export function validateWorkspaceManifest(value: unknown): asserts value is WorkspaceManifest {
  if (!isRecord(value)) throw new Error('Workspace plan must be a JSON object.');
  if (value.schemaVersion !== 1) throw new Error('Workspace plan schemaVersion must be 1.');
  if (typeof value.name !== 'string' || slugifyWorkspaceName(value.name) !== value.name) {
    throw new Error('Workspace name must be a lowercase product slug.');
  }
  if (typeof value.displayName !== 'string' || !value.displayName.trim()) {
    throw new Error('Workspace displayName is required.');
  }
  const packageScope = normalizePackageScope(typeof value.packageScope === 'string' ? value.packageScope : '');
  if (value.packageScope !== packageScope) {
    throw new Error('Workspace packageScope must be lowercase and normalized.');
  }
  if (!['npm', 'pnpm', 'yarn', 'bun'].includes(String(value.packageManager))) {
    throw new Error('Workspace packageManager must be npm, pnpm, yarn, or bun.');
  }
  if (typeof value.expoVersion !== 'string' || !value.expoVersion.trim()) {
    throw new Error('Workspace expoVersion is required.');
  }
  if (!['uniwind', 'nativewind', 'nativewindui', 'tamagui', 'restyle', 'stylesheet'].includes(String(value.stylingSystem))) {
    throw new Error('Workspace stylingSystem is invalid.');
  }
  if (typeof value.sharedDesignDirection !== 'string' || !value.sharedDesignDirection.trim()) {
    throw new Error('Workspace sharedDesignDirection is required.');
  }
  if (value.taskRunner !== 'turbo') throw new Error('Workspace taskRunner must be turbo.');
  if (!Array.isArray(value.apps) || value.apps.length < 2) {
    throw new Error('A CESS workspace requires at least two registered apps.');
  }
  if (!value.apps.some((entry) => isRecord(entry) && entry.kind === 'expo')) {
    throw new Error('A CESS workspace requires at least one Expo app.');
  }

  const ids = new Set<string>();
  const paths = new Set<string>();
  const packageNames = new Set<string>();
  const ports = new Set<number>();
  for (const raw of value.apps) {
    if (!isRecord(raw)) throw new Error('Every workspace app must be an object.');
    const id = typeof raw.id === 'string' ? raw.id : '';
    if (!id || slugifyWorkspaceName(id) !== id) throw new Error(`Workspace app id must be a lowercase slug: ${id}`);
    if (ids.has(id)) throw new Error(`Duplicate workspace app id: ${id}`);
    ids.add(id);
    const expectedPath = `apps/${id}`;
    if (raw.path !== expectedPath) throw new Error(`Workspace app path must be ${expectedPath}.`);
    const normalizedPath = normalizeWorkspaceRelativePath(String(raw.path));
    if (paths.has(normalizedPath)) throw new Error(`Duplicate workspace app path: ${normalizedPath}`);
    paths.add(normalizedPath);
    if (raw.packageName !== `${packageScope}/${id}`) throw new Error(`Workspace app packageName must be ${packageScope}/${id}.`);
    if (packageNames.has(String(raw.packageName))) throw new Error(`Duplicate workspace package name: ${String(raw.packageName)}`);
    packageNames.add(String(raw.packageName));
    if (typeof raw.displayName !== 'string' || !raw.displayName.trim() || typeof raw.purpose !== 'string' || !raw.purpose.trim()) {
      throw new Error('Every workspace app requires a displayName and purpose.');
    }
    if (raw.kind !== 'expo' && raw.kind !== 'non-expo') throw new Error(`Invalid workspace app kind for ${id}.`);
    if (raw.kind === 'expo') {
      if (!Number.isInteger(raw.port) || Number(raw.port) < 1 || Number(raw.port) > 65535) {
        throw new Error(`Expo app ${id} requires a valid development port.`);
      }
      if (ports.has(Number(raw.port))) throw new Error(`Duplicate Expo development port: ${String(raw.port)}`);
      ports.add(Number(raw.port));
    }
  }

  if (!Array.isArray(value.sharedPackages)) throw new Error('Workspace sharedPackages must be an array.');
  const sharedNames = new Set<string>();
  for (const raw of value.sharedPackages) {
    if (!isRecord(raw)) throw new Error('Every shared package must be an object.');
    const name = typeof raw.name === 'string' ? raw.name : '';
    if (!name || slugifyWorkspaceName(name) !== name) throw new Error(`Invalid shared package name: ${name}`);
    const expectedPath = `packages/${name}`;
    if (raw.path !== expectedPath) throw new Error(`Shared package path must be ${expectedPath}.`);
    if (raw.packageName !== `${packageScope}/${name}`) throw new Error(`Shared package packageName must be ${packageScope}/${name}.`);
    if (sharedNames.has(name) || packageNames.has(String(raw.packageName))) throw new Error(`Duplicate workspace package name: ${String(raw.packageName)}`);
    sharedNames.add(name);
    packageNames.add(String(raw.packageName));
  }
  if (!sharedNames.has('config') || !sharedNames.has('ui')) {
    throw new Error('Workspace sharedPackages must include config and ui.');
  }
}

export function normalizeWorkspaceRelativePath(value: string): string {
  const normalized = value.trim().replace(/\\/gu, '/').replace(/^\.\//u, '').replace(/\/$/u, '');
  if (!normalized || path.posix.isAbsolute(normalized) || /^[a-z]:/iu.test(normalized)) {
    throw new Error('Workspace paths must be safe relative paths.');
  }
  if (normalized.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Workspace path escapes the workspace root: ${value}`);
  }
  return normalized;
}

export function resolveWorkspacePath(workspacePath: string, relativePath: string): string {
  const root = path.resolve(workspacePath);
  const resolved = path.resolve(root, ...normalizeWorkspaceRelativePath(relativePath).split('/'));
  if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Workspace path escapes the workspace root: ${relativePath}`);
  }
  return resolved;
}

export async function readWorkspaceManifest(workspacePath: string): Promise<WorkspaceManifest | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path.join(workspacePath, WORKSPACE_MANIFEST_PATH), 'utf8'));
    validateWorkspaceManifest(parsed);
    return parsed;
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

export async function writeWorkspaceManifest(
  workspacePath: string,
  manifest: WorkspaceManifest,
  force = false
): Promise<WorkspaceWriteResult> {
  validateWorkspaceManifest(manifest);
  return writeIfAllowed(
    path.join(workspacePath, WORKSPACE_MANIFEST_PATH),
    `${JSON.stringify(manifest, null, 2)}\n`,
    force
  );
}

export async function discoverWorkspace(workspacePath: string): Promise<WorkspaceDiscovery | null> {
  const appDirectories = await readDirectories(path.join(workspacePath, 'apps'));
  if (appDirectories.length < 2) return null;
  const rootPackage = await readJson(path.join(workspacePath, 'package.json'));
  const displayName = titleFromSlug(
    typeof rootPackage?.name === 'string' ? rootPackage.name.replace(/^@[^/]+\//u, '') : path.basename(workspacePath)
  );
  const packageScope = inferPackageScope(rootPackage, workspacePath);
  const appInputs: WorkspaceAppInput[] = [];
  for (const directory of appDirectories) {
    const packageJson = await readJson(path.join(workspacePath, 'apps', directory, 'package.json'));
    const dependencies = {
      ...(isRecord(packageJson?.dependencies) ? packageJson.dependencies : {}),
      ...(isRecord(packageJson?.devDependencies) ? packageJson.devDependencies : {}),
    };
    const expo = typeof dependencies.expo === 'string';
    appInputs.push({
      displayName: titleFromSlug(directory),
      slug: directory,
      kind: expo ? 'expo' : 'non-expo',
      purpose: `Existing ${expo ? 'Expo application' : 'application'} at apps/${directory}.`,
      ...(expo ? {} : { category: 'other' as const }),
    });
  }
  if (!appInputs.some((entry) => entry.kind === 'expo')) return null;
  const packageDirectories = await readDirectories(path.join(workspacePath, 'packages'));
  const optionalSharedPackages = packageDirectories
    .map(inferSharedPackageRole)
    .filter((role): role is SharedWorkspacePackageRole => role !== null && role !== 'config' && role !== 'ui-theme');
  const manifest = createWorkspaceManifest({
    displayName,
    slug: slugifyWorkspaceName(path.basename(workspacePath)),
    packageScope,
    packageManager: await detectWorkspacePackageManager(workspacePath, rootPackage),
    apps: appInputs,
    optionalSharedPackages,
  });
  return {
    manifest,
    hasTurboConfig: await pathExists(path.join(workspacePath, 'turbo.json')),
    hasWorkspaceConfig:
      (await pathExists(path.join(workspacePath, 'pnpm-workspace.yaml'))) || Array.isArray(rootPackage?.workspaces),
  };
}

export async function scaffoldWorkspaceMemory(
  workspacePath: string,
  manifest: WorkspaceManifest,
  force = false
): Promise<WorkspaceWriteResult[]> {
  validateWorkspaceManifest(manifest);
  await mkdir(path.join(workspacePath, 'project'), { recursive: true });
  const results = [
    await writeWorkspaceManifest(workspacePath, manifest, force),
    await writeIfAllowed(path.join(workspacePath, 'project', 'info.md'), renderRootInfo(manifest), force),
    await writeIfAllowed(path.join(workspacePath, 'project', 'style.md'), renderRootStyle(manifest), force),
    await writeIfAllowed(path.join(workspacePath, 'project', 'guidelines.md'), renderRootGuidelines(manifest), force),
    await writeIfAllowed(path.join(workspacePath, 'project', 'todo.md'), renderRootTodo(manifest), force),
    await writeIfAllowed(path.join(workspacePath, 'AGENTS.md'), renderAgents(manifest), force),
    await writeIfAllowed(path.join(workspacePath, 'CLAUDE.md'), `# ${manifest.displayName}\n\nFollow AGENTS.md and treat project/workspace.json as the app and package registry.\n`, force),
  ];
  for (const app of manifest.apps) {
    const appRoot = resolveWorkspacePath(workspacePath, app.path);
    if (!(await pathExists(appRoot))) continue;
    await mkdir(path.join(appRoot, 'project'), { recursive: true });
    results.push(
      await writeIfAllowed(path.join(appRoot, 'project', 'info.md'), renderAppInfo(app), force),
      await writeIfAllowed(path.join(appRoot, 'project', 'style.md'), renderAppStyle(manifest, app), force),
      await writeIfAllowed(path.join(appRoot, 'project', 'guidelines.md'), renderAppGuidelines(manifest, app), force),
      await writeIfAllowed(path.join(appRoot, 'project', 'todo.md'), renderAppTodo(app), force)
    );
  }
  return results;
}

function createSharedPackage(role: SharedWorkspacePackageRole, scope: string): SharedWorkspacePackage {
  const name = role === 'ui-theme' ? 'ui' : role === 'hooks-state' ? 'hooks' : role === 'sdk-client' ? 'sdk' : role === 'database-schema' ? 'db' : 'config';
  return { name, packageName: `${scope}/${name}`, path: `packages/${name}`, role };
}

function normalizePackageScope(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^@[a-z0-9][a-z0-9._-]*$/u.test(normalized)) throw new Error('Workspace packageScope must look like @product.');
  return normalized;
}

function inferPackageScope(rootPackage: Record<string, unknown> | null, workspacePath: string): string {
  const rootName = typeof rootPackage?.name === 'string' ? rootPackage.name : '';
  const match = /^(@[^/]+)\//u.exec(rootName);
  return match?.[1] ?? derivePackageScope(path.basename(workspacePath));
}

function inferSharedPackageRole(name: string): SharedWorkspacePackageRole | null {
  if (name === 'config') return 'config';
  if (name === 'ui' || name === 'theme') return 'ui-theme';
  if (name === 'hooks' || name === 'state') return 'hooks-state';
  if (name === 'sdk' || name === 'api') return 'sdk-client';
  if (name === 'db' || name === 'database') return 'database-schema';
  return null;
}

async function detectWorkspacePackageManager(
  workspacePath: string,
  rootPackage: Record<string, unknown> | null
): Promise<WorkspacePackageManager> {
  const declared = typeof rootPackage?.packageManager === 'string' ? rootPackage.packageManager.split('@')[0] : undefined;
  if (declared === 'pnpm' || declared === 'npm' || declared === 'yarn' || declared === 'bun') return declared;
  if (await pathExists(path.join(workspacePath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await pathExists(path.join(workspacePath, 'yarn.lock'))) return 'yarn';
  if ((await pathExists(path.join(workspacePath, 'bun.lock'))) || (await pathExists(path.join(workspacePath, 'bun.lockb')))) return 'bun';
  return 'npm';
}

async function readDirectories(directory: string): Promise<string[]> {
  try {
    return (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (isMissingFileError(error)) return [];
    throw error;
  }
}

async function readJson(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    return isRecord(value) ? value : null;
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMissingFileError(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT';
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeIfAllowed(filePath: string, content: string, force: boolean): Promise<WorkspaceWriteResult> {
  if (!force && (await pathExists(filePath))) return { filePath, wrote: false };
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
  return { filePath, wrote: true };
}

function titleFromSlug(value: string): string {
  return value.split(/[-_\s]+/u).filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ');
}

function renderRootInfo(manifest: WorkspaceManifest): string {
  return `# ${manifest.displayName} Workspace\n\n## Architecture\n- Package scope: ${manifest.packageScope}\n- Package manager: ${manifest.packageManager}\n- Apps: apps/*\n- Shared code: packages/*\n\n## Applications\n${manifest.apps.map((app) => `- ${app.displayName} (${app.path}): ${app.kind} - ${app.purpose}`).join('\n')}\n`;
}

function renderRootStyle(manifest: WorkspaceManifest): string {
  return `# ${manifest.displayName} Shared Style\n\n${manifest.sharedDesignDirection}\n\nCanonical design data belongs in project/theme.json and ${manifest.packageScope}/ui when generation is enabled.\n`;
}

function renderRootGuidelines(manifest: WorkspaceManifest): string {
  return `# ${manifest.displayName} Workspace Guidelines\n\n- Read root project memory first, then the nearest app project memory.\n- Keep app-specific code in apps/*.\n- Put code in packages/* only when at least two apps share it.\n- Use ${manifest.packageScope}/* imports across package boundaries.\n`;
}

function renderRootTodo(manifest: WorkspaceManifest): string {
  return `# ${manifest.displayName} Workspace TODO\n\n- [ ] Confirm project/workspace.json classifications and responsibilities.\n- [ ] Review each app's project/todo.md.\n- [ ] Run aggregate workspace Doctor.\n`;
}

function renderAgents(manifest: WorkspaceManifest): string {
  return `# ${manifest.displayName} Agent Instructions\n\nRead root project/info.md, style.md, guidelines.md, todo.md, and workspace.json. Inside an app, then read the nearest app project memory before editing.\n`;
}

function renderAppInfo(app: WorkspaceApp): string {
  return `# ${app.displayName}\n\n- Workspace path: ${app.path}\n- Kind: ${app.kind}\n- Purpose: ${app.purpose}\n`;
}

function renderAppStyle(manifest: WorkspaceManifest, app: WorkspaceApp): string {
  return `# ${app.displayName} Style Overrides\n\nRead the ${manifest.displayName} root style and canonical theme first. Record only intentional app-specific overrides here.\n`;
}

function renderAppGuidelines(manifest: WorkspaceManifest, app: WorkspaceApp): string {
  return `# ${app.displayName} Guidelines\n\n- Follow root workspace guidance first.\n- Keep ${app.displayName} routes, screens, and features inside ${app.path}.\n- Use ${manifest.packageScope}/* only for declared shared packages.\n`;
}

function renderAppTodo(app: WorkspaceApp): string {
  return `# ${app.displayName} TODO\n\n- [ ] Replace the discovered purpose with complete app-specific product context.\n- [ ] Plan the first implementation phase for ${app.displayName}.\n`;
}
