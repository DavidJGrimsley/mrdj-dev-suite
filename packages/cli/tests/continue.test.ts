import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { buildContinueSessionBrief, runContinueCommand } from '../src/commands/continue.js';

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
  process.exitCode = undefined;
});

describe('MDS Continue', () => {
  it('guides users away from parent folders that are not onboarded apps', async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), 'mrdj-continue-parent-'));
    tempDirs.push(parent);

    const brief = await buildContinueSessionBrief(parent);

    expect(brief.isOnboardedApp).toBe(false);
    expect(brief.recommendation.priority).toBe('not-onboarded');
    expect(brief.recommendation.plan.join('\n')).toContain('mrdj continue ./my-app');
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

  it('selects the first unchecked todo when markers, Doctor errors, and git dirt are clear', async () => {
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

    expect(brief.recommendation.priority).toBe('todo');
    expect(brief.nextTodo?.section).toBe('Phase 0: Orientation');
    expect(brief.nextTodo?.text).toBe('Confirm visual direction.');
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
});

async function createOnboardedProject(options: {
  packageJson?: Record<string, unknown>;
  info?: string;
  todo?: string;
  guidelines?: string;
  style?: string;
} = {}): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mrdj-continue-app-'));
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
