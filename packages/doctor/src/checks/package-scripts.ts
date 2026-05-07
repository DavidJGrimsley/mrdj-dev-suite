import path from 'node:path';

import type { DoctorCheckResult, PackageJson } from '../types.js';
import { pathExistsSyncLike } from '../utils.js';

export function checkPackageScripts(
  packageJson: PackageJson,
  projectPath: string
): DoctorCheckResult {
  const scripts = packageJson.scripts ?? {};
  const expectedScriptGroups = {
    lint: ['lint'],
    typecheck: ['typecheck', 'type-check', 'check'],
    test: ['test', 'test:ci'],
    doctor: ['doctor'],
    build: ['build:web:deploy', 'build:web', 'build'],
  };

  const missing = Object.entries(expectedScriptGroups)
    .filter(([, candidates]) => !candidates.some((script) => script in scripts))
    .map(([label]) => label);

  const missingScriptTargets = findMissingNodeScriptTargets(scripts, projectPath);

  if (missingScriptTargets.length > 0) {
    return {
      name: 'package scripts',
      status: 'error',
      message: 'One or more package scripts reference files that do not exist.',
      details: { missing, missingScriptTargets },
    };
  }

  if (missing.length > 0) {
    return {
      name: 'package scripts',
      status: 'warn',
      message: 'Some recommended scripts are missing.',
      details: { missing },
    };
  }

  return {
    name: 'package scripts',
    status: 'pass',
    message: 'Recommended package scripts are present.',
  };
}

function findMissingNodeScriptTargets(
  scripts: Record<string, string>,
  projectPath: string
): string[] {
  const missingTargets: string[] = [];
  const nodeFilePattern = /\bnode\s+(?!-e\b)(["']?)([^\s"'&|;]+)\1/g;

  for (const [scriptName, command] of Object.entries(scripts)) {
    for (const match of command.matchAll(nodeFilePattern)) {
      const target = match[2];
      if (!target || target.startsWith('-') || target.includes('$')) {
        continue;
      }

      const normalizedTarget = target.replace(/\\/g, path.sep);
      const targetPath = path.resolve(projectPath, normalizedTarget);
      if (!pathExistsSyncLike(targetPath)) {
        missingTargets.push(`${scriptName}: ${target}`);
      }
    }
  }

  return missingTargets;
}
