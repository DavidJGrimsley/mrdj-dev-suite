import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  checkApiSafety,
  checkAuthChecks,
  checkCors,
  checkErrorExposure,
  checkInputValidation,
  checkMethodValidation,
  checkRateLimiting,
  checkServiceRole,
  scanFileApiSafety,
} from '../src/checks/api-safety.js';
import { runDoctor, scanFile } from '../src/index.js';
import type { PackageJson } from '../src/types.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

const EXPO_PACKAGE: PackageJson = {
  name: 'api-safety-fixture',
  main: 'expo-router/entry',
  dependencies: { expo: '^56.0.0', 'expo-router': '^6.0.0' },
};

describe('api safety', () => {
  it('skips projects without Expo Router API routes', async () => {
    const projectPath = await createTempProject();
    await writePackage(projectPath, { name: 'plain' });

    const result = await checkApiSafety({ name: 'plain' }, projectPath);
    expect(result.status).toBe('skip');
  });

  it('skips Expo Router apps that have no +api files', async () => {
    const projectPath = await createTempProject();
    await writePackage(projectPath, EXPO_PACKAGE);
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      'export default function Home() { return null; }\n'
    );

    const result = await checkApiSafety(EXPO_PACKAGE, projectPath);
    expect(result.status).toBe('skip');
  });

  it('passes a thin billing POST with auth, Zod, named method, and rate-limit signal', async () => {
    const projectPath = await createTempProject();
    await writePackage(projectPath, EXPO_PACKAGE);
    await writeSource(projectPath, 'src/app/api/billing/checkout+api.ts', cleanBillingRoute());

    const result = await checkApiSafety(EXPO_PACKAGE, projectPath);
    expect(result.status).toBe('pass');
  });

  it('warns when a sensitive billing route has no auth check', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src/app/api/billing/checkout+api.ts');
    const contents = [
      "import { z } from 'zod';",
      'const schema = z.object({ offer: z.string() });',
      'export async function POST(request: Request) {',
      '  const body = schema.parse(await request.json());',
      '  return Response.json(body);',
      '}',
      '',
    ].join('\n');

    const findings = checkAuthChecks(projectPath, filePath, contents);
    expect(findings.some((finding) => finding.kind === 'missing-auth')).toBe(true);
  });

  it('treats handleDbWrite as both auth and validation', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src/app/api/db/clients/[action]+api.ts');
    const contents = [
      "import { z } from 'zod';",
      "import { handleDbWrite } from '@/server/db/_shared/route';",
      'const schema = z.object({ name: z.string() });',
      'export async function POST(request: Request) {',
      '  return handleDbWrite(request, schema, async () => undefined);',
      '}',
      '',
    ].join('\n');

    expect(checkAuthChecks(projectPath, filePath, contents)).toHaveLength(0);
    expect(checkInputValidation(projectPath, filePath, contents)).toHaveLength(0);
  });

  it('does not require Zod on a Stripe webhook with a signature', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src/app/api/webhooks/stripe+api.ts');
    const contents = [
      'export async function POST(request: Request) {',
      "  const signature = request.headers.get('stripe-signature');",
      '  const rawBody = Buffer.from(await request.arrayBuffer());',
      '  return Response.json({ signature: Boolean(signature), bytes: rawBody.byteLength });',
      '}',
      '',
    ].join('\n');

    expect(checkAuthChecks(projectPath, filePath, contents)).toHaveLength(0);
    expect(checkInputValidation(projectPath, filePath, contents)).toHaveLength(0);
  });

  it('warns on request.json() casts without a schema', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src/app/api/mercury-credentials+api.ts');
    const contents = [
      "import { requireAuthUserId } from '@/server/db/_shared/auth';",
      'export async function POST(request: Request) {',
      '  const body = (await request.json()) as { action: string };',
      '  await requireAuthUserId(request);',
      '  return Response.json(body);',
      '}',
      '',
    ].join('\n');

    const findings = checkInputValidation(projectPath, filePath, contents);
    expect(findings.some((finding) => finding.kind === 'missing-validation')).toBe(true);
  });

  it('warns when service role is used without auth', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src/app/api/admin/users+api.ts');
    const contents = [
      "import { createClient } from '@supabase/supabase-js';",
      'export async function GET() {',
      '  const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);',
      '  return Response.json(await supabase.from("users").select());',
      '}',
      '',
    ].join('\n');

    const findings = checkServiceRole(projectPath, filePath, contents);
    expect(findings.some((finding) => finding.kind === 'service-role-without-auth')).toBe(true);
  });

  it('ignores service-role mentions in comments', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src/app/api/health+api.ts');
    const contents = [
      '// This route never uses process.env.SUPABASE_SERVICE_ROLE_KEY on purpose.',
      'export async function GET() {',
      '  return Response.json({ ok: true });',
      '}',
      '',
    ].join('\n');

    expect(checkServiceRole(projectPath, filePath, contents)).toHaveLength(0);
  });

  it('skips test files that contain mock service_role objects', async () => {
    const projectPath = await createTempProject();
    await writePackage(projectPath, EXPO_PACKAGE);
    await writeSource(
      projectPath,
      'src/app/api/admin/users+api.test.ts',
      "export const mock = { service_role: 'test' };\nexport async function GET() { return Response.json(mock); }\n"
    );

    const result = await scanFileApiSafety(
      projectPath,
      path.join(projectPath, 'src/app/api/admin/users+api.test.ts'),
      EXPO_PACKAGE
    );
    expect(result.status).toBe('skip');
  });

  it('warns on sensitive endpoints without rate limiting and passes public GET', async () => {
    const projectPath = await createTempProject();
    const billingPath = path.join(projectPath, 'src/app/api/billing/checkout+api.ts');
    const publicPath = path.join(projectPath, 'src/app/api/health+api.ts');

    expect(
      checkRateLimiting(
        projectPath,
        billingPath,
        'export async function POST() { return Response.json({ ok: true }); }\n'
      ).some((finding) => finding.kind === 'missing-rate-limit')
    ).toBe(true);

    expect(
      checkRateLimiting(
        projectPath,
        publicPath,
        'export async function GET() { return Response.json({ ok: true }); }\n'
      )
    ).toHaveLength(0);
  });

  it('errors when a JSON body includes error.stack', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src/app/api/items+api.ts');
    const contents = [
      'export async function GET() {',
      '  try {',
      '    return Response.json({ ok: true });',
      '  } catch (error) {',
      '    return Response.json({ stack: error.stack });',
      '  }',
      '}',
      '',
    ].join('\n');

    const findings = checkErrorExposure(projectPath, filePath, contents);
    expect(
      findings.some((finding) => finding.kind === 'stack-in-json' && finding.severity === 'error')
    ).toBe(true);

    await writePackage(projectPath, EXPO_PACKAGE);
    await writeSource(projectPath, 'src/app/api/items+api.ts', contents);
    const result = await checkApiSafety(EXPO_PACKAGE, projectPath);
    expect(result.status).toBe('error');
  });

  it('warns on wildcard CORS and passes an origin allowlist', async () => {
    const projectPath = await createTempProject();
    const starPath = path.join(projectPath, 'src/app/api/proxy+api.ts');
    const allowPath = path.join(projectPath, 'src/app/api/quantum-backend/[...segments]+api.ts');

    expect(
      checkCors(
        projectPath,
        starPath,
        "export async function GET() { return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } }); }\n"
      ).some((finding) => finding.kind === 'cors-wildcard')
    ).toBe(true);

    expect(
      checkCors(
        projectPath,
        allowPath,
        [
          'const ALLOWED_ORIGINS = ["http://localhost:8081"];',
          'function normalizeOrigin(origin: string | null) {',
          '  return origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;',
          '}',
          'export async function GET(request: Request) {',
          "  const allowedOrigin = normalizeOrigin(request.headers.get('origin'));",
          "  return new Response(null, { headers: allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {} });",
          '}',
          '',
        ].join('\n')
      )
    ).toHaveLength(0);
  });

  it('passes named GET exports and warns on an unguarded default handler', async () => {
    const projectPath = await createTempProject();
    const getPath = path.join(projectPath, 'src/app/api/health+api.ts');
    const defaultPath = path.join(projectPath, 'src/app/api/legacy+api.ts');

    expect(
      checkMethodValidation(
        projectPath,
        getPath,
        'export async function GET() { return Response.json({ ok: true }); }\n'
      )
    ).toHaveLength(0);

    const findings = checkMethodValidation(
      projectPath,
      defaultPath,
      'export default async function handler(request: Request) { return Response.json({ url: request.url }); }\n'
    );
    expect(findings.some((finding) => finding.kind === 'missing-method-guard')).toBe(true);
  });

  it('does not treat TSX files as API routes', async () => {
    const projectPath = await createTempProject();
    await writePackage(projectPath, EXPO_PACKAGE);
    await writeSource(
      projectPath,
      'src/app/api/foo+api.tsx',
      'export default function ApiLike() { return null; }\n'
    );

    const result = await scanFileApiSafety(
      projectPath,
      path.join(projectPath, 'src/app/api/foo+api.tsx'),
      EXPO_PACKAGE
    );
    expect(result.status).toBe('skip');
  });

  it('includes api safety in runDoctor reports', async () => {
    const projectPath = await createTempProject();
    await writePackage(projectPath, EXPO_PACKAGE);
    await writeSource(
      projectPath,
      'src/app/_layout.tsx',
      "import { Stack } from 'expo-router';\nexport default function Root() { return <Stack />; }\n"
    );
    await writeSource(
      projectPath,
      'src/app/api/health+api.ts',
      'export async function GET() { return Response.json({ ok: true }); }\n'
    );

    const report = await runDoctor(projectPath, { runScripts: false });
    expect(report.checks.find((check) => check.name === 'api safety')?.status).toBe('pass');

    const fileReport = await scanFile(path.join(projectPath, 'src/app/api/health+api.ts'), {
      projectPath,
    });
    expect(fileReport.checks.find((check) => check.name === 'api safety')?.status).toBe('pass');
  });
});

