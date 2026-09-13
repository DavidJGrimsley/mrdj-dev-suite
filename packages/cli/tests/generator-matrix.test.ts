import { spawn } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  evaluateGeneratorFixtureContract,
  resolveGeneratorFixtureTargets,
  type GeneratorFixtureContract,
} from "../src/generator-fixture-contracts.js";

interface MatrixConfig {
  apps_root?: string | null;
  worktrees_root?: string | null;
  platform_defaults?: Partial<Record<NodeJS.Platform, MatrixPlatformDefaults>>;
  apps: MatrixApp[];
  cess?: CessMatrixFixture;
}

interface MatrixPlatformDefaults {
  apps_root?: string | null;
  worktrees_root?: string | null;
}

interface MatrixApp {
  name: string;
  github_url?: string | null;
  local_path?: string | null;
  branches_to_test?: string[];
  fixture_contract?: GeneratorFixtureContract;
  revision?: string;
  retrospective_onboarding?: boolean;
}

interface CessMatrixFixture {
  app_name: string;
  fixture_contract: "cess-mobile";
  args: string[];
}

interface MatrixReport {
  generatedAt: string;
  repoRoot: string;
  matrixPath: string;
  appsRoot: string | null;
  worktreesRoot: string;
  keptTempRoot: string | null;
  cleanupError: string | null;
  results: MatrixEntryResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

interface MatrixEntryResult {
  app: string;
  branch: string;
  source: string;
  workspace: string | null;
  fixtureContract?: GeneratorFixtureContract;
  contractResults: ContractResult[];
  requestedRevision?: string;
  resolvedRevision?: string;
  ok: boolean;
  durationMs: number;
  riskyPatterns: RiskyPattern[];
  steps: StepResult[];
}

interface StepResult {
  name: string;
  command?: string;
  ok: boolean;
  code: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  blocking?: boolean;
  error?: string;
}

interface RiskyPattern {
  file: string;
  kind: "link-as-child-style-array" | "slot-style-array";
  excerpt: string;
}

interface ContractResult {
  stage: string;
  ok: boolean;
  failures: string[];
}

const testDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(testDir, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const matrixPath = path.join(testDir, "fixtures", "test-apps-matrix.json");
const cliPath = path.join(packageRoot, "dist", "cli.js");
const cessCliPath = path.join(
  repoRoot,
  "packages",
  "create-expo-super-stack",
  "dist",
  "cli.js",
);
const reportPath = path.join(repoRoot, "generator-matrix-report.json");
const keepTemp = process.env.MDS_MATRIX_KEEP_TEMP === "1";
const skipInstall = process.env.MDS_MATRIX_SKIP_INSTALL === "1";
const matrixRequested = process.env.MDS_RUN_GENERATOR_MATRIX === "1";
const describeMatrix = matrixRequested ? describe : describe.skip;
const commandTimeoutMs = Number(
  process.env.MDS_MATRIX_COMMAND_TIMEOUT_MS ?? 10 * 60_000,
);
const testTimeoutMs = Number(
  process.env.MDS_MATRIX_TEST_TIMEOUT_MS ?? 90 * 60_000,
);

describeMatrix("generator validation matrix", () => {
  it(
    "validates external apps without modifying their source repositories",
    async () => {
      const matrix = await readMatrixConfig();
      const platformDefaults = matrix.platform_defaults?.[process.platform];
      expect(matrix.apps.length).toBeGreaterThanOrEqual(3);
      await assertFileExists(
        cliPath,
        "Run `pnpm --filter @mr.dj2u/cli build` before the matrix.",
      );
      if (matrix.cess) {
        await assertFileExists(
          cessCliPath,
          "Run `pnpm --filter create-expo-super-stack build` before the matrix.",
        );
      }

      const appsRoot = resolveOptionalConfigPath(
        process.env.MDS_TEST_APPS_ROOT ??
          matrix.apps_root ??
          platformDefaults?.apps_root ??
          null,
      );
      const worktreesRoot = resolveConfigPath(
        process.env.MDS_MATRIX_WORKTREES_ROOT ??
          matrix.worktrees_root ??
          platformDefaults?.worktrees_root ??
          null,
        path.join(os.tmpdir(), "mds-generator-matrix"),
      );
      await mkdir(worktreesRoot, { recursive: true });
      const tempRoot = await mkdtemp(path.join(worktreesRoot, "run-"));
      const results: MatrixEntryResult[] = [];

      try {
        if (matrix.cess) {
          results.push(await runCessMatrixEntry(matrix.cess, tempRoot));
        }
        for (const app of matrix.apps) {
          for (const target of resolveGeneratorFixtureTargets({
            branchesToTest: app.branches_to_test,
            revision: app.revision,
          })) {
            results.push(
              await runMatrixEntry(
                app,
                target.label,
                target.revision,
                tempRoot,
                appsRoot,
              ),
            );
          }
        }
      } finally {
        let keptTempRoot = keepTemp ? tempRoot : null;
        let cleanupError: string | null = null;
        if (!keepTemp) {
          const cleanup = await cleanupTempRoot(tempRoot);
          if (!cleanup.ok) {
            keptTempRoot = tempRoot;
            cleanupError = cleanup.error;
            console.warn(
              `Could not remove matrix temp root ${tempRoot}: ${cleanupError}`,
            );
          }
        }

        const report = buildReport(
          results,
          appsRoot,
          worktreesRoot,
          keptTempRoot,
          cleanupError,
        );
        await writeFile(
          reportPath,
          `${JSON.stringify(report, null, 2)}\n`,
          "utf8",
        );
        printSummary(report);
      }

      const failed = results.filter(
        (result) => result.fixtureContract !== undefined && !result.ok,
      );
      if (failed.length > 0) {
        throw new Error(renderFailureSummary(failed));
      }
    },
    testTimeoutMs,
  );
});

async function readMatrixConfig(): Promise<MatrixConfig> {
  const raw = await readFile(matrixPath, "utf8");
  const parsed = JSON.parse(raw) as MatrixConfig;
  if (!Array.isArray(parsed.apps)) {
    throw new Error(`${matrixPath} must contain an apps array.`);
  }
  return parsed;
}

async function runMatrixEntry(
  app: MatrixApp,
  branch: string,
  revision: string | undefined,
  tempRoot: string,
  appsRoot: string | null,
): Promise<MatrixEntryResult> {
  const start = Date.now();
  const workspace = path.join(
    tempRoot,
    `${sanitizePathSegment(app.name)}-${sanitizePathSegment(branch)}`,
  );
  const steps: StepResult[] = [];
  const contractResults: ContractResult[] = [];
  let sourceLabel = "unresolved source";
  let resolvedRevision: string | undefined;

  try {
    const source = await resolveSource(app, appsRoot);
    sourceLabel = source.label;
    steps.push(
      await prepareWorkspace(app, branch, revision, source, workspace),
    );
    if (!lastStepPassed(steps)) {
      return finalizeEntry(
        app,
        branch,
        sourceLabel,
        workspace,
        steps,
        [],
        start,
        {
          contractResults,
          fixtureContract: app.fixture_contract,
          requestedRevision: revision,
        },
      );
    }

    if (revision) {
      const resolved = await resolvePinnedRevision(workspace, revision);
      steps.push(resolved.step);
      resolvedRevision = resolved.revision;
      if (!lastStepPassed(steps)) {
        return finalizeEntry(
          app,
          branch,
          sourceLabel,
          workspace,
          steps,
          [],
          start,
          {
            contractResults,
            fixtureContract: app.fixture_contract,
            requestedRevision: revision,
            resolvedRevision,
          },
        );
      }
    }

    if (!skipInstall) {
      steps.push(await installDependencies(workspace));
      if (!lastStepPassed(steps)) {
        return finalizeEntry(
          app,
          branch,
          sourceLabel,
          workspace,
          steps,
          [],
          start,
          {
            contractResults,
            fixtureContract: app.fixture_contract,
            requestedRevision: revision,
            resolvedRevision,
          },
        );
      }
    }

    await appendContractAssertion(
      steps,
      contractResults,
      app.fixture_contract,
      "baseline",
      workspace,
    );

    steps.push(
      nonBlockingStep(
        await runCliStep(
          "mds doctor --ci",
          ["doctor", workspace, "--ci"],
          repoRoot,
          commandTimeoutMs,
        ),
      ),
    );

    if (app.retrospective_onboarding) {
      steps.push(await prepareRetrospectiveControlWorkspace(tempRoot));
      steps.push(
        await runCliStep(
          "mds onboard retrospective project-only",
          [
            "onboard",
            "--project",
            workspace,
            "--retrospective",
            "--project-only",
            "--yes",
          ],
          repoRoot,
          commandTimeoutMs,
        ),
      );
      await appendContractAssertion(
        steps,
        contractResults,
        app.fixture_contract,
        "after retrospective onboarding",
        workspace,
      );
    }

    steps.push(
      await runCliStep(
        "mds eject exposition",
        ["eject", "exposition", workspace, "--all", "--json"],
        repoRoot,
        commandTimeoutMs,
      ),
    );
    await appendContractAssertion(
      steps,
      contractResults,
      app.fixture_contract,
      "after exposition ejection",
      workspace,
    );
    steps.push(
      await runCliStep(
        "mds eject stylist",
        ["eject", "stylist", workspace, "--json"],
        repoRoot,
        commandTimeoutMs,
      ),
    );
    await appendContractAssertion(
      steps,
      contractResults,
      app.fixture_contract,
      "after stylist ejection",
      workspace,
    );

    const riskyPatterns = await appendRiskyStyleScan(steps, workspace);

    return finalizeEntry(
      app,
      branch,
      sourceLabel,
      workspace,
      steps,
      riskyPatterns,
      start,
      {
        contractResults,
        fixtureContract: app.fixture_contract,
        requestedRevision: revision,
        resolvedRevision,
      },
    );
  } catch (error) {
    steps.push({
      name: "matrix entry",
      ok: false,
      code: null,
      durationMs: Date.now() - start,
      stdout: "",
      stderr: "",
      error: error instanceof Error ? error.message : String(error),
    });
    return finalizeEntry(
      app,
      branch,
      sourceLabel,
      workspace,
      steps,
      [],
      start,
      {
        contractResults,
        fixtureContract: app.fixture_contract,
        requestedRevision: revision,
        resolvedRevision,
      },
    );
  }
}

async function runCessMatrixEntry(
  fixture: CessMatrixFixture,
  tempRoot: string,
): Promise<MatrixEntryResult> {
  const start = Date.now();
  const app: MatrixApp = {
    fixture_contract: fixture.fixture_contract,
    name: fixture.app_name,
  };
  const workspace = path.join(tempRoot, sanitizePathSegment(fixture.app_name));
  const steps: StepResult[] = [];
  const contractResults: ContractResult[] = [];

  try {
    steps.push(
      namedStep(
        "create-expo-super-stack",
        await runCommand(
          process.execPath,
          [cessCliPath, fixture.app_name, ...fixture.args],
          tempRoot,
          commandTimeoutMs,
        ),
        start,
      ),
    );
    if (!lastStepPassed(steps)) {
      return finalizeEntry(
        app,
        "generated",
        "cess",
        workspace,
        steps,
        [],
        start,
        {
          contractResults,
          fixtureContract: fixture.fixture_contract,
        },
      );
    }

    await appendContractAssertion(
      steps,
      contractResults,
      fixture.fixture_contract,
      "after CESS onboarding",
      workspace,
    );

    if (!skipInstall) {
      steps.push(await installDependencies(workspace));
      if (!lastStepPassed(steps)) {
        return finalizeEntry(
          app,
          "generated",
          "cess",
          workspace,
          steps,
          [],
          start,
          {
            contractResults,
            fixtureContract: fixture.fixture_contract,
          },
        );
      }
    }

    steps.push(
      nonBlockingStep(
        await runCliStep(
          "mds doctor --ci",
          ["doctor", workspace, "--ci"],
          repoRoot,
          commandTimeoutMs,
        ),
      ),
    );
    steps.push(
      await runCliStep(
        "mds eject exposition",
        ["eject", "exposition", workspace, "--all", "--json"],
        repoRoot,
        commandTimeoutMs,
      ),
    );
    await appendContractAssertion(
      steps,
      contractResults,
      fixture.fixture_contract,
      "after exposition ejection",
      workspace,
    );
    steps.push(
      await runCliStep(
        "mds eject stylist",
        ["eject", "stylist", workspace, "--json"],
        repoRoot,
        commandTimeoutMs,
      ),
    );
    await appendContractAssertion(
      steps,
      contractResults,
      fixture.fixture_contract,
      "after stylist ejection",
      workspace,
    );

    const riskyPatterns = await appendRiskyStyleScan(steps, workspace);
    return finalizeEntry(
      app,
      "generated",
      "cess",
      workspace,
      steps,
      riskyPatterns,
      start,
      {
        contractResults,
        fixtureContract: fixture.fixture_contract,
      },
    );
  } catch (error) {
    steps.push({
      name: "CESS matrix entry",
      ok: false,
      code: null,
      durationMs: Date.now() - start,
      stdout: "",
      stderr: "",
      error: error instanceof Error ? error.message : String(error),
    });
    return finalizeEntry(
      app,
      "generated",
      "cess",
      workspace,
      steps,
      [],
      start,
      {
        contractResults,
        fixtureContract: fixture.fixture_contract,
      },
    );
  }
}

async function appendContractAssertion(
  steps: StepResult[],
  contractResults: ContractResult[],
  contract: GeneratorFixtureContract | undefined,
  stage: string,
  workspace: string,
): Promise<void> {
  if (!contract) return;

  const startedAt = Date.now();
  const result = await evaluateGeneratorFixtureContract(contract, workspace);
  contractResults.push({ stage, ok: result.ok, failures: result.failures });
  steps.push({
    name: `assert ${contract} contract (${stage})`,
    ok: result.ok,
    code: result.ok ? 0 : 1,
    durationMs: Date.now() - startedAt,
    stdout: result.ok ? `${contract} contract passed.` : "",
    stderr: result.ok ? "" : result.failures.join("\n"),
  });
}

function nonBlockingStep(step: StepResult): StepResult {
  return { ...step, blocking: false };
}

async function prepareRetrospectiveControlWorkspace(
  tempRoot: string,
): Promise<StepResult> {
  const startedAt = Date.now();
  const projectPath = path.join(tempRoot, "project");
  const manifestPath = path.join(projectPath, "mds.workspace.json");
  try {
    await mkdir(projectPath, { recursive: true });
    await writeFile(
      manifestPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          workspaceId: "generator-matrix-retrospective-fixture",
          name: "Generator Matrix Retrospective Fixture",
          repositories: [
            {
              id: "fixture",
              remote: "local://generator-matrix",
              defaultBranch: "main",
              mainFolder: "fixture-main",
              worktreePrefix: "fixture-",
            },
          ],
          project: { path: "project" },
          temp: { path: "temp" },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    return {
      name: "prepare retrospective control workspace",
      ok: true,
      code: 0,
      durationMs: Date.now() - startedAt,
      stdout: manifestPath,
      stderr: "",
    };
  } catch (error) {
    return {
      name: "prepare retrospective control workspace",
      ok: false,
      code: null,
      durationMs: Date.now() - startedAt,
      stdout: "",
      stderr: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function appendRiskyStyleScan(
  steps: StepResult[],
  workspace: string,
): Promise<RiskyPattern[]> {
  const riskyPatterns = await scanRiskyStylePatterns(workspace);
  steps.push(
    riskyPatterns.length > 0
      ? {
          name: "scan Link/Slot style arrays",
          ok: false,
          code: 1,
          durationMs: 0,
          stdout: "",
          stderr: riskyPatterns
            .map(
              (pattern) =>
                `${pattern.kind}: ${pattern.file}\n${pattern.excerpt}`,
            )
            .join("\n\n"),
        }
      : {
          name: "scan Link/Slot style arrays",
          ok: true,
          code: 0,
          durationMs: 0,
          stdout: "No risky Link asChild or Slot style-array patterns found.",
          stderr: "",
        },
  );
  return riskyPatterns;
}

async function resolveSource(
  app: MatrixApp,
  appsRoot: string | null,
): Promise<{ label: string; path?: string; url?: string }> {
  const localPath = app.local_path
    ? resolveConfigPath(app.local_path, appsRoot ?? repoRoot)
    : null;
  if (localPath && (await pathExists(localPath))) {
    return { label: `local:${localPath}`, path: localPath };
  }
  if (app.github_url) {
    return { label: `github:${app.github_url}`, url: app.github_url };
  }
  throw new Error(
    `${app.name} has no usable source. Set local_path to an existing directory or provide github_url.`,
  );
}

async function prepareWorkspace(
  app: MatrixApp,
  branch: string,
  revision: string | undefined,
  source: { path?: string; url?: string },
  workspace: string,
): Promise<StepResult> {
  const start = Date.now();
  try {
    if (source.path && (await isGitRepository(source.path))) {
      const clone = await runCommand(
        "git",
        ["clone", "--no-hardlinks", source.path, workspace],
        repoRoot,
      );
      if (!clone.ok) {
        return namedStep("prepare workspace", clone, start);
      }
      const checkout = await checkoutTarget(
        workspace,
        branch,
        revision,
        app.github_url ?? undefined,
      );
      return namedStep(
        "prepare workspace",
        mergeStepResults([clone, checkout]),
        start,
      );
    }

    if (source.path) {
      await copyLocalDirectory(source.path, workspace);
      if (revision || branch !== "main") {
        return {
          name: "prepare workspace",
          ok: false,
          code: 1,
          durationMs: Date.now() - start,
          stdout: "",
          stderr: `Cannot checkout ${revision ?? branch} from non-git local_path ${source.path}.`,
        };
      }
      return {
        name: "prepare workspace",
        ok: true,
        code: 0,
        durationMs: Date.now() - start,
        stdout: "",
        stderr: "",
      };
    }

    if (source.url) {
      const clone = await runCommand(
        "git",
        revision
          ? ["clone", "--no-checkout", "--depth", "1", source.url, workspace]
          : [
              "clone",
              "--depth",
              "1",
              "--branch",
              branch,
              source.url,
              workspace,
            ],
        repoRoot,
      );
      if (!clone.ok || !revision) {
        return namedStep("prepare workspace", clone, start);
      }
      const checkout = await checkoutTarget(
        workspace,
        branch,
        revision,
        source.url,
      );
      return namedStep(
        "prepare workspace",
        mergeStepResults([clone, checkout]),
        start,
      );
    }
  } catch (error) {
    return {
      name: "prepare workspace",
      ok: false,
      code: null,
      durationMs: Date.now() - start,
      stdout: "",
      stderr: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    name: "prepare workspace",
    ok: false,
    code: 1,
    durationMs: Date.now() - start,
    stdout: "",
    stderr: "No local path or GitHub URL was available.",
  };
}

async function checkoutTarget(
  workspace: string,
  branch: string,
  revision: string | undefined,
  githubUrl: string | undefined,
): Promise<StepResult> {
  if (!revision) {
    return checkoutBranch(workspace, branch, githubUrl);
  }

  const localCheckout = await runCommand(
    "git",
    ["checkout", "--detach", revision],
    workspace,
  );
  if (localCheckout.ok || !githubUrl) {
    return localCheckout;
  }

  const fetch = await runCommand(
    "git",
    ["fetch", "--depth", "1", githubUrl, revision],
    workspace,
  );
  if (!fetch.ok) {
    return mergeStepResults([localCheckout, fetch]);
  }

  const checkoutFetched = await runCommand(
    "git",
    ["checkout", "--detach", "FETCH_HEAD"],
    workspace,
  );
  return mergeStepResults([localCheckout, fetch, checkoutFetched]);
}

async function checkoutBranch(
  workspace: string,
  branch: string,
  githubUrl: string | undefined,
): Promise<StepResult> {
  const localCheckout = await runCommand(
    "git",
    ["checkout", branch],
    workspace,
  );
  if (localCheckout.ok || !githubUrl) {
    return localCheckout;
  }

  const fetch = await runCommand(
    "git",
    ["fetch", "--depth", "1", githubUrl, branch],
    workspace,
  );
  if (!fetch.ok) {
    return mergeStepResults([localCheckout, fetch]);
  }

  const checkoutFetched = await runCommand(
    "git",
    ["checkout", "-B", branch, "FETCH_HEAD"],
    workspace,
  );
  return mergeStepResults([localCheckout, fetch, checkoutFetched]);
}

async function resolvePinnedRevision(
  workspace: string,
  requestedRevision: string,
): Promise<{ step: StepResult; revision?: string }> {
  const result = await runCommand("git", ["rev-parse", "HEAD"], workspace);
  if (!result.ok) {
    return { step: { ...result, name: "resolve pinned revision" } };
  }

  const revision = result.stdout.trim();
  if (revision !== requestedRevision.toLowerCase()) {
    return {
      revision,
      step: {
        ...result,
        name: "resolve pinned revision",
        ok: false,
        code: 1,
        stderr: `Expected detached revision ${requestedRevision}, resolved ${revision || "nothing"}.`,
      },
    };
  }

  return {
    revision,
    step: {
      ...result,
      name: "resolve pinned revision",
      stdout: revision,
    },
  };
}

async function installDependencies(workspace: string): Promise<StepResult> {
  const packageManager = await detectPackageManager(workspace);
  switch (packageManager) {
    case "pnpm":
      return runCommand(
        "pnpm",
        ["install", "--no-frozen-lockfile"],
        workspace,
        commandTimeoutMs,
      );
    case "yarn":
      return runCommand("yarn", ["install"], workspace, commandTimeoutMs);
    case "bun":
      return runCommand("bun", ["install"], workspace, commandTimeoutMs);
    case "npm":
    default:
      return runCommand("npm", ["install"], workspace, commandTimeoutMs);
  }
}

async function detectPackageManager(
  workspace: string,
): Promise<"pnpm" | "npm" | "yarn" | "bun"> {
  const packageJsonPath = path.join(workspace, "package.json");
  if (await pathExists(packageJsonPath)) {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      packageManager?: string;
    };
    const packageManager = packageJson.packageManager?.split("@")[0];
    if (
      packageManager === "pnpm" ||
      packageManager === "npm" ||
      packageManager === "yarn" ||
      packageManager === "bun"
    ) {
      return packageManager;
    }
  }
  if (await pathExists(path.join(workspace, "pnpm-lock.yaml"))) return "pnpm";
  if (await pathExists(path.join(workspace, "yarn.lock"))) return "yarn";
  if (await pathExists(path.join(workspace, "bun.lockb"))) return "bun";
  return "npm";
}

async function runCliStep(
  name: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<StepResult> {
  const result = await runCommand(
    process.execPath,
    [cliPath, ...args],
    cwd,
    timeoutMs,
  );
  return { ...result, name };
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs = commandTimeoutMs,
): Promise<StepResult> {
  const startedAt = Date.now();
  const commandText = [command, ...args].map(quoteForDisplay).join(" ");
  return new Promise((resolve) => {
    const runDirectly =
      process.platform !== "win32" || path.isAbsolute(command);
    const executable = runDirectly
      ? command
      : (process.env.ComSpec ?? "cmd.exe");
    const spawnArgs = runDirectly
      ? args
      : [
          "/d",
          "/s",
          "/c",
          [command, ...args].map(quoteWindowsCmdArg).join(" "),
        ];
    const child = spawn(executable, spawnArgs, {
      cwd,
      env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      settled = true;
      child.kill("SIGTERM");
      resolve({
        name: commandText,
        command: commandText,
        ok: false,
        code: null,
        durationMs: Date.now() - startedAt,
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
        error: `Timed out after ${timeoutMs}ms.`,
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        name: commandText,
        command: commandText,
        ok: false,
        code: null,
        durationMs: Date.now() - startedAt,
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
        error: error.message,
      });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        name: commandText,
        command: commandText,
        ok: code === 0,
        code,
        durationMs: Date.now() - startedAt,
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
      });
    });
  });
}

async function scanRiskyStylePatterns(
  workspace: string,
): Promise<RiskyPattern[]> {
  const sourceFiles = await listSourceFiles(workspace);
  const patterns: RiskyPattern[] = [];

  for (const filePath of sourceFiles) {
    const source = await readFile(filePath, "utf8");
    for (const block of source.matchAll(
      /<Link\b(?=[^>]*\basChild\b)[^>]*>[\s\S]*?<\/Link>/gu,
    )) {
      const text = block[0];
      if (
        /<(?:Pressable|TouchableOpacity|TouchableHighlight)\b[^>]*style=\{\[/u.test(
          text,
        )
      ) {
        patterns.push({
          file: path.relative(workspace, filePath),
          kind: "link-as-child-style-array",
          excerpt: truncateOutput(text.replace(/\s+/gu, " ").trim(), 600),
        });
      }
    }
    for (const block of source.matchAll(
      /<Slot\.[A-Za-z]+[\s\S]*?style=\{\[/gu,
    )) {
      patterns.push({
        file: path.relative(workspace, filePath),
        kind: "slot-style-array",
        excerpt: truncateOutput(block[0].replace(/\s+/gu, " ").trim(), 600),
      });
    }
  }

  return patterns.sort((left, right) => left.file.localeCompare(right.file));
}

async function listSourceFiles(directory: string): Promise<string[]> {
  const ignored = new Set([
    ".expo",
    ".git",
    ".next",
    ".turbo",
    "android",
    "build",
    "coverage",
    "dist",
    "ios",
    "node_modules",
    "web-build",
  ]);
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && /\.(tsx?|jsx?)$/u.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

async function copyLocalDirectory(
  source: string,
  destination: string,
): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true });
  const ignored = new Set([
    ".expo",
    ".git",
    ".next",
    ".turbo",
    "android",
    "build",
    "coverage",
    "dist",
    "ios",
    "node_modules",
    "web-build",
  ]);
  await cp(source, destination, {
    recursive: true,
    filter: (candidate) => !ignored.has(path.basename(candidate)),
  });
}

async function cleanupTempRoot(
  tempRoot: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await removeWithRetries(tempRoot);
    return { ok: true };
  } catch (firstError) {
    if (process.platform === "win32") {
      await stopWindowsProcessesForPath(tempRoot);
      try {
        await removeWithRetries(tempRoot);
        return { ok: true };
      } catch (secondError) {
        return {
          ok: false,
          error:
            secondError instanceof Error
              ? secondError.message
              : String(secondError),
        };
      }
    }

    return {
      ok: false,
      error:
        firstError instanceof Error ? firstError.message : String(firstError),
    };
  }
}

async function removeWithRetries(target: string): Promise<void> {
  await rm(target, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 1_000,
  });
}

async function stopWindowsProcessesForPath(target: string): Promise<void> {
  const script = [
    `$needle = '${target.replace(/'/gu, "''")}'`,
    '$matches = Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like "*$needle*" }',
    "$matches | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
  ].join("; ");

  await new Promise<void>((resolve) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
      ],
      {
        cwd: repoRoot,
        stdio: "ignore",
      },
    );
    child.on("error", () => resolve());
    child.on("close", () => resolve());
  });
}

function buildReport(
  results: MatrixEntryResult[],
  appsRoot: string | null,
  worktreesRoot: string,
  keptTempRoot: string | null,
  cleanupError: string | null,
): MatrixReport {
  const passed = results.filter((result) => result.ok).length;
  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    matrixPath,
    appsRoot,
    worktreesRoot,
    keptTempRoot,
    cleanupError,
    results,
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
    },
  };
}

