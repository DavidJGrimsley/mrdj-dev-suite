import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  collectGitHubSetupReport,
  formatGitHubSetupReport,
  type GitHubCommandResult,
} from '../src/commands/github-setup.js';

const tempDirectories: string[] = [];

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(tempDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
  tempDirectories.length = 0;
});

function createRunner(responses: Record<string, GitHubCommandResult>) {
  return async (_command: string, args: string[], _cwd: string): Promise<GitHubCommandResult> => {
    const key = args.join(' ');
    return responses[key] ?? { code: 1, stdout: '', stderr: 'not mocked' };
  };
}

async function createWorkflowProject(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mds-github-setup-'));
  tempDirectories.push(directory);
  await mkdir(path.join(directory, '.github', 'workflows'), { recursive: true });
  await writeFile(
    path.join(directory, '.github', 'workflows', 'ci.yml'),
    ['name: CI', 'on:', '  pull_request:', '    branches:', '      - main', 'jobs:', '  doctor:', '    runs-on: ubuntu-latest', ''].join('\n'),
    'utf8'
  );
  return directory;
}

describe('GitHub setup guidance', () => {
  it('reports unauthenticated access without leaking command output', async () => {
    const report = await collectGitHubSetupReport(
      '.',
      undefined,
      createRunner({
        'auth status --hostname github.com': {
          code: 1,
          stdout: '',
          stderr: 'token: secret-value',
        },
      })
    );

    expect(report.authenticated).toBe(false);
    expect(report.blockers[0]).toContain('gh auth login');
    expect(JSON.stringify(report)).not.toContain('secret-value');
  });

  it('reports repository, workflows, target branch, and rulesets from authenticated discovery', async () => {
    const projectPath = await createWorkflowProject();
    const report = await collectGitHubSetupReport(
      projectPath,
      'main',
      createRunner({
        'auth status --hostname github.com': { code: 0, stdout: '', stderr: '' },
        'repo view --json nameWithOwner,defaultBranchRef,url,viewerPermission': {
          code: 0,
          stdout: JSON.stringify({
            nameWithOwner: 'owner/repo',
            defaultBranchRef: { name: 'main' },
            url: 'https://github.com/owner/repo',
            viewerPermission: 'ADMIN',
          }),
          stderr: '',
        },
        'api repos/owner/repo/branches?per_page=100': {
          code: 0,
          stdout: JSON.stringify([{ name: 'main' }]),
          stderr: '',
        },
        'api repos/owner/repo/commits/main/check-runs?per_page=100': {
          code: 0,
          stdout: JSON.stringify({ check_runs: [{ name: 'doctor' }, { name: 'packages' }] }),
          stderr: '',
        },
        'api repos/owner/repo/pulls?state=open&base=main&per_page=10': {
          code: 0,
          stdout: JSON.stringify([
            { number: 7, headRefName: 'feature/ci', html_url: 'https://github.com/owner/repo/pull/7' },
          ]),
          stderr: '',
        },
        'pr checks 7 --repo owner/repo --json name,state,bucket,link': {
          code: 0,
          stdout: JSON.stringify([{ name: 'doctor', state: 'SUCCESS', bucket: 'pass' }]),
          stderr: '',
        },
        'api repos/owner/repo/actions/workflows?per_page=100': {
          code: 0,
          stdout: JSON.stringify({
            workflows: [{ name: 'CI', path: '.github/workflows/ci.yml', state: 'active' }],
          }),
          stderr: '',
        },
        'api repos/owner/repo/rulesets?per_page=100': {
          code: 0,
          stdout: JSON.stringify([{ id: 1, name: 'Protect main', target: 'branch', enforcement: 'active' }]),
          stderr: '',
        },
        'api repos/owner/repo/rulesets/1': {
          code: 0,
          stdout: JSON.stringify({
            rules: [
              { type: 'deletion' },
              { type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'doctor' }] } },
            ],
          }),
          stderr: '',
        },
      })
    );

    expect(report.repository?.nameWithOwner).toBe('owner/repo');
    expect(report.targetBranchExists).toBe(true);
    expect(report.statusChecks).toEqual(['doctor', 'packages']);
    expect(report.openPullRequests[0]?.checks).toEqual(['doctor']);
    expect(report.workflows[0]?.pullRequestTrigger).toBe('configured');
    expect(report.rulesets[0]?.requiredStatusChecks).toEqual(['doctor']);
    expect(report.commands).toContain('gh ruleset check main --repo owner/repo');
  });

  it('warns when an existing ruleset does not require status checks', async () => {
    const report = await collectGitHubSetupReport(
      '.',
      'main',
      createRunner({
        'auth status --hostname github.com': { code: 0, stdout: '', stderr: '' },
        'repo view --json nameWithOwner,defaultBranchRef,url,viewerPermission': {
          code: 0,
          stdout: JSON.stringify({
            nameWithOwner: 'owner/repo',
            defaultBranchRef: { name: 'main' },
            viewerPermission: 'ADMIN',
          }),
          stderr: '',
        },
        'api repos/owner/repo/branches?per_page=100': {
          code: 0,
          stdout: JSON.stringify([{ name: 'main' }]),
          stderr: '',
        },
        'api repos/owner/repo/actions/workflows?per_page=100': {
          code: 0,
          stdout: JSON.stringify({ workflows: [] }),
          stderr: '',
        },
        'api repos/owner/repo/rulesets?per_page=100': {
          code: 0,
          stdout: JSON.stringify([{ id: 3, name: 'Protect main', target: 'branch', enforcement: 'active' }]),
          stderr: '',
        },
        'api repos/owner/repo/rulesets/3': {
          code: 0,
          stdout: JSON.stringify({ rules: [{ type: 'deletion' }, { type: 'non_fast_forward' }] }),
          stderr: '',
        },
      })
    );

    expect(report.rulesets).toHaveLength(1);
    expect(report.rulesets[0]?.requiredStatusChecks).toEqual([]);
    expect(report.warnings.some((warning) => warning.includes('No discovered ruleset requires a status check'))).toBe(
      true
    );
  });

  it('reports a missing test branch and supplies safe creation guidance', async () => {
    const report = await collectGitHubSetupReport(
      '.',
      'test',
      createRunner({
        'auth status --hostname github.com': { code: 0, stdout: '', stderr: '' },
        'repo view --json nameWithOwner,defaultBranchRef,url,viewerPermission': {
          code: 0,
          stdout: JSON.stringify({ nameWithOwner: 'owner/repo', defaultBranchRef: { name: 'main' } }),
          stderr: '',
        },
        'api repos/owner/repo/branches?per_page=100': {
          code: 0,
          stdout: JSON.stringify([{ name: 'main' }]),
          stderr: '',
        },
        'api repos/owner/repo/actions/workflows?per_page=100': {
          code: 0,
          stdout: JSON.stringify({ workflows: [] }),
          stderr: '',
        },
        'api repos/owner/repo/rulesets?per_page=100': { code: 0, stdout: '[]', stderr: '' },
      })
    );

    expect(report.targetBranchExists).toBe(false);
    expect(report.blockers.some((blocker) => blocker.includes('test'))).toBe(true);
    expect(report.commands).toContain('git switch -c test main');
    expect(report.warnings.some((warning) => warning.includes('workflows'))).toBe(true);
  });

  it('formats blockers, warnings, and the read-only recipe for humans', () => {
    const output = formatGitHubSetupReport({
      projectPath: 'F:/repo',
      authenticated: false,
      repository: null,
      targetBranch: null,
      targetBranchExists: null,
      statusChecks: [],
      openPullRequests: [],
      workflows: [],
      rulesets: [],
      blockers: ['Run gh auth login.'],
      warnings: ['No workflows detected.'],
      commands: ['gh auth status --hostname github.com'],
    });

    expect(output).toContain('MDS GitHub setup guidance');
    expect(output).toContain('Blockers');
    expect(output).toContain('Warnings');
    expect(output).toContain('gh auth status --hostname github.com');
  });
});
