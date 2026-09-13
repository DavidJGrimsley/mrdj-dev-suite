import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';

import chalk from 'chalk';

export const DEFAULT_SYNC_BRANCH = 'mds/sync-main-into-test';

export interface SyncMainIntoTestArgv {
  path?: string;
  main?: string;
  test?: string;
  execute?: boolean;
  json?: boolean;
}

export type SyncMainIntoTestStatus = 'planned' | 'created' | 'updated' | 'noop' | 'blocked';

export interface SyncMainIntoTestResult {
  status: SyncMainIntoTestStatus;
  message: string;
  repositoryPath: string;
  repository?: string;
  mainBranch: string;
  testBranch: string;
  syncBranch: string;
  mergeCommit?: string;
  prUrl?: string;
}

export interface CommandOutput {
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface CommandOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
}

export type CommandRunner = (
  command: string,
  args: string[],
  options?: CommandOptions
) => Promise<CommandOutput>;

export interface SyncMainIntoTestDependencies {
  runCommand?: CommandRunner;
  createTempDirectory?: () => Promise<string>;
  removeTempDirectory?: (directory: string) => Promise<void>;
}

interface GitHubRepository {
  hostname: string;
  slug: string;
}

interface ExistingPullRequest {
  number: number;
  url: string;
  headRefName: string;
  baseRefName: string;
}

const PR_TITLE = 'chore: sync main into test';
const PR_BODY = [
  'Synchronize `main` back into `test` after a successful promotion.',
  '',
  'This branch contains a merge commit from `main` into `test`.',
  '',
  '**Merge this pull request with GitHub\'s merge-commit strategy. Do not squash or rebase it.**',
  '',
  'Created by Mr. DJ\'s Dev Suite.',
].join('\n');

export async function runSyncMainIntoTestCommand(argv: SyncMainIntoTestArgv): Promise<void> {
  const result = await syncMainIntoTest(argv);

  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const heading = result.status === 'blocked' ? chalk.red('Blocked') : chalk.bold('MDS sync main into test');
    console.log(heading);
    console.log(result.message);
    if (result.prUrl) console.log(`Pull request: ${result.prUrl}`);
    if (result.mergeCommit) console.log(`Merge commit: ${result.mergeCommit}`);
  }

  if (result.status === 'blocked') process.exitCode = 1;
}

