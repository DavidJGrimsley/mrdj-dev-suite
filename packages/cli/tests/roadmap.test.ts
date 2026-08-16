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
    expect(todo).toContain('Confirm the Phase 0 component strategy in `project/info.md`');
    expect(todo).toContain('Browse exposition pages to understand the included starter flows');
    expect(todo).toContain("Review styling in the 'Stylist' page");
    expect(todo).toContain('Run or defer `eject-stylist`');
    expect(todo).toContain('Review the ejection inventory with `mds eject`');
    expect(todo).toContain('Run `mds eject` and keep only the generated sections you want to retain');
    expect(todo).toContain('Run `mds report --kind content`');
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

  it('replaces the blocked onboarding scaffold after info markers are resolved', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-roadmap-resolved-scaffold-'));
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
        'Scientists and people learning how to conduct experiments.',
        '',
        '## Product Goals',
        '',
        'Track and manage experiments effectively.',
        '',
        '## First User Flow',
        '',
        '- Create an experiment',
        '',
        '## Core Flows and Features',
        '',
        '- Track multiple experiments with hypotheses, procedures, data, and results.',
        '- View and edit existing experiments.',
        '- Add pictures and notes to experiments.',
        '',
        '## Screens',
        '',
        '- New',
        '- Track',
        '- Settings',
        '',
        '## Platforms',
        '',
        '- Target platforms: ios, android',
        '- First MVP platform: ios',
        '',
        '## Monetization Strategy',
        '',
        'No monetization planned for the MVP.',
        '',
        '## Tech Stack & CESS Onboarding',
        '',
        '- Expo Router app directory: `src/app`',
        '- Platform layout mode: shared layouts',
        '- Web output: none',
        '- Starting Data mode: local dummy data with Expo SQLite.',
        '- EAS: Yes',
        '- EAS Usage: Building mobile apps',
        '- Deployed server: no deployed server planned',
        '- Initial Deployment plan: App Store',
        '- Use test-to-main safeguards: Yes',
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'todo.md'),
      [
        '# Experimental TODO',
        '',
        '## Phase 0: Orientation And Planning',
        '',
        '- [ ] Browse exposition pages to understand included base packages.',
        "- [ ] Review styling in the 'Stylist' page.",
        '- [ ] Review `project/` files for accuracy and planning adjustments.',
        '- [ ] Run or defer `eject-stylist`; mark this todo done after ejection or deciding to defer (if you want to keep the stylist around for tinkering).',
        '- [ ] Run `mds eject exposition` and keep only the generated sections you want to retain.',
        '- [ ] Resolve every `# TodoForContext(optional):` marker in `project/info.md` by filling the section underneath or deleting the marker line to acknowledge no extra context is needed.',
        '- [ ] Confirm visual direction in `project/style.md` after using the Stylist page.',
        '- [ ] After the `project/info.md` markers are resolved, refresh the agent-derived roadmap from `project/info.md` and review it for accuracy.',
        '- [ ] Keep or prune included package examples after reviewing `/exposition`.',
        '- [ ] Remove exposition pages before production once their lessons are absorbed.',
        '',
        '## Phase 1: App Shell And First Flow',
        '',
        '- [ ] Establish the app shell and first implementation-ready route in `src/app`.',
        '- [ ] Implement the first concrete product flow from `project/info.md` and the roadmap.',
        '',
        '## Phase 2: Data Layer',
        '',
        '- [ ] Implement the initial data layer using local dummy data with Expo SQLite.',
        '',
        '## Phase 3: Complete Product Flows',
        '',
        '- [ ] Build the remaining core flows from `project/info.md` phase by phase.',
        '- [ ] Adapt the working MVP flow for the remaining target platforms after the primary flow is stable.',
        '',
        '## Phase 4: Polish, Safeguards, And Release',
        '',
        '- [ ] Run `mds doctor --ci` and address errors.',
        '- [ ] Follow `project/release-flow.md` for test-to-main development.',
        '- [ ] Complete the one-time GitHub repo setup from `project/release-flow.md` so `test` and `main` are protected correctly.',
        '- [ ] Add GitHub branch protection so PR checks pass before merging into `test` or `main`.',
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
    expect(todo).toContain('Implement the first core user flow: Create an experiment');
    expect(todo).toContain('Adapt the working MVP flow for the remaining target platforms after the primary flow is stable: android');
    expect(todo).toContain('Configure EAS for Building mobile apps');
    expect(todo).not.toContain('Resolve every `# TodoForContext(optional):` marker');
    expect(todo).not.toContain('Browse exposition pages to understand included base packages.');
    expect(todo).not.toContain('Implement the first concrete product flow from `project/info.md` and the roadmap.');
    expect(todo).not.toContain('Build the remaining core flows from `project/info.md` phase by phase.');
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

  it('derives a full roadmap from experiment-tracker style info without generic release clarification', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-roadmap-experiment-tracker-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'app', 'exposition'), { recursive: true });
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist.tsx'), 'export default null;\n', 'utf8');
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      [
        '# Experimental Project Info',
        '',
        '## App Name',
        'Experimental',
        '',
        '## Overview',
        '',
        'Build an Expo app for Scientists and people learning how to conduct experiments. Deliver a top class simple app that aids in experimentation without slowing work down.',
        '',
        '## Target Users',
        '',
        'Scientists and people learning how to conduct experiments',
        '',
        '## Problem this app solves',
        "There's no good way to track experiment data on the go.",
        '',
        '## Product Goals',
        '',
        'Provide a way for other scientists and I to track and manage our experiments effectively.',
        '',
        '## Non-Goals',
        '',
        'Ways to actually conduct experiments, analyze data, or collaborate with other scientists.',
        '',
        '## First User Flow',
        '',
        'Create an experiment',
        '',
        '## Core Flows and Features',
        '',
        '- Track multiple experiments, each with its own hypothesis, procedure, data collection, and results.',
        '- View and edit existing experiments',
        '- Add pictures and notes to experiments',
        '- Organize experiments into folders or categories',
        '- Search and filter experiments',
        '',
        '## Screens',
        '',
        '- New (create new experiment)',
        '- Track (list of past experiments)',
        '- Settings',
        '',
        '## Monetization Strategy',
        '',
        'Will consider applying for grants to fund development and maintenance, but no monetization planned for the MVP.',
        '',
        '## Team Context',
        '',
        'Solo dev',
        '',
        '## Later Scope & Possibilities',
        '',
        'Voice notes transcribed into text for hands free documenting. Tripod support. Multiple device data sync.',
        '',
        '## Research, Notes, and References',
        '',
        'There are a lot of science students wanting to conduct experiments.',
        '',
        '# Tech Stack & CESS Onboarding',
        '',
        '- TypeScript: Yes',
        '- Package Manager: npm',
        '- Navigation: Expo Router',
        '- Type of Navigation: Drawer + Tabs',
        '- Expo Router app directory: src/app',
        '- Platform-specific organization: platform-specific files only',
        '- Platform layout mode: shared layouts',
        '- Web output: none',
        '- Style Library: NativeWindUI',
        '- Which NativeWindUI components: All',
        '- Components from create-expo-app: Yes',
        '- Expo UI: Yes',
        '- Expo UI Universal components: Yes',
        '- Expo Native Tabs: Yes',
        '- Which Software Mansion packages: All',
        '- State management library: None',
        '- Auth: None',
        '- Data Categories: Local UI/app state, File/image uploads or storage',
        '- Starting Data mode: local dummy data with Expo SQLite.',
        '- Internationalization: None',
        '- Analytics: None',
        '- EAS: Yes',
        '- EAS Usage: building mobile applications',
        '- Deployed server: no deployed server planned',
        '- Initial Deployment plan: App Store',
        '- Start with MDS project guidelines template: Yes',
        '- Use test-to-main safeguards: Yes',
      ].join('\n'),
      'utf8'
    );

    const result = await generateProjectRoadmap(projectPath, {
      write: true,
      preserveStatus: true,
    });

    const todo = await readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8');
    expect(result.blockedByMarkers).toBe(false);
    expect(result.needsClarification).toBe(false);
    expect(result.wrote).toBe(true);
    expect(todo).toContain('Sign in and set up EAS in the terminal');
    expect(todo).toContain('Implement the initial data layer using local dummy data with Expo SQLite');
    expect(todo).toContain('Prepare store/distribution packaging, review notes, and release validation');
    expect(todo).not.toContain('Resolve every `# TodoForContext(optional):` marker');
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
