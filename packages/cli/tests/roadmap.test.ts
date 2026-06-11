import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { generateProjectRoadmap, parseInfoSections } from '../src/roadmap.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

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
        '- build a shopping list',
        '',
        '## Screens',
        '',
        '- Home',
        '- Recipe detail',
        '',
        '## Release Plan',
        '',
        '- TestFlight beta for friends and family',
      ].join('\n')
    );

    expect(sections.targetUsers?.content).toContain('Busy parents');
    expect(sections.coreUserFlows?.content).toContain('weekly meal plan');
    expect(sections.mustIncludeScreensOrFlows?.content).toContain('Recipe detail');
    expect(sections.releaseStrategy?.content).toContain('TestFlight beta');
  });

  it('creates a roadmap and state file when project/todo.md does not exist yet', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-roadmap-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      [
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
      ].join('\n'),
      'utf8'
    );

    const result = await generateProjectRoadmap(projectPath, {
      write: true,
      preserveStatus: true,
    });

    expect(result.needsClarification).toBe(false);
    expect(result.wrote).toBe(true);
    const todo = await readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8');
    const roadmapState = await readFile(path.join(projectPath, 'project', 'roadmap-state.json'), 'utf8');
    expect(todo).toContain('## Phase 1: App Shell And First Flow');
    expect(todo).toContain('Implement the first core user flow: sign up and create a workspace');
    expect(todo).not.toContain('MDS_DERIVED_PHASE_');
    expect(roadmapState).toContain('phase-1');
  });

  it('restores rich super-stack planning tasks instead of a tiny generic todo', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-roadmap-super-stack-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'app', 'exposition'), { recursive: true });
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist.tsx'), 'export default null;\n', 'utf8');
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      [
        '# Experimental Project Info',
        '',
        '## Target Users',
        '',
        'Scientists and students tracking experiments on the go.',
        '',
        '## Product Goals',
        '',
        '- Capture hypotheses, procedures, results, notes, and photos quickly.',
        '',
        '## First User Flow',
        '',
        'Create a new experiment with a hypothesis, procedure, and notes, then save it locally.',
        '',
        '## Core Flows and Features',
        '',
        '- Create a new experiment.',
        '- View and edit experiment details.',
        '- Attach notes and images.',
        '',
        '## Screens',
        '',
        '- New',
        '- Track',
        '- Settings',
        '',
        '## Platforms',
        '',
        '- Target platforms: iOS, Android',
        '- First MVP platform: iOS',
        '- Routes live under `src/app`.',
        '- Use shared layouts.',
        '',
        '## Monetization Strategy',
        '',
        'No monetization is planned for the MVP.',
        '',
        '## Release Strategy',
        '',
        '- Ship an iOS TestFlight beta first.',
        '- Keep Android build-ready for follow-up.',
        '',
        '## Tech Stack & CESS Onboarding',
        '',
        '- Starting Data mode: local dummy data with Expo SQLite.',
        '- EAS: Yes',
        '- EAS Usage: building mobile applications, publishing mobile applications',
        '- Web output: none',
        '- Deployed server: no deployed server planned',
        '- Use test-to-main safeguards: Yes',
        '- Expo Router app directory: `src/app`',
      ].join('\n'),
      'utf8'
    );

    const result = await generateProjectRoadmap(projectPath, {
      write: true,
      preserveStatus: true,
    });

    const todo = await readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8');
    expect(result.needsClarification).toBe(false);
    expect(todo).toContain('Browse exposition pages to understand the included starter flows');
    expect(todo).toContain("Review styling in the 'Stylist' page");
    expect(todo).toContain('Run or defer `eject-stylist`');
    expect(todo).toContain('Run `mds eject exposition`');
    expect(todo).toContain('Sign in and set up EAS in the terminal');
    expect(todo).toContain('Establish the app shell and first implementation-ready route in src/app');
    expect(todo).toContain('Implement the initial data layer using local dummy data with Expo SQLite');
    expect(todo).toContain('Configure EAS for building mobile applications');
    expect(todo).toContain('Follow `project/release-flow.md` for test-to-main development');
    expect(todo).not.toContain('Validate the production web/server hosting path, environment ownership, and rollout checklist');
  });

  it('blocks roadmap generation while unresolved TodoForContext markers remain', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-roadmap-blocked-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      [
        '# Demo Project Info',
        '',
        '## Product Goals',
        '',
        '# TodoForContext(optional): Add product outcomes.',
        '',
        '## Core User Flows',
        '',
        '- sign up',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'todo.md'),
      [
        '# Demo TODO',
        '',
        '## Phase 0: Orientation And Planning',
        '',
        '- [ ] Resolve markers first.',
        '',
      ].join('\n'),
      'utf8'
    );

    const result = await generateProjectRoadmap(projectPath, {
      write: true,
      preserveStatus: true,
    });

    expect(result.blockedByMarkers).toBe(true);
    expect(result.wrote).toBe(false);
    expect(result.phases).toEqual([]);
    expect(result.markerHits[0]?.file).toBe('project/info.md');
    const todo = await readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8');
    expect(todo).not.toContain('Implement the first core user flow: sign up');
  });

  it('does not block roadmap generation when only non-info project docs still have context markers', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-roadmap-style-markers-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      [
        '# Demo Project Info',
        '',
        '## Target Users',
        '',
        'Scientists tracking lab experiments.',
        '',
        '## Product Goals',
        '',
        '- Keep experiment records organized.',
        '',
        '## Core User Flows',
        '',
        '- create an experiment',
        '',
        '## Release Strategy',
        '',
        '- App Store beta',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'style.md'),
      [
        '# Demo Style',
        '',
        '## Visual Direction',
        '',
        '# TodoForContext(optional): Add visual references later.',
      ].join('\n'),
      'utf8'
    );

    const result = await generateProjectRoadmap(projectPath, {
      write: true,
      preserveStatus: true,
    });

    expect(result.blockedByMarkers).toBe(false);
    expect(result.needsClarification).toBe(false);
    expect(result.phases.some((phase) => phase.tasks.some((task) => task.text.includes('create an experiment')))).toBe(
      true
    );
  });

  it('returns clarification questions instead of fake derived tasks for generic project info', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-roadmap-generic-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      [
        '# Demo Project Info',
        '',
        '## Target Users',
        '',
        'Expo app users',
        '',
        '## Product Goals',
        '',
        'Help users.',
        '',
        '## Core User Flows',
        '',
        'Agent should derive the first core user flows from project/info.md during intake.',
        '',
        '## Release Strategy',
        '',
        '- Deployment plan: Expo web/native deployment',
      ].join('\n'),
      'utf8'
    );

    const result = await generateProjectRoadmap(projectPath, {
      write: true,
      preserveStatus: true,
    });

    expect(result.needsClarification).toBe(true);
    expect(result.wrote).toBe(false);
    expect(result.phases).toEqual([]);
    expect(result.clarificationQuestions.map((question) => question.id)).toContain('core-user-flows');
    expect(result.confidenceWarnings.length).toBeGreaterThan(0);
  });

  it('accepts the new tech-stack deployment plan as release clarification input', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-roadmap-techstack-release-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      [
        '# Demo Project Info',
        '',
        '## Target Users',
        '',
        'Field researchers logging observations from mobile devices.',
        '',
        '## Product Goals',
        '',
        '- Capture structured experiment notes quickly.',
        '',
        '## First User Flow',
        '',
        'Create a new experiment and save it locally.',
        '',
        '## Tech Stack & CESS Onboarding',
        '',
        '- Initial Deployment plan: Ship an iOS TestFlight beta, then prepare an App Store launch.',
        '- EAS Usage: building mobile applications',
      ].join('\n'),
      'utf8'
    );

    const result = await generateProjectRoadmap(projectPath, {
      write: true,
      preserveStatus: true,
    });

    expect(result.needsClarification).toBe(false);
    expect(result.clarificationQuestions).toEqual([]);
  });

  it('preserves matching checkbox state and user-authored tasks on rerun with roadmap state', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-roadmap-rerun-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      [
        '# Demo Project Info',
        '',
        '## Target Users',
        '',
        'Independent creators selling digital downloads.',
        '',
        '## Product Goals',
        '',
        '- Reduce checkout friction.',
        '',
        '## Core User Flows',
        '',
        '- sign up',
        '- create a storefront',
        '',
        '## Must-Include Screens Or Flows',
        '',
        '- Home',
        '- Storefront detail',
        '',
        '## Data And Backend',
        '',
        '- User accounts/authentication',
        '- Backend database records',
        '',
        '## Release Strategy',
        '',
        '- web hosting on a temp VPS domain',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'todo.md'),
      [
        '# Demo TODO',
        '',
        '## Phase 0: Orientation And Planning',
        '',
        '- [ ] Review `project/` files for accuracy.',
        '',
        '## Phase 1: App Shell And First Flow',
        '',
        '- [ ] Static phase task',
        '- [x] Implement the first core user flow: sign up.',
        '- [ ] User-authored note that should stay put.',
        '',
        '## Phase 2: Data Layer',
        '',
        '## Phase 3: Complete Product Flows',
        '',
        '## Phase 4: Polish, Safeguards, And Release',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'roadmap-state.json'),
      JSON.stringify(
        {
          version: 1,
          phases: {
            'phase-0': { derivedTaskKeys: [] },
            'phase-1': { derivedTaskKeys: ['implement the first core user flow sign up'] },
            'phase-2': { derivedTaskKeys: [] },
            'phase-3': { derivedTaskKeys: [] },
            'phase-4': { derivedTaskKeys: [] },
          },
        },
        null,
        2
      ),
      'utf8'
    );

    const result = await generateProjectRoadmap(projectPath, {
      write: true,
      preserveStatus: true,
    });

    const todo = await readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8');
    expect(result.preservedStatuses).toBeGreaterThan(0);
    expect(todo).toContain('- [x] Implement the first core user flow: sign up');
    expect(todo).toContain('User-authored note that should stay put.');
    expect(todo).toContain(
      'Validate the production web/server hosting path, environment ownership, and rollout checklist'
    );
    expect(todo).not.toContain('MDS_DERIVED_PHASE_');
  });
});
