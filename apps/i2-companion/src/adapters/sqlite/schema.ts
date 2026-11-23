export const COMPANION_DB_SCHEMA_VERSION = 3;

export interface SqliteExecutor {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
}

const MIGRATION_V1_SQL = `
CREATE TABLE IF NOT EXISTS auth_session (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  authenticated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS kv_state (
  key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tutorial_progress (
  device_class TEXT NOT NULL,
  tutorial_id TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  offer_dismissed INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  PRIMARY KEY (device_class, tutorial_id)
);

CREATE TABLE IF NOT EXISTS spatial_presets (
  preset_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_builtin INTEGER NOT NULL DEFAULT 0,
  builtin_revision INTEGER NOT NULL DEFAULT 1,
  arrange_mode TEXT NOT NULL DEFAULT 'arc',
  posture TEXT NOT NULL DEFAULT 'standing',
  schema_version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS spatial_widget_placements (
  preset_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  widget_id TEXT NOT NULL,
  zone TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  mode TEXT NOT NULL DEFAULT 'normal',
  pinned INTEGER NOT NULL DEFAULT 0,
  yaw_deg REAL NOT NULL,
  pitch_deg REAL NOT NULL,
  radius_m REAL NOT NULL,
  width_m REAL NOT NULL,
  height_m REAL NOT NULL,
  dock_zone TEXT NOT NULL DEFAULT 'left',
  dock_weight REAL NOT NULL DEFAULT 1.0,
  scroll_offset REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (preset_id, instance_id),
  FOREIGN KEY (preset_id) REFERENCES spatial_presets(preset_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS active_layout_bindings (
  route_scope TEXT PRIMARY KEY NOT NULL,
  preset_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (preset_id) REFERENCES spatial_presets(preset_id)
);
`;

const MIGRATION_V2_SQL = `
CREATE TABLE IF NOT EXISTS host_profiles (
  host_id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  host_address TEXT NOT NULL,
  port INTEGER NOT NULL,
  protocol TEXT NOT NULL,
  paired INTEGER NOT NULL DEFAULT 0,
  last_connected_at INTEGER
);
`;

const MIGRATION_V3_SQL = `
CREATE TABLE IF NOT EXISTS spatial_windows (
  preset_id TEXT NOT NULL,
  window_id TEXT NOT NULL,
  title TEXT NOT NULL,
  zone TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  mode TEXT NOT NULL DEFAULT 'normal',
  pinned INTEGER NOT NULL DEFAULT 0,
  yaw_deg REAL NOT NULL,
  pitch_deg REAL NOT NULL,
  radius_m REAL NOT NULL,
  width_m REAL NOT NULL,
  height_m REAL NOT NULL,
  dock_zone TEXT NOT NULL DEFAULT 'center',
  dock_weight REAL NOT NULL DEFAULT 1.0,
  layout_mode TEXT NOT NULL DEFAULT 'stack',
  active_widget_id TEXT,
  widget_ids_json TEXT NOT NULL,
  scroll_offsets_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (preset_id, window_id),
  FOREIGN KEY (preset_id) REFERENCES spatial_presets(preset_id) ON DELETE CASCADE
);
`;

const MIGRATION_V4_SQL = `
ALTER TABLE spatial_windows ADD COLUMN group_layout_json TEXT;
`;

export const SQLITE_MIGRATIONS: readonly { version: number; sql: string }[] = [
  { version: 1, sql: MIGRATION_V1_SQL },
  { version: 2, sql: MIGRATION_V2_SQL },
  { version: 3, sql: MIGRATION_V3_SQL },
  { version: 4, sql: MIGRATION_V4_SQL },
];

export async function migrateCompanionDb(db: SqliteExecutor): Promise<number> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let currentVersion = typeof row?.user_version === 'number' ? row.user_version : 0;

  for (const migration of SQLITE_MIGRATIONS) {
    if (currentVersion < migration.version) {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      currentVersion = migration.version;
    }
  }
  return currentVersion;
}
