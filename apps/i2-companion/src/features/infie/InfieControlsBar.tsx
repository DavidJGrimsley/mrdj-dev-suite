import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useInfieStore } from '../../stores/infie-store';
import type { InfieFormState } from '../../types/infie';

const FORMS: { id: InfieFormState; label: string }[] = [
  { id: 'mist', label: 'Mist' },
  { id: 'glyph', label: 'Glyph' },
  { id: 'surge', label: 'Surge' },
  { id: 'compile', label: 'Compile' },
  { id: 'controller', label: 'Controller' },
];

export function InfieControlsBar() {
  const machine = useInfieStore((s) => s.machine);
  const playing = useInfieStore((s) => s.playing);
  const vfx = useInfieStore((s) => s.vfx);
  const setForm = useInfieStore((s) => s.setForm);
  const setPlaying = useInfieStore((s) => s.setPlaying);
  const setVfx = useInfieStore((s) => s.setVfx);

  return (
    <View className="gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-2.5">
      <View className="flex-row flex-wrap items-center gap-1.5">
        {FORMS.map((form) => {
          const active = machine.targetForm === form.id;
          return (
            <Pressable
              key={form.id}
              onPress={() => setForm(form.id)}
              className={`rounded-lg px-2.5 py-1.5 ${
                active ? 'bg-teal-500' : 'border border-slate-700 bg-slate-800'
              }`}>
              <Text
                className={`text-xs font-semibold ${active ? 'text-slate-950' : 'text-slate-200'}`}>
                {form.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-[11px] text-slate-400">
          Asset: <Text className="text-teal-300">{machine.activeAssetForm}</Text> · Phase:{' '}
          <Text className="text-slate-200">{machine.phase}</Text>
        </Text>
        <View className="flex-row gap-1.5">
          <Pressable
            onPress={() => setPlaying(!playing)}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1">
            <Text className="text-[11px] font-medium text-slate-200">
              {playing ? 'Pause' : 'Play'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setVfx({ effectsEnabled: !vfx.effectsEnabled })}
            className={`rounded-md px-2 py-1 ${
              vfx.effectsEnabled
                ? 'bg-teal-900/70 border border-teal-500/40'
                : 'bg-slate-800 border border-slate-700'
            }`}>
            <Text className="text-[11px] font-medium text-teal-200">
              VFX {vfx.effectsEnabled ? 'On' : 'Off'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setVfx({ gentleMotionEnabled: !vfx.gentleMotionEnabled })}
            className={`rounded-md px-2 py-1 ${
              vfx.gentleMotionEnabled
                ? 'bg-teal-900/70 border border-teal-500/40'
                : 'bg-slate-800 border border-slate-700'
            }`}>
            <Text className="text-[11px] font-medium text-teal-200">
              Drift {vfx.gentleMotionEnabled ? 'On' : 'Off'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