function finalizeEntry(
  app: MatrixApp,
  branch: string,
  source: string,
  workspace: string | null,
  steps: StepResult[],
  riskyPatterns: RiskyPattern[],
  start: number,
  metadata: {
    contractResults: ContractResult[];
    fixtureContract?: GeneratorFixtureContract;
    requestedRevision?: string;
    resolvedRevision?: string;
  },
): MatrixEntryResult {
  return {
    app: app.name,
    branch,
    source,
    workspace,
    ...(metadata.fixtureContract
      ? { fixtureContract: metadata.fixtureContract }
      : {}),
    contractResults: metadata.contractResults,
    ...(metadata.requestedRevision
      ? { requestedRevision: metadata.requestedRevision }
      : {}),
    ...(metadata.resolvedRevision
      ? { resolvedRevision: metadata.resolvedRevision }
      : {}),
    ok:
      steps.every((step) => step.ok || step.blocking === false) &&
      riskyPatterns.length === 0,
    durationMs: Date.now() - start,
    riskyPatterns,
    steps,
  };
}

function printSummary(report: MatrixReport): void {
  for (const result of report.results) {
    const mark = result.ok ? "✓" : "✗";
    const stepSummary = result.steps
      .map((step) => `${step.name} ${step.ok ? "pass" : "FAIL"}`)
      .join(", ");
    console.log(`${mark} ${result.app} (${result.branch}): ${stepSummary}`);
  }
  console.log(
    `Summary: ${report.summary.passed}/${report.summary.total} matrix entries passing. See ${reportPath} for details.`,
  );
}

