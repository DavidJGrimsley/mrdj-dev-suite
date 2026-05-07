import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';

import chalk from 'chalk';

export interface OnboardArgv {
  project?: string;
  yes?: boolean;
  force?: boolean;
  appName?: string;
  audience?: string;
  coreFlows?: string;
  dataNeeds?: string;
  deploymentTarget?: string;
  defaults?: string | string[];
}

interface OnboardAnswers {
  appName: string;
  audience: string;
  coreFlows: string;
  dataNeeds: string;
  deploymentTarget: string;
  defaults: string[];
}

export async function runOnboardCommand(argv: OnboardArgv): Promise<void> {
  const projectPath = path.resolve(argv.project ?? '.');
  const answers = argv.yes ? defaultAnswers(argv) : await collectAnswers(argv);
  const projectDir = path.join(projectPath, 'project');

  await mkdir(projectDir, { recursive: true });

  const written = await Promise.all([
    writeIfAllowed(
      path.join(projectDir, 'info.md'),
      renderInfo(projectPath, answers),
      Boolean(argv.force)
    ),
    writeIfAllowed(path.join(projectDir, 'todo.md'), renderTodo(answers), Boolean(argv.force)),
    writeIfAllowed(path.join(projectDir, 'style.md'), renderStyle(answers), Boolean(argv.force)),
  ]);

  console.log(chalk.bold('mrdj onboard'));
  console.log(chalk.dim(projectPath));
  console.log();
  for (const result of written) {
    console.log(`${result.wrote ? chalk.green('CREATED') : chalk.gray('KEPT')} ${result.filePath}`);
  }
  console.log();
  console.log('Selected defaults:', answers.defaults.join(', '));
  console.log('Next: run mrdj doctor --ci after adding any selected stack pieces.');
}

async function collectAnswers(argv: OnboardArgv): Promise<OnboardAnswers> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const seed = defaultAnswers(argv);
    return {
      appName: argv.appName ?? (await ask(rl, 'App name', seed.appName)),
      audience: argv.audience ?? (await ask(rl, 'Audience', seed.audience)),
      coreFlows: argv.coreFlows ?? (await ask(rl, 'Core flows', seed.coreFlows)),
      dataNeeds: argv.dataNeeds ?? (await ask(rl, 'Data needs', seed.dataNeeds)),
      deploymentTarget:
        argv.deploymentTarget ?? (await ask(rl, 'Deployment target', seed.deploymentTarget)),
      defaults: parseDefaults(argv.defaults, seed.defaults),
    };
  } finally {
    rl.close();
  }
}

async function ask(
  rl: ReturnType<typeof createInterface>,
  label: string,
  fallback: string
): Promise<string> {
  const answer = await rl.question(`${label} (${fallback}): `);
  return answer.trim() || fallback;
}

function defaultAnswers(argv: OnboardArgv): OnboardAnswers {
  return {
    appName: argv.appName ?? path.basename(path.resolve(argv.project ?? '.')),
    audience: argv.audience ?? 'Expo app users',
    coreFlows: argv.coreFlows ?? 'Onboarding, primary app workflow, settings',
    dataNeeds: argv.dataNeeds ?? 'Local state first; add backend only when needed',
    deploymentTarget: argv.deploymentTarget ?? 'Expo web/native deployment',
    defaults: parseDefaults(argv.defaults, ['project-docs', 'uniwind', 'doctor']),
  };
}

function parseDefaults(value: string | string[] | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  const raw = Array.isArray(value) ? value : value.split(',');
  const parsed = raw.map((item) => item.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

async function writeIfAllowed(
  filePath: string,
  contents: string,
  force: boolean
): Promise<{ filePath: string; wrote: boolean }> {
  if (!force && (await fileExists(filePath))) {
    return { filePath, wrote: false };
  }

  await writeFile(filePath, contents, 'utf8');
  return { filePath, wrote: true };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function renderInfo(projectPath: string, answers: OnboardAnswers): string {
  return [
    `# ${answers.appName} Project Info`,
    '',
    '## Purpose',
    '',
    `Build an Expo app for ${answers.audience}.`,
    '',
    '## Core Flows',
    '',
    answers.coreFlows,
    '',
    '## Data Needs',
    '',
    answers.dataNeeds,
    '',
    '## Deployment Target',
    '',
    answers.deploymentTarget,
    '',
    '## MrDJ Defaults',
    '',
    answers.defaults.map((item) => `- ${item}`).join('\n'),
    '',
    `Source project: ${projectPath}`,
    '',
  ].join('\n');
}

function renderTodo(answers: OnboardAnswers): string {
  return [
    `# ${answers.appName} TODO`,
    '',
    '## Onboarding',
    '',
    '- [ ] Confirm app purpose, audience, and primary flows.',
    '- [ ] Add selected MrDJ defaults.',
    '- [ ] Run `mrdj doctor --ci` and address errors.',
    '',
    '## Build',
    '',
    '- [ ] Implement core flows.',
    '- [ ] Add data layer only where the product needs it.',
    '- [ ] Verify deployment target assumptions.',
    '',
  ].join('\n');
}

function renderStyle(answers: OnboardAnswers): string {
  return [
    `# ${answers.appName} Style`,
    '',
    '- Keep Expo Router route files thin.',
    '- Prefer Uniwind and Tailwind v4 for new styling work.',
    '- Use Zustand only when shared state is genuinely needed.',
    '- Keep private env vars server-side and never expose secrets with `EXPO_PUBLIC_`.',
    '- Run Doctor before pushing.',
    '',
  ].join('\n');
}

