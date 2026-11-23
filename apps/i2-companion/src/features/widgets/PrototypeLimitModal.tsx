import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { companionStore, useCompanionStore } from '../../stores/companion-store';

export function PrototypeLimitModal() {
  const limit = useCompanionStore((s) => s.prototypeLimit);

  if (!limit) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={() => companionStore.getState().dismissPrototypeLimit()}>
      <View className="flex-1 items-center justify-center bg-slate-950/80 p-5">
        <View className="w-full max-w-md gap-3 rounded-2xl border border-amber-500/40 bg-slate-900 p-5">
          <View className="flex-row items-center justify-between gap-2">
            <View className="rounded-full bg-amber-500/15 px-2.5 py-1">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                Prototype Limit
              </Text>
            </View>
            <Pressable
              onPress={() => companionStore.getState().dismissPrototypeLimit()}
              className="rounded-lg px-2 py-1">
              <Text className="text-sm font-semibold text-slate-400">Close</Text>
            </Pressable>
          </View>

          <Text className="text-lg font-bold text-slate-50">{limit.featureName}</Text>
          {limit.subtitle ? (
            <Text className="text-xs font-medium text-teal-300">{limit.subtitle}</Text>
          ) : null}
          <Text className="text-sm leading-5 text-slate-300">{limit.description}</Text>

          {limit.environmentNote ? (
            <View className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
              <Text className="text-[11px] text-slate-400">{limit.environmentNote}</Text>
            </View>
          ) : null}

          <View className="mt-1 flex-row flex-wrap justify-end gap-2">
            {limit.suggestPet ? (
              <Pressable
                onPress={() => {
                  const st = companionStore.getState();
                  st.selectProject('pet');
                  st.selectSession('add-comments');
                  st.setRoute('session');
                  st.dismissPrototypeLimit();
                }}
                className="rounded-xl bg-teal-500 px-3.5 py-2">
                <Text className="text-xs font-semibold text-slate-950">
                  Open Pet Show &amp; Tell
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => companionStore.getState().dismissPrototypeLimit()}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2">
              <Text className="text-xs font-semibold text-slate-100">Back to workspace</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
