import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  QuestCompositorCapabilities,
  QuestPanelNative,
} from '../modules/quest-panel/src/index.ts';
import { BUILTIN_LAYOUT_PRESETS } from '../src/data/widget-catalog.ts';
import {
  LEEK_BEATS_TRACKS,
  SEEDED_GLOBAL_TODOS,
  SEEDED_NOTIFICATIONS,
  SEEDED_PROJECTS,
  SEEDED_SESSIONS,
  createInitialAppPreviewState,
} from '../src/data/seeded-workspace.ts';
import {
  MultiWindowCompositorController,
  clampWindowSpecJson,
  cockpitHoleMaterials,
} from '../src/features/quest-vr/quest-cockpit-compositor.ts';
import {
  HEAD_GAZE_SOURCE_ID,
  QuestRawInputTracker,
  decodeLatestRawSample,
  forwardFromQuat,
  isAcceptedControllerRaySource,
} from '../src/features/quest-vr/quest-input-adapter.ts';
import {
  buildWindowSurfaceModel,
  hitTestWindowSurface,
  worldPointToWindowUv,
} from '../src/features/quest-vr/quest-window-surface.ts';
import {
  DEFAULT_COCKPIT_ANCHOR,
  sphericalToWorldPose,
} from '../src/features/spatial/cockpit-math.ts';
import { createFutureEnvironmentBoundary } from '../src/providers/future-environment-boundaries.ts';
import { createSimulatedEnvironmentProvider } from '../src/providers/simulated-environment-provider.ts';
import { companionStore } from '../src/stores/companion-store.ts';
import { connectionStore } from '../src/stores/connection-store.ts';
import { CapabilityUnavailableError } from '../src/types/providers.ts';
import { createStaticHeaders } from '../tools/web/serve-static.mjs';

test('capability boundary enforces Simulated Local Environment and blocks unimplemented Host/Cloud providers', async () => {
  const sim = createSimulatedEnvironmentProvider();
  assert.equal(sim.kind, 'simulated-local');
  assert.equal(sim.getCapabilities().sharedStateMode, 'simulated-in-app');
  assert.equal(sim.getCapabilities().crossDeviceSync, false);
  assert.equal(sim.getCapabilities().emulatorsNative, 'simulated-app-preview');
  assert.equal(sim.getCapabilities().hostMutationsAuthorized, false);
  assert.equal(sim.getStatus().syncStatus, 'simulated-local-only');

  const localHost = createFutureEnvironmentBoundary('local-host');
  assert.equal(localHost.kind, 'local-host');
  assert.equal(localHost.getStatus().syncStatus, 'disconnected');
  assert.equal(localHost.getCapabilities().crossDeviceSync, false);
  await assert.rejects(
    () => localHost.connectEnvironment('future-local-host'),
    CapabilityUnavailableError
  );
  await assert.rejects(
    () => localHost.dispatch({ type: 'set-preview-target', target: 'test' }, 'companion-2d'),
    CapabilityUnavailableError
  );

  const cloudHost = createFutureEnvironmentBoundary('cloud-host');
  assert.equal(cloudHost.kind, 'cloud-host');
  assert.equal(cloudHost.getStatus().syncStatus, 'disconnected');
  await assert.rejects(
    () => cloudHost.connectEnvironment('future-cloud-host'),
    CapabilityUnavailableError
  );

  connectionStore.getState().setProviderKind('local-host');
  assert.equal(connectionStore.getState().mode, 'simulated-local');
  assert.ok(companionStore.getState().prototypeLimit?.featureName.includes('Computer-Hosted'));
  companionStore.getState().dismissPrototypeLimit();

  connectionStore.getState().setProviderKind('cloud-host');
  assert.equal(connectionStore.getState().mode, 'simulated-local');
  assert.ok(companionStore.getState().prototypeLimit?.featureName.includes('Cloud'));
  companionStore.getState().dismissPrototypeLimit();
});

