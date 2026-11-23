import type {
  ChatMessage,
  GlobalTodoItem,
  InfiePreferences,
  NotificationItem,
  ProjectRecord,
  SessionRecord,
  SimulatedAppPreviewState,
} from '../../types/companion.ts';
import type { EnvironmentEvent, EnvironmentProviderKind } from '../../types/providers.ts';
import type { CanonicalWidgetId } from '../../types/widgets.ts';
import type { Pose7, Vec3 } from '../spatial/cockpit-math.ts';

export const FONT_DISPLAY_REGULAR = 'SpaceGrotesk-Regular';
export const FONT_DISPLAY_MEDIUM = 'SpaceGrotesk-Medium';
export const FONT_DISPLAY_BOLD = 'SpaceGrotesk-Bold';
export const FONT_BODY_REGULAR = 'RoundedMplus1c-Regular';
export const FONT_BODY_MEDIUM = 'RoundedMplus1c-Medium';
export const FONT_BODY_BOLD = 'RoundedMplus1c-Bold';

export const I2_PALETTE = {
  backdrop: '#0a0814',
  card: '#0b131d',
  cardBorder: '#1d2838',
  surfaceMuted: '#111926',
  teal: '#2dd4bf',
  tealDark: '#06201d',
  mint: '#abefa3',
  mintDark: '#061413',
  amber: '#fbbf24',
  rose: '#fb7185',
  emuToolbar: '#252323',
  emuCanvas: '#2a2828',
  emuPill: '#373434',
  petCream: '#f7f5ef',
  petForest: '#234e38',
  petBorder: '#e2dcd0',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#8b9ab0',
  textFaint: '#64748b',
} as const;

export interface SurfaceGradient {
  type?: 'linear' | 'radial';
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
  cx?: number;
  cy?: number;
  r?: number;
  colors: string[];
  stops?: number[];
}

export interface WindowSurfaceHitTarget {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  widgetId: CanonicalWidgetId | '__window__';
  actionId: string;
  label: string;
}

export interface WindowSurfaceModel {
  windowId: string;
  widthPx: number;
  heightPx: number;
  bucketWidthPx: number;
  bucketHeightPx: number;
  widthM: number;
  heightM: number;
  cornerRadiusPx: number;
  ops: Record<string, unknown>[];
  hitTargets: WindowSurfaceHitTarget[];
}

export interface WindowRenderDataContext {
  projects: readonly ProjectRecord[];
  activeProjectId: string;
  sessions: readonly SessionRecord[];
  activeSessionId: string;
  globalTodos: readonly GlobalTodoItem[];
  notifications: readonly NotificationItem[];
  messagesByScope: Record<string, ChatMessage[]>;
  whatsNextLines: readonly string[];
  preferences: InfiePreferences;
  infieForm: string;
  musicPlaying: boolean;
  musicTrackIndex: number;
  selectedPlanTier: 'free' | 'pro' | 'team';
  storageBackendLabel: string;
  environmentId: string;
  environmentName: string;
  providerKind: EnvironmentProviderKind;
  b14Answer: 'newest' | 'oldest' | null;
  appPreview: SimulatedAppPreviewState;
  recentEvents: readonly EnvironmentEvent[];
  selectedFilePath?: string;
  visibleWindowCount: number;
  maxWindowLayers: number;
  userDisplayName?: string;
  homeSurfaceMode?: 'home' | 'chat';
  emulatorTarget?: 'web' | 'android' | 'ios';
}

export interface SurfaceUvResult {
  u: number;
  v: number;
  px: number;
  py: number;
  insideBounds: boolean;
  localX: number;
  localY: number;
  localZ: number;
}

