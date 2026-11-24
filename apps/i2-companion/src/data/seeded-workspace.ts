import type {
  GlobalTodoItem,
  NotificationItem,
  ProjectRecord,
  PrototypeLimitRequest,
  SessionRecord,
  SimulatedAppPreviewComment,
  SimulatedAppPreviewState,
} from '../types/companion';
import type { InfieAssetSpec, InfieFormState } from '../types/infie';
import type { EnvironmentDescriptor } from '../types/providers';

export const DEMO_AUTH_EMAIL = 'dev@i2.app';
export const DEMO_AUTH_PASSWORD = 'password';
export const DEMO_AUTH_ERROR = 'Invalid email or password.';
export const NO_ACCOUNT_CREATE_NOTICE =
  'Account creation must be done from the prototype first. Please complete initial tutorial for username and password.';

export const B14_AGENT_QUESTION = 'Should new comments show newest first or oldest first?';
export const B14_AGENT_REPLY_DEFAULT = 'Newest first.';

export const SIMULATED_SHARED_NOTE =
  'Simulated shared environment inside this app only — no real networking, no desktop host connection, and no cross-device sync.';

export const SIMULATED_ENVIRONMENTS: readonly EnvironmentDescriptor[] = [
  {
    id: 'sim-env-pet',
    name: 'Pet Show & Tell Workspace (Simulated)',
    kind: 'simulated-local',
    locationLabel: 'In-App Simulated State · No Network',
    defaultProjectId: 'pet',
    defaultSessionId: 'add-comments',
    available: true,
    description:
      'Local simulated i² environment for Pet Show and Tell (add-comments) shared across all Companion widgets and views.',
  },
  {
    id: 'sim-env-experimemo',
    name: 'Experimemo Lab Workspace (Simulated)',
    kind: 'simulated-local',
    locationLabel: 'In-App Simulated State · No Network',
    defaultProjectId: 'experimemo',
    defaultSessionId: 'experimemo-session',
    available: true,
    description:
      'Local simulated i² environment for Experimemo (Initial Experiment Logger) shared across all Companion widgets and views.',
  },
  {
    id: 'future-local-host',
    name: 'Desktop Computer Environment (Future)',
    kind: 'local-host',
    locationLabel: 'Future Local Host Provider · Not Connected',
    defaultProjectId: 'pet',
    defaultSessionId: 'add-comments',
    available: false,
    description:
      'Placeholder boundary for a future computer-hosted i² environment so headset and desktop actions update the same live state.',
  },
  {
    id: 'future-cloud-host',
    name: 'Cloud Environment (Future)',
    kind: 'cloud-host',
    locationLabel: 'Future Cloud Provider · Not Connected',
    defaultProjectId: 'pet',
    defaultSessionId: 'add-comments',
    available: false,
    description:
      'Placeholder boundary for a future cloud-hosted i² environment syncing across Quest, mobile, web, and desktop.',
  },
];

export const SEEDED_PREVIEW_COMMENTS: readonly SimulatedAppPreviewComment[] = [
  {
    id: 'pet-c2',
    author: 'Luna',
    text: 'Best corgi ears today.',
    likes: 5,
    loves: 4,
    userReaction: null,
    createdAt: 1700000002000,
  },
  {
    id: 'pet-c1',
    author: 'Mochi',
    text: 'Biscuit looks ready for the walk!',
    likes: 3,
    loves: 2,
    userReaction: null,
    createdAt: 1700000001000,
  },
];

export function createInitialAppPreviewState(): SimulatedAppPreviewState {
  return {
    projectId: 'pet',
    targetBranch: 'session',
    buildVersion: 'v2',
    sortOrder: 'newest',
    comments: SEEDED_PREVIEW_COMMENTS.map((c) => ({ ...c })),
    lastUpdatedAt: 1700000002000,
  };
}

export const TUTORIAL_CHAT_LIMIT: PrototypeLimitRequest = {
  featureName: 'Chat with Infie',
  subtitle: 'Onboarding tutorial',
  description:
    "Infie's side of this tutorial is scripted, so free-form messages aren't answered here. Use Continue (or the highlighted control) to keep going. In the full app you can ask Infie anything at any time.",
  environmentNote: 'Simulated companion · scripted tutorial beat',
};

export function notHotdogLimit(what: string): PrototypeLimitRequest {
  return {
    featureName: what,
    subtitle: 'Not Hotdog · placeholder project',
    description:
      'Not Hotdog is here to show a second project in the list; its files and workspace are not wired into this companion demo. Open Pet Show and Tell for interactive project files, diffs, and web preview.',
    environmentNote: 'Simulated companion · project sources not included',
    suggestPet: true,
  };
}

