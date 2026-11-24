import type {
  DeviceClass,
  GlobalTodoItem,
  InfiePreferences,
  NotificationItem,
  UserSession,
} from '../types/companion';
import type { LayoutRouteScope, SpatialLayoutPreset } from '../types/widgets';

export interface AuthPort {
  signIn(
    email: string,
    password: string
  ): Promise<{ ok: true; session: UserSession } | { ok: false; error: string }>;
  signOut(): Promise<void>;
  restoreSession(): Promise<UserSession | null>;
}

export interface TutorialProgressRecord {
  deviceClass: DeviceClass;
  tutorialId: string;
  completed: boolean;
  offerDismissed: boolean;
  completedAt: number | null;
}

export interface TutorialProgressRepo {
  listForDevice(deviceClass: DeviceClass): Promise<TutorialProgressRecord[]>;
  markCompleted(deviceClass: DeviceClass, tutorialId: string): Promise<void>;
  dismissOffer(deviceClass: DeviceClass, tutorialId: string): Promise<void>;
  resetForDevice(deviceClass: DeviceClass): Promise<void>;
}

export interface LayoutRepo {
  listPresets(): Promise<SpatialLayoutPreset[]>;
  savePreset(preset: SpatialLayoutPreset): Promise<void>;
  deletePreset(presetId: string): Promise<void>;
  getActivePresetId(scope: LayoutRouteScope): Promise<string | null>;
  setActivePresetId(scope: LayoutRouteScope, presetId: string): Promise<void>;
}

export interface CompanionDataRepo {
  ensureReady(): Promise<void>;
  getSchemaVersion(): Promise<number>;
  getPreferences(): Promise<InfiePreferences>;
  savePreferences(prefs: InfiePreferences): Promise<void>;
  listGlobalTodos(): Promise<GlobalTodoItem[]>;
  saveGlobalTodos(items: GlobalTodoItem[]): Promise<void>;
  listNotifications(): Promise<NotificationItem[]>;
  saveNotifications(items: NotificationItem[]): Promise<void>;
  getTaskChecklistState(): Promise<Record<string, boolean>>;
  setTaskChecked(taskId: string, done: boolean): Promise<void>;
}
