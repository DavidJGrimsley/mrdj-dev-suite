import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import {
  createInitialInfieMachine,
  requestInfieForm,
  stepInfieMachine,
  type InfieMachineState,
} from '../features/infie/infie-state-machine';
import { DEFAULT_INFIE_VFX, type InfieFormState, type InfieVfxControls } from '../types/infie';

export interface InfieStoreState {
  machine: InfieMachineState;
  vfx: InfieVfxControls;
  playing: boolean;

  setForm: (form: InfieFormState) => void;
  triggerControllerDemo: () => void;
  step: (dtSeconds: number) => void;
  setVfx: (patch: Partial<InfieVfxControls>) => void;
  setPlaying: (playing: boolean) => void;
}

export const infieStore = createStore<InfieStoreState>((set) => ({
  machine: createInitialInfieMachine(),
  vfx: { ...DEFAULT_INFIE_VFX },
  playing: true,

  setForm(form) {
    set((s) => ({ machine: requestInfieForm(s.machine, form) }));
  },

  triggerControllerDemo() {
    set((s) => ({ machine: requestInfieForm(s.machine, 'controller') }));
  },

  step(dtSeconds) {
    set((s) => {
      if (!s.playing) return s;
      return { machine: stepInfieMachine(s.machine, dtSeconds) };
    });
  },

  setVfx(patch) {
    set((s) => ({ vfx: { ...s.vfx, ...patch } }));
  },

  setPlaying(playing) {
    set({ playing });
  },
}));

export function useInfieStore<T>(selector: (s: InfieStoreState) => T): T {
  return useStore(infieStore, selector);
}
