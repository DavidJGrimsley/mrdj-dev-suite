import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  evaluateGeneratorFixtureContract,
  resolveGeneratorFixtureTargets,
} from "../src/generator-fixture-contracts.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("generator fixture contracts", () => {
  it("uses an exact revision instead of a moving branch", () => {
    expect(
      resolveGeneratorFixtureTargets({
        branchesToTest: ["main"],
        revision: "011334f69e577fd146d84f67417031de748566b1",
      }),
    ).toEqual([
      {
        label: "011334f69e577fd146d84f67417031de748566b1",
        revision: "011334f69e577fd146d84f67417031de748566b1",
      },
    ]);
  });

  it("accepts the required Experimemo MVP contract", async () => {
    const projectPath = await createExperimemoFixture();

    await expect(
      evaluateGeneratorFixtureContract("experimemo-mvp", projectPath),
    ).resolves.toEqual({
      contract: "experimemo-mvp",
      failures: [],
      ok: true,
    });
  });

  it("reports a missing production link clearly", async () => {
    const projectPath = await createExperimemoFixture();
    await writeFile(
      path.join(projectPath, "src", "config", "app-links.ts"),
      "export const APP_LINKS = {};\n",
    );

    const result = await evaluateGeneratorFixtureContract(
      "experimemo-mvp",
      projectPath,
    );

    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      "production support/legal links must contain \"support: 'https://davidjgrimsley.com/experimemo/support'\".",
    );
  });

  it("reports a missing NativeTabs shell clearly", async () => {
    const projectPath = await createExperimemoFixture();
    await writeFile(
      path.join(projectPath, "src", "app", "(tabs)", "_layout.tsx"),
      "export default function Tabs() { return null; }\n",
    );

    const result = await evaluateGeneratorFixtureContract(
      "experimemo-mvp",
      projectPath,
    );

    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      'NativeTabs product shell must contain "expo-router/unstable-native-tabs".',
    );
  });

  it("reports missing system appearance and icon configuration clearly", async () => {
    const projectPath = await createExperimemoFixture();
    await writeFile(
      path.join(projectPath, "app.json"),
      JSON.stringify({
        expo: { name: "Experimemo", icon: "./assets/icon.png" },
      }),
    );

    const result = await evaluateGeneratorFixtureContract(
      "experimemo-mvp",
      projectPath,
    );

    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      'app.json expo.userInterfaceStyle must equal "automatic".',
    );
    expect(result.failures).toContain(
      "app.json expo.android.adaptiveIcon.foregroundImage must reference an asset file.",
    );
  });

  it("accepts a minimal CESS mobile app before and after ejection", async () => {
    const projectPath = await createCessFixture();

    await expect(
      evaluateGeneratorFixtureContract("cess-mobile", projectPath),
    ).resolves.toEqual({
      contract: "cess-mobile",
      failures: [],
      ok: true,
    });
  });
});

async function createExperimemoFixture(): Promise<string> {
  const projectPath = await createFixtureRoot("experimemo-contract-");
  await writeJson(path.join(projectPath, "app.json"), {
    expo: {
      name: "Experimemo",
      userInterfaceStyle: "automatic",
      icon: "./assets/icon.png",
      android: {
        adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png" },
      },
      plugins: [
        [
          "expo-splash-screen",
          {
            image: "./assets/splash.png",
            dark: { image: "./assets/splash-dark.png" },
          },
        ],
      ],
    },
  });
  await writeJson(path.join(projectPath, "package.json"), {
    dependencies: { "@expo/ui": "~56.0.14", "expo-router": "~56.2.6" },
  });

  await writeSource(
    projectPath,
    "src/config/app-links.ts",
    [
      "export const APP_LINKS = {",
      "  privacy: 'https://davidjgrimsley.com/experimemo/privacy',",
      "  support: 'https://davidjgrimsley.com/experimemo/support',",
      "  terms: 'https://davidjgrimsley.com/experimemo/terms',",
      "};",
    ].join("\n"),
  );
  await writeSource(
    projectPath,
    "src/features/app-info/app-info-modal-screen.tsx",
    "APP_LINKS.support; APP_LINKS.terms; APP_LINKS.privacy;\n",
  );
  await writeSource(
    projectPath,
    "src/features/onboarding/onboarding-screen.tsx",
    "APP_LINKS.terms; APP_LINKS.privacy;\n",
  );
  await writeSource(
    projectPath,
    "src/features/new-experiment/new-experiment-screen.tsx",
    '<Screen title="Experimemo" />\n',
  );
  await writeSource(
    projectPath,
    "src/app/(tabs)/_layout.tsx",
    [
      "import { NativeTabs } from 'expo-router/unstable-native-tabs';",
      "<NativeTabs>",
      '<NativeTabs.Trigger name="new"><NativeTabs.Trigger.Label>New</NativeTabs.Trigger.Label></NativeTabs.Trigger>',
      '<NativeTabs.Trigger name="track"><NativeTabs.Trigger.Label>Track</NativeTabs.Trigger.Label></NativeTabs.Trigger>',
      "</NativeTabs>",
    ].join("\n"),
  );
  await writeSource(
    projectPath,
    "src/theme/provider.tsx",
    "import { useColorScheme } from 'react-native';\nconst systemScheme = useColorScheme();\n",
  );
  await writeSource(
    projectPath,
    "src/app/_layout.tsx",
    "useAppTheme();\n<ThemeProvider value={routerTheme}>\n",
  );
  for (const asset of [
    "icon.png",
    "adaptive-icon.png",
    "splash.png",
    "splash-dark.png",
  ]) {
    await writeSource(projectPath, `assets/${asset}`, "fixture-asset");
  }
  return projectPath;
}

async function createCessFixture(): Promise<string> {
  const projectPath = await createFixtureRoot("cess-contract-");
  await writeJson(path.join(projectPath, "app.json"), {
    expo: { name: "Fixture App", slug: "fixture-app" },
  });
  await writeJson(path.join(projectPath, "package.json"), {
    dependencies: { expo: "~56.0.0", "expo-router": "~56.0.0" },
  });
  for (const file of ["info.md", "todo.md", "style.md", "guidelines.md"]) {
    await writeSource(projectPath, `project/${file}`, "# Fixture\n");
  }
  await writeSource(
    projectPath,
    "src/app/_layout.tsx",
    "export default function Layout() { return null; }\n",
  );
  return projectPath;
}

async function createFixtureRoot(prefix: string): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(projectPath);
  return projectPath;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeSource(filePath, "", `${JSON.stringify(value, null, 2)}\n`);
}

async function writeSource(
  projectPath: string,
  relativePath: string,
  contents: string,
): Promise<void> {
  const filePath =
    relativePath === "" ? projectPath : path.join(projectPath, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}
