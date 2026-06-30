import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  runStylistEjectCommand,
  runStylistReconcileOutputCommand,
  runStylistSyncCommand,
} from '../src/commands/stylist.js';
import { loadStylistThemeWithDiagnostics } from '../src/stylist-theme.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('runStylistSyncCommand', () => {
  it('loads startup theme from project/theme.json before style.md managed block', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-load-theme-json-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await runStylistSyncCommand({ path: projectPath });

    const baseTheme = JSON.parse(await readFile(path.join(projectPath, 'project', 'theme.json'), 'utf8')) as {
      layout: { radius: number };
    };
    baseTheme.layout.radius = 21;
    await writeFile(path.join(projectPath, 'project', 'theme.json'), `${JSON.stringify(baseTheme, null, 2)}\n`, 'utf8');

    const styleWithDifferentTheme = (await readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')).replace(
      '"radius": 21',
      '"radius": 33'
    );
    await writeFile(path.join(projectPath, 'project', 'style.md'), styleWithDifferentTheme, 'utf8');

    const loaded = await loadStylistThemeWithDiagnostics(projectPath);
    expect(loaded.theme.layout.radius).toBe(21);
    expect(loaded.diagnostics.source).toBe('theme.json');
    expect(loaded.diagnostics.mismatchDetected).toBe(true);
  });

  it('falls back to project/style.md managed block when project/theme.json is missing or invalid', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-load-style-fallback-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await runStylistSyncCommand({ path: projectPath });

    const style = await readFile(path.join(projectPath, 'project', 'style.md'), 'utf8');
    const nextStyle = style.replace('"radius": 12', '"radius": 26');
    await writeFile(path.join(projectPath, 'project', 'style.md'), nextStyle, 'utf8');
    await writeFile(path.join(projectPath, 'project', 'theme.json'), '{"invalid":', 'utf8');

    const loaded = await loadStylistThemeWithDiagnostics(projectPath);
    expect(loaded.theme.layout.radius).toBe(26);
    expect(loaded.diagnostics.source).toBe('style.md');
  });

  it('falls back to default theme when both project/theme.json and style.md are unusable', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-load-default-fallback-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(path.join(projectPath, 'project', 'theme.json'), '{"invalid":', 'utf8');
    await writeFile(path.join(projectPath, 'project', 'style.md'), '# Style\n\nNo managed block\n', 'utf8');

    const loaded = await loadStylistThemeWithDiagnostics(projectPath);
    expect(loaded.theme.layout.radius).toBe(12);
    expect(loaded.diagnostics.source).toBe('default');
  });

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
      colorSystem: {
        mode: 'bg',
        previewScheme: 'light',
        familyMode: 'two',
      },
      families: {
        light: {
          primary: 'blue',
          secondary: 'violet',
          success: 'emerald',
          warning: 'amber',
        },
        dark: {
          primary: 'sky',
          secondary: 'indigo',
          success: 'green',
          warning: 'orange',
        },
      },
      palettes: {
        bg: {
          light: {
            background: '#fefefe',
            surface: '#f1f5f9',
            text: '#0f172a',
            primary: '#0ea5e9',
            secondary: '#8b5cf6',
            success: '#22c55e',
            warning: '#f59e0b',
          },
          dark: {
            background: '#0a0a0a',
            surface: '#1f2937',
            text: '#f8fafc',
            primary: '#38bdf8',
            secondary: '#a78bfa',
            success: '#4ade80',
            warning: '#fb923c',
          },
        },
        automatic: {
          light: {
            background: '#eff6ff',
            surface: '#dbeafe',
            text: '#1e3a8a',
            primary: '#3b82f6',
            secondary: '#8b5cf6',
            success: '#10b981',
            warning: '#f59e0b',
          },
          dark: {
            background: '#172554',
            surface: '#1e3a8a',
            text: '#eff6ff',
            primary: '#60a5fa',
            secondary: '#a78bfa',
            success: '#34d399',
            warning: '#fbbf24',
          },
        },
      },
      colors: {
        light: {
          background: '#fefefe',
          surface: '#f1f5f9',
          text: '#0f172a',
          primary: '#0ea5e9',
          secondary: '#8b5cf6',
          success: '#22c55e',
          warning: '#f59e0b',
        },
        dark: {
          background: '#0a0a0a',
          surface: '#1f2937',
          text: '#f8fafc',
          primary: '#38bdf8',
          secondary: '#a78bfa',
          success: '#4ade80',
          warning: '#fb923c',
        },
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
    await expect(readFile(path.join(projectPath, 'global.css'), 'utf8')).resolves.toContain(
      '--color-secondary: #8b5cf6;'
    );
    await expect(readFile(path.join(projectPath, 'src', 'theme', 'tokens.ts'), 'utf8')).resolves.toContain(
      'stylistThemeTokens'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.not.toContain(
      'Apply Stylist synced theme tokens to production UI components and screens.'
    );
  });

  it('does not inject a stylist follow-up todo into later phases', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-idempotent-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(path.join(projectPath, 'project', 'todo.md'), '# Todo\n\n## Phase 1: App Shell\n\n', 'utf8');

    await runStylistSyncCommand({ path: projectPath });
    await runStylistSyncCommand({ path: projectPath });

    const todo = await readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8');
    expect(todo).not.toContain('Apply Stylist synced theme tokens to production UI components and screens.');
  });

  it('fails validation for malformed token payloads', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-invalid-'));
    tempDirs.push(projectPath);

    await expect(
      runStylistSyncCommand({
        path: projectPath,
        inputJson: JSON.stringify({
          version: 1,
          colorSystem: {
            mode: 'bg',
            previewScheme: 'light',
            familyMode: 'one',
          },
          families: {
            light: {
              primary: 'blue',
              secondary: 'violet',
              success: 'emerald',
              warning: 'amber',
            },
            dark: {
              primary: 'blue',
              secondary: 'violet',
              success: 'emerald',
              warning: 'amber',
            },
          },
          palettes: {
            bg: {
              light: {
                background: 'white',
                surface: '#f1f5f9',
                text: '#0f172a',
                primary: '#0ea5e9',
                secondary: '#8b5cf6',
                success: '#22c55e',
                warning: '#f59e0b',
              },
              dark: {
                background: '#0a0a0a',
                surface: '#1f2937',
                text: '#f8fafc',
                primary: '#38bdf8',
                secondary: '#a78bfa',
                success: '#4ade80',
                warning: '#fb923c',
              },
            },
            automatic: {
              light: {
                background: '#eff6ff',
                surface: '#dbeafe',
                text: '#1e3a8a',
                primary: '#3b82f6',
                secondary: '#8b5cf6',
                success: '#10b981',
                warning: '#f59e0b',
              },
              dark: {
                background: '#172554',
                surface: '#1e3a8a',
                text: '#eff6ff',
                primary: '#60a5fa',
                secondary: '#a78bfa',
                success: '#34d399',
                warning: '#fbbf24',
              },
            },
          },
          colors: {
            light: {
              background: '#fefefe',
              surface: '#f1f5f9',
              text: '#0f172a',
              primary: '#0ea5e9',
              secondary: '#8b5cf6',
              success: '#22c55e',
              warning: '#f59e0b',
            },
            dark: {
              background: '#0a0a0a',
              surface: '#1f2937',
              text: '#f8fafc',
              primary: '#38bdf8',
              secondary: '#a78bfa',
              success: '#4ade80',
              warning: '#fb923c',
            },
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
    ).rejects.toThrow('palettes.bg.light.background must use #RRGGBB format.');
  });

  it('handles missing optional files by creating managed outputs', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-missing-'));
    tempDirs.push(projectPath);

    await runStylistSyncCommand({ path: projectPath, styleLibrary: 'uniwind' });

    await expect(readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')).resolves.toContain(
      'Canonical Theme Tokens'
    );
    await expect(readFile(path.join(projectPath, 'global.css'), 'utf8')).resolves.toContain(
      'MDS_STYLIST_THEME_START'
    );
    await expect(readFile(path.join(projectPath, 'src', 'theme', 'tokens.ts'), 'utf8')).resolves.toContain(
      'StylistThemeTokens'
    );
    await expect(readFile(path.join(projectPath, 'project', 'stylist.config.json'), 'utf8')).resolves.toContain(
      '"styleLibrary": "uniwind"'
    );
  });

  it('detects style library from cesconfig.jsonc', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-cesconfig-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'cesconfig.jsonc'),
      `{
  // comment
  "packages": [{ "name": "restyle", "type": "styling" }]
}`,
      'utf8'
    );

    await runStylistSyncCommand({ path: projectPath });
    await expect(readFile(path.join(projectPath, 'project', 'stylist.config.json'), 'utf8')).resolves.toContain(
      '"styleLibrary": "restyle"'
    );
    await expect(readFile(path.join(projectPath, 'theme.ts'), 'utf8')).resolves.toContain(
      'MDS_STYLIST_RESTYLE_THEME_START'
    );
  });

  it('respects overwrite write-policy for adapter targets', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-overwrite-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(path.join(projectPath, 'global.css'), '/* existing content */\n', 'utf8');

    await runStylistSyncCommand({
      path: projectPath,
      styleLibrary: 'nativewind',
      writePolicy: 'overwrite',
    });

    const css = await readFile(path.join(projectPath, 'global.css'), 'utf8');
    expect(css).toContain('@tailwind base;');
    expect(css).toContain('MDS_STYLIST_THEME_START');
    expect(css).not.toContain('existing content');
  });

  it('writes adapter outputs for each supported style library', async () => {
    const libraries: Array<{ library: string; outputPath: string; marker: string }> = [
      { library: 'uniwind', outputPath: 'global.css', marker: 'MDS_STYLIST_THEME_START' },
      { library: 'nativewind', outputPath: 'global.css', marker: 'MDS_STYLIST_THEME_START' },
      { library: 'nativewindui', outputPath: 'global.css', marker: 'MDS_STYLIST_NATIVEWINDUI_THEME_START' },
      { library: 'unistyles', outputPath: 'theme.ts', marker: 'MDS_STYLIST_UNISTYLES_THEME_START' },
      { library: 'restyle', outputPath: 'theme.ts', marker: 'MDS_STYLIST_RESTYLE_THEME_START' },
      { library: 'tamagui', outputPath: 'tamagui.tokens.ts', marker: 'MDS_STYLIST_TAMAGUI_THEME_START' },
      { library: 'stylesheet', outputPath: 'src/theme/tokens.ts', marker: 'stylistThemeTokens' },
    ] as const;

    for (const item of libraries) {
      const projectPath = await mkdtemp(path.join(os.tmpdir(), `mds-stylist-lib-${item.library}-`));
      tempDirs.push(projectPath);
      await runStylistSyncCommand({
        path: projectPath,
        styleLibrary: item.library as
          | 'uniwind'
          | 'nativewind'
          | 'nativewindui'
          | 'unistyles'
          | 'restyle'
          | 'tamagui'
          | 'stylesheet',
      });
      await expect(readFile(path.join(projectPath, item.outputPath), 'utf8')).resolves.toContain(item.marker);
    }
  });

  it('forces app.json web.output to server when stylist sync API route exists', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-output-server-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'app', 'exposition'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Info\n\n## Platforms\n\n- Web output: static\n',
      'utf8'
    );
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'), 'export {};', 'utf8');
    await writeFile(
      path.join(projectPath, 'app.json'),
      JSON.stringify({
        expo: {
          web: {
            output: 'static',
          },
        },
      }),
      'utf8'
    );

    await runStylistReconcileOutputCommand({ path: projectPath });

    const appJson = JSON.parse(await readFile(path.join(projectPath, 'app.json'), 'utf8')) as {
      expo: { web: { output: string } };
    };
    expect(appJson.expo.web.output).toBe('server');
  });

  it('restores preferred static output after stylist sync API route is removed', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-output-static-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Info\n\n## Platforms\n\n- Web output: static\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'app.json'),
      JSON.stringify({
        expo: {
          web: {
            output: 'server',
          },
        },
      }),
      'utf8'
    );

    await runStylistReconcileOutputCommand({ path: projectPath });

    const appJson = JSON.parse(await readFile(path.join(projectPath, 'app.json'), 'utf8')) as {
      expo: { web: { output: string } };
    };
    expect(appJson.expo.web.output).toBe('static');
  });
});

