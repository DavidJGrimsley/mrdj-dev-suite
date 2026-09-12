import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import chalk from 'chalk';

export interface GitHubSetupArgv {
  path?: string;
  targetBranch?: string;
  json?: boolean;
}

export interface GitHubCommandResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export type GitHubCommandRunner = (
  command: string,
  args: string[],
  cwd: string
) => Promise<GitHubCommandResult>;

export interface GitHubWorkflowSummary {
  name: string;
  path: string;
  state: string;
  pullRequestTrigger: 'configured' | 'not-detected' | 'unknown';
  pullRequestBranches: string[];
}

export interface GitHubRulesetSummary {
  id: number;
  name: string;
  target: string;
  enforcement: string;
  rules: string[];
  requiredStatusChecks: string[];
  targetPatterns: string[];
  appliesToTargetBranch: boolean | null;
}

export interface GitHubPullRequestSummary {
  number: number;
  headRefName: string;
  url: string;
  checks: string[];
}

export interface GitHubSetupRecommendation {
  id: string;
  message: string;
  nextSteps: string[];
}

export interface GitHubSetupReport {
  projectPath: string;
  authenticated: boolean;
  repository: {
    nameWithOwner: string;
    url: string;
    defaultBranch: string;
    viewerPermission: string;
  } | null;
  targetBranch: string | null;
  targetBranchExists: boolean | null;
  statusChecks: string[];
  openPullRequests: GitHubPullRequestSummary[];
  workflows: GitHubWorkflowSummary[];
  rulesets: GitHubRulesetSummary[];
  blockers: string[];
  warnings: string[];
  recommendations: GitHubSetupRecommendation[];
  commands: string[];
}

const defaultRunner: GitHubCommandRunner = (command, args, cwd) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      resolve({ code: 1, stdout, stderr: error.message });
    });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });

