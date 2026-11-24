import { SIMULATED_ENVIRONMENTS } from '../data/seeded-workspace.ts';
import {
  CapabilityUnavailableError,
  type DiscoveredI2Host,
  type EnvironmentCapabilityMatrix,
  type EnvironmentCommand,
  type EnvironmentCommandResult,
  type EnvironmentDescriptor,
  type EnvironmentEvent,
  type EnvironmentProviderKind,
  type EnvironmentProviderPort,
  type EnvironmentSnapshot,
  type EnvironmentStatusSnapshot,
} from '../types/providers.ts';
import { createSimulatedEnvironmentProvider } from './simulated-environment-provider.ts';

export function buildFutureEnvironmentCapabilities(
  kind: Exclude<EnvironmentProviderKind, 'simulated-local'>
): EnvironmentCapabilityMatrix {
  return {
    providerKind: kind,
    sharedStateMode: kind === 'local-host' ? 'live-local-host' : 'live-cloud-host',
    crossDeviceSync: false,
    chat: 'scripted',
    filesystem: 'bundled-snapshot',
    git: 'seeded-diffs',
    doctor: 'mock-report',
    terminal: 'mock-tabs',
    emulatorsWeb: 'bundled-preview',
    emulatorsNative: 'simulated-app-preview',
    hostMutationsAuthorized: false,
  };
}

/**
 * Typed boundary for future Local Computer ('local-host') and Cloud ('cloud-host')
 * shared-environment providers.
 *
 * Intentionally opens zero network sockets and invents zero wire protocols in this
 * simulated-only prototype; attempting live connection or mutation surfaces an explicit
 * CapabilityUnavailableError / PrototypeLimit notice.
 */
export function createFutureEnvironmentBoundary(
  kind: Exclude<EnvironmentProviderKind, 'simulated-local'>
): EnvironmentProviderPort {
  const baseSim = createSimulatedEnvironmentProvider();
  const label =
    kind === 'local-host'
      ? 'Desktop Computer Environment (Future · Not Connected)'
      : 'Cloud Environment (Future · Not Connected)';
  const envId = kind === 'local-host' ? 'future-local-host' : 'future-cloud-host';

  return {
    kind,

    getStatus(): EnvironmentStatusSnapshot {
      return {
        providerKind: kind,
        syncStatus: 'disconnected',
        environmentId: envId,
        environmentName: label,
        hostLabel: label,
        activeHostId: null,
        latencyMs: null,
        capabilities: buildFutureEnvironmentCapabilities(kind),
        lastError:
          kind === 'local-host'
            ? 'Computer-hosted environment transport is not wired in this prototype.'
            : 'Cloud-hosted environment transport is not wired in this prototype.',
        honestStatusNote:
          'Future provider boundary only — no real networking, no desktop connection, and no cloud sync implemented.',
        pendingUserConfirmationCount: 0,
      };
    },

    getCapabilities(): EnvironmentCapabilityMatrix {
      return buildFutureEnvironmentCapabilities(kind);
    },

    listEnvironments(): readonly EnvironmentDescriptor[] {
      return SIMULATED_ENVIRONMENTS;
    },

    getState(): EnvironmentSnapshot {
      return {
        ...baseSim.getState(),
        providerKind: kind,
        syncStatus: 'disconnected',
        environmentId: envId,
        environmentName: label,
      };
    },

    hydratePersistedState(patch) {
      baseSim.hydratePersistedState(patch);
    },

    async dispatch(command: EnvironmentCommand): Promise<EnvironmentCommandResult> {
      throw new CapabilityUnavailableError(
        'hostMutationsAuthorized',
        `${label} · ${command.type}`,
        `Live ${kind === 'local-host' ? 'desktop computer' : 'cloud'} environment sync is not wired in this prototype. Switch back to Simulated Shared Environment for interactive local state.`
      );
    },

    subscribe(listener: (event: EnvironmentEvent, snapshot: EnvironmentSnapshot) => void) {
      return baseSim.subscribe(listener);
    },

    async discoverHosts(): Promise<DiscoveredI2Host[]> {
      return [];
    },

    async connectEnvironment(): Promise<void> {
      throw new CapabilityUnavailableError(
        'hostMutationsAuthorized',
        label,
        `Connecting to a ${kind === 'local-host' ? 'computer-hosted' : 'cloud-hosted'} i² environment is deferred until the real shared-environment provider is authorized.`
      );
    },

    async disconnect(): Promise<void> {},

    files: baseSim.files,
    orchestration: {
      async sendChatTurn() {
        throw new CapabilityUnavailableError(
          'chat',
          `${label} Agent Chat`,
          `${label} is disconnected in this simulated-only prototype.`
        );
      },
      async dispatchAction(_projectId, cmd) {
        throw new CapabilityUnavailableError(
          'hostMutationsAuthorized',
          `Dispatch ${cmd}`,
          `${label} is disconnected. No mutations are queued or sent over the network.`
        );
      },
      async runDoctor() {
        throw new CapabilityUnavailableError(
          'doctor',
          `${label} Doctor`,
          `${label} is disconnected.`
        );
      },
    },
  };
}
