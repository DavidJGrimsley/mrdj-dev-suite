import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runEjectExpositionCommand } from '../src/commands/eject.js';

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

    await writeFile(path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-screen.tsx'), 'export {};\n', 'utf8');
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

    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding.tsx'), 'export {};\n', 'utf8');
    await mkdir(path.join(projectPath, 'src', 'app', 'onboarding'), { recursive: true });
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'agreement.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'terms.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'onboarding', 'account-setup.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'settings.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'data.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist.tsx'), 'export {};\n', 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'), 'export {};\n', 'utf8');

    await writeFile(
      path.join(projectPath, 'src', 'app', '_layout.tsx'),
      [
        '<Stack.Screen name="onboarding" />',
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
    await expect(access(path.join(projectPath, 'src', 'features', 'settings', 'settings-screen.tsx'))).resolves.toBeUndefined();
    await expect(access(path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'))).rejects.toThrow();

    const layout = await readFile(path.join(projectPath, 'src', 'app', '_layout.tsx'), 'utf8');
    expect(layout).toContain('name="onboarding"');
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
});
