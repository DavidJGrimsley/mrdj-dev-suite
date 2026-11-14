/** Bounded startup smoke check using the caller's ordinary inherited environment. */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import type { CancellationTokenLike, VerificationCheck } from './adapter-types.js';
import type { CommandSpec } from './runner.js';

export async function availableLoopbackPort(): Promise<number> {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') { server.close(); reject(new Error('No loopback port allocated')); return; }
      server.close(error => error ? reject(error) : resolve(address.port));
    });
  });
}

/** Kills descendants as well as the package-manager/dev-server parent; never kills by port/name. */
function stopTree(child: ReturnType<typeof spawn>): void {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, timeout: 5000, stdio: 'ignore' });
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); }
    catch { child.kill('SIGKILL'); }
  }
}

/** HTTP smoke coverage only: browser execution and native hosts require separate checks. */
export async function verifyStartup(command: CommandSpec, url: string, expectedText: string, cancellation?: CancellationTokenLike): Promise<VerificationCheck> {
  const label = [command.executable, ...command.args].join(' ');
  const check = (passed: boolean, message: string): VerificationCheck => ({ name: 'web startup', passed, command: label, message });
  let output = '', exited: string | undefined;
  const child = spawn(command.executable, [...command.args], {
    cwd: command.cwd, env: { ...process.env }, shell: false, windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
  });
  const closed = new Promise<void>(resolve => child.once('close', () => resolve()));
  child.on('error', error => { exited = error.message; });
  child.on('exit', (code, signal) => { exited = `exit ${code ?? signal}`; });
  const tail = (chunk: unknown) => { output = (output + String(chunk)).slice(-4000); };
  child.stdout?.on('data', tail); child.stderr?.on('data', tail);
  let lastFailure = 'HTTP listener has not become available';
  const deadline = Date.now() + command.timeoutMs;
  try {
    while (Date.now() < deadline) {
      cancellation?.throwIfCancelled();
      if (exited !== undefined) return check(false, `Startup failed (${exited}). ${output}`);
      try {
        const response = await fetch(url, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(Math.max(1, Math.min(1000, deadline - Date.now()))), redirect: 'error' });
        const body = await response.text();
        if (response.ok && body.trim() && body.includes(expectedText) && exited === undefined) {
          return check(true, `HTTP ${response.status}; nonempty expected app document at ${url}. Process tree stopped after check. Browser execution and native platforms were not verified.`);
        }
        lastFailure = `HTTP ${response.status}; ${body.includes(expectedText) ? 'empty/unsuccessful document' : `expected app marker ${JSON.stringify(expectedText)} absent`}`;
      } catch (error) { lastFailure = error instanceof Error ? error.message : String(error); }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return check(false, `Startup timed out after ${command.timeoutMs}ms: ${lastFailure}. ${output}`);
  } finally {
    stopTree(child);
    // A broken child must not hold generation forever, even if its stdio never closes.
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([closed, new Promise<void>(resolve => { timer = setTimeout(resolve, 5000); })]);
    if (timer) clearTimeout(timer);
  }
}