export async function syncMainIntoTest(
  argv: SyncMainIntoTestArgv,
  dependencies: SyncMainIntoTestDependencies = {}
): Promise<SyncMainIntoTestResult> {
  const runCommand = dependencies.runCommand ?? runProcess;
  const repositoryPath = path.resolve(argv.path ?? '.');
  const mainBranch = argv.main?.trim() || 'main';
  const testBranch = argv.test?.trim() || 'test';
  const syncBranch = DEFAULT_SYNC_BRANCH;
  const baseResult = { repositoryPath, mainBranch, testBranch, syncBranch };

  for (const branch of [mainBranch, testBranch, syncBranch]) {
    const validation = await runCommand('git', ['check-ref-format', '--branch', branch], {
      cwd: repositoryPath,
    });
    if (validation.code !== 0) {
      return blocked(baseResult, `Invalid Git branch name: ${branch}`);
    }
  }

  const topLevel = await runCommand('git', ['-C', repositoryPath, 'rev-parse', '--show-toplevel']);
  if (topLevel.code !== 0) {
    return blocked(baseResult, `Not a Git repository: ${repositoryPath}`);
  }

  const resolvedRepositoryPath = topLevel.stdout.trim();
  const resolvedBase = { ...baseResult, repositoryPath: resolvedRepositoryPath };
  const remote = await runCommand('git', [
    '-C',
    resolvedRepositoryPath,
    'remote',
    'get-url',
    'origin',
  ]);
  if (remote.code !== 0 || !remote.stdout.trim()) {
    return blocked(resolvedBase, 'The target repository does not have an origin remote.');
  }

  const githubRepository = parseGitHubRepository(remote.stdout.trim());
  if (!githubRepository) {
    return blocked(resolvedBase, 'The origin remote is not a supported GitHub repository URL.');
  }
  const repositoryBase = { ...resolvedBase, repository: githubRepository.slug };

  const mainRemote = await readRemoteBranch(
    runCommand,
    resolvedRepositoryPath,
    'origin',
    mainBranch
  );
  if (mainRemote.error) return blocked(repositoryBase, mainRemote.error);
  if (!mainRemote.sha) {
    return blocked(repositoryBase, `Remote branch origin/${mainBranch} does not exist.`);
  }

  const testRemote = await readRemoteBranch(
    runCommand,
    resolvedRepositoryPath,
    'origin',
    testBranch
  );
  if (testRemote.error) return blocked(repositoryBase, testRemote.error);
  if (!testRemote.sha) {
    return blocked(repositoryBase, `Remote branch origin/${testBranch} does not exist.`);
  }

  if (!argv.execute) {
    return {
      ...repositoryBase,
      status: 'planned',
      message:
        `Ready to create or update ${syncBranch} and open a merge-commit PR from ` +
        `${syncBranch} into ${testBranch}. Re-run with --execute to apply it.`,
    };
  }

  const createTempDirectory =
    dependencies.createTempDirectory ??
    (() => mkdtemp(path.join(os.tmpdir(), 'mds-sync-main-into-test-')));
  const removeTempDirectory =
    dependencies.removeTempDirectory ??
    ((directory: string) => rm(directory, { recursive: true, force: true }));
  const tempRoot = await createTempDirectory();
  const clonePath = path.join(tempRoot, 'repository');

  try {
    const clone = await runCommand('git', [
      'clone',
      '--quiet',
      '--no-checkout',
      remote.stdout.trim(),
      clonePath,
    ]);
    if (clone.code !== 0) {
      return blocked(repositoryBase, commandFailure('Unable to clone the target repository.', clone));
    }

    const fetchBranches = await runCommand('git', [
      '-C',
      clonePath,
      'fetch',
      '--quiet',
      'origin',
      `+refs/heads/${mainBranch}:refs/remotes/origin/${mainBranch}`,
      `+refs/heads/${testBranch}:refs/remotes/origin/${testBranch}`,
    ]);
    if (fetchBranches.code !== 0) {
      return blocked(repositoryBase, commandFailure('Unable to fetch the main and test branches.', fetchBranches));
    }

    const alreadySynchronized = await runCommand('git', [
      '-C',
      clonePath,
      'merge-base',
      '--is-ancestor',
      `origin/${mainBranch}`,
      `origin/${testBranch}`,
    ]);
    if (alreadySynchronized.code === 0) {
      return {
        ...repositoryBase,
        status: 'noop',
        message: `${testBranch} already contains ${mainBranch}; no sync pull request is needed.`,
      };
    }
    if (alreadySynchronized.code !== 1) {
      return blocked(
        repositoryBase,
        commandFailure('Unable to compare the main and test branch history.', alreadySynchronized)
      );
    }

    const auth = await runCommand('gh', ['auth', 'status', '--hostname', githubRepository.hostname], {
      cwd: resolvedRepositoryPath,
    });
    if (auth.code !== 0) {
      return blocked(repositoryBase, commandFailure('GitHub authentication is unavailable.', auth));
    }

    const openPrResult = await runCommand(
      'gh',
      [
        'pr',
        'list',
        '--repo',
        githubRepository.slug,
        '--head',
        syncBranch,
        '--base',
        testBranch,
        '--state',
        'open',
        '--limit',
        '2',
        '--json',
        'number,url,headRefName,baseRefName',
      ],
      { cwd: resolvedRepositoryPath }
    );
    if (openPrResult.code !== 0) {
      return blocked(
        repositoryBase,
        commandFailure('Unable to inspect existing sync pull requests.', openPrResult)
      );
    }

    const openPullRequests = parsePullRequests(openPrResult.stdout);
    if (!openPullRequests) {
      return blocked(repositoryBase, 'GitHub returned an invalid pull-request response.');
    }
    if (openPullRequests.length > 1) {
      return blocked(
        repositoryBase,
        `Multiple open ${syncBranch} pull requests target ${testBranch}; resolve them before retrying.`
      );
    }
    const existingPullRequest = openPullRequests[0];

    const syncRemote = await readRemoteBranch(
      runCommand,
      resolvedRepositoryPath,
      'origin',
      syncBranch
    );
    if (syncRemote.error) return blocked(repositoryBase, syncRemote.error);

    if (syncRemote.sha) {
      const fetchSync = await runCommand('git', [
        '-C',
        clonePath,
        'fetch',
        '--quiet',
        'origin',
        `+refs/heads/${syncBranch}:refs/remotes/origin/${syncBranch}`,
      ]);
      if (fetchSync.code !== 0) {
        return blocked(repositoryBase, commandFailure('Unable to fetch the existing sync branch.', fetchSync));
      }

      if (!existingPullRequest) {
        const ownedBranch = await runCommand('git', [
          '-C',
          clonePath,
          'merge-base',
          '--is-ancestor',
          `origin/${syncBranch}`,
          `origin/${testBranch}`,
        ]);
        if (ownedBranch.code !== 0) {
          return blocked(
            repositoryBase,
            `Remote branch ${syncBranch} exists without an open sync PR and is not contained in ` +
              `${testBranch}; refusing to overwrite it.`
          );
        }
      }
    }

    const checkout = await runCommand('git', [
      '-C',
      clonePath,
      'checkout',
      '--quiet',
      '-B',
      syncBranch,
      `origin/${testBranch}`,
    ]);
    if (checkout.code !== 0) {
      return blocked(repositoryBase, commandFailure('Unable to prepare the isolated sync branch.', checkout));
    }

    await ensureGitIdentity(runCommand, clonePath);

    const merge = await runCommand('git', [
      '-C',
      clonePath,
      'merge',
      '--no-ff',
      '--no-edit',
      '-m',
      PR_TITLE,
      `origin/${mainBranch}`,
    ]);
    if (merge.code !== 0) {
      await runCommand('git', ['-C', clonePath, 'merge', '--abort']);
      return blocked(
        repositoryBase,
        commandFailure(
          `Merging ${mainBranch} into ${testBranch} produced conflicts; resolve them manually.`,
          merge
        )
      );
    }

    const commit = await runCommand('git', ['-C', clonePath, 'rev-parse', 'HEAD']);
    const parents = await runCommand('git', ['-C', clonePath, 'rev-list', '--parents', '-n', '1', 'HEAD']);
    const parentFields = parents.stdout.trim().split(/\s+/);
    if (commit.code !== 0 || parents.code !== 0 || parentFields.length !== 3) {
      return blocked(repositoryBase, 'The isolated sync did not produce the required two-parent merge commit.');
    }
    const mergeCommit = commit.stdout.trim();

    const lease = syncRemote.sha
      ? `--force-with-lease=refs/heads/${syncBranch}:${syncRemote.sha}`
      : `--force-with-lease=refs/heads/${syncBranch}:`;
    const push = await runCommand('git', [
      '-C',
      clonePath,
      'push',
      '--quiet',
      lease,
      'origin',
      `HEAD:refs/heads/${syncBranch}`,
    ]);
    if (push.code !== 0) {
      return blocked(repositoryBase, commandFailure('Unable to push the sync branch.', push));
    }

    if (existingPullRequest) {
      return {
        ...repositoryBase,
        status: 'updated',
        message: `Updated the existing ${syncBranch} pull request with the latest ${mainBranch}.`,
        mergeCommit,
        prUrl: existingPullRequest.url,
      };
    }

    const createPr = await runCommand(
      'gh',
      [
        'pr',
        'create',
        '--repo',
        githubRepository.slug,
        '--base',
        testBranch,
        '--head',
        syncBranch,
        '--title',
        PR_TITLE,
        '--body',
        PR_BODY,
      ],
      { cwd: resolvedRepositoryPath }
    );
    if (createPr.code !== 0) {
      const rollback = await rollbackSyncBranch(
        runCommand,
        clonePath,
        syncBranch,
        syncRemote.sha,
        mergeCommit
      );
      const rollbackMessage =
        rollback.code === 0
          ? 'The pushed sync branch was rolled back.'
          : `Rollback also failed: ${commandDetail(rollback)}`;
      return blocked(
        repositoryBase,
        `${commandFailure('Unable to create the sync pull request.', createPr)} ${rollbackMessage}`
      );
    }

    return {
      ...repositoryBase,
      status: 'created',
      message: `Created a merge-commit sync pull request from ${syncBranch} into ${testBranch}.`,
      mergeCommit,
      prUrl: createPr.stdout.trim(),
    };
  } finally {
    await removeTempDirectory(tempRoot);
  }
}

