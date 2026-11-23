import * as SQLite from 'expo-sqlite';
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

async function openNativeDb(): Promise<SqliteExecutor | null> {
  if (sqliteUnavailable) return null;
  try {
    if (!dbPromise) {
      dbPromise = SQLite.openDatabaseAsync(DB_NAME) as unknown as Promise<SqliteExecutor>;
    }
    return await dbPromise;
  } catch {
    sqliteUnavailable = true;
    return null;
  }
}

export const companionRepos = new SqliteCompanionRepositories(
  openNativeDb,
  new MemoryCompanionRepositories(),
  { backend: 'sqlite-native', crossOriginIsolated: null }
);
