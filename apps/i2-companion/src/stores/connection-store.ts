import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { createFutureEnvironmentBoundary } from '../providers/future-environment-boundaries.ts';
import { createSimulatedEnvironmentProvider } from '../providers/simulated-environment-provider.ts';
import {
  CapabilityUnavailableError,
  type EnvironmentCapabilityMatrix,
  type EnvironmentProviderKind,
  type EnvironmentProviderPort,
  type EnvironmentStatusSnapshot,
} from '../types/providers.ts';
import { companionStore } from './companion-store.ts';

export interface ConnectionStoreState {
  mode: EnvironmentProviderKind;
  provider: EnvironmentProviderPort;
  status: EnvironmentStatusSnapshot;

  setProviderKind: (kind: EnvironmentProviderKind) => void;
  requireCapability: (
    cap: keyof EnvironmentCapabilityMatrix,
    featureName: string,
    detail?: string
  ) => boolean;
}

const simulatedProvider = createSimulatedEnvironmentProvider();

function createProviderForKind(kind: EnvironmentProviderKind): EnvironmentProviderPort {
  if (kind === 'local-host') {
    return createFutureEnvironmentBoundary('local-host');
  }
  if (kind === 'cloud-host') {
    return createFutureEnvironmentBoundary('cloud-host');
  }
  return simulatedProvider;
}

export const connectionStore = createStore<ConnectionStoreState>((set, get) => ({
  mode: 'simulated-local',
  provider: simulatedProvider,
  status: simulatedProvider.getStatus(),

  setProviderKind(kind) {
    if (kind === 'local-host' || kind === 'cloud-host') {
      const boundary = createProviderForKind(kind);
      const st = boundary.getStatus();
      companionStore.getState().showPrototypeLimit({
        featureName:
          kind === 'local-host'
            ? 'Computer-Hosted Environment (Future Provider)'
            : 'Cloud Environment (Future Provider)',
        subtitle: 'Simulated Prototype · Not Yet Connected',
        description:
          kind === 'local-host'
            ? 'In production, connecting to a computer-hosted i² environment lets Quest and desktop update the same project, session, chat, tasks, and previews together. This prototype runs simulated local environment state only with zero networking.'
            : 'In production, choosing a cloud-hosted i² environment keeps Quest, mobile, web, and desktop synchronized in real time. Cloud connections are not implemented in this prototype.',
        environmentNote: st.honestStatusNote,
      });
      return;
    }

    set({
      mode: 'simulated-local',
      provider: simulatedProvider,
      status: simulatedProvider.getStatus(),
    });
  },

  requireCapability(cap, featureName, detail) {
    const caps = get().provider.getCapabilities();
    const val = caps[cap];
    const allowed =
      cap === 'chat'
        ? val === 'live-agent'
        : cap === 'filesystem'
          ? val === 'live-workspace'
          : cap === 'git'
            ? val === 'live-git'
            : cap === 'doctor'
              ? val === 'live-cli'
              : cap === 'terminal'
                ? val === 'live-pty'
                : cap === 'emulatorsWeb'
                  ? val === 'live-preview'
                  : cap === 'emulatorsNative'
                    ? val === 'live-preview'
                    : Boolean(val);

    if (allowed) return true;

    const err = new CapabilityUnavailableError(
      cap,
      featureName,
      detail ??
        `${featureName} requires a future connected local computer or cloud i² environment provider (currently running simulated single-device state).`
    );
    companionStore.getState().showPrototypeLimit({
      featureName: err.featureName,
      subtitle: 'Simulated Shared Environment Boundary',
      description: err.message,
      environmentNote: get().status.honestStatusNote,
    });
    return false;
  },
}));

export function getActiveEnvironmentProvider(): EnvironmentProviderPort {
  return connectionStore.getState().provider;
}

export function useConnectionStore<T>(selector: (s: ConnectionStoreState) => T): T {
  return useStore(connectionStore, selector);
}