export async function collectGitHubSetupReport(
  projectPath = '.',
  targetBranchOverride?: string,
  runner: GitHubCommandRunner = defaultRunner
): Promise<GitHubSetupReport> {
  const resolvedProjectPath = path.resolve(projectPath);
  const blockers: string[] = [];
  const warnings: string[] = [];
  const workflows: GitHubWorkflowSummary[] = [];
  const rulesets: GitHubRulesetSummary[] = [];
  const statusChecks: string[] = [];
  const openPullRequests: GitHubPullRequestSummary[] = [];
  const recommendations: GitHubSetupRecommendation[] = [];

  const auth = await runner('gh', ['auth', 'status', '--hostname', 'github.com'], resolvedProjectPath);
  const authenticated = auth.code === 0;
  if (!authenticated) {
    blockers.push(
      'GitHub CLI authentication is unavailable. Run `gh auth login --hostname github.com`, then rerun this command.'
    );
  }

  let repository: GitHubSetupReport['repository'] = null;
  if (authenticated) {
    const repoResult = await runner(
      'gh',
      [
        'repo',
        'view',
        '--json',
        'nameWithOwner,defaultBranchRef,url,viewerPermission',
      ],
      resolvedProjectPath
    );
    const repo = parseJson<Record<string, unknown>>(repoResult.stdout);
    const defaultBranchRef = asRecord(repo?.defaultBranchRef);
    if (repoResult.code !== 0 || !repo || typeof repo.nameWithOwner !== 'string') {
      blockers.push(
        'The GitHub repository could not be resolved from this project. Confirm the origin remote points to GitHub.'
      );
    } else {
      repository = {
        nameWithOwner: repo.nameWithOwner,
        url: typeof repo.url === 'string' ? repo.url : `https://github.com/${repo.nameWithOwner}`,
        defaultBranch:
          typeof defaultBranchRef?.name === 'string' ? defaultBranchRef.name : 'main',
        viewerPermission:
          typeof repo.viewerPermission === 'string' ? repo.viewerPermission : 'UNKNOWN',
      };
    }
  }

  const targetBranch = targetBranchOverride?.trim() || repository?.defaultBranch || null;
  let targetBranchExists: boolean | null = null;

  if (authenticated && repository) {
    const branches = await readGitHubJson<unknown[]>(
      runner,
      `repos/${repository.nameWithOwner}/branches?per_page=100`,
      resolvedProjectPath
    );
    if (Array.isArray(branches)) {
      targetBranchExists = Boolean(
        branches.some((branch) => asRecord(branch)?.name === targetBranch)
      );
      if (!targetBranchExists && targetBranch) {
        blockers.push(
          `Target branch "${targetBranch}" does not exist remotely. Create it only after confirming the desired promotion flow.`
        );
      }
    } else {
      warnings.push('The branch list could not be read, so target-branch existence is unknown.');
    }

    if (targetBranch) {
      const checkPayload = await readGitHubJson<Record<string, unknown>>(
        runner,
        `repos/${repository.nameWithOwner}/commits/${encodeURIComponent(targetBranch)}/check-runs?per_page=100`,
        resolvedProjectPath
      );
      const checkRuns = Array.isArray(checkPayload?.check_runs) ? checkPayload.check_runs : [];
      for (const checkRun of checkRuns) {
        const name = asRecord(checkRun)?.name;
        if (typeof name === 'string' && !statusChecks.includes(name)) statusChecks.push(name);
      }

      const pullRequests = await readGitHubJson<unknown[]>(
        runner,
        `repos/${repository.nameWithOwner}/pulls?state=open&base=${encodeURIComponent(targetBranch)}&per_page=10`,
        resolvedProjectPath
      );
      if (Array.isArray(pullRequests)) {
        for (const pullRequest of pullRequests) {
          const item = asRecord(pullRequest);
          if (!item || typeof item.number !== 'number') continue;
          const checksResult = await runner(
            'gh',
            [
              'pr',
              'checks',
              String(item.number),
              '--repo',
              repository.nameWithOwner,
              '--json',
              'name,state,bucket,link',
            ],
            resolvedProjectPath
          );
          const checks = parseJson<unknown[]>(checksResult.stdout) ?? [];
          openPullRequests.push({
            number: item.number,
            headRefName: typeof item.headRefName === 'string' ? item.headRefName : 'unknown',
            url: typeof item.html_url === 'string' ? item.html_url : '',
            checks: checks
              .map((check) => asRecord(check)?.name)
              .filter((name): name is string => typeof name === 'string'),
          });
        }
      }
    }

    const workflowPayload = await readGitHubJson<Record<string, unknown>>(
      runner,
      `repos/${repository.nameWithOwner}/actions/workflows?per_page=100`,
      resolvedProjectPath
    );
    const remoteWorkflows = Array.isArray(workflowPayload?.workflows)
      ? workflowPayload.workflows
      : [];
    const localWorkflowSummaries = inspectLocalWorkflows(resolvedProjectPath);
    for (const remoteWorkflow of remoteWorkflows) {
      const item = asRecord(remoteWorkflow);
      if (!item || typeof item.name !== 'string' || typeof item.path !== 'string') continue;
      const local = localWorkflowSummaries.find((workflow) => workflow.path === item.path);
      workflows.push({
        name: item.name,
        path: item.path,
        state: typeof item.state === 'string' ? item.state : 'unknown',
        pullRequestTrigger: local?.pullRequestTrigger ?? 'unknown',
        pullRequestBranches: local?.pullRequestBranches ?? [],
      });
    }
    const projectWorkflows = workflows.filter((workflow) => isProjectWorkflow(workflow));
    const projectPullRequestWorkflows = projectWorkflows.filter(
      (workflow) => workflow.pullRequestTrigger === 'configured'
    );
    const targetPullRequestWorkflows = projectPullRequestWorkflows.filter((workflow) =>
      workflowTargetsBranch(workflow, targetBranch)
    );

    if (projectWorkflows.length === 0) {
      warnings.push(
        'No project GitHub Actions workflows were detected. Add or restore pull-request CI before requiring status checks.'
      );
      recommendations.push({
        id: 'missing-project-ci',
        message: `No project CI workflow under .github/workflows was detected for "${targetBranch}". Copilot automation does not count as project CI.`,
        nextSteps: [
          'Run `mds doctor --ci` locally before changing the repository.',
          `Add or restore a workflow with \`pull_request\` targeting \`${targetBranch}\`.`,
          `Review available workflows with \`gh workflow list --repo ${repository.nameWithOwner}\`.`,
        ],
      });
    } else if (projectPullRequestWorkflows.length === 0) {
      recommendations.push({
        id: 'missing-pull-request-trigger',
        message: `Project workflows exist, but none is configured to run for pull requests targeting "${targetBranch}".`,
        nextSteps: [
          'Update a workflow under `.github/workflows` to include `pull_request`.',
          `Review available workflows with \`gh workflow list --repo ${repository.nameWithOwner}\`.`,
        ],
      });
    } else if (targetPullRequestWorkflows.length === 0) {
      recommendations.push({
        id: 'target-branch-not-covered',
        message: `Project pull-request workflows are filtered away from target branch "${targetBranch}".`,
        nextSteps: [
          `Include "${targetBranch}" in each intended workflow's \`on.pull_request.branches\` filter.`,
          `Validate target-branch rules with \`gh ruleset check ${targetBranch} --repo ${repository.nameWithOwner}\`.`,
        ],
      });
    }

    if (statusChecks.length === 0) {
      recommendations.push({
        id: 'missing-status-checks',
        message: `No status checks were observed on target branch "${targetBranch}". Do not require a check until a pull-request run reports its exact name.`,
        nextSteps: [
          `Inspect pull-request checks with \`gh pr checks <number> --repo ${repository.nameWithOwner} --watch\`.`,
          'Use the exact reported check names when reviewing a ruleset.',
        ],
      });
    }

    const rulesetList = await readGitHubJson<unknown[]>(
      runner,
      `repos/${repository.nameWithOwner}/rulesets?per_page=100`,
      resolvedProjectPath
    );
    if (Array.isArray(rulesetList)) {
      for (const item of rulesetList) {
        const summary = asRecord(item);
        if (!summary || typeof summary.id !== 'number') continue;
        const detail = await readGitHubJson<Record<string, unknown>>(
          runner,
          `repos/${repository.nameWithOwner}/rulesets/${summary.id}`,
          resolvedProjectPath
        );
        const targetPatterns = readRulesetTargetPatterns(detail);
        const rules = Array.isArray(detail?.rules) ? detail.rules : [];
        const ruleTypes = rules
          .map((rule) => asRecord(rule)?.type)
          .filter((type): type is string => typeof type === 'string');
        const requiredStatusChecks = rules.flatMap((rule) => {
          const parameters = asRecord(asRecord(rule)?.parameters);
          const checks = Array.isArray(parameters?.required_status_checks)
            ? parameters.required_status_checks
            : [];
          return checks
            .map((check) => asRecord(check)?.context)
            .filter((context): context is string => typeof context === 'string');
        });
        rulesets.push({
          id: summary.id,
          name: typeof summary.name === 'string' ? summary.name : `Ruleset ${summary.id}`,
          target: typeof summary.target === 'string' ? summary.target : 'unknown',
          enforcement:
            typeof summary.enforcement === 'string' ? summary.enforcement : 'unknown',
          rules: ruleTypes,
          requiredStatusChecks,
          targetPatterns,
          appliesToTargetBranch:
            detail === null
              ? null
              : rulesetAppliesToBranch(targetBranch, targetPatterns, repository.defaultBranch),
        });
      }
    } else {
      warnings.push('Repository rulesets could not be read. Inspect them with `gh ruleset list`.');
    }

    const applicableRulesets = rulesets.filter((ruleset) => ruleset.appliesToTargetBranch === true);
    const unknownApplicabilityRulesets = rulesets.filter(
      (ruleset) => ruleset.appliesToTargetBranch === null
    );
    if (rulesets.length === 0) {
      recommendations.push({
        id: 'missing-target-ruleset',
        message: `No branch ruleset was found for target branch "${targetBranch}".`,
        nextSteps: [
          `Inspect current rulesets with \`gh ruleset list --repo ${repository.nameWithOwner}\`.`,
          `In GitHub, open Settings → Rules → Rulesets and create a reviewed branch ruleset for "${targetBranch}" if protection is desired.`,
        ],
      });
    } else if (applicableRulesets.length === 0 && unknownApplicabilityRulesets.length === 0) {
      recommendations.push({
        id: 'target-ruleset-not-found',
        message: `Existing rulesets were found, but none applies to target branch "${targetBranch}".`,
        nextSteps: [
          `Inspect applicability with \`gh ruleset check ${targetBranch} --repo ${repository.nameWithOwner}\`.`,
          `Review Settings → Rules → Rulesets for a branch pattern that includes "${targetBranch}".`,
        ],
      });
    }
    if (
      applicableRulesets.length > 0 &&
      !applicableRulesets.some((ruleset) => ruleset.requiredStatusChecks.length > 0)
    ) {
      warnings.push(
        `No discovered ruleset requires a status check for "${targetBranch}". Add only checks that actually report for this target.`
      );
      recommendations.push({
        id: 'missing-required-status-checks',
        message: `The applicable ruleset for "${targetBranch}" does not require any status checks.`,
        nextSteps: [
          `Review exact check names with \`gh pr checks <number> --repo ${repository.nameWithOwner} --watch\`.`,
          `After reviewing the names, inspect the ruleset with \`gh ruleset check ${targetBranch} --repo ${repository.nameWithOwner}\`.`,
        ],
      });
    }
    if (
      repository.viewerPermission !== 'ADMIN' &&
      repository.viewerPermission !== 'MAINTAIN'
    ) {
      warnings.push(
        `GitHub permission is ${repository.viewerPermission}; ruleset changes may require an administrator.`
      );
    }

    for (const pullRequest of openPullRequests) {
      if (pullRequest.checks.length > 0) continue;
      recommendations.push({
        id: `pull-request-without-checks-${pullRequest.number}`,
        message: `Open PR #${pullRequest.number} has no reported checks for target branch "${targetBranch}".`,
        nextSteps: [
          `Inspect PR checks with \`gh pr checks ${pullRequest.number} --repo ${repository.nameWithOwner} --watch\`.`,
          'Do not treat the PR as CI-ready until its intended checks report successfully.',
        ],
      });
    }
  }

  if (
    targetBranch &&
    workflows.some(
      (workflow) => isProjectWorkflow(workflow) && workflow.pullRequestTrigger === 'not-detected'
    )
  ) {
    warnings.push(
      `Review workflow pull-request branch filters for "${targetBranch}"; a filtered workflow will not report a required check.`
    );
  }

  const commands = buildSetupCommands(
    repository?.nameWithOwner,
    repository?.defaultBranch,
    targetBranch,
    targetBranchExists
  );
  return {
    projectPath: resolvedProjectPath,
    authenticated,
    repository,
    targetBranch,
    targetBranchExists,
    statusChecks,
    openPullRequests,
    workflows,
    rulesets,
    blockers,
    warnings,
    recommendations,
    commands,
  };
}

