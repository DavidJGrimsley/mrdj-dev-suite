import {
  B14_AGENT_REPLY_DEFAULT,
  SEEDED_FILES,
  SEEDED_GLOBAL_TODOS,
  SEEDED_NOTIFICATIONS,
  SEEDED_PROJECTS,
  SEEDED_SESSIONS,
  SIMULATED_ENVIRONMENTS,
  SIMULATED_SHARED_NOTE,
  createInitialAppPreviewState,
} from '../data/seeded-workspace.ts';
import type { ChatMessage, GlobalTodoItem, SessionStatus } from '../types/companion.ts';
import {
  CapabilityUnavailableError,
  type CommandOrigin,
  type DiscoveredI2Host,
  type EnvironmentCapabilityMatrix,
  type EnvironmentCommand,
  type EnvironmentCommandResult,
  type EnvironmentDescriptor,
  type EnvironmentEvent,
  type EnvironmentProviderPort,
  type EnvironmentSnapshot,
  type EnvironmentStatusSnapshot,
  type SessionOrchestrationPort,
  type WorkspaceFileNode,
  type WorkspaceFilePort,
} from '../types/providers.ts';

export const SIMULATED_ENV_CAPABILITIES: EnvironmentCapabilityMatrix = {
  providerKind: 'simulated-local',
  sharedStateMode: 'simulated-in-app',
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

function buildTreeFromPaths(projectName: string, paths: string[]): WorkspaceFileNode[] {
  const root: WorkspaceFileNode = {
    name: projectName,
    path: '',
    kind: 'folder',
    children: [],
  };
  for (const rel of paths) {
    const parts = rel.split('/');
    let cursor = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const curPath = parts.slice(0, i + 1).join('/');
      cursor.children ??= [];
      let child = cursor.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: curPath,
          kind: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        };
        cursor.children.push(child);
      }
      cursor = child;
    }
  }
  return [root];
}

export function buildSimulatedFilePort(): WorkspaceFilePort {
  return {
    async getTree(projectId) {
      const files = SEEDED_FILES[projectId];
      if (!files) return [];
      return buildTreeFromPaths(
        projectId === 'pet' ? 'pet-show-and-tell' : projectId,
        Object.keys(files)
      );
    },
    async readFile(projectId, relPath) {
      const files = SEEDED_FILES[projectId];
      if (!files || !(relPath in files)) {
        return {
          content: null,
          readonly: true,
          note: 'File is not included in the simulated workspace snapshot.',
        };
      }
      return {
        content: files[relPath],
        readonly: true,
        note: 'Simulated read-only workspace snapshot',
      };
    },
    async writeFile() {
      throw new CapabilityUnavailableError(
        'hostMutationsAuthorized',
        'Write Project File',
        'Writing files directly to a computer or cloud workspace requires a future connected environment provider.'
      );
    },
    async search(projectId, query) {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      const files = SEEDED_FILES[projectId] ?? {};
      const results: { path: string; line: number; preview: string }[] = [];
      for (const [filePath, body] of Object.entries(files)) {
        body.split('\n').forEach((line, idx) => {
          if (line.toLowerCase().includes(q)) {
            results.push({ path: filePath, line: idx + 1, preview: line.trim() });
          }
        });
      }
      return results;
    },
    async getOutline(projectId, relPath) {
      const content = SEEDED_FILES[projectId]?.[relPath];
      if (!content) return [];
      const symbols: { name: string; kind: string; line: number }[] = [];
      content.split('\n').forEach((line, idx) => {
        const match = line.match(
          /(?:export\s+)?(?:function|const|interface|type|class)\s+([A-Za-z0-9_]+)/
        );
        if (match) {
          symbols.push({ name: match[1], kind: 'symbol', line: idx + 1 });
        }
      });
      return symbols;
    },
  };
}

