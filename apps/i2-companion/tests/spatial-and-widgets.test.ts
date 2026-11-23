import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUILTIN_LAYOUT_PRESETS,
  WIDGET_CATALOG,
  resolveCanonicalWidgetId,
} from '../src/data/widget-catalog.ts';
import {
  COMFORT_LIMITS,
  DEFAULT_COCKPIT_ANCHOR,
  clampPlacementToComfort,
  computeSmartPlacement,
  computeWindowPixelSpec,
  quantizeSwapchainBucket,
  shouldReanchorOnRefSpaceEpoch,
  sphericalToWorldPose,
  worldPosToSpherical,
} from '../src/features/spatial/cockpit-math.ts';
import { layoutStore } from '../src/stores/layout-store.ts';

test('widget catalog exposes all 28 desktop-parity widgets + workspaceEnv and legacy aliases resolve', () => {
  assert.equal(WIDGET_CATALOG.length, 28);
  assert.equal(resolveCanonicalWidgetId('workspaceEnv'), 'workspaceEnv');
  assert.equal(resolveCanonicalWidgetId('desktopStream'), 'workspaceEnv');
  assert.equal(resolveCanonicalWidgetId('desktopMirror'), 'workspaceEnv');
  assert.equal(resolveCanonicalWidgetId('desktop'), 'workspaceEnv');
  assert.equal(resolveCanonicalWidgetId('environments'), 'workspaceEnv');
  assert.equal(resolveCanonicalWidgetId('workspace'), 'workspaceEnv');
  assert.equal(resolveCanonicalWidgetId('currentDiffs'), 'git');
  assert.equal(resolveCanonicalWidgetId('goalPlan'), 'currentGoal');
  assert.equal(resolveCanonicalWidgetId('webPreview'), 'emuWeb');
  assert.equal(resolveCanonicalWidgetId('infie3d'), 'infie3d');
  assert.equal(resolveCanonicalWidgetId('unknown-widget'), null);
});

test('builtin presets define clean Infie + Emulator and grouped Batcave Command layouts', () => {
  const minimal = BUILTIN_LAYOUT_PRESETS.find((p) => p.presetId === 'minimal-infie-emu');
  assert.ok(minimal);
  assert.equal(minimal.windows.filter((w) => w.visible).length, 2);

  const batcave = BUILTIN_LAYOUT_PRESETS.find((p) => p.presetId === 'batcave-cockpit');
  assert.ok(batcave);
  const visWindows = batcave.windows.filter((w) => w.visible);
  assert.ok(visWindows.length >= 4 && visWindows.length <= 8);
  const groupedWidgetCount = visWindows.reduce((acc, w) => acc + w.widgetIds.length, 0);
  assert.equal(
    groupedWidgetCount,
    15,
    'All 15 Batcave panel widgets fit across grouped OpenXR windows'
  );
  assert.ok(batcave.widgets.some((w) => w.widgetId === 'infie3d' && w.visible));
});

test('comfort clamping constrains radius, yaw, pitch, and dimensions', () => {
  const clamped = clampPlacementToComfort({
    instanceId: 'x',
    widgetId: 'infieChat',
    zone: 'center',
    sortOrder: 0,
    visible: true,
    mode: 'normal',
    pinned: false,
    yawDeg: 350,
    pitchDeg: -95,
    radiusM: 0.1,
    widthM: 8,
    heightM: 0.02,
    dockZone: 'center',
    dockWeight: 10,
    scrollOffset: -4,
  });

  assert.equal(clamped.yawDeg, COMFORT_LIMITS.maxYawDeg);
  assert.equal(clamped.pitchDeg, COMFORT_LIMITS.minPitchDeg);
  assert.equal(clamped.radiusM, COMFORT_LIMITS.minRadiusM);
  assert.equal(clamped.widthM, COMFORT_LIMITS.maxWidthM);
  assert.equal(clamped.heightM, COMFORT_LIMITS.minHeightM);
  assert.equal(clamped.scrollOffset, 0);
});

test('computeWindowPixelSpec preserves aspect ratio while quantizing swapchain buckets', () => {
  assert.equal(quantizeSwapchainBucket(980, 2048), 1024);
  assert.equal(quantizeSwapchainBucket(1450, 2048), 1536);

  const small = computeWindowPixelSpec({
    widthM: 1.0,
    heightM: 0.5,
    widgetCount: 1,
    hasHighDensityContent: false,
    totalVisibleWindows: 2,
  });
  assert.ok(Math.abs(small.widthPx / small.heightPx - 2.0) < 0.02);
  assert.equal(small.bucketWidthPx, 1024);
  assert.equal(small.bucketHeightPx, 512);

  // Small resize stays inside the same quantized swapchain bucket to prevent thrash
  const slightlyLarger = computeWindowPixelSpec({
    widthM: 1.04,
    heightM: 0.52,
    widgetCount: 1,
    hasHighDensityContent: false,
    totalVisibleWindows: 2,
  });
  assert.equal(slightlyLarger.bucketWidthPx, small.bucketWidthPx);
  assert.equal(slightlyLarger.bucketHeightPx, small.bucketHeightPx);
});

test('worldPosToSpherical inverts sphericalToWorldPose within comfort bounds', () => {
  const anchor = { ...DEFAULT_COCKPIT_ANCHOR, origin: [0.2, 1.1, -0.3] as const, yawDeg: 25 };
  const input = { yawDeg: -42, pitchDeg: 14, radiusM: 1.62 };
  const world = sphericalToWorldPose(anchor, input);
  const back = worldPosToSpherical(anchor, world.position);

  assert.ok(Math.abs(back.yawDeg - input.yawDeg) < 0.05);
  assert.ok(Math.abs(back.pitchDeg - input.pitchDeg) < 0.05);
  assert.ok(Math.abs(back.radiusM - input.radiusM) < 0.01);
});

