import {
  access,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  normalizeWorkspaceRelativePath as normalizeCanonicalWorkspaceRelativePath,
  resolveWorkspacePath as resolveCanonicalWorkspacePath,
  validateWorkspaceManifest as validateCanonicalWorkspaceManifest,
} from "@mr.dj2u/doctor/workspace-manifest";

export type ProjectShape = "single-expo-app" | "multi-app-workspace";
export type WorkspacePackageManager = "npm" | "pnpm" | "yarn" | "bun";
export type WorkspaceStylingSystem =
  | "uniwind"
  | "nativewind"
  | "nativewindui"
  | "tamagui"
  | "restyle"
  | "stylesheet";
export type WorkspaceAppKind = "expo" | "non-expo";
export type NonExpoAppCategory = "website" | "backend" | "worker" | "other";
export type SharedWorkspacePackageRole =
  | "config"
  | "ui-theme"
  | "hooks-state"
  | "sdk-client"
  | "database-schema";

export interface WorkspaceApp {
  id: string;
  displayName: string;
  packageName?: string;
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
  taskRunner: "turbo";
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

export const WORKSPACE_MANIFEST_PATH = path.join("project", "workspace.json");
export const DEFAULT_EXPO_PORT = 8081;

export function slugifyWorkspaceName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['’]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .replace(/-{2,}/gu, "-");
  if (!slug) {
    throw new Error(
      "Workspace and app names must contain at least one letter or number.",
    );
  }
  return slug;
}

export function derivePackageScope(workspaceName: string): string {
  return `@${slugifyWorkspaceName(workspaceName)}`;
}

export function createWorkspaceManifest(
  input: WorkspaceManifestInput,
): WorkspaceManifest {
  const name = slugifyWorkspaceName(input.slug ?? input.displayName);
  const packageScope = normalizePackageScope(
    input.packageScope ?? derivePackageScope(name),
  );
  let nextPort = DEFAULT_EXPO_PORT;
  const apps = input.apps.map((app): WorkspaceApp => {
    const id = slugifyWorkspaceName(app.slug ?? app.displayName);
    const isExpo = app.kind === "expo";
    return {
      id,
      displayName: app.displayName.trim(),
      packageName: `${packageScope}/${id}`,
      path: `apps/${id}`,
      kind: app.kind,
      purpose: app.purpose.trim(),
      ...(isExpo
        ? {
            platforms: app.platforms ?? ["web", "ios", "android"],
            port: nextPort++,
          }
        : {}),
      ...(!isExpo && app.category ? { category: app.category } : {}),
      ...(!isExpo && app.intendedStack?.trim()
        ? { intendedStack: app.intendedStack.trim() }
        : {}),
    };
  });
  const roles = new Set<SharedWorkspacePackageRole>([
    "config",
    "ui-theme",
    ...(input.optionalSharedPackages ?? []),
  ]);
  const sharedPackages = [...roles].map((role) =>
    createSharedPackage(role, packageScope),
  );
  const manifest: WorkspaceManifest = {
    schemaVersion: 1,
    name,
    displayName: input.displayName.trim(),
    packageScope,
    packageManager: input.packageManager ?? "pnpm",
    expoVersion: input.expoVersion?.trim() || "^56.0.0",
    stylingSystem: input.stylingSystem ?? "uniwind",
    sharedDesignDirection:
      input.sharedDesignDirection?.trim() ||
      "Use one accessible theme and component foundation across every product surface.",
    taskRunner: "turbo",
    apps,
    sharedPackages,
  };
  validateWorkspaceManifest(manifest);
  return manifest;
}

export function validateWorkspaceManifest(
  value: unknown,
): asserts value is WorkspaceManifest {
  validateCanonicalWorkspaceManifest(value);
}

export function normalizeWorkspaceRelativePath(value: string): string {
  return normalizeCanonicalWorkspaceRelativePath(value);
}

export function resolveWorkspacePath(
  workspacePath: string,
  relativePath: string,
): string {
  return resolveCanonicalWorkspacePath(workspacePath, relativePath);
}

export async function readWorkspaceManifest(
  workspacePath: string,
): Promise<WorkspaceManifest | null> {
  try {
    const text = await readFile(
      path.join(workspacePath, WORKSPACE_MANIFEST_PATH),
      "utf8",
    );
    const value: unknown = JSON.parse(text);
    validateWorkspaceManifest(value);
    return value;
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function writeWorkspaceManifest(
  workspacePath: string,
  manifest: WorkspaceManifest,
  force = false,
): Promise<WorkspaceWriteResult> {
  validateWorkspaceManifest(manifest);
  const filePath = path.join(workspacePath, WORKSPACE_MANIFEST_PATH);
  await mkdir(path.dirname(filePath), { recursive: true });
  return writeIfAllowed(
    filePath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    force,
  );
}

export async function discoverWorkspace(
  workspacePath: string,
): Promise<WorkspaceDiscovery | null> {
  const rootPackage = await readJson(path.join(workspacePath, "package.json"));
  const appEntries = await readDirectories(path.join(workspacePath, "apps"));
  if (appEntries.length < 2) {
    return null;
  }
  const packageManager = await detectWorkspacePackageManager(
    workspacePath,
    rootPackage,
  );
  const rootName =
    typeof rootPackage?.name === "string"
      ? rootPackage.name
      : path.basename(workspacePath);
  const displayName = titleFromSlug(rootName.replace(/^@[^/]+\//u, ""));
  const packageEntries = await readDirectories(
    path.join(workspacePath, "packages"),
  );
  let scope = derivePackageScope(
    rootName.replace(/^@/u, "").replace(/\//gu, "-"),
  );
  for (const entry of packageEntries) {
    const packageJson = await readJson(
      path.join(workspacePath, "packages", entry, "package.json"),
    );
    const packageName =
      typeof packageJson?.name === "string" ? packageJson.name : "";
    const match = /^(@[^/]+)\//u.exec(packageName);
    if (match?.[1]) {
      scope = normalizePackageScope(match[1]);
      break;
    }
  }
  const apps: WorkspaceAppInput[] = [];
  const discoveredPackageNames = new Map<string, string>();
  for (const entry of appEntries) {
    const packageJson = await readJson(
      path.join(workspacePath, "apps", entry, "package.json"),
    );
    const dependencies = {
      ...(isRecord(packageJson?.dependencies) ? packageJson.dependencies : {}),
      ...(isRecord(packageJson?.devDependencies)
        ? packageJson.devDependencies
        : {}),
    };
    const isExpo = typeof dependencies.expo === "string";
    if (typeof packageJson?.name === "string" && packageJson.name.trim())
      discoveredPackageNames.set(
        slugifyWorkspaceName(entry),
        packageJson.name.trim(),
      );
    const purpose =
      (typeof packageJson?.description === "string" &&
        packageJson.description.trim()) ||
      `${titleFromSlug(entry)} application in the ${displayName} workspace.`;
    apps.push({
      displayName: titleFromSlug(entry),
      slug: entry,
      kind: isExpo ? "expo" : "non-expo",
      purpose,
      ...(isExpo
        ? { platforms: ["web", "ios", "android"] }
        : { category: "other" }),
    });
  }
  const manifest = createWorkspaceManifest({
    displayName,
    slug: slugifyWorkspaceName(rootName.replace(/^@[^/]+\//u, "")),
    packageScope: scope,
    packageManager,
    apps,
  });
  for (const app of manifest.apps) {
    app.packageName = discoveredPackageNames.get(app.id) ?? app.packageName;
  }
  for (const entry of packageEntries) {
    const packageJson = await readJson(
      path.join(workspacePath, "packages", entry, "package.json"),
    );
    const name = slugifyWorkspaceName(entry);
    const packageName =
      typeof packageJson?.name === "string" && packageJson.name.trim()
        ? packageJson.name.trim()
        : `${scope}/${name}`;
    if (manifest.sharedPackages.some((item) => item.name === name)) continue;
    manifest.sharedPackages.push({
      name,
      packageName,
      path: `packages/${name}`,
      role: inferSharedPackageRole(name),
    });
  }
  validateWorkspaceManifest(manifest);
  return {
    manifest,
    hasTurboConfig: await pathExists(path.join(workspacePath, "turbo.json")),
    hasWorkspaceConfig:
      (await pathExists(path.join(workspacePath, "pnpm-workspace.yaml"))) ||
      Array.isArray(rootPackage?.workspaces),
  };
}

export async function scaffoldWorkspaceRoot(
  workspacePath: string,
  manifest: WorkspaceManifest,
  options: { force?: boolean; existing?: boolean } = {},
): Promise<WorkspaceWriteResult[]> {
  validateWorkspaceManifest(manifest);
  const force = options.force ?? false;
  const results: WorkspaceWriteResult[] = [];
  await mkdir(workspacePath, { recursive: true });
  await mkdir(path.join(workspacePath, "apps"), { recursive: true });
  await mkdir(path.join(workspacePath, "packages"), { recursive: true });
  await mkdir(path.join(workspacePath, "project"), { recursive: true });

  results.push(await writeWorkspaceManifest(workspacePath, manifest, force));
  results.push(
    await writeIfAllowed(
      path.join(workspacePath, "project", "info.md"),
      renderWorkspaceInfo(manifest),
      force,
    ),
    await writeIfAllowed(
      path.join(workspacePath, "project", "style.md"),
      renderWorkspaceStyle(manifest),
      force,
    ),
    await writeIfAllowed(
      path.join(workspacePath, "project", "guidelines.md"),
      renderWorkspaceGuidelines(manifest),
      force,
    ),
    await writeIfAllowed(
      path.join(workspacePath, "project", "todo.md"),
      renderWorkspaceTodo(manifest),
      force,
    ),
    await writeIfAllowed(
      path.join(workspacePath, "project", "theme.json"),
      `${JSON.stringify(defaultWorkspaceTheme(), null, 2)}\n`,
      force,
    ),
    await writeIfAllowed(
      path.join(workspacePath, "AGENTS.md"),
      renderWorkspaceAgents(manifest),
      force,
    ),
    await writeIfAllowed(
      path.join(workspacePath, "CLAUDE.md"),
      renderWorkspaceClaude(manifest),
      force,
    ),
    await writeIfAllowed(
      path.join(workspacePath, ".github", "workflows", "mds-pr-checks.yml"),
      renderWorkspaceCiWorkflow(manifest),
      force,
    ),
    await writeIfAllowed(
      path.join(workspacePath, "project", "release-flow.md"),
      renderWorkspaceReleaseFlow(manifest),
      force,
    ),
  );

  if (!options.existing) {
    results.push(
      await writeIfAllowed(
        path.join(workspacePath, "package.json"),
        renderRootPackageJson(manifest),
        force,
      ),
      await writeIfAllowed(
        path.join(workspacePath, "turbo.json"),
        renderTurboConfig(),
        force,
      ),
      await writeIfAllowed(
        path.join(workspacePath, "tsconfig.base.json"),
        renderBaseTsconfig(manifest),
        force,
      ),
      await writeIfAllowed(
        path.join(workspacePath, ".gitignore"),
        renderWorkspaceGitignore(),
        force,
      ),
      await writeIfAllowed(
        path.join(workspacePath, "README.md"),
        renderWorkspaceReadme(manifest),
        force,
      ),
    );
    if (manifest.packageManager === "pnpm") {
      results.push(
        await writeIfAllowed(
          path.join(workspacePath, "pnpm-workspace.yaml"),
          'packages:\n  - "apps/*"\n  - "packages/*"\n\n# Expo workspaces are most predictable with one hoisted native dependency graph.\nnodeLinker: hoisted\n',
          force,
        ),
        await writeIfAllowed(
          path.join(workspacePath, ".npmrc"),
          "node-linker=hoisted\n",
          force,
        ),
      );
    }
  }

  results.push(
    ...(await scaffoldSharedConfigPackage(workspacePath, manifest, force)),
  );
  results.push(
    ...(await scaffoldSharedUiPackage(workspacePath, manifest, force)),
  );
  for (const sharedPackage of manifest.sharedPackages) {
    if (sharedPackage.role === "hooks-state") {
      results.push(
        ...(await scaffoldHooksPackage(workspacePath, sharedPackage, force)),
      );
    }
    if (sharedPackage.role === "sdk-client") {
      results.push(
        ...(await scaffoldSdkPackage(workspacePath, sharedPackage, force)),
      );
    }
    if (sharedPackage.role === "database-schema") {
      results.push(
        ...(await scaffoldDatabasePackage(workspacePath, sharedPackage, force)),
      );
    }
  }
  for (const app of manifest.apps.filter(
    (entry) => entry.kind === "non-expo",
  )) {
    results.push(
      ...(await scaffoldRegisteredAppMemory(
        workspacePath,
        manifest,
        app,
        force,
      )),
    );
  }
  return results;
}

export async function scaffoldWorkspaceMemory(
  workspacePath: string,
  manifest: WorkspaceManifest,
  force = false,
): Promise<WorkspaceWriteResult[]> {
  validateWorkspaceManifest(manifest);
  await mkdir(path.join(workspacePath, "project"), { recursive: true });
  const results: WorkspaceWriteResult[] = [
    await writeWorkspaceManifest(workspacePath, manifest, force),
    await writeIfAllowed(path.join(workspacePath, "project", "info.md"), renderWorkspaceInfo(manifest), force),
    await writeIfAllowed(path.join(workspacePath, "project", "style.md"), renderWorkspaceStyle(manifest), force),
    await writeIfAllowed(path.join(workspacePath, "project", "guidelines.md"), renderWorkspaceGuidelines(manifest), force),
    await writeIfAllowed(path.join(workspacePath, "project", "todo.md"), renderWorkspaceTodo(manifest), force),
    await writeIfAllowed(path.join(workspacePath, "AGENTS.md"), renderWorkspaceAgents(manifest), force),
    await writeIfAllowed(path.join(workspacePath, "CLAUDE.md"), renderWorkspaceClaude(manifest), force),
  ];
  for (const app of manifest.apps) {
    const appRoot = resolveWorkspacePath(workspacePath, app.path);
    if (!(await pathExists(appRoot))) continue;
    const projectDir = path.join(appRoot, "project");
    await mkdir(projectDir, { recursive: true });
    results.push(
      await writeIfAllowed(
        path.join(projectDir, "info.md"),
        `# ${app.displayName}\n\n- Workspace path: ${app.path}\n- Kind: ${app.kind}\n- Purpose: ${app.purpose}\n`,
        force,
      ),
      await writeIfAllowed(
        path.join(projectDir, "style.md"),
        `# ${app.displayName} Style Overrides\n\nRead the workspace root style and canonical theme first. Record only intentional app-specific overrides here.\n`,
        force,
      ),
      await writeIfAllowed(
        path.join(projectDir, "guidelines.md"),
        `# ${app.displayName} Guidelines\n\nRead root project memory first. Keep app-specific routes, screens, and features inside ${app.path}.\n`,
        force,
      ),
      await writeIfAllowed(
        path.join(projectDir, "todo.md"),
        `# ${app.displayName} TODO\n\n- [ ] Replace discovered context with a complete app-specific plan.\n`,
        force,
      ),
    );
  }
  return results;
}

export async function wireGeneratedExpoApp(
  workspacePath: string,
  manifest: WorkspaceManifest,
  app: WorkspaceApp,
): Promise<WorkspaceWriteResult[]> {
  if (app.kind !== "expo")
    throw new Error(`Cannot wire non-Expo app ${app.id} as Expo.`);
  const appPath = resolveWorkspacePath(workspacePath, app.path);
  const packagePath = path.join(appPath, "package.json");
  const packageJson = (await readJson(packagePath)) ?? {};
  const tsconfigPath = path.join(appPath, "tsconfig.json");
  const tsconfig = (await readJson(tsconfigPath)) ?? {};
  const existingCompilerOptions = isRecord(tsconfig.compilerOptions)
    ? tsconfig.compilerOptions
    : {};
  const { baseUrl: _baseUrl, ...compilerOptions } = existingCompilerOptions;
  const existingPaths = isRecord(compilerOptions.paths)
    ? compilerOptions.paths
    : {};
  const existingIncludes = Array.isArray(tsconfig.include)
    ? tsconfig.include.filter(
        (entry): entry is string => typeof entry === "string",
      )
    : [];
  const scripts = isRecord(packageJson.scripts) ? packageJson.scripts : {};
  packageJson.name = resolveWorkspaceAppPackageName(manifest, app);
  packageJson.private = true;
  packageJson.scripts = {
    ...scripts,
    dev: `expo start --port ${app.port}`,
    build:
      typeof scripts.build === "string"
        ? scripts.build
        : "expo export --platform web",
    typecheck:
      typeof scripts.typecheck === "string"
        ? scripts.typecheck
        : "tsc --noEmit",
    clean:
      typeof scripts.clean === "string"
        ? scripts.clean
        : "rimraf dist .expo .turbo node_modules/.cache",
  };
  const dependencies = isRecord(packageJson.dependencies)
    ? packageJson.dependencies
    : {};
  packageJson.dependencies = {
    ...dependencies,
    ...(manifest.expoVersion.startsWith("~56.") ||
    manifest.expoVersion.startsWith("^56.")
      ? { "react-native-screens": "~4.26.0" }
      : {}),
    [`${manifest.packageScope}/config`]: "workspace:*",
    [`${manifest.packageScope}/ui`]: "workspace:*",
  };
  const results = [
    await writeFileResult(
      packagePath,
      `${JSON.stringify(packageJson, null, 2)}\n`,
    ),
    await writeFileResult(
      path.join(appPath, "metro.config.cjs"),
      `const { createMonorepoMetroConfig } = require('${manifest.packageScope}/config/metro');\n\nmodule.exports = createMonorepoMetroConfig(__dirname, {\n  cssEntryFile: './global.css',\n});\n`,
    ),
    await writeFileResult(
      tsconfigPath,
      `${JSON.stringify(
        {
          ...tsconfig,
          extends: "../../tsconfig.base.json",
          compilerOptions: {
            ...compilerOptions,
            paths: { ...existingPaths, "@/*": ["./src/*"] },
          },
          include: [
            ...new Set([
              ...existingIncludes,
              "**/*.ts",
              "**/*.tsx",
              ".expo/types/**/*.ts",
              "expo-env.d.ts",
              "uniwind-types.d.ts",
            ]),
          ],
          exclude: ["node_modules/**"],
        },
        null,
        2,
      )}\n`,
    ),
    await writeFileResult(
      path.join(appPath, "src", "theme", "workspace-theme.ts"),
      `export { Container, sharedTheme } from '${manifest.packageScope}/ui';\n`,
    ),
  ];
  await rm(path.join(appPath, "metro.config.js"), { force: true });
  for (const item of [
    ".git",
    "node_modules",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
    ".npmrc",
  ]) {
    await rm(path.join(appPath, item), { recursive: true, force: true });
  }
  return results;
}

function createSharedPackage(
  role: SharedWorkspacePackageRole,
  packageScope: string,
): SharedWorkspacePackage {
  const name =
    role === "ui-theme"
      ? "ui"
      : role === "hooks-state"
        ? "hooks"
        : role === "sdk-client"
          ? "sdk"
          : role === "database-schema"
            ? "db"
            : "config";
  return {
    name,
    packageName: `${packageScope}/${name}`,
    path: `packages/${name}`,
    role,
  };
}

function normalizePackageScope(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^@[a-z0-9][a-z0-9._-]*$/u.test(normalized)) {
    throw new Error(`Invalid workspace package scope: ${value}`);
  }
  return normalized;
}

function inferSharedPackageRole(name: string): SharedWorkspacePackageRole {
  const normalized = slugifyWorkspaceName(name);
  if (normalized === "ui" || normalized === "theme" || normalized === "ui-theme")
    return "ui-theme";
  if (normalized === "hooks" || normalized === "state") return "hooks-state";
  if (normalized === "sdk" || normalized === "api") return "sdk-client";
  if (normalized === "db" || normalized === "database") return "database-schema";
  return "config";
}

function resolveWorkspaceAppPackageName(
  manifest: WorkspaceManifest,
  app: WorkspaceApp,
): string {
  return app.packageName?.trim() || `${manifest.packageScope}/${app.id}`;
}

async function scaffoldSharedConfigPackage(
  workspacePath: string,
  manifest: WorkspaceManifest,
  force: boolean,
): Promise<WorkspaceWriteResult[]> {
  const root = path.join(workspacePath, "packages", "config");
  await mkdir(path.join(root, "src"), { recursive: true });
  return [
    await writeIfAllowed(
      path.join(root, "package.json"),
      `${JSON.stringify(
        {
          name: `${manifest.packageScope}/config`,
          version: "0.0.0",
          private: true,
          main: "src/index.ts",
          types: "src/index.ts",
          exports: {
            ".": "./src/index.ts",
            "./metro": "./src/metro.cjs",
            "./eslint": "./eslint.config.mjs",
            "./prettier": "./prettier.config.mjs",
            "./tsconfig": "./tsconfig.base.json",
          },
          scripts: { typecheck: "tsc --noEmit", clean: "rimraf dist .turbo" },
        },
        null,
        2,
      )}\n`,
      force,
    ),
    await writeIfAllowed(
      path.join(root, "src", "index.ts"),
      `export const workspaceName = '${manifest.name}' as const;\n`,
      force,
    ),
    await writeIfAllowed(
      path.join(root, "src", "metro.cjs"),
      renderMetroFactory(),
      force,
    ),
    await writeIfAllowed(
      path.join(root, "eslint.config.mjs"),
      "export default [\n  { ignores: ['dist/**', '.expo/**', '.turbo/**'] },\n  { rules: { 'no-console': 'warn', 'no-debugger': 'error' } },\n];\n",
      force,
    ),
    await writeIfAllowed(
      path.join(root, "prettier.config.mjs"),
      "export default { singleQuote: true, trailingComma: 'es5', printWidth: 100 };\n",
      force,
    ),
    await writeIfAllowed(
      path.join(root, "tsconfig.base.json"),
      `${JSON.stringify(
        {
          compilerOptions: {
            strict: true,
            esModuleInterop: true,
            jsx: "react-jsx",
            moduleResolution: "bundler",
            module: "ESNext",
            target: "ES2022",
            lib: ["ES2022", "DOM"],
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
          },
        },
        null,
        2,
      )}\n`,
      force,
    ),
    await writeIfAllowed(
      path.join(root, "tsconfig.json"),
      `${JSON.stringify({ extends: "../../tsconfig.base.json", include: ["src/**/*"] }, null, 2)}\n`,
      force,
    ),
  ];
}

async function scaffoldSharedUiPackage(
  workspacePath: string,
  manifest: WorkspaceManifest,
  force: boolean,
): Promise<WorkspaceWriteResult[]> {
  const root = path.join(workspacePath, "packages", "ui");
  await mkdir(path.join(root, "src"), { recursive: true });
  return [
    await writeIfAllowed(
      path.join(root, "package.json"),
      `${JSON.stringify(
        {
          name: `${manifest.packageScope}/ui`,
          version: "0.0.0",
          private: true,
          main: "src/index.ts",
          types: "src/index.ts",
          exports: { ".": "./src/index.ts", "./theme": "./src/theme.ts" },
          scripts: { typecheck: "tsc --noEmit", clean: "rimraf dist .turbo" },
        },
        null,
        2,
      )}\n`,
      force,
    ),
    await writeIfAllowed(
      path.join(root, "src", "theme.ts"),
      "export const sharedTheme = {\n  colors: { background: '#ffffff', foreground: '#111827', primary: '#2563eb', secondary: '#0f766e' },\n  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },\n  radius: { sm: 4, md: 8 },\n} as const;\n",
      force,
    ),
    await writeIfAllowed(
      path.join(root, "src", "container.tsx"),
      "import type { PropsWithChildren } from 'react';\nimport { View, type ViewProps } from 'react-native';\n\nexport function Container({ children, ...props }: PropsWithChildren<ViewProps>) {\n  return <View {...props}>{children}</View>;\n}\n",
      force,
    ),
    await writeIfAllowed(
      path.join(root, "src", "index.ts"),
      "export { Container } from './container';\nexport { sharedTheme } from './theme';\n",
      force,
    ),
    await writeIfAllowed(
      path.join(root, "tsconfig.json"),
      `${JSON.stringify({ extends: "../../tsconfig.base.json", include: ["src/**/*"] }, null, 2)}\n`,
      force,
    ),
  ];
}

async function scaffoldHooksPackage(
  workspacePath: string,
  sharedPackage: SharedWorkspacePackage,
  force: boolean,
): Promise<WorkspaceWriteResult[]> {
  const root = path.join(workspacePath, sharedPackage.path);
  return scaffoldTypeScriptPackage(root, sharedPackage, force, {
    source:
      "import { useEffect, useState } from 'react';\n\nexport function useMounted(): boolean {\n  const [mounted, setMounted] = useState(false);\n  useEffect(() => {\n    setMounted(true);\n  }, []);\n  return mounted;\n}\n",
    peerDependencies: { react: ">=18" },
  });
}

async function scaffoldSdkPackage(
  workspacePath: string,
  sharedPackage: SharedWorkspacePackage,
  force: boolean,
): Promise<WorkspaceWriteResult[]> {
  const root = path.join(workspacePath, sharedPackage.path);
  return scaffoldTypeScriptPackage(root, sharedPackage, force, {
    source:
      "export class ApiError extends Error {\n  constructor(\n    message: string,\n    readonly status: number,\n    readonly body?: unknown\n  ) {\n    super(message);\n    this.name = 'ApiError';\n  }\n}\n\nexport async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {\n  const response = await fetch(input, init);\n  const body: unknown = await response.json().catch(() => undefined);\n  if (!response.ok) throw new ApiError(`Request failed with status ${response.status}`, response.status, body);\n  return body as T;\n}\n",
  });
}

async function scaffoldDatabasePackage(
  workspacePath: string,
  sharedPackage: SharedWorkspacePackage,
  force: boolean,
): Promise<WorkspaceWriteResult[]> {
  const root = path.join(workspacePath, sharedPackage.path);
  return scaffoldTypeScriptPackage(root, sharedPackage, force, {
    source:
      "export interface DatabaseRecord {\n  id: string;\n  createdAt: string;\n  updatedAt: string;\n}\n\nexport interface DatabaseRepository<TRecord extends DatabaseRecord> {\n  findById(id: string): Promise<TRecord | null>;\n  save(record: TRecord): Promise<TRecord>;\n}\n",
  });
}

async function scaffoldTypeScriptPackage(
  root: string,
  sharedPackage: SharedWorkspacePackage,
  force: boolean,
  options: { source: string; peerDependencies?: Record<string, string> },
): Promise<WorkspaceWriteResult[]> {
  await mkdir(path.join(root, "src"), { recursive: true });
  return [
    await writeIfAllowed(
      path.join(root, "package.json"),
      `${JSON.stringify(
        {
          name: sharedPackage.packageName,
          version: "0.0.0",
          private: true,
          main: "src/index.ts",
          types: "src/index.ts",
          exports: { ".": "./src/index.ts" },
          scripts: { typecheck: "tsc --noEmit", clean: "rimraf dist .turbo" },
          ...(options.peerDependencies
            ? { peerDependencies: options.peerDependencies }
            : {}),
        },
        null,
        2,
      )}\n`,
      force,
    ),
    await writeIfAllowed(
      path.join(root, "src", "index.ts"),
      options.source,
      force,
    ),
    await writeIfAllowed(
      path.join(root, "tsconfig.json"),
      `${JSON.stringify({ extends: "../../tsconfig.base.json", include: ["src/**/*"] }, null, 2)}\n`,
      force,
    ),
  ];
}

async function scaffoldRegisteredAppMemory(
  workspacePath: string,
  manifest: WorkspaceManifest,
  app: WorkspaceApp,
  force: boolean,
): Promise<WorkspaceWriteResult[]> {
  const projectDir = path.join(
    resolveWorkspacePath(workspacePath, app.path),
    "project",
  );
  await mkdir(projectDir, { recursive: true });
  const stack = app.intendedStack ?? "Not selected";
  return [
    await writeIfAllowed(
      path.join(projectDir, "info.md"),
      `# ${app.displayName} Project Info\n\n## Purpose\n${app.purpose}\n\n## Workspace\n- Workspace: ${manifest.displayName}\n- Path: ${app.path}\n- Kind: non-Expo ${app.category ?? "other"}\n- Intended stack: ${stack}\n- Status: registered; implementation has not been generated\n`,
      force,
    ),
    await writeIfAllowed(
      path.join(projectDir, "style.md"),
      `# ${app.displayName} Style\n\nInherit the shared visual foundation from the workspace root. Record intentional app-specific differences here.\n`,
      force,
    ),
    await writeIfAllowed(
      path.join(projectDir, "guidelines.md"),
      `# ${app.displayName} Guidelines\n\nRead the workspace project memory first. Do not invent a framework or application scaffold until the developer confirms the intended stack.\n`,
      force,
    ),
    await writeIfAllowed(
      path.join(projectDir, "todo.md"),
      `# ${app.displayName} TODO\n\n- [ ] Confirm the implementation stack for this ${app.category ?? "application"}.\n- [ ] Derive an implementation roadmap from this app's purpose and the workspace architecture.\n`,
      force,
    ),
  ];
}

function renderRootPackageJson(manifest: WorkspaceManifest): string {
  const scripts: Record<string, string> = {
    dev: "turbo run dev --ui=tui",
    build: "turbo run build --ui=tui",
    lint: "turbo run lint --ui=tui",
    test: "turbo run test --ui=tui",
    typecheck: "turbo run typecheck --ui=tui",
    clean: "turbo run clean --ui=tui",
    doctor: "mds doctor .",
  };
  for (const app of manifest.apps.filter((entry) => entry.kind === "expo")) {
    const packageName = resolveWorkspaceAppPackageName(manifest, app);
    scripts[`dev:${app.id}`] =
      `turbo run dev --filter=${packageName} --ui=tui`;
  }
  return `${JSON.stringify(
    {
      name: manifest.name,
      private: true,
      packageManager: workspacePackageManagerDescriptor(
        manifest.packageManager,
      ),
      workspaces: ["apps/*", "packages/*"],
      scripts,
      devDependencies: {
        rimraf: "^6.0.1",
        turbo: "^2.9.0",
        typescript: "^5.9.0",
      },
    },
    null,
    2,
  )}\n`;
}

function renderTurboConfig(): string {
  return `${JSON.stringify(
    {
      $schema: "https://turbo.build/schema.json",
      tasks: {
        build: { dependsOn: ["^build"], outputs: ["dist/**", ".expo/**"] },
        dev: { cache: false, persistent: true },
        lint: { dependsOn: ["^build"] },
        test: { dependsOn: ["^build"] },
        typecheck: { dependsOn: ["^build"] },
        clean: { cache: false },
      },
    },
    null,
    2,
  )}\n`;
}

function renderBaseTsconfig(manifest: WorkspaceManifest): string {
  const paths: Record<string, string[]> = {};
  for (const item of manifest.sharedPackages) {
    paths[item.packageName] = [`./${item.path}/src/index`];
    paths[`${item.packageName}/*`] = [`./${item.path}/src/*`];
  }
  return `${JSON.stringify(
    {
      extends: "./packages/config/tsconfig.base.json",
      compilerOptions: {
        paths,
      },
      exclude: ["node_modules", "dist", ".turbo"],
    },
    null,
    2,
  )}\n`;
}

function renderWorkspaceInfo(manifest: WorkspaceManifest): string {
  return [
    `# ${manifest.displayName} Workspace`,
    "",
    "## Overview",
    `${manifest.displayName} is a multi-app product workspace. This file owns ecosystem-wide context; each app owns its product-specific context in its own project directory.`,
    "",
    "## Architecture",
    `- Workspace slug: ${manifest.name}`,
    `- Package scope: ${manifest.packageScope}`,
    `- Package manager: ${manifest.packageManager}`,
    `- Expo version: ${manifest.expoVersion}`,
    `- Shared styling system: ${manifest.stylingSystem}`,
    "- Task runner: Turborepo",
    "- App directory: apps/*",
    "- Shared package directory: packages/*",
    "",
    "## Applications",
    ...manifest.apps.map(
      (app) =>
        `- ${app.displayName} (${app.path}): ${app.kind}${app.port ? `, port ${app.port}` : ""} - ${app.purpose}`,
    ),
    "",
    "## Shared Packages",
    ...manifest.sharedPackages.map(
      (item) => `- ${item.packageName} (${item.role}): ${item.path}`,
    ),
    "",
    "## Shared Product Decisions",
    "# TodoForContext(optional): Describe what the apps share as one product ecosystem, including users, identity, data, branding, and release coordination.",
    "",
  ].join("\n");
}

function renderWorkspaceStyle(manifest: WorkspaceManifest): string {
  return `# ${manifest.displayName} Shared Style\n\n## Visual Direction\n${manifest.sharedDesignDirection}\n\n## Styling System\n- Base system: ${manifest.stylingSystem}\n- Expo version: ${manifest.expoVersion}\n\n## Canonical Theme\n- Editable theme: project/theme.json\n- Runtime package: ${manifest.packageScope}/ui\n- App-specific project/style.md files may document intentional overrides without copying the shared token set.\n`;
}

function renderWorkspaceGuidelines(manifest: WorkspaceManifest): string {
  return `# ${manifest.displayName} Workspace Guidelines\n\n- Read root project memory before working anywhere in the workspace.\n- When working inside an app, also read that app's project/info.md, project/style.md, project/guidelines.md, and project/todo.md.\n- Keep routes, screens, and product features inside apps/*.\n- Put code in packages/* only when at least two apps share the responsibility.\n- Use ${manifest.packageScope}/* workspace dependencies instead of relative imports across app boundaries.\n- Run root commands through Turbo; use an app-specific dev command only when focusing on one app.\n- Do not create symlinks for shared application code.\n`;
}

function renderWorkspaceTodo(manifest: WorkspaceManifest): string {
  return [
    `# ${manifest.displayName} Workspace TODO`,
    "",
    "## Phase 0: Workspace Foundation",
    "- [ ] Review project/workspace.json and confirm every app, path, purpose, and shared package.",
    "- [ ] Resolve workspace-level TodoForContext markers.",
    "- [ ] Review every app-specific project memory set.",
    "- [ ] Run the aggregate workspace Doctor.",
    "- [ ] Optionally connect Turborepo remote caching with the team account; credentials are not generated by CESS.",
    "",
    "## App Roadmaps",
    ...manifest.apps.map(
      (app) => `- [ ] Review and execute ${app.path}/project/todo.md.`,
    ),
    "",
    "## Shared Architecture",
    "- [ ] Confirm which UI, auth/state, SDK, and database responsibilities genuinely belong in packages/*.",
    "- [ ] Keep app-specific code out of shared packages until a second consumer exists.",
    "",
  ].join("\n");
}

function renderWorkspaceAgents(manifest: WorkspaceManifest): string {
  return `# ${manifest.displayName} Agent Instructions\n\nBefore changing this workspace, read project/info.md, project/style.md, project/guidelines.md, project/todo.md, and project/workspace.json. When a task belongs to an app, then read the nearest ${"`apps/<app>/project/`"} memory files before editing. Root memory wins for shared architecture; app memory wins for product behavior inside that app.\n`;
}

function renderWorkspaceClaude(manifest: WorkspaceManifest): string {
  return `# ${manifest.displayName}\n\nFollow AGENTS.md. Treat project/workspace.json as the machine-readable app and package registry. Run checks from the workspace root unless a focused app command is explicitly requested.\n`;
}

function renderWorkspaceReadme(manifest: WorkspaceManifest): string {
  return [
    `# ${manifest.displayName}`,
    "",
    "Multi-app workspace generated by Create Expo Super Stack.",
    "",
    "## Apps",
    ...manifest.apps.map((app) => `- ${app.path} - ${app.purpose}`),
    "",
    "## Commands",
    "",
    `- ${runCommand(manifest.packageManager, "dev")} - start every generated app through Turbo`,
    ...manifest.apps
      .filter((app) => app.kind === "expo")
      .map(
        (app) =>
          `- ${runCommand(manifest.packageManager, `dev:${app.id}`)} - start ${app.displayName}`,
      ),
    `- ${runCommand(manifest.packageManager, "typecheck")} - type-check the workspace`,
    `- ${runCommand(manifest.packageManager, "test")} - run workspace tests`,
    "",
    "Turborepo task caching is configured. Connect remote caching separately with your own team credentials when desired.",
    "",
  ].join("\n");
}

function renderWorkspaceCiWorkflow(manifest: WorkspaceManifest): string {
  const cache = ['npm', 'pnpm', 'yarn'].includes(manifest.packageManager)
    ? `\n          cache: ${manifest.packageManager}`
    : '';
  const install =
    manifest.packageManager === "pnpm"
      ? "pnpm install --frozen-lockfile"
      : manifest.packageManager === "yarn"
        ? "yarn install --immutable"
        : manifest.packageManager === "bun"
          ? "bun install --frozen-lockfile"
          : "npm ci";
  const run = (script: string) =>
    manifest.packageManager === "npm"
      ? `npm run ${script}`
      : `${manifest.packageManager} ${script}`;
  return `name: MDS workspace checks\n\non:\n  pull_request:\n  push:\n    branches: [main, test]\n\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20${cache}\n      - run: corepack enable\n      - run: ${install}\n      - run: ${run("lint")}\n      - run: ${run("typecheck")}\n      - run: ${run("test")}\n      - run: ${run("build")}\n`;
}

function renderWorkspaceReleaseFlow(manifest: WorkspaceManifest): string {
  return `# ${manifest.displayName} Release Flow\n\nRun lint, typecheck, test, and build once from the workspace root. Turbo coordinates package tasks and caching. Connect remote caching separately with your own team credentials; CESS does not create or store those credentials.\n`;
}

function renderMetroFactory(): string {
  return "const path = require('path');\nconst { createRequire } = require('module');\n\nfunction createMonorepoMetroConfig(appDir, options = {}) {\n  const appRequire = createRequire(path.join(appDir, 'package.json'));\n  const { getDefaultConfig } = appRequire('expo/metro-config');\n  const config = getDefaultConfig(appDir);\n  config.resolver.alias = { '@': path.resolve(appDir, 'src') };\n  if (options.cssEntryFile) {\n    try {\n      const { withUniwindConfig } = appRequire('uniwind/metro');\n      return withUniwindConfig(config, { cssEntryFile: options.cssEntryFile });\n    } catch {\n      // The selected CESS styling system does not use Uniwind.\n    }\n  }\n  return config;\n}\n\nmodule.exports = { createMonorepoMetroConfig };\n";
}

function defaultWorkspaceTheme(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    colors: {
      light: {
        background: "#ffffff",
        foreground: "#111827",
        primary: "#2563eb",
        secondary: "#0f766e",
      },
      dark: {
        background: "#111827",
        foreground: "#f9fafb",
        primary: "#60a5fa",
        secondary: "#5eead4",
      },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    radius: { sm: 4, md: 8 },
  };
}

function renderWorkspaceGitignore(): string {
  return "node_modules/\n.turbo/\n.expo/\ndist/\n.env\n.env.local\n*.log\n";
}

function runCommand(manager: WorkspacePackageManager, script: string): string {
  if (manager === "npm") return `npm run ${script}`;
  if (manager === "bun") return `bun run ${script}`;
  return `${manager} ${script}`;
}

function workspacePackageManagerDescriptor(
  manager: WorkspacePackageManager,
): string {
  return {
    pnpm: "pnpm@8.14.0",
    npm: "npm@10.9.0",
    yarn: "yarn@1.22.22",
    bun: "bun@1.2.0",
  }[manager];
}

async function detectWorkspacePackageManager(
  workspacePath: string,
  packageJson: Record<string, unknown> | null,
): Promise<WorkspacePackageManager> {
  const declared =
    typeof packageJson?.packageManager === "string"
      ? packageJson.packageManager
      : "";
  for (const manager of ["pnpm", "yarn", "bun", "npm"] as const) {
    if (declared.startsWith(`${manager}@`)) return manager;
  }
  if (await pathExists(path.join(workspacePath, "pnpm-lock.yaml")))
    return "pnpm";
  if (await pathExists(path.join(workspacePath, "yarn.lock"))) return "yarn";
  if (
    (await pathExists(path.join(workspacePath, "bun.lock"))) ||
    (await pathExists(path.join(workspacePath, "bun.lockb")))
  )
    return "bun";
  return "npm";
}

async function readDirectories(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return [];
    throw error;
  }
}

async function readJson(
  filePath: string,
): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return null;
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeIfAllowed(
  filePath: string,
  content: string,
  force: boolean,
): Promise<WorkspaceWriteResult> {
  await mkdir(path.dirname(filePath), { recursive: true });
  if (!force && (await pathExists(filePath))) return { filePath, wrote: false };
  await writeFile(filePath, content, "utf8");
  return { filePath, wrote: true };
}

async function writeFileResult(
  filePath: string,
  content: string,
): Promise<WorkspaceWriteResult> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return { filePath, wrote: true };
}

function titleFromSlug(value: string): string {
  return value
    .split(/[-_\s]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
