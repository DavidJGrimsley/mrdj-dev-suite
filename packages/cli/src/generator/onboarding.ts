import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { canonicalizeJson, computeSha256 } from '@mr.dj2u/framework-registry';
import { discoverWorkspace } from '../workspace/discover.js';
import { ReservationJournal } from './journal.js';
import { assertNoSymlinks } from './runner.js';
import type { OnboardOptions, OnboardResult } from './adapter-types.js';

/** Existing workspace memory belongs to its coordinator. Planning never writes. */
export async function onboardProject(projectPath: string, frameworkId: string, options: OnboardOptions = {}): Promise<OnboardResult> {
  const resolved = path.resolve(projectPath); assertNoSymlinks(resolved);
  if (!existsSync(resolved)) throw new Error('Existing project does not exist');
  const workspace = discoverWorkspace(resolved);
  const memory = workspace?.projectPath ?? path.join(resolved, 'project');
  assertNoSymlinks(memory);
  const contents: Record<string, string> = {
    'info.md': `# ${path.basename(resolved)}\n\nFramework detection: ${frameworkId}.\n\nProduct requirements: deferred for user review.\n`,
    'style.md': '# Design direction\n\nDeferred for user review.\n',
    'guidelines.md': `# Engineering guidelines\n\nFramework: ${frameworkId}. Preserve existing source and upstream agent instructions.\n`,
    'todo.md': '# Roadmap\n\nNo implementation scope approved. Define it with the project owner.\n',
  };
  const snapshot = Object.fromEntries(Object.keys(contents).map(file => [file, existsSync(path.join(memory, file)) ? readFileSync(path.join(memory, file), 'utf8') : null]));
  const proposed = Object.keys(contents).filter(file => snapshot[file] === null);
  const digest = computeSha256(canonicalizeJson({ project: resolved, frameworkId, memory, snapshot, contents, coordinatorOwned: Boolean(workspace) }));
  const result: OnboardResult = { success: false, projectPath: resolved, frameworkId, addedFiles: [], proposedFiles: proposed, planDigest: digest, canonicalProjectMemoryLocation: memory, summary: 'Read-only onboarding proposal; review missing memory files and approve the digest before applying.' };
  if (!options.approvedPlanDigest) return result;
  if (options.approvedPlanDigest !== digest) throw new Error('Onboarding approval no longer matches current memory');
  if (workspace && !options.coordinatorApproved) throw new Error('Canonical workspace memory requires coordinator apply approval');
  // Refuse to create a competing app project folder for any initialized workspace.
  const journal = new ReservationJournal(memory, { allowNonEmptyTarget: true });
  journal.reserve();
  try { for (const file of proposed) journal.writeFile(file, contents[file]!); journal.commit(); }
  catch (error) { journal.rollback(); throw error; }
  return { ...result, success: true, addedFiles: proposed, summary: 'Approved missing project memory created exclusively; existing files preserved.' };
}