function renderFailureSummary(failed: MatrixEntryResult[]): string {
  return [
    "Generator matrix failed:",
    ...failed.map((result) => {
      const failedSteps = result.steps.filter((step) => !step.ok);
      return [
        `- ${result.app} (${result.branch})`,
        ...failedSteps.map((step) => {
          const details = step.error || step.stderr || step.stdout;
          return `  ${step.name}: ${details ? truncateOutput(details, 800) : "failed"}`;
        }),
      ].join("\n");
    }),
    `Report: ${reportPath}`,
  ].join("\n");
}

function mergeStepResults(results: StepResult[]): StepResult {
  return {
    name: results.map((result) => result.name).join(" && "),
    command: results
      .map((result) => result.command)
      .filter(Boolean)
      .join(" && "),
    ok: results.every((result) => result.ok),
    code: results.find((result) => !result.ok)?.code ?? 0,
    durationMs: results.reduce((sum, result) => sum + result.durationMs, 0),
    stdout: truncateOutput(results.map((result) => result.stdout).join("\n")),
    stderr: truncateOutput(results.map((result) => result.stderr).join("\n")),
    error: results.find((result) => result.error)?.error,
  };
}

function namedStep(
  name: string,
  result: StepResult,
  start: number,
): StepResult {
  return {
    ...result,
    name,
    durationMs: Date.now() - start,
  };
}

function lastStepPassed(steps: StepResult[]): boolean {
  return steps[steps.length - 1]?.ok ?? false;
}

async function isGitRepository(directory: string): Promise<boolean> {
  return pathExists(path.join(directory, ".git"));
}

async function assertFileExists(filePath: string, hint: string): Promise<void> {
  if (!(await pathExists(filePath))) {
    throw new Error(`${filePath} does not exist. ${hint}`);
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function sanitizePathSegment(value: string): string {
  return (
    value.replace(/[^a-z0-9._-]+/giu, "-").replace(/^-+|-+$/gu, "") || "app"
  );
}

function resolveOptionalConfigPath(value: string | null): string | null {
  return value ? resolveConfigPath(value, repoRoot) : null;
}

function resolveConfigPath(value: string | null, fallback: string): string {
  if (!value) return path.resolve(fallback);
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(fallback, value);
}

function truncateOutput(value: string, maxLength = 4_000): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n[truncated ${value.length - maxLength} chars]`;
}

function quoteForDisplay(value: string): string {
  return /\s/u.test(value) ? `"${value}"` : value;
}

function quoteWindowsCmdArg(value: string): string {
  if (!/[\s"&|<>^]/u.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}
