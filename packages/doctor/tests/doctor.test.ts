import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runDoctor, scanFile } from '../src/index.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('runDoctor', () => {
  it('reports passing project memory and package script checks for a minimal project', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'sample',
      packageManager: 'pnpm@8.14.0',
      scripts: {
        lint: 'node -e "process.exit(0)"',
        typecheck: 'node -e "process.exit(0)"',
        test: 'node -e "process.exit(0)"',
        doctor: 'node -e "process.exit(0)"',
        build: 'node -e "process.exit(0)"',
      },
    });

    const report = await runDoctor(projectPath, { runScripts: false });

    expect(report.summary.errors).toBe(0);
    expect(report.checks.find((check) => check.name === 'project docs')?.status).toBe('pass');
    expect(report.checks.find((check) => check.name === 'package scripts')?.status).toBe('pass');
  });
});

describe('scanFile', () => {
  it('detects public secret-looking env names in a focused file scan', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src', 'app', 'settings.tsx');
    await mkdir(path.dirname(filePath), { recursive: true });
    const unsafeName = 'EXPO_PUBLIC_' + 'SUPABASE_SERVICE_ROLE_KEY';
    await writeFile(filePath, `export const key = process.env.${unsafeName};`, 'utf8');

    const report = await scanFile(filePath, { projectPath });

    expect(report.summary.errors).toBe(1);
    expect(report.checks.find((check) => check.name === 'env hygiene')?.status).toBe('error');
  });
});

async function createTempProject(): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mrdj-doctor-'));
  tempDirs.push(projectPath);
  await mkdir(path.join(projectPath, 'project'), { recursive: true });
  await writeFile(path.join(projectPath, 'project', 'info.md'), '# Info\n', 'utf8');
  await writeFile(path.join(projectPath, 'project', 'todo.md'), '# Todo\n', 'utf8');
  return projectPath;
}

async function writeProjectFile(
  projectPath: string,
  fileName: string,
  value: Record<string, unknown>
): Promise<void> {
  await writeFile(path.join(projectPath, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
