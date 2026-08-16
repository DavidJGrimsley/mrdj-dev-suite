import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runEjectExpositionCommand } from "../src/commands/eject.js";
import { runStylistEjectCommand } from "../src/commands/stylist.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(testDir, "../../experimemo");
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
  tempDirs.length = 0;
});

describe("Experimemo generator fixture regression", () => {
  it("keeps generated Link and modal patterns safe", async () => {
    const home = await readFile(
      path.join(fixturePath, "src", "features", "home", "home-screen.tsx"),
      "utf8",
    );
    const layout = await readFile(
      path.join(fixturePath, "src", "app", "_layout.tsx"),
      "utf8",
    );
    const settings = await readFile(
      path.join(
        fixturePath,
        "src",
        "features",
        "settings",
        "settings-screen.tsx",
      ),
      "utf8",
    );

    expect(home).toContain('<Link href="/settings" asChild>');
    expect(home).toMatch(/StyleSheet\.flatten\(\[\s*styles\.infoButton/u);
    expect(home).toMatch(/StyleSheet\.flatten\(\[\s*styles\.primaryCard/u);
    expect(home).toMatch(/StyleSheet\.flatten\(\[\s*styles\.linkCard/u);
    expect(findRiskyAsChildStyleArrayBlocks(home)).toEqual([]);
    expect(layout).toMatch(/<Stack\.Screen\s+name="settings"/u);
    expect(layout).toContain("presentation: 'modal'");
    expect(settings).toContain("Platform.OS === 'web'");
    expect(settings).toContain("styles.webOverlay");

    const riskyStyleArrayFiles = await findRiskyAsChildStyleArrayFiles(
      path.join(fixturePath, "src"),
    );
    expect(riskyStyleArrayFiles).toEqual([]);
  }, 30_000);

  it("runs fixture scripts that future generated apps must keep passing", async () => {
    await runProjectCommand("pnpm", ["test"], fixturePath, 180_000);
    await runProjectCommand("pnpm", ["build:web"], fixturePath, 240_000);
  }, 450_000);

  it("ejects Stylist and exposition safely from a disposable fixture copy", async () => {
    const copyPath = await copyFixtureToTemp();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      await runStylistEjectCommand({ path: copyPath });
      await runEjectExpositionCommand({
        path: copyPath,
        keep: "onboarding,settings",
      });
    } finally {
      log.mockRestore();
    }

    await expect(
      readFile(
        path.join(
          copyPath,
          "src",
          "features",
          "exposition",
          "stylist-screen.tsx",
        ),
        "utf8",
      ),
    ).rejects.toThrow();
    await expect(
      readFile(
        path.join(
          copyPath,
          "src",
          "features",
          "exposition",
          "exposition-screen.tsx",
        ),
        "utf8",
      ),
    ).rejects.toThrow();
    await expect(
      readFile(
        path.join(
          copyPath,
          "src",
          "features",
          "settings",
          "settings-screen.tsx",
        ),
        "utf8",
      ),
    ).resolves.toContain("Settings");

    const layout = await readFile(
      path.join(copyPath, "src", "app", "_layout.tsx"),
      "utf8",
    );
    expect(layout).toMatch(/<Stack\.Screen\s+name="settings"/u);
    expect(layout).toContain("presentation: 'modal'");
    expect(layout).not.toContain("exposition/stylist");
    expect(layout).not.toContain("exposition/index");
  }, 90_000);
});

async function copyFixtureToTemp(): Promise<string> {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "mds-experimemo-fixture-"),
  );
  tempDirs.push(tempRoot);
  const copyPath = path.join(tempRoot, "experimemo");
  await cp(fixturePath, copyPath, {
    recursive: true,
    filter: (source) => {
      const base = path.basename(source);
      return !["node_modules", ".expo", "dist", "web-build"].includes(base);
    },
  });
  return copyPath;
}

async function findRiskyAsChildStyleArrayFiles(
  sourceDir: string,
): Promise<string[]> {
  const files = await listSourceFiles(sourceDir);
  const riskyFiles: string[] = [];
  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    if (findRiskyAsChildStyleArrayBlocks(source).length > 0) {
      riskyFiles.push(path.relative(fixturePath, filePath));
      continue;
    }
    if (/<Slot\.[A-Za-z]+[\s\S]*?style=\{\[/u.test(source)) {
      riskyFiles.push(path.relative(fixturePath, filePath));
    }
  }
  return riskyFiles.sort();
}

function findRiskyAsChildStyleArrayBlocks(source: string): string[] {
  const riskyBlocks: string[] = [];
  const linkBlocks = source.matchAll(
    /<Link\b(?=[^>]*\basChild\b)[^>]*>[\s\S]*?<\/Link>/gu,
  );
  for (const match of linkBlocks) {
    const block = match[0];
    if (
      /<(?:Pressable|TouchableOpacity|TouchableHighlight)\b[^>]*style=\{\[/u.test(
        block,
      )
    ) {
      riskyBlocks.push(block);
    }
  }
  return riskyBlocks;
}

async function listSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
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

async function runProjectCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const executable =
      process.platform === "win32"
        ? (process.env.ComSpec ?? "cmd.exe")
        : command;
    const spawnArgs =
      process.platform === "win32"
        ? [
            "/d",
            "/s",
            "/c",
            [command, ...args].map(quoteWindowsCmdArg).join(" "),
          ]
        : args;
    const child = spawn(executable, spawnArgs, {
      cwd,
      env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(
        new Error(
          `${command} ${args.join(" ")} timed out after ${timeoutMs}ms\n${output}`,
        ),
      );
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} exited with ${code}\n${output}`,
        ),
      );
    });
  });
}

function quoteWindowsCmdArg(value: string): string {
  if (!/[\s"&|<>^]/u.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}
