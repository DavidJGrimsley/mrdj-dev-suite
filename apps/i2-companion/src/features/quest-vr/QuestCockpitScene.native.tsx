import {
  ViroAmbientLight,
  ViroBox,
  ViroDirectionalLight,
  ViroMaterials,
  ViroNode,
  ViroQuad,
  ViroScene,
  ViroText,
  exitVRScene,
} from '@reactvision/react-viro';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { questInputNative } from '../../../modules/quest-input/src';
import { questPanelNative } from '../../../modules/quest-panel/src';
import { DEMO_AUTH_EMAIL, DEMO_AUTH_PASSWORD } from '../../data/seeded-workspace';
import { WIDGET_CATALOG } from '../../data/widget-catalog';
import { companionStore, useCompanionStore } from '../../stores/companion-store';
import { connectionStore } from '../../stores/connection-store';
import { infieStore, useInfieStore } from '../../stores/infie-store';
import { layoutStore, useLayoutStore } from '../../stores/layout-store';
import { questRuntime, type QuestRuntimeSnapshot } from '../../stores/quest-runtime-store';
import {
  DEVICE_TUTORIAL_STEPS,
  tutorialStore,
  useTutorialStore,
} from '../../stores/tutorial-store';
import { ensureQuestFontsRegistered } from '../../theme/font-assets';
import type { InfieFormState } from '../../types/infie';
import type { SessionStageAction } from '../../types/providers';
import type { CanonicalWidgetId, SpatialWindow, WidgetCategory } from '../../types/widgets';
import { InfieViroActor } from '../infie/InfieStage.native';
import {
  COMFORT_LIMITS,
  clampNumber,
  sphericalToWorldPose,
  worldPosToSpherical,
  type Vec3,
} from '../spatial/cockpit-math';
import { resolveWindowGroupLayout } from '../spatial/window-group-layout';
import { SpatialWindowPanel } from './SpatialWindowPanel.native';
import {
  MultiWindowCompositorController,
  cockpitHoleMaterials,
  type CompositorOverlayFrame,
} from './quest-cockpit-compositor';
import {
  QuestRawInputTracker,
  isAcceptedControllerRaySource,
  selectHandForSource,
  type QuestRawSampleFrame,
} from './quest-input-adapter';
import {
  buildAuthWindowSurfaceModel,
  buildTutorialWindowSurfaceModel,
  buildWindowSurfaceModel,
  type WindowRenderDataContext,
  type WindowSurfaceHitTarget,
  type WindowSurfaceModel,
} from './quest-window-surface';

let materialsRegistered = false;
function ensureMaterials() {
  if (materialsRegistered) return;
  ViroMaterials.createMaterials(cockpitHoleMaterials());
  materialsRegistered = true;
}

const INFIE_FORMS: readonly InfieFormState[] = ['mist', 'glyph', 'surge', 'compile', 'controller'];
const KEY_ROWS: readonly (readonly string[])[] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

type VrDrawerMode = 'none' | 'widgets' | 'layouts';

interface ActiveRayDrag {
  mode: 'move' | 'resize';
  windowId: string;
  source: number;
  startRayYawDeg: number;
  startRayPitchDeg: number;
  startYawDeg: number;
  startPitchDeg: number;
  startRadiusM: number;
  startWidthM: number;
  startHeightM: number;
}

function rayDirectionAnglesDeg(dir: Vec3): { yawDeg: number; pitchDeg: number } {
  const yawDeg = (Math.atan2(dir[0], -dir[2]) * 180) / Math.PI;
  const pitchDeg = (Math.asin(clampNumber(dir[1], -0.99, 0.99, 0)) * 180) / Math.PI;
  return { yawDeg, pitchDeg };
}

