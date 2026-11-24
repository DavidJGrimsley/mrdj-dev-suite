import { Platform } from 'react-native';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { companionRepos } from '../adapters/sqlite/companion-db';
import type { TutorialProgressRecord } from '../ports/storage';
import type { DeviceClass } from '../types/companion';
import { companionStore } from './companion-store';

export type CompanionTutorialId = 'quest-cockpit' | 'mobile-companion' | 'web-companion';

export interface TutorialStepDef {
  id: string;
  title: string;
  body: string;
  targetHint: string;
  recommendedInfieForm: 'mist' | 'glyph' | 'surge' | 'compile' | 'controller';
}

export const DEVICE_TUTORIAL_STEPS: Record<DeviceClass, readonly TutorialStepDef[]> = {
  quest: [
    {
      id: 'q1',
      title: 'Welcome to the Quest Spatial Cockpit',
      body: 'Aim either Touch controller trigger ray at panels to interact. Head gaze is ignored so looking around never misfires controls.',
      targetHint: 'Cockpit Center',
      recommendedInfieForm: 'mist',
    },
    {
      id: 'q2',
      title: 'Customize Your Batcave Layout',
      body: 'Open + Windows or Layouts in the VR shelf to arrange any of the 28 i² widgets (including i² Environments & App Previews) as sharp OpenXR windows and save named custom layouts.',
      targetHint: 'VR Shelf · + Windows & Layouts',
      recommendedInfieForm: 'compile',
    },
    {
      id: 'q3',
      title: 'Free 3D Move, Resize & Recenter',
      body: 'Drag any widget MOVE bar with your controller trigger, adjust W/H/Depth or Expand on the frame header, and hit Recenter anytime.',
      targetHint: 'Widget Drag Bar & Header',
      recommendedInfieForm: 'controller',
    },
  ],
  android: [
    {
      id: 'a1',
      title: 'Android Companion Overview',
      body: 'Switch between Home, Project, Session, and Emulators tabs to review agent questions, tasks, diffs, and web previews on the go.',
      targetHint: 'Bottom Tab Bar',
      recommendedInfieForm: 'mist',
    },
    {
      id: 'a2',
      title: 'Widgets & Prototype Limits',
      body: 'Open any widget card from the Widgets drawer. Actions requiring a live desktop i2 Core host show a clear Prototype Limit notice.',
      targetHint: 'Widgets Drawer',
      recommendedInfieForm: 'glyph',
    },
  ],
  ios: [
    {
      id: 'i1',
      title: 'iOS Companion Overview',
      body: 'Check project attention, answer agent questions like Pet Show and Tell B14, and preview 3D Infie states directly from iOS.',
      targetHint: 'Companion Header',
      recommendedInfieForm: 'mist',
    },
    {
      id: 'i2',
      title: 'Safe Replaceable Boundaries',
      body: 'All companion state persists locally in SQLite while live computer connections remain cleanly isolated until authorized.',
      targetHint: 'Connection Status Pill',
      recommendedInfieForm: 'surge',
    },
  ],
  web: [
    {
      id: 'w1',
      title: 'Web Companion Workspace',
      body: 'Arrange dock widgets, inspect bundled workspace files and diffs, and interact with the 3D Three.js Infie stage.',
      targetHint: 'Dock & Infie Stage',
      recommendedInfieForm: 'mist',
    },
    {
      id: 'w2',
      title: 'Tutorials & Replay',
      body: 'Replay this walkthrough anytime from Settings or Learn. Replays restore your workspace snapshot without duplicating rewards.',
      targetHint: 'Learn / Replay',
      recommendedInfieForm: 'compile',
    },
  ],
};

export function detectDeviceClass(): DeviceClass {
  if (Platform.OS === 'web') return 'web';
  if (Platform.OS === 'ios') return 'ios';
  const model = String(
    (Platform.constants as { Model?: string } | undefined)?.Model ?? ''
  ).toLowerCase();
  if (model.includes('quest')) return 'quest';
  return 'android';
}

export interface TutorialStoreState {
  deviceClass: DeviceClass;
  progress: TutorialProgressRecord[];
  activeTutorialId: string | null;
  activeStepIndex: number;
  isReplay: boolean;
  offerDismissed: boolean;
  /** Snapshot preserved during replay so workspace route/state restores cleanly */
  replaySnapshot: { startedAt: number } | null;

  hydrate: (deviceOverride?: DeviceClass) => Promise<void>;
  startTutorial: (replay?: boolean) => void;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  dismissTutorial: () => Promise<void>;
  dismissOffer: () => Promise<void>;
  isCompleted: () => boolean;
}

export const tutorialStore = createStore<TutorialStoreState>((set, get) => ({
  deviceClass: detectDeviceClass(),
  progress: [],
  activeTutorialId: null,
  activeStepIndex: 0,
  isReplay: false,
  offerDismissed: false,
  replaySnapshot: null,

  async hydrate(deviceOverride) {
    const deviceClass = deviceOverride ?? get().deviceClass;
    await companionRepos.ensureReady();
    const progress = await companionRepos.listForDevice(deviceClass);
    const tutorialId = `${deviceClass}-companion`;
    const record = progress.find((r) => r.tutorialId === tutorialId);
    set({
      deviceClass,
      progress,
      offerDismissed: record?.offerDismissed ?? false,
    });
  },

  startTutorial(replay = false) {
    const tutorialId = `${get().deviceClass}-companion`;
    set({
      activeTutorialId: tutorialId,
      activeStepIndex: 0,
      isReplay: replay,
      replaySnapshot: replay ? { startedAt: Date.now() } : null,
    });
  },

  async nextStep() {
    const state = get();
    const steps = DEVICE_TUTORIAL_STEPS[state.deviceClass];
    if (state.activeStepIndex + 1 < steps.length) {
      set({ activeStepIndex: state.activeStepIndex + 1 });
      return;
    }
    const tutorialId = state.activeTutorialId ?? `${state.deviceClass}-companion`;
    await companionRepos.markCompleted(state.deviceClass, tutorialId);
    await companionStore.getState().refreshSession();
    const progress = await companionRepos.listForDevice(state.deviceClass);
    set({
      progress,
      activeTutorialId: null,
      activeStepIndex: 0,
      isReplay: false,
      offerDismissed: true,
      replaySnapshot: null,
    });
  },

  prevStep() {
    set((s) => ({ activeStepIndex: Math.max(0, s.activeStepIndex - 1) }));
  },

  async dismissTutorial() {
    const state = get();
    const tutorialId = state.activeTutorialId ?? `${state.deviceClass}-companion`;
    await companionRepos.dismissOffer(state.deviceClass, tutorialId);
    const progress = await companionRepos.listForDevice(state.deviceClass);
    set({
      progress,
      activeTutorialId: null,
      activeStepIndex: 0,
      isReplay: false,
      offerDismissed: true,
      replaySnapshot: null,
    });
  },

  async dismissOffer() {
    const state = get();
    const tutorialId = `${state.deviceClass}-companion`;
    await companionRepos.dismissOffer(state.deviceClass, tutorialId);
    const progress = await companionRepos.listForDevice(state.deviceClass);
    set({ progress, offerDismissed: true });
  },

  isCompleted() {
    const tutorialId = `${get().deviceClass}-companion`;
    return get().progress.some((r) => r.tutorialId === tutorialId && r.completed);
  },
}));

export function useTutorialStore<T>(selector: (s: TutorialStoreState) => T): T {
  return useStore(tutorialStore, selector);
}