function rotateByConjQuat(v: Vec3, q: readonly [number, number, number, number]): Vec3 {
  const [vx, vy, vz] = v;
  const [qx, qy, qz, qw] = [-q[0], -q[1], -q[2], q[3]];
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

function rotateByQuat(v: Vec3, q: readonly [number, number, number, number]): Vec3 {
  const [vx, vy, vz] = v;
  const [qx, qy, qz, qw] = q;
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

/**
 * Maps a 3D world-space hit point on a SpatialWindow's ViroQuad into surface UV (0..1)
 * and pixel coordinates (0..widthPx, 0..heightPx), matching OpenXR quad top-left origin.
 */
export function worldPointToWindowUv(
  worldPoint: Vec3,
  pose7: Pose7,
  widthM: number,
  heightM: number,
  widthPx: number,
  heightPx: number
): SurfaceUvResult {
  const dx = worldPoint[0] - pose7[0];
  const dy = worldPoint[1] - pose7[1];
  const dz = worldPoint[2] - pose7[2];
  const [localX, localY, localZ] = rotateByConjQuat(
    [dx, dy, dz],
    [pose7[3], pose7[4], pose7[5], pose7[6]]
  );
  const u = localX / Math.max(0.05, widthM) + 0.5;
  const v = 0.5 - localY / Math.max(0.05, heightM);
  return {
    u,
    v,
    px: u * widthPx,
    py: v * heightPx,
    insideBounds: u >= 0 && u <= 1 && v >= 0 && v <= 1,
    localX,
    localY,
    localZ,
  };
}

/**
 * Intersects an OpenXR controller aim ray with a floating window's finite or infinite plane.
 */
export function intersectRayWithWindowPlane(
  rayOrigin: Vec3,
  rayDir: Vec3,
  pose7: Pose7,
  widthM: number,
  heightM: number,
  widthPx: number,
  heightPx: number
): { worldPoint: Vec3; distanceM: number; uv: SurfaceUvResult } | null {
  const planeCenter: Vec3 = [pose7[0], pose7[1], pose7[2]];
  const planeNormal = rotateByQuat([0, 0, 1], [pose7[3], pose7[4], pose7[5], pose7[6]]);
  const denom =
    rayDir[0] * planeNormal[0] + rayDir[1] * planeNormal[1] + rayDir[2] * planeNormal[2];
  if (Math.abs(denom) < 1e-4) return null;

  const t =
    ((planeCenter[0] - rayOrigin[0]) * planeNormal[0] +
      (planeCenter[1] - rayOrigin[1]) * planeNormal[1] +
      (planeCenter[2] - rayOrigin[2]) * planeNormal[2]) /
    denom;
  if (t <= 0.05 || t > 14) return null;

  const hit: Vec3 = [
    rayOrigin[0] + rayDir[0] * t,
    rayOrigin[1] + rayDir[1] * t,
    rayOrigin[2] + rayDir[2] * t,
  ];
  const uv = worldPointToWindowUv(hit, pose7, widthM, heightM, widthPx, heightPx);
  return { worldPoint: hit, distanceM: t, uv };
}

export function isPointInsideRoundedSurface(
  px: number,
  py: number,
  widthPx: number,
  heightPx: number,
  cornerRadiusPx: number
): boolean {
  if (px < 0 || py < 0 || px > widthPx || py > heightPx) return false;
  const r = Math.min(cornerRadiusPx, widthPx * 0.45, heightPx * 0.45);
  if (r <= 0) return true;
  const cx = px < r ? r - px : px > widthPx - r ? px - (widthPx - r) : 0;
  const cy = py < r ? r - py : py > heightPx - r ? py - (heightPx - r) : 0;
  if (cx > 0 && cy > 0) {
    return cx * cx + cy * cy <= r * r;
  }
  return true;
}

export function hitTestWindowSurface(
  model: Pick<WindowSurfaceModel, 'widthPx' | 'heightPx' | 'cornerRadiusPx' | 'hitTargets'>,
  u: number,
  v: number
): WindowSurfaceHitTarget | null {
  const px = u * model.widthPx;
  const py = v * model.heightPx;
  if (!isPointInsideRoundedSurface(px, py, model.widthPx, model.heightPx, model.cornerRadiusPx)) {
    return null;
  }
  for (let i = model.hitTargets.length - 1; i >= 0; i--) {
    const t = model.hitTargets[i];
    if (px >= t.x && px <= t.x + t.width && py >= t.y && py <= t.y + t.height) {
      return t;
    }
  }
  return null;
}

export function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = w.length > maxCharsPerLine ? `${w.slice(0, maxCharsPerLine - 1)}…` : w;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const last = lines[maxLines - 1];
    if (!last.endsWith('…')) {
      lines[maxLines - 1] = `${last.slice(0, Math.max(4, maxCharsPerLine - 2))}…`;
    }
  }
  return lines;
}

export function pushClipRoundRect(
  ops: Record<string, unknown>[],
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ops.push({ op: 'clipRoundRect', x, y, width, height, radius });
}

export function pushClipRestore(ops: Record<string, unknown>[]) {
  ops.push({ op: 'clipRestore' });
}

