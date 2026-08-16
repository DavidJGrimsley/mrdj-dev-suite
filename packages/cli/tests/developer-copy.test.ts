import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { renderDeveloperCopyMarkdown, scanDeveloperCopy } from '../src/developer-copy.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('developer-copy report', () => {
  it('flags mock data, placeholder legal text, and leftover exposition files', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-copy-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'src', 'data'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'legal'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'src', 'data', 'mock-app.ts'),
      "export const snapshot = { guestbook: [] };\n",
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'features', 'legal', 'legal-documents.ts'),
      "export const disclaimer = 'This placeholder legal text is not legal advice.';\n",
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'),
      'export const title = "Package exposition";\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'guidelines.md'),
      'TODO: this developer note belongs in project docs and should not be flagged.\n',
      'utf8'
    );

    const report = await scanDeveloperCopy(projectPath, {
      now: () => new Date('2026-08-16T00:00:00.000Z'),
    });
    const markdown = renderDeveloperCopyMarkdown(report);

    expect(report.kind).toBe('developer-copy');
    expect(report.summary.errors).toBeGreaterThan(0);
    expect(report.findings.some((finding) => finding.code === 'mock-data')).toBe(true);
    expect(report.findings.some((finding) => finding.code === 'placeholder-legal')).toBe(true);
    expect(report.findings.some((finding) => finding.code === 'leftover-exposition')).toBe(true);
    expect(report.findings.some((finding) => finding.file.startsWith('project/'))).toBe(false);
    expect(markdown).toContain('# MDS Developer Copy Report');
    expect(markdown).toContain('placeholder-legal');
  });

  it('ignores ordinary TextInput placeholder props', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-copy-placeholder-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'src', 'features', 'home'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'),
      '<TextInput placeholder="Search visits" placeholderTextColor="#6b7280" />\n',
      'utf8'
    );

    const report = await scanDeveloperCopy(projectPath);

    expect(report.summary.findings).toBe(0);
  });
});