export function importedProjectLimit(projectName: string, what: string): PrototypeLimitRequest {
  return {
    featureName: what,
    subtitle: `${projectName} · imported placeholder`,
    description: `${projectName} demonstrates an imported project with multiple sessions. Its files, sessions, and simulators are not wired into this companion demo. Check Pet Show and Tell for interactive workspace data.`,
    environmentNote: 'Simulated companion · imported sample boundary',
    suggestPet: true,
  };
}

export function capabilityLimitFor(
  featureName: string,
  subtitle: string,
  description: string
): PrototypeLimitRequest {
  return {
    featureName,
    subtitle,
    description,
    environmentNote:
      'Simulated companion · connect an authorized i2 Core host to unlock live execution',
    suggestPet: false,
  };
}

export const INFIE_ASSET_SPECS: Record<InfieFormState, InfieAssetSpec> = {
  mist: {
    id: 'mist',
    label: 'Mist',
    assetRelativePath: 'assets/infie/infie-mist.glb',
    bytes: 1341364,
    meshes: 11,
    expectedClips: ['Idle'],
    idleClipName: 'Idle',
    idleDurationSeconds: 6,
    requiresMistIntermediary: false,
    notes: 'Base Mist character with 16 nodes and runtime mistSurface/trail/haze/96-mote VFX.',
  },
  glyph: {
    id: 'glyph',
    label: 'Glyph',
    assetRelativePath: 'assets/infie/infie_glyph_realtime.glb',
    bytes: 2124240,
    meshes: 18,
    expectedClips: ['INFIE_Idle'],
    idleClipName: 'INFIE_Idle',
    idleDurationSeconds: 6,
    requiresMistIntermediary: true,
    notes: '89 RT_Glyph mark nodes; swaps cleanly via Mist intermediary.',
  },
  surge: {
    id: 'surge',
    label: 'Surge',
    assetRelativePath: 'assets/infie/infie_surge_realtime.glb',
    bytes: 6600228,
    meshes: 50,
    expectedClips: ['INFIE_Idle'],
    idleClipName: 'INFIE_Idle',
    idleDurationSeconds: 6,
    requiresMistIntermediary: true,
    notes: '50 meshes (aura shells, arcs, filaments, sparks); swaps cleanly via Mist intermediary.',
  },
  compile: {
    id: 'compile',
    label: 'Compile',
    assetRelativePath: 'assets/infie/infie_compile_realtime.glb',
    bytes: 1880284,
    meshes: 12,
    expectedClips: ['INFIE_Idle'],
    idleClipName: 'INFIE_Idle',
    idleDurationSeconds: 6,
    requiresMistIntermediary: true,
    notes: '64 Compile_Cube nodes + ribbon dim; swaps cleanly via Mist intermediary.',
  },
  controller: {
    id: 'controller',
    label: 'Controller',
    assetRelativePath: 'assets/infie/infie-controller.glb',
    bytes: 1863032,
    meshes: 37,
    expectedClips: ['INFIE_Idle', 'INFIE_ToController', 'CONTROLLER_Idle', 'INFIE_FromController'],
    idleClipName: 'INFIE_Idle',
    idleDurationSeconds: 6,
    requiresMistIntermediary: false,
    notes: '9-second 4-clip NLA controller transformation with infie-controller-timing.json cues.',
  },
};

export const SEEDED_PROJECTS: readonly ProjectRecord[] = [
  {
    id: 'pet',
    name: 'Pet Show and Tell',
    description: 'Share pet photos, reactions, and local-only post comments (Expo SDK 57)',
    framework: 'Expo',
    wired: true,
    sessionCount: 1,
    updatedLabel: 'Active',
  },
  {
    id: 'nothotdog',
    name: 'Not Hotdog',
    description: 'Camera classifier sample project (placeholder entry)',
    framework: 'Expo',
    wired: false,
    isPlaceholder: true,
    sessionCount: 0,
    updatedLabel: '2d ago',
  },
  {
    id: 'field-notes',
    name: 'Field Notes',
    description: 'Private notes that stay on this machine (imported sample)',
    framework: 'Expo',
    wired: true,
    isImported: true,
    sessionCount: 9,
    updatedLabel: 'Imported',
  },
  {
    id: 'experimemo',
    name: 'Experimemo',
    description: 'Experiment logger & multi-agent tutorial project',
    framework: 'Expo',
    wired: true,
    sessionCount: 1,
    updatedLabel: 'Tutorial',
  },
];

