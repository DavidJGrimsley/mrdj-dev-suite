import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runStylistSyncCommand } from '../src/commands/stylist.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('runStylistSyncCommand', () => {
  it('syncs canonical theme tokens into style, css, tokens, and todo files', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-sync-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'project', 'todo.md'),
      '# Todo\n\n## Phase 1: App Shell\n\n- [ ] Existing task\n',
      'utf8'
    );
    await writeFile(path.join(projectPath, 'project', 'style.md'), '# Style\n\n## Colors\n\n- Existing\n', 'utf8');
    await writeFile(path.join(projectPath, 'global.css'), "@import 'tailwindcss';\n@import 'uniwind';\n", 'utf8');

    const payload = {
      version: 1,
      colors: {
        background: '#fefefe',
        surface: '#f1f5f9',
        text: '#0f172a',
        primary: '#0ea5e9',
        success: '#22c55e',
        warning: '#f59e0b',
      },
      typography: {
        fontFamily: 'System',
        displaySize: 34,
        headingSize: 22,
        bodySize: 16,
        captionSize: 12,
      },
      layout: {
        radius: 14,
        spacing: {
          xs: 4,
          sm: 8,
          md: 16,
          lg: 24,
          xl: 32,
        },
      },
    };

    await runStylistSyncCommand({
      path: projectPath,
      inputJson: JSON.stringify(payload),
    });

    await expect(readFile(path.join(projectPath, 'project', 'theme.json'), 'utf8')).resolves.toContain('#0ea5e9');
    await expect(readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')).resolves.toContain(
      'MDS_STYLIST_THEME_START'
    );
    await expect(readFile(path.join(projectPath, 'global.css'), 'utf8')).resolves.toContain(
      '--color-primary: #0ea5e9;'
    );
    await expect(readFile(path.join(projectPath, 'src', 'theme', 'tokens.ts'), 'utf8')).resolves.toContain(
      'stylistThemeTokens'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      'Apply Stylist synced theme tokens to production UI components and screens.'
    );
  });

  it('is idempotent and does not duplicate the theme todo task', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-idempotent-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(path.join(projectPath, 'project', 'todo.md'), '# Todo\n\n## Phase 1: App Shell\n\n', 'utf8');

    await runStylistSyncCommand({ path: projectPath });
    await runStylistSyncCommand({ path: projectPath });

    const todo = await readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8');
    const hits = todo.match(/Apply Stylist synced theme tokens to production UI components and screens\./g) ?? [];
    expect(hits).toHaveLength(1);
  });

  it('fails validation for malformed token payloads', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-invalid-'));
    tempDirs.push(projectPath);

    await expect(
      runStylistSyncCommand({
        path: projectPath,
        inputJson: JSON.stringify({
          version: 1,
          colors: {
            background: 'white',
            surface: '#f1f5f9',
            text: '#0f172a',
            primary: '#0ea5e9',
            success: '#22c55e',
            warning: '#f59e0b',
          },
          typography: {
            fontFamily: 'System',
            displaySize: 34,
            headingSize: 22,
            bodySize: 16,
            captionSize: 12,
          },
          layout: {
            radius: 14,
            spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
          },
        }),
      })
    ).rejects.toThrow('colors.background must use #RRGGBB format.');
  });

  it('handles missing optional files by creating managed outputs', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-missing-'));
    tempDirs.push(projectPath);

    await runStylistSyncCommand({ path: projectPath });

    await expect(readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')).resolves.toContain(
      'Canonical Theme Tokens'
    );
    await expect(readFile(path.join(projectPath, 'global.css'), 'utf8')).resolves.toContain(
      'MDS_STYLIST_THEME_START'
    );
    await expect(readFile(path.join(projectPath, 'src', 'theme', 'tokens.ts'), 'utf8')).resolves.toContain(
      'StylistThemeTokens'
    );
  });
});
