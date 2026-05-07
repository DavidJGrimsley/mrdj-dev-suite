import path from 'node:path';

import type { DoctorCheckResult } from '../types.js';
import { pathExists, readOptionalText } from '../utils.js';

export async function checkGitignoreEnv(projectPath: string): Promise<DoctorCheckResult> {
  const gitignorePath = path.join(projectPath, '.gitignore');
  const envPath = path.join(projectPath, '.env');

  if (!(await pathExists(envPath))) {
    return {
      name: 'gitignore env safety',
      status: 'pass',
      message: 'No root .env file found.',
    };
  }

  const gitignore = (await readOptionalText(gitignorePath)) ?? '';
  const ignoresEnv = gitignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === '.env' || line === '.env.*' || line === '*.env');

  return ignoresEnv
    ? {
        name: 'gitignore env safety',
        status: 'pass',
        message: '.env is ignored by git.',
      }
    : {
        name: 'gitignore env safety',
        status: 'error',
        message: 'Root .env exists but .gitignore does not ignore it.',
      };
}

