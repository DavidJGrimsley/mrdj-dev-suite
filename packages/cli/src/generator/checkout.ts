import { existsSync } from 'node:fs';
import path from 'node:path';
import { UPSTREAM_REVISIONS, canonicalizeJson, computeSha256, type PinnedRevision } from '@mr.dj2u/framework-registry';
import { ReservationJournal } from './journal.js';
import { fileDigest, identifyCheckout, identifyExecutable, runCommand, type CommandRunner } from './runner.js';

export interface CheckoutPreparationPlan { readonly pin: PinnedRevision; readonly directory: string; readonly executable: string; readonly executableDigest: string; readonly digest: string }
export function planCheckoutPreparation(pin: PinnedRevision, directory: string): CheckoutPreparationPlan {
  if (!Object.values(UPSTREAM_REVISIONS).some(p => p.commit === pin.commit && p.repository === pin.repository)) throw new Error('Only registered immutable upstream pins may be prepared');
  const executable = identifyExecutable('git');
  const content = {pin,directory:path.resolve(directory),executable,executableDigest:fileDigest(executable)};
  return {...content,digest:computeSha256(canonicalizeJson(content))};
}
/** Network/git mutation is separately approved; no dependency or system setup is installed. */
export async function prepareCheckout(plan: CheckoutPreparationPlan, approvedDigest: string, runner: CommandRunner = runCommand) {
  const expected = planCheckoutPreparation(plan.pin,plan.directory);
  if (canonicalizeJson(expected) !== canonicalizeJson(plan) || approvedDigest !== expected.digest) throw new Error('Checkout preparation requires approval of its current immutable plan');
  if (existsSync(plan.directory)) return identifyCheckout(plan.directory,plan.pin);
  const reservation = new ReservationJournal(plan.directory); reservation.reserve();
  try {
    const commands = [
      ['init',plan.directory],
      ['-C',plan.directory,'remote','add','origin',plan.pin.repository],
      ['-C',plan.directory,'fetch','--depth','1','origin',plan.pin.commit],
      ['-C',plan.directory,'checkout','--detach',plan.pin.commit],
    ];
    for (const args of commands) {
      const result = await runner({executable:plan.executable,args,cwd:path.dirname(plan.directory),timeoutMs:300000});
      if (result.code !== 0) throw new Error(`Checkout preparation failed: ${result.stderr.slice(-2000)}. Partial checkout retained.`);
    }
    return identifyCheckout(plan.directory,plan.pin);
  } finally { reservation.commit(); }
}