export async function runGitHubSetupCommand(argv: GitHubSetupArgv): Promise<void> {
  const report = await collectGitHubSetupReport(argv.path ?? '.', argv.targetBranch);
  if (argv.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatGitHubSetupReport(report));
  }
  if (report.blockers.length > 0) process.exitCode = 1;
}

export function formatGitHubSetupReport(report: GitHubSetupReport): string {
  const repository = report.repository?.nameWithOwner ?? 'not detected';
  const workflowLines = report.workflows.length
    ? report.workflows.map(
        (workflow) =>
          `- ${workflow.name} (${workflow.path}) — PR trigger: ${workflow.pullRequestTrigger}`
      )
    : ['- none detected'];
  const rulesetLines = report.rulesets.length
    ? report.rulesets.map(
        (ruleset) =>
          `- ${ruleset.name} (${ruleset.enforcement}) — ${ruleset.rules.join(', ') || 'no rules'}`
      )
    : ['- none detected'];
  const lines = [
    chalk.bold('MDS GitHub setup guidance'),
    `Repository: ${repository}`,
    `Target branch: ${report.targetBranch ?? 'not detected'} (${formatPresence(report.targetBranchExists)})`,
    `Authenticated: ${report.authenticated ? 'yes' : 'no'}`,
    `Observed checks: ${report.statusChecks.join(', ') || 'none detected'}`,
    `Open PRs to target: ${report.openPullRequests.length}`,
    '',
    chalk.bold('Workflows'),
    ...workflowLines,
    '',
    chalk.bold('Rulesets'),
    ...rulesetLines,
  ];
  if (report.blockers.length > 0) {
    lines.push('', chalk.red('Blockers'), ...report.blockers.map((item) => `- ${item}`));
  }
  if (report.warnings.length > 0) {
    lines.push('', chalk.yellow('Warnings'), ...report.warnings.map((item) => `- ${item}`));
  }
  if (report.recommendations.length > 0) {
    lines.push('', chalk.yellow('Recommendations'));
    for (const recommendation of report.recommendations) {
      lines.push(`- ${recommendation.message}`);
      lines.push(...recommendation.nextSteps.map((step) => `  Next: ${step}`));
    }
  }
  lines.push('', chalk.bold('Read-only command recipe'), ...report.commands.map((command) => `  ${command}`));
  return lines.join('\n');
}

