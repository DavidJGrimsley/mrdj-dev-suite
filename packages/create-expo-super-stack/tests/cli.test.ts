import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  EXPECTED_EXPO_SDK_MAJOR,
  assertExpectedExpoSdk,
  buildAddDevDependencyCommand,
  buildExpoDoctorCommand,
  buildExpoFontInstallCommand,
  buildExpoInstallFixCommand,
  buildExpoLatestSdkCommand,
  buildInstallCommand,
  buildPrettierWriteCommand,
  detectEasSetup,
  isCliEntryPoint,
  parseArgs,
  prepareCreateExpoStackArgsForWrapper,
  repairGeneratedNativeWindUiPicker,
  repairExpoProjectIdentifiers,
  repairExpoWebOutputForStylistLifecycle,
  repairGeneratedTypeSupport,
  repairMovedSrcAppImports,
  renderHelpText,
  resolveMissingWindowsTailwindOxideBinding,
  resolveProjectTarget,
  resolveWindowsTailwindOxidePackage,
  parseExpoSdkMajor,
  shouldInstallExpoFontPeerFromPackageJson,
  shouldRunExpoLatestSdkCommandFromPackageJson,
  toExpoScheme,
  toExpoSlug,
  validateCreateExpoStackArgs,
  withResolvedProjectName,
} from "../src/cli.js";