test('computeSmartPlacement spreads newly added widgets without stacking', () => {
  const existing = [
    { yawDeg: 0, pitchDeg: -4, radiusM: 1.46 },
    { yawDeg: -38, pitchDeg: 10, radiusM: 1.5 },
  ];
  const p1 = computeSmartPlacement(existing, 'leftWing');
  const p2 = computeSmartPlacement([...existing, p1], 'leftWing');
  assert.notDeepEqual(p1, p2);
});

test('layoutStore supports window grouping, ungrouping, reordering, merging, and hard layer limits', async () => {
  layoutStore.getState().setMaxWindowLayers(12);
  await layoutStore.getState().switchPreset('minimal-infie-emu');

  // Add a third window holding terminal
  const added = await layoutStore.getState().addWindow(['terminal']);
  assert.equal(added.ok, true);
  assert.ok(added.windowId);

  // Group git into that window and reorder
  const grouped = await layoutStore.getState().groupWidgetIntoWindow(added.windowId!, 'git');
  assert.equal(grouped.ok, true);
  let targetWin = layoutStore
    .getState()
    .getActivePreset()
    .windows.find((w) => w.windowId === added.windowId);
  assert.deepEqual(targetWin?.widgetIds, ['terminal', 'git']);

  await layoutStore.getState().reorderWidgetInWindow(added.windowId!, 'git', 'up');
  await layoutStore.getState().setWindowLayoutMode(added.windowId!, 'tabs');
  await layoutStore.getState().setWindowActiveWidget(added.windowId!, 'git');
  targetWin = layoutStore
    .getState()
    .getActivePreset()
    .windows.find((w) => w.windowId === added.windowId);
  assert.deepEqual(targetWin?.widgetIds, ['git', 'terminal']);
  assert.equal(targetWin?.layoutMode, 'tabs');
  assert.equal(targetWin?.activeWidgetId, 'git');

  // Ungroup back out to its own OpenXR window when under layer budget
  const popped = await layoutStore.getState().ungroupWidgetToNewWindow(added.windowId!, 'terminal');
  assert.equal(popped.ok, true);
  assert.ok(popped.windowId && popped.windowId !== added.windowId);

  // Enforce explicit hard runtime layer cap without pretending extra native layers exist
  layoutStore.getState().setMaxWindowLayers(4);
  const blocked = await layoutStore.getState().addWindow(['music']);
  assert.equal(blocked.ok, false);
  assert.ok(layoutStore.getState().lastLayerLimitNotice?.includes('4/4'));

  // Grouping into an existing window still succeeds even when window count is at hard limit!
  const groupedAtCap = await layoutStore.getState().groupWidgetIntoWindow(added.windowId!, 'music');
  assert.equal(groupedAtCap.ok, true);

  layoutStore.getState().setMaxWindowLayers(16);
  layoutStore.getState().clearLayerLimitNotice();
  await layoutStore.getState().resetActivePresetToDefault();
});

test('layoutStore preserves freeform move, resizeBy, saveAs, rename, and delete across windows', async () => {
  layoutStore.getState().setMaxWindowLayers(16);
  await layoutStore.getState().switchPreset('minimal-infie-emu');
  await layoutStore.getState().addWidget('workspaceEnv');
  await layoutStore
    .getState()
    .moveWidgetPose(
      'workspaceEnv',
      { yawDeg: 52, pitchDeg: 16, radiusM: 1.72 },
      { freeform: true }
    );
  await layoutStore.getState().resizeWidgetBy('workspaceEnv', 0.2, 0.12);

  const custom = await layoutStore.getState().saveAsNewPreset('My VR Test Cave');
  assert.equal(custom.name, 'My VR Test Cave');
  assert.equal(custom.arrangeMode, 'free');

  const placedWin = custom.windows.find((w) => w.widgetIds.includes('workspaceEnv') && w.visible);
  assert.ok(placedWin);
  assert.equal(placedWin.yawDeg, 52);
  assert.equal(placedWin.pitchDeg, 16);

  await layoutStore.getState().renamePreset(custom.presetId, 'Renamed Cave');
  assert.equal(
    layoutStore.getState().presets.find((p) => p.presetId === custom.presetId)?.name,
    'Renamed Cave'
  );

  await layoutStore.getState().removeWidget('workspaceEnv');
  assert.equal(
    layoutStore
      .getState()
      .getActivePreset()
      .windows.some((w) => w.visible && w.widgetIds.includes('workspaceEnv')),
    false
  );

  await layoutStore.getState().deleteCustomPreset(custom.presetId);
  assert.equal(
    layoutStore.getState().presets.some((p) => p.presetId === custom.presetId),
    false
  );
  await layoutStore.getState().resetActivePresetToDefault();
});

test('CockpitAnchor ignores DEFAULT calibration epoch bump and reanchors solo/system after HeadSample', () => {
  assert.equal(shouldReanchorOnRefSpaceEpoch(DEFAULT_COCKPIT_ANCHOR, 1, true), false);
  const soloAnchor = { ...DEFAULT_COCKPIT_ANCHOR, source: 'solo' as const, refSpaceEpoch: 1 };
  assert.equal(shouldReanchorOnRefSpaceEpoch(soloAnchor, 1, true), false);
  assert.equal(shouldReanchorOnRefSpaceEpoch(soloAnchor, 2, false), false);
  assert.equal(shouldReanchorOnRefSpaceEpoch(soloAnchor, 2, true), true);

  const pose = sphericalToWorldPose(soloAnchor, { yawDeg: 0, pitchDeg: 0, radiusM: 1.5 });
  assert.ok(Math.abs(pose.position[2] + 1.5) < 1e-4);
});
