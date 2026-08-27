import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { checkEnvHygiene, scanFileEnvHygiene } from '../src/checks/env-hygiene.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('env hygiene templates and credential shapes', () => {
  it('warns when EXPO_PUBLIC keys in .env.local are missing from .env.example', async () => {
    const projectPath = await createTempProject();
    await writeFile(
      path.join(projectPath, '.env.local'),
      'EXPO_PUBLIC_API_URL=https://api.dev.local\n',
      'utf8'
    );
    await writeFile(path.join(projectPath, '.env.example'), 'STRIPE_SECRET_KEY=\n', 'utf8');

    const result = await checkEnvHygiene(projectPath);
    const details = JSON.stringify(result.details);

    expect(result.status).toBe('warn');
    expect(details).toContain('EXPO_PUBLIC_API_URL');
    expect(details).toContain('undocumented-expo-public-env');
  });

  it('passes when public keys in .env.local are documented in .env.example', async () => {
    const projectPath = await createTempProject();
    await writeFile(
      path.join(projectPath, '.env.local'),
      'EXPO_PUBLIC_API_URL=https://api.dev.local\n',
      'utf8'
    );
    await writeFile(path.join(projectPath, '.env.example'), 'EXPO_PUBLIC_API_URL=\n', 'utf8');

    const result = await checkEnvHygiene(projectPath);
    expect(result.status).toBe('pass');
  });

  it('warns when .env.local has public keys and no example file exists', async () => {
    const projectPath = await createTempProject();
    await writeFile(
      path.join(projectPath, '.env.local'),
      'EXPO_PUBLIC_API_URL=https://api.dev.local\n',
      'utf8'
    );

    const result = await checkEnvHygiene(projectPath);
    expect(result.status).toBe('warn');
    expect(JSON.stringify(result.details)).toContain('missing-env-example');
  });

  it('allows empty or placeholder private keys in .env.example', async () => {
    const projectPath = await createTempProject();
    await writeFile(
      path.join(projectPath, '.env.example'),
      ['STRIPE_SECRET_KEY=', 'STRIPE_SECRET_KEY_TWO=sk_test_your-secret-here', ''].join('\n'),
      'utf8'
    );

    const result = await checkEnvHygiene(projectPath);
    expect(result.status).toBe('pass');
  });

  it('errors on live-shaped secrets in .env.example without echoing the value', async () => {
    const projectPath = await createTempProject();
    const secretValue = 'sk_live_' + 'C'.repeat(24);
    await writeFile(path.join(projectPath, '.env.example'), `STRIPE_SECRET_KEY=${secretValue}\n`, 'utf8');

    const result = await checkEnvHygiene(projectPath);
    const details = JSON.stringify(result.details);

    expect(result.status).toBe('error');
    expect(details).toContain('stripe-key-shape');
    expect(details).not.toContain(secretValue);
  });

  it('detects AWS and Bearer credential shapes in source without leaking values', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src', 'secrets.ts');
    await mkdir(path.dirname(filePath), { recursive: true });
    const awsKey = 'AKIA' + 'D'.repeat(16);
    const token = 'eyJ' + 'a'.repeat(12) + '.' + 'b'.repeat(12) + '.' + 'c'.repeat(12);
    await writeFile(
      filePath,
      `export const awsAccessKeyId = "${awsKey}";\nexport const authorization = "Bearer ${token}";\n`,
      'utf8'
    );

    const result = await scanFileEnvHygiene(projectPath, filePath);
    const details = JSON.stringify(result.details);

    expect(result.status).toBe('error');
    expect(details).toContain('aws-access-key-shape');
    expect(details).toMatch(/jwt-shape|bearer-token-shape/);
    expect(details).not.toContain(awsKey);
    expect(details).not.toContain(token);
  });

  it('warns on hardcoded Stripe publishable keys instead of failing', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src', 'stripe.ts');
    await mkdir(path.dirname(filePath), { recursive: true });
    const publishable = 'pk_test_' + 'E'.repeat(24);
    await writeFile(filePath, `export const stripePublishableKey = "${publishable}";\n`, 'utf8');

    const result = await scanFileEnvHygiene(projectPath, filePath);
    const details = JSON.stringify(result.details);

    expect(result.status).toBe('warn');
    expect(details).toContain('stripe-publishable-key-shape');
    expect(details).not.toContain(publishable);
  });

  it('ignores credential-looking tokens that only appear in comments', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src', 'notes.ts');
    await mkdir(path.dirname(filePath), { recursive: true });
    const secretValue = 'sk_live_' + 'F'.repeat(24);
    await writeFile(
      filePath,
      `// api_key example ${secretValue}\nexport const ok = true;\n`,
      'utf8'
    );

    const result = await scanFileEnvHygiene(projectPath, filePath);
    expect(result.status).toBe('pass');
  });

  it('treats REPLACE_WITH placeholders in example env files as safe', async () => {
    const projectPath = await createTempProject();
    await writeFile(
      path.join(projectPath, '.env.example'),
      'QUANTUM_BACKEND_API_KEY=qapi_REPLACE_WITH_SERVER_KEY\n',
      'utf8'
    );

    const result = await checkEnvHygiene(projectPath);
    expect(result.status).toBe('pass');
  });

  it('does not flag Bearer tokens that interpolate process.env', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src', 'api.ts');
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(
      filePath,
      "export const headers = { Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''}` };\n",
      'utf8'
    );

    const result = await scanFileEnvHygiene(projectPath, filePath);
    expect(result.status).toBe('pass');
  });

  it('ignores credential fixtures that live in test files when scanning a project', async () => {
    const projectPath = await createTempProject();
    await mkdir(path.join(projectPath, 'tests'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'tests', 'doctor.test.ts'),
      'const sample = "-----BEGIN PRIVATE KEY-----\\n";\n',
      'utf8'
    );

    const result = await checkEnvHygiene(projectPath);
    expect(result.status).toBe('pass');
  });

  it('does not treat secrets stored in real env files as hardcoded source leaks', async () => {
    const projectPath = await createTempProject();
    const secretValue = 'sk_live_' + 'G'.repeat(24);
    await writeFile(path.join(projectPath, '.env.local'), `STRIPE_SECRET_KEY=${secretValue}\n`, 'utf8');
    await writeFile(path.join(projectPath, '.env.example'), 'STRIPE_SECRET_KEY=\n', 'utf8');

    const result = await checkEnvHygiene(projectPath);
    expect(result.status).toBe('pass');
  });
});

async function createTempProject(): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-env-hygiene-'));
  tempDirs.push(projectPath);
  return projectPath;
}
