import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { companionRepos } from '../adapters/sqlite/companion-db';
import { LEEK_BEATS_TRACKS, SIMULATED_ENVIRONMENTS } from '../data/seeded-workspace.ts';
import {
  DEFAULT_INFIE_PREFERENCES,
  type ChatMessage,
  type GlobalTodoItem,
  type InfiePreferences,
  type NotificationItem,
  type ProjectRecord,
  type PrototypeLimitRequest,
  type SessionRecord,
  type SimulatedAppPreviewState,
  type UserSession,
} from '../types/companion.ts';
import {
  CapabilityUnavailableError,
  type CommandOrigin,
  type EnvironmentCommand,
  type EnvironmentCommandResult,
  type EnvironmentDescriptor,
  type EnvironmentEvent,
  type EnvironmentProviderKind,
  type EnvironmentSnapshot,
  type EnvironmentSyncStatus,
  type SessionStageAction,
} from '../types/providers.ts';
import { connectionStore } from './connection-store.ts';

export type CompanionRouteName = 'home' | 'project' | 'session' | 'emulators';

export interface CompanionState {
  hydrated: boolean;
  session: UserSession | null;
  route: CompanionRouteName;
  environmentId: string;
  environmentName: string;
  providerKind: EnvironmentProviderKind;
  syncStatus: EnvironmentSyncStatus;
  honestStatusNote: string;
  availableEnvironments: readonly EnvironmentDescriptor[];
  activeProjectId: string;
  activeSessionId: string;
  projects: ProjectRecord[];
  sessions: SessionRecord[];
  globalTodos: GlobalTodoItem[];
  notifications: NotificationItem[];
  messagesByScope: Record<string, ChatMessage[]>;
  appPreview: SimulatedAppPreviewState;
  b14Answer: 'newest' | 'oldest' | null;
  lastEventSeq: number;
  lastEventSummary: string;
  recentEvents: EnvironmentEvent[];
  preferences: InfiePreferences;
  prototypeLimit: PrototypeLimitRequest | null;
  whatsNextLines: string[];
  whatsNextLastScannedAt: number | null;
  musicPlaying: boolean;
  musicTrackIndex: number;
  selectedPlanTier: 'free' | 'pro' | 'team';
  storageBackendLabel: string;
  crossOriginIsolated: boolean | null;

