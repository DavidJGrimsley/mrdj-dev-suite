import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { checkRuntimeSecurity, scanFileRuntimeSecurity } from '../src/checks/runtime-security.js';
import { runDoctor } from '../src/index.js';

const tempDirs: string[] = [];
const STYLIST_CHECK = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../test-apps/StylistCheck'
);

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('runtime security', () => {
  it('errors when a client route imports prisma or express', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      `import { PrismaClient } from '@prisma/client';\nimport express from 'express';\nexport default function Home() { return PrismaClient && express; }\n`
    );

    const result = await checkRuntimeSecurity(projectPath);
    const details = JSON.stringify(result.details);

    expect(result.status).toBe('error');
    expect(details).toContain('@prisma/client');
    expect(details).toContain('express');
    expect(details).toContain('server-package-on-client');
  });

  it('allows database clients inside Expo Router API routes', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/app/api/pay+api.ts',
      `import { drizzle } from 'drizzle-orm';\nexport function GET() { return Response.json({ drizzle }); }\n`
    );

    const result = await checkRuntimeSecurity(projectPath);
    expect(result.status).toBe('pass');
  });

  it('errors when a client file imports a .server module or a use server module', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/server-actions.ts',
      `'use server';\nexport async function save() { return 1; }\n`
    );
    await writeSource(projectPath, 'src/db.server.ts', `export const db = {};\n`);
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      `import { save } from '../server-actions';\nimport { db } from '../db.server';\nexport default function Home() { return { save, db }; }\n`
    );

    const result = await checkRuntimeSecurity(projectPath);
    const details = JSON.stringify(result.details);

    expect(result.status).toBe('error');
    expect(details).toContain('server-module-on-client');
  });

  it('does not flag Express/OpenAI usage in colocated Node API folders', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/routes/profiles/index.ts',
      `import express from 'express';\nexport const router = express.Router();\nexport const key = process.env.OPENAI_API_KEY;\n`
    );
    await writeSource(
      projectPath,
      'src/utils/contentModeration.ts',
      `export const key = process.env.OPENAI_API_KEY;\n`
    );

    const result = await checkRuntimeSecurity(projectPath);
    expect(result.status).toBe('pass');
  });

  it('does not flag drizzle usage inside a database or api-server folder', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/database/hosted/schema.ts',
      `import { pgTable } from 'drizzle-orm/pg-core';\nexport const users = pgTable;\n`
    );
    await writeSource(
      projectPath,
      'api-server/api-server.js',
      `import express from 'express';\nexport const app = express();\n`
    );

    const result = await checkRuntimeSecurity(projectPath);
    expect(result.status).toBe('pass');
  });

  it('still errors when a client route imports a database module', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/database/queries.ts',
      `import { drizzle } from 'drizzle-orm';\nexport const db = drizzle;\n`
    );
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      `import { db } from '../database/queries';\nexport default function Home() { return db; }\n`
    );

    const result = await checkRuntimeSecurity(projectPath);
    expect(result.status).toBe('error');
    expect(JSON.stringify(result.details)).toContain('server-module-on-client');
  });

  it('allows the Supabase client SDK on the client', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      `import { createClient } from '@supabase/supabase-js';\nexport const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);\n`
    );

    const result = await checkRuntimeSecurity(projectPath);
    expect(result.status).toBe('pass');
  });

  it('ignores server package names that only appear in comments', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      `// import { PrismaClient } from 'prisma'\nexport default function Home() { return null; }\n`
    );

    const result = await checkRuntimeSecurity(projectPath);
    expect(result.status).toBe('pass');
  });

  it('warns when Metro overwrites export conditions without a node target', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/app/api/health+api.ts',
      `export function GET() { return Response.json({ ok: true }); }\n`
    );
    await writeFile(
      path.join(projectPath, 'metro.config.js'),
      [
        "const { getDefaultConfig } = require('expo/metro-config');",
        'const config = getDefaultConfig(__dirname);',
        "config.resolver.unstable_conditionNames = ['require', 'react-native'];",
        'module.exports = config;',
        '',
      ].join('\n'),
      'utf8'
    );

    const result = await checkRuntimeSecurity(projectPath);
    expect(result.status).toBe('warn');
    expect(JSON.stringify(result.details)).toContain('metro-missing-node-condition');
  });

  it('passes stock expo/metro-config getDefaultConfig when API routes exist', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/app/api/health+api.ts',
      `export function GET() { return Response.json({ ok: true }); }\n`
    );
    await writeFile(
      path.join(projectPath, 'metro.config.js'),
      "const { getDefaultConfig } = require('expo/metro-config');\nconst config = getDefaultConfig(__dirname);\nmodule.exports = config;\n",
      'utf8'
    );

    const result = await checkRuntimeSecurity(projectPath);
    expect(result.status).toBe('pass');
  });

  it('errors on hardcoded Expo extra credentials without echoing the secret', async () => {
    const projectPath = await createExpoProject();
    const secretValue = 'sk_live_' + 'H'.repeat(24);
    await writeFile(
      path.join(projectPath, 'app.json'),
      JSON.stringify(
        {
          expo: {
            extra: {
              apiKey: secretValue,
            },
          },
        },
        null,
        2
      ) + '\n',
      'utf8'
    );

    const result = await checkRuntimeSecurity(projectPath);
    const details = JSON.stringify(result.details);

    expect(result.status).toBe('error');
    expect(details).toContain('expo-config-hardcoded-credential');
    expect(details).not.toContain(secretValue);
  });

  it('errors on private process.env access in client code', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      `export const key = process.env.SUPABASE_SERVICE_ROLE_KEY;\n`
    );

    const result = await checkRuntimeSecurity(projectPath);
    const details = JSON.stringify(result.details);

    expect(result.status).toBe('error');
    expect(details).toContain('client-process-env');
    expect(details).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('allows EXPO_PUBLIC_, EXPO_OS, and Jest env access on the client', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      `export const url = process.env.EXPO_PUBLIC_SUPABASE_URL;\nexport const os = process.env.EXPO_OS;\nexport const mode = process.env.NODE_ENV;\nexport const jest = process.env.JEST_WORKER_ID;\n`
    );

    const result = await checkRuntimeSecurity(projectPath);
    expect(result.status).toBe('pass');
  });

  it('does not treat app data *.config.ts modules as server files', async () => {
    const projectPath = await createExpoProject();
    await writeSource(projectPath, 'src/constants/events/raids.config.ts', `export const raids = [];\n`);
    await writeSource(
      projectPath,
      'src/constants/events/index.ts',
      `export { raids } from './raids.config';\n`
    );
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      `import { raids } from '../../constants/events';\nexport default function Home() { return raids; }\n`
    );

    const result = await checkRuntimeSecurity(projectPath);
    expect(result.status).toBe('pass');
  });

  it('warns on hardcoded localhost fetch URLs in client code', async () => {
    const projectPath = await createExpoProject();
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      `export function load() { return fetch('http://localhost:3000/api'); }\n`
    );

    const result = await checkRuntimeSecurity(projectPath);
    expect(result.status).toBe('warn');
    expect(JSON.stringify(result.details)).toContain('hardcoded-localhost-fetch');
  });

  it('skips client-bundle rules for non-Expo Node packages', async () => {
    const projectPath = await createTempProject();
    await writeJson(projectPath, 'package.json', {
      name: 'node-tool',
      dependencies: {},
    });
    await writeSource(projectPath, 'src/cli.ts', `export const token = process.env.GITHUB_TOKEN;\n`);

    const result = await checkRuntimeSecurity(projectPath);
    expect(result.status).toBe('skip');
  });

  it('scanFile reports server imports for a single client file', async () => {
    const projectPath = await createExpoProject();
    const filePath = await writeSource(
      projectPath,
      'src/app/index.tsx',
      `import express from 'express';\nexport default function Home() { return express; }\n`
    );

    const result = await scanFileRuntimeSecurity(projectPath, filePath);
    expect(result.status).toBe('error');
    expect(JSON.stringify(result.details)).toContain('express');
  });

  it('passes the in-repo StylistCheck Expo app', async () => {
    const result = await checkRuntimeSecurity(STYLIST_CHECK);
    expect(result.status === 'pass' || result.status === 'skip').toBe(true);
  });

  it('includes the runtime security check in runDoctor for Expo apps', async () => {
    const projectPath = await createExpoProject();
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(path.join(projectPath, 'project', 'info.md'), '# Info\n', 'utf8');
    await writeFile(path.join(projectPath, 'project', 'todo.md'), '# Todo\n', 'utf8');
    await writeFile(path.join(projectPath, 'project', 'guidelines.md'), '# Guidelines\n', 'utf8');

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'runtime security');

    expect(check?.status).toBe('pass');
  });
});

async function createExpoProject(): Promise<string> {
  const projectPath = await createTempProject();
  await writeJson(projectPath, 'package.json', {
    name: 'expo-app',
    main: 'expo-router/entry',
    dependencies: {
      expo: '^54.0.0',
      'expo-router': '^6.0.0',
    },
    scripts: {},
  });
  return projectPath;
}

async function createTempProject(): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-runtime-security-'));
  tempDirs.push(projectPath);
  return projectPath;
}

async function writeJson(
  projectPath: string,
  relativePath: string,
  value: Record<string, unknown>
): Promise<void> {
  const filePath = path.join(projectPath, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeSource(projectPath: string, relativePath: string, contents: string): Promise<string> {
  const filePath = path.join(projectPath, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
  return filePath;
}
