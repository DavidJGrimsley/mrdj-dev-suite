import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, lstatSync, openSync, readFileSync, readlinkSync, realpathSync, readdirSync, statSync, writeSync } from 'node:fs';
import path from 'node:path';
import type { CancellationTokenLike, CheckoutIdentity, ExecutionIdentity } from './adapter-types.js';

export function controlledEnvironment(): Record<string, string | undefined> {
  // Proxy and CA settings are forwarded so package installs follow the user's network policy.
  const allowed = new Set(['path','pathext','systemroot','windir','comspec','userprofile','home','tmp','temp','localappdata','appdata','programfiles','programfiles(x86)','programdata','number_of_processors','lang','lc_all','http_proxy','https_proxy','no_proxy','node_extra_ca_certs','rustup_home','cargo_home','rustup_toolchain','bun']);
  return {...Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toLowerCase()))), EXACT_FEEDBACK:'0', CI:'1'};
}
/** `logFile`, when given, receives the complete output (created exclusively); memory only ever holds a bounded tail. */
export interface CommandSpec { executable: string; args: readonly string[]; cwd: string; timeoutMs: number; logFile?: string }
export interface CommandResult { code: number; stdout: string; stderr: string }
export type CommandRunner = (command: CommandSpec, cancellation?: CancellationTokenLike) => Promise<CommandResult>;
export const OUTPUT_TAIL_LIMIT = 256 * 1024;
function appendTail(current: string, chunk: string): string { const next = current + chunk; return next.length > OUTPUT_TAIL_LIMIT ? next.slice(-OUTPUT_TAIL_LIMIT) : next; }
/** Bounded memory and lifetime; arguments are never interpreted by a shell. Output volume never stops a command. */
export const runCommand: CommandRunner = (command, cancellation) => new Promise((resolve, reject) => {
  cancellation?.throwIfCancelled();
  let log: number | undefined;
  if (command.logFile) { assertNoSymlinks(command.logFile); log = openSync(command.logFile, 'wx', 0o600); }
  const record = (chunk: unknown) => { if (log !== undefined) { try { writeSync(log, Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))); } catch { /* Logging never changes the command outcome. */ } } };
  const closeLog = () => { if (log !== undefined) { try { closeSync(log); } catch { /* Already closed. */ } log = undefined; } };
  const child = spawn(command.executable, [...command.args], { cwd: command.cwd, shell: false, windowsHide: true, env: controlledEnvironment(), stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
  let stdout = '', stderr = '', stopped: Error | undefined, settled = false;
  const started = Date.now();
  const stop = (error: Error) => {
    stopped ??= error;
    if (process.platform === 'win32' && child.pid) {
      spawnSync('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, timeout: 5000, stdio: 'ignore' });
    } else if (child.pid) { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
  };
  const timer = () => {
    if (settled) return;
    if (cancellation?.isCancelled) stop(new Error('Generation cancelled; partial scaffold retained'));
    else if (Date.now() - started >= command.timeoutMs) stop(new Error('Command timed out; partial scaffold retained'));
    poll = setTimeout(timer, 50);
  };
  let poll = setTimeout(timer, 50);
  child.stdout.on('data', chunk => { record(chunk); stdout = appendTail(stdout, String(chunk)); });
  child.stderr.on('data', chunk => { record(chunk); stderr = appendTail(stderr, String(chunk)); });
  child.on('error', error => { settled = true; clearTimeout(poll); closeLog(); reject(error); });
  child.on('close', code => { settled = true; clearTimeout(poll); closeLog(); if (stopped) reject(stopped); else resolve({ code: code ?? -1, stdout, stderr }); });
});
export function fileDigest(file: string): string { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
export function directoryDigest(directory: string): string {
  assertNoSymlinks(directory); const hash = createHash('sha256');
  const visit = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const st = lstatSync(full);
      if (st.isSymbolicLink()) {
        const link = readlinkSync(full);
        const resolved = path.resolve(path.dirname(full), link);
        const rel = path.relative(directory, resolved);
        if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error(`Directory symlink escapes root: ${full}`);
        hash.update(path.relative(directory, full)).update('\0').update(link);
      } else if (st.isDirectory()) {
        visit(full);
      } else if (st.isFile()) {
        hash.update(path.relative(directory, full)).update('\0').update(fileDigest(full));
      }
    }
  };
  visit(directory); return hash.digest('hex');
}
export function assertNoSymlinks(location: string): void {
  let cursor = path.resolve(location);
  for (;;) {
    try { if (lstatSync(cursor).isSymbolicLink()) throw new Error(`Symlink/junction is not allowed: ${cursor}`); }
    catch (error) { if ((error as { code?: string }).code !== 'ENOENT') throw error; }
    const parent = path.dirname(cursor); if (parent === cursor) break; cursor = parent;
  }
}
function git(directory: string, args: string[]): string {
  const result = spawnSync('git', ['-C', directory, ...args], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 10000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`Cannot inspect checkout: ${result.stderr || result.error?.message}`);
  return result.stdout.trim();
}
export function identifyCheckout(directory: string, pin: { repository: string; commit: string }): CheckoutIdentity {
  assertNoSymlinks(directory); const canonical = realpathSync(directory);
  if (git(canonical, ['rev-parse','HEAD']) !== pin.commit) throw new Error('Checkout HEAD does not match approved immutable revision');
  if (git(canonical, ['status','--porcelain','--untracked-files=all'])) throw new Error('Checkout has local modifications or untracked files');
  const remote = git(canonical, ['remote','get-url','origin']).replace(/\.git$/, '');
  if (remote !== pin.repository.replace(/\.git$/, '')) throw new Error('Checkout origin does not match pinned repository');
  const files = git(canonical, ['ls-files','-z']).split('\0').filter(Boolean).sort();
  const hash = createHash('sha256');
  for (const file of files) {
    const full = path.join(canonical, file);
    const st = lstatSync(full);
    if (st.isSymbolicLink()) {
      const link = readlinkSync(full);
      const resolved = path.resolve(path.dirname(full), link);
      const rel = path.relative(canonical, resolved);
      if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error(`Checkout symlink escapes checkout root: ${file}`);
      hash.update(file).update('\0').update(link);
    } else if (st.isFile()) {
      hash.update(file).update('\0').update(fileDigest(full));
    } else {
      throw new Error('Submodules/non-file checkout entries require explicit support');
    }
  }
  return { directory: canonical, ...pin, treeDigest: hash.digest('hex') };
}
export function identifyExecutable(binary: string): string {
  if (path.isAbsolute(binary)) {
    try { if (statSync(binary).isFile()) return path.resolve(binary); } catch { /* Report the missing explicit executable below. */ }
    throw new Error(`Missing executable ${binary}`);
  }
  // Match the public command's PATH. Task artifacts and BUN/CARGO_HOME overrides must not
  // make an ordinary shell appear ready when its actual executables are missing or stale.
  const candidates = (process.env.PATH ?? '').split(path.delimiter).flatMap(dir => process.platform === 'win32' ? [path.join(dir, `${binary}.exe`), path.join(dir, binary)] : [path.join(dir, binary)]);
  for (const candidate of candidates) { try { if (statSync(candidate).isFile()) return path.resolve(candidate); } catch { /* Continue PATH lookup. */ } }
  throw new Error(`Missing executable ${binary}`);
}
export function validateExecutionIdentity(execution: ExecutionIdentity): void {
  assertNoSymlinks(execution.cwd); assertNoSymlinks(execution.script);
  if (fileDigest(execution.executable) !== execution.executableDigest || fileDigest(execution.script) !== execution.scriptDigest) throw new Error('Executable/script content changed after planning');
  for (const checkout of execution.checkouts) if (identifyCheckout(checkout.directory, checkout).treeDigest !== checkout.treeDigest) throw new Error('Checkout content changed after planning');
  for (const source of execution.localSources ?? []) if (directoryDigest(source.directory) !== source.digest) throw new Error('Local generator dependency content changed after planning');
}