async function createTempProject(): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-api-safety-'));
  tempDirs.push(projectPath);
  await mkdir(path.join(projectPath, 'project'), { recursive: true });
  await writeFile(path.join(projectPath, 'project', 'info.md'), '# Info\n', 'utf8');
  await writeFile(path.join(projectPath, 'project', 'todo.md'), '# Todo\n', 'utf8');
  await writeFile(path.join(projectPath, 'project', 'guidelines.md'), '# Guidelines\n', 'utf8');
  return projectPath;
}

async function writePackage(projectPath: string, value: PackageJson): Promise<void> {
  await writeFile(
    path.join(projectPath, 'package.json'),
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8'
  );
}

async function writeSource(
  projectPath: string,
  relativePath: string,
  contents: string
): Promise<void> {
  const filePath = path.join(projectPath, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
}

function cleanBillingRoute(): string {
  return [
    "import { z } from 'zod';",
    "import { requireBillingAuthUserId } from '@/server/billing/routes';",
    'const checkoutSchema = z.object({ offer: z.enum(["annual", "monthly"]) }).strict();',
    'export async function POST(request: Request) {',
    '  await requireBillingAuthUserId(request);',
    '  const body = checkoutSchema.parse(await request.json());',
    '  if (false) return Response.json({ error: "rate limited" }, { status: 429 });',
    '  return Response.json(body);',
    '}',
    '',
  ].join('\n');
}
