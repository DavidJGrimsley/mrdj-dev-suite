import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { connectionStore, useConnectionStore } from '../../stores/connection-store';
import type { EnvironmentProviderKind } from '../../types/providers';

export interface ConnectionModeModalProps {
  visible: boolean;
  onClose: () => void;
}

const PROVIDERS: { id: EnvironmentProviderKind; title: string; subtitle: string }[] = [
  {
    id: 'simulated-local',
    title: 'Simulated Shared Environment (Active · Local Only)',
    subtitle:
      'In-app simulated shared state across all Companion widgets & views. Zero networking; does not sync across separate devices today.',
  },
  {
    id: 'local-host',
    title: 'Computer-Hosted Environment (Future · Not Connected)',
    subtitle:
      'Typed provider boundary for a future local computer i² host so Quest and desktop actions share live state.',
  },
  {
    id: 'cloud-host',
    title: 'Cloud Environment (Future · Not Connected)',
    subtitle:
      'Typed provider boundary for a future cloud-hosted i² workspace syncing across Quest, mobile, web, and desktop.',
  },
];

export function ConnectionModeModal({ visible, onClose }: ConnectionModeModalProps) {
  const mode = useConnectionStore((s) => s.mode);
  const status = useConnectionStore((s) => s.status);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-slate-950/85 p-4">
        <View className="w-full max-w-lg gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-lg font-bold text-slate-50">Environment Provider</Text>
              <Text className="text-xs text-slate-400">
                Active: {status.environmentName} · Sync: {status.syncStatus}
              </Text>
            </View>
            <Pressable onPress={onClose} className="rounded-lg bg-slate-800 px-3 py-1.5">
              <Text className="text-xs font-semibold text-slate-200">Close</Text>
            </Pressable>
          </View>

          <View className="rounded-xl border border-amber-500/35 bg-amber-950/25 p-2.5">
            <Text className="text-[11px] font-semibold text-amber-200">
              {status.honestStatusNote}
            </Text>
          </View>

          {PROVIDERS.map((m) => {
            const active = mode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => {
                  connectionStore.getState().setProviderKind(m.id);
                  if (m.id !== 'simulated-local') onClose();
                }}
                className={`rounded-xl border p-3 ${
                  active ? 'border-teal-400 bg-teal-950/40' : 'border-slate-800 bg-slate-950/70'
                }`}>
                <Text className="text-sm font-semibold text-slate-100">{m.title}</Text>
                <Text className="mt-1 text-xs text-slate-400">{m.subtitle}</Text>
              </Pressable>
            );
          })}

          <View className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <Text className="mb-1 text-xs font-semibold text-teal-300">Capability Matrix</Text>
            <Text className="text-[11px] text-slate-300">
              state={status.capabilities.sharedStateMode} · crossDeviceSync=
              {String(status.capabilities.crossDeviceSync)} · chat={status.capabilities.chat} · fs=
              {status.capabilities.filesystem} · emu={status.capabilities.emulatorsNative}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
