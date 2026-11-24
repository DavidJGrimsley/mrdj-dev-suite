import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  DEMO_AUTH_EMAIL,
  DEMO_AUTH_PASSWORD,
  NO_ACCOUNT_CREATE_NOTICE,
} from '../../data/seeded-workspace';
import { companionStore } from '../../stores/companion-store';

export interface AuthScreenProps {
  onSignedIn?: () => void;
  compactVr?: boolean;
}

export function AuthScreen({ onSignedIn, compactVr = false }: AuthScreenProps) {
  const [email, setEmail] = useState(DEMO_AUTH_EMAIL);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    const result = await companionStore.getState().signIn(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSignedIn?.();
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: compactVr ? 16 : 24,
      }}>
      <View className="w-full max-w-md gap-4 rounded-3xl border border-teal-500/30 bg-slate-900 p-6">
        <View className="gap-1">
          <View className="self-start rounded-full border border-teal-500/40 bg-teal-950/60 px-3 py-1">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-teal-300">
              i² Companion Sign-In
            </Text>
          </View>
          <Text className="mt-2 text-2xl font-bold text-slate-50">Welcome back</Text>
          <Text className="text-xs leading-5 text-slate-400">{NO_ACCOUNT_CREATE_NOTICE}</Text>
        </View>

        <View className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-3">
          <Text className="text-[11px] font-semibold text-amber-200">
            Simulated Companion Authentication
          </Text>
          <Text className="mt-0.5 text-[11px] text-amber-100/80">
            Demo credentials: {DEMO_AUTH_EMAIL} / {DEMO_AUTH_PASSWORD}. Client-side/demo login is
            local state only and does not provide hosted access control.
          </Text>
        </View>

        <View className="gap-3">
          <View className="gap-1">
            <Text className="text-xs font-semibold text-slate-300">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={DEMO_AUTH_EMAIL}
              placeholderTextColor="#64748b"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100"
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs font-semibold text-slate-300">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter prototype password"
              placeholderTextColor="#64748b"
              onSubmitEditing={() => void handleSubmit()}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100"
            />
          </View>

          {error ? (
            <View className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-3 py-2">
              <Text className="text-xs font-medium text-rose-200">{error}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={busy}
            onPress={() => void handleSubmit()}
            className="items-center rounded-xl bg-teal-500 py-3">
            <Text className="text-sm font-bold text-slate-950">
              {busy ? 'Signing in...' : 'Sign In'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPassword(DEMO_AUTH_PASSWORD)}
            className="items-center rounded-xl border border-slate-700 bg-slate-800/80 py-2.5">
            <Text className="text-xs font-semibold text-teal-200">
              Fill Demo Password ({DEMO_AUTH_PASSWORD})
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