export function drawInfinityEmblemOps(
  ops: Record<string, unknown>[],
  cx: number,
  cy: number,
  halfW: number,
  color: string,
  strokeWidth = 2.6
) {
  const r = halfW * 0.44;
  ops.push({
    op: 'polyline',
    color,
    strokeWidth,
    close: false,
    points: [
      cx,
      cy,
      cx - halfW * 0.48,
      cy - r,
      cx - halfW,
      cy,
      cx - halfW * 0.48,
      cy + r,
      cx,
      cy,
      cx + halfW * 0.48,
      cy - r,
      cx + halfW,
      cy,
      cx + halfW * 0.48,
      cy + r,
      cx,
      cy,
    ],
  });
}

export function drawSendPlaneOps(
  ops: Record<string, unknown>[],
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  const h = size * 0.45;
  ops.push({
    op: 'polyline',
    color,
    strokeWidth: 2.2,
    close: true,
    points: [
      cx - h,
      cy + h * 0.35,
      cx + h,
      cy - h * 0.55,
      cx + h * 0.15,
      cy + h,
      cx - h * 0.1,
      cy + h * 0.25,
    ],
  });
}

export function drawBoltOps(
  ops: Record<string, unknown>[],
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  const s = size * 0.46;
  ops.push({
    op: 'polyline',
    color,
    strokeWidth: 2.1,
    close: true,
    points: [
      cx + s * 0.15,
      cy - s,
      cx - s * 0.55,
      cy + s * 0.08,
      cx + s * 0.05,
      cy + s * 0.08,
      cx - s * 0.18,
      cy + s,
      cx + s * 0.55,
      cy - s * 0.08,
      cx - s * 0.02,
      cy - s * 0.08,
    ],
  });
}

export function drawSparkleOps(
  ops: Record<string, unknown>[],
  cx: number,
  cy: number,
  radius: number,
  color: string
) {
  const inner = radius * 0.3;
  ops.push({
    op: 'polyline',
    fillColor: color,
    color,
    strokeWidth: 1.2,
    close: true,
    points: [
      cx,
      cy - radius,
      cx + inner,
      cy - inner,
      cx + radius,
      cy,
      cx + inner,
      cy + inner,
      cx,
      cy + radius,
      cx - inner,
      cy + inner,
      cx - radius,
      cy,
      cx - inner,
      cy - inner,
    ],
  });
}

export function drawPillButton(
  ops: Record<string, unknown>[],
  hitTargets: WindowSurfaceHitTarget[],
  spec: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
    bg: string;
    border?: string;
    borderWidth?: number;
    gradient?: SurfaceGradient;
    text: string;
    textColor: string;
    font?: string;
    fontSize?: number;
    bold?: boolean;
    widgetId: CanonicalWidgetId | '__window__';
    actionId: string;
    hitLabel?: string;
    align?: 'left' | 'center';
    paddingLeft?: number;
  }
) {
  const radius = spec.radius ?? Math.min(14, Math.round(spec.height / 2));
  ops.push({
    op: 'roundRect',
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height,
    radius,
    color: spec.bg,
    ...(spec.gradient ? { gradient: spec.gradient } : {}),
  });
  if (spec.border) {
    ops.push({
      op: 'strokeRect',
      x: spec.x,
      y: spec.y,
      width: spec.width,
      height: spec.height,
      radius,
      strokeWidth: spec.borderWidth ?? 1.5,
      color: spec.border,
    });
  }
  const fontSize = spec.fontSize ?? 18;
  const align = spec.align ?? 'center';
  ops.push({
    op: 'text',
    text: spec.text,
    x:
      align === 'center'
        ? Math.round(spec.x + spec.width / 2)
        : Math.round(spec.x + (spec.paddingLeft ?? 14)),
    y: Math.round(spec.y + (spec.height - fontSize * 1.15) / 2),
    size: fontSize,
    color: spec.textColor,
    align,
    bold: spec.bold ?? true,
    font: spec.font ?? FONT_DISPLAY_MEDIUM,
    maxWidth: Math.max(24, spec.width - (align === 'center' ? 14 : (spec.paddingLeft ?? 14) + 12)),
  });
  hitTargets.push({
    id: spec.id,
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height,
    widgetId: spec.widgetId,
    actionId: spec.actionId,
    label: spec.hitLabel ?? spec.text,
  });
}
