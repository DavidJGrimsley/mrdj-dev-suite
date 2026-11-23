import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { infieStore } from '../../stores/infie-store';
import {
  DEVICE_TUTORIAL_STEPS,
  tutorialStore,
  useTutorialStore,
} from '../../stores/tutorial-store';

export function TutorialOverlay() {
  const deviceClass = useTutorialStore((s) => s.deviceClass);
  const activeTutorialId = useTutorialStore((s) => s.activeTutorialId);
  const activeStepIndex = useTutorialStore((s) => s.activeStepIndex);
  const isReplay = useTutorialStore((s) => s.isReplay);
  const offerDismissed = useTutorialStore((s) => s.offerDismissed);
  const completed = useTutorialStore((s) =>
    s.progress.some((p) => p.tutorialId === `${s.deviceClass}-companion` && p.completed)
  );

  const steps = DEVICE_TUTORIAL_STEPS[deviceClass];
  const step = steps[activeStepIndex];

  useEffect(() => {
    if (activeTutorialId && step) {
      infieStore.getState().setForm(step.recommendedInfieForm);
    }
  }, [activeTutorialId, step]);

  if (!activeTutorialId && !completed && !offerDismissed) {
    return (
      <View className="mx-3 mt-2 flex-row flex-wrap items-center justify-between gap-2 rounded-2xl border border-teal-500/40 bg-teal-950/50 px-3.5 py-2.5">
        <View className="flex-1 min-w-[200px]">
          <Text className="text-xs font-bold text-teal-200">
            First-Use Companion Tour ({deviceClass.toUpperCase()})
          </Text>
          <Text className="text-[11px] text-slate-300">
            Guided walkthrough of layouts, widgets, and connection boundaries for this device.
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => tutorialStore.getState().startTutorial(false)}
            className="rounded-lg bg-teal-500 px-3 py-1.5">
            <Text className="text-xs font-semibold text-slate-950">Start Tour</Text>
          </Pressable>
          <Pressable
            onPress={() => void tutorialStore.getState().dismissOffer()}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5">
            <Text className="text-xs text-slate-300">Later</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!activeTutorialId || !step) return null;

  return (
    <View className="mx-3 mt-2 gap-2 rounded-2xl border border-teal-400/60 bg-slate-900 p-3.5">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
          {deviceClass.toUpperCase()} Tutorial · Step {activeStepIndex + 1}/{steps.length}
          {isReplay ? ' (Replay · Snapshot Safe)' : ''}
        </Text>
        <Text className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
          Target: {step.targetHint}
        </Text>
      </View>

      <Text className="text-sm font-bold text-slate-50">{step.title}</Text>
      <Text className="text-xs leading-5 text-slate-300">{step.body}</Text>

      <View className="flex-row items-center justify-between pt-1">
        <Pressable
          onPress={() => void tutorialStore.getState().dismissTutorial()}
          className="rounded-lg px-2.5 py-1.5">
          <Text className="text-xs text-slate-400">Exit</Text>
        </Pressable>

        <View className="flex-row gap-2">
          {activeStepIndex > 0 ? (
            <Pressable
              onPress={() => tutorialStore.getState().prevStep()}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5">
              <Text className="text-xs font-semibold text-slate-200">Back</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => void tutorialStore.getState().nextStep()}
            className="rounded-lg bg-teal-500 px-3.5 py-1.5">
            <Text className="text-xs font-bold text-slate-950">
              {activeStepIndex + 1 < steps.length ? 'Next' : 'Finish'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
