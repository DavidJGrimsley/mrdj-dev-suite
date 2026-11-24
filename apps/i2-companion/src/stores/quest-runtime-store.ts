import { createStore } from 'zustand/vanilla';

import type { QuestCompositorCapabilities } from '../../modules/quest-panel/src';

export type QuestRuntimeStatus = 'idle' | 'launching' | 'immersive' | 'returned' | 'error';

export type QuestVRActivityState =
  'unknown' | 'resumed' | 'paused' | 'stopped' | 'finishing' | 'destroyed';

export interface QuestRuntimeSnapshot {
  status: QuestRuntimeStatus;
  vrActivityState: QuestVRActivityState;
  appActive: boolean;
  entries: number;
  reentryCount: number;
  sceneMounts: number;
  exitRequest: string | null;
  lastError: string | null;
  compositorStatus: 'idle' | 'ready' | 'slow' | 'failed' | 'unavailable';
  capabilities: QuestCompositorCapabilities | null;
}

const initial: QuestRuntimeSnapshot = {
  status: 'idle',
  vrActivityState: 'unknown',
  appActive: true,
  entries: 0,
  reentryCount: 0,
  sceneMounts: 0,
  exitRequest: null,
  lastError: null,
  compositorStatus: 'idle',
  capabilities: null,
};

export const QUEST_LAUNCH_TIMEOUT_MS = 10_000;

export function createQuestRuntime(launchTimeoutMs = QUEST_LAUNCH_TIMEOUT_MS) {
  const store = createStore<QuestRuntimeSnapshot>(() => initial);
  let launchTimer: ReturnType<typeof setTimeout> | null = null;
  const set = (patch: Partial<QuestRuntimeSnapshot>) =>
    store.setState({ ...store.getState(), ...patch });
  const clearTimer = () => {
    if (launchTimer !== null) clearTimeout(launchTimer);
    launchTimer = null;
  };

  return {
    subscribe: (listener: () => void) => store.subscribe(listener),
    getSnapshot: () => store.getState(),
    requestEnter() {
      const state = store.getState();
      if (state.status === 'launching') return false;
      if (
        state.status === 'immersive' &&
        state.vrActivityState !== 'finishing' &&
        state.vrActivityState !== 'destroyed'
      ) {
        return false;
      }
      clearTimer();
      launchTimer = setTimeout(() => {
        launchTimer = null;
        if (store.getState().status === 'launching') {
          set({
            status: 'error',
            lastError: `The VR scene did not start within ${launchTimeoutMs / 1000}s.`,
          });
        }
      }, launchTimeoutMs);
      set({
        status: 'launching',
        vrActivityState: 'unknown',
        reentryCount: state.reentryCount + (state.status === 'idle' ? 0 : 1),
        lastError: null,
      });
      return true;
    },
    sceneMounted() {
      const state = store.getState();
      const sceneMounts = state.sceneMounts + 1;
      if (state.status === 'immersive') return set({ sceneMounts });
      clearTimer();
      const launched = state.status === 'launching' || state.status === 'error';
      set({
        status: 'immersive',
        vrActivityState:
          state.vrActivityState === 'finishing' || state.vrActivityState === 'destroyed'
            ? 'unknown'
            : state.vrActivityState,
        sceneMounts,
        entries: state.entries + (launched ? 1 : 0),
        exitRequest: null,
        lastError: null,
      });
    },
    sceneUnmounted() {
      const state = store.getState();
      const sceneMounts = Math.max(0, state.sceneMounts - 1);
      set(
        sceneMounts === 0 && state.status === 'immersive'
          ? { sceneMounts, status: 'returned' }
          : { sceneMounts }
      );
    },
    vrActivityStateChanged(nextState: QuestVRActivityState, finishing = false) {
      const state = store.getState();
      const effectiveState: QuestVRActivityState =
        finishing && nextState !== 'destroyed' ? 'finishing' : nextState;
      if (effectiveState === 'destroyed') {
        set({
          vrActivityState: 'destroyed',
          sceneMounts: 0,
          ...(state.status === 'immersive' ? { status: 'returned' as const } : {}),
        });
        return;
      }
      if (effectiveState === 'finishing') {
        set(
          state.status === 'immersive'
            ? { vrActivityState: 'finishing', status: 'returned' }
            : { vrActivityState: 'finishing' }
        );
        return;
      }
      set({ vrActivityState: effectiveState });
    },
    appStateChanged(appActive: boolean) {
      if (store.getState().appActive !== appActive) set({ appActive });
    },
    setCompositorStatus(compositorStatus: QuestRuntimeSnapshot['compositorStatus']) {
      set({ compositorStatus });
    },
    setCapabilities(capabilities: QuestCompositorCapabilities | null) {
      set({ capabilities });
    },
    exitRequested(source: string) {
      if (store.getState().exitRequest === null) set({ exitRequest: source });
    },
    fail(error: unknown) {
      clearTimer();
      set({
        status: 'error',
        lastError: error instanceof Error ? error.message : String(error),
      });
    },
  };
}

export const questRuntime = createQuestRuntime();
export const questOnExitViro = () => questRuntime.exitRequested('onExitViro');