export const PET_PLAN_MD = `# Pet Show and Tell — Comments Implementation Plan

## Objective
Add local-only post comments and per-comment Like/Love reactions to Pet Show and Tell, preserving local-only SQLite persistence and static web preview parity.

## Pending Question
${B14_AGENT_QUESTION}
Default answer: ${B14_AGENT_REPLY_DEFAULT}

## Architecture
- Shared validation (1..180 trimmed chars) in src/types/pet.ts
- SQLite tables: comments + comment_reactions with CASCADE delete
- Post detail UI with newest-first sorting and Like/Love reaction toggles
`;

export const SEEDED_SESSIONS: readonly SessionRecord[] = [
  {
    id: 'add-comments',
    projectId: 'pet',
    name: 'Add Comments',
    branch: 'add-comments',
    goal: 'Add comments with Like/Love on comments',
    status: 'NEEDS YOU',
    agents: 2,
    wired: true,
    planMarkdown: PET_PLAN_MD,
    agentTasks: [
      {
        id: 'pet-task-1',
        text: 'Add local post comments and per-comment Like/Love reactions',
        done: true,
        provider: 'infie',
        statusLabel: 'completed',
      },
      {
        id: 'pet-task-2',
        text: B14_AGENT_QUESTION,
        done: true,
        provider: 'claude',
        statusLabel: `answered: ${B14_AGENT_REPLY_DEFAULT}`,
      },
    ],
    humanTests: [
      { id: 'pet-chk-post', text: 'Post a comment on a pet post', done: false },
      { id: 'pet-chk-toggle', text: 'Toggle Like/Love reaction off on a comment', done: false },
      {
        id: 'pet-chk-persist',
        text: 'Verify comment and reaction persist after reopening the post',
        done: false,
      },
      {
        id: 'pet-chk-validation',
        text: 'Verify blank and 181-character comments are rejected',
        done: false,
      },
    ],
    commitDiffs: [
      {
        status: 'M',
        name: 'post-detail-screen.tsx',
        path: 'src/features/pets/post-detail-screen.tsx',
        add: '+347',
        del: '-4',
      },
      {
        status: 'M',
        name: 'pet-store.ts',
        path: 'src/features/pets/pet-store.ts',
        add: '+51',
        del: '-1',
      },
      {
        status: 'M',
        name: 'pet-database.ts',
        path: 'src/storage/pet-database.ts',
        add: '+89',
        del: '-8',
      },
      { status: 'M', name: 'pet.ts', path: 'src/types/pet.ts', add: '+27', del: '-0' },
    ],
    branchDiffs: [
      {
        status: 'M',
        name: 'post-detail-screen.tsx',
        path: 'src/features/pets/post-detail-screen.tsx',
        add: '+347',
        del: '-4',
      },
      {
        status: 'M',
        name: 'pet-store.ts',
        path: 'src/features/pets/pet-store.ts',
        add: '+51',
        del: '-1',
      },
      {
        status: 'M',
        name: 'pet-database.web.ts',
        path: 'src/storage/pet-database.web.ts',
        add: '+147',
        del: '-18',
      },
      {
        status: 'M',
        name: 'pet-database.ts',
        path: 'src/storage/pet-database.ts',
        add: '+89',
        del: '-8',
      },
      { status: 'M', name: 'pet.ts', path: 'src/types/pet.ts', add: '+27', del: '-0' },
      { status: 'M', name: 'todo.md', path: 'project/todo.md', add: '+2', del: '-2' },
    ],
  },
  {
    id: 'experimemo-session',
    projectId: 'experimemo',
    name: 'Initial Experiment Logger',
    branch: 'feat/experiment-logger',
    goal: 'Scaffold experiment entry list, camera notes & verification flow',
    status: 'WAITING ON TEST',
    agents: 3,
    wired: true,
    planMarkdown:
      '# Plan: Initial Experiment Logger\n\n- SQLite experiments table\n- Quick capture form\n- Camera fix verified in preview',
    agentTasks: [
      {
        id: 'exp-a1',
        text: 'Create experiment schema & SQLite adapter',
        done: true,
        provider: 'gemini',
        statusLabel: 'completed',
      },
      {
        id: 'exp-a2',
        text: 'Fix camera preview aspect ratio on mobile',
        done: true,
        provider: 'claude',
        statusLabel: 'completed',
      },
    ],
    humanTests: [
      { id: 'exp-h1', text: 'Create an experiment note and confirm it persists', done: false },
      { id: 'exp-h2', text: 'Inspect preview viewport across mobile and desktop', done: false },
    ],
    commitDiffs: [
      {
        status: 'A',
        name: 'experiments-store.ts',
        path: 'src/features/experiments/experiments-store.ts',
        add: '+112',
        del: '-0',
      },
      {
        status: 'M',
        name: 'camera-card.tsx',
        path: 'src/features/experiments/camera-card.tsx',
        add: '+24',
        del: '-9',
      },
    ],
    branchDiffs: [
      {
        status: 'A',
        name: 'experiments-store.ts',
        path: 'src/features/experiments/experiments-store.ts',
        add: '+112',
        del: '-0',
      },
      {
        status: 'M',
        name: 'camera-card.tsx',
        path: 'src/features/experiments/camera-card.tsx',
        add: '+24',
        del: '-9',
      },
    ],
  },
];

