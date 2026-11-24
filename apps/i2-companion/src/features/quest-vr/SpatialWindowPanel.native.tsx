import { ViroBox, ViroNode, ViroQuad, ViroText } from '@reactvision/react-viro';
import React, { useMemo, useRef } from 'react';

import type { SpatialWindow } from '../../types/widgets';
import {
  getEffectiveWindowDimensions,
  sphericalToWorldPose,
  type CockpitAnchor,
  type Vec3,
} from '../spatial/cockpit-math';
import { buildWindowNodeTag } from './quest-cockpit-compositor';
import { isAcceptedControllerRaySource } from './quest-input-adapter';
import {
  hitTestWindowSurface,
  worldPointToWindowUv,
  type WindowSurfaceHitTarget,
  type WindowSurfaceModel,
} from './quest-window-surface';

export interface SpatialWindowPanelProps {
  win: SpatialWindow;
  slotIndex: number | undefined;
  anchor: CockpitAnchor;
  focused: boolean;
  hovered: boolean;
  draggingMode: 'move' | 'resize' | null;
  overflow: boolean;
  holeEnabled: boolean;
  surface: WindowSurfaceModel;
  hoveredTargetId: string | null;
  onHoverWindow: (hovering: boolean, hit: WindowSurfaceHitTarget | null, source?: number) => void;
  onActivateSurfaceHit: (hit: WindowSurfaceHitTarget | null, source?: number) => void;
  onStartRayMove: (source?: number) => void;
  onStartRayResize: (source?: number) => void;
  onResizeBy: (dw: number, dh: number) => void;
  onNudgeDepth: (dr: number) => void;
  onCycleMode: () => void;
  onCloseWindow: () => void;
  onMergeIntoFocused?: () => void;
}

function asSourceNumber(source: unknown): number | undefined {
  return typeof source === 'number' ? source : undefined;
}

function isValidHitWorldPos(pos: unknown): pos is [number, number, number] {
  return (
    Array.isArray(pos) &&
    pos.length === 3 &&
    Number.isFinite(pos[0]) &&
    Number.isFinite(pos[1]) &&
    Number.isFinite(pos[2]) &&
    (Math.abs(pos[0]) > 1e-5 || Math.abs(pos[1]) > 1e-5 || Math.abs(pos[2]) > 1e-5)
  );
}

/**
 * First-class floating Quest OpenXR window host.
 *
 * - Shares one Window Root `<ViroNode viroTag="quest-win:<slot>">` between Viro Chrome
 *   and the native `XrCompositionLayerQuad` underlay so Move/Resize updates frame-lock
 *   1:1 with zero handle/hole drift.
 * - Maps controller ray hits (`source` 1 and 4 only, rejecting head gaze 12) via exact
 *   local-space UV projection (`highAccuracyEvents`) onto any widget hit target inside
 *   this window, even when the window is currently unfocused.
 */
