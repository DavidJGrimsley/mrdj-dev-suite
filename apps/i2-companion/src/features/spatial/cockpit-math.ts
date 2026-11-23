import type {
  SpatialWidgetPlacement,
  SpatialWindow,
  VrPosture,
  WidgetPresentationMode,
} from '../../types/widgets';

export type Vec3 = readonly [number, number, number];
/** [x, y, z, qx, qy, qz, qw] */
export type Pose7 = readonly [number, number, number, number, number, number, number];

export interface CockpitAnchor {
  origin: Vec3;
  yawDeg: number;
  posture: VrPosture;
  source: 'default' | 'solo' | 'system';
  refSpaceEpoch: number;
}

export const DEFAULT_COCKPIT_ANCHOR: CockpitAnchor = {
  origin: [0, 0, 0],
  yawDeg: 0,
  posture: 'standing',
  source: 'default',
  refSpaceEpoch: 0,
};

export const COMFORT_LIMITS = {
  minRadiusM: 0.55,
  maxRadiusM: 2.8,
  minPitchDeg: -42,
  maxPitchDeg: 42,
  minYawDeg: -115,
  maxYawDeg: 115,
  minWidthM: 0.32,
  maxWidthM: 2.2,
  minHeightM: 0.24,
  maxHeightM: 1.65,
} as const;

export function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function clampPlacementToComfort(p: SpatialWidgetPlacement): SpatialWidgetPlacement {
  return {
    ...p,
    yawDeg: clampNumber(p.yawDeg, COMFORT_LIMITS.minYawDeg, COMFORT_LIMITS.maxYawDeg, 0),
    pitchDeg: clampNumber(p.pitchDeg, COMFORT_LIMITS.minPitchDeg, COMFORT_LIMITS.maxPitchDeg, 0),
    radiusM: clampNumber(p.radiusM, COMFORT_LIMITS.minRadiusM, COMFORT_LIMITS.maxRadiusM, 1.45),
    widthM: clampNumber(p.widthM, COMFORT_LIMITS.minWidthM, COMFORT_LIMITS.maxWidthM, 0.8),
    heightM: clampNumber(p.heightM, COMFORT_LIMITS.minHeightM, COMFORT_LIMITS.maxHeightM, 0.6),
    dockWeight: clampNumber(p.dockWeight, 0.25, 4, 1),
    scrollOffset: clampNumber(p.scrollOffset, 0, 50_000, 0),
  };
}

export function clampWindowToComfort(win: SpatialWindow): SpatialWindow {
  const scrollOffsets: Record<string, number> = {};
  for (const [k, v] of Object.entries(win.scrollOffsets ?? {})) {
    scrollOffsets[k] = clampNumber(v, 0, 50_000, 0);
  }
  const activeWidgetId =
    win.activeWidgetId && win.widgetIds.includes(win.activeWidgetId)
      ? win.activeWidgetId
      : win.widgetIds[0];
  return {
    ...win,
    yawDeg: clampNumber(win.yawDeg, COMFORT_LIMITS.minYawDeg, COMFORT_LIMITS.maxYawDeg, 0),
    pitchDeg: clampNumber(win.pitchDeg, COMFORT_LIMITS.minPitchDeg, COMFORT_LIMITS.maxPitchDeg, 0),
    radiusM: clampNumber(win.radiusM, COMFORT_LIMITS.minRadiusM, COMFORT_LIMITS.maxRadiusM, 1.48),
    widthM: clampNumber(win.widthM, COMFORT_LIMITS.minWidthM, COMFORT_LIMITS.maxWidthM, 0.96),
    heightM: clampNumber(win.heightM, COMFORT_LIMITS.minHeightM, COMFORT_LIMITS.maxHeightM, 0.72),
    dockWeight: clampNumber(win.dockWeight, 0.25, 4, 1),
    activeWidgetId,
    scrollOffsets,
  };
}