function normalizeDegDelta(delta: number): number {
  let d = delta;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export default function QuestCockpitScene() {
  ensureMaterials();

  const session = useCompanionStore((s) => s.session);
  const prototypeLimit = useCompanionStore((s) => s.prototypeLimit);
  const environmentId = useCompanionStore((s) => s.environmentId);
  const environmentName = useCompanionStore((s) => s.environmentName);
  const providerKind = useCompanionStore((s) => s.providerKind);
  const projects = useCompanionStore((s) => s.projects);
  const sessions = useCompanionStore((s) => s.sessions);
  const activeProjectId = useCompanionStore((s) => s.activeProjectId);
  const activeSessionId = useCompanionStore((s) => s.activeSessionId);
  const globalTodos = useCompanionStore((s) => s.globalTodos);
  const notifications = useCompanionStore((s) => s.notifications);
  const messagesByScope = useCompanionStore((s) => s.messagesByScope);
  const whatsNextLines = useCompanionStore((s) => s.whatsNextLines);
  const b14Answer = useCompanionStore((s) => s.b14Answer);
  const appPreview = useCompanionStore((s) => s.appPreview);
  const recentEvents = useCompanionStore((s) => s.recentEvents);
  const preferences = useCompanionStore((s) => s.preferences);
  const musicPlaying = useCompanionStore((s) => s.musicPlaying);
  const musicTrackIndex = useCompanionStore((s) => s.musicTrackIndex);
  const selectedPlanTier = useCompanionStore((s) => s.selectedPlanTier);
  const storageBackendLabel = useCompanionStore((s) => s.storageBackendLabel);

  const presets = useLayoutStore((s) => s.presets);
  const activePresetId = useLayoutStore(
    (s) => s.activePresetByScope[s.currentScope] ?? 'minimal-infie-emu'
  );
  const focusedWindowId = useLayoutStore((s) => s.focusedWindowId);
  const focusedWidgetId = useLayoutStore((s) => s.focusedWidgetId);
  const maxWindowLayers = useLayoutStore((s) => s.maxWindowLayers);
  const lastLayerLimitNotice = useLayoutStore((s) => s.lastLayerLimitNotice);
  const anchor = useLayoutStore((s) => s.anchor);

  const infieForm = useInfieStore((s) => s.machine.targetForm);

  const [hoveredWindowId, setHoveredWindowId] = useState<string | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    mode: 'move' | 'resize';
    windowId?: string;
    widgetId?: 'infie3d';
    yawDeg?: number;
    pitchDeg?: number;
    radiusM?: number;
    widthM?: number;
    heightM?: number;
  } | null>(null);

  const [drawer, setDrawer] = useState<VrDrawerMode>('none');
  const [galleryCat, setGalleryCat] = useState<'all' | WidgetCategory>('all');
  const [galleryPage, setGalleryPage] = useState(0);
  const [galleryAddTarget, setGalleryAddTarget] = useState<'new' | 'focused'>('new');
  const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>(undefined);
  const [homeSurfaceMode, setHomeSurfaceMode] = useState<'home' | 'chat'>('home');
  const [emulatorTarget, setEmulatorTarget] = useState<'web' | 'android' | 'ios'>('web');
  const [authError, setAuthError] = useState<string | null>(null);
  const [layoutNameDraft, setLayoutNameDraft] = useState('My Custom Layout');
  const activeTutorialId = useTutorialStore((s) => s.activeTutorialId);
  const activeStepIndex = useTutorialStore((s) => s.activeStepIndex);
  const tutorialSteps = DEVICE_TUTORIAL_STEPS.quest;
  const activeTutorialStep =
    activeTutorialId && tutorialSteps[activeStepIndex] ? tutorialSteps[activeStepIndex] : null;

  useEffect(() => {
    void ensureQuestFontsRegistered();
    questPanelNative?.setDiagnosticsEnabled?.(true);
  }, []);
  const [compositorMode, setCompositorMode] = useState<
    'ready' | 'pending' | 'slow' | 'unavailable'
  >('pending');
  const [slotByWindowId, setSlotByWindowId] = useState<Record<string, number>>({});
  const [overflowWindowIds, setOverflowWindowIds] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<QuestRuntimeSnapshot['capabilities']>(null);

  const headOriginRef = useRef<readonly [number, number, number]>([0, 0, 0]);
  const headYawRef = useRef<number>(0);
  const rawFrameRef = useRef<QuestRawSampleFrame | null>(null);
  const activeRayDragRef = useRef<ActiveRayDrag | null>(null);
  const dragPreviewRef = useRef<typeof dragState>(null);
  const focusedTargetRef = useRef<{ windowId: string | null; widgetId: CanonicalWidgetId | null }>({
    windowId: null,
    widgetId: null,
  });

  const [infieDragStartPos, setInfieDragStartPos] = useState<Vec3 | null>(null);
  const infieLastDragPosRef = useRef<Vec3 | null>(null);

  useEffect(() => {
    dragPreviewRef.current = dragState;
  }, [dragState]);

  const preset = useMemo(
    () => presets.find((p) => p.presetId === activePresetId) ?? presets[0],
    [presets, activePresetId]
  );

  const infiePlacement = useMemo(
    () => preset.widgets.find((w) => w.visible && w.widgetId === 'infie3d') ?? null,
    [preset]
  );

  const visibleWindows = useMemo(() => {
    const base = preset.windows.filter((w) => w.visible).sort((a, b) => a.sortOrder - b.sortOrder);
    if (!dragState || !dragState.windowId) return base;
    return base.map((w) => {
      if (w.windowId !== dragState.windowId) return w;
      return {
        ...w,
        ...(dragState.yawDeg !== undefined ? { yawDeg: dragState.yawDeg } : {}),
        ...(dragState.pitchDeg !== undefined ? { pitchDeg: dragState.pitchDeg } : {}),
        ...(dragState.radiusM !== undefined ? { radiusM: dragState.radiusM } : {}),
        ...(dragState.widthM !== undefined ? { widthM: dragState.widthM } : {}),
        ...(dragState.heightM !== undefined ? { heightM: dragState.heightM } : {}),
      };
    });
  }, [preset, dragState]);

  const focusedWindow = useMemo(
    () => visibleWindows.find((w) => w.windowId === focusedWindowId) ?? visibleWindows[0] ?? null,
    [visibleWindows, focusedWindowId]
  );

  const renderCtx = useMemo<WindowRenderDataContext>(
    () => ({
      projects,
      activeProjectId,
      sessions,
      activeSessionId,
      globalTodos,
      notifications,
      messagesByScope,
      whatsNextLines,
      preferences,
      infieForm,
      musicPlaying,
      musicTrackIndex,
      selectedPlanTier,
      storageBackendLabel,
      environmentId,
      environmentName,
      providerKind,
      b14Answer,
      appPreview,
      recentEvents,
      selectedFilePath,
      visibleWindowCount: visibleWindows.length,
      maxWindowLayers,
      userDisplayName: session?.displayName,
      homeSurfaceMode,
      emulatorTarget,
    }),
    [
      projects,
      activeProjectId,
      sessions,
      activeSessionId,
      globalTodos,
      notifications,
      messagesByScope,
      whatsNextLines,
      preferences,
      infieForm,
      musicPlaying,
      musicTrackIndex,
      selectedPlanTier,
      storageBackendLabel,
      environmentId,
      environmentName,
      providerKind,
      b14Answer,
      appPreview,
      recentEvents,
      selectedFilePath,
      visibleWindows.length,
      maxWindowLayers,
      session?.displayName,
      homeSurfaceMode,
      emulatorTarget,
    ]
  );

  const authVirtualWin: SpatialWindow = useMemo(
    () => ({
      windowId: 'win-vr-auth',
      title: 'Sign in to i²',
      zone: 'center',
      sortOrder: 0,
      visible: true,
      mode: 'normal',
      pinned: true,
      yawDeg: 0,
      pitchDeg: -2,
      radiusM: 1.38,
      widthM: 0.82,
      heightM: 0.66,
      dockZone: 'center',
      dockWeight: 1,
      layoutMode: 'stack',
      widgetIds: ['infieChat'],
      activeWidgetId: 'infieChat',
      scrollOffsets: {},
    }),
    []
  );

  const authSurfaceModel = useMemo(
    () =>
      buildAuthWindowSurfaceModel({
        email: DEMO_AUTH_EMAIL,
        passwordMasked: '••••••••••••',
        errorMessage: authError,
      }),
    [authError]
  );

  const tutorialVirtualWin: SpatialWindow = useMemo(
    () => ({
      windowId: 'win-vr-tutorial',
      title: 'i² Guide',
      zone: 'center',
      sortOrder: 99,
      visible: true,
      mode: 'normal',
      pinned: true,
      yawDeg: 0,
      pitchDeg: 22,
      radiusM: 1.38,
      widthM: 0.72,
      heightM: 0.28,
      dockZone: 'center',
      dockWeight: 1,
      layoutMode: 'stack',
      widgetIds: ['infieChat'],
      activeWidgetId: 'infieChat',
      scrollOffsets: {},
    }),
    []
  );

  const tutorialSurfaceModel = useMemo(
    () =>
      activeTutorialStep
        ? buildTutorialWindowSurfaceModel({
            title: activeTutorialStep.title,
            body: activeTutorialStep.body,
            stepIndex: activeStepIndex,
            totalSteps: tutorialSteps.length,
          })
        : null,
    [activeTutorialStep, activeStepIndex, tutorialSteps.length]
  );

  const modalBlockingWindows = drawer !== 'none' || Boolean(prototypeLimit);

  const windowSurfaces = useMemo(() => {
    const map: Record<string, WindowSurfaceModel> = {};
    const maxW = capabilities?.maxSwapchainWidth ?? 2048;
    const maxH = capabilities?.maxSwapchainHeight ?? 2048;
    for (const win of visibleWindows) {
      map[win.windowId] = buildWindowSurfaceModel({
        win,
        focused: focusedWindow?.windowId === win.windowId,
        hovered: hoveredWindowId === win.windowId,
        hoveredHitId: hoveredWindowId === win.windowId ? hoveredTargetId : null,
        focusedWidgetId,
        ctx: renderCtx,
        maxSwapchainWidth: maxW,
        maxSwapchainHeight: maxH,
      });
    }
    return map;
  }, [
    visibleWindows,
    focusedWindow,
    hoveredWindowId,
    hoveredTargetId,
    focusedWidgetId,
    renderCtx,
    capabilities,
  ]);

  const compositorRef = useRef<MultiWindowCompositorController | null>(null);
  const syncWindowSurfacesRef = useRef<() => void>(() => {});

  const syncWindowSurfaces = useCallback(() => {
    const compositor = compositorRef.current;
    if (!compositor) return;
    const rt = questRuntime.getSnapshot();
    if (rt.vrActivityState !== 'resumed' && rt.vrActivityState !== 'unknown') {
      compositor.hideAllOneFrameSafe();
      return;
    }

    const activeWindowEntries =
      drawer !== 'none' || prototypeLimit
        ? []
        : !session
          ? [{ win: authVirtualWin, surface: authSurfaceModel }]
          : [
              ...visibleWindows.map((win) => ({
                win,
                surface: windowSurfaces[win.windowId],
              })),
              ...(tutorialSurfaceModel
                ? [{ win: tutorialVirtualWin, surface: tutorialSurfaceModel }]
                : []),
            ];

    const overlay: CompositorOverlayFrame | null = prototypeLimit
      ? {
          label: 'overlay',
          widthPx: 1024,
          heightPx: 540,
          widthM: 0.96,
          heightM: 0.52,
          pose: sphericalToWorldPose(anchor, { yawDeg: 0, pitchDeg: 4, radiusM: 1.12 }).pose7,
          ops: [
            { op: 'roundRect', x: 0, y: 0, width: 1024, height: 540, radius: 28, color: '#1c1208' },
            {
              op: 'strokeRect',
              x: 4,
              y: 4,
              width: 1016,
              height: 532,
              radius: 26,
              strokeWidth: 4,
              color: '#f59e0b',
            },
            {
              op: 'text',
              text: `PROTOTYPE LIMIT · ${prototypeLimit.featureName}`,
              x: 44,
              y: 44,
              size: 32,
              color: '#fcd34d',
              bold: true,
              maxWidth: 936,
            },
            {
              op: 'text',
              text: prototypeLimit.description,
              x: 44,
              y: 128,
              size: 25,
              color: '#f8fafc',
              maxWidth: 936,
            },
            {
              op: 'text',
              text: 'Press B, Menu, or click Dismiss below',
              x: 44,
              y: 460,
              size: 22,
              color: '#5eead4',
              bold: true,
              maxWidth: 936,
            },
          ],
        }
      : null;

    const report = compositor.presentWindows(activeWindowEntries, anchor, overlay);
    setCompositorMode((prev) => (prev === report.status ? prev : report.status));
    setSlotByWindowId((prev) => {
      const nextKeys = Object.keys(report.slotByWindowId);
      const prevKeys = Object.keys(prev);
      if (
        nextKeys.length === prevKeys.length &&
        nextKeys.every((k) => prev[k] === report.slotByWindowId[k])
      ) {
        return prev;
      }
      return report.slotByWindowId;
    });
    setOverflowWindowIds((prev) =>
      prev.length === report.overflowWindowIds.length &&
      prev.every((v, i) => v === report.overflowWindowIds[i])
        ? prev
        : report.overflowWindowIds
    );
    setCapabilities((prev) =>
      prev &&
      prev.maxWindowLayers === report.capabilities.maxWindowLayers &&
      prev.activeWindowCount === report.capabilities.activeWindowCount &&
      prev.activeSwapchainBytes === report.capabilities.activeSwapchainBytes
        ? prev
        : report.capabilities
    );
    questRuntime.setCompositorStatus(report.status === 'pending' ? 'idle' : report.status);
    questRuntime.setCapabilities(report.capabilities);
    if (report.capabilities.maxWindowLayers > 0) {
      layoutStore.getState().setMaxWindowLayers(report.capabilities.maxWindowLayers);
    }
  }, [session, drawer, prototypeLimit, visibleWindows, windowSurfaces, anchor]);

  useEffect(() => {
    focusedTargetRef.current = {
      windowId: focusedWindow?.windowId ?? null,
      widgetId: focusedWidgetId,
    };
  }, [focusedWindow, focusedWidgetId]);

  useEffect(() => {
    syncWindowSurfacesRef.current = syncWindowSurfaces;
    const t = setTimeout(() => syncWindowSurfacesRef.current(), 0);
    return () => clearTimeout(t);
  }, [syncWindowSurfaces]);

  useEffect(() => {
    questRuntime.sceneMounted();
    const compositor = new MultiWindowCompositorController(questPanelNative);
    compositorRef.current = compositor;
    const inputTracker = new QuestRawInputTracker();

    const caps = compositor.queryCapabilities();
    questRuntime.setCapabilities(caps);
    if (caps.maxWindowLayers > 0) {
      layoutStore.getState().setMaxWindowLayers(caps.maxWindowLayers);
    }

    const mountSyncTimer = setTimeout(() => syncWindowSurfacesRef.current(), 0);

    const interval = setInterval(() => {
      const epoch = questPanelNative?.refSpaceEpoch?.() ?? 0;
      if (epoch !== layoutStore.getState().anchor.refSpaceEpoch) {
        layoutStore.getState().handleRefSpaceEpoch(epoch, {
          origin: headOriginRef.current,
          yawDeg: headYawRef.current,
        });
      }

      const { frame, edges } = inputTracker.poll(questInputNative);
      rawFrameRef.current = frame;

      // Update or release ray-driven Move/Resize session directly from OpenXR aim pose
      const activeDrag = activeRayDragRef.current;
      if (activeDrag) {
        const hand = selectHandForSource(frame, activeDrag.source);
        const triggerHeld = hand ? hand.triggerValue > 0.42 : false;
        if (edges.trackingLostSustained || !triggerHeld) {
          const finalPreview = dragPreviewRef.current;
          activeRayDragRef.current = null;
          setDragState(null);
          if (finalPreview?.windowId) {
            if (activeDrag.mode === 'move') {
              void layoutStore.getState().moveWindowPose(
                finalPreview.windowId,
                {
                  yawDeg: finalPreview.yawDeg,
                  pitchDeg: finalPreview.pitchDeg,
                  radiusM: finalPreview.radiusM,
                },
                { freeform: true }
              );
            } else if (
              activeDrag.mode === 'resize' &&
              finalPreview.widthM !== undefined &&
              finalPreview.heightM !== undefined
            ) {
              void layoutStore
                .getState()
                .resizeWindow(finalPreview.windowId, finalPreview.widthM, finalPreview.heightM);
            }
          }
        } else if (hand?.aimDirection) {
          const curAngles = rayDirectionAnglesDeg(hand.aimDirection);
          const dYaw = normalizeDegDelta(curAngles.yawDeg - activeDrag.startRayYawDeg);
          const dPitch = curAngles.pitchDeg - activeDrag.startRayPitchDeg;
          const stickDepthDelta = Math.abs(hand.stickY) > 0.25 ? -hand.stickY * 0.035 : 0;
          activeDrag.startRadiusM = clampNumber(
            activeDrag.startRadiusM + stickDepthDelta,
            COMFORT_LIMITS.minRadiusM,
            COMFORT_LIMITS.maxRadiusM,
            1.48
          );

          if (activeDrag.mode === 'move') {
            setDragState({
              mode: 'move',
              windowId: activeDrag.windowId,
              yawDeg: clampNumber(
                activeDrag.startYawDeg + dYaw,
                COMFORT_LIMITS.minYawDeg,
                COMFORT_LIMITS.maxYawDeg,
                0
              ),
              pitchDeg: clampNumber(
                activeDrag.startPitchDeg + dPitch,
                COMFORT_LIMITS.minPitchDeg,
                COMFORT_LIMITS.maxPitchDeg,
                0
              ),
              radiusM: activeDrag.startRadiusM,
            });
          } else {
            const dWidthM = ((dYaw * Math.PI) / 180) * activeDrag.startRadiusM * 1.4;
            const dHeightM = ((-dPitch * Math.PI) / 180) * activeDrag.startRadiusM * 1.4;
            setDragState({
              mode: 'resize',
              windowId: activeDrag.windowId,
              widthM: clampNumber(
                activeDrag.startWidthM + dWidthM,
                COMFORT_LIMITS.minWidthM,
                COMFORT_LIMITS.maxWidthM,
                0.96
              ),
              heightM: clampNumber(
                activeDrag.startHeightM + dHeightM,
                COMFORT_LIMITS.minHeightM,
                COMFORT_LIMITS.maxHeightM,
                0.72
              ),
            });
          }
        }
      }

      if (edges.trackingLostSustained) {
        setHoveredWindowId(null);
        setHoveredTargetId(null);
      }

      const focusTarget = focusedTargetRef.current;
      if (
        edges.rightStickScrollDelta !== 0 &&
        !activeDrag &&
        focusTarget.windowId &&
        focusTarget.widgetId
      ) {
        layoutStore
          .getState()
          .scrollWindowWidget(
            focusTarget.windowId,
            focusTarget.widgetId,
            edges.rightStickScrollDelta
          );
      }

      if (edges.secondaryDismissEdge) {
        if (companionStore.getState().prototypeLimit) {
          companionStore.getState().dismissPrototypeLimit();
        } else if (layoutStore.getState().lastLayerLimitNotice) {
          layoutStore.getState().clearLayerLimitNotice();
        } else {
          setDrawer('none');
        }
      }

      syncWindowSurfacesRef.current();
    }, 50);

    return () => {
      clearTimeout(mountSyncTimer);
      clearInterval(interval);
      compositor.dispose();
      compositorRef.current = null;
      questRuntime.sceneUnmounted();
    };
  }, []);

  const startRayDrag = useCallback(
    (win: SpatialWindow, mode: 'move' | 'resize', source?: number) => {
      const src = typeof source === 'number' ? source : 1;
      const hand = selectHandForSource(rawFrameRef.current, src);
      const angles = hand?.aimDirection
        ? rayDirectionAnglesDeg(hand.aimDirection)
        : { yawDeg: win.yawDeg, pitchDeg: win.pitchDeg };
      layoutStore.getState().setFocusedWindow(win.windowId);
      activeRayDragRef.current = {
        mode,
        windowId: win.windowId,
        source: src,
        startRayYawDeg: angles.yawDeg,
        startRayPitchDeg: angles.pitchDeg,
        startYawDeg: win.yawDeg,
        startPitchDeg: win.pitchDeg,
        startRadiusM: win.radiusM,
        startWidthM: win.widthM,
        startHeightM: win.heightM,
      };
      setDragState({
        mode,
        windowId: win.windowId,
        yawDeg: win.yawDeg,
        pitchDeg: win.pitchDeg,
        radiusM: win.radiusM,
        widthM: win.widthM,
        heightM: win.heightM,
      });
    },
    []
  );

  const executeWidgetAction = useCallback(
    (win: SpatialWindow, hit: WindowSurfaceHitTarget | null) => {
      layoutStore.getState().setFocusedWindow(win.windowId);
      if (!hit) return;

      if (hit.widgetId === '__window__') {
        if (hit.actionId === 'auth-sign-in') {
          void companionStore
            .getState()
            .signIn(DEMO_AUTH_EMAIL, DEMO_AUTH_PASSWORD)
            .then((res) => {
              if (!res.ok) setAuthError(res.error);
              else setAuthError(null);
            });
          return;
        }
        if (hit.actionId === 'tutorial-next') {
          void tutorialStore.getState().nextStep();
          return;
        }
        if (hit.actionId === 'tutorial-skip') {
          void tutorialStore.getState().dismissTutorial();
          return;
        }
        if (hit.actionId === 'toggle-group-columns') {
          const curCols = resolveWindowGroupLayout(win).columns;
          void layoutStore
            .getState()
            .setWindowGroupLayout(win.windowId, { columns: curCols === 2 ? 1 : 2 });
          return;
        }
        if (hit.actionId.startsWith('adjust-split:')) {
          const [, axisRaw, idxRaw, deltaRaw] = hit.actionId.split(':');
          const axis = axisRaw === 'row' ? 'row' : 'col';
          const index = Number(idxRaw) || 0;
          const delta = Number(deltaRaw) || 0;
          void layoutStore.getState().adjustWindowGroupSplit(win.windowId, axis, index, delta);
          return;
        }
        if (hit.actionId === 'win-layout-mode') {
          void layoutStore
            .getState()
            .setWindowLayoutMode(win.windowId, win.layoutMode === 'tabs' ? 'stack' : 'tabs');
          return;
        }
        if (hit.actionId.startsWith('select-tab:')) {
          const targetWidget = hit.actionId.slice('select-tab:'.length) as CanonicalWidgetId;
          void layoutStore.getState().setWindowActiveWidget(win.windowId, targetWidget);
          return;
        }
        return;
      }

      const wid = hit.widgetId;
      void layoutStore.getState().setWindowActiveWidget(win.windowId, wid);

      if (hit.actionId === 'focus-widget') return;
      if (hit.actionId === 'remove-widget') {
        void layoutStore.getState().removeWidget(wid);
        return;
      }
      if (hit.actionId === 'ungroup-widget') {
        void layoutStore.getState().ungroupWidgetToNewWindow(win.windowId, wid);
        return;
      }
      if (hit.actionId === 'reorder-up') {
        void layoutStore.getState().reorderWidgetInWindow(win.windowId, wid, 'up');
        return;
      }

      // Per-widget independent state & actions (works even when triggered directly on an unfocused window)
      if (hit.actionId === 'env-pet') {
        void companionStore.getState().selectEnvironment('sim-env-pet', 'quest-vr');
      } else if (hit.actionId === 'env-exp') {
        void companionStore.getState().selectEnvironment('sim-env-experimemo', 'quest-vr');
      } else if (hit.actionId === 'stage-next') {
        const curSess = companionStore.getState().sessions.find((s) => s.id === activeSessionId);
        const allDone =
          Boolean(curSess?.humanTests.length) && Boolean(curSess?.humanTests.every((t) => t.done));
        const nextAct: SessionStageAction =
          curSess?.status === 'PLAN REVIEW'
            ? 'approve-plan'
            : curSess?.status === 'WAITING ON TEST'
              ? 'test-app'
              : curSess?.status === 'NEEDS YOU'
                ? 'verify-testing'
                : curSess?.status === 'VERIFIED'
                  ? 'open-pr'
                  : curSess?.status === 'PR OPEN'
                    ? 'merge-pr'
                    : curSess?.status === 'MERGED'
                      ? 'submit-report'
                      : 'reset-demo';
        if (curSess?.status === 'NEEDS YOU' && !allDone) {
          companionStore.getState().showPrototypeLimit({
            featureName: 'Complete Human Testing First',
            subtitle: 'Session Verification Gate',
            description:
              'Check off all Human Testing items before advancing this simulated session to VERIFIED / PR OPEN.',
            environmentNote: companionStore.getState().honestStatusNote,
          });
        } else {
          void companionStore.getState().advanceSessionStage(activeSessionId, nextAct, 'quest-vr');
        }
      } else if (hit.actionId === 'open-boundary-host') {
        connectionStore.getState().setProviderKind('local-host');
      } else if (hit.actionId === 'b14-newest') {
        void companionStore.getState().answerB14Question('add-comments', 'newest', 'quest-vr');
      } else if (hit.actionId === 'b14-oldest') {
        void companionStore.getState().answerB14Question('add-comments', 'oldest', 'quest-vr');
      } else if (hit.actionId === 'scan-next') {
        companionStore.getState().runWhatsNextScan('quest-vr');
      } else if (hit.actionId === 'toggle-form') {
        const next = INFIE_FORMS[(INFIE_FORMS.indexOf(infieForm) + 1) % INFIE_FORMS.length];
        infieStore.getState().setForm(next);
      } else if (hit.actionId === 'toggle-motion') {
        void companionStore
          .getState()
          .setPreferences({ reducedMotion: !preferences.reducedMotion });
      } else if (hit.actionId === 'cycle-tier') {
        const order = ['free', 'pro', 'team'] as const;
        companionStore
          .getState()
          .setPlanTier(order[(order.indexOf(selectedPlanTier) + 1) % order.length]);
      } else if (hit.actionId === 'toggle-home-mode') {
        setHomeSurfaceMode((prev: 'home' | 'chat') => (prev === 'home' ? 'chat' : 'home'));
      } else if (hit.actionId === 'home-whats-next') {
        companionStore.getState().runWhatsNextScan('quest-vr');
      } else if (hit.actionId === 'home-pet-action') {
        const petSession = sessions.find((s) => s.id === 'add-comments') ?? sessions[0];
        if (petSession) {
          companionStore.getState().selectProject('pet', 'quest-vr');
          companionStore.getState().selectSession(petSession.id, 'quest-vr');
          if (petSession.status === 'PLAN REVIEW') {
            void companionStore
              .getState()
              .advanceSessionStage(petSession.id, 'approve-plan', 'quest-vr');
          } else if (petSession.status === 'WAITING ON TEST') {
            void companionStore
              .getState()
              .advanceSessionStage(petSession.id, 'test-app', 'quest-vr');
          } else if (petSession.status === 'NEEDS YOU') {
            const firstOpen = petSession.humanTests.find((t) => !t.done);
            if (firstOpen) {
              void companionStore
                .getState()
                .toggleHumanTest(petSession.id, firstOpen.id, 'quest-vr');
            }
          }
        }
      } else if (hit.actionId === 'generate-expo-project') {
        void companionStore
          .getState()
          .sendChatMessage(
            `project:${activeProjectId}`,
            'Scaffold a new Expo project from the local i² Home generator.',
            'quest-vr'
          );
      } else if (hit.actionId === 'import-project') {
        companionStore.getState().importFieldNotesDemo('quest-vr');
      } else if (hit.actionId.startsWith('emu-target:')) {
        const nextTarget = hit.actionId.slice('emu-target:'.length) as 'web' | 'android' | 'ios';
        setEmulatorTarget(nextTarget);
      } else if (hit.actionId === 'emu-reload') {
        void companionStore
          .getState()
          .sendChatMessage(
            `project:${activeProjectId}`,
            'Reload simulated Emulator Canvas.',
            'quest-vr'
          );
      } else if (hit.actionId === 'emu-like') {
        const leadId = companionStore.getState().appPreview.comments[0]?.id ?? '__first__';
        void companionStore.getState().togglePreviewReaction(leadId, 'like', 'quest-vr');
      } else if (hit.actionId === 'emu-love') {
        const leadId = companionStore.getState().appPreview.comments[0]?.id ?? '__first__';
        void companionStore.getState().togglePreviewReaction(leadId, 'love', 'quest-vr');
      } else if (hit.actionId === 'emu-post') {
        void companionStore
          .getState()
          .postPreviewComment('Checked Pet comments from Quest VR!', 'quest-vr', 'Quest Tester');
      } else if (hit.actionId === 'emu-branch') {
        const order = ['main', 'test', 'session'] as const;
        const cur = companionStore.getState().appPreview.targetBranch;
        const next = order[(order.indexOf(cur) + 1) % order.length];
        void companionStore.getState().setPreviewTarget(next, 'quest-vr');
      } else if (hit.actionId.startsWith('toggle-agent:')) {
        const taskId = hit.actionId.slice('toggle-agent:'.length);
        void companionStore.getState().toggleAgentTask(activeSessionId, taskId, 'quest-vr');
      } else if (hit.actionId.startsWith('toggle-human:')) {
        const testId = hit.actionId.slice('toggle-human:'.length);
        void companionStore.getState().toggleHumanTest(activeSessionId, testId, 'quest-vr');
      } else if (hit.actionId.startsWith('toggle-todo:')) {
        const todoId = hit.actionId.slice('toggle-todo:'.length);
        void companionStore.getState().toggleGlobalTodo(todoId, 'quest-vr');
      } else if (hit.actionId === 'add-todo') {
        void companionStore
          .getState()
          .addGlobalTodo(
            `VR verification check (${visibleWindows.length} OpenXR win)`,
            activeProjectId,
            'quest-vr'
          );
      } else if (hit.actionId.startsWith('select-project:')) {
        companionStore
          .getState()
          .selectProject(hit.actionId.slice('select-project:'.length), 'quest-vr');
      } else if (hit.actionId.startsWith('select-session:')) {
        companionStore
          .getState()
          .selectSession(hit.actionId.slice('select-session:'.length), 'quest-vr');
      } else if (hit.actionId.startsWith('select-file:')) {
        setSelectedFilePath(hit.actionId.slice('select-file:'.length));
      } else if (hit.actionId === 'music-toggle') {
        companionStore.getState().toggleMusic();
      } else if (hit.actionId === 'music-next') {
        companionStore.getState().nextTrack();
      } else if (hit.actionId === 'import-field-notes') {
        companionStore.getState().importFieldNotesDemo('quest-vr');
      } else if (hit.actionId === 'create-experimemo') {
        companionStore.getState().createExperimemoDemo('Experimemo VR', 'quest-vr');
      } else if (hit.actionId === 'open-drawer-widgets') {
        setDrawer('widgets');
      } else if (hit.actionId === 'open-drawer-layouts') {
        setDrawer('layouts');
      } else if (hit.actionId === 'git-stage-note' || hit.actionId === 'term-run') {
        void companionStore
          .getState()
          .sendChatMessage(
            `session:${activeSessionId}`,
            hit.actionId === 'git-stage-note'
              ? 'Summarize git diff status in simulated workspace.'
              : 'Run simulated workspace doctor status.',
            'quest-vr',
            'Quest'
          );
      }
    },
    [
      activeProjectId,
      activeSessionId,
      infieForm,
      preferences.reducedMotion,
      selectedPlanTier,
      visibleWindows.length,
    ]
  );

  const infiePose = useMemo(
    () =>
      infiePlacement
        ? sphericalToWorldPose(anchor, infiePlacement)
        : { position: [0, 0.42, -1.65] as const, rotationDeg: [0, 0, 0] as const },
    [anchor, infiePlacement]
  );

  const filteredGallery = useMemo(
    () => WIDGET_CATALOG.filter((entry) => galleryCat === 'all' || entry.category === galleryCat),
    [galleryCat]
  );
  const pageCount = Math.max(1, Math.ceil(filteredGallery.length / 8));
  const safePage = Math.min(galleryPage, pageCount - 1);
  const pagedGallery = filteredGallery.slice(safePage * 8, safePage * 8 + 8);
  const activeWidgetIdSet = useMemo(() => {
    const s = new Set<CanonicalWidgetId>();
    for (const w of visibleWindows) {
      for (const id of w.widgetIds) s.add(id);
    }
    return s;
  }, [visibleWindows]);

  const handleRecenter = () => {
    layoutStore
      .getState()
      .recenterCockpit(headOriginRef.current, headYawRef.current, 'solo', anchor.refSpaceEpoch);
  };

  const budgetMbUsed = Math.round((capabilities?.activeSwapchainBytes ?? 0) / (1024 * 1024));
  const budgetMbMax = Math.round(
    (capabilities?.memoryBudgetBytes ?? 192 * 1024 * 1024) / (1024 * 1024)
  );

  return (
    <ViroScene
      onCameraTransformUpdate={(evt) => {
        const pos = evt.position;
        if (Array.isArray(pos) && pos.length === 3) {
          headOriginRef.current = [pos[0], pos[1], pos[2]];
        }
        const rot = evt.rotation;
        if (Array.isArray(rot) && rot.length >= 2) {
          headYawRef.current = rot[1];
        }
      }}>
      <ViroAmbientLight color="#8be9dc" intensity={340} />
      <ViroDirectionalLight color="#ffffff" direction={[0.3, -1, -0.5]} intensity={650} />
      <ViroDirectionalLight color="#2dd4bf" direction={[-0.4, 0.5, 0.4]} intensity={400} />

      {/* Calm backdrop horizon (Batcave pillars appear only in explicit Batcave preset) */}
      {preset.presetId === 'batcave-cockpit' ? (
        <ViroNode renderingOrder={-10} ignoreEventHandling>
          <ViroBox
            position={[0, -1.08, 0]}
            width={10}
            height={0.04}
            length={10}
            materials={['questBatcaveFloor']}
          />
          <ViroBox
            position={[0, -1.05, -1.5]}
            width={3.6}
            height={0.02}
            length={0.04}
            materials={['questBatcaveRing']}
          />
          {([-3.2, -1.6, 1.6, 3.2] as const).map((px) => (
            <ViroBox
              key={px}
              position={[px, 0.2, -3.4]}
              width={0.14}
              height={2.8}
              length={0.14}
              materials={['questBatcavePillar']}
            />
          ))}
        </ViroNode>
      ) : null}

      {/* Signed-Out Auth Panel inside VR (OpenXR sharp panel + fallback) */}
      {!session ? (
        compositorMode !== 'unavailable' &&
        slotByWindowId[authVirtualWin.windowId] !== undefined ? (
          <SpatialWindowPanel
            key={authVirtualWin.windowId}
            win={authVirtualWin}
            slotIndex={slotByWindowId[authVirtualWin.windowId]}
            anchor={anchor}
            focused
            hovered={hoveredWindowId === authVirtualWin.windowId}
            draggingMode={null}
            overflow={false}
            holeEnabled={drawer === 'none' && !prototypeLimit}
            surface={authSurfaceModel}
            hoveredTargetId={hoveredWindowId === authVirtualWin.windowId ? hoveredTargetId : null}
            onHoverWindow={(hovering, hit) => {
              if (!hovering) {
                if (hoveredWindowId === authVirtualWin.windowId) {
                  setHoveredWindowId(null);
                  setHoveredTargetId(null);
                }
                return;
              }
              setHoveredWindowId(authVirtualWin.windowId);
              setHoveredTargetId(hit?.id ?? null);
            }}
            onActivateSurfaceHit={(hit) => executeWidgetAction(authVirtualWin, hit)}
            onStartRayMove={() => {}}
            onStartRayResize={() => {}}
            onResizeBy={() => {}}
            onNudgeDepth={() => {}}
            onCycleMode={() => {}}
            onCloseWindow={() => {}}
          />
        ) : (
          <ViroNode position={[0, 0.05, -1.35]}>
            <ViroQuad width={0.86} height={0.56} materials={['questPanelBodyFocused']} />
            <ViroText
              text="Sign in to i²"
              position={[0, 0.14, 0.015]}
              width={0.76}
              height={0.12}
              style={{ fontSize: 22, color: '#ffffff', fontWeight: '700', textAlign: 'center' }}
            />
            <ViroText
              text="Access Infie, Projects, and Emulators inside VR."
              position={[0, 0.02, 0.015]}
              width={0.76}
              height={0.12}
              style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center' }}
            />
            <ViroNode position={[0, -0.14, 0.02]}>
              <ViroBox
                width={0.46}
                height={0.1}
                length={0.02}
                materials={['questBtnTeal']}
                onClick={(_pos, source) => {
                  if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
                  void companionStore.getState().signIn(DEMO_AUTH_EMAIL, DEMO_AUTH_PASSWORD);
                }}
              />
              <ViroText
                text="Sign In to i² Workspace"
                position={[0, 0, 0.016]}
                width={0.44}
                height={0.08}
                style={{
                  fontSize: 15,
                  color: '#061413',
                  fontWeight: '700',
                  textAlign: 'center',
                  textAlignVertical: 'center',
                }}
              />
            </ViroNode>
          </ViroNode>
        )
      ) : null}

      {/* PrototypeLimit Dismiss Chrome (pair with OpenXR overlay layer) */}
      {session && prototypeLimit ? (
        <ViroNode position={[0, -0.25, -1.08]} renderingOrder={25}>
          <ViroBox
            width={0.38}
            height={0.085}
            length={0.02}
            materials={['questBtnTeal']}
            onClick={(_pos, source) => {
              if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
              companionStore.getState().dismissPrototypeLimit();
            }}
          />
          <ViroText
            text="Dismiss Prototype Notice"
            position={[0, 0, 0.015]}
            width={0.36}
            height={0.07}
            style={{
              fontSize: 15,
              color: '#042f2e',
              fontWeight: '700',
              textAlign: 'center',
              textAlignVertical: 'center',
            }}
          />
        </ViroNode>
      ) : null}

      {/* True 3D Infie Actor (movable & scalable via infie3d placement) */}
      {infiePlacement ? (
        <ViroNode>
          <ViroNode
            position={
              dragState?.widgetId === 'infie3d' && infieDragStartPos
                ? [infieDragStartPos[0], infieDragStartPos[1], infieDragStartPos[2]]
                : [infiePose.position[0], infiePose.position[1] + 0.44, infiePose.position[2]]
            }
            rotation={[
              infiePose.rotationDeg[0],
              infiePose.rotationDeg[1],
              infiePose.rotationDeg[2],
            ]}
            dragType="FixedDistanceOrigin"
            onDrag={(dragToPos, source) => {
              if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
              const center: Vec3 = [dragToPos[0], dragToPos[1] - 0.44, dragToPos[2]];
              infieLastDragPosRef.current = center;
              const sph = worldPosToSpherical(anchor, center);
              setDragState({ mode: 'move', widgetId: 'infie3d', ...sph });
            }}
            onClickState={(clickState, _pos, source) => {
              if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
              if (clickState === 1) {
                setInfieDragStartPos([
                  infiePose.position[0],
                  infiePose.position[1] + 0.44,
                  infiePose.position[2],
                ]);
                infieLastDragPosRef.current = infiePose.position;
                setDragState({ mode: 'move', widgetId: 'infie3d' });
              } else if (clickState === 2 || clickState === 3) {
                const finalPos = infieLastDragPosRef.current;
                setInfieDragStartPos(null);
                infieLastDragPosRef.current = null;
                setDragState(null);
                if (finalPos) {
                  void layoutStore
                    .getState()
                    .moveWidgetPose('infie3d', worldPosToSpherical(anchor, finalPos), {
                      freeform: true,
                    });
                }
              }
            }}>
            <ViroBox width={0.28} height={0.048} length={0.016} materials={['questPanelHeader']} />
            <ViroText
              text={`MOVE · Infie 3D (${infieForm.toUpperCase()})`}
              position={[0, 0, 0.012]}
              width={0.27}
              height={0.042}
              style={{
                fontSize: 12,
                color: '#5eead4',
                fontWeight: '700',
                textAlign: 'center',
                textAlignVertical: 'center',
              }}
            />
          </ViroNode>

          <InfieViroActor
            position={[infiePose.position[0], infiePose.position[1], infiePose.position[2]]}
            scale={[infiePlacement.widthM, infiePlacement.widthM, infiePlacement.widthM]}
          />
        </ViroNode>
      ) : null}

      {/* Floating OpenXR Compositor Windows (1 distinct XrCompositionLayerQuad per visible window) */}
      {session
        ? visibleWindows.map((win) => {
            const slotIdx = slotByWindowId[win.windowId];
            const isOverflow = overflowWindowIds.includes(win.windowId);
            const surface = windowSurfaces[win.windowId];
            if (!surface) return null;
            const holeEnabled =
              !modalBlockingWindows &&
              !isOverflow &&
              slotIdx !== undefined &&
              compositorMode !== 'unavailable';

            return (
              <SpatialWindowPanel
                key={win.windowId}
                win={win}
                slotIndex={slotIdx}
                anchor={anchor}
                focused={focusedWindow?.windowId === win.windowId}
                hovered={hoveredWindowId === win.windowId}
                draggingMode={dragState?.windowId === win.windowId ? dragState.mode : null}
                overflow={isOverflow}
                holeEnabled={holeEnabled}
                surface={surface}
                hoveredTargetId={hoveredWindowId === win.windowId ? hoveredTargetId : null}
                onHoverWindow={(hovering, hit) => {
                  if (!hovering) {
                    if (hoveredWindowId === win.windowId) {
                      setHoveredWindowId(null);
                      setHoveredTargetId(null);
                    }
                    return;
                  }
                  setHoveredWindowId(win.windowId);
                  setHoveredTargetId(hit?.id ?? null);
                }}
                onActivateSurfaceHit={(hit) => executeWidgetAction(win, hit)}
                onStartRayMove={(source) => startRayDrag(win, 'move', source)}
                onStartRayResize={(source) => startRayDrag(win, 'resize', source)}
                onResizeBy={(dw, dh) =>
                  void layoutStore.getState().resizeWindowBy(win.windowId, dw, dh)
                }
                onNudgeDepth={(dr) =>
                  void layoutStore.getState().nudgeWindowPose(win.windowId, { radiusM: dr })
                }
                onCycleMode={() =>
                  void layoutStore
                    .getState()
                    .setWindowMode(win.windowId, win.mode === 'normal' ? 'expanded' : 'normal')
                }
                onCloseWindow={() => void layoutStore.getState().closeWindow(win.windowId)}
                onMergeIntoFocused={
                  focusedWindow && focusedWindow.windowId !== win.windowId
                    ? () =>
                        void layoutStore
                          .getState()
                          .mergeWindows(win.windowId, focusedWindow.windowId)
                    : undefined
                }
              />
            );
          })
        : null}

      {session &&
      tutorialSurfaceModel &&
      drawer === 'none' &&
      !prototypeLimit &&
      slotByWindowId[tutorialVirtualWin.windowId] !== undefined ? (
        <SpatialWindowPanel
          key={tutorialVirtualWin.windowId}
          win={tutorialVirtualWin}
          slotIndex={slotByWindowId[tutorialVirtualWin.windowId]}
          anchor={anchor}
          focused={false}
          hovered={hoveredWindowId === tutorialVirtualWin.windowId}
          draggingMode={null}
          overflow={false}
          holeEnabled={compositorMode !== 'unavailable'}
          surface={tutorialSurfaceModel}
          hoveredTargetId={hoveredWindowId === tutorialVirtualWin.windowId ? hoveredTargetId : null}
          onHoverWindow={(hovering, hit) => {
            if (!hovering) {
              if (hoveredWindowId === tutorialVirtualWin.windowId) {
                setHoveredWindowId(null);
                setHoveredTargetId(null);
              }
              return;
            }
            setHoveredWindowId(tutorialVirtualWin.windowId);
            setHoveredTargetId(hit?.id ?? null);
          }}
          onActivateSurfaceHit={(hit) => executeWidgetAction(tutorialVirtualWin, hit)}
          onStartRayMove={() => {}}
          onStartRayResize={() => {}}
          onResizeBy={() => {}}
          onNudgeDepth={() => {}}
          onCycleMode={() => {}}
          onCloseWindow={() => void tutorialStore.getState().dismissTutorial()}
        />
      ) : null}

      {/* In-VR Floating + Windows & Widgets Gallery Drawer */}
      {session && drawer === 'widgets' ? (
        <ViroNode position={[0, 0.08, -1.04]} renderingOrder={20}>
          <ViroQuad width={1.38} height={0.96} materials={['questPanelBodyFocused']} />
          <ViroText
            text={`OpenXR Windows & Widgets · ${visibleWindows.length}/${maxWindowLayers} Layers (${activeWidgetIdSet.size} widgets)`}
            position={[-0.14, 0.42, 0.015]}
            width={0.96}
            height={0.055}
            style={{ fontSize: 17, color: '#5eead4', fontWeight: '700', textAlign: 'left' }}
          />
          <ViroNode position={[0.58, 0.42, 0.015]}>
            <ViroBox
              width={0.14}
              height={0.055}
              length={0.016}
              materials={['questBtnRose']}
              onClick={(_pos, source) => {
                if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
                setDrawer('none');
              }}
            />
            <ViroText
              text="Close"
              position={[0, 0, 0.012]}
              width={0.13}
              height={0.045}
              style={{
                fontSize: 14,
                color: '#ffffff',
                fontWeight: '700',
                textAlign: 'center',
                textAlignVertical: 'center',
              }}
            />
          </ViroNode>

          {/* Add Target Mode: New OpenXR Window vs Group Into Focused Window */}
          <ViroNode position={[-0.3, 0.34, 0.015]}>
            <ViroBox
              width={0.56}
              height={0.052}
              length={0.014}
              materials={[galleryAddTarget === 'new' ? 'questBtnTeal' : 'questBtnDark']}
              onClick={(_pos, source) => {
                if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
                setGalleryAddTarget('new');
              }}
            />
            <ViroText
              text={`Mode: Add New OpenXR Window`}
              position={[0, 0, 0.011]}
              width={0.52}
              height={0.044}
              style={{
                fontSize: 13,
                color: galleryAddTarget === 'new' ? '#042f2e' : '#e2e8f0',
                fontWeight: '700',
                textAlign: 'center',
                textAlignVertical: 'center',
              }}
            />
          </ViroNode>
          <ViroNode position={[0.3, 0.34, 0.015]}>
            <ViroBox
              width={0.56}
              height={0.052}
              length={0.014}
              materials={[galleryAddTarget === 'focused' ? 'questBtnTeal' : 'questBtnDark']}
              onClick={(_pos, source) => {
                if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
                setGalleryAddTarget('focused');
              }}
            />
            <ViroText
              text={`Mode: Group Into "${focusedWindow?.title?.slice(0, 14) ?? 'None'}"`}
              position={[0, 0, 0.011]}
              width={0.52}
              height={0.044}
              style={{
                fontSize: 13,
                color: galleryAddTarget === 'focused' ? '#042f2e' : '#e2e8f0',
                fontWeight: '700',
                textAlign: 'center',
                textAlignVertical: 'center',
              }}
            />
          </ViroNode>

          {/* Category Filter Row */}
          {(
            [
              { id: 'all', label: 'All (28)', x: -0.46 },
              { id: 'core', label: 'Core', x: -0.22 },
              { id: 'devTools', label: 'DevTools', x: 0.02 },
              { id: 'diagnostics', label: 'Diag', x: 0.26 },
              { id: 'emulators', label: 'Previews', x: 0.5 },
            ] as const
          ).map((cat) => (
            <ViroNode key={cat.id} position={[cat.x, 0.26, 0.015]}>
              <ViroBox
                width={0.21}
                height={0.048}
                length={0.014}
                materials={[galleryCat === cat.id ? 'questBtnTeal' : 'questBtnDark']}
                onClick={(_pos, source) => {
                  if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
                  setGalleryCat(cat.id);
                  setGalleryPage(0);
                }}
              />
              <ViroText
                text={cat.label}
                position={[0, 0, 0.011]}
                width={0.2}
                height={0.04}
                style={{
                  fontSize: 12,
                  color: galleryCat === cat.id ? '#042f2e' : '#e2e8f0',
                  fontWeight: '700',
                  textAlign: 'center',
                  textAlignVertical: 'center',
                }}
              />
            </ViroNode>
          ))}

          {/* 2x4 Widget Grid */}
          {pagedGallery.map((entry, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const x = col === 0 ? -0.31 : 0.31;
            const y = 0.145 - row * 0.115;
            const enabled = activeWidgetIdSet.has(entry.id);
            const inFocused = focusedWindow?.widgetIds.includes(entry.id) ?? false;
            return (
              <ViroNode key={entry.id} position={[x, y, 0.015]}>
                <ViroBox
                  width={0.58}
                  height={0.095}
                  length={0.016}
                  materials={[enabled ? 'questPanelHeaderDragging' : 'questBtnDark']}
                  onClick={(_pos, source) => {
                    if (typeof source === 'number' && !isAcceptedControllerRaySource(source))
                      return;
                    if (galleryAddTarget === 'focused' && focusedWindow) {
                      if (inFocused) {
                        void layoutStore.getState().removeWidget(entry.id);
                      } else {
                        void layoutStore
                          .getState()
                          .groupWidgetIntoWindow(focusedWindow.windowId, entry.id);
                      }
                    } else if (enabled) {
                      void layoutStore.getState().removeWidget(entry.id);
                    } else {
                      void layoutStore.getState().addWindow([entry.id]);
                    }
                  }}
                />
                <ViroText
                  text={`${enabled ? (inFocused ? 'IN FOCUSED' : '✓ ACTIVE') : '+ ADD'} · ${entry.label}`}
                  position={[0, 0, 0.012]}
                  width={0.54}
                  height={0.075}
                  maxLines={2}
                  style={{
                    fontSize: 13,
                    color: '#f8fafc',
                    fontWeight: '700',
                    textAlign: 'left',
                    textAlignVertical: 'center',
                  }}
                />
              </ViroNode>
            );
          })}

          {lastLayerLimitNotice ? (
            <ViroText
              text={lastLayerLimitNotice}
              position={[0, -0.31, 0.015]}
              width={1.24}
              height={0.06}
              style={{ fontSize: 13, color: '#fcd34d', fontWeight: '700', textAlign: 'center' }}
            />
          ) : null}

          {/* Pagination */}
          <ViroNode position={[0, -0.4, 0.015]}>
            <ViroBox
              position={[-0.22, 0, 0]}
              width={0.18}
              height={0.052}
              length={0.014}
              materials={['questBtnDark']}
              onClick={(_pos, source) => {
                if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
                setGalleryPage((p) => Math.max(0, p - 1));
              }}
            />
            <ViroText
              text="◀ Prev"
              position={[-0.22, 0, 0.012]}
              width={0.16}
              height={0.044}
              style={{
                fontSize: 13,
                color: '#e2e8f0',
                textAlign: 'center',
                textAlignVertical: 'center',
              }}
            />
            <ViroText
              text={`Page ${safePage + 1} / ${pageCount}`}
              position={[0, 0, 0.012]}
              width={0.22}
              height={0.044}
              style={{
                fontSize: 13,
                color: '#5eead4',
                textAlign: 'center',
                textAlignVertical: 'center',
              }}
            />
            <ViroBox
              position={[0.22, 0, 0]}
              width={0.18}
              height={0.052}
              length={0.014}
              materials={['questBtnDark']}
              onClick={(_pos, source) => {
                if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
                setGalleryPage((p) => Math.min(pageCount - 1, p + 1));
              }}
            />
            <ViroText
              text="Next ▶"
              position={[0.22, 0, 0.012]}
              width={0.16}
              height={0.044}
              style={{
                fontSize: 13,
                color: '#e2e8f0',
                textAlign: 'center',
                textAlignVertical: 'center',
              }}
            />
          </ViroNode>
        </ViroNode>
      ) : null}

      {/* In-VR Floating Named Layout Manager + VR Keyboard */}
      {session && drawer === 'layouts' ? (
        <ViroNode position={[0, 0.08, -1.04]} renderingOrder={20}>
          <ViroQuad width={1.36} height={0.94} materials={['questPanelBodyFocused']} />
          <ViroText
            text={`Saved Spatial Layouts (${presets.length}) · Arrange: ${preset.arrangeMode.toUpperCase()} · ${preset.posture.toUpperCase()}`}
            position={[-0.14, 0.41, 0.015]}
            width={0.96}
            height={0.06}
            style={{ fontSize: 16, color: '#5eead4', fontWeight: '700', textAlign: 'left' }}
          />
          <ViroNode position={[0.58, 0.41, 0.015]}>
            <ViroBox
              width={0.14}
              height={0.056}
              length={0.016}
              materials={['questBtnRose']}
              onClick={(_pos, source) => {
                if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
                setDrawer('none');
              }}
            />
            <ViroText
              text="Close"
              position={[0, 0, 0.012]}
              width={0.13}
              height={0.048}
              style={{
                fontSize: 14,
                color: '#ffffff',
                fontWeight: '700',
                textAlign: 'center',
                textAlignVertical: 'center',
              }}
            />
          </ViroNode>

          {presets.slice(0, 6).map((p, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const x = col === 0 ? -0.32 : 0.32;
            const y = 0.3 - row * 0.08;
            const isActive = p.presetId === preset.presetId;
            return (
              <ViroNode key={p.presetId} position={[x, y, 0.015]}>
                <ViroBox
                  position={[-0.04, 0, 0]}
                  width={0.5}
                  height={0.064}
                  length={0.014}
                  materials={[isActive ? 'questBtnTeal' : 'questBtnDark']}
                  onClick={(_pos, source) => {
                    if (typeof source === 'number' && !isAcceptedControllerRaySource(source))
                      return;
                    void layoutStore.getState().switchPreset(p.presetId);
                  }}
                />
                <ViroText
                  text={`${p.name} (${p.windows.filter((w) => w.visible).length} win)`}
                  position={[-0.04, 0, 0.012]}
                  width={0.48}
                  height={0.054}
                  maxLines={1}
                  style={{
                    fontSize: 13,
                    color: isActive ? '#042f2e' : '#f8fafc',
                    fontWeight: '700',
                    textAlign: 'center',
                    textAlignVertical: 'center',
                  }}
                />
                {!p.isBuiltin ? (
                  <ViroNode position={[0.25, 0, 0]}>
                    <ViroBox
                      width={0.065}
                      height={0.064}
                      length={0.014}
                      materials={['questBtnRose']}
                      onClick={(_pos, source) => {
                        if (typeof source === 'number' && !isAcceptedControllerRaySource(source))
                          return;
                        void layoutStore.getState().deleteCustomPreset(p.presetId);
                      }}
                    />
                    <ViroText
                      text="×"
                      position={[0, 0, 0.012]}
                      width={0.06}
                      height={0.05}
                      style={{
                        fontSize: 15,
                        color: '#ffffff',
                        textAlign: 'center',
                        textAlignVertical: 'center',
                      }}
                    />
                  </ViroNode>
                ) : null}
              </ViroNode>
            );
          })}

          <ViroNode position={[0, 0.05, 0.015]}>
            <ViroQuad
              position={[-0.22, 0, 0]}
              width={0.78}
              height={0.064}
              materials={['questPanelHeader']}
            />
            <ViroText
              text={`Name: ${layoutNameDraft || '(type below)'}`}
              position={[-0.22, 0, 0.01]}
              width={0.74}
              height={0.054}
              style={{
                fontSize: 14,
                color: '#f8fafc',
                textAlign: 'left',
                textAlignVertical: 'center',
              }}
            />
            <ViroBox
              position={[0.31, 0, 0]}
              width={0.22}
              height={0.064}
              length={0.016}
              materials={['questBtnTeal']}
              onClick={(_pos, source) => {
                if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
                void layoutStore.getState().saveAsNewPreset(layoutNameDraft || 'VR Custom');
              }}
            />
            <ViroText
              text="Save As New"
              position={[0.31, 0, 0.012]}
              width={0.21}
              height={0.052}
              style={{
                fontSize: 13,
                color: '#042f2e',
                fontWeight: '700',
                textAlign: 'center',
                textAlignVertical: 'center',
              }}
            />
            <ViroBox
              position={[0.54, 0, 0]}
              width={0.19}
              height={0.064}
              length={0.016}
              materials={['questBtnAmber']}
              onClick={(_pos, source) => {
                if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
                if (!preset.isBuiltin) {
                  void layoutStore.getState().overwriteCustomPreset(preset.presetId);
                } else {
                  void layoutStore.getState().resetActivePresetToDefault();
                }
              }}
            />
            <ViroText
              text={preset.isBuiltin ? 'Reset' : 'Update'}
              position={[0.54, 0, 0.012]}
              width={0.18}
              height={0.052}
              style={{
                fontSize: 13,
                color: '#ffffff',
                fontWeight: '700',
                textAlign: 'center',
                textAlignVertical: 'center',
              }}
            />
          </ViroNode>

          {KEY_ROWS.map((row, rIdx) =>
            row.map((ch, cIdx) => {
              const x = (cIdx - (row.length - 1) / 2) * 0.092;
              const y = -0.045 - rIdx * 0.072;
              return (
                <ViroNode key={ch} position={[x, y, 0.015]}>
                  <ViroBox
                    width={0.08}
                    height={0.058}
                    length={0.012}
                    materials={['questBtnDark']}
                    onClick={(_pos, source) => {
                      if (typeof source === 'number' && !isAcceptedControllerRaySource(source))
                        return;
                      setLayoutNameDraft((s) => (s + ch).slice(0, 24));
                    }}
                  />
                  <ViroText
                    text={ch}
                    position={[0, 0, 0.01]}
                    width={0.075}
                    height={0.05}
                    style={{
                      fontSize: 14,
                      color: '#e2e8f0',
                      textAlign: 'center',
                      textAlignVertical: 'center',
                    }}
                  />
                </ViroNode>
              );
            })
          )}

          {(
            [
              {
                id: 'space',
                label: 'Space',
                x: -0.45,
                fn: () => setLayoutNameDraft((s) => (s + ' ').slice(0, 24)),
              },
              {
                id: 'back',
                label: 'Bksp',
                x: -0.22,
                fn: () => setLayoutNameDraft((s) => s.slice(0, -1)),
              },
              { id: 'clear', label: 'Clear', x: 0.0, fn: () => setLayoutNameDraft('') },
              {
                id: 'chip1',
                label: 'Batcave 2',
                x: 0.24,
                fn: () => setLayoutNameDraft('Batcave 2'),
              },
              {
                id: 'chip2',
                label: 'Dev Cave',
                x: 0.48,
                fn: () => setLayoutNameDraft('Dev Cave'),
              },
            ] as const
          ).map((k) => (
            <ViroNode key={k.id} position={[k.x, -0.35, 0.015]}>
              <ViroBox
                width={0.2}
                height={0.058}
                length={0.012}
                materials={['questBtnDark']}
                onClick={(_pos, source) => {
                  if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
                  k.fn();
                }}
              />
              <ViroText
                text={k.label}
                position={[0, 0, 0.01]}
                width={0.19}
                height={0.05}
                style={{
                  fontSize: 13,
                  color: '#5eead4',
                  textAlign: 'center',
                  textAlignVertical: 'center',
                }}
              />
            </ViroNode>
          ))}
        </ViroNode>
      ) : null}

      {/* Slim Oculus-Style Room Bottom Navigation Bar */}
      <ViroNode position={[0, -0.49, -1.16]} rotation={[-22, 0, 0]}>
        <ViroBox
          position={[0.11, 0, -0.014]}
          width={1.56}
          height={0.115}
          length={0.016}
          materials={['questDockBackdrop']}
        />
        {(
          [
            {
              id: 'nav-home',
              label: 'i² Home',
              x: -0.54,
              active: homeSurfaceMode === 'home' && drawer === 'none',
              tone: 'mint' as const,
              fn: () => {
                setDrawer('none');
                setHomeSurfaceMode('home');
                const infieWin = visibleWindows.find((w) => w.widgetIds.includes('infieChat'));
                if (infieWin) {
                  layoutStore.getState().setFocusedWindow(infieWin.windowId);
                } else {
                  void layoutStore.getState().switchPreset('minimal-infie-emu');
                }
              },
            },
            {
              id: 'nav-emu',
              label: 'Emulators',
              x: -0.32,
              active: drawer === 'none' && focusedWindow?.widgetIds.includes('emuWeb') === true,
              tone: 'teal' as const,
              fn: () => {
                setDrawer('none');
                const emuWin = visibleWindows.find((w) => w.widgetIds.includes('emuWeb'));
                if (emuWin) {
                  layoutStore.getState().setFocusedWindow(emuWin.windowId);
                } else {
                  void layoutStore.getState().addWindow(['emuWeb']);
                }
              },
            },
            {
              id: 'nav-widgets',
              label: 'Widgets',
              x: -0.1,
              active: drawer === 'widgets',
              tone: 'teal' as const,
              fn: () => setDrawer((d) => (d === 'widgets' ? 'none' : 'widgets')),
            },
            {
              id: 'nav-layouts',
              label: 'Layouts',
              x: 0.12,
              active: drawer === 'layouts',
              tone: 'teal' as const,
              fn: () => setDrawer((d) => (d === 'layouts' ? 'none' : 'layouts')),
            },
            {
              id: 'nav-infie',
              label: 'Infie',
              x: 0.34,
              active: false,
              tone: 'dark' as const,
              fn: () => {
                const next = INFIE_FORMS[(INFIE_FORMS.indexOf(infieForm) + 1) % INFIE_FORMS.length];
                infieStore.getState().setForm(next);
              },
            },
            {
              id: 'nav-recenter',
              label: 'Recenter',
              x: 0.56,
              active: false,
              tone: 'dark' as const,
              fn: undefined,
            },
          ] as const
        ).map((btn) => (
          <ViroNode key={btn.id} position={[btn.x, 0, 0]}>
            <ViroBox
              width={0.2}
              height={0.072}
              length={0.016}
              materials={[
                btn.active
                  ? btn.tone === 'mint'
                    ? 'questBtnMint'
                    : 'questBtnTeal'
                  : 'questBtnDark',
              ]}
              onClick={(_pos, source) => {
                if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
                if (btn.id === 'nav-recenter') handleRecenter();
                else btn.fn();
              }}
            />
            <ViroText
              text={btn.label}
              position={[0, 0, 0.014]}
              width={0.19}
              height={0.06}
              maxLines={1}
              style={{
                fontSize: 13,
                color: btn.active ? '#061413' : '#f8fafc',
                fontWeight: '700',
                textAlign: 'center',
                textAlignVertical: 'center',
              }}
            />
          </ViroNode>
        ))}
        {/* Compact Exit VR pill on far right */}
        <ViroNode position={[0.78, 0, 0]}>
          <ViroBox
            width={0.16}
            height={0.072}
            length={0.016}
            materials={['questBtnRose']}
            onClick={(_pos, source) => {
              if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
              questRuntime.vrActivityStateChanged('finishing', true);
              exitVRScene?.();
            }}
          />
          <ViroText
            text="Exit VR"
            position={[0, 0, 0.014]}
            width={0.15}
            height={0.06}
            maxLines={1}
            style={{
              fontSize: 13,
              color: '#fff1f2',
              fontWeight: '700',
              textAlign: 'center',
              textAlignVertical: 'center',
            }}
          />
        </ViroNode>
      </ViroNode>
    </ViroScene>
  );
}