export const SEEDED_GLOBAL_TODOS: readonly GlobalTodoItem[] = [
  {
    id: 'gt-1',
    text: 'Add comments with Like/Love on comments',
    done: false,
    category: 'project',
    projectId: 'pet',
    projectName: 'Pet Show and Tell',
    sessionId: 'add-comments',
  },
  {
    id: 'gt-2',
    text: 'Review Experimemo human testing checklist',
    done: false,
    category: 'project',
    projectId: 'experimemo',
    projectName: 'Experimemo',
    sessionId: 'experimemo-session',
  },
  {
    id: 'gt-3',
    text: 'Confirm Meta Quest App ID before production store packaging',
    done: false,
    category: 'general',
  },
];

export const SEEDED_NOTIFICATIONS: readonly NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Pet Show and Tell · Add Comments',
    body: `Agent answered: "${B14_AGENT_QUESTION}" -> ${B14_AGENT_REPLY_DEFAULT} Ready for human verification.`,
    projectId: 'pet',
    sessionId: 'add-comments',
    severity: 'attention',
    read: false,
    createdAt: Date.now() - 120_000,
  },
  {
    id: 'notif-2',
    title: 'Experimemo · Preview Ready',
    body: 'Initial Experiment Logger is waiting on human test verification.',
    projectId: 'experimemo',
    sessionId: 'experimemo-session',
    severity: 'info',
    read: false,
    createdAt: Date.now() - 360_000,
  },
];

export const SEEDED_FILES: Record<string, Record<string, string>> = {
  pet: {
    'project/info.md':
      '# Pet Show and Tell\n\nLocal-only Expo app for sharing pet photos, reactions, and post comments.',
    'project/todo.md':
      '# Todo\n\n- [ ] Verify comment validation (1..180 chars)\n- [x] Add comments & Like/Love SQLite schema',
    'project/style.md':
      '# Style\n\nWarm cream cards (#f7f5ef) with forest green accents (#234e38).',
    'project/guidelines.md':
      '# Guidelines\n\nKeep all pet data local in SQLite; no remote network calls.',
    'src/types/pet.ts':
      'export const MAX_COMMENT_LENGTH = 180;\nexport type ReactionKind = "like" | "love";\nexport interface PetComment { id: string; postId: string; body: string; createdAt: string; }',
    'src/features/pets/pet-store.ts':
      'export function addComment(postId: string, body: string) {\n  const trimmed = body.trim();\n  if (!trimmed || trimmed.length > 180) throw new Error("Invalid comment");\n  return { postId, body: trimmed };\n}',
    'src/storage/pet-database.ts':
      'export const COMMENTS_SQL = "CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, postId TEXT NOT NULL, body TEXT NOT NULL, createdAt TEXT NOT NULL);";',
    'Plan.md': PET_PLAN_MD,
  },
  experimemo: {
    'project/info.md': '# Experimemo\n\nOffline-first lab and hobby experiment logger.',
    'project/todo.md': '# Todo\n\n- [ ] Verify mobile & desktop preview aspect ratios',
    'project/style.md': '# Style\n\nHigh-contrast slate and teal dark interface.',
    'project/guidelines.md': '# Guidelines\n\nKeep experiment notes stored locally.',
    'Plan.md':
      '# Plan: Initial Experiment Logger\n\n- SQLite experiments table\n- Camera notes capture',
  },
};

export const LEEK_BEATS_TRACKS = [
  {
    id: 'track-1',
    title: 'Midnight Compile (i² Curated)',
    artist: 'Infie Synth',
    durationSec: 184,
  },
  { id: 'track-2', title: 'Orbital Mist Loop', artist: 'Subspace Audio', durationSec: 210 },
  { id: 'track-3', title: 'Batcave Telemetry', artist: 'i² Studio', durationSec: 165 },
] as const;