export function getEffectiveWindowDimensions(win: {
  widthM: number;
  heightM: number;
  mode: WidgetPresentationMode;
}): { widthM: number; heightM: number } {
  if (win.mode === 'fullscreen') {
    return {
      widthM: clampNumber(win.widthM * 1.38, COMFORT_LIMITS.minWidthM, 2.4, win.widthM),
      heightM: clampNumber(win.heightM * 1.38, COMFORT_LIMITS.minHeightM, 1.85, win.heightM),
    };
  }
  if (win.mode === 'expanded') {
    return {
      widthM: clampNumber(win.widthM * 1.18, COMFORT_LIMITS.minWidthM, 2.3, win.widthM),
      heightM: clampNumber(win.heightM * 1.18, COMFORT_LIMITS.minHeightM, 1.75, win.heightM),
    };
  }
  return {
    widthM: clampNumber(win.widthM, COMFORT_LIMITS.minWidthM, COMFORT_LIMITS.maxWidthM, 0.96),
    heightM: clampNumber(win.heightM, COMFORT_LIMITS.minHeightM, COMFORT_LIMITS.maxHeightM, 0.72),
  };
}

export function postureHeightOffsetM(posture: VrPosture): number {
  return posture === 'seated' ? -0.18 : 0;
}

/**
 * Converts spherical-cockpit coordinates (yawDeg, pitchDeg, radiusM) relative to
 * CockpitAnchor into a world-space Pose7 facing inward toward the wearer's eye origin.
 */
export function sphericalToWorldPose(
  anchor: CockpitAnchor,
  placement: Pick<SpatialWidgetPlacement, 'yawDeg' | 'pitchDeg' | 'radiusM'>
): { position: Vec3; rotationDeg: Vec3; pose7: Pose7 } {
  const totalYawRad = ((anchor.yawDeg + placement.yawDeg) * Math.PI) / 180;
  const pitchRad = (placement.pitchDeg * Math.PI) / 180;
  const r = clampNumber(
    placement.radiusM,
    COMFORT_LIMITS.minRadiusM,
    COMFORT_LIMITS.maxRadiusM,
    1.45
  );
  const cosPitch = Math.cos(pitchRad);

  // OpenXR LOCAL: -Z is forward, +X is right, +Y is up.
  const localX = Math.sin(totalYawRad) * cosPitch * r;
  const localY = Math.sin(pitchRad) * r + postureHeightOffsetM(anchor.posture);
  const localZ = -Math.cos(totalYawRad) * cosPitch * r;

  const x = anchor.origin[0] + localX;
  const y = anchor.origin[1] + localY;
  const z = anchor.origin[2] + localZ;

  // Panel front normal points toward the user: rotate Y by -(anchor.yawDeg + placement.yawDeg), X by pitch.
  const faceYawRad = -totalYawRad;
  const facePitchRad = pitchRad;
  const cy = Math.cos(faceYawRad * 0.5);
  const sy = Math.sin(faceYawRad * 0.5);
  const cp = Math.cos(facePitchRad * 0.5);
  const sp = Math.sin(facePitchRad * 0.5);

  // Q = Qy * Qx (matches Viro VROQuaternion::set(rx, ry, 0))
  const qx = cy * sp;
  const qy = sy * cp;
  const qz = -sy * sp;
  const qw = cy * cp;

  return {
    position: [x, y, z],
    rotationDeg: [placement.pitchDeg, -(anchor.yawDeg + placement.yawDeg), 0],
    pose7: [x, y, z, qx, qy, qz, qw],
  };
}

/**
 * Computes back-to-front ordering of spatial items relative to current head position.
 */
export function sortUnderlaysBackToFront<T extends { position: Vec3 }>(
  items: readonly T[],
  headOrigin: Vec3 = [0, 0, 0]
): T[] {
  return [...items].sort((a, b) => {
    const da =
      (a.position[0] - headOrigin[0]) ** 2 +
      (a.position[1] - headOrigin[1]) ** 2 +
      (a.position[2] - headOrigin[2]) ** 2;
    const db =
      (b.position[0] - headOrigin[0]) ** 2 +
      (b.position[1] - headOrigin[1]) ** 2 +
      (b.position[2] - headOrigin[2]) ** 2;
    return db - da;
  });
}

/**
 * Inverse of sphericalToWorldPose: converts a world-space point back into clamped
 * spherical cockpit coordinates relative to CockpitAnchor (for 3D VR drag placement).
 */
