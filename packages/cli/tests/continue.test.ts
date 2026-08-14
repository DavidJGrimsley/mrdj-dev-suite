import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildContinueSessionBrief,
  renderContinueSessionBrief,
  runContinueCommand,
} from '../src/commands/continue.js';
import { parseExpoVersionsCatalog, type ExpoVersionsCatalog } from '../src/expo-sdk-state.js';

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
  process.exitCode = undefined;
});

describe('MDS Continue', () => {
  it('guides users away from parent folders that are not onboarded apps', async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), 'mds-continue-parent-'));
    tempDirs.push(parent);

    const brief = await buildContinueSessionBrief(parent);

    expect(brief.isOnboardedApp).toBe(false);
    expect(brief.recommendation.priority).toBe('not-onboarded');
    expect(brief.recommendation.plan.join('\n')).toContain('mds continue ./my-app');
    expect(brief.handoff).toContain('lower token usage and lower cost');
  });

  it('prioritizes unresolved TodoForContext markers', async () => {
    const projectPath = await createOnboardedProject({
      info: '# Info\n\n# TodoForContext(optional): Add product goals.\n',
      guidelines: '# Guidelines\n\n- The string `# TodoForContext(optional):` marks unresolved sections.\n',
      todo: '# Todo\n\n- [ ] Resolve every `# TodoForContext(optional):` marker.\n\n## Phase 1\n\n- [ ] Build the shell.\n',
    });

    const brief = await buildContinueSessionBrief(projectPath);

    expect(brief.todoForContext.count).toBe(1);
    expect(brief.todoForContext.hits[0]?.file).toBe('project/info.md');
    expect(brief.recommendation.priority).toBe('todo-for-context');
  });

  it('prioritizes Doctor errors after markers are resolved', async () => {
    const projectPath = await createOnboardedProject({
      packageJson: {
        name: 'doctor-error-app',
        scripts: {
          lint: 'node missing-script-target.js',
        },
      },
      todo: '# Todo\n\n## Phase 1\n\n- [ ] Build the shell.\n',
    });

    const brief = await buildContinueSessionBrief(projectPath);

    expect(brief.todoForContext.count).toBe(0);
    expect(brief.doctor?.summary.errors).toBeGreaterThan(0);
    expect(brief.recommendation.priority).toBe('doctor-errors');
  });

  it('prioritizes dirty git state after Doctor errors are clear', async () => {
    const projectPath = await createOnboardedProject({
      todo: '# Todo\n\n## Phase 1\n\n- [ ] Build the shell.\n',
    });
    await execFileAsync('git', ['init'], { cwd: projectPath, windowsHide: true });

    const brief = await buildContinueSessionBrief(projectPath);

    expect(brief.doctor?.summary.errors).toBe(0);
    expect(brief.git.available).toBe(true);
    expect(brief.git.clean).toBe(false);
    expect(brief.recommendation.priority).toBe('dirty-git');
  });

  it('does not report clean git state when git metadata is unavailable', async () => {
    const projectPath = await createOnboardedProject({
      todo: '# Todo\n\n## Phase 1\n\n- [ ] Build the shell.\n',
    });

    const brief = await buildContinueSessionBrief(projectPath);

    expect(brief.git.available).toBe(false);
    expect(brief.git.clean).toBe(false);
    expect(brief.recommendation.priority).toBe('todo');
  });

  it('hard-stops with user guidance when the next unchecked item is in Phase 0', async () => {
    const projectPath = await createOnboardedProject({
      todo: [
        '# Todo',
        '',
        '## Phase 0: Orientation',
        '',
        '- [x] Read project memory.',
        '- [ ] Confirm visual direction.',
        '',
        '## Phase 1: App Shell',
        '',
        '- [ ] Build the app shell.',
        '',
      ].join('\n'),
    });

    const brief = await buildContinueSessionBrief(projectPath);

    expect(brief.recommendation.priority).toBe('phase-0-user-review');
    expect(brief.nextTodo?.section).toBe('Phase 0: Orientation');
    expect(brief.nextTodo?.text).toBe('Confirm visual direction.');
    expect(brief.recommendation.plan[0]).toContain('Phase 0 is not agent work');
  });

  it('continues normal todo recommendations for non-Phase-0 items', async () => {
    const projectPath = await createOnboardedProject({
      todo: [
        '# Todo',
        '',
        '## Phase 1: App Shell',
        '',
        '- [ ] Build the app shell.',
        '',
      ].join('\n'),
    });

    const brief = await buildContinueSessionBrief(projectPath);

    expect(brief.recommendation.priority).toBe('todo');
    expect(brief.nextTodo?.section).toBe('Phase 1: App Shell');
    expect(brief.nextTodo?.text).toBe('Build the app shell.');
    expect(brief.recommendation.plan.join('\n')).not.toContain('animation-motion');
  });

  it('routes motion todos into the animation skill, guide, and refactor plan flow', async () => {
    const projectPath = await createOnboardedProject({
      todo: [
        '# Todo',
        '',
        '## Phase 2: Polish',
        '',
        '- [ ] Fix jarring animations throughout the app.',
        '',
      ].join('\n'),
    });

    const brief = await buildContinueSessionBrief(projectPath);
    const plan = brief.recommendation.plan.join('\n');

    expect(brief.recommendation.priority).toBe('todo');
    expect(plan).toContain('animation-motion');
    expect(plan).toContain('animation-performance');
    expect(plan).toContain('generate_refactor_plan');
    expect(plan).toContain('focus: "animation"');
    expect(plan).toContain('parallax/scroll-linked');
  });

  it('mentions parallax explicitly when the next todo is parallax-focused', async () => {
    const projectPath = await createOnboardedProject({
      todo: [
        '# Todo',
        '',
        '## Phase 3: Landing Motion',
        '',
        '- [ ] Make the parallax hero smoother on web and mobile.',
        '',
      ].join('\n'),
    });

    const brief = await buildContinueSessionBrief(projectPath);
    const plan = brief.recommendation.plan.join('\n');

    expect(brief.recommendation.priority).toBe('todo');
    expect(brief.nextTodo?.text).toContain('parallax hero');
    expect(plan).toContain('parallax/scroll-linked');
    expect(plan).toContain('/review-motion');
  });

  it('prints JSON for agent/tool usage', async () => {
    const projectPath = await createOnboardedProject({
      todo: '# Todo\n\n## Phase 1\n\n- [ ] Build the shell.\n',
    });
    const output = await captureConsole(async () => {
      await runContinueCommand({ path: projectPath, json: true });
    });

    const parsed = JSON.parse(output) as Awaited<ReturnType<typeof buildContinueSessionBrief>>;
    expect(parsed.projectPath).toBe(path.resolve(projectPath));
    expect(parsed.recommendation.requiresApproval).toBe(true);
    expect(parsed.handoff).toContain('lower token usage and lower cost');
  });

  it('routes behind Expo SDK state to the official upgrade skill instead of a stale todo', async () => {
    const projectPath = await createOnboardedProject({
      packageJson: {
        name: 'sdk-behind-app',
        dependencies: {
          expo: '~56.0.19',
          'react-native': '0.85.3',
        },
      },
      todo: [
        '# Todo',
        '',
        '## Phase 1: App Shell',
        '',
        '- [ ] Build the app shell.',
        '',
      ].join('\n'),
    });

    const brief = await buildContinueSessionBrief(projectPath, {
      resolveExpoVersions: async () => STABLE_57_CATALOG,
    });
    const plan = brief.recommendation.plan.join('\n');

    expect(brief.expoSdk?.status).toBe('behind');
    expect(brief.expoSdk?.officialSkill).toBe('upgrading-expo');
    expect(brief.nextTodo?.text).toBe('Build the app shell.');
    expect(brief.recommendation.priority).toBe('expo-sdk-upgrade');
    expect(brief.recommendation.title).toContain('56 → 57');
    expect(plan).toContain('upgrading-expo');
    expect(plan).toContain('Do not call MDS `get_skill` for an upgrade skill');
    expect(plan).toContain('Phase 1: App Shell - Build the app shell.');
    expect(plan).not.toContain('npx expo install');
    expect(renderContinueSessionBrief(brief)).toContain('Expo SDK: 56 (latest stable 57; behind)');
  });

  it('does not route independent Expo package versions as an SDK upgrade', async () => {
    const projectPath = await createOnboardedProject({
      packageJson: {
        name: 'sdk-current-router-app',
        dependencies: {
          expo: '~57.0.12',
          'expo-router': '~6.0.18',
          'react-native': '0.86.2',
        },
      },
      todo: '# Todo\n\n## Phase 1\n\n- [ ] Build the shell.\n',
    });

    const brief = await buildContinueSessionBrief(projectPath, {
      resolveExpoVersions: async () => STABLE_57_CATALOG,
    });

    expect(brief.expoSdk?.status).toBe('current');
    expect(brief.recommendation.priority).toBe('todo');
  });

  it('keeps current SDK projects on the next todo', async () => {
    const projectPath = await createOnboardedProject({
      packageJson: {
        name: 'sdk-current-app',
        dependencies: {
          expo: '~57.0.12',
          'react-native': '0.86.2',
        },
      },
      todo: [
        '# Todo',
        '',
        '## Phase 1: App Shell',
        '',
        '- [ ] Build the app shell.',
        '',
      ].join('\n'),
    });

    const brief = await buildContinueSessionBrief(projectPath, {
      resolveExpoVersions: async () => STABLE_57_CATALOG,
    });

    expect(brief.expoSdk?.status).toBe('current');
    expect(brief.recommendation.priority).toBe('todo');
    expect(brief.nextTodo?.text).toBe('Build the app shell.');
  });

  it('does not override todos when no expo dependency is present', async () => {
    const projectPath = await createOnboardedProject({
      todo: '# Todo\n\n## Phase 1\n\n- [ ] Build the shell.\n',
    });

    it('blocks stale todo selection when the official Expo catalog is unavailable', async () => {
      const projectPath = await createOnboardedProject({
        packageJson: {
          name: 'sdk-catalog-unavailable-app',
          dependencies: { expo: '~56.0.19' },
        },
        todo: '# Todo\n\n## Phase 1\n\n- [ ] Build the shell.\n',
      });

      const brief = await buildContinueSessionBrief(projectPath, {
        resolveExpoVersions: async () => null,
      });

      expect(brief.expoSdk?.status).toBe('unavailable');
      expect(brief.recommendation.priority).toBe('expo-sdk-upgrade');
      expect(brief.recommendation.plan.join('\n')).toContain('upgrading-expo');
      expect(brief.recommendation.plan.join('\n')).toContain('could not be compared');
    });

    const brief = await buildContinueSessionBrief(projectPath, {
      resolveExpoVersions: async () => STABLE_57_CATALOG,
    });

    expect(brief.expoSdk).toBeNull();
    expect(brief.recommendation.priority).toBe('todo');
  });

  it('keeps hygiene gates ahead of an Expo SDK upgrade', async () => {
    const markerProject = await createOnboardedProject({
      packageJson: { name: 'marker-app', dependencies: { expo: '~56.0.19' } },
      info: '# Info\n\n# TodoForContext(optional): Add product goals.\n',
      todo: '# Todo\n\n## Phase 1\n\n- [ ] Build the shell.\n',
    });
    const doctorProject = await createOnboardedProject({
      packageJson: {
        name: 'doctor-error-upgrade-app',
        dependencies: { expo: '~56.0.19' },
        scripts: { lint: 'node missing-script-target.js' },
      },
      todo: '# Todo\n\n## Phase 1\n\n- [ ] Build the shell.\n',
    });
    const dirtyProject = await createOnboardedProject({
      packageJson: { name: 'dirty-upgrade-app', dependencies: { expo: '~56.0.19' } },
      todo: '# Todo\n\n## Phase 1\n\n- [ ] Build the shell.\n',
    });
    await execFileAsync('git', ['init'], { cwd: dirtyProject, windowsHide: true });
    const phase0Project = await createOnboardedProject({
      packageJson: { name: 'phase0-upgrade-app', dependencies: { expo: '~56.0.19' } },
      todo: [
        '# Todo',
        '',
        '## Phase 0: Orientation',
        '',
        '- [ ] Confirm visual direction.',
        '',
      ].join('\n'),
    });

    const resolveExpoVersions = async () => STABLE_57_CATALOG;
    const markerBrief = await buildContinueSessionBrief(markerProject, { resolveExpoVersions });
    const doctorBrief = await buildContinueSessionBrief(doctorProject, { resolveExpoVersions });
    const dirtyBrief = await buildContinueSessionBrief(dirtyProject, { resolveExpoVersions });
    const phase0Brief = await buildContinueSessionBrief(phase0Project, { resolveExpoVersions });

    expect(markerBrief.recommendation.priority).toBe('todo-for-context');
    expect(doctorBrief.recommendation.priority).toBe('doctor-errors');
    expect(dirtyBrief.recommendation.priority).toBe('dirty-git');
    expect(dirtyBrief.recommendation.plan.join('\n')).toContain('upgrading-expo');
    expect(phase0Brief.recommendation.priority).toBe('phase-0-user-review');
  });

  it('includes expoSdk in JSON output when Expo is declared', async () => {
    const projectPath = await createOnboardedProject({
      packageJson: { name: 'json-upgrade-app', dependencies: { expo: '~56.0.19' } },
      todo: '# Todo\n\n## Phase 1\n\n- [ ] Build the shell.\n',
    });
    const output = await captureConsole(async () => {
      await runContinueCommand({ path: projectPath, json: true });
    });
    const parsed = JSON.parse(output) as Awaited<ReturnType<typeof buildContinueSessionBrief>>;

    expect(parsed.expoSdk).toEqual(
      expect.objectContaining({
        detectedMajor: 56,
        status: 'unknown',
        officialSkill: 'upgrading-expo',
      })
    );
  });
});

