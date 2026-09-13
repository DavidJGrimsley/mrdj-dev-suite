import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export type GeneratorFixtureContract = "cess-mobile" | "experimemo-mvp";

export interface GeneratorFixtureContractResult {
  contract: GeneratorFixtureContract;
  failures: string[];
  ok: boolean;
}

export interface GeneratorFixtureTargetInput {
  branchesToTest?: readonly string[];
  revision?: string;
}

export interface GeneratorFixtureTarget {
  label: string;
  revision?: string;
}

export function resolveGeneratorFixtureTargets(
  input: GeneratorFixtureTargetInput,
): GeneratorFixtureTarget[] {
  if (input.revision) {
    return [{ label: input.revision, revision: input.revision }];
  }

  const branches = input.branchesToTest?.length
    ? input.branchesToTest
    : ["main"];
  return branches.map((branch) => ({ label: branch }));
}

export async function evaluateGeneratorFixtureContract(
  contract: GeneratorFixtureContract,
  projectPath: string,
): Promise<GeneratorFixtureContractResult> {
  const failures: string[] = [];

  if (contract === "experimemo-mvp") {
    await evaluateExperimemoMvp(projectPath, failures);
  } else {
    await evaluateCessMobile(projectPath, failures);
  }

  return {
    contract,
    failures,
    ok: failures.length === 0,
  };
}

async function evaluateExperimemoMvp(
  projectPath: string,
  failures: string[],
): Promise<void> {
  const expo = await readExpoConfig(projectPath, failures);
  const packageJson = await readJsonRecord(
    path.join(projectPath, "package.json"),
    "package.json",
    failures,
  );

  if (expo) {
    expectValue(expo.name, "Experimemo", "app.json expo.name", failures);
    expectValue(
      expo.userInterfaceStyle,
      "automatic",
      "app.json expo.userInterfaceStyle",
      failures,
    );
    await expectReferencedAsset(
      projectPath,
      expo.icon,
      "app.json expo.icon",
      failures,
    );

    const android = asRecord(expo.android);
    const adaptiveIcon = asRecord(android?.adaptiveIcon);
    await expectReferencedAsset(
      projectPath,
      adaptiveIcon?.foregroundImage,
      "app.json expo.android.adaptiveIcon.foregroundImage",
      failures,
    );

    const splash = findPluginConfig(expo.plugins, "expo-splash-screen");
    await expectReferencedAsset(
      projectPath,
      splash?.image,
      "expo-splash-screen image",
      failures,
    );
    await expectReferencedAsset(
      projectPath,
      asRecord(splash?.dark)?.image,
      "expo-splash-screen dark image",
      failures,
    );
  }

  expectDeclaredDependency(packageJson, "@expo/ui", failures);
  expectDeclaredDependency(packageJson, "expo-router", failures);

  await expectFileContains(
    path.join(projectPath, "src", "config", "app-links.ts"),
    [
      "privacy: 'https://davidjgrimsley.com/experimemo/privacy'",
      "support: 'https://davidjgrimsley.com/experimemo/support'",
      "terms: 'https://davidjgrimsley.com/experimemo/terms'",
    ],
    "production support/legal links",
    failures,
  );
  await expectFileContains(
    path.join(
      projectPath,
      "src",
      "features",
      "app-info",
      "app-info-modal-screen.tsx",
    ),
    ["APP_LINKS.support", "APP_LINKS.terms", "APP_LINKS.privacy"],
    "app info legal/support link references",
    failures,
  );
  await expectFileContains(
    path.join(
      projectPath,
      "src",
      "features",
      "new-experiment",
      "new-experiment-screen.tsx",
    ),
    ['title="Experimemo"'],
    "Experimemo customer-facing heading",
    failures,
  );
  await expectFileContains(
    path.join(projectPath, "src", "app", "(tabs)", "_layout.tsx"),
    [
      "expo-router/unstable-native-tabs",
      "<NativeTabs",
      '<NativeTabs.Trigger name="new">',
      "<NativeTabs.Trigger.Label>New</NativeTabs.Trigger.Label>",
      '<NativeTabs.Trigger name="track">',
      "<NativeTabs.Trigger.Label>Track</NativeTabs.Trigger.Label>",
    ],
    "NativeTabs product shell",
    failures,
  );
  await expectFileContains(
    path.join(projectPath, "src", "theme", "provider.tsx"),
    [
      "import { useColorScheme } from 'react-native';",
      "const systemScheme = useColorScheme();",
    ],
    "system color-scheme theme provider",
    failures,
  );
  await expectFileContains(
    path.join(projectPath, "src", "app", "_layout.tsx"),
    ["useAppTheme", "<ThemeProvider value={routerTheme}>"],
    "system-aware router theme bridge",
    failures,
  );
}

