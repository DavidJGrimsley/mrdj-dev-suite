import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type LegacyProjectMigrationStatus = 'identical' | 'copy' | 'merge' | 'conflict';

export interface LegacyProjectMigrationFile {
  path: string;
  status: LegacyProjectMigrationStatus;
  sources: string[];
  content?: string;
}

export interface LegacyProjectMigrationPlan {
  files: LegacyProjectMigrationFile[];
  conflicts: string[];
}

export interface LegacyProjectSource {
  worktreePath: string;
  primary: boolean;
}

function git(repoPath: string, args: string[]): string {
  return execFileSync('git', ['-C', repoPath, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function trackedProjectFiles(repoPath: string): string[] {
  try {
    return git(repoPath, ['ls-files', '--', 'project'])
      .split(/\r?\n/).map((value) => value.trim()).filter((value) => value.startsWith('project/'));
  } catch { return []; }
}

function content(repoPath: string, relativePath: string): string | undefined {
  const filePath = path.join(repoPath, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : undefined;
}

function merge(base: string, current: string, incoming: string): { content?: string; conflict: boolean } {
  if (current === incoming) return { content: current, conflict: false };
  if (current === base) return { content: incoming, conflict: false };
  if (incoming === base) return { content: current, conflict: false };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mds-project-merge-'));
  try {
    const currentPath = path.join(dir, 'current.md');
    const basePath = path.join(dir, 'base.md');
    const incomingPath = path.join(dir, 'incoming.md');
    fs.writeFileSync(currentPath, current);
    fs.writeFileSync(basePath, base);
    fs.writeFileSync(incomingPath, incoming);
    try {
      return { content: execFileSync('git', ['merge-file', '-p', currentPath, basePath, incomingPath], { encoding: 'utf8' }), conflict: false };
    } catch (error) {
      const output = error && typeof error === 'object' && 'stdout' in error && typeof error.stdout === 'string' ? error.stdout : undefined;
      return { ...(output ? { content: output } : {}), conflict: true };
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function planLegacyProjectConsolidation(
  sources: LegacyProjectSource[],
  controlProjectPath: string,
): LegacyProjectMigrationPlan {
  const primary = sources.find((source) => source.primary) ?? sources[0];
  if (!primary) return { files: [], conflicts: [] };
  const baseFiles = new Set(trackedProjectFiles(primary.worktreePath));
  const allFiles = new Set(baseFiles);
  for (const source of sources) for (const file of trackedProjectFiles(source.worktreePath)) allFiles.add(file);
  const files: LegacyProjectMigrationFile[] = [];
  const conflicts: string[] = [];
  for (const sourceRelativePath of [...allFiles].sort()) {
    const targetRelativePath = sourceRelativePath.replace(/^project\//, '');
    const base = content(primary.worktreePath, sourceRelativePath) ?? '';
    const existingControl = content(controlProjectPath, targetRelativePath);
    let merged = existingControl ?? base;
    let status: LegacyProjectMigrationStatus = existingControl === undefined && base !== '' ? 'copy' : 'identical';
    const sourcePaths = [primary.worktreePath];
    for (const source of sources.filter((item) => item !== primary)) {
      const incoming = content(source.worktreePath, sourceRelativePath);
      if (incoming === undefined) continue;
      sourcePaths.push(source.worktreePath);
      const result = merge(base, merged, incoming);
      if (result.conflict || result.content === undefined) {
        status = 'conflict';
        conflicts.push(sourceRelativePath);
        break;
      }
      if (result.content !== merged) status = merged === '' ? 'copy' : 'merge';
      merged = result.content;
    }
    files.push({ path: sourceRelativePath, status, sources: sourcePaths, ...(status === 'conflict' ? {} : { content: merged }) });
  }
  return { files, conflicts };
}

export function applyLegacyProjectConsolidation(plan: LegacyProjectMigrationPlan, controlProjectPath: string): void {
  if (plan.conflicts.length > 0) throw new Error(`Legacy project consolidation has conflicts: ${plan.conflicts.join(', ')}`);
  for (const file of plan.files) {
    if (file.content === undefined) continue;
    const targetPath = path.join(controlProjectPath, file.path.replace(/^project\//, ''));
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, file.content, 'utf8');
  }
}
