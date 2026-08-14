import { describe, expect, it } from 'vitest';

import {
  buildExpoStartCommandInvocation,
  parsePidLines,
  parseWindowsNetstatPids,
  resolveStructuredCommandInvocation,
} from '../src/commands/dev-tools.js';

describe('dev tools port helpers', () => {
  it('dedupes PowerShell TCP owning process output and ignores PID 0', () => {
    expect(parsePidLines('1234\r\n1234\r\n0\r\n5678\r\n')).toEqual([1234, 5678]);
  });

  it('parses Windows netstat listeners for a specific port only', () => {
    const stdout = [
      '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       1234',
      '  TCP    [::]:3000              [::]:0                 LISTENING       1234',
      '  TCP    127.0.0.1:3001         127.0.0.1:55555        ESTABLISHED     7777',
      '  TCP    0.0.0.0:8081           0.0.0.0:0              LISTENING       0',
    ].join('\r\n');

    expect(parseWindowsNetstatPids(stdout, 3000)).toEqual([1234]);
    expect(parseWindowsNetstatPids(stdout, 3001)).toEqual([]);
    expect(parseWindowsNetstatPids(stdout, 8081)).toEqual([]);
  });

  it('uses structured arguments for Expo startup instead of shell execution', () => {
    expect(buildExpoStartCommandInvocation('npm')).toEqual({
      command: 'npx',
      args: ['expo', 'start', '--clear'],
      display: 'npx expo start --clear',
    });
    expect(buildExpoStartCommandInvocation('pnpm')).toEqual({
      command: 'pnpm',
      args: ['exec', 'expo', 'start', '--clear'],
      display: 'pnpm exec expo start --clear',
    });
  });

  it('uses an explicit cmd.exe wrapper for Windows package-manager shims', () => {
    const invocation = buildExpoStartCommandInvocation('pnpm');

    expect(
      resolveStructuredCommandInvocation(
        invocation,
        'win32',
        'C:\\Windows\\System32\\cmd.exe'
      )
    ).toEqual({
      command: 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', 'pnpm exec expo start --clear'],
      display: 'pnpm exec expo start --clear',
    });
    expect(resolveStructuredCommandInvocation(invocation, 'linux')).toEqual(invocation);
    expect(resolveStructuredCommandInvocation(invocation, 'win32', '')).toMatchObject({
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'pnpm exec expo start --clear'],
    });
  });
});