export function buildSimulatedOrchestrationPort(): SessionOrchestrationPort {
  return {
    async sendChatTurn(scopeKey, text) {
      const lower = text.toLowerCase();
      if (lower.includes('doctor')) {
        return {
          assistantReply:
            'Simulated Doctor preview: local workspace checks green. Connect a future computer or cloud environment provider to run live `mds doctor`.',
        };
      }
      if (lower.includes('oldest')) {
        return {
          assistantReply:
            'Updated simulated environment preference: Pet Show and Tell comments now sort oldest first across app previews.',
        };
      }
      if (lower.includes('comment') || lower.includes('b14') || lower.includes('newest')) {
        return {
          assistantReply:
            'Got it — comments on Pet Show and Tell show newest first with Like/Love reaction toggles across all local previews.',
        };
      }
      const session = SEEDED_SESSIONS.find((s) => scopeKey.includes(s.id));
      return {
        assistantReply: session
          ? `Simulated Infie (${session.name}): local shared-state snapshot is active. Live agent execution stays gated until a computer or cloud environment is connected.`
          : 'Simulated Infie: independent i² interface active with simulated shared environment state (single-device offline mode).',
      };
    },
    async dispatchAction(_projectId, cmd) {
      throw new CapabilityUnavailableError(
        'hostMutationsAuthorized',
        `Action ${cmd}`,
        `Executing \`${cmd}\` against a real repository requires a future connected local computer or cloud environment.`
      );
    },
    async runDoctor() {
      throw new CapabilityUnavailableError(
        'doctor',
        'Live MDS Doctor',
        'Running live `mds doctor` scans requires a future connected computer or cloud environment.'
      );
    },
  };
}

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  home: [
    {
      id: 'init-home-1',
      scopeKey: 'home',
      role: 'assistant',
      senderLabel: 'Infie',
      content:
        'Welcome back to i² Companion. This Quest/mobile interface shares the same simulated workspace state across all widgets (offline local demo).',
      createdAt: 1700000000000,
    },
  ],
  'session:add-comments': [
    {
      id: 'init-pet-1',
      scopeKey: 'session:add-comments',
      role: 'assistant',
      senderLabel: 'Infie',
      content:
        'Session ready. Project: `pet-show-and-tell` · Goal: Add comments with Like/Love on comments.',
      createdAt: 1700000001000,
    },
  ],
  'session:experimemo-session': [
    {
      id: 'init-exp-1',
      scopeKey: 'session:experimemo-session',
      role: 'assistant',
      senderLabel: 'Infie',
      content: 'Experimemo session `feat/experiment-logger` is waiting on human test verification.',
      createdAt: 1700000002000,
    },
  ],
};

function cloneMessagesMap(source: Record<string, ChatMessage[]>): Record<string, ChatMessage[]> {
  const out: Record<string, ChatMessage[]> = {};
  for (const [k, list] of Object.entries(source)) {
    out[k] = list.map((m) => ({ ...m }));
  }
  return out;
}

function createInitialSnapshot(): EnvironmentSnapshot {
  const initialEnv = SIMULATED_ENVIRONMENTS[0];
  return {
    environmentId: initialEnv.id,
    environmentName: initialEnv.name,
    providerKind: 'simulated-local',
    syncStatus: 'simulated-local-only',
    honestStatusNote: SIMULATED_SHARED_NOTE,
    activeProjectId: initialEnv.defaultProjectId,
    activeSessionId: initialEnv.defaultSessionId,
    projects: SEEDED_PROJECTS.map((p) => ({ ...p })),
    sessions: SEEDED_SESSIONS.map((s) => ({
      ...s,
      agentTasks: s.agentTasks.map((t) => ({ ...t })),
      humanTests: s.humanTests.map((t) => ({ ...t })),
      commitDiffs: s.commitDiffs.map((d) => ({ ...d })),
      branchDiffs: s.branchDiffs.map((d) => ({ ...d })),
    })),
    globalTodos: SEEDED_GLOBAL_TODOS.map((t) => ({ ...t })),
    notifications: SEEDED_NOTIFICATIONS.map((n) => ({ ...n })),
    messagesByScope: cloneMessagesMap(INITIAL_MESSAGES),
    whatsNextLines: [
      'Pet Show and Tell: Add Comments is waiting on human verification (4 checks).',
      'Experimemo: Initial Experiment Logger preview is ready for review.',
    ],
    appPreview: createInitialAppPreviewState(),
    b14Answer: 'newest',
    lastEventSeq: 1,
    lastEventSummary: 'Simulated shared environment initialized locally (no network)',
    recentEvents: [
      {
        kind: 'hydrated',
        seq: 1,
        origin: 'system',
        summary: 'Initialized simulated local i² environment (single-device offline state)',
        timestamp: Date.now(),
      },
    ],
  };
}