async function readRemoteBranch(
  runCommand: CommandRunner,
  repositoryPath: string,
  remote: string,
  branch: string
): Promise<{ sha?: string; error?: string }> {
  const result = await runCommand('git', [
    '-C',
    repositoryPath,
    'ls-remote',
    '--heads',
    remote,
    `refs/heads/${branch}`,
  ]);
  if (result.code !== 0) {
    return { error: commandFailure(`Unable to inspect remote branch ${remote}/${branch}.`, result) };
  }
  const sha = result.stdout.trim().split(/\s+/)[0];
  return sha ? { sha } : {};
}

async function ensureGitIdentity(runCommand: CommandRunner, repositoryPath: string): Promise<void> {
  const name = await runCommand('git', ['-C', repositoryPath, 'config', 'user.name']);
  if (name.code !== 0 || !name.stdout.trim()) {
    await runCommand('git', ['-C', repositoryPath, 'config', 'user.name', 'MDS Sync Bot']);
  }
  const email = await runCommand('git', ['-C', repositoryPath, 'config', 'user.email']);
  if (email.code !== 0 || !email.stdout.trim()) {
    await runCommand('git', [
      '-C',
      repositoryPath,
      'config',
      'user.email',
      'mds-sync@users.noreply.github.com',
    ]);
  }
}