const STABLE_57_CATALOG = parseExpoVersionsCatalog({
  sdkVersions: {
    '56.0.0': { expoVersion: '~56.0.19', facebookReactNativeVersion: '0.85.3' },
    '57.0.0': { expoVersion: '~57.0.12', facebookReactNativeVersion: '0.86.2' },
  },
}) as ExpoVersionsCatalog;

async function createOnboardedProject(options: {
  packageJson?: Record<string, unknown>;
  info?: string;
  todo?: string;
  guidelines?: string;
  style?: string;
} = {}): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-continue-app-'));
  tempDirs.push(projectPath);
  await mkdir(path.join(projectPath, 'project'), { recursive: true });
  await writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify(options.packageJson ?? { name: 'continue-app', scripts: {} }, null, 2),
    'utf8'
  );
  await writeFile(path.join(projectPath, 'project', 'info.md'), options.info ?? '# Info\n', 'utf8');
  await writeFile(path.join(projectPath, 'project', 'todo.md'), options.todo ?? '# Todo\n', 'utf8');
  await writeFile(
    path.join(projectPath, 'project', 'guidelines.md'),
    options.guidelines ?? '# Guidelines\n',
    'utf8'
  );
  await writeFile(path.join(projectPath, 'project', 'style.md'), options.style ?? '# Style\n', 'utf8');
  return projectPath;
}

async function captureConsole(action: () => Promise<void>): Promise<string> {
  const originalLog = console.log;
  let output = '';
  console.log = (value?: unknown) => {
    output += `${String(value ?? '')}\n`;
  };

  try {
    await action();
    return output.trim();
  } finally {
    console.log = originalLog;
  }
}
