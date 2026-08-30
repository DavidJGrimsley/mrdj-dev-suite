import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { runRoadmapCommand } from '../src/commands/roadmap.js';
import { generateProjectRoadmap, parseInfoSections } from '../src/roadmap.js';

const tempDirs: string[] = [];
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const legacyTodoFixture = path.join(testDirectory, 'fixtures', 'roadmap', 'legacy-master-todo.md');
const sourceRoot = path.resolve(testDirectory, '../../..');
const coordinatorSkillPath = path.join(sourceRoot, '.cline', 'skills', 'mds-coordinator', 'SKILL.md');

const validInfo = [
  '# Demo Project Info',
  '',
  '## Target Users',
  '',
  'Freelancers managing client projects.',
  '',
  '## Product Goals',
  '',
  '- Help freelancers onboard clients faster.',
  '',
  '## Core User Flows',
  '',
  '- sign up and create a workspace',
  '- create a project',
  '',
  '## Must-Include Screens Or Flows',
  '',
  '- Home',
  '- Project detail',
  '',
  '## Data And Backend',
  '',
  '- User accounts/authentication',
  '- Backend database records',
  '',
  '## Release Strategy',
  '',
  '- TestFlight beta',
].join('\n');

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function createProject(name: string): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), name));
  tempDirs.push(projectPath);
  await mkdir(path.join(projectPath, 'project'), { recursive: true });
  await writeFile(path.join(projectPath, 'project', 'info.md'), validInfo, 'utf8');
  return projectPath;
}

function countCheckboxes(todo: string, state: 'x' | ' '): number {
  return (todo.match(new RegExp(`^\\s*- \\[${state}\\]`, 'gm')) ?? []).length;
}

