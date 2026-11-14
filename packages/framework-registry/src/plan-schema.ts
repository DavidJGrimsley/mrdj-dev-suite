import type { GenerationPlan } from './types.js';

function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('Expected plain object');
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).some(k => !keys.includes(k))) throw new Error('Unknown plan field');
  return obj;
}
function text(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value || value.includes('\0')) throw new Error('Expected non-empty string');
}
function strings(value: unknown): asserts value is string[] {
  if (!Array.isArray(value)) throw new Error('Expected string array');
  value.forEach(text);
}
function json(value: unknown, depth = 0): void {
  if (depth > 30) throw new Error('JSON nesting too deep');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return;
  if (Array.isArray(value)) { value.forEach(v => json(v, depth + 1)); return; }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    Object.entries(value).forEach(([k, v]) => { if (['__proto__', 'constructor', 'prototype'].includes(k)) throw new Error('Unsafe JSON key'); json(v, depth + 1); }); return;
  }
  throw new Error('Expected JSON value');
}
/** Runtime boundary for persisted CLI/MCP plans. Adapter validation supplies semantic checks. */
export function parseGenerationPlan(value: unknown): GenerationPlan {
  const p = record(value, ['schemaVersion','planId','frameworkId','templateId','appName','bundleId','targetDirectory','targetPlatforms','pinnedRevision','reservationPaths','planDigest','createdAt','generatorIdentity','options','execution','projectMemory','workspace']);
  if (p.schemaVersion !== 1) throw new Error('Unsupported plan schema');
  ['planId','frameworkId','templateId','appName','bundleId','targetDirectory','createdAt','planDigest'].forEach(k => text(p[k]));
  if (!/^[a-f0-9]{64}$/.test(p.planDigest as string)) throw new Error('Invalid plan digest');
  strings(p.targetPlatforms); strings(p.reservationPaths);
  if (!(p.targetPlatforms as string[]).length || (p.targetPlatforms as string[]).some(v => !['web','ios','android','macos','windows','linux'].includes(v))) throw new Error('Invalid platforms');
  const pin = record(p.pinnedRevision, ['repository','branch','commit']); text(pin.repository); text(pin.commit); if (pin.branch !== undefined) text(pin.branch);
  const id = record(p.generatorIdentity, ['adapterId','adapterVersion','frameworkCommit','timestamp']); ['adapterId','adapterVersion','frameworkCommit'].forEach(k => text(id[k]));
  if (p.options !== undefined) json(p.options);
  const memory = record(p.projectMemory, ['mode','location','coordinatorOwned']); text(memory.location);
  if (!['new-workspace','distinct-project','workspace-member'].includes(memory.mode as string) || typeof memory.coordinatorOwned !== 'boolean') throw new Error('Invalid memory identity');
  // A new workspace carries its complete reviewed topology; the other identities never do.
  if ((memory.mode === 'new-workspace') !== (p.workspace !== undefined)) throw new Error('Workspace topology is required for, and only valid with, new-workspace');
  if (p.workspace !== undefined) {
    const fields = ['workspaceId','name','root','projectPath','manifestPath','tempPath','generatedPath','sourcePath','generatorOutputPath','defaultBranch','sourceRemote','projectRemote','logPath'];
    const ws = record(p.workspace, [...fields,'git','commitAuthor','enclosingWorkspace']);
    fields.forEach(k => text(ws[k]));
    const git = record(ws.git, ['executable','digest']); text(git.executable); text(git.digest);
    const author = record(ws.commitAuthor, ['name','email']); text(author.name); text(author.email);
    if (ws.enclosingWorkspace !== undefined) { const outer = record(ws.enclosingWorkspace, ['root','workspaceId']); text(outer.root); text(outer.workspaceId); }
  }
  const exec = record(p.execution, ['executable','executableDigest','cwd','args','script','scriptDigest','checkouts','timeoutMs','localSources']);
  if (exec.localSources !== undefined) {
    if (!Array.isArray(exec.localSources)) throw new Error('Invalid local sources');
    exec.localSources.forEach(v => { const s = record(v, ['directory','digest']); text(s.directory); text(s.digest); });
  }
  ['executable','executableDigest','cwd','script','scriptDigest'].forEach(k => text(exec[k])); strings(exec.args);
  if (!Number.isSafeInteger(exec.timeoutMs) || (exec.timeoutMs as number) < 1 || (exec.timeoutMs as number) > 3600000) throw new Error('Invalid execution timeout');
  if (!Array.isArray(exec.checkouts)) throw new Error('Expected checkout identities');
  exec.checkouts.forEach(c => { const checkout = record(c, ['directory','repository','branch','commit','treeDigest']); ['directory','repository','commit','treeDigest'].forEach(k => text(checkout[k])); if (checkout.branch !== undefined) text(checkout.branch); if (!/^[a-f0-9]{40}$/.test(checkout.commit as string)) throw new Error('Invalid immutable commit'); });
  return value as GenerationPlan;
}