async function rollbackSyncBranch(
  runCommand: CommandRunner,
  repositoryPath: string,
  syncBranch: string,
  previousSha: string | undefined,
  pushedSha: string
): Promise<CommandOutput> {
  const lease = `--force-with-lease=refs/heads/${syncBranch}:${pushedSha}`;
  const refspec = previousSha
    ? `${previousSha}:refs/heads/${syncBranch}`
    : `:refs/heads/${syncBranch}`;
  return runCommand('git', [
    '-C',
    repositoryPath,
    'push',
    '--quiet',
    lease,
    'origin',
    refspec,
  ]);
}

function parsePullRequests(raw: string): ExistingPullRequest[] | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return null;
    const pullRequests: ExistingPullRequest[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      if (
        typeof candidate.number !== 'number' ||
        typeof candidate.url !== 'string' ||
        typeof candidate.headRefName !== 'string' ||
        typeof candidate.baseRefName !== 'string'
      ) {
        return null;
      }
      pullRequests.push({
        number: candidate.number,
        url: candidate.url,
        headRefName: candidate.headRefName,
        baseRefName: candidate.baseRefName,
      });
    }
    return pullRequests;
  } catch {
    return null;
  }
}

function parseGitHubRepository(remote: string): GitHubRepository | null {
  const scp = /^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/.exec(remote);
  if (scp) {
    return {
      hostname: scp[1] ?? 'github.com',
      slug: `${scp[2]}/${scp[3]}`,
    };
  }

  try {
    const url = new URL(remote);
    if (!['https:', 'http:', 'ssh:'].includes(url.protocol)) return null;
    const slug = url.pathname.replace(/^\//, '').replace(/\.git$/, '');
    if (slug.split('/').length !== 2) return null;
    return { hostname: url.hostname, slug };
  } catch {
    return null;
  }
}

function blocked(
  base: Omit<SyncMainIntoTestResult, 'status' | 'message'>,
  message: string
): SyncMainIntoTestResult {
  return { ...base, status: 'blocked', message };
}

function commandFailure(message: string, output: CommandOutput): string {
  const detail = commandDetail(output);
  return detail ? `${message} ${detail}` : message;
}

function commandDetail(output: CommandOutput): string {
  return output.stderr.trim() || output.stdout.trim();
}

export function runProcess(
  command: string,
  args: string[],
  options: CommandOptions = {}
): Promise<CommandOutput> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
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
      resolve({ code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}