async function readGitHubJson<T>(
  runner: GitHubCommandRunner,
  endpoint: string,
  cwd: string
): Promise<T | null> {
  const result = await runner('gh', ['api', endpoint], cwd);
  if (result.code !== 0) return null;
  return parseJson<T>(result.stdout);
}

function inspectLocalWorkflows(projectPath: string): GitHubWorkflowSummary[] {
  const workflowDirectory = path.join(projectPath, '.github', 'workflows');
  if (!existsSync(workflowDirectory)) return [];
  return readdirSync(workflowDirectory)
    .filter((fileName) => /\.ya?ml$/u.test(fileName))
    .map((fileName) => {
      const workflowPath = path.join(workflowDirectory, fileName);
      const content = readFileSync(workflowPath, 'utf8');
      const pullRequestMatch = content.match(/(?:^|\n)\s*pull_request\s*:/u);
      const branchesMatch = pullRequestMatch
        ? content.slice(pullRequestMatch.index ?? 0).match(/\n\s*branches\s*:\s*\n((?:\s+-\s+[^\n]+\n?)+)/u)
        : null;
      const pullRequestBranches = branchesMatch?.[1]
        ? [...branchesMatch[1].matchAll(/\s+-\s+['"]?([^'"\n]+)['"]?/gu)].map((match) => match[1]!.trim())
        : [];
      return {
        name: fileName.replace(/\.ya?ml$/u, ''),
        path: `.github/workflows/${fileName}`,
        state: 'local',
        pullRequestTrigger: pullRequestMatch
          ? 'configured'
          : 'not-detected',
        pullRequestBranches,
      } satisfies GitHubWorkflowSummary;
    });
}