test('SimulatedEnvironmentProvider drives coherent in-app shared state across widgets and Quest VR with zero networking', async () => {
  const events: string[] = [];
  const sim = createSimulatedEnvironmentProvider();
  const unsub = sim.subscribe((evt) => {
    events.push(`${evt.seq}:${evt.origin}:${evt.kind}:${evt.commandType ?? 'none'}`);
  });

  // 1. B14 sort decision updates both session answer and shared simulated app preview order
  const sortRes = await sim.dispatch(
    { type: 'answer-agent-question', sessionId: 'add-comments', answer: 'oldest' },
    'quest-vr'
  );
  assert.equal(sortRes.ok, true);
  assert.equal(sim.getState().b14Answer, 'oldest');
  assert.equal(sim.getState().appPreview.sortOrder, 'oldest');

  // 2. Preview comment validation rejects empty/oversized input and accepts 1..180 chars
  const emptyRes = await sim.dispatch(
    { type: 'post-preview-comment', text: '   ' },
    'companion-2d'
  );
  assert.equal(emptyRes.ok, false);

  const postRes = await sim.dispatch(
    { type: 'post-preview-comment', text: 'B14 Quest VR check' },
    'companion-2d'
  );
  assert.equal(postRes.ok, true);
  assert.equal(sim.getState().appPreview.comments.at(-1)?.text, 'B14 Quest VR check');

  // 3. Reaction & preview target/version toggles mutate the shared app preview state
  const targetCommentId = sim.getState().appPreview.comments.at(-1)!.id;
  await sim.dispatch(
    { type: 'toggle-preview-reaction', commentId: targetCommentId, kind: 'like' },
    'quest-vr'
  );
  await sim.dispatch({ type: 'set-preview-target', target: 'test' }, 'companion-2d');
  assert.equal(sim.getState().appPreview.comments.at(-1)?.userReaction, 'like');
  assert.equal(sim.getState().appPreview.targetBranch, 'test');
  assert.equal(sim.getState().appPreview.buildVersion, 'v2');

  // 4. Completing all 4 Human Tests promotes NEEDS YOU -> VERIFIED, then PR -> MERGED -> COMPLETE
  const petSession = sim.getState().sessions.find((s) => s.id === 'add-comments')!;
  for (const ht of petSession.humanTests) {
    if (!ht.done) {
      await sim.dispatch(
        { type: 'toggle-human-test', sessionId: 'add-comments', testId: ht.id },
        'companion-2d'
      );
    }
  }
  assert.equal(sim.getState().sessions.find((s) => s.id === 'add-comments')?.status, 'VERIFIED');
  await sim.dispatch(
    { type: 'advance-session-stage', sessionId: 'add-comments', action: 'open-pr' },
    'quest-vr'
  );
  await sim.dispatch(
    { type: 'advance-session-stage', sessionId: 'add-comments', action: 'merge-pr' },
    'companion-2d'
  );
  await sim.dispatch(
    { type: 'advance-session-stage', sessionId: 'add-comments', action: 'submit-report' },
    'quest-vr'
  );
  assert.equal(sim.getState().sessions.find((s) => s.id === 'add-comments')?.status, 'COMPLETE');

  // 5. Switching to Experimemo updates project/preview state cleanly, and selecting future host blocks cleanly
  await sim.dispatch(
    { type: 'select-environment', environmentId: 'sim-env-experimemo' },
    'companion-2d'
  );
  assert.equal(sim.getState().activeProjectId, 'experimemo');
  assert.equal(sim.getState().appPreview.projectId, 'experimemo');

  await assert.rejects(
    () =>
      sim.dispatch(
        { type: 'select-environment', environmentId: 'future-local-host' },
        'companion-2d'
      ),
    CapabilityUnavailableError
  );

  unsub();
  assert.ok(events.some((e) => e.includes('quest-vr:command-applied:answer-agent-question')));
  assert.ok(events.some((e) => e.includes('companion-2d:command-applied:post-preview-comment')));
  assert.ok(events.some((e) => e.includes('environment-switched')));
  assert.ok(events.some((e) => e.includes('boundary-blocked')));
});

test('companionStore coherent shared-state helpers synchronize Infie Chat, Environment, and Emulator previews', async () => {
  await companionStore.getState().selectEnvironment('sim-env-pet', 'companion-2d');
  await companionStore.getState().answerB14Question('add-comments', 'oldest', 'quest-vr');
  assert.equal(companionStore.getState().appPreview.sortOrder, 'oldest');
  assert.equal(companionStore.getState().b14Answer, 'oldest');

  const badComment = await companionStore.getState().postPreviewComment('', 'companion-2d');
  assert.equal(badComment.ok, false);

  const okComment = await companionStore
    .getState()
    .postPreviewComment('Companion widget shared check', 'companion-2d');
  assert.equal(okComment.ok, true);
  assert.equal(
    companionStore.getState().appPreview.comments.at(-1)?.text,
    'Companion widget shared check'
  );
  assert.equal(companionStore.getState().lastEventSummary.length > 0, true);

  await companionStore.getState().answerB14Question('add-comments', 'newest', 'companion-2d');
  assert.equal(companionStore.getState().appPreview.sortOrder, 'newest');
});

