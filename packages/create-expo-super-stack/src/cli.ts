#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  access,
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { cancel, isCancel, log, text } from "@clack/prompts";
import {
  SUPER_STACK_SUCCESS_MESSAGE,
  collectOnboardPlan,
  defaultOnboardPlan,
  savePersonalOnboardDefaults,
} from "@mr.dj2u/cli/onboarding";
import { scaffoldProjectMemory } from "@mr.dj2u/cli/project-memory";
import {
  generateProjectRoadmap,
} from "@mr.dj2u/cli/roadmap";
import {
  buildLockfileInstallCommand,
  prepareCommandForSpawn as prepareSharedCommandForSpawn,
  runProjectCommand as runSharedProjectCommand,
} from "@mr.dj2u/cli/package-install";

import type { OnboardArgv } from "@mr.dj2u/cli/onboarding";

export interface ParsedArgs {
  projectName?: string;
  createExpoStackArgs: string[];
  helpRequested: boolean;
  mds: {
    appName?: string;
    overview?: string;
    audience?: string;
    problemStatement?: string;
    productGoals?: string;
    nonGoals?: string;
    coreFlows?: string;
    screens?: string;
    monetizationStrategy?: string;
    teamContext?: string;
    laterScope?: string;
    researchNotes?: string;
    dataNeeds?: string;
    dataStart?: "local" | "supabase";
    authProvider?: OnboardArgv["authProvider"];
    onboardingFlow?: OnboardArgv["onboardingFlow"];
    legalDocumentMode?: OnboardArgv["legalDocumentMode"];
    onboardingCompletionMode?: OnboardArgv["onboardingCompletionMode"];
    legalUpdateGate?: OnboardArgv["legalUpdateGate"];
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
    platformStrategy?: "folders" | "files-only";
    appDirectory?: "src" | "root";
    platformLayouts?: "shared" | "platform-specific";
    webOutput?: "static" | "server" | "spa" | "none";
    deployedServer?: "standard-expo" | "custom" | "none";
    createExpoComponents?: boolean;
    expoUi?: boolean;
    expoUiUniversal?: boolean;
    expoNativeTabs?: boolean;
    easUses?: string[];
    saveDefaults?: boolean;
  };
}

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
type OnboardWebOutput = "static" | "server" | "spa" | "none";
type ExpoWebOutput = "single" | "static" | "server";
const DEFAULT_PROJECT_NAME = "my-expo-app";
export const EXPECTED_EXPO_SDK_MAJOR = 56;
export const EXPECTED_EXPO_PACKAGE_SPEC = "expo@~56.0.19";
const STYLIST_SYNC_API_ROUTES = [
  "app/exposition/stylist-sync+api.ts",
  "src/app/exposition/stylist-sync+api.ts",
] as const;

export interface CommandSpec {
  command: string;
  args: string[];
  display: string;
  shell?: boolean;
  env?: Record<string, string>;
}

export function prepareCommandForSpawn(
  spec: CommandSpec,
  {
    platform = process.platform,
    comSpec = process.env.ComSpec,
  }: { platform?: typeof process.platform; comSpec?: string | undefined } = {},
): CommandSpec {
  return prepareSharedCommandForSpawn(spec, { platform, comSpec });
}

export async function main(): Promise<void> {
  const initialParsed = parseArgs(process.argv.slice(2));
  if (initialParsed.helpRequested) {
    console.log(renderHelpText());
    return;
  }
  const parsed = withResolvedProjectName(
    initialParsed,
    await promptForMissingProjectName(initialParsed),
  );
  validateCreateExpoStackArgs(parsed.createExpoStackArgs);
  const projectName = parsed.projectName ?? DEFAULT_PROJECT_NAME;
  const projectParentDir = parsed.mds.projectParentDir ?? process.cwd();
  const createExpoStackArgs = prepareCreateExpoStackArgsForWrapper(
    parsed.createExpoStackArgs,
    parsed.mds.skipExpoFix,
  );

  printIntro(projectName, createExpoStackArgs, projectParentDir);

  if (!parsed.mds.skipCreate) {
    await runCreateExpoStack(
      createExpoStackArgs,
      parsed.mds.createExpoStackBin,
      projectParentDir,
    );
  } else {
    console.log(
      "Skipping create-expo-stack because --mds-skip-create was passed.",
    );
  }

  const projectPath = await resolveGeneratedProjectPath(
    projectParentDir,
    projectName,
  );
  const easSelected = await detectEasSetup(
    projectPath,
    parsed.createExpoStackArgs,
  );
  const onboardArgv = buildOnboardArgv(projectPath, parsed, easSelected);
  const plan = parsed.mds.yes
    ? defaultOnboardPlan(onboardArgv, projectPath)
    : await collectOnboardPlan(onboardArgv, projectPath);
  const movedAppDir =
    plan.answers.appDirectory === "src"
      ? await moveRootAppIntoSrc(projectPath)
      : null;
  const consolidatedSourceRepairs =
    plan.answers.appDirectory === "src"
      ? await consolidateRootSourceFolders(projectPath)
      : [];
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
  const postScaffoldImportRepairs = movedAppDir
    ? await repairMovedSrcAppImports(projectPath)
    : [];
  const identifierRepairs = await repairExpoProjectIdentifiers(
    projectPath,
    projectName,
    plan.answers.targetPlatforms,
  );
  const stylistWebOutputRepairs = await repairExpoWebOutputForStylistLifecycle(
    projectPath,
    plan.answers.webOutput,
  );
  const hasStylistSyncRoute = await hasStylistSyncApiRoute(projectPath);
  const typeSupportRepairs = await repairGeneratedTypeSupport(projectPath, {
    needsNodeTypes: hasStylistSyncRoute,
    needsUniwindTypes: plan.answers.defaults.includes("uniwind"),
  });
  const nativeWindUiPickerRepairs =
    await repairGeneratedNativeWindUiPicker(projectPath);
  const eslintConfigRepairs = await repairGeneratedEslintConfig(projectPath);

  console.log();
  console.log("MDS onboarding complete.");
  for (const result of written) {
    console.log(
      `${result.wrote ? "CREATED" : "KEPT"} ${path.relative(process.cwd(), result.filePath)}`,
    );
  }
  if (movedAppDir) {
    console.log(
      `MOVED ${path.relative(process.cwd(), movedAppDir.from)} -> ${path.relative(process.cwd(), movedAppDir.to)}`,
    );
  }
  for (const result of consolidatedSourceRepairs) {
    console.log(`UPDATED ${path.relative(process.cwd(), result)}`);
  }
  for (const result of movedImportRepairs) {
    console.log(`UPDATED ${path.relative(process.cwd(), result)}`);
  }
  for (const result of postScaffoldImportRepairs) {
    console.log(`UPDATED ${path.relative(process.cwd(), result)}`);
  }
  for (const result of identifierRepairs) {
    console.log(`UPDATED ${path.relative(process.cwd(), result)}`);
  }
  for (const result of stylistWebOutputRepairs) {
    console.log(`UPDATED ${path.relative(process.cwd(), result)}`);
  }
  for (const result of typeSupportRepairs) {
    console.log(`UPDATED ${path.relative(process.cwd(), result)}`);
  }
  for (const result of nativeWindUiPickerRepairs) {
    console.log(`UPDATED ${path.relative(process.cwd(), result)}`);
  }
  for (const result of eslintConfigRepairs) {
    console.log(`UPDATED ${path.relative(process.cwd(), result)}`);
  }
  if (plan.saveDefaults) {
    const defaultsPath = savePersonalOnboardDefaults(plan.answers);
    if (defaultsPath) {
      console.log(`Saved personal onboarding defaults: ${defaultsPath}`);
    }
  }

  const roadmapStatus = await generateProjectRoadmap(projectPath, {
    write: false,
    preserveStatus: true,
  });
  if (roadmapStatus.blockedByMarkers) {
    console.log();
    console.log("Roadmap note:");
    console.log(
      "Unresolved # TodoForContext(optional): markers are still present in project/info.md, so MDS intentionally left the scaffolded phase template in place.",
    );
    console.log(
      "Resolve those project/info.md markers first, then run `mds roadmap` or let your agent refresh project/todo.md from project/info.md.",
    );
  } else if (roadmapStatus.needsClarification) {
    console.log();
    console.log("Roadmap note:");
    console.log(
      "The project docs are still too generic for a high-confidence derived roadmap, so have your agent ask clarifying questions and then rerun `mds roadmap`.",
    );
  }

  const packageManager = await detectPackageManager(
    projectPath,
    parsed.createExpoStackArgs,
  );
  const noInstallRequested = hasNoInstallFlag(parsed.createExpoStackArgs);
  if (shouldRunExpoProjectChecks(parsed, noInstallRequested)) {
    await runExpoProjectChecks(projectPath, packageManager);
  } else if (noInstallRequested) {
    console.log();
    console.log(
      "Skipped install and Expo dependency repair because create-expo-stack was run with --no-install.",
    );
  }

  await assertExpectedExpoSdk(projectPath);

  console.log();
  const nextStepsCommands = [
    `cd ${quoteDisplayArg(path.relative(process.cwd(), projectPath) || ".")}`,
  ];
  if (noInstallRequested || parsed.mds.skipExpoFix || parsed.mds.skipCreate) {
    nextStepsCommands.push(buildInstallCommand(packageManager).display);
    if (await shouldRunExpoLatestSdkCommand(projectPath)) {
      nextStepsCommands.push(buildExpoLatestSdkCommand(packageManager).display);
    }
    nextStepsCommands.push(buildExpoInstallFixCommand(packageManager).display);
    if (await shouldInstallExpoFontPeer(projectPath)) {
      nextStepsCommands.push(buildExpoFontInstallCommand(packageManager).display);
    }
    nextStepsCommands.push(buildExpoDoctorCommand(packageManager).display);
  }
  nextStepsCommands.push(buildRunScriptCommand(packageManager, "clear-expo-start"));
  printCopyableCommands("Next steps", nextStepsCommands);
  console.log();
  console.log(SUPER_STACK_SUCCESS_MESSAGE);
  console.log();
  console.log(
    "For the full dev-suite locally, use the generated scripts or install @mr.dj2u/cli in the app.",
  );
}