function computeNextStageStatus(
  current: SessionStatus,
  action:
    | 'approve-plan'
    | 'test-app'
    | 'verify-testing'
    | 'open-pr'
    | 'merge-pr'
    | 'submit-report'
    | 'reset-demo',
  allHumanDone: boolean
): { nextStatus: SessionStatus; message: string } | null {
  switch (action) {
    case 'approve-plan':
      if (current !== 'PLAN REVIEW') return null;
      return {
        nextStatus: 'WAITING ON TEST',
        message: 'Simulated plan approved -> implementation ready for testing (WAITING ON TEST).',
      };
    case 'test-app':
      if (current !== 'WAITING ON TEST' && current !== 'PLAN REVIEW') return null;
      return {
        nextStatus: 'NEEDS YOU',
        message:
          'Updated app preview v2 mounted across Web, Android, and iOS preview widgets (NEEDS YOU).',
      };
    case 'verify-testing':
      if (!allHumanDone) return null;
      return {
        nextStatus: 'VERIFIED',
        message: 'All Human Testing checks complete -> session marked VERIFIED.',
      };
    case 'open-pr':
      if (current !== 'VERIFIED' && !allHumanDone) return null;
      return {
        nextStatus: 'PR OPEN',
        message: 'Simulated PR opened for review (PR OPEN; no remote repository touched).',
      };
    case 'merge-pr':
      if (current !== 'PR OPEN') return null;
      return {
        nextStatus: 'MERGED',
        message: 'Simulated merge into test branch complete (MERGED; local demo state only).',
      };
    case 'submit-report':
      if (current !== 'MERGED') return null;
      return {
        nextStatus: 'COMPLETE',
        message: 'Session completion report submitted -> COMPLETE.',
      };
    case 'reset-demo':
      return {
        nextStatus: 'NEEDS YOU',
        message: 'Reset session stage to NEEDS YOU for repeat verification.',
      };
  }
}

/**
 * Local in-app simulated shared-environment provider.
 * Updates all Companion views and widgets coherently via typed commands & event subscriptions,
 * with ZERO networking and ZERO claims of cross-device synchronization.
 */
