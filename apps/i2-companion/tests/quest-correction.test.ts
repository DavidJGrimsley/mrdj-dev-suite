import assert from 'node:assert/strict';
import test from 'node:test';

import {
  correlateCompositorDiagnostics,
  type QuestCompositorDiagnostics,
} from '../src/features/quest-vr/quest-compositor-diag.ts';
import { migrateCompanionDb } from '../src/adapters/sqlite/schema.ts';
import {
  SEEDED_GLOBAL_TODOS,
  SEEDED_NOTIFICATIONS,
  SEEDED_PROJECTS,
  SEEDED_SESSIONS,
  createInitialAppPreviewState,
} from '../src/data/seeded-workspace.ts';
import { BUILTIN_LAYOUT_PRESETS } from '../src/data/widget-catalog.ts';
import {
  resolveQuestLauncherCopy,
  shouldUseQuestDirectEntry,
} from '../src/features/quest-vr/quest-entry-logic.ts';
import {
  buildAuthWindowSurfaceModel,
  buildWindowSurfaceModel,
  hitTestWindowSurface,
} from '../src/features/quest-vr/quest-window-surface.ts';
import {
  adjustNormalizedWeightPair,
  computeGroupedCellLayout,
  resolveWindowGroupLayout,
} from '../src/features/spatial/window-group-layout.ts';
import { layoutStore } from '../src/stores/layout-store.ts';
import { DEFAULT_INFIE_PREFERENCES } from '../src/types/companion.ts';
import type { SpatialWindow } from '../src/types/widgets.ts';

test('Quest entry skips 2D CompanionShell/AuthScreen on Quest while preserving non-Quest routes', () => {
  assert.equal(
    shouldUseQuestDirectEntry({
      platformOs: 'android',
      deviceClass: 'quest',
      hasVrLauncher: true,
      hasQuestPanel: true,
    }),
    true
  );
  assert.equal(
    shouldUseQuestDirectEntry({
      platformOs: 'android',
      deviceClass: 'android',
      hasVrLauncher: true,
      hasQuestPanel: false,
    }),
    true
  );
  assert.equal(
    shouldUseQuestDirectEntry({
      platformOs: 'android',
      deviceClass: 'android',
      hasVrLauncher: false,
      hasQuestPanel: false,
    }),
    false
  );
  assert.equal(
    shouldUseQuestDirectEntry({
      platformOs: 'web',
      deviceClass: 'web',
      hasVrLauncher: false,
      hasQuestPanel: false,
    }),
    false
  );

  const initial = resolveQuestLauncherCopy('idle', false);
  assert.equal(initial.ctaLabel, 'Enter i² VR');
  const returned = resolveQuestLauncherCopy('returned', true);
  assert.equal(returned.ctaLabel, 'Re-enter i² VR');
  assert.doesNotMatch(initial.ctaLabel + initial.subtitle, /OpenXR|Swapchain|CompanionShell/i);
});

test('Native xrEndFrame diagnostics correlate Infie + Emulator windows with distinct swapchains and poses', () => {
  const diag: QuestCompositorDiagnostics = {
    available: true,
    version: 5,
    frameNumber: 240,
    sessionGeneration: 1,
    sessionState: 5,
    sessionStateName: 'FOCUSED',
    focused: true,
    endFrameResult: 0,
    submittedLayerCount: 3,
    activeWindowCount: 2,
    activeSwapchainCount: 2,
    activeSwapchainBytes: 12 * 1024 * 1024,
    layers: [
      {
        slot: 0,
        nodeTag: 'cockpit-window:win-infie-chat',
        swapchain: '0x7100001001',
        contentW: 980,
        contentH: 740,
        bucketW: 1024,
        bucketH: 768,
        widthM: 0.98,
        heightM: 0.74,
        pose: [-0.34, -0.15, -1.39, 0, 0.121, 0, 0.992],
      },
      {
        slot: 1,
        nodeTag: 'cockpit-window:win-emu-web',
        swapchain: '0x7100002002',
        contentW: 880,
        contentH: 860,
        bucketW: 1024,
        bucketH: 1024,
        widthM: 0.88,
        heightM: 0.86,
        pose: [0.68, -0.05, -1.29, 0, -0.241, 0, 0.97],
      },
    ],
  };

  const slotMap = new Map<number, string>([
    [0, 'win-infie-chat'],
    [1, 'win-emu-web'],
  ]);

  const correlated = correlateCompositorDiagnostics(diag, slotMap);
  assert.equal(correlated.focusedSuccess, true);
  assert.equal(correlated.distinctSwapchains, 2);
  assert.deepEqual(
    correlated.windows.map((w) => w.windowId),
    ['win-infie-chat', 'win-emu-web']
  );
  assert.notEqual(correlated.windows[0].swapchain, correlated.windows[1].swapchain);
  assert.notDeepEqual(correlated.windows[0].pose, correlated.windows[1].pose);

  // Unfocused or single-swapchain frames must NOT pass the two-window native proof gate
  assert.equal(
    correlateCompositorDiagnostics({ ...diag, focused: false, sessionState: 4 }, slotMap)
      .focusedSuccess,
    false
  );
  assert.equal(
    correlateCompositorDiagnostics(
      {
        ...diag,
        layers: [diag.layers[0], { ...diag.layers[1], swapchain: diag.layers[0].swapchain }],
      },
      slotMap
    ).focusedSuccess,
    false
  );
});

