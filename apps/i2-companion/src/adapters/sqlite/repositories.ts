import type {
  DeviceClass,
  GlobalTodoItem,
  InfiePreferences,
  NotificationItem,
  UserSession,
} from '../../types/companion';
import { DEFAULT_INFIE_PREFERENCES } from '../../types/companion.ts';
import type {
  CanonicalWidgetId,
  LayoutRouteScope,
  SpatialLayoutPreset,
  SpatialWidgetPlacement,
  SpatialWindow,
} from '../../types/widgets.ts';
import {
  BUILTIN_LAYOUT_PRESETS,
  derivePlacementsFromWindows,
  migratePlacementsToWindows,
  resolveCanonicalWidgetId,
} from '../../data/widget-catalog.ts';
import {
  DEMO_AUTH_EMAIL,
  DEMO_AUTH_ERROR,
  DEMO_AUTH_PASSWORD,
  SEEDED_GLOBAL_TODOS,
  SEEDED_NOTIFICATIONS,
} from '../../data/seeded-workspace.ts';
import type {
  AuthPort,
  CompanionDataRepo,
  LayoutRepo,
  TutorialProgressRecord,
  TutorialProgressRepo,
} from '../../ports/storage.ts';
import {
  clampPlacementToComfort,
  clampWindowToComfort,
} from '../../features/spatial/cockpit-math.ts';
import { COMPANION_DB_SCHEMA_VERSION, migrateCompanionDb, type SqliteExecutor } from './schema.ts';

export interface StorageEnvironmentDiagnostic {
  backend: 'sqlite-native' | 'sqlite-wasm' | 'memory-fallback';
  crossOriginIsolated: boolean | null;
  reason?: string;
}

function normalizePreset(raw: SpatialLayoutPreset): SpatialLayoutPreset {
  const infie3d = raw.widgets.find((w) => w.widgetId === 'infie3d');
  const windows = (
    raw.windows && raw.windows.length > 0
      ? raw.windows
      : migratePlacementsToWindows(raw.presetId, raw.widgets)
  ).map((w) => clampWindowToComfort(w));
  const widgets = derivePlacementsFromWindows(
    windows,
    infie3d ? clampPlacementToComfort(infie3d) : null
  );
  return {
    ...raw,
    schemaVersion: Math.max(2, raw.schemaVersion || 2),
    windows,
    widgets,
  };
}

