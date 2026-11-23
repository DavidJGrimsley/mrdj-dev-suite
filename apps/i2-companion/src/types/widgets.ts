export type CanonicalWidgetId =
  | 'infie3d'
  | 'infieChat'
  | 'workspaceEnv'
  | 'globalTodo'
  | 'explorer'
  | 'projectFolder'
  | 'currentGoal'
  | 'agentTasks'
  | 'humanTesting'
  | 'git'
  | 'widgets'
  | 'terminal'
  | 'eas'
  | 'stylist'
  | 'doctor'
  | 'problems'
  | 'extensions'
  | 'timeline'
  | 'search'
  | 'outline'
  | 'emuWeb'
  | 'emuAndroid'
  | 'emuIos'
  | 'sessions'
  | 'actions'
  | 'library'
  | 'infiePreferences'
  | 'music';

export type WidgetAliasId =
  | CanonicalWidgetId
  | 'currentDiffs'
  | 'goalPlan'
  | 'webPreview'
  | 'environments'
  | 'workspace'
  | 'desktopStream'
  | 'desktopMirror'
  | 'desktop';

export type WidgetCategory = 'core' | 'devTools' | 'diagnostics' | 'emulators';

export interface WidgetCatalogEntry {
  id: CanonicalWidgetId;
  label: string;
  description: string;
  category: WidgetCategory;
  defaultZone: SpatialZone;
  supportsVr: boolean;
  supportsMobile: boolean;
  supportsWeb: boolean;
  requiresCapability?: string;
}

export type SpatialZone = 'center' | 'leftWing' | 'rightWing' | 'bottomShelf' | 'floating';
export type WidgetPresentationMode = 'normal' | 'expanded' | 'fullscreen';
export type VrArrangeMode = 'arc' | 'free';
export type VrPosture = 'standing' | 'seated';
export type WindowGroupLayoutMode = 'grid' | 'stack' | 'tabs';

export interface WindowGroupLayout {
  columns: 1 | 2;
  colWeights?: number[];
  rowWeights?: number[];
}

export interface SpatialWidgetPlacement {
  instanceId: string;
  widgetId: CanonicalWidgetId;
  zone: SpatialZone;
  sortOrder: number;
  visible: boolean;
  mode: WidgetPresentationMode;
  pinned: boolean;
  /** Spherical-cockpit coordinates relative to CockpitAnchor */
  yawDeg: number;
  pitchDeg: number;
  radiusM: number;
  widthM: number;
  heightM: number;
  /** Desktop 2D dock zone mapping */
  dockZone: 'left' | 'right' | 'bottom' | 'center';
  dockWeight: number;
  scrollOffset: number;
  /** Optional persistent parent OpenXR window ID */
  windowId?: string;
}

/**
 * First-class floating OpenXR compositor window.
 * Each visible SpatialWindow maps 1:1 to a sharp OpenXR XrCompositionLayerQuad
 * and holds either a single widget or an ordered group of fully interactive widgets.
 */
export interface SpatialWindow {
  windowId: string;
  title: string;
  zone: SpatialZone;
  sortOrder: number;
  visible: boolean;
  mode: WidgetPresentationMode;
  pinned: boolean;
  yawDeg: number;
  pitchDeg: number;
  radiusM: number;
  widthM: number;
  heightM: number;
  dockZone: 'left' | 'right' | 'bottom' | 'center';
  dockWeight: number;
  layoutMode: WindowGroupLayoutMode;
  groupLayout?: WindowGroupLayout;
  widgetIds: CanonicalWidgetId[];
  activeWidgetId?: CanonicalWidgetId;
  scrollOffsets: Record<string, number>;
}

export interface SpatialLayoutPreset {
  presetId: string;
  name: string;
  description: string;
  isBuiltin: boolean;
  builtinRevision: number;
  arrangeMode: VrArrangeMode;
  posture: VrPosture;
  schemaVersion: number;
  windows: SpatialWindow[];
  /** Backward-compatible projection & 3D Infie actor placement */
  widgets: SpatialWidgetPlacement[];
  updatedAt: number;
}

export type LayoutRouteScope = 'home' | `project:${string}` | `session:${string}`;
