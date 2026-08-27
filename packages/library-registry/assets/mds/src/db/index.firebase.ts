import { getFirebaseDb } from '../services/firebase';
import { createFirebaseDatabaseAdapter } from './firebase';

import type { DatabaseAdapter } from './adapter';
import type { AppDatabase } from '../types/database';

let adapter: DatabaseAdapter<AppDatabase> | null = null;

export function getAdapter(type: 'firebase' = 'firebase'): DatabaseAdapter<AppDatabase> {
  if (type !== 'firebase') {
    throw new Error(`Unsupported database adapter: ${type}`);
  }

  adapter ??= createFirebaseDatabaseAdapter<AppDatabase>(() => getFirebaseDb());
  return adapter;
}

export const database = getAdapter;

