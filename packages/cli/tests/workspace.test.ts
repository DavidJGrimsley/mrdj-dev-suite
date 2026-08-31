import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createWorkspaceManifest,
  derivePackageScope,
  discoverWorkspace,
  resolveWorkspacePath,
  scaffoldWorkspaceRoot,
  slugifyWorkspaceName,
  validateWorkspaceManifest,
  wireGeneratedExpoApp,
} from "../src/workspace.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
  tempDirs.length = 0;
});

function createTestManifest() {
  return createWorkspaceManifest({
    displayName: "Creatisphere",
    packageManager: "pnpm",
    apps: [
      {
        displayName: "Creator Studio",
        kind: "expo",
        purpose: "Create and publish experiences.",
        platforms: ["web", "ios", "android"],
      },
      {
        displayName: "Public Site",
        kind: "non-expo",
        category: "website",
        intendedStack: "Astro",
        purpose: "Explain the product and publish updates.",
      },
    ],
    optionalSharedPackages: ["sdk-client"],
  });
}

describe("workspace manifest model", () => {
  it("derives product-oriented names, scoped packages, and stable Expo ports", () => {
    const manifest = createWorkspaceManifest({
      displayName: "DJ's Creative Suite",
      apps: [
        { displayName: "Studio", kind: "expo", purpose: "Create content." },
        { displayName: "Companion", kind: "expo", purpose: "Review content." },
      ],
    });

    expect(slugifyWorkspaceName("DJ's Creative Suite")).toBe(
      "djs-creative-suite",
    );
    expect(derivePackageScope("Creatisphere")).toBe("@creatisphere");
    expect(manifest.name).toBe("djs-creative-suite");
    expect(manifest.packageScope).toBe("@djs-creative-suite");
    expect(manifest.apps.map((app) => app.path)).toEqual([
      "apps/studio",
      "apps/companion",
    ]);
    expect(manifest.apps.map((app) => app.port)).toEqual([8081, 8082]);
  });

  it("rejects incomplete, duplicate, and unsafe plans", () => {
    expect(() =>
      createWorkspaceManifest({
        displayName: "Solo",
        apps: [{ displayName: "Solo", kind: "expo", purpose: "One app." }],
      }),
    ).toThrow("at least two registered apps");

    expect(() =>
      createWorkspaceManifest({
        displayName: "Backend Only",
        apps: [
          { displayName: "API", kind: "non-expo", purpose: "Serve data." },
          { displayName: "Worker", kind: "non-expo", purpose: "Process jobs." },
        ],
      }),
    ).toThrow("at least one Expo app");

    expect(() =>
      createWorkspaceManifest({
        displayName: "Duplicates",
        apps: [
          { displayName: "App", kind: "expo", purpose: "First." },
          { displayName: "App", kind: "expo", purpose: "Second." },
        ],
      }),
    ).toThrow("Duplicate workspace app");

    expect(() => resolveWorkspacePath("C:/workspace", "../outside")).toThrow(
      "escapes the workspace",
    );
    expect(() =>
      createWorkspaceManifest({
        displayName: "Invalid Scope",
        packageScope: "not-scoped",
        apps: [
          { displayName: "App", kind: "expo", purpose: "First." },
          { displayName: "Site", kind: "non-expo", purpose: "Second." },
        ],
      }),
    ).toThrow("Invalid workspace package scope");
  });

  it("rejects duplicate shared package paths and ports in machine-authored JSON", () => {
    const manifest = createTestManifest();
    manifest.sharedPackages.push({ ...manifest.sharedPackages[0]! });
    expect(() => validateWorkspaceManifest(manifest)).toThrow(
      "Duplicate shared workspace package",
    );

    const duplicatePorts = createWorkspaceManifest({
      displayName: "Port Test",
      apps: [
        { displayName: "One", kind: "expo", purpose: "One." },
        { displayName: "Two", kind: "expo", purpose: "Two." },
      ],
    });
    duplicatePorts.apps[1]!.port = duplicatePorts.apps[0]!.port;
    expect(() => validateWorkspaceManifest(duplicatePorts)).toThrow(
      "Duplicate Expo development port",
    );

    const nonNormalizedScope = createTestManifest();
    nonNormalizedScope.packageScope = '@Creatisphere';
    expect(() => validateWorkspaceManifest(nonNormalizedScope)).toThrow('lowercase and normalized');

    const invalidAppKind = createTestManifest();
    (invalidAppKind.apps[1] as { kind: string }).kind = 'website';
    expect(() => validateWorkspaceManifest(invalidAppKind)).toThrow(/invalid(?: workspace app)? kind/iu);
  });
});

