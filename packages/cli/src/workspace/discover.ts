import fs from 'node:fs';
import path from 'node:path';

import {
  SOURCE_WORKSPACE_LINK_PATH,
  WORKSPACE_MANIFEST_FILENAME,
  parseSourceWorkspaceLink,
  parseWorkspaceManifest,
} from './schema.js';

import type { SourceWorkspaceLink, WorkspaceManifest } from './schema.js';

export interface DiscoveredWorkspace {
  workspaceRoot: string;
  projectPath: string;
  manifestPath: string;
  manifest: WorkspaceManifest;
  startedFrom: string;
  sourceLink?: {
    path: string;
    value: SourceWorkspaceLink;
  };
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

function candidateWorkspaceFromRoot(root: string): string[] {
  return [
    path.join(root, 'project', WORKSPACE_MANIFEST_FILENAME),
    path.join(root, WORKSPACE_MANIFEST_FILENAME),
  ];
}

function walkAncestors(startPath: string): string[] {
  const result: string[] = [];
  let current = path.resolve(startPath);
  if (fs.existsSync(current) && fs.statSync(current).isFile()) {
    current = path.dirname(current);
  }

  while (true) {
    result.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return result;
}

function tryReadSourceLink(startPath: string): { path: string; value: SourceWorkspaceLink } | undefined {
  for (const ancestor of walkAncestors(startPath)) {
    const linkPath = path.join(ancestor, SOURCE_WORKSPACE_LINK_PATH);
    if (!fs.existsSync(linkPath)) continue;
    try {
      return { path: linkPath, value: parseSourceWorkspaceLink(readJson(linkPath)) };
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function discoverWorkspace(startPath = '.'): DiscoveredWorkspace | undefined {
  const startedFrom = path.resolve(startPath);
  const sourceLink = tryReadSourceLink(startedFrom);

  for (const ancestor of walkAncestors(startedFrom)) {
    for (const manifestPath of candidateWorkspaceFromRoot(ancestor)) {
      if (!fs.existsSync(manifestPath)) continue;

      const manifest = parseWorkspaceManifest(readJson(manifestPath));
      const manifestDirectory = path.dirname(manifestPath);
      const workspaceRoot =
        path.basename(manifestDirectory) === 'project'
          ? path.dirname(manifestDirectory)
          : ancestor;
      const projectPath = path.resolve(
        workspaceRoot,
        manifest.project?.path ?? (path.basename(manifestDirectory) === 'project' ? 'project' : '.')
      );

      if (sourceLink && sourceLink.value.workspaceId !== manifest.workspaceId) {
        continue;
      }

      return {
        workspaceRoot,
        projectPath,
        manifestPath,
        manifest,
        startedFrom,
        ...(sourceLink ? { sourceLink } : {}),
      };
    }
  }

  if (sourceLink) {
    const linkedRepoRoot = path.dirname(path.dirname(sourceLink.path));
    const parent = path.dirname(linkedRepoRoot);
    const siblingProjectManifest = path.join(parent, 'project', WORKSPACE_MANIFEST_FILENAME);
    if (fs.existsSync(siblingProjectManifest)) {
      const manifest = parseWorkspaceManifest(readJson(siblingProjectManifest));
      if (manifest.workspaceId === sourceLink.value.workspaceId) {
        return {
          workspaceRoot: parent,
          projectPath: path.resolve(parent, manifest.project?.path ?? 'project'),
          manifestPath: siblingProjectManifest,
          manifest,
          startedFrom,
          sourceLink,
        };
      }
    }
  }

  return undefined;
}

export function resolveWorkspaceProjectMemoryPath(startPath = '.'): string | undefined {
  const workspace = discoverWorkspace(startPath);
  if (workspace) return workspace.projectPath;

  const legacy = path.join(path.resolve(startPath), 'project');
  return fs.existsSync(legacy) && fs.statSync(legacy).isDirectory() ? legacy : undefined;
}
