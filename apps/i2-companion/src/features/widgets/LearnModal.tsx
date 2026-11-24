import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { useCompanionStore } from '../../stores/companion-store';
import {
  DEVICE_TUTORIAL_STEPS,
  tutorialStore,
  useTutorialStore,
} from '../../stores/tutorial-store';
import type { DeviceClass } from '../../types/companion';

export interface LearnModalProps {
  visible: boolean;
  onClose: () => void;
}

const DEVICES: DeviceClass[] = ['quest', 'android', 'ios', 'web'];

export function LearnModal({ visible, onClose }: LearnModalProps) {
  const session = useCompanionStore((s) => s.session);
  const deviceClass = useTutorialStore((s) => s.deviceClass);
  const progress = useTutorialStore((s) => s.progress);
  const tutorialId = `${deviceClass}-companion`;
  const rec = progress.find((p) => p.tutorialId === tutorialId);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-slate-950/85 p-4">
        <View className="max-h-[88%] w-full max-w-xl gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-bold text-slate-50">
                Learn &amp; Companion Tutorials
              </Text>
              <Text className="text-xs text-slate-400">
                Account: {session?.displayName ?? 'Demo User'} · Level {session?.level ?? 1} ·
                Device: {deviceClass.toUpperCase()}
              </Text>
            </View>
            <Pressable onPress={onClose} className="rounded-lg bg-slate-800 px-3 py-1.5">
              <Text className="text-xs font-semibold text-slate-200">Close</Text>
            </Pressable>
          </View>

          <ScrollView className="gap-3">
            <View className="mb-3 rounded-xl border border-teal-500/30 bg-slate-950/70 p-3">
              <Text className="text-sm font-semibold text-teal-200">
                Companion Onboarding ({deviceClass.toUpperCase()})
              </Text>
              <Text className="mt-1 text-xs text-slate-300">
                Status:{' '}
                {rec?.completed
                  ? `Completed (Level ${session?.level ?? 1} reward granted once; replays preserve workspace state)`
                  : 'Ready to run'}
              </Text>
              <Text className="mt-1 text-xs text-slate-400">
                Covers {DEVICE_TUTORIAL_STEPS[deviceClass].length} companion UI steps (not prototype
                IDE onboarding).
              </Text>
              <View className="mt-2.5 flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => {
                    tutorialStore.getState().startTutorial(Boolean(rec?.completed));
                    onClose();
                  }}
                  className="rounded-lg bg-teal-500 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-slate-950">
                    {rec?.completed ? 'Replay Tutorial' : 'Start Tutorial'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Preview Device Tutorial Profiles
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {DEVICES.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => void tutorialStore.getState().hydrate(d)}
                  className={`rounded-lg border px-3 py-1.5 ${
                    d === deviceClass
                      ? 'border-teal-400 bg-teal-500/20'
                      : 'border-slate-700 bg-slate-800'
                  }`}>
                  <Text className="text-xs font-semibold uppercase text-slate-200">{d}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
