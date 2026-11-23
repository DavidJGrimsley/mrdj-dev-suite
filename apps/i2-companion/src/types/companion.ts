export type DeviceClass = 'quest' | 'android' | 'ios' | 'web';

export interface UserSession {
  email: string;
  displayName: string;
  level: number;
  authenticatedAt: number;
  simulated: true;
}

export interface PrototypeLimitRequest {
  featureName: string;
  description: string;
  subtitle?: string;
  environmentNote?: string;
  suggestPet?: boolean;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  framework: string;
  wired: boolean;
  isPlaceholder?: boolean;
  isImported?: boolean;
  sessionCount: number;
  updatedLabel: string;
}

export type SessionStatus =
  | 'PLAN REVIEW'
  | 'CODING'
  | 'WAITING ON TEST'
  | 'NEEDS YOU'
  | 'REVIEW FIXES'
  | 'VERIFIED'
  | 'PR OPEN'
  | 'MERGED'
  | 'BLOCKED'
  | 'PAUSED'
  | 'COMPLETE';

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
  provider?: string;
  statusLabel?: string;
}

export interface DiffEntry {
  status: 'M' | 'A' | 'D';
  name: string;
  path: string;
  add?: string;
  del?: string;
  hunk?: string;
}

export interface SessionRecord {
  id: string;
  projectId: string;
  name: string;
  branch: string;
  goal: string;
  status: SessionStatus;
  agents: number;
  wired: boolean;
  agentTasks: TaskChecklistItem[];
  humanTests: TaskChecklistItem[];
  commitDiffs: DiffEntry[];
  branchDiffs: DiffEntry[];
  planMarkdown: string;
}

export interface GlobalTodoItem {
  id: string;
  text: string;
  done: boolean;
  category: 'project' | 'general';
  projectId?: string;
  projectName?: string;
  sessionId?: string;
}

export interface ChatMessage {
  id: string;
  scopeKey: string;
  role: 'user' | 'assistant' | 'system';
  senderLabel?: string;
  content: string;
  createdAt: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  projectId?: string;
  sessionId?: string;
  severity: 'info' | 'attention' | 'success';
  read: boolean;
  createdAt: number;
}

export interface SimulatedAppPreviewComment {
  id: string;
  author: string;
  text: string;
  likes: number;
  loves: number;
  userReaction: 'like' | 'love' | null;
  createdAt: number;
}

export interface SimulatedAppPreviewState {
  projectId: string;
  targetBranch: 'main' | 'test' | 'session';
  buildVersion: 'v1' | 'v2';
  sortOrder: 'newest' | 'oldest';
  comments: SimulatedAppPreviewComment[];
  lastUpdatedAt: number;
}

export interface InfiePreferences {
  guidanceStopIndex: number;
  sassinessStopIndex: number;
  verbosityStopIndex: number;
  technicalLevelStopIndex: number;
  textSpeedStopIndex: number;
  effortStopIndex: number;
  reducedMotion: boolean;
}

export const DEFAULT_INFIE_PREFERENCES: InfiePreferences = {
  guidanceStopIndex: 3,
  sassinessStopIndex: 4,
  verbosityStopIndex: 0,
  technicalLevelStopIndex: 3,
  textSpeedStopIndex: 1,
  effortStopIndex: 2,
  reducedMotion: false,
};