test('Quest ray filter rejects head gaze source 12, decodes aim ray, and clamps window spec', () => {
  assert.equal(isAcceptedControllerRaySource(HEAD_GAZE_SOURCE_ID), false);
  assert.equal(isAcceptedControllerRaySource(1), true);
  assert.equal(isAcceptedControllerRaySource(4), true);

  // Rotate forward (-Z) +90deg around Y -> (-1, 0, 0)
  const sq = Math.SQRT1_2;
  const dir = forwardFromQuat([0, sq, 0, sq]);
  assert.ok(Math.abs(dir[0] + 1) < 1e-4);
  assert.ok(Math.abs(dir[1]) < 1e-4);
  assert.ok(Math.abs(dir[2]) < 1e-4);

  const rawFloats = new Array(34).fill(0);
  rawFloats[17 + 2] = 0.25;
  rawFloats[17 + 6] = 1; // valid right-hand identity quat
  rawFloats[17 + 13] = 0.9; // right trigger
  const decoded = decodeLatestRawSample({
    available: true,
    count: 1,
    seq: [42],
    ints: [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1, 0],
    floats: rawFloats,
  });
  assert.ok(decoded?.right.validPose);
  assert.deepEqual(decoded?.right.aimDirection, [0, 0, -1]);

  const tracker = new QuestRawInputTracker();
  const res1 = tracker.poll(
    {
      isAvailable: () => true,
      profiles: () => ['', ''],
      read: () => ({ available: true, count: 0 }),
    },
    1000,
    200
  );
  assert.equal(res1.edges.trackingLostSustained, false);
  const res2 = tracker.poll(
    {
      isAvailable: () => true,
      profiles: () => ['', ''],
      read: () => ({ available: true, count: 0 }),
    },
    1250,
    200
  );
  assert.equal(res2.edges.trackingLostSustained, true);

  const oversizedOps = Array.from({ length: 2200 }, (_, i) => ({
    op: 'text',
    text: String(i),
    x: 0,
    y: 0,
  }));
  const parsed = JSON.parse(
    clampWindowSpecJson({
      windowId: 'w1',
      label: 'w1',
      widthPx: 9000,
      heightPx: 5000,
      bucketWidthPx: 4096,
      bucketHeightPx: 4096,
      widthM: 5,
      heightM: 4,
      pose: [0, 0, -1, 0, 0, 0, 1],
      ops: oversizedOps,
    })
  );
  assert.equal(parsed.widthPx, 2048);
  assert.equal(parsed.heightPx, 2048);
  assert.equal(parsed.widthM, 2.4);
  assert.equal(parsed.heightM, 2.4);
  assert.equal(parsed.ops.length, 2048);
});

