import path from 'node:path';

import type { DoctorCheckResult } from '../types.js';
import { findFiles, readOptionalText, relative, SOURCE_EXTENSIONS } from '../utils.js';

const PUBLIC_SECRET_PATTERN =
  /\bEXPO_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|TOKEN|STRIPE_SECRET)[A-Z0-9_]*\b/g;

export async function checkEnvHygiene(projectPath: string): Promise<DoctorCheckResult> {
  const envFiles = await findFiles(projectPath, (filePath) => {
    const basename = path.basename(filePath);
    return basename === '.env' || basename.startsWith('.env.');
  });
  const sourceFiles = await findFiles(projectPath, (filePath) =>
    SOURCE_EXTENSIONS.has(path.extname(filePath))
  );

  const findings = await findPublicSecretNames(projectPath, [...envFiles, ...sourceFiles]);
  if (findings.length > 0) {
    return {
      name: 'env hygiene',
      status: 'error',
      message: 'Secret-looking EXPO_PUBLIC variables were found.',
      details: { findings: findings.slice(0, 25), truncated: findings.length > 25 },
    };
  }

  return {
    name: 'env hygiene',
    status: 'pass',
    message: 'No secret-looking EXPO_PUBLIC variables found.',
  };
}

export async function scanFileEnvHygiene(
  projectPath: string,
  filePath: string
): Promise<DoctorCheckResult> {
  const findings = await findPublicSecretNames(projectPath, [filePath]);
  return findings.length > 0
    ? {
        name: 'env hygiene',
        status: 'error',
        message: 'Secret-looking EXPO_PUBLIC variables were found.',
        details: { findings },
      }
    : {
        name: 'env hygiene',
        status: 'pass',
        message: 'No secret-looking EXPO_PUBLIC variables found.',
      };
}

async function findPublicSecretNames(projectPath: string, filePaths: string[]): Promise<string[]> {
  const findings: string[] = [];
  for (const filePath of filePaths) {
    const contents = await readOptionalText(filePath);
    if (!contents) {
      continue;
    }

    const matches = [...new Set([...contents.matchAll(PUBLIC_SECRET_PATTERN)].map((m) => m[0]))];
    for (const match of matches) {
      findings.push(`${relative(projectPath, filePath)}: ${match}`);
    }
  }
  return findings;
}

