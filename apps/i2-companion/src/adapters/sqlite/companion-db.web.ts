import {
  MemoryCompanionRepositories,
  SqliteCompanionRepositories,
  type StorageEnvironmentDiagnostic,
} from './repositories.ts';
import type { SqliteExecutor } from './schema.ts';

export { MemoryCompanionRepositories, SqliteCompanionRepositories };
export type { StorageEnvironmentDiagnostic };

const DB_NAME = 'i2-companion.db';
let dbPromise: Promise<SqliteExecutor> | null = null;
let sqliteUnavailable = false;

export function isWebCrossOriginIsolated(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === true
  );
}

async function openWebSqliteDb(): Promise<SqliteExecutor | null> {
  if (sqliteUnavailable) return null;
  if (!isWebCrossOriginIsolated()) {
    sqliteUnavailable = true;
    return null;
  }
  try {
    const SQLite = await import('expo-sqlite');
    if (!dbPromise) {
      dbPromise = SQLite.openDatabaseAsync(DB_NAME) as unknown as Promise<SqliteExecutor>;
    }
    return await dbPromise;
  } catch {
    sqliteUnavailable = true;
    return null;
  }
}

const isolated = isWebCrossOriginIsolated();

export const companionRepos = new SqliteCompanionRepositories(
  openWebSqliteDb,
  new MemoryCompanionRepositories(),
  isolated
    ? { backend: 'sqlite-wasm', crossOriginIsolated: true }
    : {
        backend: 'memory-fallback',
        crossOriginIsolated: false,
        reason:
          'SharedArrayBuffer / crossOriginIsolated is disabled; serve with COOP same-origin and COEP require-corp for Web SQLite WASM.',
      }
);
