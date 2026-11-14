import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFrameworkAdapterRegistry } from '../src/generator.js';
import { runGeneratePlanCommand, runGenerateRunCommand } from '../src/commands/generate.js';

const dirs: string[] = [];
afterEach(() => { vi.restoreAllMocks(); for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
describe('generation JSON output', () => {
  it('emits just the plan when writing it to a file', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mds-plan-json-')); dirs.push(dir);
    const plan = { planDigest: 'digest', appName: 'demo' };
    vi.spyOn(getFrameworkAdapterRegistry(), 'planGeneration').mockResolvedValue(plan as never);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const output = path.join(dir, 'plan.json');
    await runGeneratePlanCommand({ name: 'demo', target: dir, out: output, json: true });
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(log.mock.calls[0][0]))).toEqual(plan);
    expect(JSON.parse(readFileSync(output, 'utf8'))).toEqual(plan);
  });
  it('emits just the result during execution', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mds-run-json-')); dirs.push(dir);
    const plan = { planDigest: 'digest', appName: 'demo', frameworkId: 'exact' };
    const planFile = path.join(dir, 'plan.json'); writeFileSync(planFile, JSON.stringify(plan));
    const result = { success: true };
    vi.spyOn(getFrameworkAdapterRegistry(), 'generate').mockResolvedValue(result as never);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runGenerateRunCommand({ planFile, approvedDigest: 'digest', dryRun: true, json: true });
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(log.mock.calls[0][0]))).toEqual(result);
  });
});
