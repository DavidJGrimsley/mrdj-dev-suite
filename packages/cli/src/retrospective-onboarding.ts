import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { discoverWorkspace } from './workspace/discover.js';

export interface RetrospectiveOnboardingEvidence {
  appName: string;
  packageManager: string;
  packageName?: string;
  readmeTitle?: string;
  readmeSummary: string[];
  scripts: string[];
  dependencies: string[];
  routeDirectory?: 'src' | 'root';
  routes: string[];
  configFiles: string[];
  dataBackendFiles: string[];
  localBranches: string[];
  recentCommits: string[];
  mergeCommits: string[];
  inferredDataNeeds: string[];
  inferredAuthProvider: string;
}

export interface RetrospectiveOnboardingPlan {
  appPath: string;
  projectPath: string;
  workspaceRoot?: string;
  evidenceSources: string[];
  legacyProjectMemoryFound: boolean;
  files: Array<{
    path: string;
    exists: boolean;
    willWrite: boolean;
  }>;
  evidence: RetrospectiveOnboardingEvidence;
}

export interface RetrospectiveOnboardingOptions {
  projectPath?: string;
  legacyProjectMemoryFound?: boolean;
}

const REQUIRED_PROJECT_MEMORY_FILES = [
  'info.md',
  'todo.md',
  'style.md',
  'guidelines.md',
  'intake-agent.md',
  'onboarding-evidence.md',
] as const;