test('MultiWindowCompositorController assigns persistent slots, separates draw vs pose, and enforces runtime limit', () => {
  const calls: string[] = [];
  let nextOwner = 10;
  const mockCaps: QuestCompositorCapabilities = {
    available: true,
    version: 5,
    poolCapacity: 16,
    maxLayerCount: 6,
    maxWindowLayers: 4,
    maxSwapchainWidth: 2048,
    maxSwapchainHeight: 2048,
    reservedNonWindowLayers: 2,
    activeWindowCount: 0,
    activeSwapchainCount: 0,
    activeSwapchainBytes: 0,
    memoryBudgetBytes: 192 * 1024 * 1024,
    lastEndFrameResult: 0,
    lastSwapchainResult: 0,
    initialized: true,
    systemName: 'Meta Quest 3S Mock',
  };

  const fakeNative: QuestPanelNative = {
    isAvailable: () => true,
    getCapabilities: () => mockCaps,
    openWindow: (slot) => {
      calls.push(`open:${slot}`);
      return ++nextOwner;
    },
    statusWindow: () => 1,
    drawWindow: (slot) => calls.push(`draw:${slot}`),
    poseWindow: (slot) => calls.push(`pose:${slot}`),
    hideWindow: (slot) => calls.push(`hide:${slot}`),
    hideAllWindows: () => calls.push('hideAll'),
    open: () => -1,
    status: () => 0,
    draw: () => {},
    hide: () => {},
  };

  const controller = new MultiWindowCompositorController(fakeNative);
  const batcave = BUILTIN_LAYOUT_PRESETS.find((p) => p.presetId === 'batcave-cockpit')!;
  const ctx = {
    projects: SEEDED_PROJECTS,
    activeProjectId: 'pet',
    sessions: SEEDED_SESSIONS,
    activeSessionId: 'add-comments',
    globalTodos: SEEDED_GLOBAL_TODOS,
    notifications: SEEDED_NOTIFICATIONS,
    messagesByScope: {},
    whatsNextLines: [],
    preferences: {
      guidanceStopIndex: 3,
      sassinessStopIndex: 4,
      verbosityStopIndex: 0,
      technicalLevelStopIndex: 3,
      textSpeedStopIndex: 1,
      effortStopIndex: 2,
      reducedMotion: false,
    },
    infieForm: 'mist',
    musicPlaying: false,
    musicTrackIndex: 0,
    selectedPlanTier: 'free' as const,
    storageBackendLabel: 'memory',
    environmentId: 'sim-env-pet',
    environmentName: 'Pet Show & Tell (Simulated)',
    providerKind: 'simulated-local' as const,
    b14Answer: 'newest' as const,
    appPreview: createInitialAppPreviewState(),
    recentEvents: [],
    visibleWindowCount: batcave.windows.length,
    maxWindowLayers: 4,
  };

  const entries = batcave.windows.map((win) => ({
    win,
    surface: buildWindowSurfaceModel({
      win,
      focused: false,
      hovered: false,
      hoveredHitId: null,
      focusedWidgetId: null,
      ctx,
    }),
  }));

  // 5 windows presented on a mock runtime whose maxWindowLayers === 4 -> 4 active, 1 explicit overflow
  const r1 = controller.presentWindows(entries, DEFAULT_COCKPIT_ANCHOR, null);
  assert.equal(Object.keys(r1.slotByWindowId).length, 4);
  assert.equal(r1.overflowWindowIds.length, 1);
  assert.equal(calls.filter((c) => c.startsWith('draw:')).length, 4);

  // Moving window 0 without changing pixels calls poseWindow instead of drawWindow
  calls.length = 0;
  entries[0] = {
    ...entries[0],
    win: { ...entries[0].win, yawDeg: entries[0].win.yawDeg + 15 },
  };
  controller.presentWindows(entries, DEFAULT_COCKPIT_ANCHOR, null);
  assert.equal(calls.filter((c) => c.startsWith('draw:')).length, 0);
  assert.deepEqual(
    calls.filter((c) => c.startsWith('pose:')),
    ['pose:0']
  );

  // Closing window 0 releases slot 0 cleanly while siblings keep their slots
  calls.length = 0;
  controller.presentWindows(entries.slice(1, 4), DEFAULT_COCKPIT_ANCHOR, null);
  assert.ok(calls.includes('hide:0'));
  assert.equal(controller.getSlotForWindow(entries[1].win.windowId), 1);

  controller.dispose();
  assert.ok(calls.includes('hideAll'));

  const holeMat = cockpitHoleMaterials().questCockpitHole;
  assert.equal(holeMat.cullMode, 'Back');
  assert.ok(holeMat.shaderModifiers.fragment.includes('discard;'));
});