test('True spatial window grouping renders simultaneous multi-cell layouts, adjusts bounds, and migrates legacy stack/tabs', async () => {
  const legacyWindow: SpatialWindow = {
    windowId: 'win-legacy-grouped',
    title: 'Goal & Tasks',
    zone: 'leftWing',
    sortOrder: 0,
    visible: true,
    mode: 'normal',
    pinned: false,
    yawDeg: -24,
    pitchDeg: 0,
    radiusM: 1.45,
    widthM: 1.12,
    heightM: 0.88,
    dockZone: 'left',
    dockWeight: 1,
    layoutMode: 'tabs',
    widgetIds: ['currentGoal', 'agentTasks', 'git'],
    activeWidgetId: 'currentGoal',
    scrollOffsets: {},
  };

  // Legacy 'tabs' or 'stack' with >=2 widgets resolves as simultaneously visible grid cells
  const resolved = resolveWindowGroupLayout(legacyWindow);
  assert.equal(resolved.columns, 2);
  const layout = computeGroupedCellLayout(legacyWindow, {
    x: 10,
    y: 50,
    width: 1000,
    height: 760,
  });
  assert.equal(layout.cells.length, 3);
  assert.equal(layout.dividers.length >= 2, true);
  // Side-by-side in row 0, full span for 3rd odd cell in row 1
  assert.notEqual(layout.cells[0].x, layout.cells[1].x);
  assert.equal(layout.cells[0].y, layout.cells[1].y);
  assert.equal(layout.cells[2].width, 1000);

  // Adjustable weights clamp cleanly inside comfort ratio [0.24, 0.76]
  const widened = adjustNormalizedWeightPair([0.5, 0.5], 0, 0.2);
  assert.ok(widened[0] > 0.65 && widened[1] < 0.35);
  assert.ok(Math.abs(widened[0] + widened[1] - 1) < 1e-6);

  // Save/restore with groupLayout in layoutStore without losing custom preset names or poses
  await layoutStore.getState().switchPreset('minimal-infie-emu');
  await layoutStore.getState().groupWidgetIntoWindow('win-infie-chat', 'agentTasks');
  await layoutStore.getState().adjustWindowGroupSplit('win-infie-chat', 'col', 0, 0.12);
  const groupedWin = layoutStore
    .getState()
    .getActivePreset()
    .windows.find((w) => w.windowId === 'win-infie-chat')!;
  assert.equal(groupedWin.widgetIds.includes('agentTasks'), true);
  assert.ok((groupedWin.groupLayout?.colWeights?.[0] ?? 0.5) > 0.58);

  const savedCustom = await layoutStore.getState().saveAsNewPreset('QA Split Custom');
  await layoutStore.getState().switchPreset('minimal-infie-emu');
  await layoutStore.getState().switchPreset(savedCustom.presetId);
  const restored = layoutStore
    .getState()
    .getActivePreset()
    .windows.find((w) => w.windowId === 'win-infie-chat')!;
  assert.equal(restored.widgetIds.includes('agentTasks'), true);
  assert.ok((restored.groupLayout?.colWeights?.[0] ?? 0.5) > 0.58);

  // SQLite migration reaches v4 cleanly
  const executedSql: string[] = [];
  const fakeDb = {
    async execAsync(sql: string) {
      executedSql.push(sql);
    },
    async runAsync() {},
    async getFirstAsync<T>() {
      return { user_version: 0 } as T;
    },
    async getAllAsync<T>() {
      return [] as T[];
    },
  };
  const version = await migrateCompanionDb(fakeDb);
  assert.equal(version, 4);
  assert.equal(
    executedSql.some((s) => s.includes('group_layout_json')),
    true
  );
});