describe("workspace generation", () => {
  it("creates root memory, shared implementation packages, and memory-only non-Expo apps", async () => {
    const workspacePath = await mkdtemp(
      path.join(os.tmpdir(), "mds-workspace-"),
    );
    tempDirs.push(workspacePath);
    const manifest = createTestManifest();
    manifest.apps[0]!.packageName = undefined;

    await scaffoldWorkspaceRoot(workspacePath, manifest);

    const workspaceJson = JSON.parse(
      await readFile(
        path.join(workspacePath, "project", "workspace.json"),
        "utf8",
      ),
    ) as { name: string };
    const rootPackage = JSON.parse(
      await readFile(path.join(workspacePath, "package.json"), "utf8"),
    ) as {
      scripts: Record<string, string>;
    };
    expect(workspaceJson.name).toBe("creatisphere");
    expect(rootPackage.scripts.dev).toBe("turbo run dev --ui=tui");
    expect(rootPackage.scripts["dev:creator-studio"]).toContain(
      "@creatisphere/creator-studio",
    );
    expect(rootPackage.scripts["dev:creator-studio"]).not.toContain(
      "undefined",
    );
    expect(rootPackage.scripts["dev:creator-studio"]).toContain("turbo run dev");
    expect(rootPackage.scripts["dev:creator-studio"]).toContain("--ui=tui");
    await expect(
      readFile(path.join(workspacePath, "pnpm-workspace.yaml"), "utf8"),
    ).resolves.toContain("nodeLinker: hoisted");
    await expect(
      readFile(path.join(workspacePath, ".npmrc"), "utf8"),
    ).resolves.toBe("node-linker=hoisted\n");
    await expect(
      readFile(
        path.join(workspacePath, ".github", "workflows", "mds-pr-checks.yml"),
        "utf8",
      ),
    ).resolves.toContain("pnpm install --frozen-lockfile");
    await expect(
      readFile(
        path.join(workspacePath, "packages", "config", "src", "metro.cjs"),
        "utf8",
      ),
    ).resolves.toContain("createMonorepoMetroConfig");
    await expect(
      readFile(
        path.join(workspacePath, "packages", "ui", "src", "theme.ts"),
        "utf8",
      ),
    ).resolves.toContain("sharedTheme");
    await expect(
      readFile(
        path.join(workspacePath, "packages", "sdk", "src", "index.ts"),
        "utf8",
      ),
    ).resolves.toContain("apiFetch");
    await expect(
      readFile(
        path.join(workspacePath, "apps", "public-site", "project", "info.md"),
        "utf8",
      ),
    ).resolves.toContain("registered; implementation has not been generated");
    await expect(
      readFile(
        path.join(workspacePath, "apps", "public-site", "package.json"),
        "utf8",
      ),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      readFile(
        path.join(workspacePath, "packages", "app", "package.json"),
        "utf8",
      ),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("does not configure unsupported setup-node caching for Bun workspaces", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "mds-bun-workspace-"));
    tempDirs.push(workspacePath);
    const manifest = createWorkspaceManifest({
      displayName: "Bun Workspace",
      packageManager: "bun",
      apps: [
        { displayName: "Mobile", kind: "expo", purpose: "Serve mobile users." },
        { displayName: "Site", kind: "non-expo", purpose: "Serve the public website." },
      ],
    });

    await scaffoldWorkspaceRoot(workspacePath, manifest);
    const workflow = await readFile(
      path.join(workspacePath, ".github", "workflows", "mds-pr-checks.yml"),
      "utf8",
    );

    expect(workflow).toContain("bun install --frozen-lockfile");
    expect(workflow).not.toContain("cache: bun");
  });

  it("wires generated Expo apps to root packages and removes nested repository artifacts", async () => {
    const workspacePath = await mkdtemp(
      path.join(os.tmpdir(), "mds-wire-workspace-"),
    );
    tempDirs.push(workspacePath);
    const manifest = createTestManifest();
    manifest.apps[0]!.packageName = undefined;
    const app = manifest.apps.find((entry) => entry.kind === "expo")!;
    const appPath = path.join(workspacePath, app.path);
    await mkdir(path.join(appPath, ".git"), { recursive: true });
    await writeFile(
      path.join(appPath, "package.json"),
      JSON.stringify({
        name: "temporary-app",
        scripts: { start: "expo start" },
        dependencies: { expo: "^56.0.0" },
      }),
      "utf8",
    );
    await writeFile(
      path.join(appPath, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { baseUrl: ".", types: ["node"] } }),
      "utf8",
    );
    await writeFile(path.join(appPath, "package-lock.json"), "{}", "utf8");

    await wireGeneratedExpoApp(workspacePath, manifest, app);

    const packageJson = JSON.parse(
      await readFile(path.join(appPath, "package.json"), "utf8"),
    ) as {
      name: string;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };
    expect(packageJson.name).toBe("@creatisphere/creator-studio");
    expect(packageJson.scripts.dev).toBe("expo start --port 8081");
    expect(packageJson.scripts.build).toBe("expo export --platform web");
    expect(packageJson.dependencies["@creatisphere/config"]).toBe(
      "workspace:*",
    );
    expect(packageJson.dependencies["@creatisphere/ui"]).toBe("workspace:*");
    expect(packageJson.dependencies["react-native-screens"]).toBe("~4.26.0");
    const tsconfig = JSON.parse(
      await readFile(path.join(appPath, "tsconfig.json"), "utf8"),
    ) as { compilerOptions: { baseUrl?: string; types?: string[] } };
    expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
    expect(tsconfig.compilerOptions.types).toEqual(["node"]);
    await expect(
      readFile(
        path.join(appPath, "src", "theme", "workspace-theme.ts"),
        "utf8",
      ),
    ).resolves.toContain("from '@creatisphere/ui'");
    await expect(
      readFile(path.join(appPath, "package-lock.json"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      readFile(path.join(appPath, ".git", "config"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("existing workspace discovery", () => {
  it("classifies apps and shared packages without moving or renaming them", async () => {
    const workspacePath = await mkdtemp(
      path.join(os.tmpdir(), "mds-discover-workspace-"),
    );
    tempDirs.push(workspacePath);
    await mkdir(path.join(workspacePath, "apps", "Mobile App"), {
      recursive: true,
    });
    await mkdir(path.join(workspacePath, "apps", "API Service"), {
      recursive: true,
    });
    await mkdir(path.join(workspacePath, "packages", "UI Theme"), {
      recursive: true,
    });
    await writeFile(
      path.join(workspacePath, "package.json"),
      JSON.stringify({ name: "creative-tools", packageManager: "pnpm@9.0.0" }),
      "utf8",
    );
    await writeFile(
      path.join(workspacePath, "apps", "Mobile App", "package.json"),
      JSON.stringify({
        name: "@creative/mobile-app",
        dependencies: { expo: "^56.0.0" },
      }),
      "utf8",
    );
    await writeFile(
      path.join(workspacePath, "apps", "API Service", "package.json"),
      JSON.stringify({
        name: "@creative/api-service",
        dependencies: { fastify: "^5.0.0" },
      }),
      "utf8",
    );
    await writeFile(
      path.join(workspacePath, "packages", "UI Theme", "package.json"),
      JSON.stringify({ name: "@creative/ui-theme" }),
      "utf8",
    );

    const discovery = await discoverWorkspace(workspacePath);

    expect(discovery?.manifest.packageScope).toBe("@creative");
    expect(discovery?.manifest.apps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "mobile-app",
          kind: "expo",
          path: "apps/mobile-app",
          packageName: "@creative/mobile-app",
        }),
        expect.objectContaining({
          id: "api-service",
          kind: "non-expo",
          path: "apps/api-service",
          packageName: "@creative/api-service",
        }),
      ]),
    );
    expect(discovery?.manifest.sharedPackages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "ui-theme",
          packageName: "@creative/ui-theme",
          role: "ui-theme",
          path: "packages/ui-theme",
        }),
      ]),
    );
  });
});
