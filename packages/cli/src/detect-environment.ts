import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

type ProcessPlatform = typeof process.platform;
type ProcessEnv = Record<string, string | undefined>;

export interface DetectedPackageManager {
  name: 'npm' | 'pnpm' | 'yarn' | 'bun';
  available: boolean;
  version?: string;
}

export interface DetectedPlatformCapability {
  toolchainAvailable: boolean;
  simulatorAvailable: boolean;
}

export interface DetectedEnvironmentReport {
  mode: 'enabled';
  trigger: 'flag' | 'env';
  expoSdkVersion?: string;
  nodeVersion?: string;
  packageManagers: DetectedPackageManager[];
  expoMcp: {
    packageInstalled: boolean;
    localCapabilitiesConfigured: boolean;
  };
  ios: DetectedPlatformCapability;
  android: DetectedPlatformCapability;
  envFiles: string[];
  recommendedPlatforms: string[];
  skippedPlatforms: string[];
  summaryLines: string[];
  warningLines: string[];
  appliedPlatformRecommendation: boolean;
}

export interface DetectEnvironmentOptions {
  desiredPlatforms?: string[];
  trigger?: 'flag' | 'env';
  appliedPlatformRecommendation?: boolean;
  platform?: ProcessPlatform;
  env?: ProcessEnv;
  fileExists?: (filePath: string) => Promise<boolean>;
  readTextFile?: (filePath: string) => Promise<string | null>;
  runCommand?: (command: string, args: string[]) => Promise<string | null>;
}

export async function detectEnvironment(
  projectPath: string,
  options: DetectEnvironmentOptions = {}
): Promise<DetectedEnvironmentReport> {
  const env = options.env ?? process.env;
  const desiredPlatforms = options.desiredPlatforms ?? ['web', 'ios', 'android'];
  const platform = options.platform ?? process.platform;
  const fileExists = options.fileExists ?? defaultFileExists;
  const readTextFile = options.readTextFile ?? defaultReadTextFile;
  const runCommand = options.runCommand ?? defaultRunCommand;
  const packageJson = await readPackageJson(projectPath, readTextFile);
  const expoDependency = readString(packageJson.dependencies?.expo) ?? readString(packageJson.devDependencies?.expo);
  const expoMcpPackageInstalled =
    typeof packageJson.dependencies?.['expo-mcp'] === 'string' ||
    typeof packageJson.devDependencies?.['expo-mcp'] === 'string';

  const [nodeVersion, npmVersion, pnpmVersion, yarnVersion, bunVersion] = await Promise.all([
    runVersionCommand(runCommand, process.execPath, ['--version']),
    runVersionCommand(runCommand, 'npm', ['--version']),
    runVersionCommand(runCommand, 'pnpm', ['--version']),
    runVersionCommand(runCommand, 'yarn', ['--version']),
    runVersionCommand(runCommand, 'bun', ['--version']),
  ]);

  const packageManagers: DetectedPackageManager[] = [
    { name: 'npm', available: Boolean(npmVersion), version: npmVersion ?? undefined },
    { name: 'pnpm', available: Boolean(pnpmVersion), version: pnpmVersion ?? undefined },
    { name: 'yarn', available: Boolean(yarnVersion), version: yarnVersion ?? undefined },
    { name: 'bun', available: Boolean(bunVersion), version: bunVersion ?? undefined },
  ];

  const xcodeVersion = platform === 'darwin'
    ? await runVersionCommand(runCommand, 'xcodebuild', ['-version'])
    : null;
  const iosBootedSimulators =
    platform === 'darwin'
      ? await runCommand('xcrun', ['simctl', 'list', 'devices', 'booted'])
      : null;
  const androidSdkAvailable =
    hasTruthyEnv(env, ['ANDROID_HOME', 'ANDROID_SDK_ROOT']) ||
    Boolean(await runVersionCommand(runCommand, 'adb', ['version']));
  const androidEmulatorOutput =
    (await runCommand('emulator', ['-list-avds'])) ??
    (await runCommand('adb', ['devices']));

  const ios: DetectedPlatformCapability = {
    toolchainAvailable: Boolean(xcodeVersion),
    simulatorAvailable: Boolean(iosBootedSimulators && iosBootedSimulators.trim().length > 0),
  };
  const android: DetectedPlatformCapability = {
    toolchainAvailable: androidSdkAvailable,
    simulatorAvailable: detectAndroidSimulator(androidEmulatorOutput),
  };

  const envFiles = await detectEnvFiles(projectPath, fileExists);
  const recommendedPlatforms = recommendPlatforms(desiredPlatforms, ios, android);
  const skippedPlatforms = desiredPlatforms.filter((platform) => !recommendedPlatforms.includes(platform));
  const warningLines = buildWarnings({
    desiredPlatforms,
    recommendedPlatforms,
    expoMcpPackageInstalled,
    expoMcpConfigured: env.EXPO_UNSTABLE_MCP_SERVER === '1',
    ios,
    android,
    envFiles,
  });

  const summaryLines = [
    `Expo MCP onboarding was enabled via ${options.trigger ?? 'flag'}.`,
    expoMcpPackageInstalled
      ? 'The project already declares expo-mcp for local Expo MCP capabilities.'
      : 'The project does not yet declare expo-mcp, so only direct local probes informed machine capabilities.',
    `Recommended platform scope for local onboarding: ${recommendedPlatforms.join(', ')}.`,
  ];

  return {
    mode: 'enabled',
    trigger: options.trigger ?? 'flag',
    expoSdkVersion: normalizePackageVersion(expoDependency),
    nodeVersion: normalizeVersion(nodeVersion ?? undefined),
    packageManagers,
    expoMcp: {
      packageInstalled: expoMcpPackageInstalled,
      localCapabilitiesConfigured: env.EXPO_UNSTABLE_MCP_SERVER === '1',
    },
    ios,
    android,
    envFiles,
    recommendedPlatforms,
    skippedPlatforms,
    summaryLines,
    warningLines,
    appliedPlatformRecommendation: options.appliedPlatformRecommendation === true,
  };
}

