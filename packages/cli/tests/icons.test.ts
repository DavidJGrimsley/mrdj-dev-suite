import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PNG } from 'pngjs';
import { afterEach, describe, expect, it } from 'vitest';

import { syncIconAssets } from '../src/commands/icons.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function createProject(): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-icons-'));
  tempDirs.push(projectPath);
  await mkdir(path.join(projectPath, 'assets', 'branding'), {
    recursive: true,
  });
  await mkdir(path.join(projectPath, 'project'), { recursive: true });
  await writeSolidPng(
    path.join(projectPath, 'assets', 'branding', 'icon-1024.png'),
    1024,
    1024,
    [29, 78, 216, 255]
  );
  return projectPath;
}

async function writeSolidPng(
  filePath: string,
  width: number,
  height: number,
  color: [number, number, number, number]
): Promise<void> {
  const image = new PNG({ width, height });
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data[offset] = color[0];
    image.data[offset + 1] = color[1];
    image.data[offset + 2] = color[2];
    image.data[offset + 3] = color[3];
  }
  await writeFile(filePath, PNG.sync.write(image));
}

async function writeConfig(projectPath: string, adaptiveIcon: unknown = null): Promise<void> {
  await writeFile(
    path.join(projectPath, 'project', 'icon-release.json'),
    JSON.stringify({ masterIcon: 'assets/branding/icon-1024.png', adaptiveIcon }, null, 2),
    'utf8'
  );
}

async function createI2WorkspaceProject(): Promise<{ appPath: string; controlPath: string }> {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'mds-icons-i2-'));
  tempDirs.push(workspaceRoot);
  const appPath = path.join(workspaceRoot, 'PokePages-main');
  const controlPath = path.join(workspaceRoot, 'project');
  await mkdir(path.join(appPath, 'assets', 'branding'), { recursive: true });
  await mkdir(controlPath, { recursive: true });
  await writeSolidPng(
    path.join(appPath, 'assets', 'branding', 'icon-1024.png'),
    1024,
    1024,
    [29, 78, 216, 255]
  );
  await writeFile(
    path.join(controlPath, 'mds.workspace.json'),
    JSON.stringify({
      schemaVersion: 1,
      workspaceId: 'pokepages',
      name: 'PokePages',
      repositories: [
        {
          id: 'source',
          remote: 'https://github.com/example/PokePages.git',
          defaultBranch: 'main',
          mainFolder: 'PokePages-main',
          worktreePrefix: 'PokePages-',
        },
      ],
      project: { path: 'project' },
    })
  );
  return { appPath, controlPath };
}

async function writeWorkspaceConfig(controlPath: string, adaptiveIcon: unknown = null): Promise<void> {
  await writeFile(
    path.join(controlPath, 'icon-release.json'),
    JSON.stringify({ masterIcon: 'assets/branding/icon-1024.png', adaptiveIcon }, null, 2),
    'utf8'
  );
}

async function createSmartUtilifyPackage(appPath: string): Promise<string> {
  const packagePath = path.join(appPath, 'smartutilifyIconDownload');
  await mkdir(path.join(packagePath, 'ios'), { recursive: true });
  await mkdir(path.join(packagePath, 'web'), { recursive: true });
  await mkdir(path.join(packagePath, 'pwa'), { recursive: true });
  await writeSolidPng(
    path.join(packagePath, 'ios', 'AppIcon-1024x1024.png'),
    1024,
    1024,
    [10, 100, 200, 255]
  );
  await writeSolidPng(path.join(packagePath, 'web', 'favicon-48x48.png'), 48, 48, [1, 2, 3, 255]);
  await writeSolidPng(path.join(packagePath, 'web', 'favicon-32x32.png'), 32, 32, [4, 5, 6, 255]);
  await writeSolidPng(path.join(packagePath, 'pwa', 'pwa-192x192.png'), 192, 192, [7, 8, 9, 255]);
  await writeFile(path.join(packagePath, 'web', 'favicon.ico'), Buffer.from('favicon-ico'));
  await writeFile(path.join(packagePath, 'web', 'README.txt'), 'Do not publish this.');
  await writeFile(path.join(packagePath, 'pwa', 'README.txt'), 'Do not publish this.');
  return packagePath;
}

