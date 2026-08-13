import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const isServerRender = typeof window === 'undefined';
const supabaseStorage = {
  getItem: (key: string) => (isServerRender ? Promise.resolve(null) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) =>
    isServerRender ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string) => (isServerRender ? Promise.resolve() : AsyncStorage.removeItem(key)),
};
export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          storage: supabaseStorage,
          autoRefreshToken: !isServerRender,
          persistSession: !isServerRender,
          detectSessionInUrl: false,
        },
      })
    : null;

if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export function getSupabaseClient(): NonNullable<typeof supabase> {
  if (!supabase) {
    throw new Error(
      'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY before using Supabase. EXPO_PUBLIC_SUPABASE_KEY and EXPO_PUBLIC_SUPABASE_ANON_KEY are accepted as fallbacks for older projects.'
    );
  }
  return supabase;
}

export function assertSupabaseConfigured(): void {
  void getSupabaseClient();
}