export class SqliteCompanionRepositories
  implements AuthPort, LayoutRepo, TutorialProgressRepo, CompanionDataRepo
{
  private readyPromise: Promise<void> | null = null;
  private schemaVersion = 0;
  private readonly openDb: () => Promise<SqliteExecutor | null>;
  private readonly memoryFallback: MemoryCompanionRepositories;
  public readonly diagnostic: StorageEnvironmentDiagnostic;

  constructor(
    openDb: () => Promise<SqliteExecutor | null>,
    memoryFallback: MemoryCompanionRepositories,
    diagnostic: StorageEnvironmentDiagnostic
  ) {
    this.openDb = openDb;
    this.memoryFallback = memoryFallback;
    this.diagnostic = diagnostic;
  }

  private async db(): Promise<SqliteExecutor | null> {
    await this.ensureReady();
    return this.openDb();
  }

  async ensureReady(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = (async () => {
        const db = await this.openDb();
        if (!db) {
          await this.memoryFallback.ensureReady();
          return;
        }
        this.schemaVersion = await migrateCompanionDb(db);
        await this.seedBuiltins(db);
      })();
    }
    return this.readyPromise;
  }

  async getSchemaVersion(): Promise<number> {
    await this.ensureReady();
    return this.schemaVersion;
  }

  private async seedBuiltins(db: SqliteExecutor): Promise<void> {
    for (const preset of BUILTIN_LAYOUT_PRESETS) {
      const existing = await db.getFirstAsync<{
        preset_id: string;
        builtin_revision: number;
        is_builtin: number;
      }>(
        'SELECT preset_id, builtin_revision, is_builtin FROM spatial_presets WHERE preset_id = ?',
        preset.presetId
      );
      if (
        !existing ||
        (existing.is_builtin === 1 && existing.builtin_revision < preset.builtinRevision)
      ) {
        await this.writePresetToDb(db, { ...preset, updatedAt: Date.now() });
      }
    }
    const existingBinding = await db.getFirstAsync<{ route_scope: string }>(
      'SELECT route_scope FROM active_layout_bindings WHERE route_scope = ?',
      'home'
    );
    if (!existingBinding) {
      await db.runAsync(
        'INSERT OR REPLACE INTO active_layout_bindings (route_scope, preset_id, updated_at) VALUES (?, ?, ?)',
        'home',
        'minimal-infie-emu',
        Date.now()
      );
    }
  }

  private async writePresetToDb(db: SqliteExecutor, rawPreset: SpatialLayoutPreset): Promise<void> {
    const preset = normalizePreset(rawPreset);
    await db.runAsync(
      `INSERT OR REPLACE INTO spatial_presets
       (preset_id, name, description, is_builtin, builtin_revision, arrange_mode, posture, schema_version, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      preset.presetId,
      preset.name,
      preset.description,
      preset.isBuiltin ? 1 : 0,
      preset.builtinRevision,
      preset.arrangeMode,
      preset.posture,
      preset.schemaVersion,
      preset.updatedAt
    );

    await db.runAsync('DELETE FROM spatial_windows WHERE preset_id = ?', preset.presetId);
    for (const win of preset.windows) {
      const clamped = clampWindowToComfort(win);
      await db.runAsync(
        `INSERT OR REPLACE INTO spatial_windows
         (preset_id, window_id, title, zone, sort_order, visible, mode, pinned,
          yaw_deg, pitch_deg, radius_m, width_m, height_m, dock_zone, dock_weight,
          layout_mode, active_widget_id, widget_ids_json, scroll_offsets_json, group_layout_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        preset.presetId,
        clamped.windowId,
        clamped.title,
        clamped.zone,
        clamped.sortOrder,
        clamped.visible ? 1 : 0,
        clamped.mode,
        clamped.pinned ? 1 : 0,
        clamped.yawDeg,
        clamped.pitchDeg,
        clamped.radiusM,
        clamped.widthM,
        clamped.heightM,
        clamped.dockZone,
        clamped.dockWeight,
        clamped.layoutMode,
        clamped.activeWidgetId ?? null,
        JSON.stringify(clamped.widgetIds),
        JSON.stringify(clamped.scrollOffsets),
        clamped.groupLayout ? JSON.stringify(clamped.groupLayout) : null
      );
    }

    // Preserve any forward-compatible unknown widget_id rows while syncing known placements.
    const existingRows = await db.getAllAsync<{ instance_id: string; widget_id: string }>(
      'SELECT instance_id, widget_id FROM spatial_widget_placements WHERE preset_id = ?',
      preset.presetId
    );
    const keepIds = new Set(preset.widgets.map((w) => w.instanceId));
    for (const row of existingRows) {
      if (!keepIds.has(row.instance_id) && resolveCanonicalWidgetId(row.widget_id) !== null) {
        await db.runAsync(
          'DELETE FROM spatial_widget_placements WHERE preset_id = ? AND instance_id = ?',
          preset.presetId,
          row.instance_id
        );
      }
    }

    for (const widget of preset.widgets) {
      const clamped = clampPlacementToComfort(widget);
      await db.runAsync(
        `INSERT OR REPLACE INTO spatial_widget_placements
         (preset_id, instance_id, widget_id, zone, sort_order, visible, mode, pinned,
          yaw_deg, pitch_deg, radius_m, width_m, height_m, dock_zone, dock_weight, scroll_offset)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        preset.presetId,
        clamped.instanceId,
        clamped.widgetId,
        clamped.zone,
        clamped.sortOrder,
        clamped.visible ? 1 : 0,
        clamped.mode,
        clamped.pinned ? 1 : 0,
        clamped.yawDeg,
        clamped.pitchDeg,
        clamped.radiusM,
        clamped.widthM,
        clamped.heightM,
        clamped.dockZone,
        clamped.dockWeight,
        clamped.scrollOffset
      );
    }
  }

  async signIn(
    email: string,
    password: string
  ): Promise<{ ok: true; session: UserSession } | { ok: false; error: string }> {
    if (email.trim().toLowerCase() !== DEMO_AUTH_EMAIL || password !== DEMO_AUTH_PASSWORD) {
      return { ok: false, error: DEMO_AUTH_ERROR };
    }
    const session: UserSession = {
      email: DEMO_AUTH_EMAIL,
      displayName: 'i2 Developer',
      level: 1,
      authenticatedAt: Date.now(),
      simulated: true,
    };
    const db = await this.db();
    if (!db) return this.memoryFallback.signIn(email, password);
    await db.runAsync(
      'INSERT OR REPLACE INTO auth_session (id, email, display_name, level, authenticated_at) VALUES (1, ?, ?, ?, ?)',
      session.email,
      session.displayName,
      session.level,
      session.authenticatedAt
    );
    return { ok: true, session };
  }

  async signOut(): Promise<void> {
    const db = await this.db();
    if (!db) return this.memoryFallback.signOut();
    await db.runAsync('DELETE FROM auth_session WHERE id = 1');
  }

  async restoreSession(): Promise<UserSession | null> {
    const db = await this.db();
    if (!db) return this.memoryFallback.restoreSession();
    const row = await db.getFirstAsync<{
      email: string;
      display_name: string;
      level: number;
      authenticated_at: number;
    }>('SELECT email, display_name, level, authenticated_at FROM auth_session WHERE id = 1');
    if (!row) return null;
    return {
      email: row.email,
      displayName: row.display_name,
      level: row.level,
      authenticatedAt: row.authenticated_at,
      simulated: true,
    };
  }

  async listPresets(): Promise<SpatialLayoutPreset[]> {
    const db = await this.db();
    if (!db) return this.memoryFallback.listPresets();
    const rows = await db.getAllAsync<{
      preset_id: string;
      name: string;
      description: string;
      is_builtin: number;
      builtin_revision: number;
      arrange_mode: string;
      posture: string;
      schema_version: number;
      updated_at: number;
    }>('SELECT * FROM spatial_presets ORDER BY is_builtin DESC, updated_at DESC');

    const presets: SpatialLayoutPreset[] = [];
    for (const row of rows) {
      const widgetRows = await db.getAllAsync<{
        instance_id: string;
        widget_id: string;
        zone: string;
        sort_order: number;
        visible: number;
        mode: string;
        pinned: number;
        yaw_deg: number;
        pitch_deg: number;
        radius_m: number;
        width_m: number;
        height_m: number;
        dock_zone: string;
        dock_weight: number;
        scroll_offset: number;
      }>(
        'SELECT * FROM spatial_widget_placements WHERE preset_id = ? ORDER BY sort_order ASC',
        row.preset_id
      );
      const legacyPlacements: SpatialWidgetPlacement[] = [];
      for (const w of widgetRows) {
        const canonical = resolveCanonicalWidgetId(w.widget_id);
        if (!canonical) continue;
        legacyPlacements.push(
          clampPlacementToComfort({
            instanceId: w.instance_id,
            widgetId: canonical,
            zone: w.zone as SpatialWidgetPlacement['zone'],
            sortOrder: w.sort_order,
            visible: w.visible === 1,
            mode: (w.mode as SpatialWidgetPlacement['mode']) ?? 'normal',
            pinned: w.pinned === 1,
            yawDeg: w.yaw_deg,
            pitchDeg: w.pitch_deg,
            radiusM: w.radius_m,
            widthM: w.width_m,
            heightM: w.height_m,
            dockZone: (w.dock_zone as SpatialWidgetPlacement['dockZone']) ?? 'left',
            dockWeight: w.dock_weight,
            scrollOffset: w.scroll_offset,
          })
        );
      }

      const windowRows = await db.getAllAsync<{
        window_id: string;
        title: string;
        zone: string;
        sort_order: number;
        visible: number;
        mode: string;
        pinned: number;
        yaw_deg: number;
        pitch_deg: number;
        radius_m: number;
        width_m: number;
        height_m: number;
        dock_zone: string;
        dock_weight: number;
        layout_mode: string;
        active_widget_id: string | null;
        widget_ids_json: string;
        scroll_offsets_json: string;
        group_layout_json?: string | null;
      }>(
        'SELECT * FROM spatial_windows WHERE preset_id = ? ORDER BY sort_order ASC',
        row.preset_id
      );

      let windows: SpatialWindow[];
      if (windowRows.length > 0) {
        windows = windowRows
          .map((wr) => {
            let parsedIds: string[] = [];
            let parsedScrolls: Record<string, number> = {};
            try {
              const arr = JSON.parse(wr.widget_ids_json);
              if (Array.isArray(arr)) parsedIds = arr.map(String);
            } catch {
              parsedIds = [];
            }
            try {
              const obj = JSON.parse(wr.scroll_offsets_json);
              if (obj && typeof obj === 'object') parsedScrolls = obj as Record<string, number>;
            } catch {
              parsedScrolls = {};
            }
            const widgetIds = parsedIds
              .map((id) => resolveCanonicalWidgetId(id))
              .filter((id): id is CanonicalWidgetId => id !== null && id !== 'infie3d');
            if (widgetIds.length === 0) return null;
            const activeCanonical = wr.active_widget_id
              ? resolveCanonicalWidgetId(wr.active_widget_id)
              : null;
            let parsedGroupLayout: SpatialWindow['groupLayout'];
            if (wr.group_layout_json) {
              try {
                const gl = JSON.parse(wr.group_layout_json) as Partial<{
                  columns: number;
                  colWeights: number[];
                  rowWeights: number[];
                }>;
                if (gl && (gl.columns === 1 || gl.columns === 2)) {
                  parsedGroupLayout = {
                    columns: gl.columns,
                    colWeights: Array.isArray(gl.colWeights)
                      ? gl.colWeights.map(Number)
                      : undefined,
                    rowWeights: Array.isArray(gl.rowWeights)
                      ? gl.rowWeights.map(Number)
                      : undefined,
                  };
                }
              } catch {
                parsedGroupLayout = undefined;
              }
            }
            return clampWindowToComfort({
              windowId: wr.window_id,
              title: wr.title,
              zone: wr.zone as SpatialWindow['zone'],
              sortOrder: wr.sort_order,
              visible: wr.visible === 1,
              mode: (wr.mode as SpatialWindow['mode']) ?? 'normal',
              pinned: wr.pinned === 1,
              yawDeg: wr.yaw_deg,
              pitchDeg: wr.pitch_deg,
              radiusM: wr.radius_m,
              widthM: wr.width_m,
              heightM: wr.height_m,
              dockZone: (wr.dock_zone as SpatialWindow['dockZone']) ?? 'center',
              dockWeight: wr.dock_weight,
              layoutMode:
                wr.layout_mode === 'grid' ? 'grid' : wr.layout_mode === 'tabs' ? 'tabs' : 'stack',
              groupLayout: parsedGroupLayout,
              widgetIds,
              activeWidgetId:
                activeCanonical && widgetIds.includes(activeCanonical)
                  ? activeCanonical
                  : widgetIds[0],
              scrollOffsets: parsedScrolls,
            });
          })
          .filter((w): w is SpatialWindow => w !== null);
      } else {
        // Auto-migrate legacy v1/v2 presets into SpatialWindow records
        windows = migratePlacementsToWindows(row.preset_id, legacyPlacements);
      }

      const infie3d = legacyPlacements.find((w) => w.widgetId === 'infie3d') ?? null;
      const preset = normalizePreset({
        presetId: row.preset_id,
        name: row.name,
        description: row.description,
        isBuiltin: row.is_builtin === 1,
        builtinRevision: row.builtin_revision,
        arrangeMode: row.arrange_mode === 'free' ? 'free' : 'arc',
        posture: row.posture === 'seated' ? 'seated' : 'standing',
        schemaVersion: Math.max(2, row.schema_version),
        windows,
        widgets: derivePlacementsFromWindows(windows, infie3d),
        updatedAt: row.updated_at,
      });

      if (windowRows.length === 0 && windows.length > 0) {
        await this.writePresetToDb(db, preset);
      }

      presets.push(preset);
    }
    return presets;
  }

  async savePreset(preset: SpatialLayoutPreset): Promise<void> {
    const db = await this.db();
    if (!db) return this.memoryFallback.savePreset(preset);
    await this.writePresetToDb(db, { ...preset, updatedAt: Date.now() });
  }

  async deletePreset(presetId: string): Promise<void> {
    const db = await this.db();
    if (!db) return this.memoryFallback.deletePreset(presetId);
    await db.runAsync(
      'DELETE FROM spatial_presets WHERE preset_id = ? AND is_builtin = 0',
      presetId
    );
  }

  async getActivePresetId(scope: LayoutRouteScope): Promise<string | null> {
    const db = await this.db();
    if (!db) return this.memoryFallback.getActivePresetId(scope);
    const row = await db.getFirstAsync<{ preset_id: string }>(
      'SELECT preset_id FROM active_layout_bindings WHERE route_scope = ?',
      scope
    );
    return row?.preset_id ?? null;
  }

  async setActivePresetId(scope: LayoutRouteScope, presetId: string): Promise<void> {
    const db = await this.db();
    if (!db) return this.memoryFallback.setActivePresetId(scope, presetId);
    await db.runAsync(
      'INSERT OR REPLACE INTO active_layout_bindings (route_scope, preset_id, updated_at) VALUES (?, ?, ?)',
      scope,
      presetId,
      Date.now()
    );
  }

  async listForDevice(deviceClass: DeviceClass): Promise<TutorialProgressRecord[]> {
    const db = await this.db();
    if (!db) return this.memoryFallback.listForDevice(deviceClass);
    const rows = await db.getAllAsync<{
      device_class: string;
      tutorial_id: string;
      completed: number;
      offer_dismissed: number;
      completed_at: number | null;
    }>('SELECT * FROM tutorial_progress WHERE device_class = ?', deviceClass);
    return rows.map((r) => ({
      deviceClass: r.device_class as DeviceClass,
      tutorialId: r.tutorial_id,
      completed: r.completed === 1,
      offerDismissed: r.offer_dismissed === 1,
      completedAt: r.completed_at,
    }));
  }

  async markCompleted(deviceClass: DeviceClass, tutorialId: string): Promise<void> {
    const db = await this.db();
    if (!db) return this.memoryFallback.markCompleted(deviceClass, tutorialId);
    const existing = await db.getFirstAsync<{ completed: number }>(
      'SELECT completed FROM tutorial_progress WHERE device_class = ? AND tutorial_id = ?',
      deviceClass,
      tutorialId
    );
    const firstTime = existing?.completed !== 1;
    await db.runAsync(
      `INSERT INTO tutorial_progress (device_class, tutorial_id, completed, offer_dismissed, completed_at)
       VALUES (?, ?, 1, 1, ?)
       ON CONFLICT(device_class, tutorial_id) DO UPDATE SET completed = 1, offer_dismissed = 1, completed_at = COALESCE(completed_at, excluded.completed_at)`,
      deviceClass,
      tutorialId,
      Date.now()
    );
    if (firstTime) {
      await db.runAsync('UPDATE auth_session SET level = level + 1 WHERE id = 1');
    }
  }

  async dismissOffer(deviceClass: DeviceClass, tutorialId: string): Promise<void> {
    const db = await this.db();
    if (!db) return this.memoryFallback.dismissOffer(deviceClass, tutorialId);
    await db.runAsync(
      `INSERT INTO tutorial_progress (device_class, tutorial_id, completed, offer_dismissed, completed_at)
       VALUES (?, ?, 0, 1, NULL)
       ON CONFLICT(device_class, tutorial_id) DO UPDATE SET offer_dismissed = 1`,
      deviceClass,
      tutorialId
    );
  }

  async resetForDevice(deviceClass: DeviceClass): Promise<void> {
    const db = await this.db();
    if (!db) return this.memoryFallback.resetForDevice(deviceClass);
    await db.runAsync('DELETE FROM tutorial_progress WHERE device_class = ?', deviceClass);
  }

  private async getKv<T>(key: string, fallback: T): Promise<T> {
    const db = await this.db();
    if (!db) return fallback;
    const row = await db.getFirstAsync<{ value_json: string }>(
      'SELECT value_json FROM kv_state WHERE key = ?',
      key
    );
    if (!row) return fallback;
    try {
      return JSON.parse(row.value_json) as T;
    } catch {
      return fallback;
    }
  }

  private async setKv(key: string, value: unknown): Promise<void> {
    const db = await this.db();
    if (!db) return;
    await db.runAsync(
      'INSERT OR REPLACE INTO kv_state (key, value_json, updated_at) VALUES (?, ?, ?)',
      key,
      JSON.stringify(value),
      Date.now()
    );
  }

  async getPreferences(): Promise<InfiePreferences> {
    const db = await this.db();
    if (!db) return this.memoryFallback.getPreferences();
    return this.getKv('infie_preferences', DEFAULT_INFIE_PREFERENCES);
  }

  async savePreferences(prefs: InfiePreferences): Promise<void> {
    const db = await this.db();
    if (!db) return this.memoryFallback.savePreferences(prefs);
    await this.setKv('infie_preferences', prefs);
  }

  async listGlobalTodos(): Promise<GlobalTodoItem[]> {
    const db = await this.db();
    if (!db) return this.memoryFallback.listGlobalTodos();
    return this.getKv('global_todos', [...SEEDED_GLOBAL_TODOS]);
  }

  async saveGlobalTodos(items: GlobalTodoItem[]): Promise<void> {
    const db = await this.db();
    if (!db) return this.memoryFallback.saveGlobalTodos(items);
    await this.setKv('global_todos', items);
  }

  async listNotifications(): Promise<NotificationItem[]> {
    const db = await this.db();
    if (!db) return this.memoryFallback.listNotifications();
    return this.getKv('notifications', [...SEEDED_NOTIFICATIONS]);
  }

  async saveNotifications(items: NotificationItem[]): Promise<void> {
    const db = await this.db();
    if (!db) return this.memoryFallback.saveNotifications(items);
    await this.setKv('notifications', items);
  }

  async getTaskChecklistState(): Promise<Record<string, boolean>> {
    const db = await this.db();
    if (!db) return this.memoryFallback.getTaskChecklistState();
    return this.getKv('task_checklist_state', {});
  }

  async setTaskChecked(taskId: string, done: boolean): Promise<void> {
    const db = await this.db();
    if (!db) return this.memoryFallback.setTaskChecked(taskId, done);
    const current = await this.getTaskChecklistState();
    await this.setKv('task_checklist_state', { ...current, [taskId]: done });
  }
}

export class MemoryCompanionRepositories
  implements AuthPort, LayoutRepo, TutorialProgressRepo, CompanionDataRepo
{
  private session: UserSession | null = null;
  private presets = new Map<string, SpatialLayoutPreset>();
  private bindings = new Map<LayoutRouteScope, string>();
  private tutorials = new Map<string, TutorialProgressRecord>();
  private preferences: InfiePreferences = { ...DEFAULT_INFIE_PREFERENCES };
  private globalTodos: GlobalTodoItem[] = [...SEEDED_GLOBAL_TODOS];
  private notifications: NotificationItem[] = [...SEEDED_NOTIFICATIONS];
  private taskChecks: Record<string, boolean> = {};

  async ensureReady(): Promise<void> {
    if (this.presets.size === 0) {
      for (const preset of BUILTIN_LAYOUT_PRESETS) {
        this.presets.set(preset.presetId, normalizePreset(preset));
      }
      this.bindings.set('home', 'minimal-infie-emu');
    }
  }

  async getSchemaVersion(): Promise<number> {
    return COMPANION_DB_SCHEMA_VERSION;
  }

  async signIn(
    email: string,
    password: string
  ): Promise<{ ok: true; session: UserSession } | { ok: false; error: string }> {
    if (email.trim().toLowerCase() !== DEMO_AUTH_EMAIL || password !== DEMO_AUTH_PASSWORD) {
      return { ok: false, error: DEMO_AUTH_ERROR };
    }
    this.session = {
      email: DEMO_AUTH_EMAIL,
      displayName: 'i2 Developer',
      level: 1,
      authenticatedAt: Date.now(),
      simulated: true,
    };
    return { ok: true, session: this.session };
  }

  async signOut(): Promise<void> {
    this.session = null;
  }

  async restoreSession(): Promise<UserSession | null> {
    return this.session;
  }

  async listPresets(): Promise<SpatialLayoutPreset[]> {
    await this.ensureReady();
    return Array.from(this.presets.values());
  }

  async savePreset(preset: SpatialLayoutPreset): Promise<void> {
    await this.ensureReady();
    this.presets.set(preset.presetId, {
      ...normalizePreset(preset),
      updatedAt: Date.now(),
    });
  }

  async deletePreset(presetId: string): Promise<void> {
    const existing = this.presets.get(presetId);
    if (existing && !existing.isBuiltin) {
      this.presets.delete(presetId);
    }
  }

  async getActivePresetId(scope: LayoutRouteScope): Promise<string | null> {
    await this.ensureReady();
    return this.bindings.get(scope) ?? null;
  }

  async setActivePresetId(scope: LayoutRouteScope, presetId: string): Promise<void> {
    await this.ensureReady();
    this.bindings.set(scope, presetId);
  }

  async listForDevice(deviceClass: DeviceClass): Promise<TutorialProgressRecord[]> {
    return Array.from(this.tutorials.values()).filter((r) => r.deviceClass === deviceClass);
  }

  async markCompleted(deviceClass: DeviceClass, tutorialId: string): Promise<void> {
    const key = `${deviceClass}:${tutorialId}`;
    const prev = this.tutorials.get(key);
    const firstTime = !prev?.completed;
    this.tutorials.set(key, {
      deviceClass,
      tutorialId,
      completed: true,
      offerDismissed: true,
      completedAt: prev?.completedAt ?? Date.now(),
    });
    if (firstTime && this.session) {
      this.session = { ...this.session, level: this.session.level + 1 };
    }
  }

  async dismissOffer(deviceClass: DeviceClass, tutorialId: string): Promise<void> {
    const key = `${deviceClass}:${tutorialId}`;
    const prev = this.tutorials.get(key);
    this.tutorials.set(key, {
      deviceClass,
      tutorialId,
      completed: prev?.completed ?? false,
      offerDismissed: true,
      completedAt: prev?.completedAt ?? null,
    });
  }

  async resetForDevice(deviceClass: DeviceClass): Promise<void> {
    for (const [key, value] of this.tutorials.entries()) {
      if (value.deviceClass === deviceClass) {
        this.tutorials.delete(key);
      }
    }
  }

  async getPreferences(): Promise<InfiePreferences> {
    return { ...this.preferences };
  }

  async savePreferences(prefs: InfiePreferences): Promise<void> {
    this.preferences = { ...prefs };
  }

  async listGlobalTodos(): Promise<GlobalTodoItem[]> {
    return [...this.globalTodos];
  }

  async saveGlobalTodos(items: GlobalTodoItem[]): Promise<void> {
    this.globalTodos = [...items];
  }

  async listNotifications(): Promise<NotificationItem[]> {
    return [...this.notifications];
  }

  async saveNotifications(items: NotificationItem[]): Promise<void> {
    this.notifications = [...items];
  }

  async getTaskChecklistState(): Promise<Record<string, boolean>> {
    return { ...this.taskChecks };
  }

  async setTaskChecked(taskId: string, done: boolean): Promise<void> {
    this.taskChecks[taskId] = done;
  }
}

const memoryFallback = new MemoryCompanionRepositories();

export const companionRepos = new SqliteCompanionRepositories(async () => null, memoryFallback, {
  backend: 'memory-fallback',
  crossOriginIsolated: null,
  reason: 'Platform-neutral fallback (non-native/non-web resolution).',
});