export function createSimulatedEnvironmentProvider(): EnvironmentProviderPort {
  let state = createInitialSnapshot();
  const listeners = new Set<(event: EnvironmentEvent, snapshot: EnvironmentSnapshot) => void>();
  const files = buildSimulatedFilePort();
  const orchestration = buildSimulatedOrchestrationPort();

  const emit = (
    kind: EnvironmentEvent['kind'],
    origin: CommandOrigin,
    summary: string,
    commandType?: EnvironmentCommand['type']
  ): EnvironmentEvent => {
    const seq = state.lastEventSeq + 1;
    const event: EnvironmentEvent = {
      kind,
      seq,
      commandType,
      origin,
      summary,
      timestamp: Date.now(),
    };
    state = {
      ...state,
      lastEventSeq: seq,
      lastEventSummary: summary,
      recentEvents: [event, ...state.recentEvents].slice(0, 12),
    };
    const snapshot = cloneSnapshot(state);
    for (const listener of listeners) {
      listener(event, snapshot);
    }
    return event;
  };

  function cloneSnapshot(s: EnvironmentSnapshot): EnvironmentSnapshot {
    return {
      ...s,
      projects: s.projects.map((p) => ({ ...p })),
      sessions: s.sessions.map((sess) => ({
        ...sess,
        agentTasks: sess.agentTasks.map((t) => ({ ...t })),
        humanTests: sess.humanTests.map((t) => ({ ...t })),
        commitDiffs: sess.commitDiffs.map((d) => ({ ...d })),
        branchDiffs: sess.branchDiffs.map((d) => ({ ...d })),
      })),
      globalTodos: s.globalTodos.map((t) => ({ ...t })),
      notifications: s.notifications.map((n) => ({ ...n })),
      messagesByScope: cloneMessagesMap(s.messagesByScope),
      whatsNextLines: [...s.whatsNextLines],
      appPreview: {
        ...s.appPreview,
        comments: s.appPreview.comments.map((c) => ({ ...c })),
      },
      recentEvents: s.recentEvents.map((e) => ({ ...e })),
    };
  }

  return {
    kind: 'simulated-local',

    getStatus(): EnvironmentStatusSnapshot {
      return {
        providerKind: 'simulated-local',
        syncStatus: 'simulated-local-only',
        environmentId: state.environmentId,
        environmentName: state.environmentName,
        hostLabel: 'Simulated Shared Environment (Offline)',
        activeHostId: null,
        latencyMs: null,
        capabilities: SIMULATED_ENV_CAPABILITIES,
        lastError: null,
        honestStatusNote: SIMULATED_SHARED_NOTE,
        pendingUserConfirmationCount: state.notifications.filter((n) => !n.read).length,
      };
    },

    getCapabilities(): EnvironmentCapabilityMatrix {
      return SIMULATED_ENV_CAPABILITIES;
    },

    listEnvironments(): readonly EnvironmentDescriptor[] {
      return SIMULATED_ENVIRONMENTS;
    },

    getState(): EnvironmentSnapshot {
      return cloneSnapshot(state);
    },

    hydratePersistedState(patch) {
      state = {
        ...state,
        ...(patch.globalTodos ? { globalTodos: patch.globalTodos.map((t) => ({ ...t })) } : {}),
        ...(patch.notifications
          ? { notifications: patch.notifications.map((n) => ({ ...n })) }
          : {}),
        ...(patch.taskChecks
          ? {
              sessions: state.sessions.map((s) => {
                const agentTasks = s.agentTasks.map((t) =>
                  t.id in patch.taskChecks! ? { ...t, done: patch.taskChecks![t.id] } : t
                );
                const humanTests = s.humanTests.map((t) =>
                  t.id in patch.taskChecks! ? { ...t, done: patch.taskChecks![t.id] } : t
                );
                const allDone = humanTests.length > 0 && humanTests.every((t) => t.done);
                const nextStatus: SessionStatus =
                  allDone && s.status === 'NEEDS YOU' ? 'VERIFIED' : s.status;
                return { ...s, agentTasks, humanTests, status: nextStatus };
              }),
            }
          : {}),
      };
      emit('hydrated', 'system', 'Hydrated local SQLite workspace state');
    },

    async dispatch(
      command: EnvironmentCommand,
      origin: CommandOrigin = 'companion-2d'
    ): Promise<EnvironmentCommandResult> {
      switch (command.type) {
        case 'select-environment': {
          const target = SIMULATED_ENVIRONMENTS.find((e) => e.id === command.environmentId);
          if (!target) {
            return {
              ok: false,
              seq: state.lastEventSeq,
              summary: 'Unknown environment ID',
              error: `Environment "${command.environmentId}" not found.`,
            };
          }
          if (target.kind !== 'simulated-local') {
            const msg = `${target.name} is a future ${target.kind} provider boundary. No real networking or remote connection exists in this prototype.`;
            emit('boundary-blocked', origin, msg, command.type);
            throw new CapabilityUnavailableError('hostMutationsAuthorized', target.name, msg);
          }
          state = {
            ...state,
            environmentId: target.id,
            environmentName: target.name,
            activeProjectId: target.defaultProjectId,
            activeSessionId: target.defaultSessionId,
            appPreview: {
              ...state.appPreview,
              projectId: target.defaultProjectId,
              lastUpdatedAt: Date.now(),
            },
          };
          const ev = emit(
            'environment-switched',
            origin,
            `Switched simulated environment -> ${target.name}`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'select-project': {
          const proj = state.projects.find((p) => p.id === command.projectId);
          if (!proj) {
            return { ok: false, seq: state.lastEventSeq, summary: 'Project not found' };
          }
          const firstSess = state.sessions.find((s) => s.projectId === proj.id);
          const matchingEnv = SIMULATED_ENVIRONMENTS.find(
            (e) => e.kind === 'simulated-local' && e.defaultProjectId === proj.id
          );
          state = {
            ...state,
            activeProjectId: proj.id,
            activeSessionId: firstSess ? firstSess.id : state.activeSessionId,
            ...(matchingEnv
              ? { environmentId: matchingEnv.id, environmentName: matchingEnv.name }
              : {}),
            appPreview: {
              ...state.appPreview,
              projectId: proj.id,
              lastUpdatedAt: Date.now(),
            },
          };
          const ev = emit('command-applied', origin, `Selected project ${proj.name}`, command.type);
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'select-session': {
          const found = state.sessions.find((s) => s.id === command.sessionId);
          if (!found) {
            return { ok: false, seq: state.lastEventSeq, summary: 'Session not found' };
          }
          const matchingEnv = SIMULATED_ENVIRONMENTS.find(
            (e) => e.kind === 'simulated-local' && e.defaultProjectId === found.projectId
          );
          state = {
            ...state,
            activeProjectId: found.projectId,
            activeSessionId: found.id,
            ...(matchingEnv
              ? { environmentId: matchingEnv.id, environmentName: matchingEnv.name }
              : {}),
            appPreview: {
              ...state.appPreview,
              projectId: found.projectId,
              lastUpdatedAt: Date.now(),
            },
          };
          const ev = emit(
            'command-applied',
            origin,
            `Focused session ${found.name} [${found.status}]`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'send-chat': {
          const clean = command.text.trim();
          if (!clean) {
            return { ok: false, seq: state.lastEventSeq, summary: 'Empty message ignored' };
          }
          const userMsg: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            scopeKey: command.scopeKey,
            role: 'user',
            senderLabel: command.senderLabel ?? (origin === 'quest-vr' ? 'You (Quest)' : 'You'),
            content: clean,
            createdAt: Date.now(),
          };
          const reply = await orchestration.sendChatTurn(command.scopeKey, clean);
          const assistantMsg: ChatMessage = {
            id: `msg-${Date.now() + 1}-${Math.random().toString(36).slice(2, 6)}`,
            scopeKey: command.scopeKey,
            role: 'assistant',
            senderLabel: 'Infie',
            content: reply.assistantReply,
            createdAt: Date.now() + 1,
          };
          const prevList = state.messagesByScope[command.scopeKey] ?? [];
          state = {
            ...state,
            messagesByScope: {
              ...state.messagesByScope,
              [command.scopeKey]: [...prevList, userMsg, assistantMsg],
            },
          };
          const ev = emit(
            'command-applied',
            origin,
            `Chat message in ${command.scopeKey}`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'answer-agent-question': {
          const isNewest = command.answer === 'newest';
          const answerLabel = isNewest ? B14_AGENT_REPLY_DEFAULT : 'Oldest first.';
          const scopeKey = `session:${command.sessionId}`;
          const prevList = state.messagesByScope[scopeKey] ?? state.messagesByScope.home ?? [];
          const sortedComments = [...state.appPreview.comments].sort((a, b) =>
            isNewest ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
          );
          state = {
            ...state,
            b14Answer: command.answer,
            appPreview: {
              ...state.appPreview,
              sortOrder: command.answer,
              comments: sortedComments,
              lastUpdatedAt: Date.now(),
            },
            sessions: state.sessions.map((s) =>
              s.id === command.sessionId
                ? {
                    ...s,
                    agentTasks: s.agentTasks.map((t) =>
                      t.id === 'pet-task-2'
                        ? { ...t, done: true, statusLabel: `answered: ${answerLabel}` }
                        : t
                    ),
                  }
                : s
            ),
            messagesByScope: {
              ...state.messagesByScope,
              [scopeKey]: [
                ...prevList,
                {
                  id: `msg-b14-u-${Date.now()}`,
                  scopeKey,
                  role: 'user',
                  senderLabel: origin === 'quest-vr' ? 'You (Quest)' : 'You',
                  content: answerLabel,
                  createdAt: Date.now(),
                },
                {
                  id: `msg-b14-a-${Date.now() + 1}`,
                  scopeKey,
                  role: 'assistant',
                  senderLabel: 'Infie',
                  content: `Applied to shared environment: comments now sort ${
                    isNewest ? 'newest first' : 'oldest first'
                  } across Web, Android, and iOS previews.`,
                  createdAt: Date.now() + 1,
                },
              ],
            },
          };
          const ev = emit(
            'command-applied',
            origin,
            `Answered B14 (${answerLabel}) -> updated preview sort order`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'toggle-agent-task': {
          state = {
            ...state,
            sessions: state.sessions.map((s) =>
              s.id === command.sessionId
                ? {
                    ...s,
                    agentTasks: s.agentTasks.map((t) =>
                      t.id === command.taskId ? { ...t, done: !t.done } : t
                    ),
                  }
                : s
            ),
          };
          const ev = emit(
            'command-applied',
            origin,
            `Toggled agent task ${command.taskId}`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'toggle-human-test': {
          let nextDone = false;
          state = {
            ...state,
            sessions: state.sessions.map((s) => {
              if (s.id !== command.sessionId) return s;
              const humanTests = s.humanTests.map((t) => {
                if (t.id !== command.testId) return t;
                nextDone = !t.done;
                return { ...t, done: nextDone };
              });
              const allDone = humanTests.length > 0 && humanTests.every((t) => t.done);
              const nextStatus: SessionStatus =
                allDone && s.status === 'NEEDS YOU'
                  ? 'VERIFIED'
                  : !allDone && s.status === 'VERIFIED'
                    ? 'NEEDS YOU'
                    : s.status;
              return { ...s, humanTests, status: nextStatus };
            }),
          };
          const ev = emit(
            'command-applied',
            origin,
            `Human test ${command.testId} -> ${nextDone ? 'done' : 'pending'}`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'advance-session-stage': {
          const target = state.sessions.find((s) => s.id === command.sessionId);
          if (!target) {
            return { ok: false, seq: state.lastEventSeq, summary: 'Session not found' };
          }
          const allHumanDone =
            target.humanTests.length > 0 && target.humanTests.every((t) => t.done);
          const transition = computeNextStageStatus(target.status, command.action, allHumanDone);
          if (!transition) {
            const msg =
              command.action === 'verify-testing' || command.action === 'open-pr'
                ? 'Complete all Human Testing checks before verifying or opening a PR.'
                : `Action "${command.action}" is not available while status is ${target.status}.`;
            return { ok: false, seq: state.lastEventSeq, summary: msg, error: msg };
          }
          const scopeKey = `session:${target.id}`;
          const prevMsgs = state.messagesByScope[scopeKey] ?? [];
          state = {
            ...state,
            sessions: state.sessions.map((s) =>
              s.id === target.id
                ? {
                    ...s,
                    status: transition.nextStatus,
                    ...(command.action === 'reset-demo'
                      ? { humanTests: s.humanTests.map((t) => ({ ...t, done: false })) }
                      : {}),
                  }
                : s
            ),
            appPreview:
              command.action === 'test-app'
                ? {
                    ...state.appPreview,
                    targetBranch: 'session',
                    buildVersion: 'v2',
                    lastUpdatedAt: Date.now(),
                  }
                : command.action === 'merge-pr'
                  ? {
                      ...state.appPreview,
                      targetBranch: 'test',
                      buildVersion: 'v2',
                      lastUpdatedAt: Date.now(),
                    }
                  : state.appPreview,
            messagesByScope: {
              ...state.messagesByScope,
              [scopeKey]: [
                ...prevMsgs,
                {
                  id: `msg-stage-${Date.now()}`,
                  scopeKey,
                  role: 'assistant',
                  senderLabel: 'Infie',
                  content: transition.message,
                  createdAt: Date.now(),
                },
              ],
            },
          };
          const ev = emit('command-applied', origin, transition.message, command.type);
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'toggle-global-todo': {
          state = {
            ...state,
            globalTodos: state.globalTodos.map((item) =>
              item.id === command.todoId ? { ...item, done: !item.done } : item
            ),
          };
          const ev = emit(
            'command-applied',
            origin,
            `Toggled global todo ${command.todoId}`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'add-global-todo': {
          const trimmed = command.text.trim();
          if (!trimmed) {
            return { ok: false, seq: state.lastEventSeq, summary: 'Empty todo ignored' };
          }
          const project = command.projectId
            ? state.projects.find((p) => p.id === command.projectId)
            : undefined;
          const nextTodo: GlobalTodoItem = {
            id: `gt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            text: trimmed,
            done: false,
            category: project ? 'project' : 'general',
            projectId: project?.id,
            projectName: project?.name,
          };
          state = {
            ...state,
            globalTodos: [...state.globalTodos, nextTodo],
          };
          const ev = emit(
            'command-applied',
            origin,
            `Added global todo "${trimmed}"`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'delete-global-todo': {
          state = {
            ...state,
            globalTodos: state.globalTodos.filter((t) => t.id !== command.todoId),
          };
          const ev = emit(
            'command-applied',
            origin,
            `Deleted global todo ${command.todoId}`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'mark-notification-read': {
          state = {
            ...state,
            notifications: state.notifications.map((n) =>
              n.id === command.notificationId ? { ...n, read: true } : n
            ),
          };
          const ev = emit(
            'command-applied',
            origin,
            `Marked alert ${command.notificationId} read`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'post-preview-comment': {
          const clean = command.text.trim();
          if (clean.length < 1 || clean.length > 180) {
            return {
              ok: false,
              seq: state.lastEventSeq,
              summary: 'Comment must be 1..180 trimmed characters.',
              error: 'Comment must be 1..180 trimmed characters.',
            };
          }
          const nextComment = {
            id: `pet-c-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            author: command.author ?? (origin === 'quest-vr' ? 'Quest Tester' : 'i2 Dev'),
            text: clean,
            likes: 0,
            loves: 0,
            userReaction: null,
            createdAt: Date.now(),
          };
          const nextComments =
            state.appPreview.sortOrder === 'newest'
              ? [nextComment, ...state.appPreview.comments]
              : [...state.appPreview.comments, nextComment];
          state = {
            ...state,
            appPreview: {
              ...state.appPreview,
              comments: nextComments,
              lastUpdatedAt: Date.now(),
            },
          };
          const ev = emit(
            'command-applied',
            origin,
            `Posted preview comment (${clean.length} chars) -> shared across previews`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'toggle-preview-reaction': {
          const targetId =
            command.commentId === '__first__'
              ? state.appPreview.comments[0]?.id
              : command.commentId;
          if (!targetId) {
            return { ok: false, seq: state.lastEventSeq, summary: 'No comment to react to' };
          }
          state = {
            ...state,
            appPreview: {
              ...state.appPreview,
              lastUpdatedAt: Date.now(),
              comments: state.appPreview.comments.map((c) => {
                if (c.id !== targetId) return c;
                const prev = c.userReaction;
                let likes = c.likes;
                let loves = c.loves;
                if (prev === 'like') likes = Math.max(0, likes - 1);
                if (prev === 'love') loves = Math.max(0, loves - 1);
                const nextReaction = prev === command.kind ? null : command.kind;
                if (nextReaction === 'like') likes += 1;
                if (nextReaction === 'love') loves += 1;
                return { ...c, likes, loves, userReaction: nextReaction };
              }),
            },
          };
          const ev = emit(
            'command-applied',
            origin,
            `Toggled ${command.kind} reaction on preview comment`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'set-preview-target': {
          const petSession = state.sessions.find((s) => s.id === 'add-comments');
          const buildVersion: 'v1' | 'v2' =
            command.target === 'main' && petSession?.status !== 'COMPLETE' ? 'v1' : 'v2';
          state = {
            ...state,
            appPreview: {
              ...state.appPreview,
              targetBranch: command.target,
              buildVersion,
              lastUpdatedAt: Date.now(),
            },
          };
          const ev = emit(
            'command-applied',
            origin,
            `App preview target -> ${command.target} (${buildVersion})`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'run-whats-next': {
          const pet = state.sessions.find((s) => s.id === 'add-comments');
          const doneTests = pet?.humanTests.filter((t) => t.done).length ?? 0;
          const totalTests = pet?.humanTests.length ?? 4;
          const lines = [
            doneTests < totalTests
              ? `Pet Show and Tell: ${totalTests - doneTests} human verification checks remain on Add Comments.`
              : `Pet Show and Tell: All ${totalTests} human checks complete (${pet?.status ?? 'VERIFIED'}).`,
            'Field Notes: 9 imported sample sessions available for inspection.',
            'Experimemo: Experiment Logger preview awaiting verification.',
          ];
          state = { ...state, whatsNextLines: lines };
          const ev = emit(
            'command-applied',
            origin,
            "Ran What's Next workspace scan",
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'import-field-notes': {
          const prev = state.messagesByScope.home ?? [];
          state = {
            ...state,
            messagesByScope: {
              ...state.messagesByScope,
              home: [
                ...prev,
                {
                  id: `msg-imp-${Date.now()}`,
                  scopeKey: 'home',
                  role: 'assistant',
                  senderLabel: 'Infie',
                  content:
                    'Imported sample project Field Notes (9 sessions). Open it to inspect its status matrix.',
                  createdAt: Date.now(),
                },
              ],
            },
          };
          const ev = emit(
            'command-applied',
            origin,
            'Imported Field Notes sample workspace',
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }

        case 'create-experimemo': {
          const title = command.name?.trim() || 'Experimemo';
          const prev = state.messagesByScope.home ?? [];
          state = {
            ...state,
            messagesByScope: {
              ...state.messagesByScope,
              home: [
                ...prev,
                {
                  id: `msg-jenny-${Date.now()}`,
                  scopeKey: 'home',
                  role: 'assistant',
                  senderLabel: 'Jenny',
                  content: `Jenny prepared blueprint for "${title}" (simulated local entry; real \`create-expo-super-stack\` requires a connected computer or cloud environment).`,
                  createdAt: Date.now(),
                },
              ],
            },
          };
          const ev = emit(
            'command-applied',
            origin,
            `Prepared Jenny blueprint "${title}"`,
            command.type
          );
          return { ok: true, seq: ev.seq, summary: ev.summary };
        }
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async discoverHosts(): Promise<DiscoveredI2Host[]> {
      return [];
    },

    async connectEnvironment(targetId: string): Promise<void> {
      const target = SIMULATED_ENVIRONMENTS.find((e) => e.id === targetId);
      if (!target || target.kind !== 'simulated-local') {
        throw new CapabilityUnavailableError(
          'hostMutationsAuthorized',
          target?.name ?? 'Remote Environment Connection',
          'Connecting to a real local computer or cloud environment is deferred in this prototype. All actions currently update local simulated environment state only.'
        );
      }
      await this.dispatch({ type: 'select-environment', environmentId: targetId }, 'system');
    },

    async disconnect(): Promise<void> {},

    files,
    orchestration,
  };
}