export function isExpoMcpOnboardingEnabled(
  value: boolean | undefined,
  env: ProcessEnv = process.env
): { enabled: boolean; trigger?: 'flag' | 'env' } {
  if (value === true) {
    return { enabled: true, trigger: 'flag' };
  }
  if (env.EXPO_MCP_ONBOARDING?.trim().toLowerCase() === 'true') {
    return { enabled: true, trigger: 'env' };
  }
  return { enabled: false };
}

function recommendPlatforms(
  desiredPlatforms: string[],
  ios: DetectedPlatformCapability,
  android: DetectedPlatformCapability
): string[] {
  const recommended: string[] = [];
  for (const platform of desiredPlatforms) {
    if (platform === 'ios' || platform === 'apple-tv') {
      if (ios.toolchainAvailable) {
        recommended.push(platform);
      }
      continue;
    }
    if (platform === 'android' || platform === 'android-tv') {
      if (android.toolchainAvailable) {
        recommended.push(platform);
      }
      continue;
    }
    recommended.push(platform);
  }

  return recommended.length > 0 ? recommended : ['web'];
}

function buildWarnings(input: {
  desiredPlatforms: string[];
  recommendedPlatforms: string[];
  expoMcpPackageInstalled: boolean;
  expoMcpConfigured: boolean;
  ios: DetectedPlatformCapability;
  android: DetectedPlatformCapability;
  envFiles: string[];
}): string[] {
  const warnings: string[] = [];
  if (!input.expoMcpPackageInstalled) {
    warnings.push('expo-mcp is not installed yet, so Expo MCP local capabilities are not ready for this generated project.');
  } else if (!input.expoMcpConfigured) {
    warnings.push('Set EXPO_UNSTABLE_MCP_SERVER=1 when running expo start to expose Expo MCP local capabilities.');
  }
  if (input.desiredPlatforms.includes('ios') || input.desiredPlatforms.includes('apple-tv')) {
    if (!input.ios.toolchainAvailable) {
      warnings.push('Xcode was not detected, so local iOS builds are not currently available.');
    } else if (!input.ios.simulatorAvailable) {
      warnings.push('Xcode is available, but no running iOS simulator was detected.');
    }
  }
  if (input.desiredPlatforms.includes('android') || input.desiredPlatforms.includes('android-tv')) {
    if (!input.android.toolchainAvailable) {
      warnings.push('Android SDK tooling was not detected, so local Android builds are not currently available.');
    } else if (!input.android.simulatorAvailable) {
      warnings.push('Android tooling is available, but no emulator was detected.');
    }
  }
  if (input.envFiles.length === 0) {
    warnings.push('No .env files were detected in the project root.');
  }
  if (input.recommendedPlatforms.length !== input.desiredPlatforms.length) {
    warnings.push(
      `Recommended local platform scope is reduced from ${input.desiredPlatforms.join(', ')} to ${input.recommendedPlatforms.join(', ')}.`
    );
  }
  return warnings;
}

async function detectEnvFiles(
  projectPath: string,
  fileExists: (filePath: string) => Promise<boolean>
): Promise<string[]> {
  const candidates = ['.env', '.env.local', '.env.development', '.env.development.local'];
  const present: string[] = [];
  for (const candidate of candidates) {
    if (await fileExists(path.join(projectPath, candidate))) {
      present.push(candidate);
    }
  }
  return present;
}

function detectAndroidSimulator(output: string | null): boolean {
  if (!output) {
    return false;
  }
  const normalized = output.toLowerCase();
  return (
    normalized.trim().length > 0 &&
    (normalized.includes('emulator') ||
      normalized.includes('offline') ||
      /\bdevice\b/u.test(normalized) ||
      !normalized.includes('list of devices attached'))
  );
}

async function readPackageJson(
  projectPath: string,
  readTextFile: (filePath: string) => Promise<string | null>
): Promise<{
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}> {
  const raw = await readTextFile(path.join(projectPath, 'package.json'));
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      dependencies: isStringRecord(parsed.dependencies) ? parsed.dependencies : undefined,
      devDependencies: isStringRecord(parsed.devDependencies) ? parsed.devDependencies : undefined,
    };
  } catch {
    return {};
  }
}

function hasTruthyEnv(env: ProcessEnv, keys: string[]): boolean {
  return keys.some((key) => typeof env[key] === 'string' && env[key]?.trim().length);
}

async function runVersionCommand(
  runCommand: (command: string, args: string[]) => Promise<string | null>,
  command: string,
  args: string[]
): Promise<string | null> {
  const output = await runCommand(command, args);
  return normalizeVersion(output ?? undefined) ?? null;
}

function normalizeVersion(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim().split(/\r?\n/u)[0]?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.replace(/^v/u, '') : undefined;
}

function normalizePackageVersion(value: string | undefined): string | undefined {
  const normalized = normalizeVersion(value);
  return normalized?.replace(/^[~^><=\s]+/u, '');
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function defaultFileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function defaultReadTextFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function defaultRunCommand(command: string, args: string[]): Promise<string | null> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      windowsHide: true,
      timeout: 8000,
      maxBuffer: 1024 * 1024,
    });
    const text = `${stdout ?? ''}`.trim() || `${stderr ?? ''}`.trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