test('Desktop i² Home, Emulator, and VR Auth surfaces use desktop typography/colors with zero technical HUD clutter', () => {
  const infieEmu = BUILTIN_LAYOUT_PRESETS.find((p) => p.presetId === 'minimal-infie-emu')!;
  const infieWin = infieEmu.windows[0];
  const emuWin = infieEmu.windows[1];
  const ctx = {
    projects: SEEDED_PROJECTS,
    activeProjectId: 'pet',
    sessions: SEEDED_SESSIONS,
    activeSessionId: 'add-comments',
    globalTodos: SEEDED_GLOBAL_TODOS,
    notifications: SEEDED_NOTIFICATIONS,
    messagesByScope: {},
    whatsNextLines: [],
    preferences: { ...DEFAULT_INFIE_PREFERENCES },
    infieForm: 'mist',
    musicPlaying: false,
    musicTrackIndex: 0,
    selectedPlanTier: 'free' as const,
    storageBackendLabel: 'sqlite',
    environmentId: 'sim-env-local',
    environmentName: 'Simulated Local Workspace',
    providerKind: 'simulated-local' as const,
    b14Answer: null,
    appPreview: createInitialAppPreviewState(),
    recentEvents: [],
    visibleWindowCount: 2,
    maxWindowLayers: 14,
  };

  const homeSurface = buildWindowSurfaceModel({
    win: { ...infieWin, widthM: 1.06, heightM: 0.78 },
    focused: true,
    hoveredTargetId: null,
    context: ctx,
  });

  const textOps = homeSurface.ops.filter((o) => o.op === 'text');
  const fontsUsed = new Set(textOps.map((o) => o.font));
  assert.equal(fontsUsed.has('SpaceGrotesk-Bold'), true);
  assert.equal(fontsUsed.has('RoundedMplus1c-Regular'), true);

  const allText = textOps.map((o) => String(o.text)).join(' ');
  assert.match(allText, /ACTIVE PROJECTS/);
  assert.match(allText, /Pet Show and Tell/);
  assert.match(allText, /Not Hotdog/);
  assert.match(allText, /Generate new Expo Project/);
  assert.doesNotMatch(allText, /Swapchain|OpenXR|MB\/|FPS/);

  // Gradient CTA exists matching #8cffff -> #1a9999
  const genGrad = homeSurface.ops.find(
    (o) =>
      o.op === 'roundRect' &&
      Array.isArray((o.gradient as { colors?: string[] } | undefined)?.colors) &&
      (o.gradient as { colors: string[] }).colors[0] === '#8cffff'
  );
  assert.ok(genGrad);

  // Emulator surface renders cream Pet Show & Tell preview + interactive hit targets
  const emuSurface = buildWindowSurfaceModel({
    win: emuWin,
    focused: false,
    hoveredTargetId: null,
    context: ctx,
  });
  const likeTarget = emuSurface.hitTargets.find((t) => t.actionId === 'emu-like');
  assert.ok(likeTarget);
  const centerHit = hitTestWindowSurface(
    emuSurface,
    (likeTarget.x + likeTarget.width / 2) / emuSurface.widthPx,
    (likeTarget.y + likeTarget.height / 2) / emuSurface.heightPx
  );
  assert.equal(centerHit?.actionId, 'emu-like');

  // In-VR Auth surface has Sign In CTA
  const authSurface = buildAuthWindowSurfaceModel({
    email: 'alex@mrdj.dev',
    passwordMasked: '••••••••',
  });
  assert.equal(
    authSurface.hitTargets.some((t) => t.actionId === 'auth-sign-in'),
    true
  );
});

