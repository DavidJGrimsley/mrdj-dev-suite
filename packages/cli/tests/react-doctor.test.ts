import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildReactDoctorCommandInvocation,
  buildDirectReactDoctorPackageScript,
  buildReactDoctorPackageScript,
  ensureReactDoctorConfig,
  ensureReactDoctorReadmeSection,
  isMonorepoWorkspaceRoot,
  isFalsyEnvFlag,
  renderReactDoctorConfig,
  renderReactDoctorReadmeSection,
  resolveReactDoctorDisabled,
  resolveReactDoctorDisabledFromEnv,
  resolveReactDoctorDisabledFromPackageJson,
  REACT_DOCTOR_VERSION,
} from '../src/react-doctor.js';
import { isSupportedRunTool, runReactDoctorTool } from '../src/commands/run.js';
import { scaffoldProjectMemory } from '../src/project-memory.js';

import type { OnboardAnswers } from '../src/project-memory.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

function sampleAnswers(appName: string): OnboardAnswers {
  return {
    appName,
    audience: 'developers',
    coreFlows: 'open app',
    dataNeeds: 'local',
    deploymentTarget: 'web',
    advancedPackageSetup: true,
    includeCreateExpoComponents: false,
    targetPlatforms: ['web'],
    firstTargetPlatform: 'web',
    platformFileStrategy: 'files-only',
    webOutput: 'static',
    deployedServer: 'none',
    expoServerAdapter: 'none',
    customBackend: false,
    customBackendEntry: 'server.js',
    usesExpoUi: false,
    usesExpoUiUniversalComponents: false,
    usesExpoNativeTabs: false,
    easUses: [],
    projectInfoReady: true,
    projectStyleReady: true,
    appDirectory: 'src',
    platformLayoutMode: 'shared',
    dataStart: 'local',
    onboardingFlow: 'none',
    legalDocumentMode: 'none',
    onboardingCompletionMode: 'enter-app',
    legalUpdateGate: 'none',
    testToMainSafeguards: false,
    defaults: ['project-docs', 'guidelines', 'doctor', 'uniwind'],
    generatorStylingSystem: 'uniwind',
    generatorNavigationLibrary: 'expo-router',
  };
}