export function prepareCreateExpoStackArgsForWrapper(
  args: string[],
  _skipExpoFix = false,
): string[] {
  return args;
}

export function parseArgs(args: string[]): ParsedArgs {
  const createExpoStackArgs: string[] = [];
  const mds: ParsedArgs["mds"] = {
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

    if (!arg.startsWith("--") && !projectName) {
      if (arg === "-h") {
        helpRequested = true;
        continue;
      }
      projectName = arg;
      createExpoStackArgs.push(arg);
      continue;
    }

    if (arg === "--help" || arg === "-h" || arg === "--mds-help") {
      helpRequested = true;
      continue;
    }

    if (arg === "--mds-force") {
      mds.force = true;
      continue;
    }

    if (arg === "--mds-no-rich") {
      mds.rich = false;
      continue;
    }

    if (arg === "--mds-rich") {
      mds.rich = true;
      continue;
    }

    if (arg === "--mds-save-defaults") {
      mds.saveDefaults = true;
      continue;
    }

    if (arg === "--mds-no-save-defaults") {
      mds.saveDefaults = false;
      continue;
    }

    if (arg === "--mds-yes" || arg === "--mds-non-interactive") {
      mds.yes = true;
      continue;
    }

    if (arg === "--mds-skip-create") {
      mds.skipCreate = true;
      continue;
    }

    if (arg === "--mds-skip-expo-fix" || arg === "--mds-no-expo-fix") {
      mds.skipExpoFix = true;
      continue;
    }

    if (arg.startsWith("--mds-create-expo-stack-bin=")) {
      mds.createExpoStackBin = arg.slice("--mds-create-expo-stack-bin=".length);
      continue;
    }

    if (arg === "--mds-guidelines-template") {
      mds.guidelinesTemplate = true;
      continue;
    }

    if (
      arg === "--mds-no-guidelines-template" ||
      arg === "--mds-guidelines-template=false"
    ) {
      mds.guidelinesTemplate = false;
      continue;
    }

    if (arg.startsWith("--mds-guidelines-template=")) {
      mds.guidelinesTemplate = true;
      mds.guidelinesTemplatePath = arg.slice(
        "--mds-guidelines-template=".length,
      );
      continue;
    }

    if (arg.startsWith("--mds-guidelines-template-path=")) {
      mds.guidelinesTemplate = true;
      mds.guidelinesTemplatePath = arg.slice(
        "--mds-guidelines-template-path=".length,
      );
      continue;
    }

    if (arg.startsWith("--mds-defaults=")) {
      mds.defaults = splitList(arg.slice("--mds-defaults=".length));
      continue;
    }

    if (arg.startsWith("--mds-app-name=")) {
      mds.appName = arg.slice("--mds-app-name=".length);
      continue;
    }

    if (arg.startsWith("--mds-overview=")) {
      mds.overview = arg.slice("--mds-overview=".length);
      continue;
    }

    if (arg.startsWith("--mds-audience=")) {
      mds.audience = arg.slice("--mds-audience=".length);
      continue;
    }

    if (arg.startsWith("--mds-problem-statement=")) {
      mds.problemStatement = arg.slice("--mds-problem-statement=".length);
      continue;
    }

    if (arg.startsWith("--mds-product-goals=")) {
      mds.productGoals = arg.slice("--mds-product-goals=".length);
      continue;
    }

    if (arg.startsWith("--mds-non-goals=")) {
      mds.nonGoals = arg.slice("--mds-non-goals=".length);
      continue;
    }

    if (arg.startsWith("--mds-core-flows=")) {
      mds.coreFlows = arg.slice("--mds-core-flows=".length);
      continue;
    }

    if (arg.startsWith("--mds-screens=")) {
      mds.screens = arg.slice("--mds-screens=".length);
      continue;
    }

    if (arg.startsWith("--mds-monetization-strategy=")) {
      mds.monetizationStrategy = arg.slice("--mds-monetization-strategy=".length);
      continue;
    }

    if (arg.startsWith("--mds-team-context=")) {
      mds.teamContext = arg.slice("--mds-team-context=".length);
      continue;
    }

    if (arg.startsWith("--mds-later-scope=")) {
      mds.laterScope = arg.slice("--mds-later-scope=".length);
      continue;
    }

    if (arg.startsWith("--mds-research-notes=")) {
      mds.researchNotes = arg.slice("--mds-research-notes=".length);
      continue;
    }

    if (arg.startsWith("--mds-data-needs=")) {
      mds.dataNeeds = arg.slice("--mds-data-needs=".length);
      continue;
    }

    if (arg.startsWith("--mds-data-start=")) {
      const value = arg.slice("--mds-data-start=".length);
      if (value === "local" || value === "supabase") {
        mds.dataStart = value;
      }
      continue;
    }

    if (
      arg.startsWith("--mds-auth-provider=") ||
      arg.startsWith("--mds-auth-backend=")
    ) {
      const value = arg.includes("--mds-auth-provider=")
        ? arg.slice("--mds-auth-provider=".length)
        : arg.slice("--mds-auth-backend=".length);
      if (
        value === "none" ||
        value === "base" ||
        value === "supabase" ||
        value === "firebase" ||
        value === "convex"
      ) {
        mds.authProvider = value;
      }
      continue;
    }

    if (arg.startsWith("--mds-onboarding-flow=")) {
      const value = arg.slice("--mds-onboarding-flow=".length);
      if (value === "none" || value === "multi-screen") {
        mds.onboardingFlow = value;
      }
      continue;
    }

    if (arg.startsWith("--mds-legal-documents=")) {
      const value = arg.slice("--mds-legal-documents=".length);
      if (
        value === "none" ||
        value === "public-routes" ||
        value === "onboarding-agreement"
      ) {
        mds.legalDocumentMode = value;
      }
      continue;
    }

    if (arg.startsWith("--mds-onboarding-completion=")) {
      const value = arg.slice("--mds-onboarding-completion=".length);
      if (
        value === "enter-app" ||
        value === "auth" ||
        value === "account-setup" ||
        value === "custom"
      ) {
        mds.onboardingCompletionMode = value;
      }
      continue;
    }

    if (arg.startsWith("--mds-legal-update-gate=")) {
      const value = arg.slice("--mds-legal-update-gate=".length);
      if (value === "none" || value === "material-required") {
        mds.legalUpdateGate = value;
      }
      continue;
    }

    if (arg.startsWith("--mds-deployment-target=")) {
      mds.deploymentTarget = arg.slice("--mds-deployment-target=".length);
      continue;
    }

    if (arg === "--mds-test-to-main") {
      mds.testToMain = true;
      continue;
    }

    if (arg === "--mds-no-test-to-main") {
      mds.testToMain = false;
      continue;
    }

    if (arg.startsWith("--mds-platforms=")) {
      mds.platforms = splitList(arg.slice("--mds-platforms=".length));
      continue;
    }

    if (arg.startsWith("--mds-first-platform=")) {
      mds.firstPlatform = arg.slice("--mds-first-platform=".length);
      continue;
    }

    if (arg.startsWith("--mds-platform-strategy=")) {
      const value = arg.slice("--mds-platform-strategy=".length);
      if (value === "folders" || value === "files-only") {
        mds.platformStrategy = value;
      }
      continue;
    }

    if (arg.startsWith("--mds-app-directory=")) {
      const value = arg.slice("--mds-app-directory=".length);
      if (value === "src" || value === "root") {
        mds.appDirectory = value;
      }
      continue;
    }

    if (arg.startsWith("--mds-platform-layouts=")) {
      const value = arg.slice("--mds-platform-layouts=".length);
      if (value === "shared" || value === "platform-specific") {
        mds.platformLayouts = value;
      }
      continue;
    }

    if (arg.startsWith("--mds-web-output=")) {
      const value = arg.slice("--mds-web-output=".length);
      if (
        value === "static" ||
        value === "server" ||
        value === "spa" ||
        value === "none"
      ) {
        mds.webOutput = value;
      }
      continue;
    }

    if (arg.startsWith("--mds-deployed-server=")) {
      const value = arg.slice("--mds-deployed-server=".length);
      if (value === "standard-expo" || value === "custom" || value === "none") {
        mds.deployedServer = value;
      }
      continue;
    }

    if (arg === "--mds-create-expo-components") {
      mds.createExpoComponents = true;
      continue;
    }

    if (arg === "--mds-no-create-expo-components") {
      mds.createExpoComponents = false;
      continue;
    }

    if (arg === "--mds-latest-expo-sdk" || arg === "--mds-no-latest-expo-sdk") {
      continue;
    }

    if (arg === "--mds-expo-ui") {
      mds.expoUi = true;
      continue;
    }

    if (arg === "--mds-no-expo-ui") {
      mds.expoUi = false;
      continue;
    }

    if (arg === "--mds-expo-ui-universal") {
      mds.expoUiUniversal = true;
      continue;
    }

    if (arg === "--mds-no-expo-ui-universal") {
      mds.expoUiUniversal = false;
      continue;
    }

    if (arg === "--mds-expo-native-tabs") {
      mds.expoNativeTabs = true;
      continue;
    }

    if (arg === "--mds-no-expo-native-tabs") {
      mds.expoNativeTabs = false;
      continue;
    }

    if (arg.startsWith("--mds-eas-uses=")) {
      mds.easUses = splitList(arg.slice("--mds-eas-uses=".length));
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
    "create-expo-super-stack",
    "",
    "Usage:",
    "  create-expo-super-stack [project-name] [create-expo-stack options] [mds options]",
    "",
    "Examples:",
    "  create-expo-super-stack my-app --expo-router --uniwind",
    "  create-expo-super-stack ../MyApp --expo-router --mds-yes",
    "",
    "Common mds options:",
    "  --mds-yes                     Run non-interactive onboarding defaults",
    "  --mds-save-defaults           Save onboarding answers as personal defaults",
    "  --mds-no-save-defaults        Do not save onboarding answers as personal defaults",
    "  --mds-skip-create             Skip create-expo-stack and only run onboarding in an existing app",
    "  --mds-skip-expo-fix           Skip dependency install/fix/doctor repair pass",
    "  --mds-guidelines-template     Use bundled MDS project/guidelines template",
    "  --mds-no-guidelines-template  Do not use the bundled MDS project/guidelines template",
    "  --mds-app-name=<name>         Set display app name for project memory",
    "  --mds-screens=                List must-include screens for project memory",
    "  --mds-auth-provider=          none | base | supabase | firebase | convex",
    "  --mds-onboarding-flow=        none | multi-screen",
    "  --mds-legal-documents=        none | public-routes | onboarding-agreement",
    "  --mds-onboarding-completion=  enter-app | auth | account-setup | custom",
    "  --mds-legal-update-gate=      none | material-required",
    "  --mds-expo-ui-universal       Use Expo UI Universal components when Expo UI is selected",
    "",
    "Help:",
    "  -h, --help                     Show this help and exit",
    "",
    "Note:",
    "  Unknown non-mds flags are forwarded to create-expo-stack.",
  ].join("\n");
}

export function withResolvedProjectName(
  parsed: ParsedArgs,
  projectName: string,
): ParsedArgs {
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

async function promptForMissingProjectName(
  parsed: ParsedArgs,
): Promise<string> {
  if (parsed.projectName) {
    return parsed.projectName;
  }

  if (parsed.mds.yes || parsed.mds.skipCreate) {
    return DEFAULT_PROJECT_NAME;
  }

  const answer = await text({
    message: "What is the name of your app?",
    placeholder: DEFAULT_PROJECT_NAME,
    defaultValue: DEFAULT_PROJECT_NAME,
    validate: (value) => {
      if (!value.trim()) {
        return "Please enter an app name, or press Enter to use the visible default.";
      }
      return undefined;
    },
  });

  if (isCancel(answer)) {
    cancel(
      "Cancelled. You can rerun create-expo-super-stack whenever you are ready.",
    );
    process.exit(0);
  }

  const projectName = answer.trim() || DEFAULT_PROJECT_NAME;
  log.success(`Great, creating ${projectName}.`);
  return projectName;
}

function printIntro(
  projectName: string,
  createExpoStackArgs: string[],
  projectParentDir = process.cwd(),
): void {
  console.log("create-expo-super-stack");
  console.log();
  console.log(
    "This uses create-expo-stack under the hood, then applies MDS onboarding.",
  );
  console.log(
    `Delegating: create-expo-stack ${formatDisplayArgs(createExpoStackArgs)}`,
  );
  console.log(`Target app: ${projectName}`);
  if (projectParentDir !== process.cwd()) {
    console.log(`Target folder: ${path.join(projectParentDir, projectName)}`);
  }
  console.log();
}

async function runCreateExpoStack(
  args: string[],
  overrideBin?: string,
  cwd = process.cwd(),
): Promise<void> {
  const command = await resolveCreateExpoStackCommand(overrideBin);
  console.log(`Using create-expo-stack command: ${command.display}`);
  await new Promise<void>((resolve, reject) => {
    const spawnSpec = prepareCommandForSpawn({
      ...command,
      args: [...command.args, ...args],
    });
    const child = spawn(spawnSpec.command, spawnSpec.args, {
      cwd,
      shell: spawnSpec.shell ?? false,
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`create-expo-stack exited with code ${code ?? "unknown"}.`),
        );
      }
    });
  });
}

