import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_SYNC_BRANCH,
  runProcess,
  syncMainIntoTest,
  type CommandRunner,
} from '../src/commands/sync-main-into-test.js';

const tempDirectories: string[] = [];
const TEST_TIMEOUT = 30_000;

afterEach(async () => {
  await Promise.all(
    tempDirectories.map((directory) => rm(directory, { recursive: true, force: true }))
  );
  tempDirectories.length = 0;
});

interface RepositoryFixture {
  root: string;
  origin: string;
  checkout: string;
}

interface FakeGitHubOptions {
  authFails?: boolean;
  createFails?: boolean;
  pushFails?: boolean;
}

function commandSucceeded(stdout = '') {
  return { code: 0, stdout, stderr: '' };
}

function commandFailed(stderr: string) {
  return { code: 1, stdout: '', stderr };
}

async function git(cwd: string, args: string[]): Promise<string> {
  const result = await runProcess('git', args, { cwd });
  if (result.code !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

async function createRepositoryFixture(options: { missingTest?: boolean; conflict?: boolean } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mds-sync-fixture-'));
  tempDirectories.push(root);
  const origin = path.join(root, 'origin.git');
  const checkout = path.join(root, 'checkout');
  await mkdir(checkout, { recursive: true });
  await git(root, ['init', '--bare', origin]);
  await git(checkout, ['init']);
  await git(checkout, ['config', 'user.name', 'Fixture User']);
  await git(checkout, ['config', 'user.email', 'fixture@example.com']);

  await writeFile(path.join(checkout, 'shared.txt'), 'common\n', 'utf8');
  await git(checkout, ['add', 'shared.txt']);
  await git(checkout, ['commit', '-m', 'common']);
  await git(checkout, ['branch', '-M', 'main']);
  await git(checkout, ['remote', 'add', 'origin', origin]);
  await git(checkout, ['push', '-u', 'origin', 'main']);

  if (!options.missingTest) {
    await git(checkout, ['checkout', '-b', 'test']);
    await writeFile(path.join(checkout, 'feature.txt'), 'tested feature\n', 'utf8');
    await git(checkout, ['add', 'feature.txt']);
    await git(checkout, ['commit', '-m', 'tested feature']);
    await git(checkout, ['push', '-u', 'origin', 'test']);

    await git(checkout, ['checkout', 'main']);
    await git(checkout, ['merge', '--no-ff', 'test', '-m', 'promote test to main']);
    await git(checkout, ['push', 'origin', 'main']);

    if (options.conflict) {
      await writeFile(path.join(checkout, 'shared.txt'), 'main changed this\n', 'utf8');
      await git(checkout, ['add', 'shared.txt']);
      await git(checkout, ['commit', '-m', 'main change']);
      await git(checkout, ['push', 'origin', 'main']);
      await git(checkout, ['checkout', 'test']);
      await writeFile(path.join(checkout, 'shared.txt'), 'test changed this\n', 'utf8');
      await git(checkout, ['add', 'shared.txt']);
      await git(checkout, ['commit', '-m', 'test change']);
      await git(checkout, ['push', 'origin', 'test']);
      await git(checkout, ['checkout', 'main']);
    }
  }

  return { root, origin, checkout } satisfies RepositoryFixture;
}

function createFakeRunner(fixture: RepositoryFixture, options: FakeGitHubOptions = {}) {
  const fakeRemote = 'https://github.com/example/managed-repository.git';
  let existingPullRequest = false;
  let createCalls = 0;
  const ghCalls: string[][] = [];

  const runner: CommandRunner = async (command, args, commandOptions) => {
    if (command === 'gh') {
      ghCalls.push(args);
      if (args[0] === 'auth') {
        return options.authFails ? commandFailed('not authenticated') : commandSucceeded();
      }
      if (args[0] === 'pr' && args[1] === 'list') {
        return commandSucceeded(
          JSON.stringify(
            existingPullRequest
              ? [
                  {
                    number: 42,
                    url: 'https://github.com/example/managed-repository/pull/42',
                    headRefName: DEFAULT_SYNC_BRANCH,
                    baseRefName: 'test',
                  },
                ]
              : []
          )
        );
      }
      if (args[0] === 'pr' && args[1] === 'create') {
        createCalls += 1;
        if (options.createFails) return commandFailed('pull-request permission denied');
        existingPullRequest = true;
        return commandSucceeded('https://github.com/example/managed-repository/pull/42\n');
      }
      return commandFailed(`Unexpected gh command: ${args.join(' ')}`);
    }

    if (
      command === 'git' &&
      args.includes('remote') &&
      args.includes('get-url') &&
      args.includes('origin')
    ) {
      return commandSucceeded(`${fakeRemote}\n`);
    }

    if (command === 'git' && args[0] === 'clone') {
      const cloneArgs = args.map((argument) => (argument === fakeRemote ? fixture.origin : argument));
      return runProcess(command, cloneArgs, commandOptions);
    }

    if (
      options.pushFails &&
      command === 'git' &&
      args.includes('push') &&
      args.some((argument) => argument === `HEAD:refs/heads/${DEFAULT_SYNC_BRANCH}`)
    ) {
      return commandFailed('write permission denied');
    }

    return runProcess(command, args, commandOptions);
  };

  return {
    runner,
    ghCalls,
    getCreateCalls: () => createCalls,
  };
}

async function remoteBranchSha(fixture: RepositoryFixture, branch: string): Promise<string | null> {
  const output = await git(fixture.checkout, [
    'ls-remote',
    '--heads',
    'origin',
    `refs/heads/${branch}`,
  ]);
  return output ? output.split(/\s+/)[0] ?? null : null;
}

describe('syncMainIntoTest', () => {
  it('creates one reusable merge-commit PR and updates it on a repeated trigger', async () => {
    const fixture = await createRepositoryFixture();
    const fake = createFakeRunner(fixture);
    const branchBefore = await git(fixture.checkout, ['branch', '--show-current']);
    const statusBefore = await git(fixture.checkout, ['status', '--porcelain']);

    const created = await syncMainIntoTest(
      { path: fixture.checkout, execute: true },
      { runCommand: fake.runner }
    );

    expect(created.status).toBe('created');
    expect(created.prUrl).toBe('https://github.com/example/managed-repository/pull/42');
    expect(fake.getCreateCalls()).toBe(1);
    const syncSha = await remoteBranchSha(fixture, DEFAULT_SYNC_BRANCH);
    expect(syncSha).toBeTruthy();
    const parents = await git(fixture.checkout, [
      '--git-dir',
      fixture.origin,
      'rev-list',
      '--parents',
      '-n',
      '1',
      `refs/heads/${DEFAULT_SYNC_BRANCH}`,
    ]);
    expect(parents.split(/\s+/)).toHaveLength(3);
    await git(fixture.checkout, [
      '--git-dir',
      fixture.origin,
      'merge-base',
      '--is-ancestor',
      'refs/heads/main',
      `refs/heads/${DEFAULT_SYNC_BRANCH}`,
    ]);

    const updated = await syncMainIntoTest(
      { path: fixture.checkout, execute: true },
      { runCommand: fake.runner }
    );

    expect(updated.status).toBe('updated');
    expect(updated.prUrl).toBe(created.prUrl);
    expect(fake.getCreateCalls()).toBe(1);
    expect(await git(fixture.checkout, ['branch', '--show-current'])).toBe(branchBefore);
    expect(await git(fixture.checkout, ['status', '--porcelain'])).toBe(statusBefore);
  }, TEST_TIMEOUT);

  it('returns a no-op when test already contains main', async () => {
    const fixture = await createRepositoryFixture();
    const fake = createFakeRunner(fixture);
    const created = await syncMainIntoTest(
      { path: fixture.checkout, execute: true },
      { runCommand: fake.runner }
    );
    expect(created.status).toBe('created');

    await git(fixture.checkout, ['fetch', 'origin', `${DEFAULT_SYNC_BRANCH}:sync-result`]);
    await git(fixture.checkout, ['checkout', 'test']);
    await git(fixture.checkout, ['merge', '--no-ff', 'sync-result', '-m', 'merge sync PR']);
    await git(fixture.checkout, ['push', 'origin', 'test']);
    await git(fixture.checkout, ['checkout', 'main']);

    const result = await syncMainIntoTest(
      { path: fixture.checkout, execute: true },
      { runCommand: fake.runner }
    );

    expect(result.status).toBe('noop');
    expect(result.message).toContain('already contains');
  }, TEST_TIMEOUT);

  it('blocks without mutation when test is missing', async () => {
    const fixture = await createRepositoryFixture({ missingTest: true });
    const fake = createFakeRunner(fixture);

    const result = await syncMainIntoTest(
      { path: fixture.checkout, execute: true },
      { runCommand: fake.runner }
    );

    expect(result.status).toBe('blocked');
    expect(result.message).toContain('origin/test does not exist');
    expect(await remoteBranchSha(fixture, DEFAULT_SYNC_BRANCH)).toBeNull();
    expect(fake.ghCalls).toHaveLength(0);
  }, TEST_TIMEOUT);

  it('blocks without mutation when authentication or push permissions are unavailable', async () => {
    const authFixture = await createRepositoryFixture();
    const authFake = createFakeRunner(authFixture, { authFails: true });
    const authResult = await syncMainIntoTest(
      { path: authFixture.checkout, execute: true },
      { runCommand: authFake.runner }
    );
    expect(authResult.status).toBe('blocked');
    expect(authResult.message).toContain('authentication');
    expect(await remoteBranchSha(authFixture, DEFAULT_SYNC_BRANCH)).toBeNull();

    const pushFixture = await createRepositoryFixture();
    const pushFake = createFakeRunner(pushFixture, { pushFails: true });
    const pushResult = await syncMainIntoTest(
      { path: pushFixture.checkout, execute: true },
      { runCommand: pushFake.runner }
    );
    expect(pushResult.status).toBe('blocked');
    expect(pushResult.message).toContain('write permission denied');
    expect(await remoteBranchSha(pushFixture, DEFAULT_SYNC_BRANCH)).toBeNull();
  }, TEST_TIMEOUT);

  it('leaves no remote branch when the merge conflicts or PR creation fails', async () => {
    const conflictFixture = await createRepositoryFixture({ conflict: true });
    const conflictFake = createFakeRunner(conflictFixture);
    const conflictResult = await syncMainIntoTest(
      { path: conflictFixture.checkout, execute: true },
      { runCommand: conflictFake.runner }
    );
    expect(conflictResult.status).toBe('blocked');
    expect(conflictResult.message).toContain('produced conflicts');
    expect(await remoteBranchSha(conflictFixture, DEFAULT_SYNC_BRANCH)).toBeNull();

    const prFixture = await createRepositoryFixture();
    const prFake = createFakeRunner(prFixture, { createFails: true });
    const prResult = await syncMainIntoTest(
      { path: prFixture.checkout, execute: true },
      { runCommand: prFake.runner }
    );
    expect(prResult.status).toBe('blocked');
    expect(prResult.message).toContain('was rolled back');
    expect(await remoteBranchSha(prFixture, DEFAULT_SYNC_BRANCH)).toBeNull();
  }, TEST_TIMEOUT);

  it('plans without creating a temporary clone or contacting GitHub', async () => {
    const fixture = await createRepositoryFixture();
    const fake = createFakeRunner(fixture);
    let createdTempDirectory = false;

    const result = await syncMainIntoTest(
      { path: fixture.checkout },
      {
        runCommand: fake.runner,
        createTempDirectory: async () => {
          createdTempDirectory = true;
          return fixture.root;
        },
      }
    );

    expect(result.status).toBe('planned');
    expect(createdTempDirectory).toBe(false);
    expect(fake.ghCalls).toHaveLength(0);
    expect(await readFile(path.join(fixture.checkout, 'shared.txt'), 'utf8')).toBe('common\n');
  }, TEST_TIMEOUT);
});