async function evaluateCessMobile(
  projectPath: string,
  failures: string[],
): Promise<void> {
  const expo = await readExpoConfig(projectPath, failures);
  const packageJson = await readJsonRecord(
    path.join(projectPath, "package.json"),
    "package.json",
    failures,
  );

  if (expo) {
    if (typeof expo.name !== "string" || expo.name.trim() === "") {
      failures.push("CESS app.json must define a non-empty expo.name.");
    }
    if (typeof expo.slug !== "string" || expo.slug.trim() === "") {
      failures.push("CESS app.json must define a non-empty expo.slug.");
    }
  }

  expectDeclaredDependency(packageJson, "expo", failures);
  expectDeclaredDependency(packageJson, "expo-router", failures);

  for (const projectFile of [
    "info.md",
    "todo.md",
    "style.md",
    "guidelines.md",
  ]) {
    await expectExistingFile(
      path.join(projectPath, "project", projectFile),
      `CESS canonical project memory project/${projectFile}`,
      failures,
    );
  }

  const routeRoots = [
    path.join(projectPath, "src", "app"),
    path.join(projectPath, "app"),
  ];
  const hasRouteShell = await Promise.all(
    routeRoots.map((routeRoot) =>
      fileExists(path.join(routeRoot, "_layout.tsx")),
    ),
  );
  if (!hasRouteShell.some(Boolean)) {
    failures.push(
      "CESS generated app must retain an Expo Router _layout.tsx route shell.",
    );
  }
}

async function readExpoConfig(
  projectPath: string,
  failures: string[],
): Promise<Record<string, unknown> | undefined> {
  const config = await readJsonRecord(
    path.join(projectPath, "app.json"),
    "app.json",
    failures,
  );
  const expo = asRecord(config?.expo);
  if (!expo) {
    failures.push("app.json must contain an expo object.");
  }
  return expo;
}

async function readJsonRecord(
  filePath: string,
  label: string,
  failures: string[],
): Promise<Record<string, unknown> | undefined> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    failures.push(`${label} is missing or unreadable.`);
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (asRecord(parsed)) return asRecord(parsed);
  } catch {
    // The targeted failure below is more actionable than the parser stack trace.
  }

  failures.push(`${label} must contain a JSON object.`);
  return undefined;
}

function expectValue(
  actual: unknown,
  expected: string,
  label: string,
  failures: string[],
): void {
  if (actual !== expected) {
    failures.push(`${label} must equal ${JSON.stringify(expected)}.`);
  }
}

function expectDeclaredDependency(
  packageJson: Record<string, unknown> | undefined,
  packageName: string,
  failures: string[],
): void {
  const dependencies = asRecord(packageJson?.dependencies);
  const devDependencies = asRecord(packageJson?.devDependencies);
  if (
    typeof dependencies?.[packageName] !== "string" &&
    typeof devDependencies?.[packageName] !== "string"
  ) {
    failures.push(`package.json must declare ${packageName}.`);
  }
}

async function expectReferencedAsset(
  projectPath: string,
  value: unknown,
  label: string,
  failures: string[],
): Promise<void> {
  if (typeof value !== "string" || value.trim() === "") {
    failures.push(`${label} must reference an asset file.`);
    return;
  }

  const relativePath = value.replace(/^\.\//u, "");
  await expectExistingFile(
    path.join(projectPath, relativePath),
    `${label} (${value})`,
    failures,
  );
}

async function expectExistingFile(
  filePath: string,
  label: string,
  failures: string[],
): Promise<void> {
  try {
    const entry = await stat(filePath);
    if (!entry.isFile() || entry.size === 0) {
      failures.push(`${label} must be a non-empty file.`);
    }
  } catch {
    failures.push(`${label} is missing.`);
  }
}

async function expectFileContains(
  filePath: string,
  requiredText: readonly string[],
  label: string,
  failures: string[],
): Promise<void> {
  let source: string;
  try {
    source = await readFile(filePath, "utf8");
  } catch {
    failures.push(`${label} file is missing: ${path.basename(filePath)}.`);
    return;
  }

  for (const text of requiredText) {
    if (!source.includes(text)) {
      failures.push(`${label} must contain ${JSON.stringify(text)}.`);
    }
  }
}

function findPluginConfig(
  plugins: unknown,
  pluginName: string,
): Record<string, unknown> | undefined {
  if (!Array.isArray(plugins)) return undefined;
  for (const plugin of plugins) {
    if (Array.isArray(plugin) && plugin[0] === pluginName) {
      return asRecord(plugin[1]);
    }
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}
