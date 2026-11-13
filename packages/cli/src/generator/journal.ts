/** Exclusive destination reservation. Failed external scaffolds are retained for review. */
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DestinationNotEmptyError, type JournalEntry } from '@mr.dj2u/framework-registry';
import { assertNoSymlinks, fileDigest } from './runner.js';
export interface ReservationJournalOptions { readonly allowNonEmptyTarget?: boolean }
export class ReservationJournal {
  readonly targetDir: string;
  private entries: JournalEntry[] = [];
  private hashes = new Map<string, string>();
  private lock: string;
  private lockDigest?: string;
  private committed = false;
  constructor(target: string, private options: ReservationJournalOptions = {}) {
    this.targetDir = path.resolve(target); this.lock = `${this.targetDir}.mds-generation.lock`;
  }
  get journalEntries(): readonly JournalEntry[] { return [...this.entries]; }
  validateTarget(): void {
    assertNoSymlinks(this.targetDir);
    if (this.targetDir === path.parse(this.targetDir).root) throw new Error('Cannot generate at filesystem root');
    if (existsSync(this.targetDir)) {
      if (!this.options.allowNonEmptyTarget && readdirSync(this.targetDir).length > 0) {
        throw new DestinationNotEmptyError(this.targetDir);
      }
    } else {
      if (!existsSync(path.dirname(this.targetDir))) throw new Error('Destination parent must already exist');
    }
  }
  reserve(): void {
    this.validateTarget(); assertNoSymlinks(this.lock);
    let fd: number;
    try { fd = openSync(this.lock, 'wx', 0o600); }
    catch (error) {
      if ((error as { code?: string }).code !== 'EEXIST') throw error;
      let holder = 'unknown holder';
      try { holder = readFileSync(this.lock, 'utf8').slice(0, 500); } catch { /* Lock vanished or unreadable. */ }
      throw new Error(`Another generation holds ${this.lock} (${holder}). If no generation is running (the process exited or crashed), review the retained output and delete that lock file to retry; it is never removed automatically.`);
    }
    try { writeFileSync(fd, JSON.stringify({ token: randomUUID(), pid: process.pid, startedAt: new Date().toISOString() })); } finally { closeSync(fd); }
    this.lockDigest = fileDigest(this.lock);
    try { this.validateTarget(); } catch (error) { this.release(); throw error; }
  }
  assertContained(file: string): string {
    const resolved = path.resolve(this.targetDir, file), relative = path.relative(this.targetDir, resolved);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Path traversal detected');
    assertNoSymlinks(resolved); return resolved;
  }
  mkdir(dir: string): string {
    const resolved = this.assertContained(dir);
    if (!existsSync(resolved)) { mkdirSync(resolved, { recursive: true }); this.entries.push({action:'mkdir',path:resolved,existedBefore:false,timestamp:new Date().toISOString()}); }
    return resolved;
  }
  writeFile(file: string, content: string | Buffer): string {
    const resolved = this.assertContained(file); this.mkdir(path.dirname(resolved));
    writeFileSync(resolved, content, { flag: 'wx' }); this.hashes.set(resolved, fileDigest(resolved));
    this.entries.push({action:'write',path:resolved,existedBefore:false,timestamp:new Date().toISOString()}); return resolved;
  }
  private release(): void {
    if (this.lockDigest && existsSync(this.lock) && !lstatSync(this.lock).isSymbolicLink() && fileDigest(this.lock) === this.lockDigest) unlinkSync(this.lock);
    this.lockDigest = undefined;
  }
  commit(): readonly JournalEntry[] {
    this.committed = true;
    this.release();
    return this.journalEntries;
  }
  /** External generated files are deliberately never recursively deleted. */
  rollback(): void {
    if (this.committed) return;
    for (const e of [...this.entries].reverse()) {
      try {
        assertNoSymlinks(e.path);
        if (e.action === 'write' && this.hashes.get(e.path) === fileDigest(e.path)) unlinkSync(e.path);
        else if (e.action === 'mkdir' && existsSync(e.path) && readdirSync(e.path).length === 0) rmdirSync(e.path);
      } catch { /* Retain changed or concurrently created files. */ }
    }
    this.release();
  }
}