describe('syncIconAssets', () => {
  it('creates the baseline Expo icon assets and fills missing static app config fields', async () => {
    const projectPath = await createProject();
    await writeConfig(projectPath);
    await writeFile(
      path.join(projectPath, 'app.json'),
      JSON.stringify({ expo: { name: 'Icon App' } })
    );

    const result = await syncIconAssets(projectPath);

    expect(result.appConfigStatus).toBe('updated');
    await expect(
      access(path.join(projectPath, 'assets', 'images', 'icon.png'))
    ).resolves.toBeUndefined();
    const favicon = PNG.sync.read(
      await readFile(path.join(projectPath, 'assets', 'images', 'favicon.png'))
    );
    expect(favicon.width).toBe(48);
    expect(favicon.height).toBe(48);

    const appJson = JSON.parse(await readFile(path.join(projectPath, 'app.json'), 'utf8')) as {
      expo: { icon: string; web: { favicon: string } };
    };
    expect(appJson.expo.icon).toBe('./assets/images/icon.png');
    expect(appJson.expo.web.favicon).toBe('./assets/images/favicon.png');
  });

  it('uses sibling i² project settings while keeping icon files in the app repository', async () => {
    const { appPath, controlPath } = await createI2WorkspaceProject();
    await writeWorkspaceConfig(controlPath);
    await writeFile(
      path.join(appPath, 'app.json'),
      JSON.stringify({ expo: { name: 'PokePages' } })
    );

    const result = await syncIconAssets(appPath);

    expect(result.configPath).toBe(path.join(controlPath, 'icon-release.json'));
    await expect(
      access(path.join(appPath, 'assets', 'images', 'icon.png'))
    ).resolves.toBeUndefined();
    await expect(
      access(path.join(controlPath, 'assets', 'images', 'icon.png'))
    ).rejects.toThrow();
  });

  it('imports a SmartUtilify-style package into configured Expo and web locations', async () => {
    const { appPath, controlPath } = await createI2WorkspaceProject();
    const packagePath = await createSmartUtilifyPackage(appPath);
    await writeFile(
      path.join(controlPath, 'icon-release.json'),
      JSON.stringify(
        {
          package: {
            directory: 'smartutilifyIconDownload',
            publicIconDirectories: ['public/icons', 'public/images/icons'],
            faviconIcoOutput: 'public/favicon.ico',
          },
          outputs: {
            icon: 'assets/icons/icon.png',
            favicon: 'assets/icons/favicon.png',
          },
          adaptiveIcon: null,
        },
        null,
        2
      )
    );
    await writeFile(path.join(appPath, 'app.json'), JSON.stringify({ expo: { name: 'PokePages' } }));

    const result = await syncIconAssets(appPath);

    await expect(
      access(path.join(appPath, 'assets', 'icons', 'icon.png'))
    ).resolves.toBeUndefined();
    await expect(
      access(path.join(appPath, 'assets', 'icons', 'favicon.png'))
    ).resolves.toBeUndefined();
    await expect(
      access(path.join(appPath, 'public', 'icons', 'pwa-192x192.png'))
    ).resolves.toBeUndefined();
    await expect(
      access(path.join(appPath, 'public', 'images', 'icons', 'favicon-32x32.png'))
    ).resolves.toBeUndefined();
    await expect(access(path.join(appPath, 'public', 'favicon.ico'))).resolves.toBeUndefined();
    await expect(access(path.join(appPath, 'public', 'icons', 'README.txt'))).rejects.toThrow();
    expect(await readFile(path.join(appPath, 'assets', 'icons', 'icon.png'))).toEqual(
      await readFile(path.join(packagePath, 'ios', 'AppIcon-1024x1024.png'))
    );
    expect(await readFile(path.join(appPath, 'assets', 'icons', 'favicon.png'))).toEqual(
      await readFile(path.join(packagePath, 'web', 'favicon-48x48.png'))
    );
    expect(result.outputPaths).toContain(path.join(appPath, 'public', 'favicon.ico'));

    const appJson = JSON.parse(await readFile(path.join(appPath, 'app.json'), 'utf8')) as {
      expo: { icon: string; web: { favicon: string } };
    };
    expect(appJson.expo.icon).toBe('./assets/icons/icon.png');
    expect(appJson.expo.web.favicon).toBe('./assets/icons/favicon.png');
  });

  it('copies dedicated Android adaptive layers without replacing existing icon references', async () => {
    const projectPath = await createProject();
    const brandingPath = path.join(projectPath, 'assets', 'branding');
    await writeSolidPng(
      path.join(brandingPath, 'adaptive-foreground.png'),
      1024,
      1024,
      [255, 255, 255, 255]
    );
    await writeSolidPng(
      path.join(brandingPath, 'adaptive-monochrome.png'),
      1024,
      1024,
      [0, 0, 0, 255]
    );
    await writeConfig(projectPath, {
      foreground: 'assets/branding/adaptive-foreground.png',
      monochrome: 'assets/branding/adaptive-monochrome.png',
      backgroundColor: '#112233',
    });
    await writeFile(
      path.join(projectPath, 'app.json'),
      JSON.stringify({
        expo: {
          icon: './assets/custom-icon.png',
          web: { favicon: './assets/custom-favicon.png' },
        },
      })
    );

    const result = await syncIconAssets(projectPath);

    expect(result.appConfigStatus).toBe('updated');
    await expect(
      access(path.join(projectPath, 'assets', 'images', 'adaptive-icon.png'))
    ).resolves.toBeUndefined();
    await expect(
      access(path.join(projectPath, 'assets', 'images', 'adaptive-icon-monochrome.png'))
    ).resolves.toBeUndefined();
    const appJson = JSON.parse(await readFile(path.join(projectPath, 'app.json'), 'utf8')) as {
      expo: {
        icon: string;
        web: { favicon: string };
        android: { adaptiveIcon: Record<string, string> };
      };
    };
    expect(appJson.expo.icon).toBe('./assets/custom-icon.png');
    expect(appJson.expo.web.favicon).toBe('./assets/custom-favicon.png');
    expect(appJson.expo.android.adaptiveIcon).toEqual({
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#112233',
      monochromeImage: './assets/images/adaptive-icon-monochrome.png',
    });
  });

  it('rejects an invalid master before writing generated outputs', async () => {
    const projectPath = await createProject();
    await writeSolidPng(
      path.join(projectPath, 'assets', 'branding', 'icon-1024.png'),
      1023,
      1024,
      [255, 255, 255, 255]
    );
    await writeConfig(projectPath);

    await expect(syncIconAssets(projectPath)).rejects.toThrow('exactly 1024x1024');
    await expect(access(path.join(projectPath, 'assets', 'images', 'icon.png'))).rejects.toThrow();
  });

  it('does not edit dynamic Expo config', async () => {
    const projectPath = await createProject();
    await writeConfig(projectPath);
    await writeFile(path.join(projectPath, 'app.config.ts'), 'export default {};\n', 'utf8');

    const result = await syncIconAssets(projectPath);

    expect(result.appConfigStatus).toBe('dynamic');
    await expect(
      access(path.join(projectPath, 'assets', 'images', 'icon.png'))
    ).resolves.toBeUndefined();
  });
});
