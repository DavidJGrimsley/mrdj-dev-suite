import type {
  ChatMessage,
  GlobalTodoItem,
  NotificationItem,
  ProjectRecord,
  SessionRecord,
  SimulatedAppPreviewState,
} from './companion';

export type EnvironmentProviderKind = 'simulated-local' | 'local-host' | 'cloud-host';

export type EnvironmentSyncStatus =
  | 'simulated-local-only'
  | 'discovering'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'boundary-blocked';

export type CommandOrigin = 'quest-vr' | 'companion-2d' | 'system';

export interface EnvironmentDescriptor {
  id: string;
  name: string;
  kind: EnvironmentProviderKind;
  locationLabel: string;
  defaultProjectId: string;
  defaultSessionId: string;
  available: boolean;
  description: string;
}

export interface EnvironmentCapabilityMatrix {
  providerKind: EnvironmentProviderKind;
  sharedStateMode: 'simulated-in-app' | 'live-local-host' | 'live-cloud-host';
  crossDeviceSync: boolean;
  chat: 'scripted' | 'live-agent';
  filesystem: 'bundled-snapshot' | 'live-workspace';
  git: 'seeded-diffs' | 'live-git';
  doctor: 'mock-report' | 'live-cli';
  terminal: 'mock-tabs' | 'live-pty';
  emulatorsWeb: 'bundled-preview' | 'live-preview';
  emulatorsNative: 'simulated-app-preview' | 'live-preview';
  hostMutationsAuthorized: boolean;
}

export interface HostEndpointProfile {
  id: string;
  displayName: string;
  hostAddress: string;
  port: number;
  protocol: 'https' | 'wss' | 'lan-http';
  paired: boolean;
  lastConnectedAt: number | null;
}

export interface EnvironmentStatusSnapshot {
  providerKind: EnvironmentProviderKind;
  syncStatus: EnvironmentSyncStatus;
  environmentId: string;
  environmentName: string;
  hostLabel: string;
  activeHostId: string | null;
  latencyMs: number | null;
  capabilities: EnvironmentCapabilityMatrix;
  lastError: string | null;
  honestStatusNote: string;
  pendingUserConfirmationCount: number;
}

export class CapabilityUnavailableError extends Error {
  readonly capability: keyof EnvironmentCapabilityMatrix;
  readonly featureName: string;

  constructor(capability: keyof EnvironmentCapabilityMatrix, featureName: string, message: string) {
    super(message);
    this.name = 'CapabilityUnavailableError';
    this.capability = capability;
    this.featureName = featureName;
  }
}

export interface DiscoveredI2Host {
  hostId: string;
  displayName: string;
  lanAddress: string;
  port: number;
  protocolVersion: number;
  paired: boolean;
}

export interface WorkspaceFileNode {
  name: string;
  path: string;
  kind: 'file' | 'folder';
  children?: WorkspaceFileNode[];
}

export interface WorkspaceFilePort {
  getTree(projectId: string): Promise<WorkspaceFileNode[]>;
  readFile(
    projectId: string,
    relPath: string
  ): Promise<{ content: string | null; readonly: boolean; note?: string }>;
  writeFile(projectId: string, relPath: string, content: string): Promise<void>;
  search(
    projectId: string,
    query: string
  ): Promise<{ path: string; line: number; preview: string }[]>;
  getOutline(
    projectId: string,
    relPath: string
  ): Promise<{ name: string; kind: string; line: number }[]>;
}

export interface SessionOrchestrationPort {
  sendChatTurn(scopeKey: string, text: string): Promise<{ assistantReply: string }>;
  dispatchAction(projectId: string, cmd: string, sessionId?: string): Promise<{ message: string }>;
  runDoctor(projectId: string): Promise<{ ok: boolean; msg: string }[]>;
}

export type SessionStageAction =
  | 'approve-plan'
  | 'test-app'
  | 'verify-testing'
  | 'open-pr'
  | 'merge-pr'
  | 'submit-report'
  | 'reset-demo';

export type EnvironmentCommand =
  | { type: 'select-environment'; environmentId: string }
  | { type: 'select-project'; projectId: string }
  | { type: 'select-session'; sessionId: string }
  | { type: 'send-chat'; scopeKey: string; text: string; senderLabel?: string }
  | { type: 'answer-agent-question'; sessionId: string; answer: 'newest' | 'oldest' }
  | { type: 'toggle-agent-task'; sessionId: string; taskId: string }
  | { type: 'toggle-human-test'; sessionId: string; testId: string }
  | { type: 'advance-session-stage'; sessionId: string; action: SessionStageAction }
  | { type: 'toggle-global-todo'; todoId: string }
  | { type: 'add-global-todo'; text: string; projectId?: string }
  | { type: 'delete-global-todo'; todoId: string }
  | { type: 'mark-notification-read'; notificationId: string }
  | { type: 'post-preview-comment'; text: string; author?: string }
  | { type: 'toggle-preview-reaction'; commentId: string; kind: 'like' | 'love' }
  | { type: 'set-preview-target'; target: 'main' | 'test' | 'session' }
  | { type: 'run-whats-next' }
  | { type: 'import-field-notes' }
  | { type: 'create-experimemo'; name?: string };

export interface EnvironmentEvent {
  kind: 'command-applied' | 'environment-switched' | 'boundary-blocked' | 'hydrated';
  seq: number;
  commandType?: EnvironmentCommand['type'];
  origin: CommandOrigin;
  summary: string;
  timestamp: number;
}

export interface EnvironmentSnapshot {
  environmentId: string;
  environmentName: string;
  providerKind: EnvironmentProviderKind;
  syncStatus: EnvironmentSyncStatus;
  honestStatusNote: string;
  activeProjectId: string;
  activeSessionId: string;
  projects: ProjectRecord[];
  sessions: SessionRecord[];
  globalTodos: GlobalTodoItem[];
  notifications: NotificationItem[];
  messagesByScope: Record<string, ChatMessage[]>;
  whatsNextLines: string[];
  appPreview: SimulatedAppPreviewState;
  b14Answer: 'newest' | 'oldest' | null;
  lastEventSeq: number;
  lastEventSummary: string;
  recentEvents: EnvironmentEvent[];
}

export interface EnvironmentCommandResult {
  ok: boolean;
  seq: number;
  summary: string;
  error?: string;
}

export interface EnvironmentProviderPort {
  readonly kind: EnvironmentProviderKind;
  getStatus(): EnvironmentStatusSnapshot;
  getCapabilities(): EnvironmentCapabilityMatrix;
  listEnvironments(): readonly EnvironmentDescriptor[];
  getState(): EnvironmentSnapshot;
  hydratePersistedState(patch: {
    globalTodos?: GlobalTodoItem[];
    notifications?: NotificationItem[];
    taskChecks?: Record<string, boolean>;
  }): void;
  dispatch(command: EnvironmentCommand, origin?: CommandOrigin): Promise<EnvironmentCommandResult>;
  subscribe(listener: (event: EnvironmentEvent, snapshot: EnvironmentSnapshot) => void): () => void;
  discoverHosts(signal?: AbortSignal): Promise<DiscoveredI2Host[]>;
  connectEnvironment(targetId: string): Promise<void>;
  disconnect(): Promise<void>;
  files: WorkspaceFilePort;
  orchestration: SessionOrchestrationPort;
}