describe("create-expo-super-stack CLI helpers", () => {
  it("parses help flags without forcing interactive prompts", () => {
    const longHelp = parseArgs(["--help"]);
    expect(longHelp.helpRequested).toBe(true);
    expect(longHelp.projectName).toBeUndefined();
    expect(longHelp.createExpoStackArgs).toEqual([]);

    const shortHelp = parseArgs(["-h"]);
    expect(shortHelp.helpRequested).toBe(true);
    expect(shortHelp.projectName).toBeUndefined();
    expect(shortHelp.createExpoStackArgs).toEqual([]);
  });

  it("renders help text with usage and examples", () => {
    const help = renderHelpText();
    expect(help).toContain("Usage:");
    expect(help).toContain("create-expo-super-stack [project-name]");
    expect(help).toContain("--mds-yes");
    expect(help).toContain("--mds-save-defaults");
    expect(help).toContain("--mds-no-guidelines-template");
    expect(help).toContain("-h, --help");
  });

  it("builds install, latest SDK, expo repair, Expo font peer, formatting, and doctor commands in the required order", () => {
    const commands = [
      buildInstallCommand("npm").display,
      buildExpoLatestSdkCommand("npm").display,
      buildExpoInstallFixCommand("npm").display,
      buildExpoFontInstallCommand("npm").display,
      buildPrettierWriteCommand("npm").display,
      buildExpoDoctorCommand("npm").display,
    ];

    expect(commands).toEqual([
      "npm install",
      `npx expo install expo@^${EXPECTED_EXPO_SDK_MAJOR}`,
      "npx expo install --fix",
      "npx expo install expo-font",
      'npx prettier --write "**/*.{js,jsx,ts,tsx,json}"',
      "npx expo-doctor",
    ]);
  });

  it("uses non-failing pnpm strict dependency build settings during install", () => {
    const command = buildInstallCommand("pnpm");

    expect(command.display).toBe(
      "pnpm install --config.strict-dep-builds=false --ignore-workspace",
    );
    expect(command.args).toEqual([
      "install",
      "--config.strict-dep-builds=false",
      "--ignore-workspace",
    ]);
    expect(command.env).toEqual({ PNPM_CONFIG_STRICT_DEP_BUILDS: "false" });
  });

  it("builds add-dev-dependency command for pnpm workspace app projects", () => {
    const command = buildAddDevDependencyCommand(
      "pnpm",
      "@tailwindcss/oxide-win32-x64-msvc@4.2.1",
    );
    expect(command.display).toBe(
      "pnpm --ignore-workspace add -D @tailwindcss/oxide-win32-x64-msvc@4.2.1",
    );
    expect(command.args).toEqual([
      "--ignore-workspace",
      "add",
      "-D",
      "@tailwindcss/oxide-win32-x64-msvc@4.2.1",
    ]);
    expect(command.env).toEqual({ PNPM_CONFIG_STRICT_DEP_BUILDS: "false" });
  });

  it("installs expo-font when vector icons are present without their peer dependency", () => {
    expect(
      shouldInstallExpoFontPeerFromPackageJson({
        dependencies: {
          "@expo/vector-icons": "^15.0.0",
        },
      }),
    ).toBe(true);

    expect(
      shouldInstallExpoFontPeerFromPackageJson({
        dependencies: {
          "@expo/vector-icons": "^15.0.0",
          "expo-font": "~14.0.0",
        },
      }),
    ).toBe(false);

    expect(
      shouldInstallExpoFontPeerFromPackageJson({
        dependencies: {
          expo: "~54.0.0",
        },
      }),
    ).toBe(false);
  });

  it("targets Expo SDK 56 whenever the package is missing or on the wrong major", () => {
    expect(
      shouldRunExpoLatestSdkCommandFromPackageJson({
        dependencies: { expo: "~56.0.6" },
      }),
    ).toBe(false);
    expect(
      shouldRunExpoLatestSdkCommandFromPackageJson({
        dependencies: { expo: "^56.0.0" },
      }),
    ).toBe(false);
    expect(
      shouldRunExpoLatestSdkCommandFromPackageJson({
        dependencies: { expo: "~55.0.0" },
      }),
    ).toBe(true);
    expect(
      shouldRunExpoLatestSdkCommandFromPackageJson({
        dependencies: {},
      }),
    ).toBe(true);
    expect(
      shouldRunExpoLatestSdkCommandFromPackageJson({
        dependencies: { expo: "latest" },
      }),
    ).toBe(true);
  });

  it("parses Expo SDK majors from dependency ranges", () => {
    expect(parseExpoSdkMajor("~56.0.6")).toBe(56);
    expect(parseExpoSdkMajor("^55.0.0")).toBe(55);
    expect(parseExpoSdkMajor("latest")).toBeNull();
  });

  it("does not execute main when imported by tests", () => {
    expect(isCliEntryPoint(["node", "not-the-cli.js"])).toBe(false);
  });

  it("does not force my-expo-app when no project name was provided", () => {
    const parsed = parseArgs(["--expo-router", "--no-install"]);
    expect(parsed.projectName).toBeUndefined();
    expect(parsed.createExpoStackArgs).toEqual([
      "--expo-router",
      "--no-install",
    ]);

    const resolved = withResolvedProjectName(parsed, "poop");
    expect(resolved.projectName).toBe("poop");
    expect(resolved.createExpoStackArgs).toEqual([
      "poop",
      "--expo-router",
      "--no-install",
    ]);
    expect(resolved.mds.appName).toBe("poop");
  });

  it("normalizes path-like project targets before delegating to create-expo-stack", () => {
    const cwd = path.join("F:", "SoftwareDev", "mr-djs-dev-suite");
    const target = resolveProjectTarget(
      path.join("F:", "SoftwareDev", "Smoke Path App"),
      cwd,
    );

    expect(target.projectName).toBe("Smoke Path App");
    expect(target.parentDir).toContain(path.join("F:", "SoftwareDev"));

    const parsed = parseArgs([
      path.join("..", "Smoke Relative App"),
      "--expo-router",
      "--no-install",
    ]);
    const resolved = withResolvedProjectName(parsed, "ignored");

    expect(resolved.projectName).toBe("Smoke Relative App");
    expect(resolved.createExpoStackArgs).toEqual([
      "Smoke Relative App",
      "--expo-router",
      "--no-install",
    ]);
    expect(resolved.mds.appName).toBe("Smoke Relative App");
    expect(resolved.mds.projectParentDir).toBeDefined();
  });

  it("uses an explicit MDS app name instead of the project folder name", () => {
    const parsed = parseArgs(["folder-name", "--mds-app-name=Display Name"]);
    const resolved = withResolvedProjectName(parsed, "ignored");

    expect(resolved.projectName).toBe("folder-name");
    expect(resolved.mds.appName).toBe("Display Name");
  });

  it("rejects conflicting create-expo-stack auth provider flags", () => {
    expect(() =>
      validateCreateExpoStackArgs(["App", "--supabase", "--firebase"]),
    ).toThrow(/Choose one create-expo-stack auth provider/);
    expect(() =>
      validateCreateExpoStackArgs(["App", "--supabase"]),
    ).not.toThrow();
    expect(() =>
      validateCreateExpoStackArgs(["App", "--firebase"]),
    ).not.toThrow();
  });

  it("detects EAS setup from flags and generated project files", async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-eas-"),
    );
    try {
      expect(await detectEasSetup(projectPath, ["App", "--eas"])).toBe(true);
      expect(await detectEasSetup(projectPath, ["App"])).toBeUndefined();

      await writeFile(
        path.join(projectPath, "eas.json"),
        JSON.stringify({ build: {} }),
        "utf8",
      );
      expect(await detectEasSetup(projectPath, ["App"])).toBe(true);

      await rm(path.join(projectPath, "eas.json"), { force: true });
      await writeFile(
        path.join(projectPath, "app.json"),
        JSON.stringify({
          expo: {
            extra: {
              eas: { projectId: "20850e64-94ba-462d-a00c-bd0b4ff351c6" },
            },
          },
        }),
        "utf8",
      );
      expect(await detectEasSetup(projectPath, ["App"])).toBe(true);
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("fails loudly when the generated project does not target SDK 56", async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), "super-stack-sdk-check-"));
    try {
      await writeFile(
        path.join(projectPath, "package.json"),
        JSON.stringify({ dependencies: { expo: "~55.0.0" } }),
        "utf8",
      );

      await expect(assertExpectedExpoSdk(projectPath)).rejects.toThrow(
        `Expo SDK ${EXPECTED_EXPO_SDK_MAJOR}`,
      );
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("parses every onboarding mds flag the agentic prompt sends", () => {
    const parsed = parseArgs([
      "demo-app",
      "--mds-platforms=web,ios,android-tv",
      "--mds-first-platform=ios",
      "--mds-platform-strategy=folders",
      "--mds-app-directory=src",
      "--mds-platform-layouts=platform-specific",
      "--mds-web-output=server",
      "--mds-deployed-server=standard-expo",
      "--mds-screens=Home,Profile,Checkout",
      "--mds-no-create-expo-components",
      "--mds-no-expo-ui",
      "--mds-expo-ui-universal",
      "--mds-expo-native-tabs",
      "--mds-eas-uses=building mobile applications,publishing mobile applications",
      "--mds-save-defaults",
    ]);

    expect(parsed.mds.platforms).toEqual(["web", "ios", "android-tv"]);
    expect(parsed.mds.firstPlatform).toBe("ios");
    expect(parsed.mds.platformStrategy).toBe("folders");
    expect(parsed.mds.appDirectory).toBe("src");
    expect(parsed.mds.platformLayouts).toBe("platform-specific");
    expect(parsed.mds.webOutput).toBe("server");
    expect(parsed.mds.deployedServer).toBe("standard-expo");
    expect(parsed.mds.screens).toBe("Home,Profile,Checkout");
    expect(parsed.mds.createExpoComponents).toBe(false);
    expect(parsed.mds.expoUi).toBe(false);
    expect(parsed.mds.expoUiUniversal).toBe(true);
    expect(parsed.mds.expoNativeTabs).toBe(true);
    expect(parsed.mds.easUses).toEqual([
      "building mobile applications",
      "publishing mobile applications",
    ]);
    expect(parsed.mds.saveDefaults).toBe(true);
    // None of these mds-only flags should leak into the create-expo-stack args.
    expect(parsed.createExpoStackArgs).toEqual(["demo-app"]);
  });

  it("supports explicit opt-out for saving onboarding defaults", () => {
    const parsed = parseArgs(["demo-app", "--mds-no-save-defaults"]);
    expect(parsed.mds.saveDefaults).toBe(false);
  });

  it("supports explicit opt-out for the bundled guidelines template", () => {
    const parsed = parseArgs(["demo-app", "--mds-no-guidelines-template"]);
    expect(parsed.mds.guidelinesTemplate).toBe(false);
  });

  it("preserves create-expo-stack install behavior unless user explicitly passes --no-install", () => {
    expect(
      prepareCreateExpoStackArgsForWrapper(["demo-app", "--expo-router"]),
    ).toEqual(["demo-app", "--expo-router"]);
    expect(
      prepareCreateExpoStackArgsForWrapper([
        "demo-app",
        "--expo-router",
        "--no-install",
      ]),
    ).toEqual(["demo-app", "--expo-router", "--no-install"]);
    expect(
      prepareCreateExpoStackArgsForWrapper(["demo-app", "--expo-router"], true),
    ).toEqual(["demo-app", "--expo-router"]);
  });

  it("rejects malformed enum values for the new mds flags instead of forwarding garbage", () => {
    const parsed = parseArgs([
      "demo-app",
      "--mds-platform-strategy=other",
      "--mds-app-directory=sideways",
      "--mds-platform-layouts=solo",
      "--mds-web-output=foo",
      "--mds-deployed-server=bar",
    ]);

    expect(parsed.mds.platformStrategy).toBeUndefined();
    expect(parsed.mds.appDirectory).toBeUndefined();
    expect(parsed.mds.platformLayouts).toBeUndefined();
    expect(parsed.mds.webOutput).toBeUndefined();
    expect(parsed.mds.deployedServer).toBeUndefined();
  });

  it("sanitizes Expo slug and scheme values from display names", async () => {
    expect(toExpoSlug("Bandana Designer")).toBe("bandana-designer");
    expect(toExpoScheme("Bandana Designer")).toBe("bandana-designer");
    expect(toExpoScheme("2026 Bandana Designer")).toBe("bandana-designer");

    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-app-json-"),
    );
    try {
      await mkdir(projectPath, { recursive: true });
      await writeFile(
        path.join(projectPath, "app.json"),
        JSON.stringify({
          expo: {
            name: "Bandana Designer",
            slug: "Bandana Designer",
            scheme: "Bandana Designer",
            platforms: ["ios", "android"],
          },
        }),
        "utf8",
      );

      await expect(
        repairExpoProjectIdentifiers(projectPath, "Bandana Designer", [
          "web",
          "ios",
          "android",
        ]),
      ).resolves.toEqual([path.join(projectPath, "app.json")]);

      const repaired = JSON.parse(
        await readFile(path.join(projectPath, "app.json"), "utf8"),
      ) as {
        expo: {
          slug: string;
          scheme: string;
          platforms: string[];
          backgroundColor?: string;
          androidStatusBar?: {
            backgroundColor?: string;
            barStyle?: string;
            translucent?: boolean;
          };
          plugins?: unknown[];
        };
      };
      expect(repaired.expo.slug).toBe("bandana-designer");
      expect(repaired.expo.scheme).toBe("bandana-designer");
      expect(repaired.expo.platforms).toContain("web");
      expect(repaired.expo.backgroundColor).toBe("#f1f0f8");
      expect(repaired.expo).not.toHaveProperty("androidNavigationBar");
      expect(repaired.expo.androidStatusBar).toEqual({
        backgroundColor: "#f1f0f8",
        barStyle: "dark-content",
        translucent: false,
      });
      expect(repaired.expo.plugins ?? []).toContainEqual([
        "expo-navigation-bar",
        {
          style: "dark",
          enforceContrast: false,
        },
      ]);
      expect(repaired.expo.plugins ?? []).toContain("expo-system-ui");
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("repairs moved src/app tab layout imports after app directory migration", async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-src-app-imports-"),
    );
    try {
      const tabsDir = path.join(projectPath, "src", "app", "(tabs)");
      await mkdir(tabsDir, { recursive: true });
      const tabsLayoutPath = path.join(tabsDir, "_layout.tsx");
      await writeFile(
        tabsLayoutPath,
        [
          'import { HeaderButton } from "../../components/HeaderButton";',
          'import { TabBarIcon } from "../../components/TabBarIcon";',
          "",
        ].join("\n"),
        "utf8",
      );

      await expect(repairMovedSrcAppImports(projectPath)).resolves.toEqual([]);

      const repaired = await readFile(tabsLayoutPath, "utf8");
      expect(repaired).toContain(
        'import { HeaderButton } from "../../components/HeaderButton";',
      );
      expect(repaired).toContain(
        'import { TabBarIcon } from "../../components/TabBarIcon";',
      );
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("repairs moved src/app drawer layout imports after app directory migration", async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-src-app-drawer-imports-"),
    );
    try {
      const drawerDir = path.join(projectPath, "src", "app", "(drawer)");
      const drawerTabsDir = path.join(drawerDir, "(tabs)");
      await mkdir(drawerTabsDir, { recursive: true });
      const drawerLayoutPath = path.join(drawerDir, "_layout.tsx");
      const drawerTabsLayoutPath = path.join(drawerTabsDir, "_layout.tsx");

      await writeFile(
        drawerLayoutPath,
        ['import { HeaderButton } from "../components/HeaderButton";', ""].join(
          "\n",
        ),
        "utf8",
      );
      await writeFile(
        drawerTabsLayoutPath,
        [
          'import { HeaderButton } from "../../components/HeaderButton";',
          'import { TabBarIcon } from "../../components/TabBarIcon";',
          "",
        ].join("\n"),
        "utf8",
      );

      await expect(repairMovedSrcAppImports(projectPath)).resolves.toEqual([
        drawerLayoutPath,
        drawerTabsLayoutPath,
      ]);

      const drawerLayout = await readFile(drawerLayoutPath, "utf8");
      const drawerTabsLayout = await readFile(drawerTabsLayoutPath, "utf8");
      expect(drawerLayout).toContain(
        'import { HeaderButton } from "../../components/HeaderButton";',
      );
      expect(drawerTabsLayout).toContain(
        'import { HeaderButton } from "../../../components/HeaderButton";',
      );
      expect(drawerTabsLayout).toContain(
        'import { TabBarIcon } from "../../../components/TabBarIcon";',
      );
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("adds generated app type support for Uniwind, Node API routes, and ColorValue tab icons", async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-type-support-"),
    );
    try {
      await mkdir(path.join(projectPath, "components"), { recursive: true });
      await writeFile(
        path.join(projectPath, "css-env.d.ts"),
        "declare module '*.css';\n",
        "utf8",
      );
      await writeFile(
        path.join(projectPath, "tsconfig.json"),
        JSON.stringify({
          extends: "expo/tsconfig.base",
          compilerOptions: { strict: true, paths: { "@/*": ["./src/*"] } },
        }),
        "utf8",
      );
      await writeFile(
        path.join(projectPath, "package.json"),
        JSON.stringify({
          name: "type-support",
          dependencies: { uniwind: "^1.6.4" },
          devDependencies: {},
        }),
        "utf8",
      );
      await writeFile(
        path.join(projectPath, "components", "TabBarIcon.tsx"),
        [
          "import FontAwesome from '@expo/vector-icons/FontAwesome';",
          "import { StyleSheet } from 'react-native';",
          "export const TabBarIcon = (props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string; }) => null;",
        ].join("\n"),
        "utf8",
      );

      await expect(
        repairGeneratedTypeSupport(projectPath, {
          needsNodeTypes: true,
          needsUniwindTypes: true,
        }),
      ).resolves.toEqual([
        path.join(projectPath, "css-env.d.ts"),
        path.join(projectPath, "tsconfig.json"),
        path.join(projectPath, "package.json"),
        path.join(projectPath, "components", "TabBarIcon.tsx"),
      ]);

      const cssEnv = await readFile(
        path.join(projectPath, "css-env.d.ts"),
        "utf8",
      );
      const tsconfig = JSON.parse(
        await readFile(path.join(projectPath, "tsconfig.json"), "utf8"),
      ) as {
        compilerOptions: {
          types: string[];
          baseUrl?: string;
          ignoreDeprecations?: string;
        };
      };
      const packageJson = JSON.parse(
        await readFile(path.join(projectPath, "package.json"), "utf8"),
      ) as {
        devDependencies: Record<string, string>;
      };
      const tabBarIcon = await readFile(
        path.join(projectPath, "components", "TabBarIcon.tsx"),
        "utf8",
      );
      expect(cssEnv).toContain('/// <reference types="uniwind/types" />');
      expect(tsconfig.compilerOptions.types).toEqual(["node", "uniwind/types"]);
      expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
      expect(tsconfig.compilerOptions.ignoreDeprecations).toBeUndefined();
      expect(packageJson.devDependencies["@types/node"]).toBe("^25.9.1");
      expect(tabBarIcon).toContain(
        "import type { ColorValue } from 'react-native';",
      );
      expect(tabBarIcon).toContain("color: ColorValue;");
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("skips Uniwind type references when the dependency is not installed", async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-no-uniwind-types-"),
    );
    try {
      await writeFile(
        path.join(projectPath, "css-env.d.ts"),
        "/// <reference types=\"uniwind/types\" />\n\ndeclare module '*.css';\n",
        "utf8",
      );
      await writeFile(
        path.join(projectPath, "tsconfig.json"),
        JSON.stringify({
          extends: "expo/tsconfig.base",
          compilerOptions: {
            strict: true,
            types: ["uniwind/types"],
            paths: { "@/*": ["./src/*"] },
          },
        }),
        "utf8",
      );
      await writeFile(
        path.join(projectPath, "package.json"),
        JSON.stringify({
          name: "no-uniwind-types",
          dependencies: {},
          devDependencies: {},
        }),
        "utf8",
      );

      await expect(
        repairGeneratedTypeSupport(projectPath, {
          needsNodeTypes: true,
          needsUniwindTypes: true,
        }),
      ).resolves.toEqual([
        path.join(projectPath, "css-env.d.ts"),
        path.join(projectPath, "tsconfig.json"),
        path.join(projectPath, "package.json"),
      ]);

      const cssEnv = await readFile(
        path.join(projectPath, "css-env.d.ts"),
        "utf8",
      );
      const tsconfig = JSON.parse(
        await readFile(path.join(projectPath, "tsconfig.json"), "utf8"),
      ) as {
        compilerOptions: {
          types: string[];
          baseUrl?: string;
          ignoreDeprecations?: string;
        };
      };
      expect(cssEnv).not.toContain("uniwind/types");
      expect(tsconfig.compilerOptions.types).toEqual(["node"]);
      expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
      expect(tsconfig.compilerOptions.ignoreDeprecations).toBeUndefined();
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("updates tsconfig path aliases to src when src/app is present", async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-src-aliases-"),
    );
    try {
      await mkdir(path.join(projectPath, "src", "app"), { recursive: true });
      await mkdir(path.join(projectPath, "src", "components"), {
        recursive: true,
      });
      await writeFile(
        path.join(projectPath, "tsconfig.json"),
        JSON.stringify({
          extends: "expo/tsconfig.base",
          compilerOptions: {
            strict: true,
            paths: {
              "@/*": ["./*"],
              "components/*": ["./components/*"],
              "core/*": ["./core/*"],
            },
          },
        }),
        "utf8",
      );
      await writeFile(
        path.join(projectPath, "package.json"),
        JSON.stringify({ name: "src-aliases", devDependencies: {} }),
        "utf8",
      );

      await expect(
        repairGeneratedTypeSupport(projectPath, { needsNodeTypes: true }),
      ).resolves.toEqual([
        path.join(projectPath, "tsconfig.json"),
        path.join(projectPath, "package.json"),
      ]);

      const tsconfig = JSON.parse(
        await readFile(path.join(projectPath, "tsconfig.json"), "utf8"),
      ) as {
        compilerOptions: {
          baseUrl?: string;
          ignoreDeprecations?: string;
          types?: string[];
          paths?: Record<string, string[]>;
        };
      };
      expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
      expect(tsconfig.compilerOptions.ignoreDeprecations).toBeUndefined();
      expect(tsconfig.compilerOptions.types).toEqual(["node"]);
      expect(tsconfig.compilerOptions.paths?.["@/*"]).toEqual(["./src/*"]);
      expect(tsconfig.compilerOptions.paths?.["components/*"]).toEqual([
        "./src/components/*",
      ]);
      expect(tsconfig.compilerOptions.paths?.["core/*"]).toEqual(["./core/*"]);
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("repairs NativeWindUI Picker web-only unknown prop warnings", async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-picker-repair-"),
    );
    try {
      await mkdir(path.join(projectPath, "components", "nativewindui"), {
        recursive: true,
      });
      const pickerPath = path.join(
        projectPath,
        "components",
        "nativewindui",
        "Picker.tsx",
      );
      await writeFile(
        pickerPath,
        [
          "import { Picker as RNPicker } from '@react-native-picker/picker';",
          "import { View } from 'react-native';",
          "",
          "export function Picker<T>({ dropdownIconRippleColor, ...props }: React.ComponentProps<typeof RNPicker<T>>) {",
          "  return (",
          "    <View>",
          "      <RNPicker",
          "        dropdownIconRippleColor={dropdownIconRippleColor ?? colors.foreground}",
          "        {...props}",
          "      />",
          "    </View>",
          "  );",
          "}",
          "",
        ].join("\n"),
        "utf8",
      );

      await expect(
        repairGeneratedNativeWindUiPicker(projectPath),
      ).resolves.toEqual([pickerPath]);
      const repaired = await readFile(pickerPath, "utf8");
      expect(repaired).toContain(
        "import { Platform, View } from 'react-native';",
      );
      expect(repaired).toContain("Platform.OS === 'web' ? {}");
      expect(repaired).not.toContain("        dropdownIconRippleColor=");
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("repairs NativeWindUI Picker web-only unknown prop warnings inside src/components", async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-picker-repair-src-"),
    );
    try {
      await mkdir(path.join(projectPath, "src", "components", "nativewindui"), {
        recursive: true,
      });
      const pickerPath = path.join(
        projectPath,
        "src",
        "components",
        "nativewindui",
        "Picker.tsx",
      );
      await writeFile(
        pickerPath,
        [
          "import { Picker as RNPicker } from '@react-native-picker/picker';",
          "import { View } from 'react-native';",
          "",
          "export function Picker<T>({ dropdownIconRippleColor, ...props }: React.ComponentProps<typeof RNPicker<T>>) {",
          "  return (",
          "    <View>",
          "      <RNPicker",
          "        dropdownIconRippleColor={dropdownIconRippleColor ?? colors.foreground}",
          "        {...props}",
          "      />",
          "    </View>",
          "  );",
          "}",
          "",
        ].join("\n"),
        "utf8",
      );

      await expect(
        repairGeneratedNativeWindUiPicker(projectPath),
      ).resolves.toEqual([pickerPath]);
      const repaired = await readFile(pickerPath, "utf8");
      expect(repaired).toContain(
        "import { Platform, View } from 'react-native';",
      );
      expect(repaired).toContain("Platform.OS === 'web' ? {}");
      expect(repaired).not.toContain("        dropdownIconRippleColor=");
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("forces expo.web.output to server while stylist sync API route exists", async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-stylist-server-"),
    );
    try {
      await mkdir(path.join(projectPath, "src", "app", "exposition"), {
        recursive: true,
      });
      await writeFile(
        path.join(
          projectPath,
          "src",
          "app",
          "exposition",
          "stylist-sync+api.ts",
        ),
        "export {};",
        "utf8",
      );
      await writeFile(
        path.join(projectPath, "app.json"),
        JSON.stringify({
          expo: {
            web: {
              output: "static",
            },
            platforms: ["ios", "android", "web"],
          },
        }),
        "utf8",
      );

      await expect(
        repairExpoWebOutputForStylistLifecycle(projectPath, "static"),
      ).resolves.toEqual([path.join(projectPath, "app.json")]);

      const repaired = JSON.parse(
        await readFile(path.join(projectPath, "app.json"), "utf8"),
      ) as {
        expo: { web: { output: string } };
      };
      expect(repaired.expo.web.output).toBe("server");
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("restores preferred web output when stylist sync API route is absent", async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-stylist-static-"),
    );
    try {
      await mkdir(projectPath, { recursive: true });
      await writeFile(
        path.join(projectPath, "app.json"),
        JSON.stringify({
          expo: {
            web: {
              output: "server",
            },
            platforms: ["ios", "android", "web"],
          },
        }),
        "utf8",
      );

      await expect(
        repairExpoWebOutputForStylistLifecycle(projectPath, "static"),
      ).resolves.toEqual([path.join(projectPath, "app.json")]);

      const repaired = JSON.parse(
        await readFile(path.join(projectPath, "app.json"), "utf8"),
      ) as {
        expo: { web: { output: string } };
      };
      expect(repaired.expo.web.output).toBe("static");
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("maps preferred spa output to expo single when stylist sync API route is absent", async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-stylist-spa-"),
    );
    try {
      await mkdir(projectPath, { recursive: true });
      await writeFile(
        path.join(projectPath, "app.json"),
        JSON.stringify({
          expo: {
            web: {
              output: "server",
            },
            platforms: ["web"],
          },
        }),
        "utf8",
      );

      await expect(
        repairExpoWebOutputForStylistLifecycle(projectPath, "spa"),
      ).resolves.toEqual([path.join(projectPath, "app.json")]);

      const repaired = JSON.parse(
        await readFile(path.join(projectPath, "app.json"), "utf8"),
      ) as {
        expo: { web: { output: string } };
      };
      expect(repaired.expo.web.output).toBe("single");
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("resolves the expected Windows Tailwind oxide package for known arches", () => {
    expect(
      resolveWindowsTailwindOxidePackage({
        platform: "win32",
        arch: "x64",
        nodeTargetType: "executable",
      }),
    ).toBe("@tailwindcss/oxide-win32-x64-msvc");
    expect(
      resolveWindowsTailwindOxidePackage({
        platform: "win32",
        arch: "x64",
        nodeTargetType: "shared_library",
      }),
    ).toBe("@tailwindcss/oxide-win32-x64-gnu");
    expect(
      resolveWindowsTailwindOxidePackage({
        platform: "darwin",
        arch: "x64",
      }),
    ).toBeUndefined();
  });

  it("detects a missing Windows Tailwind oxide binding for uniwind projects", async () => {
    const projectPath = await mkdtemp(
      path.join(os.tmpdir(), "super-stack-windows-oxide-"),
    );
    try {
      await mkdir(
        path.join(projectPath, "node_modules", "@tailwindcss", "oxide"),
        {
          recursive: true,
        },
      );
      await writeFile(
        path.join(projectPath, "package.json"),
        JSON.stringify({
          dependencies: {
            uniwind: "^1.6.4",
          },
        }),
        "utf8",
      );
      await writeFile(
        path.join(
          projectPath,
          "node_modules",
          "@tailwindcss",
          "oxide",
          "package.json",
        ),
        JSON.stringify({ version: "4.2.1" }),
        "utf8",
      );

      const resolved =
        await resolveMissingWindowsTailwindOxideBinding(projectPath);
      if (process.platform === "win32") {
        expect(resolved).toBeDefined();
        expect(resolved).toContain("@4.2.1");
      } else {
        expect(resolved).toBeUndefined();
      }
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });
});