describe('react-doctor helpers', () => {
  it('renders a doctor.config.json with Expo-friendly ignores and advisory blocking', () => {
    const config = JSON.parse(renderReactDoctorConfig()) as {
      blocking: string;
      ignore: { files: string[] };
    };
    expect(config.blocking).toBe('none');
    expect(config.ignore.files).toContain('**/.expo/**');
    expect(config.ignore.files).toContain('**/android/**');
  });

  it('builds a non-interactive react-doctor invocation with telemetry off', () => {
    expect(buildReactDoctorCommandInvocation().display).toBe(
      'npx react-doctor -y --no-telemetry'
    );
    expect(buildReactDoctorCommandInvocation({ json: true, blocking: 'error' }).display).toBe(
      'npx react-doctor -y --no-telemetry --json --blocking error'
    );
    expect(buildReactDoctorCommandInvocation({ noTelemetry: false }).display).toBe(
      'npx react-doctor -y'
    );
    expect(
      buildReactDoctorCommandInvocation({
        json: true,
        jsonOut: 'C:\\Temp\\react-doctor.json',
      }).display
    ).toBe('npx react-doctor -y --no-telemetry --json --json-out C:\\Temp\\react-doctor.json');
    expect(buildReactDoctorPackageScript()).toBe('npx mds run react-doctor');
    expect(buildDirectReactDoctorPackageScript()).toBe('npx react-doctor -y --no-telemetry');
  });

  it('keeps wrapper status text off stdout for JSON runs', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-rd-json-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({ name: 'disabled-json', mds: { reactDoctor: false } }),
      'utf8'
    );
    const originalLog = console.log;
    const originalError = console.error;
    const stdout: string[] = [];
    const stderr: string[] = [];
    console.log = (message?: unknown) => {
      stdout.push(String(message ?? ''));
    };
    console.error = (message?: unknown) => {
      stderr.push(String(message ?? ''));
    };

    try {
      await runReactDoctorTool({ path: projectPath, json: true });
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }

    expect(stdout).toEqual([]);
    expect(stderr.join('\n')).toContain('mds run react-doctor');
  });

  it('honors disable env flags and package.json knobs', () => {
    expect(isFalsyEnvFlag('0')).toBe(true);
    expect(resolveReactDoctorDisabledFromEnv({ MDS_REACT_DOCTOR: '0' }).disabled).toBe(true);
    expect(resolveReactDoctorDisabledFromEnv({ MDS_DISABLE_REACT_DOCTOR: '1' }).disabled).toBe(
      true
    );
    expect(resolveReactDoctorDisabledFromEnv({ REACT_DOCTOR_DISABLED: 'true' }).disabled).toBe(
      true
    );
    expect(
      resolveReactDoctorDisabledFromPackageJson({ mds: { reactDoctor: false } }).disabled
    ).toBe(true);
    expect(
      resolveReactDoctorDisabledFromPackageJson({
        reactDoctor: { enabled: false },
      }).disabled
    ).toBe(true);
    expect(resolveReactDoctorDisabledFromPackageJson({ mds: { reactDoctor: true } }).disabled).toBe(
      false
    );
  });

  it('detects monorepo roots via pnpm-workspace and package workspaces', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-rd-mono-'));
    tempDirs.push(projectPath);
    await writeFile(path.join(projectPath, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n");
    await expect(isMonorepoWorkspaceRoot(projectPath)).resolves.toBe(true);

    const npmWorkspace = await mkdtemp(path.join(os.tmpdir(), 'mds-rd-npmws-'));
    tempDirs.push(npmWorkspace);
    await writeFile(
      path.join(npmWorkspace, 'package.json'),
      JSON.stringify({ name: 'root', private: true, workspaces: ['apps/*', 'packages/*'] }),
      'utf8'
    );
    await expect(isMonorepoWorkspaceRoot(npmWorkspace)).resolves.toBe(true);

    const single = await mkdtemp(path.join(os.tmpdir(), 'mds-rd-single-'));
    tempDirs.push(single);
    await writeFile(
      path.join(single, 'package.json'),
      JSON.stringify({ name: 'app', private: true }),
      'utf8'
    );
    await expect(isMonorepoWorkspaceRoot(single)).resolves.toBe(false);
  });

  it('writes config and README section helpers', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-rd-files-'));
    tempDirs.push(projectPath);

    const configResult = await ensureReactDoctorConfig(projectPath);
    expect(configResult.wrote).toBe(true);
    await expect(readFile(configResult.filePath, 'utf8')).resolves.toContain(
      'https://react.doctor/schema/config.json'
    );
    await expect(ensureReactDoctorConfig(projectPath)).resolves.toMatchObject({ wrote: false });

    const readmeResult = await ensureReactDoctorReadmeSection(projectPath);
    expect(readmeResult.wrote).toBe(true);
    const readme = await readFile(readmeResult.filePath, 'utf8');
    expect(readme).toContain('## React Doctor (code quality checks)');
    expect(readme).toContain('MDS_REACT_DOCTOR=0');
    expect(renderReactDoctorReadmeSection()).toContain('mds run react-doctor');
    await expect(ensureReactDoctorReadmeSection(projectPath)).resolves.toMatchObject({
      wrote: false,
    });
  });

  it('supports only the react-doctor run tool today', () => {
    expect(isSupportedRunTool('react-doctor')).toBe(true);
    expect(isSupportedRunTool('doctor')).toBe(false);
  });

  it('scaffolds react-doctor into generated apps by default', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-rd-scaffold-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'rd-app',
        scripts: {},
        dependencies: {},
        devDependencies: {},
      }),
      'utf8'
    );
    await writeFile(path.join(projectPath, 'README.md'), '# Sample\n', 'utf8');

    await scaffoldProjectMemory(projectPath, sampleAnswers('RD App'), {
      richBoilerplate: true,
      manageUniwind: true,
    });

    const packageJson = JSON.parse(
      await readFile(path.join(projectPath, 'package.json'), 'utf8')
    ) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(packageJson.devDependencies['react-doctor']).toBe(REACT_DOCTOR_VERSION);
    expect(packageJson.scripts['react-doctor']).toBe('npx react-doctor -y --no-telemetry');
    expect(packageJson.scripts['mds:react-doctor']).toBe('npx mds run react-doctor');

    await expect(readFile(path.join(projectPath, 'doctor.config.json'), 'utf8')).resolves.toContain(
      '"blocking": "none"'
    );
    await expect(readFile(path.join(projectPath, 'README.md'), 'utf8')).resolves.toContain(
      '## React Doctor (code quality checks)'
    );
    await expect(
      readFile(path.join(projectPath, 'project', 'guidelines.md'), 'utf8')
    ).resolves.toContain('mds run react-doctor');

    await expect(
      resolveReactDoctorDisabled(projectPath, { MDS_REACT_DOCTOR: '0' })
    ).resolves.toMatchObject({ disabled: true });
  });

  it('works with monorepo workspace app package.json scaffolding', async () => {
    const { mkdir } = await import('node:fs/promises');
    const root = await mkdtemp(path.join(os.tmpdir(), 'mds-rd-workspace-'));
    tempDirs.push(root);
    await writeFile(path.join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n");
    await writeFile(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'workspace-root', private: true }),
      'utf8'
    );

    const appPath = path.join(root, 'apps', 'mobile');
    await mkdir(appPath, { recursive: true });
    await writeFile(
      path.join(appPath, 'package.json'),
      JSON.stringify({
        name: 'mobile',
        scripts: {},
        dependencies: { react: '19.0.0' },
        devDependencies: {},
      }),
      'utf8'
    );

    await scaffoldProjectMemory(appPath, sampleAnswers('Mobile Workspace App'), {
      richBoilerplate: true,
      manageUniwind: true,
    });

    const packageJson = JSON.parse(await readFile(path.join(appPath, 'package.json'), 'utf8')) as {
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    };
    expect(packageJson.devDependencies['react-doctor']).toBe(REACT_DOCTOR_VERSION);
    expect(packageJson.scripts['react-doctor']).toContain('react-doctor');
    await expect(isMonorepoWorkspaceRoot(root)).resolves.toBe(true);
    await expect(isMonorepoWorkspaceRoot(appPath)).resolves.toBe(false);
  });
});