test('window surface builds grouped stack/tabs targets and maps angled 3D ray hits to unfocused widgets', () => {
  const batcave = BUILTIN_LAYOUT_PRESETS.find((p) => p.presetId === 'batcave-cockpit')!;
  const leftWin = batcave.windows.find((w) => w.yawDeg < -20 && w.widgetIds.length >= 2)!;
  assert.ok(leftWin);

  const surface = buildWindowSurfaceModel({
    win: leftWin,
    focused: false,
    hovered: false,
    hoveredHitId: null,
    focusedWidgetId: null,
    ctx: {
      projects: SEEDED_PROJECTS,
      activeProjectId: 'pet',
      sessions: SEEDED_SESSIONS,
      activeSessionId: 'add-comments',
      globalTodos: SEEDED_GLOBAL_TODOS,
      notifications: SEEDED_NOTIFICATIONS,
      messagesByScope: {},
      whatsNextLines: [],
      preferences: {
        guidanceStopIndex: 3,
        sassinessStopIndex: 4,
        verbosityStopIndex: 0,
        technicalLevelStopIndex: 3,
        textSpeedStopIndex: 1,
        effortStopIndex: 2,
        reducedMotion: false,
      },
      infieForm: 'mist',
      musicPlaying: false,
      musicTrackIndex: 0,
      selectedPlanTier: 'free',
      storageBackendLabel: 'memory',
      environmentId: 'sim-env-pet',
      environmentName: 'Pet Show & Tell (Simulated)',
      providerKind: 'simulated-local',
      b14Answer: 'newest',
      appPreview: createInitialAppPreviewState(),
      recentEvents: [],
      visibleWindowCount: batcave.windows.length,
      maxWindowLayers: 14,
    },
  });

  // Verify every action button hit target resolves cleanly from world-space projection on an angled window
  const pose = sphericalToWorldPose(DEFAULT_COCKPIT_ANCHOR, leftWin);
  const actionTarget = surface.hitTargets.find((t) => t.id.startsWith('act:'));
  assert.ok(actionTarget);

  const cxPx = actionTarget.x + actionTarget.width * 0.5;
  const cyPx = actionTarget.y + actionTarget.height * 0.5;
  const localX = (cxPx / surface.widthPx - 0.5) * surface.widthM;
  const localY = (0.5 - cyPx / surface.heightPx) * surface.heightM;

  // Transform local quad point by pose quaternion back into world space
  const [px, py, pz, qx, qy, qz, qw] = pose.pose7;
  const tx = 2 * (qy * 0 - qz * localY);
  const ty = 2 * (qz * localX - qx * 0);
  const tz = 2 * (qx * localY - qy * localX);
  const worldHit: [number, number, number] = [
    px + localX + qw * tx + (qy * tz - qz * ty),
    py + localY + qw * ty + (qz * tx - qx * tz),
    pz + qw * tz + (qx * ty - qy * tx),
  ];

  const mappedUv = worldPointToWindowUv(
    worldHit,
    pose.pose7,
    surface.widthM,
    surface.heightM,
    surface.widthPx,
    surface.heightPx
  );
  assert.equal(mappedUv.insideBounds, true);
  const hit = hitTestWindowSurface(surface, mappedUv.u, mappedUv.v);
  assert.equal(hit?.id, actionTarget.id);

  // Rounded corner outside cornerRadiusPx must be rejected
  assert.equal(hitTestWindowSurface(surface, 0.001, 0.001), null);

  // Experimemo project hides Pet Show & Tell B14 buttons and Pet comments on VR surfaces
  const expEmuSurface = buildWindowSurfaceModel({
    win: {
      ...leftWin,
      windowId: 'win-exp-test',
      title: 'Experimemo Preview',
      widgetIds: ['infieChat', 'emuWeb', 'emuAndroid'],
      layoutMode: 'stack',
      activeWidgetId: 'emuWeb',
    },
    focused: true,
    hovered: false,
    hoveredHitId: null,
    focusedWidgetId: 'emuWeb',
    ctx: {
      projects: SEEDED_PROJECTS,
      activeProjectId: 'experimemo',
      sessions: SEEDED_SESSIONS,
      activeSessionId: 'experimemo-session',
      globalTodos: SEEDED_GLOBAL_TODOS,
      notifications: SEEDED_NOTIFICATIONS,
      messagesByScope: {},
      whatsNextLines: [],
      preferences: {
        guidanceStopIndex: 3,
        sassinessStopIndex: 4,
        verbosityStopIndex: 0,
        technicalLevelStopIndex: 3,
        textSpeedStopIndex: 1,
        effortStopIndex: 2,
        reducedMotion: false,
      },
      infieForm: 'mist',
      musicPlaying: false,
      musicTrackIndex: 0,
      selectedPlanTier: 'free',
      storageBackendLabel: 'memory',
      environmentId: 'sim-env-experimemo',
      environmentName: 'Experimemo (Simulated)',
      providerKind: 'simulated-local',
      b14Answer: 'newest',
      appPreview: createInitialAppPreviewState(),
      recentEvents: [],
      visibleWindowCount: 1,
      maxWindowLayers: 14,
    },
  });
  const expActions = expEmuSurface.hitTargets.map((t) => t.id);
  assert.equal(
    expActions.some(
      (id) => id.includes('b14-') || id.includes('emu-post') || id.includes('emu-like')
    ),
    false
  );
});

test('web static preview headers enforce COOP/COEP for SQLite WASM OPFS isolation', () => {
  const headers = createStaticHeaders('.html');
  assert.equal(headers['Cross-Origin-Opener-Policy'], 'same-origin');
  assert.equal(headers['Cross-Origin-Embedder-Policy'], 'require-corp');
});

void LEEK_BEATS_TRACKS;