export function worldPosToSpherical(
  anchor: CockpitAnchor,
  worldPos: Vec3
): { yawDeg: number; pitchDeg: number; radiusM: number } {
  const dx = worldPos[0] - anchor.origin[0];
  const dy = worldPos[1] - (anchor.origin[1] + postureHeightOffsetM(anchor.posture));
  const dz = worldPos[2] - anchor.origin[2];

  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const radiusM = clampNumber(dist, COMFORT_LIMITS.minRadiusM, COMFORT_LIMITS.maxRadiusM, 1.45);
  if (dist < 1e-4) {
    return { yawDeg: 0, pitchDeg: 0, radiusM };
  }

  const totalYawDeg = (Math.atan2(dx, -dz) * 180) / Math.PI;
  let relYawDeg = totalYawDeg - anchor.yawDeg;
  while (relYawDeg > 180) relYawDeg -= 360;
  while (relYawDeg < -180) relYawDeg += 360;

  const sinPitch = clampNumber(dy / dist, -1, 1, 0);
  const pitchDeg = (Math.asin(sinPitch) * 180) / Math.PI;

  return {
    yawDeg: Number(
      clampNumber(relYawDeg, COMFORT_LIMITS.minYawDeg, COMFORT_LIMITS.maxYawDeg, 0).toFixed(2)
    ),
    pitchDeg: Number(
      clampNumber(pitchDeg, COMFORT_LIMITS.minPitchDeg, COMFORT_LIMITS.maxPitchDeg, 0).toFixed(2)
    ),
    radiusM: Number(radiusM.toFixed(3)),
  };
}

/**
 * Finds an unoccupied spherical slot for newly added widgets/windows so adding multiple
 * windows into a Batcave layout fans them out cleanly instead of stacking at (0, 0).
 */
export function computeSmartPlacement(
  existingVisible: readonly Pick<SpatialWidgetPlacement, 'yawDeg' | 'pitchDeg' | 'radiusM'>[],
  preferredZone: SpatialWidgetPlacement['zone']
): { yawDeg: number; pitchDeg: number; radiusM: number } {
  const candidatesByZone: Record<
    SpatialWidgetPlacement['zone'],
    readonly { yawDeg: number; pitchDeg: number; radiusM: number }[]
  > = {
    center: [
      { yawDeg: 0, pitchDeg: -4, radiusM: 1.46 },
      { yawDeg: 18, pitchDeg: 6, radiusM: 1.52 },
      { yawDeg: -18, pitchDeg: 6, radiusM: 1.52 },
      { yawDeg: 0, pitchDeg: 20, radiusM: 1.54 },
    ],
    leftWing: [
      { yawDeg: -42, pitchDeg: 6, radiusM: 1.52 },
      { yawDeg: -46, pitchDeg: -16, radiusM: 1.52 },
      { yawDeg: -68, pitchDeg: 6, radiusM: 1.58 },
      { yawDeg: -68, pitchDeg: -16, radiusM: 1.58 },
      { yawDeg: -88, pitchDeg: 4, radiusM: 1.62 },
    ],
    rightWing: [
      { yawDeg: 42, pitchDeg: 6, radiusM: 1.52 },
      { yawDeg: 46, pitchDeg: -16, radiusM: 1.52 },
      { yawDeg: 68, pitchDeg: 6, radiusM: 1.58 },
      { yawDeg: 68, pitchDeg: -16, radiusM: 1.58 },
      { yawDeg: 88, pitchDeg: 4, radiusM: 1.62 },
    ],
    bottomShelf: [
      { yawDeg: 0, pitchDeg: -30, radiusM: 1.4 },
      { yawDeg: -26, pitchDeg: -28, radiusM: 1.42 },
      { yawDeg: 26, pitchDeg: -28, radiusM: 1.42 },
      { yawDeg: -50, pitchDeg: -26, radiusM: 1.46 },
      { yawDeg: 50, pitchDeg: -26, radiusM: 1.46 },
    ],
    floating: [
      { yawDeg: 24, pitchDeg: 22, radiusM: 1.52 },
      { yawDeg: -24, pitchDeg: 22, radiusM: 1.52 },
      { yawDeg: 80, pitchDeg: 20, radiusM: 1.62 },
      { yawDeg: -80, pitchDeg: 20, radiusM: 1.62 },
    ],
  };

  const candidates = [
    ...candidatesByZone[preferredZone],
    ...candidatesByZone.floating,
    ...candidatesByZone.leftWing,
    ...candidatesByZone.rightWing,
    ...candidatesByZone.bottomShelf,
  ];

  for (const cand of candidates) {
    const occupied = existingVisible.some(
      (w) => Math.abs(w.yawDeg - cand.yawDeg) < 15 && Math.abs(w.pitchDeg - cand.pitchDeg) < 12
    );
    if (!occupied) return cand;
  }

  const idx = existingVisible.length;
  const ringYaw = ((idx % 7) - 3) * 30;
  const ringPitch = idx % 2 === 0 ? 18 : -18;
  return {
    yawDeg: clampNumber(ringYaw, COMFORT_LIMITS.minYawDeg, COMFORT_LIMITS.maxYawDeg, 0),
    pitchDeg: clampNumber(ringPitch, COMFORT_LIMITS.minPitchDeg, COMFORT_LIMITS.maxPitchDeg, 0),
    radiusM: 1.68,
  };
}

