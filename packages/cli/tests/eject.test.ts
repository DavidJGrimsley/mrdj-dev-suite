import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runEjectExpositionCommand } from '../src/commands/eject.js';
import { runStylistEjectCommand } from '../src/commands/stylist.js';
import {
  SDK_56_SPLASH_DARK_IMAGE,
  SDK_56_SPLASH_LIGHT_IMAGE,
} from '../src/project-memory.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('runEjectExpositionCommand', () => {
  it('requires --keep or --all in non-interactive mode', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-eject-flags-'));
    tempDirs.push(projectPath);

    await expect(runEjectExpositionCommand({ path: projectPath })).rejects.toThrow(
      'Non-interactive mode requires --keep or --all'
    );
  });

  it('keeps only selected sections and removes other generated artifacts', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-eject-selective-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'onboarding', 'components'), {
      recursive: true,
    });
    await mkdir(path.join(projectPath, 'src', 'features', 'settings'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'home'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'components', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'app', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'data'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'services'), { recursive: true });

    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-config.ts'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'welcome-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'features-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'preferences-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'complete-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'legal-review-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'agreement-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'terms-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'account-setup-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'legal-documents.ts'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'components', 'legal-document-view.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'settings', 'settings-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'components', 'exposition', 'notice.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'data', 'mock-app.ts'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'services', 'local-data.ts'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'services', 'local-data.native.ts'), 'export {};\n', 'utf8');

    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding.tsx'), 'export {};\n', 'utf8');
    await mkdir(path.join(projectPath, 'src', 'app', 'onboarding'), { recursive: true });
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'agreement.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'terms.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'account-setup.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'features.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'preferences.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'complete.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'legal.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'settings.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'data.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'), 'export {};\n', 'utf8');

    await writeFile(
      path.join(projectPath, 'src', 'app', '_layout.tsx'),
      [
        '<Stack.Screen name="onboarding" />',
        '<Stack.Screen name="onboarding/features" />',
        '<Stack.Screen name="onboarding/preferences" />',
        '<Stack.Screen name="onboarding/complete" />',
        '<Stack.Screen name="onboarding/legal" />',
        '<Stack.Screen name="settings" />',
        '<Stack.Screen name="exposition/stylist" />',
        '<Stack.Screen name="exposition/data" />',
        '<Stack.Screen name="exposition/sdk-56" />',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'),
      [
        "{ href: '/exposition/stylist' as const, title: 'Stylist' },",
        "{ href: '/exposition/data' as const, title: 'Data' },",
        "{ href: '/exposition/sdk-56' as const, title: 'SDK' },",
        '<Link href="/onboarding" asChild>',
        '</Link>',
        '<Link href="/settings" asChild>',
        '</Link>',
        '',
      ].join('\n'),
      'utf8'
    );

    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Info\n\n## Platforms\n\n- Target platforms: web, ios, android\n- Web output: static\n',
      'utf8'
    );
    await writeFile(path.join(projectPath, 'project', 'theme.json'), '{"version":1,"colorSystem":{"mode":"automatic","previewScheme":"light","familyMode":"one"},"families":{"light":{"primary":"blue","secondary":"violet","success":"emerald","warning":"amber"},"dark":{"primary":"blue","secondary":"violet","success":"emerald","warning":"amber"}},"palettes":{"bg":{"light":{"background":"#ffffff","surface":"#f3f4f6","text":"#111827","primary":"#2563eb","secondary":"#7c3aed","success":"#16a34a","warning":"#f59e0b"},"dark":{"background":"#0f172a","surface":"#1f2937","text":"#f8fafc","primary":"#60a5fa","secondary":"#a78bfa","success":"#4ade80","warning":"#fbbf24"}},"automatic":{"light":{"background":"#ffffff","surface":"#f3f4f6","text":"#111827","primary":"#2563eb","secondary":"#7c3aed","success":"#16a34a","warning":"#f59e0b"},"dark":{"background":"#0f172a","surface":"#1f2937","text":"#f8fafc","primary":"#60a5fa","secondary":"#a78bfa","success":"#4ade80","warning":"#fbbf24"}}},"colors":{"light":{"background":"#ffffff","surface":"#f3f4f6","text":"#111827","primary":"#2563eb","secondary":"#7c3aed","success":"#16a34a","warning":"#f59e0b"},"dark":{"background":"#0f172a","surface":"#1f2937","text":"#f8fafc","primary":"#60a5fa","secondary":"#a78bfa","success":"#4ade80","warning":"#fbbf24"}},"typography":{"fontFamily":"System","displaySize":34,"headingSize":22,"bodySize":16,"captionSize":12},"layout":{"radius":12,"spacing":{"xs":4,"sm":8,"md":16,"lg":24,"xl":32}}}\n', 'utf8');
    await writeFile(path.join(projectPath, 'app.json'), JSON.stringify({ expo: { web: { output: 'server' } } }), 'utf8');
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({ dependencies: { 'reanimated-color-picker': '^4.2.0' }, scripts: { 'mds:stylist:sync': 'mds stylist sync .' } }),
      'utf8'
    );

    await runEjectExpositionCommand({ path: projectPath, keep: 'onboarding,settings' });

    await expect(access(path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-screen.tsx'))).resolves.toBeUndefined();
    await expect(access(path.join(projectPath, 'src', 'features', 'onboarding', 'welcome-screen.tsx'))).resolves.toBeUndefined();
    await expect(access(path.join(projectPath, 'src', 'app', 'onboarding', 'features.tsx'))).resolves.toBeUndefined();
    await expect(access(path.join(projectPath, 'src', 'app', 'onboarding', 'preferences.tsx'))).resolves.toBeUndefined();
    await expect(access(path.join(projectPath, 'src', 'features', 'settings', 'settings-screen.tsx'))).resolves.toBeUndefined();
    await expect(access(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'data', 'mock-app.ts'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'services', 'local-data.ts'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'services', 'local-data.native.ts'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'))).rejects.toThrow();

    const layout = await readFile(path.join(projectPath, 'src', 'app', '_layout.tsx'), 'utf8');
    expect(layout).toContain('name="onboarding"');
    expect(layout).toContain('name="onboarding/features"');
    expect(layout).toContain('name="settings"');
    expect(layout).not.toContain('name="exposition/data"');
    expect(layout).not.toContain('name="exposition/stylist"');
  });

  it('auto-skips stylist keep option when stylist artifacts are absent', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-eject-no-stylist-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'src', 'features', 'home'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'),
      "{ href: '/exposition/stylist' as const, title: 'Stylist' },\n",
      'utf8'
    );

    await runEjectExpositionCommand({ path: projectPath, keep: 'stylist' });

    const home = await readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8');
    expect(home).not.toContain('/exposition/stylist');
  });

  it('removes production onboarding files and legacy preview leftovers when onboarding is not kept', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-eject-onboarding-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'src', 'features', 'onboarding', 'components'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'home'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'app', 'onboarding'), { recursive: true });

    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-config.ts'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'welcome-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'features-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'preferences-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'complete-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'account-setup-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'components', 'legal-document-view.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'features.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'preferences.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'complete.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'account-setup.tsx'), 'export {};\n', 'utf8');
    await writeFile(
      path.join(projectPath, 'src', 'app', '_layout.tsx'),
      [
        '<Stack.Screen name="onboarding" />',
        '<Stack.Screen name="onboarding/features" />',
        '<Stack.Screen name="onboarding/preferences" />',
        '<Stack.Screen name="onboarding/complete" />',
        '<Stack.Screen name="onboarding/account-setup" />',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'),
      '<Link href="/onboarding" asChild>\n</Link>\n',
      'utf8'
    );

    await runEjectExpositionCommand({ path: projectPath, all: true });

    await expect(access(path.join(projectPath, 'src', 'features', 'onboarding', 'welcome-screen.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'features', 'onboarding', 'features-screen.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-screen.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'app', 'onboarding', 'features.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'app', 'onboarding', 'preferences.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'app', 'onboarding', 'account-setup.tsx'))).rejects.toThrow();
    const layout = await readFile(path.join(projectPath, 'src', 'app', '_layout.tsx'), 'utf8');
    expect(layout).not.toContain('name="onboarding"');
    const home = await readFile(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), 'utf8');
    expect(home).not.toContain('/onboarding');
  });

  it('keeps settings dependencies and removes root-level exposition files', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-eject-root-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'components', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'components', 'swmansion'), { recursive: true });
    await mkdir(path.join(projectPath, 'features', 'settings'), { recursive: true });
    await mkdir(path.join(projectPath, 'features', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'app', 'exposition'), { recursive: true });
    await writeFile(path.join(projectPath, 'components', 'swmansion', 'keyboard-form.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'components', 'swmansion', 'animated-pressable.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'features', 'settings', 'settings-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'features', 'exposition', 'stylist-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'app', 'settings.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'app', 'exposition', 'stylist.tsx'), 'export {};\n', 'utf8');

    await runEjectExpositionCommand({ path: projectPath, keep: 'settings' });

    await expect(access(path.join(projectPath, 'features', 'settings', 'settings-screen.tsx'))).resolves.toBeUndefined();
    await expect(access(path.join(projectPath, 'components', 'swmansion', 'keyboard-form.tsx'))).resolves.toBeUndefined();
    await expect(access(path.join(projectPath, 'components', 'swmansion', 'animated-pressable.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'features', 'exposition', 'stylist-screen.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'app', 'exposition', 'stylist.tsx'))).rejects.toThrow();
  });

  it('removes NativeWindUI routes and screen but keeps shared primitives', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-eject-nativewindui-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'src', 'app', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'components', 'nativewindui'), { recursive: true });
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'nativewindui.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'features', 'exposition', 'nativewindui-screen.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'components', 'nativewindui', 'Button.tsx'), 'export {};\n', 'utf8');

    await runEjectExpositionCommand({ path: projectPath, all: true });

    await expect(access(path.join(projectPath, 'src', 'app', 'exposition', 'nativewindui.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'features', 'exposition', 'nativewindui-screen.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'components', 'nativewindui', 'Button.tsx'))).resolves.toBeUndefined();
  });

  it('preserves system appearance splash config and theme provider through exposition ejection', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-eject-appearance-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'app'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'theme'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'home'), { recursive: true });
    await mkdir(path.join(projectPath, 'assets', 'images'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'app', 'exposition'), { recursive: true });

    const splashPlugin = [
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff',
        image: SDK_56_SPLASH_LIGHT_IMAGE,
        dark: {
          image: SDK_56_SPLASH_DARK_IMAGE,
          backgroundColor: '#000000',
        },
        imageWidth: 200,
      },
    ];
    await writeFile(
      path.join(projectPath, 'app.json'),
      JSON.stringify({
        expo: {
          userInterfaceStyle: 'automatic',
          web: { output: 'server' },
          plugins: ['expo-router', splashPlugin],
        },
      }),
      'utf8'
    );
    await writeFile(path.join(projectPath, 'assets', 'images', 'splash-icon.png'), 'light-splash', 'utf8');
    await writeFile(
      path.join(projectPath, 'assets', 'images', 'splash-icon-dark.png'),
      'dark-splash',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'theme', 'provider.tsx'),
      [
        "import { Appearance, useColorScheme } from 'react-native';",
        "export function readSystemScheme() { return Appearance.getColorScheme(); }",
        'export function AppThemeProvider({ children }: { children: unknown }) { return children; }',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'app', '_layout.tsx'),
      [
        "import { AppThemeProvider, useAppTheme } from '../theme/provider';",
        'export default function Layout() {',
        '  return (',
        '    <AppThemeProvider>',
        '      <LayoutInner />',
        '    </AppThemeProvider>',
        '  );',
        '}',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'),
      "const links = [{ href: '/exposition/stylist' as const, title: 'Stylist' }];\n",
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
      'export {};\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'),
      'export {};\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Info\n\n## Platforms\n\n- Target platforms: web, ios, android\n- Web output: static\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'theme.json'),
      '{"version":1,"colorSystem":{"mode":"automatic","previewScheme":"light","familyMode":"one"},"families":{"light":{"primary":"blue","secondary":"violet","success":"emerald","warning":"amber"},"dark":{"primary":"blue","secondary":"violet","success":"emerald","warning":"amber"}},"palettes":{"bg":{"light":{"background":"#ffffff","surface":"#f3f4f6","text":"#111827","primary":"#2563eb","secondary":"#7c3aed","success":"#16a34a","warning":"#f59e0b"},"dark":{"background":"#0f172a","surface":"#1f2937","text":"#f8fafc","primary":"#60a5fa","secondary":"#a78bfa","success":"#4ade80","warning":"#fbbf24"}},"automatic":{"light":{"background":"#ffffff","surface":"#f3f4f6","text":"#111827","primary":"#2563eb","secondary":"#7c3aed","success":"#16a34a","warning":"#f59e0b"},"dark":{"background":"#0f172a","surface":"#1f2937","text":"#f8fafc","primary":"#60a5fa","secondary":"#a78bfa","success":"#4ade80","warning":"#fbbf24"}}},"colors":{"light":{"background":"#ffffff","surface":"#f3f4f6","text":"#111827","primary":"#2563eb","secondary":"#7c3aed","success":"#16a34a","warning":"#f59e0b"},"dark":{"background":"#0f172a","surface":"#1f2937","text":"#f8fafc","primary":"#60a5fa","secondary":"#a78bfa","success":"#4ade80","warning":"#fbbf24"}},"typography":{"fontFamily":"System","displaySize":34,"headingSize":22,"bodySize":16,"captionSize":12},"layout":{"radius":12,"spacing":{"xs":4,"sm":8,"md":16,"lg":24,"xl":32}}}\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        dependencies: { 'reanimated-color-picker': '^4.2.0', 'expo-splash-screen': '~56.0.14' },
        scripts: { 'mds:stylist:sync': 'mds stylist sync .' },
      }),
      'utf8'
    );

    await runEjectExpositionCommand({ path: projectPath, all: true });

    const appJson = JSON.parse(await readFile(path.join(projectPath, 'app.json'), 'utf8')) as {
      expo: { userInterfaceStyle?: string; plugins?: unknown[] };
    };
    expect(appJson.expo.userInterfaceStyle).toBe('automatic');
    expect(appJson.expo.plugins).toContainEqual(splashPlugin);
    await expect(readFile(path.join(projectPath, 'assets', 'images', 'splash-icon.png'), 'utf8')).resolves.toBe(
      'light-splash'
    );
    await expect(
      readFile(path.join(projectPath, 'assets', 'images', 'splash-icon-dark.png'), 'utf8')
    ).resolves.toBe('dark-splash');
    const layout = await readFile(path.join(projectPath, 'src', 'app', '_layout.tsx'), 'utf8');
    expect(layout).toContain('AppThemeProvider');
    expect(layout).toContain('../theme/provider');
    const provider = await readFile(path.join(projectPath, 'src', 'theme', 'provider.tsx'), 'utf8');
    expect(provider).toContain('Appearance.getColorScheme()');
    expect(provider).toContain('AppThemeProvider');
  });

  it('preserves system appearance splash config and theme provider through stylist ejection', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-eject-stylist-appearance-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'src', 'app', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'theme'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'exposition'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'home'), { recursive: true });
    await mkdir(path.join(projectPath, 'assets', 'images'), { recursive: true });
    await mkdir(path.join(projectPath, 'project'), { recursive: true });

    const splashPlugin = [
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff',
        image: SDK_56_SPLASH_LIGHT_IMAGE,
        dark: {
          image: SDK_56_SPLASH_DARK_IMAGE,
          backgroundColor: '#000000',
        },
        imageWidth: 200,
      },
    ];
    await writeFile(
      path.join(projectPath, 'app.json'),
      JSON.stringify({
        expo: {
          userInterfaceStyle: 'automatic',
          web: { output: 'server' },
          plugins: ['expo-router', splashPlugin],
        },
      }),
      'utf8'
    );
    await writeFile(path.join(projectPath, 'assets', 'images', 'splash-icon.png'), 'light-splash', 'utf8');
    await writeFile(
      path.join(projectPath, 'assets', 'images', 'splash-icon-dark.png'),
      'dark-splash',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'theme', 'provider.tsx'),
      [
        "import { Appearance } from 'react-native';",
        "export function readSystemScheme() { return Appearance.getColorScheme(); }",
        'export function AppThemeProvider({ children }: { children: unknown }) { return children; }',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'app', '_layout.tsx'),
      [
        "import { AppThemeProvider } from '../theme/provider';",
        '<Stack.Screen name="exposition/stylist" />',
        'export default function Layout() {',
        '  return <AppThemeProvider><LayoutInner /></AppThemeProvider>;',
        '}',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'),
      "{ href: '/exposition/stylist' as const, title: 'Stylist' },\n",
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
      'export {};\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'),
      'export {};\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Info\n\n## Platforms\n\n- Target platforms: web, ios, android\n- Web output: static\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'theme.json'),
      '{"version":1,"colorSystem":{"mode":"automatic","previewScheme":"light","familyMode":"one"},"families":{"light":{"primary":"blue","secondary":"violet","success":"emerald","warning":"amber"},"dark":{"primary":"blue","secondary":"violet","success":"emerald","warning":"amber"}},"palettes":{"bg":{"light":{"background":"#ffffff","surface":"#f3f4f6","text":"#111827","primary":"#2563eb","secondary":"#7c3aed","success":"#16a34a","warning":"#f59e0b"},"dark":{"background":"#0f172a","surface":"#1f2937","text":"#f8fafc","primary":"#60a5fa","secondary":"#a78bfa","success":"#4ade80","warning":"#fbbf24"}},"automatic":{"light":{"background":"#ffffff","surface":"#f3f4f6","text":"#111827","primary":"#2563eb","secondary":"#7c3aed","success":"#16a34a","warning":"#f59e0b"},"dark":{"background":"#0f172a","surface":"#1f2937","text":"#f8fafc","primary":"#60a5fa","secondary":"#a78bfa","success":"#4ade80","warning":"#fbbf24"}}},"colors":{"light":{"background":"#ffffff","surface":"#f3f4f6","text":"#111827","primary":"#2563eb","secondary":"#7c3aed","success":"#16a34a","warning":"#f59e0b"},"dark":{"background":"#0f172a","surface":"#1f2937","text":"#f8fafc","primary":"#60a5fa","secondary":"#a78bfa","success":"#4ade80","warning":"#fbbf24"}},"typography":{"fontFamily":"System","displaySize":34,"headingSize":22,"bodySize":16,"captionSize":12},"layout":{"radius":12,"spacing":{"xs":4,"sm":8,"md":16,"lg":24,"xl":32}}}\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        dependencies: { 'reanimated-color-picker': '^4.2.0', 'expo-splash-screen': '~56.0.14' },
        scripts: { 'mds:stylist:sync': 'mds stylist sync .' },
      }),
      'utf8'
    );

    await runStylistEjectCommand({ path: projectPath });

    const appJson = JSON.parse(await readFile(path.join(projectPath, 'app.json'), 'utf8')) as {
      expo: { userInterfaceStyle?: string; plugins?: unknown[] };
    };
    expect(appJson.expo.userInterfaceStyle).toBe('automatic');
    expect(appJson.expo.plugins).toContainEqual(splashPlugin);
    await expect(readFile(path.join(projectPath, 'assets', 'images', 'splash-icon.png'), 'utf8')).resolves.toBe(
      'light-splash'
    );
    await expect(
      readFile(path.join(projectPath, 'assets', 'images', 'splash-icon-dark.png'), 'utf8')
    ).resolves.toBe('dark-splash');
    const layout = await readFile(path.join(projectPath, 'src', 'app', '_layout.tsx'), 'utf8');
    expect(layout).toContain('AppThemeProvider');
    const provider = await readFile(path.join(projectPath, 'src', 'theme', 'provider.tsx'), 'utf8');
    expect(provider).toContain('Appearance.getColorScheme()');
  });
});