function runGit(repoPath: string, args: string[]): string[] {
  try {
    const output = execFileSync('git', ['-C', repoPath, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return output ? output.split(/\r?\n/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function readJson(filePath: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function readPackageJson(appPath: string): Record<string, unknown> | undefined {
  return readJson(path.join(appPath, 'package.json'));
}

function readStringMapKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>).sort((a, b) => a.localeCompare(b));
}

function detectPackageManager(appPath: string): string {
  if (fs.existsSync(path.join(appPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(appPath, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(appPath, 'bun.lockb')) || fs.existsSync(path.join(appPath, 'bun.lock'))) return 'bun';
  if (fs.existsSync(path.join(appPath, 'package-lock.json'))) return 'npm';
  return 'unknown';
}

function toTitle(value: string): string {
  return value
    .replace(/^@[^/]+\//u, '')
    .replace(/[-_]+/gu, ' ')
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function readReadme(appPath: string): { title?: string; summary: string[] } {
  const candidates = ['README.md', 'readme.md', 'Readme.md'];
  const readmePath = candidates.map((file) => path.join(appPath, file)).find((file) => fs.existsSync(file));
  if (!readmePath) return { summary: [] };
  const lines = fs.readFileSync(readmePath, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const title = lines.find((line) => /^#\s+\S/u.test(line))?.replace(/^#\s+/u, '').trim();
  const summary = lines
    .filter((line) => line.trim() && !line.trim().startsWith('#') && !line.trim().startsWith('!['))
    .slice(0, 8)
    .map((line) => line.trim());
  return { ...(title ? { title } : {}), summary };
}

function listRelativeFiles(root: string, relativeDirectory: string, extensions: Set<string>, limit = 80): string[] {
  const directory = path.join(root, relativeDirectory);
  if (!fs.existsSync(directory)) return [];
  const result: string[] = [];
  const visit = (current: string): void => {
    if (result.length >= limit) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (extensions.has(path.extname(entry.name))) {
        result.push(path.relative(root, absolute).replace(/\\/g, '/'));
        if (result.length >= limit) return;
      }
    }
  };
  visit(directory);
  return result.sort((a, b) => a.localeCompare(b));
}

function detectRoutes(appPath: string): { routeDirectory?: 'src' | 'root'; routes: string[] } {
  const extensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
  if (fs.existsSync(path.join(appPath, 'src', 'app'))) {
    return { routeDirectory: 'src', routes: listRelativeFiles(appPath, 'src/app', extensions) };
  }
  if (fs.existsSync(path.join(appPath, 'app'))) {
    return { routeDirectory: 'root', routes: listRelativeFiles(appPath, 'app', extensions) };
  }
  return { routes: [] };
}

function existingRelativeFiles(appPath: string, candidates: string[]): string[] {
  return candidates.filter((candidate) => fs.existsSync(path.join(appPath, candidate)));
}

function inferDataNeeds(dependencies: string[], dataBackendFiles: string[]): string[] {
  const haystack = [...dependencies, ...dataBackendFiles].join('\n').toLowerCase();
  const needs = new Set<string>();
  if (/supabase|firebase|drizzle|postgres|sqlite|convex|prisma/u.test(haystack)) needs.add('Backend database records');
  if (/supabase|firebase|auth|clerk|convex/u.test(haystack)) needs.add('User accounts/authentication');
  if (/storage|upload|media|image|file/u.test(haystack)) needs.add('File/image uploads or storage');
  if (/api|routes|axios|pokenode|rss/u.test(haystack)) needs.add('External APIs/integrations');
  return [...needs];
}

function inferAuthProvider(dependencies: string[], dataBackendFiles: string[]): string {
  const haystack = [...dependencies, ...dataBackendFiles].join('\n').toLowerCase();
  if (haystack.includes('supabase')) return 'supabase';
  if (haystack.includes('firebase')) return 'firebase';
  if (haystack.includes('clerk')) return 'clerk';
  if (haystack.includes('convex')) return 'convex';
  return 'none detected';
}

function collectEvidence(appPath: string): RetrospectiveOnboardingEvidence {
  const packageJson = readPackageJson(appPath);
  const readme = readReadme(appPath);
  const appJson = readJson(path.join(appPath, 'app.json'));
  const expo = appJson?.expo && typeof appJson.expo === 'object' && !Array.isArray(appJson.expo)
    ? appJson.expo as Record<string, unknown>
    : undefined;
  const packageName = typeof packageJson?.name === 'string' ? packageJson.name : undefined;
  const appName =
    (typeof expo?.name === 'string' && expo.name.trim()) ||
    readme.title ||
    (packageName ? toTitle(packageName) : undefined) ||
    path.basename(appPath);
  const scripts = readStringMapKeys(packageJson?.scripts);
  const dependencies = [
    ...readStringMapKeys(packageJson?.dependencies),
    ...readStringMapKeys(packageJson?.devDependencies),
  ].sort((a, b) => a.localeCompare(b));
  const routes = detectRoutes(appPath);
  const configFiles = existingRelativeFiles(appPath, [
    'app.json',
    'app.config.js',
    'app.config.ts',
    'eas.json',
    'metro.config.js',
    'babel.config.js',
    'tailwind.config.js',
    'nativewind.css',
    'global.css',
    'tsconfig.json',
  ]);
  const dataBackendFiles = existingRelativeFiles(appPath, [
    'api-server.ts',
    'server.js',
    'server/index.js',
    'drizzle.config.ts',
    'supabase',
    'migrations',
    'drizzle',
    'src/db',
    'src/routes',
    'src/services',
    'src/utils/supabaseClient.ts',
  ]);
  return {
    appName,
    packageManager: detectPackageManager(appPath),
    ...(packageName ? { packageName } : {}),
    ...(readme.title ? { readmeTitle: readme.title } : {}),
    readmeSummary: readme.summary,
    scripts,
    dependencies,
    ...(routes.routeDirectory ? { routeDirectory: routes.routeDirectory } : {}),
    routes: routes.routes,
    configFiles,
    dataBackendFiles,
    localBranches: runGit(appPath, ['branch', '--format=%(refname:short)']).slice(0, 40),
    recentCommits: runGit(appPath, ['log', '--date=short', '--pretty=format:%h %ad %s', '-n', '30']),
    mergeCommits: runGit(appPath, ['log', '--merges', '--date=short', '--pretty=format:%h %ad %s', '-n', '12']),
    inferredDataNeeds: inferDataNeeds(dependencies, dataBackendFiles),
    inferredAuthProvider: inferAuthProvider(dependencies, dataBackendFiles),
  };
}

function bulletList(values: string[], fallback: string): string {
  return values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : fallback;
}

function routeSummary(evidence: RetrospectiveOnboardingEvidence): string {
  if (evidence.routes.length === 0) {
    return '# TodoForContext(optional): Confirm the main screens/routes; no Expo Router route directory was detected.';
  }
  return bulletList(evidence.routes.slice(0, 30), '- No routes detected.');
}

function renderInfo(evidence: RetrospectiveOnboardingEvidence): string {
  return [
    `# ${evidence.appName} Project Info`,
    '',
    'Generated by MDS retrospective onboarding from repository evidence. Treat this as a draft until the UD confirms it.',
    '',
    '## App Name',
    evidence.appName,
    '',
    '## Overview',
    evidence.readmeSummary[0] ?? '# TodoForContext(optional): Confirm the mission statement and plain-language overview for this app.',
    '',
    '## Target Users',
    '# TodoForContext(optional): Confirm who this app is for; repository evidence rarely proves audience on its own.',
    '',
    '## Problem this app solves',
    '# TodoForContext(optional): Explain the user problem or pain this app exists to solve.',
    '',
    '## Product Goals',
    '# TodoForContext(optional): Add the business/product outcomes that would make this app successful.',
    '',
    '## Non-Goals',
    '# TodoForContext(optional): Add anything this app should intentionally avoid for the MVP.',
    '',
    '## First User Flow',
    evidence.routes[0] ? `Start by reviewing the detected route: \`${evidence.routes[0]}\`.` : '# TodoForContext(optional): Describe the first real end-to-end user flow the MVP should support.',
    '',
    '## Core Flows and Features',
    routeSummary(evidence),
    '',
    '## Screens',
    routeSummary(evidence),
    '',
    '## Platforms',
    '',
    `- Expo Router app directory: ${evidence.routeDirectory === 'src' ? 'src/app' : evidence.routeDirectory === 'root' ? 'app' : 'not detected'}`,
    '- # TodoForContext(optional): Confirm target platforms and the first MVP platform.',
    '',
    '## Data And Backend',
    '',
    `- Auth provider hint: ${evidence.inferredAuthProvider}`,
    `- Data/backend hints: ${evidence.inferredDataNeeds.length > 0 ? evidence.inferredDataNeeds.join(', ') : 'none detected'}`,
    '- Evidence files:',
    bulletList(evidence.dataBackendFiles, '  - none detected'),
    '',
    '## Monetization Strategy',
    '# TodoForContext(optional): Add monetization notes when relevant, or confirm monetization is not planned.',
    '',
    '## Team Context',
    '# TodoForContext(optional): Add team size, roles, delegated responsibilities, stakeholders, and client contacts if useful.',
    '',
    '## Later Scope & Possibilities',
    '# TodoForContext(optional): Add future ideas or enhancements outside the first MVP.',
    '',
    '## Research, Notes, and References',
    '',
    '- Review `project/onboarding-evidence.md` for the repository evidence used to draft this file.',
    '- # TodoForContext(optional): Add external docs, designs, analytics, product notes, or customer research that Git history cannot reveal.',
    '',
    '# Tech Stack & Retrospective Onboarding',
    '',
    `- Package Manager: ${evidence.packageManager}`,
    `- Package Name: ${evidence.packageName ?? 'not detected'}`,
    `- Route Directory: ${evidence.routeDirectory === 'src' ? 'src/app' : evidence.routeDirectory === 'root' ? 'app' : 'not detected'}`,
    `- Auth: ${evidence.inferredAuthProvider}`,
    `- Data Categories: ${evidence.inferredDataNeeds.length > 0 ? evidence.inferredDataNeeds.join(', ') : 'not detected'}`,
    '',
    '## Component Strategy',
    '',
    '- Decision: pending',
    '- # TodoForContext(optional): Confirm whether this existing app should keep its current component/styling strategy or migrate toward a new one.',
    '',
  ].join('\n');
}

function renderTodo(evidence: RetrospectiveOnboardingEvidence): string {
  return [
    `# ${evidence.appName} TODO`,
    '',
    '## Phase 0: Confirm Retrospective Project Memory',
    '',
    '- [ ] Review generated `project/info.md`, `project/style.md`, `project/guidelines.md`, and `project/onboarding-evidence.md` for accuracy.',
    '- [ ] Resolve every `# TodoForContext(optional):` marker by filling the section underneath or deleting the marker line to acknowledge no extra context is needed.',
    '- [ ] Confirm the mission statement, target users, first core flow, product goals, monetization, release intent, and component strategy.',
    '- [ ] After markers are resolved, run `mds roadmap` or let the agent refresh `project/todo.md` from confirmed `project/info.md`.',
    '',
    '## Phase 1: Resume Implementation Safely',
    '',
    '- [ ] Run `mds continue` after project memory is confirmed.',
    '- [ ] Keep implementation aligned with confirmed project memory and the existing app architecture.',
    '',
    '## Deferred Roadmap',
    '',
    '- [ ] Generate the phase roadmap only after retrospective assumptions are confirmed by the UD.',
    '',
  ].join('\n');
}

function renderStyle(evidence: RetrospectiveOnboardingEvidence): string {
  return [
    `# ${evidence.appName} Style`,
    '',
    'Generated by retrospective onboarding. Confirm these notes before using them as design direction.',
    '',
    '## Visual Direction',
    '# TodoForContext(optional): Confirm the intended look and feel for this existing app.',
    '',
    '## Brand/References',
    '# TodoForContext(optional): Add brand words, competitor references, screenshots, links, or visual references.',
    '',
    '## Colors',
    '# TodoForContext(optional): Confirm palette direction, semantic color meaning, and light/dark mode expectations.',
    '',
    '## Typography',
    '# TodoForContext(optional): Confirm font choices, type scale, readability constraints, and tone.',
    '',
    '## Layout/Spacing',
    '# TodoForContext(optional): Confirm density, spacing, border radius, hierarchy, and platform layout notes.',
    '',
    '## Motion Tone',
    '# TodoForContext(optional): Confirm animation feel and motion budget.',
    '',
    '## Evidence Pointers',
    '',
    '- Review existing UI routes/components and `project/onboarding-evidence.md` before changing the visual system.',
    '',
  ].join('\n');
}

function renderGuidelines(evidence: RetrospectiveOnboardingEvidence): string {
  return [
    `# ${evidence.appName} Guidelines`,
    '',
    '## Source Of Truth',
    '',
    '- The `project/` folder is the golden source of truth for product intent, roadmap, visual style, and technical rules.',
    '- This project memory was generated retrospectively from repository evidence and must be confirmed by the UD before deep implementation work.',
    '- Never make a product, architecture, or roadmap change that conflicts with confirmed project memory unless the UD explicitly updates it.',
    '',
    '## Retrospective Onboarding Gate',
    '',
    '- Before planning or scaffolding, scan every `project/` file for unresolved TodoForContext markers.',
    '- If any marker is present, stop and ask the UD to fill the section underneath or delete the marker line to acknowledge no extra context is needed.',
    '- Only proceed when zero markers remain. `mds doctor` treats unresolved markers as blockers.',
    '',
    '## Existing App Safety',
    '',
    `- Keep Expo Router routes in ${evidence.routeDirectory === 'src' ? 'src/app' : evidence.routeDirectory === 'root' ? 'app' : 'the existing app route directory'} unless confirmed project memory changes.`,
    '- Prefer small, evidence-backed changes over broad rewrites until retrospective memory is confirmed.',
    '- Preserve existing package manager, scripts, deployment assumptions, and data providers unless a task explicitly changes them.',
    '- Run Doctor before committing.',
    '',
  ].join('\n');
}

function renderEvidence(evidence: RetrospectiveOnboardingEvidence): string {
  return [
    `# ${evidence.appName} Retrospective Onboarding Evidence`,
    '',
    'This file records the repository evidence MDS used to draft project memory. It is evidence, not UD-confirmed product truth.',
    '',
    '## README',
    '',
    `- Title: ${evidence.readmeTitle ?? 'not detected'}`,
    bulletList(evidence.readmeSummary, '- No README summary lines detected.'),
    '',
    '## Package',
    '',
    `- Package manager: ${evidence.packageManager}`,
    `- Package name: ${evidence.packageName ?? 'not detected'}`,
    '- Scripts:',
    bulletList(evidence.scripts, '  - none detected'),
    '- Dependencies:',
    bulletList(evidence.dependencies.slice(0, 80), '  - none detected'),
    '',
    '## Routes And Screens',
    '',
    `- Route directory: ${evidence.routeDirectory === 'src' ? 'src/app' : evidence.routeDirectory === 'root' ? 'app' : 'not detected'}`,
    bulletList(evidence.routes, '- No routes detected.'),
    '',
    '## Data, Backend, And Config',
    '',
    '- Config files:',
    bulletList(evidence.configFiles, '  - none detected'),
    '- Data/backend files:',
    bulletList(evidence.dataBackendFiles, '  - none detected'),
    `- Inferred auth provider: ${evidence.inferredAuthProvider}`,
    `- Inferred data needs: ${evidence.inferredDataNeeds.length > 0 ? evidence.inferredDataNeeds.join(', ') : 'none detected'}`,
    '',
    '## Git History',
    '',
    '- Local branches:',
    bulletList(evidence.localBranches, '  - none detected'),
    '- Recent commits:',
    bulletList(evidence.recentCommits, '  - none detected'),
    '- Merge commits:',
    bulletList(evidence.mergeCommits, '  - none detected'),
    '',
  ].join('\n');
}

function renderIntakeAgent(evidence: RetrospectiveOnboardingEvidence): string {
  return [
    `# ${evidence.appName} Retrospective Intake Agent`,
    '',
    'Use this handoff to finish project onboarding with the UD.',
    '',
    '## Agent Prompt',
    '',
    'Read `project/onboarding-evidence.md`, `project/info.md`, `project/style.md`, `project/guidelines.md`, and `project/todo.md`.',
    'Verify generated project memory against the existing repository before asking questions.',
    'Find every unresolved TodoForContext marker and ask the UD focused questions for the ambiguous sections.',
    'Leave technical facts that are clearly supported by repository evidence; do not invent mission, audience, goals, monetization, or release intent.',
    'After the UD confirms or removes every marker, run `mds roadmap` and then `mds continue` to choose the next implementation slice.',
    '',
    '## High-Priority UD Confirmations',
    '',
    '- Mission statement / overview',
    '- Target users',
    '- First core user flow',
    '- Product goals and non-goals',
    '- Monetization or explicit non-monetization',
    '- Release/deployment intent',
    '- Component and styling strategy',
    '',
  ].join('\n');
}

function renderFiles(evidence: RetrospectiveOnboardingEvidence): Record<string, string> {
  return {
    'info.md': renderInfo(evidence),
    'todo.md': renderTodo(evidence),
    'style.md': renderStyle(evidence),
    'guidelines.md': renderGuidelines(evidence),
    'intake-agent.md': renderIntakeAgent(evidence),
    'onboarding-evidence.md': renderEvidence(evidence),
  };
}

export function planRetrospectiveProjectOnboarding(
  appPath: string,
  options: RetrospectiveOnboardingOptions = {}
): RetrospectiveOnboardingPlan {
  const resolvedAppPath = path.resolve(appPath);
  const workspace = options.projectPath ? undefined : discoverWorkspace(resolvedAppPath);
  if (!options.projectPath && !workspace) {
    throw new Error('Retrospective project onboarding requires an initialized workspace or an explicit control-repo project path.');
  }
  const projectPath = path.resolve(options.projectPath ?? workspace?.projectPath ?? '');
  const evidence = collectEvidence(resolvedAppPath);
  const files = REQUIRED_PROJECT_MEMORY_FILES.map((file) => {
    const filePath = path.join(projectPath, file);
    const exists = fs.existsSync(filePath);
    return { path: file, exists, willWrite: !exists };
  });
  const evidenceSources = [
    'README',
    'package.json',
    'Expo Router routes',
    'data/backend/config files',
    'local branches',
    'recent Git commit history',
    'local merge history',
  ];
  return {
    appPath: resolvedAppPath,
    projectPath,
    ...(workspace ? { workspaceRoot: workspace.workspaceRoot } : {}),
    evidenceSources,
    legacyProjectMemoryFound: Boolean(options.legacyProjectMemoryFound),
    files,
    evidence,
  };
}

export function applyRetrospectiveProjectOnboarding(plan: RetrospectiveOnboardingPlan): RetrospectiveOnboardingPlan {
  fs.mkdirSync(plan.projectPath, { recursive: true });
  const contents = renderFiles(plan.evidence);
  for (const file of plan.files) {
    if (!file.willWrite) continue;
    fs.writeFileSync(path.join(plan.projectPath, file.path), `${contents[file.path] ?? ''}\n`, 'utf8');
  }
  return plan;
}

export const RETROSPECTIVE_PROJECT_ONBOARDING_FILES = [...REQUIRED_PROJECT_MEMORY_FILES];