export function SpatialWindowPanel({
  win,
  slotIndex,
  anchor,
  focused,
  hovered,
  draggingMode,
  overflow,
  holeEnabled,
  surface,
  onHoverWindow,
  onActivateSurfaceHit,
  onStartRayMove,
  onStartRayResize,
  onResizeBy,
  onNudgeDepth,
  onCycleMode,
  onCloseWindow,
  onMergeIntoFocused,
}: SpatialWindowPanelProps) {
  const { widthM, heightM } = getEffectiveWindowDimensions(win);
  const pose = useMemo(() => sphericalToWorldPose(anchor, win), [anchor, win]);

  // Per-controller-source latched target between ClickDown(1) and ClickUp(2)/Clicked(3)
  const latchedBySourceRef = useRef<Record<number, WindowSurfaceHitTarget | null>>({});
  const lastHoverBySourceRef = useRef<Record<number, WindowSurfaceHitTarget | null>>({});

  const resolveSurfaceHit = (worldPos: unknown): WindowSurfaceHitTarget | null => {
    if (!isValidHitWorldPos(worldPos)) return null;
    const uv = worldPointToWindowUv(
      worldPos as Vec3,
      pose.pose7,
      widthM,
      heightM,
      surface.widthPx,
      surface.heightPx
    );
    if (!uv.insideBounds) return null;
    return hitTestWindowSurface(surface, uv.u, uv.v);
  };

  const borderMat = overflow
    ? 'questBtnAmber'
    : draggingMode
      ? 'questPanelBorderHover'
      : focused
        ? 'questPanelBorderFocused'
        : hovered
          ? 'questPanelBorderHover'
          : 'questPanelBorder';

  const topChromeY = heightM / 2 + 0.036;
  const bottomChromeY = -(heightM / 2 + 0.036);
  const nodeTag = slotIndex !== undefined ? buildWindowNodeTag(slotIndex) : undefined;

  return (
    <ViroNode
      viroTag={nodeTag}
      position={[pose.position[0], pose.position[1], pose.position[2]]}
      rotation={[pose.rotationDeg[0], pose.rotationDeg[1], pose.rotationDeg[2]]}>
      {/* Non-overlapping outer frame behind the OpenXR punch-through quad */}
      <ViroQuad
        position={[0, 0, -0.004]}
        width={widthM + 0.016}
        height={heightM + 0.016}
        materials={[borderMat]}
        ignoreEventHandling
      />

      {/* Top Sibling Move Handle (Ray-driven drag outside content quad) */}
      <ViroNode
        position={[-Math.min(widthM * 0.22, 0.22), topChromeY, 0.002]}
        onClickState={(clickState, _pos, source) => {
          const src = asSourceNumber(source);
          if (src !== undefined && !isAcceptedControllerRaySource(src)) return;
          if (clickState === 1) {
            onStartRayMove(src);
          }
        }}>
        <ViroBox
          width={Math.min(widthM * 0.44, 0.36)}
          height={0.048}
          length={0.014}
          materials={[draggingMode === 'move' ? 'questPanelHeaderDragging' : 'questPanelHeader']}
        />
        <ViroText
          text={draggingMode === 'move' ? 'MOVING...' : `MOVE · ${win.title.slice(0, 18)}`}
          position={[0, 0, 0.01]}
          width={Math.min(widthM * 0.42, 0.34)}
          height={0.042}
          maxLines={1}
          style={{
            fontSize: 12,
            color: '#5eead4',
            fontWeight: '700',
            textAlign: 'center',
            textAlignVertical: 'center',
          }}
        />
      </ViroNode>

      {/* Top-Right Compact Window Controls (Depth, Mode, Close) */}
      {[
        { label: 'Near', xOff: 0.21, mat: 'questBtnDark', onPress: () => onNudgeDepth(-0.18) },
        { label: 'Far', xOff: 0.145, mat: 'questBtnDark', onPress: () => onNudgeDepth(0.18) },
        {
          label: win.mode === 'normal' ? 'Exp' : 'Min',
          xOff: 0.075,
          mat: win.mode === 'normal' ? 'questBtnDark' : 'questBtnTeal',
          onPress: onCycleMode,
        },
        { label: '×', xOff: 0.015, mat: 'questBtnRose', onPress: onCloseWindow },
      ].map((ctrl) => (
        <ViroNode
          key={ctrl.label}
          position={[widthM / 2 - ctrl.xOff, topChromeY, 0.002]}
          onClick={(_pos, source) => {
            if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
            ctrl.onPress();
          }}>
          <ViroBox width={0.056} height={0.044} length={0.014} materials={[ctrl.mat]} />
          <ViroText
            text={ctrl.label}
            position={[0, 0, 0.01]}
            width={0.052}
            height={0.038}
            style={{
              fontSize: 11,
              color: '#f8fafc',
              fontWeight: '700',
              textAlign: 'center',
              textAlignVertical: 'center',
            }}
          />
        </ViroNode>
      ))}

      {/* Main Content Quad: OpenXR Compositor Hole OR Explicit Overflow Notice */}
      {overflow ? (
        <ViroNode>
          <ViroQuad
            width={widthM}
            height={heightM}
            materials={['questPanelBody']}
            onClick={(_pos, source) => {
              if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
              onMergeIntoFocused?.();
            }}
          />
          <ViroText
            text={`OpenXR Layer Cap Reached\n\n"${win.title}" (${win.widgetIds.length} widget(s)) cannot open an extra hardware layer.\nClick to Merge into Focused Window, or close another window.`}
            position={[0, 0, 0.012]}
            width={Math.max(0.28, widthM - 0.08)}
            height={Math.max(0.2, heightM - 0.08)}
            style={{
              fontSize: 15,
              color: '#fcd34d',
              textAlign: 'center',
              textAlignVertical: 'center',
            }}
          />
        </ViroNode>
      ) : (
        <ViroQuad
          width={widthM}
          height={heightM}
          highAccuracyEvents
          materials={[holeEnabled ? 'questCockpitHole' : 'questPanelBody']}
          onHover={(isHovering, worldPos, source) => {
            const src = asSourceNumber(source);
            if (src !== undefined && !isAcceptedControllerRaySource(src)) return;
            const srcKey = src ?? 1;
            if (!isHovering) {
              lastHoverBySourceRef.current[srcKey] = null;
              onHoverWindow(false, null, src);
              return;
            }
            const hit = resolveSurfaceHit(worldPos);
            lastHoverBySourceRef.current[srcKey] = hit;
            onHoverWindow(true, hit, src);
          }}
          onClickState={(clickState, worldPos, source) => {
            const src = asSourceNumber(source);
            if (src !== undefined && !isAcceptedControllerRaySource(src)) return;
            const srcKey = src ?? 1;
            if (clickState === 1) {
              const hit =
                resolveSurfaceHit(worldPos) ?? lastHoverBySourceRef.current[srcKey] ?? null;
              latchedBySourceRef.current[srcKey] = hit;
            } else if (clickState === 2 || clickState === 3) {
              const directHit = resolveSurfaceHit(worldPos);
              const committedHit =
                directHit ??
                latchedBySourceRef.current[srcKey] ??
                lastHoverBySourceRef.current[srcKey] ??
                null;
              latchedBySourceRef.current[srcKey] = null;
              onActivateSurfaceHit(committedHit, src);
            }
          }}
        />
      )}

      {/* Bottom Quick-Resize Buttons + Corner Drag-Resize Handle */}
      <ViroNode
        position={[-widthM / 2 + 0.095, bottomChromeY, 0.002]}
        onClick={(_pos, source) => {
          if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
          onResizeBy(-0.14, -0.1);
        }}>
        <ViroBox width={0.072} height={0.04} length={0.012} materials={['questBtnDark']} />
        <ViroText
          text="Size -"
          position={[0, 0, 0.009]}
          width={0.068}
          height={0.034}
          style={{
            fontSize: 11,
            color: '#cbd5e1',
            textAlign: 'center',
            textAlignVertical: 'center',
          }}
        />
      </ViroNode>
      <ViroNode
        position={[-widthM / 2 + 0.175, bottomChromeY, 0.002]}
        onClick={(_pos, source) => {
          if (typeof source === 'number' && !isAcceptedControllerRaySource(source)) return;
          onResizeBy(0.14, 0.1);
        }}>
        <ViroBox width={0.072} height={0.04} length={0.012} materials={['questBtnDark']} />
        <ViroText
          text="Size +"
          position={[0, 0, 0.009]}
          width={0.068}
          height={0.034}
          style={{
            fontSize: 11,
            color: '#cbd5e1',
            textAlign: 'center',
            textAlignVertical: 'center',
          }}
        />
      </ViroNode>
      <ViroNode
        position={[widthM / 2 - 0.07, bottomChromeY, 0.002]}
        onClickState={(clickState, _pos, source) => {
          const src = asSourceNumber(source);
          if (src !== undefined && !isAcceptedControllerRaySource(src)) return;
          if (clickState === 1) {
            onStartRayResize(src);
          }
        }}>
        <ViroBox
          width={0.13}
          height={0.044}
          length={0.014}
          materials={[draggingMode === 'resize' ? 'questPanelHeaderDragging' : 'questBtnTeal']}
        />
        <ViroText
          text={draggingMode === 'resize' ? 'RESIZING...' : 'DRAG SIZE ↘'}
          position={[0, 0, 0.01]}
          width={0.12}
          height={0.038}
          style={{
            fontSize: 11,
            color: '#042f2e',
            fontWeight: '700',
            textAlign: 'center',
            textAlignVertical: 'center',
          }}
        />
      </ViroNode>
    </ViroNode>
  );
}
