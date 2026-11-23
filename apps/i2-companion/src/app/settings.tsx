import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { companionRepos } from '../adapters/sqlite/companion-db';
import { companionStore, useCompanionStore } from '../stores/companion-store';
import { connectionStore, useConnectionStore } from '../stores/connection-store';
import { layoutStore, useLayoutStore } from '../stores/layout-store';
import { tutorialStore, useTutorialStore } from '../stores/tutorial-store';
import type { DeviceClass } from '../types/companion';

const DEVICES: DeviceClass[] = ['quest', 'android', 'ios', 'web'];

export default function SettingsScreen() {
  const router = useRouter();
  const session = useCompanionStore((s) => s.session);
  const storageBackendLabel = useCompanionStore((s) => s.storageBackendLabel);
  const crossOriginIsolated = useCompanionStore((s) => s.crossOriginIsolated);
  const presets = useLayoutStore((s) => s.presets);
  const status = useConnectionStore((s) => s.status);
  const deviceClass = useTutorialStore((s) => s.deviceClass);
  const progress = useTutorialStore((s) => s.progress);
  const [schemaVersion, setSchemaVersion] = useState<number | null>(null);

  return (
    <ScrollView className="flex-1 bg-slate-950 p-5" contentContainerStyle={{ gap: 16 }}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-slate-50">i² Companion Settings</Text>
          <Text className="text-xs text-slate-400">
            Signed in as {session?.email ?? 'Not signed in'} · Level {session?.level ?? 1}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2">
          <Text className="text-xs font-semibold text-slate-100">Back</Text>
        </Pressable>
      </View>

      <View className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <Text className="text-sm font-bold text-teal-300">Environment Provider Boundary</Text>
        <Text className="text-xs text-slate-300">
          Provider: {status.providerKind} ({status.environmentName}) · Cross-device sync:{' '}
          {String(status.capabilities.crossDeviceSync)}
        </Text>
        <Text className="text-[11px] text-amber-200">{status.honestStatusNote}</Text>
        <View className="mt-1 flex-row flex-wrap gap-2">
          {(['simulated-local', 'local-host', 'cloud-host'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => connectionStore.getState().setProviderKind(m)}
              className={`rounded-lg px-3 py-1.5 ${
                status.providerKind === m ? 'bg-teal-500' : 'border border-slate-700 bg-slate-800'
              }`}>
              <Text
                className={`text-xs font-semibold ${status.providerKind === m ? 'text-slate-950' : 'text-slate-200'}`}>
                {m}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <Text className="text-sm font-bold text-teal-300">
          Per-Device Tutorials ({deviceClass.toUpperCase()})
        </Text>
        <Text className="text-xs text-slate-400">
          Completed tutorials on {deviceClass}: {progress.filter((p) => p.completed).length} · Saved
          layouts: {presets.length}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {DEVICES.map((d) => (
            <Pressable
              key={d}
              onPress={() => void tutorialStore.getState().hydrate(d)}
              className={`rounded-lg border px-2.5 py-1 ${
                d === deviceClass
                  ? 'border-teal-400 bg-teal-500/20'
                  : 'border-slate-700 bg-slate-800'
              }`}>
              <Text className="text-xs uppercase text-slate-200">{d}</Text>
            </Pressable>
          ))}
        </View>
        <View className="mt-1 flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => {
              tutorialStore.getState().startTutorial(true);
              router.replace('/');
            }}
            className="rounded-xl bg-teal-500 px-3.5 py-2">
            <Text className="text-xs font-semibold text-slate-950">Replay Tutorial</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              void companionRepos
                .resetForDevice(deviceClass)
                .then(() => tutorialStore.getState().hydrate(deviceClass))
            }
            className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2">
            <Text className="text-xs font-semibold text-slate-200">Reset Device Tutorial</Text>
          </Pressable>
        </View>
      </View>

      <View className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <Text className="text-sm font-bold text-teal-300">Local SQLite Diagnostics</Text>
        <Text className="text-xs text-slate-300">
          Backend: {storageBackendLabel} · Web COOP/COEP:{' '}
          {Platform.OS === 'web' ? String(crossOriginIsolated) : 'N/A (native)'}
        </Text>
        {schemaVersion !== null ? (
          <Text className="text-xs text-teal-200">PRAGMA user_version = {schemaVersion}</Text>
        ) : null}
        <View className="flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => void companionRepos.getSchemaVersion().then(setSchemaVersion)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5">
            <Text className="text-xs text-slate-200">Check Schema Version</Text>
          </Pressable>
          <Pressable
            onPress={() => void layoutStore.getState().resetActivePresetToDefault()}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5">
            <Text className="text-xs text-slate-200">Reset Active Layout</Text>
          </Pressable>
        </View>
      </View>

      {session ? (
        <Pressable
          onPress={() =>
            void companionStore
              .getState()
              .signOut()
              .then(() => router.replace('/'))
          }
          className="items-center rounded-xl border border-rose-500/40 bg-rose-950/40 py-3">
          <Text className="text-sm font-semibold text-rose-200">Sign Out of Simulated Demo</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