export function resolveProjectTarget(
  rawProjectName: string,
  cwd = process.cwd(),
): { projectName: string; parentDir: string } {
  const trimmed = rawProjectName.trim();
  const normalized = trimmed.replace(/[\\/]+$/u, "") || DEFAULT_PROJECT_NAME;
  const hasPathSyntax =
    path.isAbsolute(normalized) ||
    normalized.includes("/") ||
    normalized.includes("\\");

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
  const projectArgIndex = nextArgs.findIndex((arg) => !arg.startsWith("--"));

  if (projectArgIndex >= 0) {
    nextArgs[projectArgIndex] = projectName;
    return nextArgs;
  }

  return [projectName, ...nextArgs];
}

export function validateCreateExpoStackArgs(args: string[]): void {
  const authFlags = ["--supabase", "--firebase"].filter((flag) =>
    args.some((arg) => arg === flag || arg.startsWith(`${flag}=`)),
  );

  if (authFlags.length > 1) {
    throw new Error(
      `Choose one create-expo-stack auth provider, not ${authFlags.join(
        " and ",
      )}. create-expo-stack scaffolds a single auth slice; Super Stack can still document future data/backend plans in project/.`,
    );
  }
}

export async function runExpoProjectChecks(
  projectPath: string,
  packageManager: PackageManager,
): Promise<void> {
  console.log();
  console.log(
    "Installing MDS-added dependencies, then running Expo dependency repair and doctor.",
  );
  await runProjectCommand(projectPath, buildInstallCommand(packageManager));
  const missingWindowsOxideBinding =
    await resolveMissingWindowsTailwindOxideBinding(projectPath);
  if (missingWindowsOxideBinding) {
    await runProjectCommand(
      projectPath,
      buildAddDevDependencyCommand(packageManager, missingWindowsOxideBinding),
    );
  }
  if (await shouldRunExpoLatestSdkCommand(projectPath)) {
    await runProjectCommand(
      projectPath,
      buildExpoLatestSdkCommand(packageManager),
    );
  } else {
    console.log(
      `  Expo dependency already targets SDK ${EXPECTED_EXPO_SDK_MAJOR} updates; skipping expo install ${EXPECTED_EXPO_PACKAGE_SPEC}.`,
    );
  }
  await runProjectCommand(
    projectPath,
    buildExpoInstallFixCommand(packageManager),
  );
  if (await shouldInstallExpoFontPeer(projectPath)) {
    await runProjectCommand(
      projectPath,
      buildExpoFontInstallCommand(packageManager),
    );
  }
  await runProjectCommand(
    projectPath,
    buildPrettierWriteCommand(packageManager),
  );
  await runProjectCommand(projectPath, buildExpoDoctorCommand(packageManager));
}

async function runProjectCommand(
  projectPath: string,
  spec: CommandSpec,
): Promise<void> {
  console.log(`  ${spec.display}`);
  await runSharedProjectCommand(spec, { cwd: projectPath });
}

async function resolveCreateExpoStackCommand(
  overrideBin?: string,
): Promise<CommandSpec> {
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const executable =
    process.platform === "win32"
      ? "create-expo-stack.cmd"
      : "create-expo-stack";
  const override =
    overrideBin ??
    process.env.MRDJ_CREATE_EXPO_STACK_BIN ??
    process.env.CREATE_EXPO_STACK_BIN;
  if (override) {
    const overridePath = path.resolve(override);
    return {
      command: process.execPath,
      args: [overridePath],
      display: `node ${overridePath}`,
      shell: false,
    };
  }

  const localForkCliRoot = path.join(
    packageRoot,
    "..",
    "..",
    "..",
    "create-expo-stack",
    "cli",
  );
  const localForkBin = path.join(
    localForkCliRoot,
    "bin",
    "create-expo-stack.js",
  );
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
    path.join(
      packageRoot,
      "node_modules",
      "@mr.dj2u",
      "create-expo-stack",
      "bin",
      "create-expo-stack.js",
    ),
    path.join(
      packageRoot,
      "..",
      "..",
      "node_modules",
      "@mr.dj2u",
      "create-expo-stack",
      "bin",
      "create-expo-stack.js",
    ),
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
    path.join(packageRoot, "node_modules", ".bin", executable),
    path.join(packageRoot, "..", "..", "node_modules", ".bin", executable),
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
    command: "create-expo-stack",
    args: [],
    display: "create-expo-stack",
  };
}