test('with-quest-home-proof plugin reproducibly patches build.gradle, MainApplication, and HomeProofSpatialActivity template', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const withQuestHomeProof = (await import('../tools/quest/with-quest-home-proof.cjs')).default;

  const sampleGradle = [
    'android {',
    '    defaultConfig {',
    '        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL", "\\"stable\\""',
    '    }',
    '    buildTypes {',
    '        debug {',
    '            signingConfig signingConfigs.debug',
    '        }',
    '    }',
    '    packagingOptions {',
    '        jniLibs {',
    '            useLegacyPackaging enableLegacyPackaging.toBoolean()',
    '        }',
    '    }',
    '    androidResources {',
    '    }',
    '}',
    'dependencies {',
    '    implementation("com.facebook.react:react-android")',
    '}',
  ].join('\n');

  const patchedGradle = withQuestHomeProof.patchAppBuildGradle(sampleGradle);
  assert.equal(
    patchedGradle.includes('buildConfigField "boolean", "IS_HOME_PROOF", "false"'),
    true
  );
  assert.equal(patchedGradle.includes('applicationIdSuffix ".homeproof"'), true);
  assert.equal(
    patchedGradle.includes('implementation("com.meta.spatial:meta-spatial-sdk-vr:0.15.0")'),
    true
  );
  assert.equal(patchedGradle.includes("tasks.register('syncHomeProofAssets')"), true);
  assert.equal(withQuestHomeProof.patchAppBuildGradle(patchedGradle), patchedGradle);

  const sampleMainApp = [
    'class MainApplication : Application(), ReactApplication {',
    '  override fun onCreate() {',
    '    super.onCreate()',
    '    loadReactNative(this)',
    '  }',
    '  override fun onConfigurationChanged(newConfig: Configuration) {',
    '    super.onConfigurationChanged(newConfig)',
    '    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)',
    '  }',
    '}',
  ].join('\n');

  const patchedMainApp = withQuestHomeProof.patchMainApplicationSource(sampleMainApp);
  assert.equal(patchedMainApp.includes('if (BuildConfig.IS_HOME_PROOF)'), true);
  assert.equal(patchedMainApp.includes('if (!BuildConfig.IS_HOME_PROOF)'), true);
  assert.equal(withQuestHomeProof.patchMainApplicationSource(patchedMainApp), patchedMainApp);

  const templateActivity = fs.readFileSync(
    path.join(process.cwd(), 'tools/quest/homeproof/HomeProofSpatialActivity.kt'),
    'utf8'
  );
  assert.match(
    templateActivity,
    /mustRunBefore\s*=\s*mutableSetOf\(\s*SystemDependencyConfig\(IsdkSystem::class,\s*true\)/
  );
  assert.match(
    templateActivity,
    /mustRunAfter\s*=\s*mutableSetOf\(\s*SystemDependencyConfig\(TickDataModelSystem::class,\s*false\),\s*SystemDependencyConfig\(TickTransformSystem::class,\s*false\)/
  );
  assert.match(
    templateActivity,
    /IsdkBoxCollider\(\s*size\s*=\s*Vector3\(\s*GRAB_COLLIDER_WIDTH_M,\s*GRAB_COLLIDER_HEIGHT_M,\s*GRAB_COLLIDER_DEPTH_M/
  );
  assert.match(templateActivity, /scene\.setReferenceSpace\(ReferenceSpace\.LOCAL_FLOOR\)/);
  assert.match(templateActivity, /Quaternion\(0f,\s*180f,\s*0f\)/);
  assert.match(templateActivity, /viewerPose\.t\.y <= MIN_TRACKED_EYE_HEIGHT_M/);
  assert.match(templateActivity, /Quaternion\.fromDirection\(-dirX,\s*0f,\s*-dirZ\)/);
  assert.match(templateActivity, /PanelShapeLayerBlendType\.OPAQUE/);
  assert.match(templateActivity, /enableLayerFeatheredEdge = false/);
  assert.match(templateActivity, /layer\.setZIndex\(PANEL_LAYER_Z_INDEX\)/);
  assert.match(templateActivity, /scene\.enableHolePunching\(true\)/);
  assert.match(templateActivity, /Color\.rgb\(0x0B,\s*0x13,\s*0x1D\)/);
  assert.match(templateActivity, /MeshCollision\.LineTest_IgnoreVisible/);
  assert.match(templateActivity, /ButtonBits\.ButtonTriggerL/);
  assert.match(templateActivity, /ButtonBits\.ButtonTriggerR/);
  assert.match(templateActivity, /ButtonBits\.ButtonA/);
  assert.match(templateActivity, /ButtonBits\.ButtonX/);
  assert.match(templateActivity, /RAY_TAP_EPSILON_M = 0\.01f/);
  assert.doesNotMatch(templateActivity, /setBackgroundColor\(Color\.TRANSPARENT\)/);

  const proofHtml = fs.readFileSync(
    path.join(process.cwd(), 'tools/quest/homeproof/index.html'),
    'utf8'
  );
  assert.match(proofHtml, /background:\s*#0B131D/);
  assert.doesNotMatch(proofHtml, /background:\s*transparent/);
});
