export const WORKSPACE_MANIFEST_VERSION = 1 as const;
export const WORKSPACE_MANIFEST_FILENAME = 'mds.workspace.json';
export const WORKSPACE_WORKTREE_REGISTRY_FILENAME = 'mds.worktrees.json';
export const SOURCE_WORKSPACE_LINK_PATH = '.mds/workspace.json';

export interface WorkspaceRepositoryConfig {
  id: string;
  remote: string;
  defaultBranch: string;
  mainFolder: string;
  worktreePrefix: string;
}

export interface WorkspaceManifest {
  schemaVersion: typeof WORKSPACE_MANIFEST_VERSION;
  workspaceId: string;
  name: string;
  repositories: WorkspaceRepositoryConfig[];
  project?: {
    path?: string;
  };
  temp?: {
    path?: string;
  };
}

export interface SourceWorkspaceLink {
  schemaVersion: typeof WORKSPACE_MANIFEST_VERSION;
  workspaceId: string;
  projectRepository?: string;
}

export interface WorkspaceWorktreeRegistryEntry {
  repositoryId: string;
  path: string;
  branch?: string;
  head?: string;
  role: 'main' | 'feature' | 'detached';
}

export interface WorkspaceWorktreeRegistry {
  schemaVersion: typeof WORKSPACE_MANIFEST_VERSION;
  workspaceId: string;
  worktrees: WorkspaceWorktreeRegistryEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid workspace manifest: ${field} must be a non-empty string.`);
  }
  return value;
}

export function parseWorkspaceManifest(value: unknown): WorkspaceManifest {
  if (!isRecord(value)) {
    throw new Error('Invalid workspace manifest: expected a JSON object.');
  }
  if (value.schemaVersion !== WORKSPACE_MANIFEST_VERSION) {
    throw new Error(
      `Unsupported workspace manifest version: ${String(value.schemaVersion)}. Expected ${WORKSPACE_MANIFEST_VERSION}.`
    );
  }
  if (!Array.isArray(value.repositories) || value.repositories.length === 0) {
    throw new Error('Invalid workspace manifest: repositories must contain at least one repository.');
  }

  const repositories = value.repositories.map((repository, index) => {
    if (!isRecord(repository)) {
      throw new Error(`Invalid workspace manifest: repositories[${index}] must be an object.`);
    }
    return {
      id: requireNonEmptyString(repository.id, `repositories[${index}].id`),
      remote: requireNonEmptyString(repository.remote, `repositories[${index}].remote`),
      defaultBranch: requireNonEmptyString(
        repository.defaultBranch,
        `repositories[${index}].defaultBranch`
      ),
      mainFolder: requireNonEmptyString(repository.mainFolder, `repositories[${index}].mainFolder`),
      worktreePrefix: requireNonEmptyString(
        repository.worktreePrefix,
        `repositories[${index}].worktreePrefix`
      ),
    };
  });

  const ids = new Set<string>();
  for (const repository of repositories) {
    if (ids.has(repository.id)) {
      throw new Error(`Invalid workspace manifest: duplicate repository id ${repository.id}.`);
    }
    ids.add(repository.id);
  }

  const project = isRecord(value.project)
    ? {
        path:
          value.project.path === undefined
            ? undefined
            : requireNonEmptyString(value.project.path, 'project.path'),
      }
    : undefined;
  const temp = isRecord(value.temp)
    ? {
        path:
          value.temp.path === undefined
            ? undefined
            : requireNonEmptyString(value.temp.path, 'temp.path'),
      }
    : undefined;

  return {
    schemaVersion: WORKSPACE_MANIFEST_VERSION,
    workspaceId: requireNonEmptyString(value.workspaceId, 'workspaceId'),
    name: requireNonEmptyString(value.name, 'name'),
    repositories,
    ...(project ? { project } : {}),
    ...(temp ? { temp } : {}),
  };
}

export function parseSourceWorkspaceLink(value: unknown): SourceWorkspaceLink {
  if (!isRecord(value)) {
    throw new Error('Invalid workspace link: expected a JSON object.');
  }
  if (value.schemaVersion !== WORKSPACE_MANIFEST_VERSION) {
    throw new Error(
      `Unsupported workspace link version: ${String(value.schemaVersion)}. Expected ${WORKSPACE_MANIFEST_VERSION}.`
    );
  }
  return {
    schemaVersion: WORKSPACE_MANIFEST_VERSION,
    workspaceId: requireNonEmptyString(value.workspaceId, 'workspaceId'),
    ...(value.projectRepository === undefined
      ? {}
      : { projectRepository: requireNonEmptyString(value.projectRepository, 'projectRepository') }),
  };
}

export function parseWorkspaceWorktreeRegistry(value: unknown): WorkspaceWorktreeRegistry {
  if (!isRecord(value)) throw new Error('Invalid worktree registry: expected a JSON object.');
  if (value.schemaVersion !== WORKSPACE_MANIFEST_VERSION) {
    throw new Error(`Unsupported worktree registry version: ${String(value.schemaVersion)}.`);
  }
  if (!Array.isArray(value.worktrees)) {
    throw new Error('Invalid worktree registry: worktrees must be an array.');
  }

  return {
    schemaVersion: WORKSPACE_MANIFEST_VERSION,
    workspaceId: requireNonEmptyString(value.workspaceId, 'workspaceId'),
    worktrees: value.worktrees.map((entry, index) => {
      if (!isRecord(entry)) throw new Error(`Invalid worktree registry: worktrees[${index}] must be an object.`);
      const role = entry.role;
      if (role !== 'main' && role !== 'feature' && role !== 'detached') {
        throw new Error(`Invalid worktree registry: worktrees[${index}].role is invalid.`);
      }
      return {
        repositoryId: requireNonEmptyString(entry.repositoryId, `worktrees[${index}].repositoryId`),
        path: requireNonEmptyString(entry.path, `worktrees[${index}].path`),
        ...(entry.branch === undefined ? {} : { branch: requireNonEmptyString(entry.branch, `worktrees[${index}].branch`) }),
        ...(entry.head === undefined ? {} : { head: requireNonEmptyString(entry.head, `worktrees[${index}].head`) }),
        role,
      };
    }),
  };
}