  hydrate: () => Promise<void>;
  refreshSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
  setRoute: (route: CompanionRouteName) => void;
  dispatchEnvironmentCommand: (
    command: EnvironmentCommand,
    origin?: CommandOrigin
  ) => Promise<EnvironmentCommandResult>;
  selectEnvironment: (environmentId: string, origin?: CommandOrigin) => Promise<void>;
  selectProject: (projectId: string, origin?: CommandOrigin) => void;
  selectSession: (sessionId: string, origin?: CommandOrigin) => void;
  toggleAgentTask: (sessionId: string, taskId: string, origin?: CommandOrigin) => Promise<void>;
  toggleHumanTest: (sessionId: string, testId: string, origin?: CommandOrigin) => Promise<void>;
  answerB14Question: (
    sessionId: string,
    answer: 'newest' | 'oldest',
    origin?: CommandOrigin
  ) => Promise<void>;
  advanceSessionStage: (
    sessionId: string,
    action: SessionStageAction,
    origin?: CommandOrigin
  ) => Promise<EnvironmentCommandResult>;
  toggleGlobalTodo: (id: string, origin?: CommandOrigin) => Promise<void>;
  addGlobalTodo: (text: string, projectId?: string, origin?: CommandOrigin) => Promise<void>;
  deleteGlobalTodo: (id: string, origin?: CommandOrigin) => Promise<void>;
  markNotificationRead: (id: string, origin?: CommandOrigin) => Promise<void>;
  sendChatMessage: (
    scopeKey: string,
    text: string,
    origin?: CommandOrigin,
    senderLabel?: string
  ) => Promise<void>;
  postPreviewComment: (
    text: string,
    origin?: CommandOrigin,
    author?: string
  ) => Promise<EnvironmentCommandResult>;
  togglePreviewReaction: (
    commentId: string,
    kind: 'like' | 'love',
    origin?: CommandOrigin
  ) => Promise<void>;
  setPreviewTarget: (target: 'main' | 'test' | 'session', origin?: CommandOrigin) => Promise<void>;
  setPreferences: (patch: Partial<InfiePreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  showPrototypeLimit: (req: PrototypeLimitRequest) => void;
  dismissPrototypeLimit: () => void;
  runWhatsNextScan: (origin?: CommandOrigin) => void;
  toggleMusic: () => void;
  nextTrack: () => void;
  setPlanTier: (tier: 'free' | 'pro' | 'team') => void;
  importFieldNotesDemo: (origin?: CommandOrigin) => void;
  createExperimemoDemo: (name?: string, origin?: CommandOrigin) => void;
}

function projectFromEnvironment(snap: EnvironmentSnapshot) {
  return {
    environmentId: snap.environmentId,
    environmentName: snap.environmentName,
    providerKind: snap.providerKind,
    syncStatus: snap.syncStatus,
    honestStatusNote: snap.honestStatusNote,
    activeProjectId: snap.activeProjectId,
    activeSessionId: snap.activeSessionId,
    projects: snap.projects,
    sessions: snap.sessions,
    globalTodos: snap.globalTodos,
    notifications: snap.notifications,
    messagesByScope: snap.messagesByScope,
    whatsNextLines: snap.whatsNextLines,
    appPreview: snap.appPreview,
    b14Answer: snap.b14Answer,
    lastEventSeq: snap.lastEventSeq,
    lastEventSummary: snap.lastEventSummary,
    recentEvents: snap.recentEvents,
  };
}

const initialProvider = connectionStore.getState().provider;
const initialEnvSnapshot = initialProvider.getState();

export const companionStore = createStore<CompanionState>((set, get) => ({
  hydrated: false,
  session: null,
  route: 'home',
  ...projectFromEnvironment(initialEnvSnapshot),
  availableEnvironments: SIMULATED_ENVIRONMENTS,
  preferences: { ...DEFAULT_INFIE_PREFERENCES },
  prototypeLimit: null,
  whatsNextLastScannedAt: null,
  musicPlaying: false,
  musicTrackIndex: 0,
  selectedPlanTier: 'free',
  storageBackendLabel: companionRepos.diagnostic.backend,
  crossOriginIsolated: companionRepos.diagnostic.crossOriginIsolated,

  async hydrate() {
    await companionRepos.ensureReady();
    const [session, preferences, globalTodos, notifications, taskChecks] = await Promise.all([
      companionRepos.restoreSession(),
      companionRepos.getPreferences(),
      companionRepos.listGlobalTodos(),
      companionRepos.listNotifications(),
      companionRepos.getTaskChecklistState(),
    ]);

    const provider = connectionStore.getState().provider;
    provider.hydratePersistedState({ globalTodos, notifications, taskChecks });
    const snap = provider.getState();

    set({
      hydrated: true,
      session,
      preferences,
      ...projectFromEnvironment(snap),
    });
  },

  async refreshSession() {
    const session = await companionRepos.restoreSession();
    set({ session });
  },

  async signIn(email, password) {
    const res = await companionRepos.signIn(email, password);
    if (!res.ok) return { ok: false, error: res.error };
    set({ session: res.session });
    return { ok: true };
  },

  async signOut() {
    await companionRepos.signOut();
    set({ session: null, route: 'home' });
  },

  setRoute(route) {
    set({ route });
  },

  async dispatchEnvironmentCommand(command, origin = 'companion-2d') {
    const provider = connectionStore.getState().provider;
    try {
      const result = await provider.dispatch(command, origin);
      const snap = provider.getState();
      set(projectFromEnvironment(snap));
      return result;
    } catch (err) {
      if (err instanceof CapabilityUnavailableError) {
        get().showPrototypeLimit({
          featureName: err.featureName,
          subtitle: 'Future Environment Provider Boundary',
          description: err.message,
          environmentNote: provider.getStatus().honestStatusNote,
        });
        return {
          ok: false,
          seq: get().lastEventSeq,
          summary: err.message,
          error: err.message,
        };
      }
      throw err;
    }
  },

  async selectEnvironment(environmentId, origin = 'companion-2d') {
    await get().dispatchEnvironmentCommand({ type: 'select-environment', environmentId }, origin);
  },

  selectProject(projectId, origin = 'companion-2d') {
    void get().dispatchEnvironmentCommand({ type: 'select-project', projectId }, origin);
    set({ route: 'project' });
  },

  selectSession(sessionId, origin = 'companion-2d') {
    const found = get().sessions.find((s) => s.id === sessionId);
    if (!found) return;
    void get().dispatchEnvironmentCommand({ type: 'select-session', sessionId }, origin);
    set({ route: 'session' });
  },

  async toggleAgentTask(sessionId, taskId, origin = 'companion-2d') {
    await get().dispatchEnvironmentCommand(
      { type: 'toggle-agent-task', sessionId, taskId },
      origin
    );
    const updated = get()
      .sessions.find((s) => s.id === sessionId)
      ?.agentTasks.find((t) => t.id === taskId);
    if (updated) {
      await companionRepos.setTaskChecked(taskId, updated.done);
    }
  },

  async toggleHumanTest(sessionId, testId, origin = 'companion-2d') {
    await get().dispatchEnvironmentCommand(
      { type: 'toggle-human-test', sessionId, testId },
      origin
    );
    const updated = get()
      .sessions.find((s) => s.id === sessionId)
      ?.humanTests.find((t) => t.id === testId);
    if (updated) {
      await companionRepos.setTaskChecked(testId, updated.done);
    }
  },

  async answerB14Question(sessionId, answer, origin = 'companion-2d') {
    await get().dispatchEnvironmentCommand(
      { type: 'answer-agent-question', sessionId, answer },
      origin
    );
    await companionRepos.setTaskChecked('pet-task-2', true);
  },

  async advanceSessionStage(sessionId, action, origin = 'companion-2d') {
    return get().dispatchEnvironmentCommand(
      { type: 'advance-session-stage', sessionId, action },
      origin
    );
  },

  async toggleGlobalTodo(id, origin = 'companion-2d') {
    await get().dispatchEnvironmentCommand({ type: 'toggle-global-todo', todoId: id }, origin);
    await companionRepos.saveGlobalTodos(get().globalTodos);
  },

  async addGlobalTodo(text, projectId, origin = 'companion-2d') {
    const res = await get().dispatchEnvironmentCommand(
      { type: 'add-global-todo', text, projectId },
      origin
    );
    if (res.ok) {
      await companionRepos.saveGlobalTodos(get().globalTodos);
    }
  },

  async deleteGlobalTodo(id, origin = 'companion-2d') {
    await get().dispatchEnvironmentCommand({ type: 'delete-global-todo', todoId: id }, origin);
    await companionRepos.saveGlobalTodos(get().globalTodos);
  },

  async markNotificationRead(id, origin = 'companion-2d') {
    await get().dispatchEnvironmentCommand(
      { type: 'mark-notification-read', notificationId: id },
      origin
    );
    await companionRepos.saveNotifications(get().notifications);
  },

  async sendChatMessage(scopeKey, text, origin = 'companion-2d', senderLabel) {
    await get().dispatchEnvironmentCommand(
      { type: 'send-chat', scopeKey, text, senderLabel },
      origin
    );
  },

  async postPreviewComment(text, origin = 'companion-2d', author) {
    return get().dispatchEnvironmentCommand({ type: 'post-preview-comment', text, author }, origin);
  },

  async togglePreviewReaction(commentId, kind, origin = 'companion-2d') {
    await get().dispatchEnvironmentCommand(
      { type: 'toggle-preview-reaction', commentId, kind },
      origin
    );
  },

  async setPreviewTarget(target, origin = 'companion-2d') {
    await get().dispatchEnvironmentCommand({ type: 'set-preview-target', target }, origin);
  },

  async setPreferences(patch) {
    const next = { ...get().preferences, ...patch };
    set({ preferences: next });
    await companionRepos.savePreferences(next);
  },

  async resetPreferences() {
    const next = { ...DEFAULT_INFIE_PREFERENCES };
    set({ preferences: next });
    await companionRepos.savePreferences(next);
  },

  showPrototypeLimit(req) {
    set({ prototypeLimit: req });
  },

  dismissPrototypeLimit() {
    set({ prototypeLimit: null });
  },

  runWhatsNextScan(origin = 'companion-2d') {
    void get().dispatchEnvironmentCommand({ type: 'run-whats-next' }, origin);
    set({ whatsNextLastScannedAt: Date.now() });
  },

  toggleMusic() {
    set((s) => ({ musicPlaying: !s.musicPlaying }));
  },

  nextTrack() {
    set((s) => ({
      musicTrackIndex: (s.musicTrackIndex + 1) % LEEK_BEATS_TRACKS.length,
    }));
  },

  setPlanTier(tier) {
    set({ selectedPlanTier: tier });
  },

  importFieldNotesDemo(origin = 'companion-2d') {
    void get().dispatchEnvironmentCommand({ type: 'import-field-notes' }, origin);
  },

  createExperimemoDemo(name, origin = 'companion-2d') {
    void get().dispatchEnvironmentCommand({ type: 'create-experimemo', name }, origin);
  },
}));

initialProvider.subscribe((_event, snap) => {
  companionStore.setState(projectFromEnvironment(snap));
});

export function useCompanionStore<T>(selector: (s: CompanionState) => T): T {
  return useStore(companionStore, selector);
}
