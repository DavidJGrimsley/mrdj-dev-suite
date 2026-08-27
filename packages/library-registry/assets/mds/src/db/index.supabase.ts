import { getSupabaseClient } from '../services/supabase';
import { createSupabaseDatabaseAdapter } from './supabase';

import type { DatabaseAdapter } from './adapter';
import type { AppDatabase } from '../types/database';

let adapter: DatabaseAdapter<AppDatabase> | null = null;

export function getAdapter(type: 'supabase' = 'supabase'): DatabaseAdapter<AppDatabase> {
  if (type !== 'supabase') {
    throw new Error(`Unsupported database adapter: ${type}`);
  }

  adapter ??= createSupabaseDatabaseAdapter<AppDatabase>(() => getSupabaseClient());
  return adapter;
}

export const database = getAdapter;

