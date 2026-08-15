import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runDoctorCli } from '../src/cli-main.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('doctor CLI', () => {
  it('prints parseable JSON with score when --json is set', async () => {
    const projectPath = await createTempProject();
    await writePackageJson(projectPath, {
      name: 'cli-json',
      scripts: {
        lint: 'node -e "process.exit(0)"',
        typecheck: 'node -e "process.exit(0)"',
        test: 'node -e "process.exit(0)"',
        doctor: 'node -e "process.exit(0)"',
        build: 'node -e "process.exit(0)"',
      },
    });

    const result = await runDoctorCli([projectPath, '--ci', '--json', '--no-scripts']);
    const parsed = JSON.parse(result.output) as { summary?: { score?: number } };

    expect(result.exitCode).toBe(0);
    expect(typeof parsed.summary?.score).toBe('number');
  });

  it('returns exit code 1 when Doctor reports errors', async () => {
    const projectPath = await createTempProject();
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Info\n\n# TodoForContext(optional): Add notes.\n',
      'utf8'
    );

    const result = await runDoctorCli([projectPath, '--ci', '--json', '--no-scripts']);
    expect(result.exitCode).toBe(1);
  });

  it('preserves CI as the standalone Doctor CLI default', async () => {
    const projectPath = await createTempProject();
    const result = await runDoctorCli([projectPath, '--json', '--no-scripts']);
    const parsed = JSON.parse(result.output) as { mode?: string; selection?: { defaultMode?: string } };

    expect(parsed.mode).toBe('ci');
    expect(parsed.selection?.defaultMode).toBe('ci');
  });

  it('prints mode help for standalone Doctor CLI', async () => {
    const result = await runDoctorCli(['--help']);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Default mode: ci');
    expect(result.output).toContain('--full');
  });

  it('rejects multiple mode flags', async () => {
    await expect(runDoctorCli(['--fast', '--ci'])).rejects.toThrow(
      'Choose only one Doctor mode flag'
    );
  });
});

async function createTempProject(): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-doctor-cli-'));
  tempDirs.push(projectPath);
  await mkdir(path.join(projectPath, 'project'), { recursive: true });
  await writeFile(path.join(projectPath, 'project', 'info.md'), '# Info\n', 'utf8');
  await writeFile(path.join(projectPath, 'project', 'todo.md'), '# Todo\n', 'utf8');
  await writeFile(path.join(projectPath, 'project', 'guidelines.md'), '# Guidelines\n', 'utf8');
  return projectPath;
}

async function writePackageJson(projectPath: string, value: Record<string, unknown>): Promise<void> {
  await writeFile(path.join(projectPath, 'package.json'), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