export function shouldReanchorOnRefSpaceEpoch(
  anchor: CockpitAnchor,
  observedEpoch: number,
  hasPostRecenterSample: boolean
): boolean {
  if (observedEpoch <= anchor.refSpaceEpoch) return false;
  if (anchor.source === 'default') return false;
  return hasPostRecenterSample;
}

export function snapYawToArcSlot(yawDeg: number): {
  zone: SpatialWidgetPlacement['zone'];
  snappedYawDeg: number;
} {
  if (yawDeg <= -24) {
    return { zone: 'leftWing', snappedYawDeg: clampNumber(yawDeg, -68, -28, -42) };
  }
  if (yawDeg >= 24) {
    return { zone: 'rightWing', snappedYawDeg: clampNumber(yawDeg, 28, 68, 42) };
  }
  return { zone: 'center', snappedYawDeg: clampNumber(yawDeg, -18, 18, 0) };
}

export const QUANTIZED_SWAPCHAIN_BUCKETS = [512, 768, 1024, 1280, 1536, 2048] as const;

export function quantizePixelExtent(meters: number, pxPerMeter = 1024): number {
  const raw = clampNumber(meters * pxPerMeter, 256, 2048, 1024);
  for (const bucket of QUANTIZED_SWAPCHAIN_BUCKETS) {
    if (raw <= bucket) return bucket;
  }
  return 2048;
}

export function quantizeSwapchainBucket(px: number, maxSwapchainPx = 2048): number {
  const clampedMax = Math.max(512, Math.min(2048, maxSwapchainPx));
  const target = Math.max(256, Math.min(clampedMax, Math.ceil(px)));
  for (const bucket of QUANTIZED_SWAPCHAIN_BUCKETS) {
    if (target <= bucket && bucket <= clampedMax) return bucket;
  }
  return clampedMax;
}

/**
 * Computes crisp per-window content resolution + quantized swapchain bucket dimensions,
 * preserving exact physical aspect ratio in (widthPx, heightPx) while quantizing the
 * backing XrSwapchain allocation to (bucketWidthPx, bucketHeightPx) for zero resize thrash.
 */
export function computeWindowPixelSpec(params: {
  widthM: number;
  heightM: number;
  widgetCount: number;
  hasHighDensityContent: boolean;
  totalVisibleWindows: number;
  maxSwapchainWidth?: number;
  maxSwapchainHeight?: number;
}): {
  widthPx: number;
  heightPx: number;
  bucketWidthPx: number;
  bucketHeightPx: number;
  pxPerMeter: number;
} {
  const baseDensity = params.hasHighDensityContent ? 1180 : 960;
  const groupBoost = params.widgetCount > 1 ? 1.06 : 1.0;
  // Scale density gently only when many distinct OpenXR layers are active simultaneously.
  const budgetScale =
    params.totalVisibleWindows > 8 ? 0.8 : params.totalVisibleWindows > 5 ? 0.9 : 1.0;
  const pxPerMeter = Math.round(baseDensity * groupBoost * budgetScale);

  const maxW = Math.min(2048, params.maxSwapchainWidth ?? 2048);
  const maxH = Math.min(2048, params.maxSwapchainHeight ?? 2048);

  let widthPx = Math.round(params.widthM * pxPerMeter);
  let heightPx = Math.round(params.heightM * pxPerMeter);

  // Preserve exact aspect ratio while clamping inside hardware/budget bounds
  const scaleDown = Math.min(1, maxW / Math.max(1, widthPx), maxH / Math.max(1, heightPx));
  widthPx = Math.max(384, Math.round(widthPx * scaleDown));
  heightPx = Math.max(288, Math.round(heightPx * scaleDown));

  return {
    widthPx,
    heightPx,
    bucketWidthPx: quantizeSwapchainBucket(widthPx, maxW),
    bucketHeightPx: quantizeSwapchainBucket(heightPx, maxH),
    pxPerMeter,
  };
}