describe('project roadmap generation', () => {
  it('parses common alias headings from GPT-style project docs', () => {
    const sections = parseInfoSections(
      [
        '# Demo Project Info',
        '',
        '## Audience',
        '',
        'Busy parents who need quick meal planning.',
        '',
        '## Core Flows',
        '',
        '- create a weekly meal plan',
        '',
        '## Release Plan',
        '',
        '- TestFlight beta for friends and family',
      ].join('\n')
    );

    expect(sections.targetUsers?.content).toContain('Busy parents');
    expect(sections.coreUserFlows?.content).toContain('weekly meal plan');
    expect(sections.releaseStrategy?.content).toContain('TestFlight beta');
  });

  it('creates an initial phase roadmap for a new project without creating roadmap-state.json', async () => {
    const projectPath = await createProject('mds-roadmap-new-');

    const result = await generateProjectRoadmap(projectPath, { write: true });
    const todoPath = path.join(projectPath, 'project', 'todo.md');
    const todo = await readFile(todoPath, 'utf8');

    expect(result.needsClarification).toBe(false);
    expect(result.proposalOnly).toBe(false);
    expect(result.wrote).toBe(true);
    expect(todo).toContain('## Bug Fixes & Regressions');
    expect(todo).toContain('## Phase 0 — Orientation And Planning');
    expect(todo).toContain('## Phase 1 — App Shell And First Flow');
    expect(todo).toContain('Implement the first core user flow: sign up and create a workspace');
    await expect(access(path.join(projectPath, 'project', 'roadmap-state.json'))).rejects.toThrow();
  });

  it('initializes a missing TODO through the roadmap command', async () => {
    const projectPath = await createProject('mds-roadmap-command-new-');
    const todoPath = path.join(projectPath, 'project', 'todo.md');

    await runRoadmapCommand({ path: projectPath });

    await expect(readFile(todoPath, 'utf8')).resolves.toContain('## Phase 0 — Orientation And Planning');
  });

  it('preserves the restored legacy master roadmap byte-for-byte on repeated default runs', async () => {
    const projectPath = await createProject('mds-roadmap-legacy-');
    const expected = await readFile(legacyTodoFixture, 'utf8');
    const todoPath = path.join(projectPath, 'project', 'todo.md');
    await writeFile(todoPath, expected, 'utf8');

    expect(countCheckboxes(expected, 'x')).toBe(230);
    expect(countCheckboxes(expected, ' ')).toBe(87);
    expect(expected).toContain('https://expo.dev/blog/the-real-cost-of-react-native-animations');
    expect(expected.indexOf('## Sprint 1: Foundation')).toBeLessThan(expected.indexOf('## I^2(Infinite Intelligence)'));

    const first = await generateProjectRoadmap(projectPath, { write: true });
    expect(first.proposalOnly).toBe(true);
    expect(first.wrote).toBe(false);
    expect(await readFile(todoPath, 'utf8')).toBe(expected);

    const second = await generateProjectRoadmap(projectPath, { write: true });
    expect(second.proposalOnly).toBe(true);
    expect(second.wrote).toBe(false);
    expect(await readFile(todoPath, 'utf8')).toBe(expected);
  });

  it('appends only approved new roadmap rows to the explicit target phase and stays idempotent', async () => {
    const projectPath = await createProject('mds-roadmap-append-');
    const todoPath = path.join(projectPath, 'project', 'todo.md');
    const original = [
      '# Existing Project Roadmap',
      '',
      '- [x] Preserve this completed item.',
      '  - Completion: [PR #11](https://github.com/DavidJGrimsley/mrdj-dev-suite/pull/11)',
      '- [ ] Preserve this human-authored item.',
      '',
      '## Bug Fixes & Regressions',
      '',
      '- [ ] [Bug · Origin: Phase 0] Preserve this central bug queue item.',
      '',
      '## Phase 0 — Orientation And Planning',
      '',
      '- [x] Preserve this Phase 0 history.',
      '  - Completion: [commit ea4a62e](https://github.com/DavidJGrimsley/mrdj-dev-suite/commit/ea4a62e402c53e28dc3d2fb2cfdb8e90a4221e9f)',
      '',
      '## Phase 1 — App Shell And First Flow',
      '',
      '## Phase 2 — Data Layer',
      '',
      '## Phase 3 — Complete Product Flows',
      '',
      '## Phase 4 — Polish, Safeguards, And Release',
      '',
    ].join('\n');
    await writeFile(todoPath, original, 'utf8');

    const proposal = await generateProjectRoadmap(projectPath, { write: true });
    expect(proposal.proposalOnly).toBe(true);
    expect(proposal.proposedAdditions.length).toBeGreaterThan(0);
    expect(await readFile(todoPath, 'utf8')).toBe(original);

    const appended = await generateProjectRoadmap(projectPath, {
      write: true,
      append: true,
      targetPhase: 1,
    });
    const afterAppend = await readFile(todoPath, 'utf8');
    expect(appended.wrote).toBe(true);
    expect(afterAppend).toContain('- [ ] [Bug · Origin: Phase 0] Preserve this central bug queue item.');
    expect(afterAppend.indexOf('## Phase 1 — App Shell And First Flow')).toBeLessThan(
      afterAppend.indexOf('Implement the first core user flow: sign up and create a workspace')
    );
    expect(afterAppend.indexOf('Implement the first core user flow: sign up and create a workspace')).toBeLessThan(
      afterAppend.indexOf('## Phase 2 — Data Layer')
    );
    expect(afterAppend.match(/Implement the first core user flow: sign up and create a workspace/g)).toHaveLength(1);

    const rerun = await generateProjectRoadmap(projectPath, {
      write: true,
      append: true,
      targetPhase: 1,
    });
    expect(rerun.wrote).toBe(false);
    expect(await readFile(todoPath, 'utf8')).toBe(afterAppend);
  });

  it('preserves an existing TODO when append has no explicit target phase', async () => {
    const projectPath = await createProject('mds-roadmap-missing-phase-');
    const todoPath = path.join(projectPath, 'project', 'todo.md');
    const original = [
      '# Existing Project Roadmap',
      '',
      '## Bug Fixes & Regressions',
      '',
      '- [ ] [Bug · Origin: Phase 1] Preserve this bug queue item.',
      '',
      '## Phase 0 — Orientation And Planning',
      '',
      '## Phase 1 — App Shell And First Flow',
      '',
      '## Phase 2 — Data Layer',
      '',
      '## Phase 3 — Complete Product Flows',
      '',
      '## Phase 4 — Polish, Safeguards, And Release',
      '',
    ].join('\n');
    await writeFile(todoPath, original, 'utf8');

    const result = await generateProjectRoadmap(projectPath, { write: true, append: true });

    expect(result.proposalOnly).toBe(true);
    expect(result.wrote).toBe(false);
    expect(result.warnings.join('\n')).toContain('--append requires an explicit existing phase number');
    expect(await readFile(todoPath, 'utf8')).toBe(original);
  });

  it('ignores legacy roadmap-state metadata instead of rewriting project memory', async () => {
    const projectPath = await createProject('mds-roadmap-legacy-state-');
    const todoPath = path.join(projectPath, 'project', 'todo.md');
    const statePath = path.join(projectPath, 'project', 'roadmap-state.json');
    const original = '# Existing TODO\n\n- [x] Historical work\n';
    const legacyState = '{ "version": 1, "phases": { "phase-1": { "derivedTaskKeys": [] } } }\n';
    await writeFile(todoPath, original, 'utf8');
    await writeFile(statePath, legacyState, 'utf8');

    const result = await generateProjectRoadmap(projectPath, { write: true });
    expect(result.proposalOnly).toBe(true);
    expect(result.wrote).toBe(false);
    expect(await readFile(todoPath, 'utf8')).toBe(original);
    expect(await readFile(statePath, 'utf8')).toBe(legacyState);
  });

  it('states coordinator completion, ambiguity, and intermediate-branch safeguards explicitly', async () => {
    const skill = await readFile(coordinatorSkillPath, 'utf8');

    expect(skill).toMatch(/Never delete, rewrite, deduplicate, reorder, summarize, or replace an\s+existing TODO item\./);
    expect(skill).toContain('Completion: [PR #N](...)');
    expect(skill).toContain('final-base reachability');
    expect(skill).toContain('intermediate branch');
    expect(skill).toMatch(/If historical evidence is ambiguous, preserve the existing checked item\s+unchanged\./);
    expect(skill).toContain('commit link instead');
    expect(skill).toContain('[Bug · Origin: Phase N]');
    expect(skill).not.toMatch(/\b(?:Wave|Sprint)\b/);
  });
});