function isProjectWorkflow(workflow: GitHubWorkflowSummary): boolean {
  return workflow.path.startsWith('.github/workflows/');
}

function workflowTargetsBranch(workflow: GitHubWorkflowSummary, targetBranch: string | null): boolean {
  if (!targetBranch || workflow.pullRequestBranches.length === 0) return true;
  return workflow.pullRequestBranches.includes(targetBranch);
}

function readRulesetTargetPatterns(detail: Record<string, unknown> | null): string[] {
  const conditions = asRecord(detail?.conditions);
  const refName = asRecord(conditions?.ref_name);
  return Array.isArray(refName?.include)
    ? refName.include.filter((pattern): pattern is string => typeof pattern === 'string')
    : [];
}

function rulesetAppliesToBranch(
  targetBranch: string | null,
  patterns: string[],
  defaultBranch: string
): boolean {
  if (!targetBranch || patterns.length === 0) return true;
  const targetRef = `refs/heads/${targetBranch}`;
  return patterns.some((pattern) => {
    if (pattern === '~DEFAULT_BRANCH') return targetBranch === defaultBranch;
    return matchesGitHubRefPattern(targetRef, pattern);
  });
}

function matchesGitHubRefPattern(value: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/gu, '\\$&')
    .replace(/\*\*/gu, '__DOUBLE_STAR__')
    .replace(/\*/gu, '[^/]*')
    .replace(/__DOUBLE_STAR__/gu, '.*');
  return new RegExp(`^${escaped}$`, 'u').test(value);
}

function buildSetupCommands(
  repository: string | undefined,
  defaultBranch: string | undefined,
  targetBranch: string | null,
  targetBranchExists: boolean | null
): string[] {
  const repo = repository ?? '<owner>/<repo>';
  const branch = targetBranch ?? '<target-branch>';
  const commands = [
    'gh auth status --hostname github.com',
    `gh repo view ${repo} --json nameWithOwner,defaultBranchRef,url,viewerPermission`,
    `gh ruleset list --repo ${repo}`,
    `gh ruleset check ${branch} --repo ${repo}`,
    `gh pr create --repo ${repo} --base ${branch} --head <feature-branch> --title "<title>" --body-file <body-file>`,
    `gh pr checks <number> --repo ${repo} --watch`,
    `gh api repos/${repo}/rulesets --input <ruleset-payload.json>`,
  ];
  if (targetBranchExists === false) {
    commands.unshift(
      `git switch -c ${branch} ${defaultBranch ?? 'main'}`,
      `git push --set-upstream origin ${branch}`
    );
  }
  return commands;
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function formatPresence(value: boolean | null): string {
  if (value === null) return 'unknown';
  return value ? 'exists' : 'missing';
}