async function ensureLocalCreateExpoStackBuild(
  localForkCliRoot: string,
): Promise<void> {
  const buildEntry = path.join(localForkCliRoot, "build", "cli.js");
  if (await pathExists(buildEntry)) {
    return;
  }

  console.log(`Building local create-expo-stack fork: ${localForkCliRoot}`);
  if (await commandExists("bun")) {
    await runProjectCommand(localForkCliRoot, {
      command: "bun",
      args: ["run", "build"],
      display: "bun run build",
    });
    return;
  }

  console.log("Bun was not found, so using npm to build the local fork.");
  if (!(await pathExists(path.join(localForkCliRoot, "node_modules")))) {
    await runProjectCommand(localForkCliRoot, {
      command: "npm",
      args: ["install"],
      display: "npm install",
    });
  }
  await runProjectCommand(localForkCliRoot, {
    command: "npx",
    args: ["tsc", "-p", "."],
    display: "npx tsc -p .",
  });
  await runProjectCommand(localForkCliRoot, {
    command: "npx",
    args: [
      "copyfiles",
      "-u",
      "2",
      "-a",
      "./src/templates/**/*",
      "./build/templates",
    ],
    display: 'npx copyfiles -u 2 -a "./src/templates/**/*" ./build/templates',
  });
}