describe('runStylistEjectCommand', () => {
  it('syncs then removes stylist artifacts and restores app settings', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-eject-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'home'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'app', 'exposition'), { recursive: true });
    await writeFile(path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'), 'export {};', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'exposition', 'embedded-fonts.ts'), 'export {};', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist.tsx'), 'export {};', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'), 'export {};', 'utf8');
    await writeFile(
      path.join(projectPath, 'src', 'app', '_layout.tsx'),
      '<Stack.Screen name="exposition/stylist" options={{ title: "Stylist" }} />\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'),
      "const links=[{href:'/exposition/stylist'}];\n",
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Info\n\n## Platforms\n\n- Target platforms: web, ios, android\n- Web output: static\n\n- Review styling in the Stylist page\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        dependencies: {
          'reanimated-color-picker': '^4.2.0',
          uniwind: '^1.6.4',
        },
        scripts: {
          'mds:stylist:sync': 'mds stylist sync .',
          'mds:stylist:reconcile-output': 'mds stylist reconcile-output .',
        },
      }),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'stylist.config.json'),
      JSON.stringify({ styleLibrary: 'uniwind', writePolicy: 'managed' }, null, 2),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'app.json'),
      JSON.stringify({
        expo: {
          web: { output: 'server' },
        },
      }),
      'utf8'
    );

    await runStylistEjectCommand({ path: projectPath, styleLibrary: 'uniwind' });

    await expect(readFile(path.join(projectPath, 'project', 'theme.json'), 'utf8')).resolves.toContain(
      '"version": 1'
    );
    await expect(access(path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'))).rejects.toThrow();
    const packageJson = JSON.parse(await readFile(path.join(projectPath, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      scripts: Record<string, string>;
    };
    expect(packageJson.dependencies['reanimated-color-picker']).toBeUndefined();
    expect(packageJson.scripts['mds:stylist:sync']).toBeUndefined();
    expect(packageJson.scripts['mds:stylist:reconcile-output']).toBeUndefined();
    const appJson = JSON.parse(await readFile(path.join(projectPath, 'app.json'), 'utf8')) as {
      expo: { web: { output: string }; platforms: string[] };
    };
    expect(appJson.expo.web.output).toBe('static');
    expect(appJson.expo.platforms).toEqual(['web', 'ios', 'android']);
    await expect(access(path.join(projectPath, 'project', 'stylist.config.json'))).rejects.toThrow();
    const info = await readFile(path.join(projectPath, 'project', 'info.md'), 'utf8');
    expect(info.toLowerCase()).not.toContain('stylist');
  });

  it('maps TV targets from project info back to Expo-supported app platforms', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-eject-tv-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'home'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'app', 'exposition'), { recursive: true });
    await writeFile(path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'), 'export {};', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'exposition', 'embedded-fonts.ts'), 'export {};', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist.tsx'), 'export {};', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'), 'export {};', 'utf8');
    await writeFile(
      path.join(projectPath, 'src', 'app', '_layout.tsx'),
      '<Stack.Screen name="exposition/stylist" options={{ title: "Stylist" }} />\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'),
      "const links=[{href:'/exposition/stylist'}];\n",
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Info\n\n## Platforms\n\n- Target platforms: web, ios, android, apple-tv, android-tv\n- Web output: static\n\n- Review styling in the Stylist page\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        dependencies: {
          'reanimated-color-picker': '^4.2.0',
          uniwind: '^1.6.4',
        },
        scripts: {
          'mds:stylist:sync': 'mds stylist sync .',
          'mds:stylist:reconcile-output': 'mds stylist reconcile-output .',
        },
      }),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'stylist.config.json'),
      JSON.stringify({ styleLibrary: 'uniwind', writePolicy: 'managed' }, null, 2),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'app.json'),
      JSON.stringify({
        expo: {
          web: { output: 'server' },
          platforms: ['web', 'ios', 'android', 'apple-tv', 'android-tv'],
        },
      }),
      'utf8'
    );

    await runStylistEjectCommand({ path: projectPath, styleLibrary: 'uniwind' });

    const appJson = JSON.parse(await readFile(path.join(projectPath, 'app.json'), 'utf8')) as {
      expo: { platforms: string[] };
    };
    expect(appJson.expo.platforms).toEqual(['web', 'ios', 'android']);
  });

  it('removes temporary web platform after ejecting stylist from native-only projects', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-stylist-eject-native-web-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'home'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'app', 'exposition'), { recursive: true });
    await writeFile(path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'), 'export {};', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'exposition', 'embedded-fonts.ts'), 'export {};', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist.tsx'), 'export {};', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'), 'export {};', 'utf8');
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Info\n\n## Platforms\n\n- Target platforms: ios, android\n- Web output: none\n\n- Review styling in the Stylist page\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        dependencies: {
          'reanimated-color-picker': '^4.2.0',
          uniwind: '^1.6.4',
        },
        scripts: {
          'mds:stylist:sync': 'mds stylist sync .',
        },
      }),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'stylist.config.json'),
      JSON.stringify({ styleLibrary: 'uniwind', writePolicy: 'managed' }, null, 2),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'app.json'),
      JSON.stringify({
        expo: {
          web: { output: 'server' },
          platforms: ['ios', 'android', 'web'],
        },
      }),
      'utf8'
    );

    await runStylistEjectCommand({ path: projectPath, styleLibrary: 'uniwind' });

    const appJson = JSON.parse(await readFile(path.join(projectPath, 'app.json'), 'utf8')) as {
      expo: { platforms: string[]; web: { output: string } };
    };
    expect(appJson.expo.platforms).toEqual(['ios', 'android']);
    expect(appJson.expo.web.output).toBe('static');
  });
});
