import { describe, expect, it } from 'vitest';

import { parsePidLines, parseWindowsNetstatPids } from '../src/commands/dev-tools.js';

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
});