async function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const spec = prepareCommandForSpawn({
      command,
      args: ["--version"],
      display: `${command} --version`,
    });
    const child = spawn(spec.command, spec.args, {
      shell: spec.shell ?? false,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

async function resolveGeneratedProjectPath(
  cwd: string,
  projectName: string,
): Promise<string> {
  const directPath = path.resolve(cwd, projectName);
  if (await pathExists(path.join(directPath, "package.json"))) {
    return directPath;
  }

  const fromCesConfig = await findProjectFromCesConfig(cwd, projectName);
  if (fromCesConfig) {
    return fromCesConfig;
  }

  return directPath;
}

export async function moveRootAppIntoSrc(
  projectPath: string,
): Promise<{ from: string; to: string } | null> {
  const rootAppDir = path.join(projectPath, "app");
  const srcAppDir = path.join(projectPath, "src", "app");
  if (!(await pathExists(rootAppDir))) {
    return null;
  }

  await mkdir(path.dirname(srcAppDir), { recursive: true });
  if (await pathExists(srcAppDir)) {
    const conflicts = await findDirectoryMergeConflicts(rootAppDir, srcAppDir);
    if (conflicts.length > 0) {
      throw new Error(
        [
          "Cannot move app/ into src/app because the generated route trees overlap.",
          `Conflicting path${conflicts.length === 1 ? "" : "s"}: ${conflicts.join(", ")}`,
          "Merge these files manually, then remove the root app/ directory.",
        ].join(" "),
      );
    }
    await mergeDirectoryInto(rootAppDir, srcAppDir);
    await rm(rootAppDir, { recursive: true, force: true });
  } else {
    await rename(rootAppDir, srcAppDir);
  }
  return { from: rootAppDir, to: srcAppDir };
}

async function consolidateRootSourceFolders(
  projectPath: string,
): Promise<string[]> {
  const folderNames = ["components", "theme", "lib"];
  const updatedPaths: string[] = [];
  for (const folderName of folderNames) {
    const rootDir = path.join(projectPath, folderName);
    if (!(await pathExists(rootDir))) {
      continue;
    }
    const srcDir = path.join(projectPath, "src", folderName);
    if (!(await pathExists(srcDir))) {
      await mkdir(path.dirname(srcDir), { recursive: true });
      await rename(rootDir, srcDir);
      updatedPaths.push(srcDir);
      continue;
    }
    await mergeDirectoryInto(rootDir, srcDir);
    await rm(rootDir, { recursive: true, force: true });
    updatedPaths.push(srcDir);
  }

  return updatedPaths;
}

async function pathType(filePath: string): Promise<"directory" | "file" | null> {
  try {
    const stats = await lstat(filePath);
    return stats.isDirectory() ? "directory" : "file";
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function findDirectoryMergeConflicts(
  sourceDir: string,
  targetDir: string,
  relativeDir = "",
): Promise<string[]> {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const conflicts: string[] = [];

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    const relativePath = path.join(relativeDir, entry.name);
    const targetType = await pathType(targetPath);
    if (!targetType) {
      continue;
    }

    if (entry.isDirectory() && targetType === "directory") {
      conflicts.push(...(await findDirectoryMergeConflicts(sourcePath, targetPath, relativePath)));
      continue;
    }

    conflicts.push(relativePath);
  }

  return conflicts;
}

async function mergeDirectoryInto(
  sourceDir: string,
  targetDir: string,
): Promise<void> {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await mergeDirectoryInto(sourcePath, targetPath);
      continue;
    }
    if (await pathExists(targetPath)) {
      await rm(sourcePath, { force: true });
      continue;
    }
    await mkdir(path.dirname(targetPath), { recursive: true });
    await rename(sourcePath, targetPath);
  }
}

export async function repairMovedSrcAppImports(
  projectPath: string,
): Promise<string[]> {
  const layoutPaths: Array<{
    filePath: string;
    replacements: Array<[from: string, to: string]>;
  }> = [
    {
      filePath: path.join(projectPath, "src", "app", "(tabs)", "_layout.tsx"),
      replacements: [
        ['"../components/HeaderButton"', '"../../components/HeaderButton"'],
        ['"../components/TabBarIcon"', '"../../components/TabBarIcon"'],
        ["'../components/HeaderButton'", "'../../components/HeaderButton'"],
        ["'../components/TabBarIcon'", "'../../components/TabBarIcon'"],
      ],
    },
    {
      filePath: path.join(projectPath, "src", "app", "(drawer)", "_layout.tsx"),
      replacements: [
        ['"../components/HeaderButton"', '"../../components/HeaderButton"'],
        ['"../components/TabBarIcon"', '"../../components/TabBarIcon"'],
        ["'../components/HeaderButton'", "'../../components/HeaderButton'"],
        ["'../components/TabBarIcon'", "'../../components/TabBarIcon'"],
      ],
    },
    {
      filePath: path.join(
        projectPath,
        "src",
        "app",
        "(drawer)",
        "(tabs)",
        "_layout.tsx",
      ),
      replacements: [
        [
          '"../../components/HeaderButton"',
          '"../../../components/HeaderButton"',
        ],
        ['"../../components/TabBarIcon"', '"../../../components/TabBarIcon"'],
        [
          "'../../components/HeaderButton'",
          "'../../../components/HeaderButton'",
        ],
        ["'../../components/TabBarIcon'", "'../../../components/TabBarIcon'"],
      ],
    },
  ];
  const updatedPaths: string[] = [];

  for (const layout of layoutPaths) {
    const raw = await readOptionalText(layout.filePath);
    if (!raw) {
      continue;
    }

    let updated = raw;
    for (const [from, to] of layout.replacements) {
      updated = updated.split(from).join(to);
    }

    if (updated === raw) {
      continue;
    }

    await writeFile(layout.filePath, updated, "utf8");
    updatedPaths.push(layout.filePath);
  }

  return updatedPaths;
}

export async function repairGeneratedTypeSupport(
  projectPath: string,
  options: { needsNodeTypes?: boolean; needsUniwindTypes?: boolean } = {},
): Promise<string[]> {
  const updatedPaths = new Set<string>();
  let shouldIncludeUniwindTypes = false;

  if (options.needsUniwindTypes) {
    const packageJson = await readJson(path.join(projectPath, "package.json"));
    const dependencies = isRecord(packageJson.dependencies)
      ? packageJson.dependencies
      : {};
    const devDependencies = isRecord(packageJson.devDependencies)
      ? packageJson.devDependencies
      : {};
    const optionalDependencies = isRecord(packageJson.optionalDependencies)
      ? packageJson.optionalDependencies
      : {};
    shouldIncludeUniwindTypes =
      typeof dependencies.uniwind === "string" ||
      typeof devDependencies.uniwind === "string" ||
      typeof optionalDependencies.uniwind === "string" ||
      (await pathExists(
        path.join(projectPath, "node_modules", "uniwind", "types.d.ts"),
      )) ||
      (await pathExists(
        path.join(
          projectPath,
          "node_modules",
          "uniwind",
          "types",
          "index.d.ts",
        ),
      ));
  }

  if (options.needsUniwindTypes) {
    const cssEnvPath = path.join(projectPath, "css-env.d.ts");
    const raw = (await readOptionalText(cssEnvPath)) ?? "";
    if (shouldIncludeUniwindTypes && !raw.includes("uniwind/types")) {
      await writeFile(
        cssEnvPath,
        `/// <reference types="uniwind/types" />\n\n${raw}`,
        "utf8",
      );
      updatedPaths.add(cssEnvPath);
    } else if (!shouldIncludeUniwindTypes && raw.includes("uniwind/types")) {
      const updated = raw
        .replace(
          /^\/\/\/ <reference types="uniwind\/types" \/>\r?\n\r?\n?/m,
          "",
        )
        .trimStart();
      await writeFile(cssEnvPath, updated, "utf8");
      updatedPaths.add(cssEnvPath);
    }
  }

  if (options.needsNodeTypes || options.needsUniwindTypes) {
    const tsconfigPath = path.join(projectPath, "tsconfig.json");
    const tsconfig = await readJson(tsconfigPath);
    const compilerOptions = isRecord(tsconfig.compilerOptions)
      ? tsconfig.compilerOptions
      : {};
    const pathsConfig = isRecord(compilerOptions.paths)
      ? compilerOptions.paths
      : {};
    const usingSrcApp = await pathExists(path.join(projectPath, "src", "app"));
    const normalizedPathsConfig = usingSrcApp
      ? await normalizeTsconfigPathsForSrcDirectory(projectPath, pathsConfig)
      : pathsConfig;
    const existingTypes = Array.isArray(compilerOptions.types)
      ? compilerOptions.types.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
    const currentTypes = existingTypes
      ? existingTypes.filter(
          (item) => shouldIncludeUniwindTypes || item !== "uniwind/types",
        )
      : [];
    const desiredTypes = [
      ...currentTypes,
      ...(options.needsNodeTypes ? ["node"] : []),
      ...(shouldIncludeUniwindTypes ? ["uniwind/types"] : []),
    ];
    const nextTypes = Array.from(new Set(desiredTypes));
    const shouldRemoveDeprecatedTsconfigOptions =
      "baseUrl" in compilerOptions || "ignoreDeprecations" in compilerOptions;
    const shouldUpdatePaths =
      JSON.stringify(pathsConfig) !== JSON.stringify(normalizedPathsConfig);
    const shouldUpdateTypes =
      JSON.stringify(existingTypes) !== JSON.stringify(nextTypes);
    if (
      shouldUpdateTypes ||
      shouldRemoveDeprecatedTsconfigOptions ||
      shouldUpdatePaths
    ) {
      const {
        baseUrl: _baseUrl,
        ignoreDeprecations: _ignoreDeprecations,
        ...compilerOptionsWithoutDeprecatedOptions
      } = compilerOptions;
      tsconfig.compilerOptions = {
        ...compilerOptionsWithoutDeprecatedOptions,
        ...(shouldUpdatePaths ? { paths: normalizedPathsConfig } : {}),
        types: shouldUpdateTypes ? nextTypes : currentTypes,
      };
      await writeFile(
        tsconfigPath,
        `${JSON.stringify(tsconfig, null, 2)}\n`,
        "utf8",
      );
      updatedPaths.add(tsconfigPath);
    }
  }

  if (options.needsNodeTypes) {
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson = await readJson(packageJsonPath);
    const devDependencies = isRecord(packageJson.devDependencies)
      ? packageJson.devDependencies
      : {};
    if (devDependencies["@types/node"] !== "^25.9.1") {
      packageJson.devDependencies = {
        ...devDependencies,
        "@types/node": "^25.9.1",
      };
      await writeFile(
        packageJsonPath,
        `${JSON.stringify(packageJson, null, 2)}\n`,
        "utf8",
      );
      updatedPaths.add(packageJsonPath);
    }
  }

  const tabBarIconPaths = [
    path.join(projectPath, "components", "TabBarIcon.tsx"),
    path.join(projectPath, "src", "components", "TabBarIcon.tsx"),
  ];
  for (const tabBarIconPath of tabBarIconPaths) {
    const tabBarIconRaw = await readOptionalText(tabBarIconPath);
    if (!tabBarIconRaw || !tabBarIconRaw.includes("color: string")) {
      continue;
    }
    const updated = tabBarIconRaw
      .replace(
        "import { StyleSheet } from 'react-native';",
        "import type { ColorValue } from 'react-native';\nimport { StyleSheet } from 'react-native';",
      )
      .replace("color: string;", "color: ColorValue;");
    if (updated !== tabBarIconRaw) {
      await writeFile(tabBarIconPath, updated, "utf8");
      updatedPaths.add(tabBarIconPath);
    }
  }

  return Array.from(updatedPaths);
}

async function normalizeTsconfigPathsForSrcDirectory(
  projectPath: string,
  pathsConfig: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const nextPaths: Record<string, unknown> = {};

  for (const [alias, targets] of Object.entries(pathsConfig)) {
    if (!Array.isArray(targets)) {
      nextPaths[alias] = targets;
      continue;
    }

    const nextTargets: unknown[] = [];
    for (const target of targets) {
      if (typeof target !== "string") {
        nextTargets.push(target);
        continue;
      }

      const normalized = await normalizeAliasTargetForSrcDirectory(
        projectPath,
        alias,
        target,
      );
      nextTargets.push(normalized);
    }
    nextPaths[alias] = nextTargets;
  }

  return nextPaths;
}

async function normalizeAliasTargetForSrcDirectory(
  projectPath: string,
  alias: string,
  target: string,
): Promise<string> {
  const normalizedTarget = target.replace(/\\/g, "/").trim();
  if (
    normalizedTarget.startsWith("./src/") ||
    normalizedTarget.startsWith("src/")
  ) {
    return target;
  }

  if (
    alias === "@/*" &&
    (normalizedTarget === "./*" || normalizedTarget === "*")
  ) {
    return "./src/*";
  }

  const relativeTarget = normalizedTarget.startsWith("./")
    ? normalizedTarget.slice(2)
    : normalizedTarget;
  const wildcardSuffix = relativeTarget.endsWith("/*") ? "/*" : "";
  const relativeBase = wildcardSuffix
    ? relativeTarget.slice(0, -2)
    : relativeTarget;
  if (!relativeBase || relativeBase === "*") {
    return target;
  }

  const rootCandidate = path.join(projectPath, relativeBase);
  const srcCandidate = path.join(projectPath, "src", relativeBase);
  const rootExists = await pathExists(rootCandidate);
  const srcExists = await pathExists(srcCandidate);
  if (!rootExists && srcExists) {
    return `./src/${relativeBase}${wildcardSuffix}`;
  }

  return target;
}

export async function repairGeneratedNativeWindUiPicker(
  projectPath: string,
): Promise<string[]> {
  const pickerPaths = [
    path.join(projectPath, "components", "nativewindui", "Picker.tsx"),
    path.join(projectPath, "src", "components", "nativewindui", "Picker.tsx"),
  ];
  const updatedPaths: string[] = [];
  for (const pickerPath of pickerPaths) {
    const raw = await readOptionalText(pickerPath);
    if (!raw || !raw.includes("dropdownIconRippleColor=")) {
      continue;
    }

    let updated = raw;
    updated = updated.replace(
      "import { View } from 'react-native';",
      "import { Platform, View } from 'react-native';",
    );
    updated = updated.replace(
      "        dropdownIconRippleColor={dropdownIconRippleColor ?? colors.foreground}",
      "        {...(Platform.OS === 'web' ? {} : { dropdownIconRippleColor: dropdownIconRippleColor ?? colors.foreground })}",
    );

    if (updated === raw) {
      continue;
    }

    await writeFile(pickerPath, updated, "utf8");
    updatedPaths.push(pickerPath);
  }

  return updatedPaths;
}

export async function repairGeneratedEslintConfig(projectPath: string): Promise<string[]> {
  const eslintConfigPath = path.join(projectPath, "eslint.config.js");
  const raw = await readOptionalText(eslintConfigPath);
  if (!raw) {
    return [];
  }

  const updated = raw.replace(/^\/\* eslint-env node \*\/\r?\n/, "");
  if (updated === raw) {
    return [];
  }

  await writeFile(eslintConfigPath, updated, "utf8");
  return [eslintConfigPath];
}

export async function repairExpoProjectIdentifiers(
  projectPath: string,
  projectName: string,
  targetPlatforms: string[] = [],
): Promise<string[]> {
  const appJsonPath = path.join(projectPath, "app.json");
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
  const hasScheme = Object.prototype.hasOwnProperty.call(expo, "scheme");
  const nextScheme = hasScheme
    ? Array.isArray(currentScheme)
      ? currentScheme.map((item) =>
          toExpoScheme(readString(item) ?? projectName),
        )
      : toExpoScheme(readString(currentScheme) ?? projectName)
    : undefined;

  let changed = false;
  if (expo.slug !== nextSlug) {
    expo.slug = nextSlug;
    changed = true;
  }
  if (
    hasScheme &&
    JSON.stringify(currentScheme) !== JSON.stringify(nextScheme)
  ) {
    expo.scheme = nextScheme;
    changed = true;
  }
  const currentPlatforms = Array.isArray(expo.platforms) ? expo.platforms : [];
  const normalizedTargetPlatforms = normalizeExpoConfigPlatforms(targetPlatforms);
  const hasStylistSyncRoute = await hasStylistSyncApiRoute(projectPath);
  const desiredPlatforms =
    hasStylistSyncRoute && normalizedTargetPlatforms.length > 0
      ? ensurePlatformIncluded(normalizedTargetPlatforms, "web")
      : normalizedTargetPlatforms;
  if (
    desiredPlatforms.length > 0 &&
    JSON.stringify(currentPlatforms) !== JSON.stringify(desiredPlatforms)
  ) {
    expo.platforms = desiredPlatforms;
    changed = true;
  }
  const shouldIncludeAndroid = targetPlatforms.includes("android");
  if (shouldIncludeAndroid) {
    if (readString(expo.backgroundColor) !== "#f1f0f8") {
      expo.backgroundColor = "#f1f0f8";
      changed = true;
    }

    const androidConfig = isRecord(expo.android) ? { ...expo.android } : {};
    if (readString(androidConfig.backgroundColor) !== "#f1f0f8") {
      androidConfig.backgroundColor = "#f1f0f8";
      expo.android = androidConfig;
      changed = true;
    }

    const desiredAndroidStatusBar = {
      backgroundColor: "#f1f0f8",
      barStyle: "dark-content",
      translucent: false,
    };
    if (
      JSON.stringify(expo.androidStatusBar) !==
      JSON.stringify(desiredAndroidStatusBar)
    ) {
      expo.androidStatusBar = desiredAndroidStatusBar;
      changed = true;
    }

    if (Object.prototype.hasOwnProperty.call(expo, "androidNavigationBar")) {
      delete expo.androidNavigationBar;
      changed = true;
    }
    const desiredNavigationBarPlugin = [
      "expo-navigation-bar",
      {
        style: "dark",
        enforceContrast: false,
      },
    ];
    const plugins = Array.isArray(expo.plugins) ? [...expo.plugins] : [];
    const existingNavigationBarPluginIndex = plugins.findIndex((plugin) => {
      if (readString(plugin) === "expo-navigation-bar") {
        return true;
      }
      return (
        Array.isArray(plugin) && readString(plugin[0]) === "expo-navigation-bar"
      );
    });
    if (
      existingNavigationBarPluginIndex === -1 ||
      JSON.stringify(plugins[existingNavigationBarPluginIndex]) !==
        JSON.stringify(desiredNavigationBarPlugin)
    ) {
      if (existingNavigationBarPluginIndex === -1) {
        plugins.push(desiredNavigationBarPlugin);
      } else {
        plugins[existingNavigationBarPluginIndex] = desiredNavigationBarPlugin;
      }
      changed = true;
    }
    const hasSystemUiPlugin = plugins.some((plugin) => {
      if (readString(plugin) === "expo-system-ui") {
        return true;
      }
      return (
        Array.isArray(plugin) && readString(plugin[0]) === "expo-system-ui"
      );
    });
    if (!hasSystemUiPlugin) {
      plugins.push("expo-system-ui");
      changed = true;
    }
    if (JSON.stringify(expo.plugins) !== JSON.stringify(plugins)) {
      expo.plugins = plugins;
      changed = true;
    }
  } else {
    if (Object.prototype.hasOwnProperty.call(expo, "androidNavigationBar")) {
      delete expo.androidNavigationBar;
      changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(expo, "androidStatusBar")) {
      delete expo.androidStatusBar;
      changed = true;
    }
  }

  if (shouldIncludeAndroid) {
    const deprecatedNavigationBar = {
      position: "absolute",
      backgroundColor: "#00000000",
      style: "dark",
      enforceContrast: false,
    };
    if (
      JSON.stringify(expo.androidNavigationBar) ===
      JSON.stringify(deprecatedNavigationBar)
    ) {
      delete expo.androidNavigationBar;
    }
  }

  if (!changed) {
    return [];
  }

  await writeFile(appJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return [appJsonPath];
}

function normalizeExpoConfigPlatforms(
  targetPlatforms: unknown[],
): Array<"web" | "ios" | "android"> {
  return Array.from(
    new Set(
      targetPlatforms
        .map((platform) => normalizeExpoConfigPlatform(readString(platform) ?? platform))
        .filter(
          (platform): platform is "web" | "ios" | "android" =>
            platform === "web" || platform === "ios" || platform === "android",
        ),
    ),
  );
}

function normalizeExpoConfigPlatform(
  platform: unknown,
): "web" | "ios" | "android" | null {
  if (platform === "web" || platform === "ios" || platform === "android") {
    return platform;
  }
  if (platform === "apple-tv" || platform === "appletv" || platform === "tvos") {
    return "ios";
  }
  if (platform === "android-tv" || platform === "androidtv") {
    return "android";
  }
  return null;
}

export async function repairExpoWebOutputForStylistLifecycle(
  projectPath: string,
  preferredWebOutput: OnboardWebOutput = "static",
): Promise<string[]> {
  const appJsonPath = path.join(projectPath, "app.json");
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

  const hasStylistSyncRoute = await hasStylistSyncApiRoute(projectPath);
  let changed = false;
  if (hasStylistSyncRoute && Array.isArray(expo.platforms)) {
    const platforms = expo.platforms
      .map((platform) => readString(platform))
      .filter((platform): platform is string => Boolean(platform));
    if (!platforms.includes("web")) {
      expo.platforms = ensurePlatformIncluded(platforms, "web");
      changed = true;
    }
  }
  const hasWebPlatform =
    !Array.isArray(expo.platforms) ||
    expo.platforms.some((platform) => readString(platform) === "web");
  if (!hasWebPlatform) {
    return [];
  }

  const preferred = normalizeExpoWebOutput(preferredWebOutput);
  const desiredOutput: ExpoWebOutput = hasStylistSyncRoute
    ? "server"
    : preferred;

  const webConfig = isRecord(expo.web) ? expo.web : {};
  const currentOutput = readString(webConfig.output);
  if (currentOutput === desiredOutput && !changed) {
    return [];
  }

  if (currentOutput !== desiredOutput) {
    expo.web = {
      ...webConfig,
      output: desiredOutput,
    };
  }

  await writeFile(appJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return [appJsonPath];
}

function ensurePlatformIncluded<T extends string>(platforms: T[], platform: T): T[] {
  return platforms.includes(platform) ? platforms : [...platforms, platform];
}

async function hasStylistSyncApiRoute(projectPath: string): Promise<boolean> {
  for (const relativeRoutePath of STYLIST_SYNC_API_ROUTES) {
    if (await pathExists(path.join(projectPath, relativeRoutePath))) {
      return true;
    }
  }

  return false;
}

function normalizeExpoWebOutput(value: OnboardWebOutput): ExpoWebOutput {
  switch (value) {
    case "server":
      return "server";
    case "spa":
      return "single";
    case "none":
      return "static";
    case "static":
    default:
      return "static";
  }
}

async function findProjectFromCesConfig(
  cwd: string,
  projectName: string,
): Promise<string | null> {
  try {
    const entries = await readdir(cwd, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const projectPath = path.join(cwd, entry.name);
      const raw = await readOptionalText(
        path.join(projectPath, "cesconfig.jsonc"),
      );
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

async function detectPackageManager(
  projectPath: string,
  args: string[],
): Promise<PackageManager> {
  if (args.includes("--pnpm")) return "pnpm";
  if (args.includes("--yarn")) return "yarn";
  if (args.includes("--bun")) return "bun";
  if (args.includes("--npm")) return "npm";

  const packageJson = await readJson(path.join(projectPath, "package.json"));
  const declared = readString(packageJson.packageManager);
  if (declared?.startsWith("pnpm@")) return "pnpm";
  if (declared?.startsWith("yarn@")) return "yarn";
  if (declared?.startsWith("bun@")) return "bun";
  if (declared?.startsWith("npm@")) return "npm";

  if (await pathExists(path.join(projectPath, "pnpm-lock.yaml"))) return "pnpm";
  if (await pathExists(path.join(projectPath, "yarn.lock"))) return "yarn";
  if (
    (await pathExists(path.join(projectPath, "bun.lock"))) ||
    (await pathExists(path.join(projectPath, "bun.lockb")))
  ) {
    return "bun";
  }

  return "npm";
}

export function shouldRunExpoProjectChecks(
  parsed: ParsedArgs,
  noInstallRequested: boolean,
): boolean {
  return (
    !parsed.mds.skipCreate && !parsed.mds.skipExpoFix && !noInstallRequested
  );
}

function hasNoInstallFlag(args: string[]): boolean {
  return args.some((arg) => {
    const normalized = arg.trim().toLowerCase();
    return (
      normalized === "--no-install" ||
      normalized === "--noinstall" ||
      normalized === "--no-install=true" ||
      normalized === "--install=false"
    );
  });
}

export function buildInstallCommand(
  packageManager: PackageManager,
): CommandSpec {
  return buildLockfileInstallCommand(packageManager);
}

export function buildExpoInstallFixCommand(
  packageManager: PackageManager,
): CommandSpec {
  switch (packageManager) {
    case "pnpm":
      return {
        command: "pnpm",
        args: ["--ignore-workspace", "exec", "expo", "install", "--fix"],
        display: "pnpm --ignore-workspace exec expo install --fix",
        env: { PNPM_CONFIG_STRICT_DEP_BUILDS: "false" },
      };
    case "yarn":
      return {
        command: "yarn",
        args: ["expo", "install", "--fix"],
        display: "yarn expo install --fix",
      };
    case "bun":
      return {
        command: "bunx",
        args: ["expo", "install", "--fix"],
        display: "bunx expo install --fix",
      };
    case "npm":
      return {
        command: "npx",
        args: ["expo", "install", "--fix"],
        display: "npx expo install --fix",
      };
  }
}

export function buildExpoLatestSdkCommand(
  packageManager: PackageManager,
): CommandSpec {
  switch (packageManager) {
    case "pnpm":
      return {
        command: "pnpm",
        args: ["--ignore-workspace", "exec", "expo", "install", EXPECTED_EXPO_PACKAGE_SPEC],
        display: `pnpm --ignore-workspace exec expo install ${EXPECTED_EXPO_PACKAGE_SPEC}`,
        env: { PNPM_CONFIG_STRICT_DEP_BUILDS: "false" },
      };
    case "yarn":
      return {
        command: "yarn",
        args: ["expo", "install", EXPECTED_EXPO_PACKAGE_SPEC],
        display: `yarn expo install ${EXPECTED_EXPO_PACKAGE_SPEC}`,
      };
    case "bun":
      return {
        command: "bunx",
        args: ["expo", "install", EXPECTED_EXPO_PACKAGE_SPEC],
        display: `bunx expo install ${EXPECTED_EXPO_PACKAGE_SPEC}`,
      };
    case "npm":
      return {
        command: "npx",
        args: ["expo", "install", EXPECTED_EXPO_PACKAGE_SPEC],
        display: `npx expo install ${EXPECTED_EXPO_PACKAGE_SPEC}`,
      };
  }
}

export async function shouldRunExpoLatestSdkCommand(
  projectPath: string,
): Promise<boolean> {
  const packageJson = await readJson(path.join(projectPath, "package.json"));
  return shouldRunExpoLatestSdkCommandFromPackageJson(packageJson);
}

export function shouldRunExpoLatestSdkCommandFromPackageJson(
  packageJson: Record<string, unknown>,
): boolean {
  const dependencies = isRecord(packageJson.dependencies)
    ? packageJson.dependencies
    : {};
  const devDependencies = isRecord(packageJson.devDependencies)
    ? packageJson.devDependencies
    : {};
  const version =
    readString(dependencies.expo) ?? readString(devDependencies.expo);

  if (!version) {
    return true;
  }

  if (version.trim().toLowerCase() === "latest") {
    return false;
  }

  if (parseExpoSdkMajor(version) !== EXPECTED_EXPO_SDK_MAJOR) {
    return true;
  }

  return isPinnedExpoSdkRange(version);
}

export function parseExpoSdkMajor(version: string | undefined): number | null {
  if (!version) {
    return null;
  }
  const match = /(\d+)/u.exec(version);
  return match ? Number.parseInt(match[1] ?? "", 10) : null;
}

function isPinnedExpoSdkRange(version: string): boolean {
  const trimmed = version.trim();
  return trimmed.startsWith("~") || /^\d/u.test(trimmed);
}

export async function assertExpectedExpoSdk(projectPath: string): Promise<void> {
  const packageJson = await readJson(path.join(projectPath, "package.json"));
  const dependencies = isRecord(packageJson.dependencies)
    ? packageJson.dependencies
    : {};
  const devDependencies = isRecord(packageJson.devDependencies)
    ? packageJson.devDependencies
    : {};
  const version =
    readString(dependencies.expo) ?? readString(devDependencies.expo);
  const resolvedMajor = parseExpoSdkMajor(version);

  if (resolvedMajor !== EXPECTED_EXPO_SDK_MAJOR) {
    throw new Error(
      `Generated project did not resolve to Expo SDK ${EXPECTED_EXPO_SDK_MAJOR}. Found expo dependency ${version ?? "missing"} in package.json.`,
    );
  }
}

export function buildExpoFontInstallCommand(
  packageManager: PackageManager,
): CommandSpec {
  switch (packageManager) {
    case "pnpm":
      return {
        command: "pnpm",
        args: ["--ignore-workspace", "exec", "expo", "install", "expo-font"],
        display: "pnpm --ignore-workspace exec expo install expo-font",
        env: { PNPM_CONFIG_STRICT_DEP_BUILDS: "false" },
      };
    case "yarn":
      return {
        command: "yarn",
        args: ["expo", "install", "expo-font"],
        display: "yarn expo install expo-font",
      };
    case "bun":
      return {
        command: "bunx",
        args: ["expo", "install", "expo-font"],
        display: "bunx expo install expo-font",
      };
    case "npm":
      return {
        command: "npx",
        args: ["expo", "install", "expo-font"],
        display: "npx expo install expo-font",
      };
  }
}

export function buildExpoDoctorCommand(
  packageManager: PackageManager,
): CommandSpec {
  switch (packageManager) {
    case "pnpm":
      return {
        command: "pnpm",
        args: ["--ignore-workspace", "dlx", "expo-doctor"],
        display: "pnpm --ignore-workspace dlx expo-doctor",
      };
    case "yarn":
      return {
        command: "yarn",
        args: ["dlx", "expo-doctor"],
        display: "yarn dlx expo-doctor",
      };
    case "bun":
      return {
        command: "bunx",
        args: ["expo-doctor"],
        display: "bunx expo-doctor",
      };
    case "npm":
      return {
        command: "npx",
        args: ["expo-doctor"],
        display: "npx expo-doctor",
      };
  }
}

export function buildPrettierWriteCommand(
  packageManager: PackageManager,
): CommandSpec {
  const glob = "**/*.{js,jsx,ts,tsx,json}";
  switch (packageManager) {
    case "pnpm":
      return {
        command: "pnpm",
        args: ["exec", "prettier", "--write", glob],
        display: `pnpm exec prettier --write "${glob}"`,
      };
    case "yarn":
      return {
        command: "yarn",
        args: ["prettier", "--write", glob],
        display: `yarn prettier --write "${glob}"`,
      };
    case "bun":
      return {
        command: "bunx",
        args: ["prettier", "--write", glob],
        display: `bunx prettier --write "${glob}"`,
      };
    case "npm":
    default:
      return {
        command: "npx",
        args: ["prettier", "--write", glob],
        display: `npx prettier --write "${glob}"`,
      };
  }
}

export function buildAddDevDependencyCommand(
  packageManager: PackageManager,
  dependency: string,
): CommandSpec {
  switch (packageManager) {
    case "pnpm":
      return {
        command: "pnpm",
        args: ["--ignore-workspace", "add", "-D", dependency],
        display: `pnpm --ignore-workspace add -D ${dependency}`,
        env: { PNPM_CONFIG_STRICT_DEP_BUILDS: "false" },
      };
    case "yarn":
      return {
        command: "yarn",
        args: ["add", "--dev", dependency],
        display: `yarn add --dev ${dependency}`,
      };
    case "bun":
      return {
        command: "bun",
        args: ["add", "--dev", dependency],
        display: `bun add --dev ${dependency}`,
      };
    case "npm":
      return {
        command: "npm",
        args: ["install", "--save-dev", dependency],
        display: `npm install --save-dev ${dependency}`,
      };
  }
}

export function resolveWindowsTailwindOxidePackage({
  platform = process.platform,
  arch = process.arch,
  nodeTargetType = (
    process.config?.variables as unknown as
      | Record<string, string | undefined>
      | undefined
  )?.node_target_type,
  shlibSuffix = (
    process.config?.variables as unknown as
      | Record<string, string | undefined>
      | undefined
  )?.shlib_suffix,
}: {
  platform?: string;
  arch?: string;
  nodeTargetType?: string | undefined;
  shlibSuffix?: string | undefined;
} = {}): string | undefined {
  if (platform !== "win32") {
    return undefined;
  }

  if (arch === "x64") {
    const usesGnu =
      shlibSuffix === "dll.a" || nodeTargetType === "shared_library";
    return usesGnu
      ? "@tailwindcss/oxide-win32-x64-gnu"
      : "@tailwindcss/oxide-win32-x64-msvc";
  }

  if (arch === "ia32") {
    return "@tailwindcss/oxide-win32-ia32-msvc";
  }

  if (arch === "arm64") {
    return "@tailwindcss/oxide-win32-arm64-msvc";
  }

  return undefined;
}

export async function resolveMissingWindowsTailwindOxideBinding(
  projectPath: string,
): Promise<string | undefined> {
  const packageName = resolveWindowsTailwindOxidePackage();
  if (!packageName) {
    return undefined;
  }

  const packageJson = await readJson(path.join(projectPath, "package.json"));
  const dependencies = isRecord(packageJson.dependencies)
    ? packageJson.dependencies
    : {};
  const devDependencies = isRecord(packageJson.devDependencies)
    ? packageJson.devDependencies
    : {};
  const hasUniwind =
    typeof dependencies.uniwind === "string" ||
    typeof devDependencies.uniwind === "string";
  if (!hasUniwind) {
    return undefined;
  }

  if (await pathExists(path.join(projectPath, "node_modules", packageName))) {
    return undefined;
  }

  const oxidePackageJsonPath = path.join(
    projectPath,
    "node_modules",
    "@tailwindcss",
    "oxide",
    "package.json",
  );
  const oxidePackage = await readJson(oxidePackageJsonPath);
  const oxideVersion = readString(oxidePackage.version);
  return oxideVersion ? `${packageName}@${oxideVersion}` : packageName;
}

export async function shouldInstallExpoFontPeer(
  projectPath: string,
): Promise<boolean> {
  const packageJson = await readJson(path.join(projectPath, "package.json"));
  return shouldInstallExpoFontPeerFromPackageJson(packageJson);
}

export function shouldInstallExpoFontPeerFromPackageJson(
  packageJson: Record<string, unknown>,
): boolean {
  const dependencies = isRecord(packageJson.dependencies)
    ? packageJson.dependencies
    : {};
  const devDependencies = isRecord(packageJson.devDependencies)
    ? packageJson.devDependencies
    : {};
  const hasVectorIcons =
    typeof dependencies["@expo/vector-icons"] === "string" ||
    typeof devDependencies["@expo/vector-icons"] === "string";
  const hasExpoFont =
    typeof dependencies["expo-font"] === "string" ||
    typeof devDependencies["expo-font"] === "string";

  return hasVectorIcons && !hasExpoFont;
}

export async function detectEasSetup(
  projectPath: string,
  createExpoStackArgs: string[],
): Promise<boolean | undefined> {
  if (hasFlag(createExpoStackArgs, "--eas")) {
    return true;
  }

  if (await pathExists(path.join(projectPath, "eas.json"))) {
    return true;
  }

  const appJson = await readJson(path.join(projectPath, "app.json"));
  if (hasExpoEasProjectId(appJson)) {
    return true;
  }

  const appConfigJson = await readJson(
    path.join(projectPath, "app.config.json"),
  );
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
  return typeof eas?.projectId === "string" && eas.projectId.trim().length > 0;
}

function buildRunScriptCommand(
  packageManager: PackageManager,
  script: string,
): string {
  switch (packageManager) {
    case "pnpm":
      return `pnpm ${script}`;
    case "yarn":
      return `yarn ${script}`;
    case "bun":
      return `bun run ${script}`;
    case "npm":
      return `npm run ${script}`;
  }
}

function formatDisplayArgs(args: string[]): string {
  return args.map(quoteDisplayArg).join(" ");
}

function quoteDisplayArg(value: string): string {
  if (!value || /[\s"]/u.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}

function printCopyableCommands(title: string, commands: string[]): void {
  console.log(`${title} (copy this):`);
  console.log(renderCommandBox(commands));
}

function renderCommandBox(commands: string[]): string {
  const visibleCommands = commands.filter((command) => command.trim().length > 0);
  if (visibleCommands.length === 0) {
    return "";
  }

  const formattedCommands = visibleCommands.map((command) =>
    colorizeCommand(`> ${command}`),
  );

  return ["┌", ...formattedCommands.map((command) => `│ ${command}`), "└"].join(
    "\n",
  );
}

function colorizeCommand(command: string): string {
  if (!supportsAnsiColor()) {
    return command;
  }

  return `\x1b[36m${command}\x1b[0m`;
}

function supportsAnsiColor(): boolean {
  return process.stdout.isTTY === true && process.env.TERM !== "dumb";
}

function buildOnboardArgv(
  projectPath: string,
  parsed: ParsedArgs,
  easSelected?: boolean,
): OnboardArgv {
  const generatorChoices = inferGeneratorChoices(parsed.createExpoStackArgs, easSelected);

  return {
    project: projectPath,
    yes: parsed.mds.yes,
    force: parsed.mds.force,
    rich: parsed.mds.rich,
    guidelinesTemplate: parsed.mds.guidelinesTemplate,
    guidelinesTemplatePath: parsed.mds.guidelinesTemplatePath,
    easSelected,
    appName: parsed.mds.appName,
    generatorScriptLanguage: generatorChoices.scriptLanguage,
    generatorPackageManager: generatorChoices.packageManager,
    generatorNavigationLibrary: generatorChoices.navigationLibrary,
    generatorReactNavigationLayout: generatorChoices.reactNavigationLayout,
    generatorStylingSystem: generatorChoices.stylingSystem,
    generatorStateManagement: generatorChoices.stateManagement,
    generatorAuthBackend: generatorChoices.authBackend,
    generatorEasSetup: generatorChoices.easSetup,
    overview: parsed.mds.overview,
    audience: parsed.mds.audience,
    problemStatement: parsed.mds.problemStatement,
    productGoals: parsed.mds.productGoals,
    nonGoals: parsed.mds.nonGoals,
    coreFlows: parsed.mds.coreFlows,
    screens: parsed.mds.screens,
    monetizationStrategy: parsed.mds.monetizationStrategy,
    teamContext: parsed.mds.teamContext,
    laterScope: parsed.mds.laterScope,
    researchNotes: parsed.mds.researchNotes,
    dataNeeds: parsed.mds.dataNeeds,
    dataStart: parsed.mds.dataStart,
    authProvider: parsed.mds.authProvider,
    onboardingFlow: parsed.mds.onboardingFlow,
    legalDocumentMode: parsed.mds.legalDocumentMode,
    onboardingCompletionMode: parsed.mds.onboardingCompletionMode,
    legalUpdateGate: parsed.mds.legalUpdateGate,
    deploymentTarget: parsed.mds.deploymentTarget,
    defaults: parsed.mds.defaults,
    saveDefaults: parsed.mds.saveDefaults,
    testToMain: parsed.mds.testToMain,
    platforms: parsed.mds.platforms,
    firstPlatform: parsed.mds.firstPlatform,
    platformStrategy: parsed.mds.platformStrategy,
    appDirectory: parsed.mds.appDirectory ?? "src",
    platformLayouts: parsed.mds.platformLayouts,
    webOutput: parsed.mds.webOutput,
    deployedServer: parsed.mds.deployedServer,
    createExpoComponents: parsed.mds.createExpoComponents,
    expoUi: parsed.mds.expoUi,
    expoUiUniversal: parsed.mds.expoUiUniversal,
    expoNativeTabs: parsed.mds.expoNativeTabs,
    easUses: parsed.mds.easUses,
  };
}

function inferGeneratorChoices(
  args: string[],
  easSelected?: boolean,
): {
  scriptLanguage?: OnboardArgv["generatorScriptLanguage"];
  packageManager?: OnboardArgv["generatorPackageManager"];
  navigationLibrary?: OnboardArgv["generatorNavigationLibrary"];
  reactNavigationLayout?: OnboardArgv["generatorReactNavigationLayout"];
  stylingSystem?: OnboardArgv["generatorStylingSystem"];
  stateManagement?: OnboardArgv["generatorStateManagement"];
  authBackend?: OnboardArgv["generatorAuthBackend"];
  easSetup?: boolean;
} {
  const hasFlag = (flag: string) => args.includes(flag);

  return {
    scriptLanguage: hasFlag("--javascript") ? "javascript" : "typescript",
    packageManager: hasFlag("--pnpm")
      ? "pnpm"
      : hasFlag("--yarn")
        ? "yarn"
        : hasFlag("--bun")
          ? "bun"
          : "npm",
    navigationLibrary: hasFlag("--react-navigation") ? "react-navigation" : "expo-router",
    reactNavigationLayout: hasFlag("--tabs")
      ? "tabs"
      : hasFlag("--drawer+tabs")
        ? "drawer"
        : "stack",
    stylingSystem: hasFlag("--nativewindui")
      ? "nativewindui"
      : hasFlag("--nativewind")
        ? "nativewind"
        : hasFlag("--tamagui")
          ? "tamagui"
          : hasFlag("--restyle")
            ? "restyle"
            : hasFlag("--uniwind")
              ? "uniwind"
              : "stylesheet",
    stateManagement: hasFlag("--zustand") ? "zustand" : "none",
    authBackend: hasFlag("--supabase")
      ? "supabase"
      : hasFlag("--firebase")
        ? "firebase"
        : "none",
    easSetup: easSelected,
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
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
    return await readFile(filePath, "utf8");
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
  const cleaned = value.replace(/^\s*\/\/.*$/gm, "");
  const parsed = JSON.parse(cleaned) as unknown;
  return isRecord(parsed) ? parsed : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function toExpoSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "expo-app";
}

export function toExpoScheme(value: string): string {
  const scheme = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+.-]+/g, "-")
    .replace(/^[^a-z]+/, "")
    .replace(/-+$/g, "");

  return scheme || "expo-app";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
