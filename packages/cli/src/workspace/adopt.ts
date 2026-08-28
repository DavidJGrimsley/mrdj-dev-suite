import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { WORKSPACE_MANIFEST_VERSION } from './schema.js';

import type { WorkspaceManifest } from './schema.js';

export interface WorkspaceAdoptionPlan {
  sourcePath: string;
  sourceName: string;
  workspaceRoot: string;
  projectPath: string;
  normalizedMainPath: string;
  tempPath: string;
  existingProjectMemory: string[];
  remote?: string;
  defaultBranch: string;
  manifest: WorkspaceManifest;
  warnings: string[];
}

function runGit(repoPath: string, args: string[]): string | undefined {
  try {
    return execFileSync('git', ['-C', repoPath, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return undefined;
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveWorkspaceNaming(sourceName: string, workspaceRoot: string): {
  workspaceName: string;
  mainFolder: string;
} {
  const existingMainMatch = /^(.*)-main$/i.exec(sourceName);
  if (!existingMainMatch || !existingMainMatch[1]) {
    return {
      workspaceName: sourceName,
      mainFolder: `${sourceName}-main`,
    };
  }

  const sourceWorkspaceName = existingMainMatch[1];
  const parentName = path.basename(workspaceRoot);
  const workspaceName =
    slugify(parentName) === slugify(sourceWorkspaceName) ? parentName : sourceWorkspaceName;

  return {
    workspaceName,
    mainFolder: sourceName,
  };
}

export function planWorkspaceAdoption(sourcePath: string): WorkspaceAdoptionPlan {
  const resolvedSource = path.resolve(sourcePath);
  if (!fs.existsSync(resolvedSource) || !fs.statSync(resolvedSource).isDirectory()) {
    throw new Error(`Cannot adopt missing directory: ${resolvedSource}`);
  }

  const sourceName = path.basename(resolvedSource);
  const workspaceRoot = path.dirname(resolvedSource);
  const { workspaceName, mainFolder } = deriveWorkspaceNaming(sourceName, workspaceRoot);
  const projectPath = path.join(workspaceRoot, 'project');
  const normalizedMainPath = path.join(workspaceRoot, mainFolder);
  const tempPath = path.join(workspaceRoot, 'temp');
  const remote = runGit(resolvedSource, ['remote', 'get-url', 'origin']);
  const detectedDefaultBranch =
    runGit(resolvedSource, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])?.replace(
      /^origin\//,
      ''
    ) ?? 'main';

  const legacyProjectPath = path.join(resolvedSource, 'project');
  const existingProjectMemory = fs.existsSync(legacyProjectPath)
    ? fs
        .readdirSync(legacyProjectPath, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.join('project', entry.name))
        .sort()
    : [];

  const workspaceId = slugify(workspaceName) || 'project';
  const warnings: string[] = [];
  if (!remote) {
    warnings.push('No origin remote was detected; repository linkage must be supplied before setup.');
  }
  if (fs.existsSync(projectPath)) {
    warnings.push('A sibling project/ directory already exists; adoption must reconcile it rather than overwrite it.');
  }
  if (resolvedSource !== normalizedMainPath) {
    warnings.push(
      `The existing source directory is not normalized. A later safe normalization can rename it to ${path.basename(normalizedMainPath)}.`
    );
  }

  const manifest: WorkspaceManifest = {
    schemaVersion: WORKSPACE_MANIFEST_VERSION,
    workspaceId,
    name: workspaceName,
    repositories: [
      {
        id: 'source',
        remote: remote ?? 'REQUIRED',
        defaultBranch: detectedDefaultBranch,
        mainFolder: sourceName,
        worktreePrefix: `${workspaceName}-`,
      },
    ],
    project: { path: 'project' },
    temp: { path: 'temp' },
  };

  return {
    sourcePath: resolvedSource,
    sourceName,
    workspaceRoot,
    projectPath,
    normalizedMainPath,
    tempPath,
    existingProjectMemory,
    ...(remote ? { remote } : {}),
    defaultBranch: detectedDefaultBranch,
    manifest,
    warnings,
  };
}
