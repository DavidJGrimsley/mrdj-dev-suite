import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  createEmptyOnboardingState,
  type OnboardingState,
} from './onboarding-state-types';

type OnboardingStore = {
  state: OnboardingState;
  setOnboardingState: (state: OnboardingState) => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      state: createEmptyOnboardingState(),
      setOnboardingState: (state) => set({ state }),
    }),
    {
      name: 'mds.onboarding.state.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (value) => ({ state: value.state }),
    },
  ),
);

export function getPersistedOnboardingState(): OnboardingState {
  return useOnboardingStore.getState().state;
}

export function setPersistedOnboardingState(state: OnboardingState): void {
  useOnboardingStore.getState().setOnboardingState(state);
}

export function subscribeToPersistedOnboardingState(listener: () => void): () => void {
  return useOnboardingStore.subscribe(listener);
}
