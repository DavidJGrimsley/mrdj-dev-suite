import assert from 'node:assert/strict';
import test from 'node:test';

import { MemoryCompanionRepositories } from '../src/adapters/sqlite/companion-db.ts';
import { COMPANION_DB_SCHEMA_VERSION, SQLITE_MIGRATIONS } from '../src/adapters/sqlite/schema.ts';
import {
  BUILTIN_LAYOUT_PRESETS,
  derivePlacementsFromWindows,
  migratePlacementsToWindows,
} from '../src/data/widget-catalog.ts';
import {
  DEMO_AUTH_EMAIL,
  DEMO_AUTH_ERROR,
  DEMO_AUTH_PASSWORD,
} from '../src/data/seeded-workspace.ts';
import type { SpatialLayoutPreset } from '../src/types/widgets.ts';

test('auth accepts desktop demo credentials and rejects wrong password', async () => {
  const repo = new MemoryCompanionRepositories();
  const bad = await repo.signIn(DEMO_AUTH_EMAIL, 'wrong-pass');
  assert.deepEqual(bad, { ok: false, error: DEMO_AUTH_ERROR });

  const good = await repo.signIn(DEMO_AUTH_EMAIL, DEMO_AUTH_PASSWORD);
  assert.equal(good.ok, true);
  if (good.ok) {
    assert.equal(good.session.simulated, true);
    assert.equal(good.session.email, DEMO_AUTH_EMAIL);
    assert.equal(good.session.level, 1);
  }
});

test('per-device tutorial grants level once and replays do not duplicate rewards', async () => {
  const repo = new MemoryCompanionRepositories();
  const signed = await repo.signIn(DEMO_AUTH_EMAIL, DEMO_AUTH_PASSWORD);
  assert.equal(signed.ok, true);

  await repo.markCompleted('quest', 'quest-companion');
  const questList = await repo.listForDevice('quest');
  assert.equal(
    questList.some((r) => r.tutorialId === 'quest-companion' && r.completed),
    true
  );
  let current = await repo.restoreSession();
  assert.equal(current?.level, 2);

  await repo.markCompleted('quest', 'quest-companion');
  current = await repo.restoreSession();
  assert.equal(current?.level, 2, 'Replay must not grant a second level reward');

  await repo.markCompleted('web', 'web-companion');
  current = await repo.restoreSession();
  assert.equal(current?.level, 3);
});

test('SQLite schema v3 defines spatial_windows table and custom grouped layouts persist & restore', async () => {
  assert.equal(COMPANION_DB_SCHEMA_VERSION, 3);
  assert.ok(
    SQLITE_MIGRATIONS.some(
      (m) => m.version === 3 && m.sql.includes('CREATE TABLE IF NOT EXISTS spatial_windows')
    )
  );

  const repo = new MemoryCompanionRepositories();
  const presets = await repo.listPresets();
  assert.ok(presets.length >= 4);
  const batcave = presets.find((p) => p.presetId === 'batcave-cockpit');
  assert.ok(batcave && batcave.windows.length >= 4);

  const custom: SpatialLayoutPreset = {
    ...batcave,
    presetId: 'custom-batcave-grouped',
    name: 'Batcave Grouped Custom',
    isBuiltin: false,
    windows: batcave.windows.map((w, i) =>
      i === 0 ? { ...w, layoutMode: 'tabs', activeWidgetId: w.widgetIds[1] ?? w.widgetIds[0] } : w
    ),
    updatedAt: Date.now(),
  };
  await repo.savePreset(custom);
  await repo.setActivePresetId('session:add-comments', 'custom-batcave-grouped');

  const bound = await repo.getActivePresetId('session:add-comments');
  assert.equal(bound, 'custom-batcave-grouped');

  const restored = (await repo.listPresets()).find((p) => p.presetId === 'custom-batcave-grouped');
  assert.equal(restored?.windows[0].layoutMode, 'tabs');

  await repo.deletePreset('custom-batcave-grouped');
  const afterDelete = await repo.listPresets();
  assert.equal(
    afterDelete.some((p) => p.presetId === 'custom-batcave-grouped'),
    false
  );
});

test('legacy placements-only layouts migrate cleanly to grouped SpatialWindows', () => {
  const legacyPlacements = BUILTIN_LAYOUT_PRESETS[0].widgets;
  const migrated = migratePlacementsToWindows('legacy-preset', legacyPlacements);
  assert.equal(migrated.length, 2, 'infie3d actor is excluded from 2D OpenXR windows');
  assert.ok(migrated.every((w) => w.windowId.length > 0 && w.widgetIds.length === 1));

  const reprojected = derivePlacementsFromWindows(
    migrated,
    legacyPlacements.find((w) => w.widgetId === 'infie3d') ?? null
  );
  assert.equal(
    reprojected.some((w) => w.widgetId === 'infie3d'),
    true
  );
});
