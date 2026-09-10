import path from 'node:path';

import type { DoctorCheckResult, PackageJson } from '../types.js';
import { pathExists, readOptionalText } from '../utils.js';

const PUBLIC_KEY_NAMES = [
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_SUPABASE_KEY',
] as const;

export async function checkSupabaseEnvironment(
  projectPath: string,
  packageJson: PackageJson
): Promise<DoctorCheckResult> {
  const localPath = path.join(projectPath, '.env.local');
  const examplePath = path.join(projectPath, '.env.example');
  const local = parseEnv(await readOptionalText(localPath));
  const example = parseEnv(await readOptionalText(examplePath));
  const hasSupabaseDependency = Boolean(
    packageJson.dependencies?.['@supabase/supabase-js'] ??
    packageJson.devDependencies?.['@supabase/supabase-js']
  );
  const hasSupabaseVariables = [...local.keys(), ...example.keys()].some((name) =>
    name.includes('SUPABASE')
  );
  if (!hasSupabaseDependency && !hasSupabaseVariables) {
    return {
      name: 'Supabase environment',
      status: 'skip',
      message: 'Skipped because this app does not use Supabase.',
    };
  }

  const problems: string[] = [];
  if (!(await pathExists(localPath))) problems.push('.env.local is missing');
  if (!(await pathExists(examplePath))) problems.push('.env.example is missing');

  const url = local.get('EXPO_PUBLIC_SUPABASE_URL')?.trim() ?? '';
  const populatedKeys = PUBLIC_KEY_NAMES.filter((name) => Boolean(local.get(name)?.trim()));
  if (!url) problems.push('EXPO_PUBLIC_SUPABASE_URL is blank in .env.local');
  if (populatedKeys.length === 0) {
    problems.push('a publishable or anon Supabase key is required in .env.local');
  }

  for (const [name, value] of local) {
    if (/SERVICE_ROLE|SECRET|PRIVATE/u.test(name) || /^sb_secret_/u.test(value.trim())) {
      problems.push(`${name} is a private Supabase credential and must not be used by an Expo app`);
    }
  }
  for (const [name, value] of example) {
    if (name.includes('SUPABASE') && value.trim()) {
      problems.push(`${name} must be blank in .env.example`);
    }
  }
  if ((await pathExists(localPath)) && !(await ignoresLocalEnvironment(projectPath))) {
    problems.push('.env.local is not ignored by the app or workspace .gitignore');
  }

  return problems.length > 0
    ? {
        name: 'Supabase environment',
        status: 'error',
        message: 'The app-level Supabase environment contract is incomplete or unsafe.',
        details: { problems },
      }
    : {
        name: 'Supabase environment',
        status: 'pass',
        message:
          'App-local Supabase URL and public key are populated, ignored, and safely templated.',
      };
}

function parseEnv(contents: string | null): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of (contents ?? '').split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/u);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      values.set(match[1], match[2].replace(/^['"]|['"]$/gu, ''));
    }
  }
  return values;
}

async function ignoresLocalEnvironment(projectPath: string): Promise<boolean> {
  let current = path.resolve(projectPath);
  let canContinue = true;
  while (canContinue) {
    const ignore = (await readOptionalText(path.join(current, '.gitignore'))) ?? '';
    if (
      ignore
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .some((line) => ['.env.local', '.env.*', '*.local', '.env*'].includes(line))
    ) {
      return true;
    }
    const parent = path.dirname(current);
    if (await pathExists(path.join(current, '.git'))) return false;
    canContinue = parent !== current;
    current = parent;
  }
  return false;
}
