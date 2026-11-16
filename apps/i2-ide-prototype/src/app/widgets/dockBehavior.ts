// Pure dock decisions shared by the widgets and the dock tests.
// Header expansion is applied on the second click. HEADER_CLICK_GAP_MS is only the
// gap that still counts as the next click; it is not an expand delay. 175ms was too
// short and let a deliberate triple-click fall through as a double-click.

export type DockSideName = "left" | "right" | "bottom";
export type HeaderMode = "normal" | "expanded" | "fullscreen";

export const DOCK_SIDES: readonly DockSideName[] = ["left", "right", "bottom"];

/** Recognition gap between header clicks. Longer than 175ms so a natural triple-click still lands. */
export const HEADER_CLICK_GAP_MS = 520;

/** Bottom flow leaves the chat at least this tall. Past that, panel height follows the splitter. */
export const DOCK_CHAT_MIN_PX = 180;

export const FULL_CARD_MIN_WIDTH = 290;
/** Expanded and fullscreen cards use this width and hug their contents vertically. */
export const HUG_CARD_WIDTH = 340;
export const HOVER_OPEN_MS = 250;
export const POPOVER_WIDTH = 340;
export const POPOVER_HEIGHT = 220;

export const DEFAULT_WIDGET_MIN_HEIGHT = 72;
export const RESIZE_FLEX_UNIT_PX = 300;

export const FLOW_COLUMNS = "dock:flow";
export const COLUMN_BREAK = "dock:column";
export const FLOW_META = new Set([FLOW_COLUMNS, COLUMN_BREAK]);

const SWALLOW_CLICK = "__i2DockSwallowClick";

export function markDockClickSwallowed(): void {
  if (typeof document === "undefined") return;
  (document as unknown as Record<string, boolean>)[SWALLOW_CLICK] = true;
}

/** True for the click that ends a drag. Every listener must see it; only the swallow handler clears it. */
export function dockClickWasSwallowed(): boolean {
  if (typeof document === "undefined") return false;
  return (document as unknown as Record<string, boolean>)[SWALLOW_CLICK] === true;
}

export function clearDockClickSwallowed(): void {
  if (typeof document === "undefined") return;
  (document as unknown as Record<string, boolean>)[SWALLOW_CLICK] = false;
}

export interface PanelCollapse {
  sizes: Record<DockSideName, number>;
  remembered: Record<DockSideName, number> | null;
}

/** Collapse every side to 0, remembering the exact mix (including sides already 0). Restore that mix. */
export function nextDockCollapse(
  current: Record<DockSideName, number>,
  remembered: Record<DockSideName, number> | null,
  defaults: Record<DockSideName, number>,
): PanelCollapse {
  const allZero = DOCK_SIDES.every((side) => current[side] === 0);
  if (!allZero) {
    return {
      sizes: { left: 0, right: 0, bottom: 0 },
      remembered: { left: current.left, right: current.right, bottom: current.bottom },
    };
  }
  const prev = remembered ?? defaults;
  return {
    sizes: { left: prev.left, right: prev.right, bottom: prev.bottom },
    remembered,
  };
}

/**
 * Automatic layout never takes more than half the available column. Explicit
 * splitter resizing can exceed that limit while retaining a small chat strip.
 */
export function bottomPanelHeight(
  splitterPx: number,
  centrePx: number,
  chatMinPx = DOCK_CHAT_MIN_PX,
  splitterBarPx = 8,
  contentPx = 0,
  manual = false,
): number {
  if (splitterPx <= 0) return 0;
  const cap = Math.max(0, centrePx - (manual ? 48 : chatMinPx) - splitterBarPx);
  const autoCap = Math.min(cap, centrePx * 0.5);
  return manual ? Math.min(splitterPx, cap) : Math.min(Math.max(splitterPx, contentPx), autoCap);
}

export interface HeaderGesture {
  count: number;
  mode: HeaderMode;
  /** A double-click from expanded/fullscreen waits out the gap so a third click can still reach fullscreen. */
  pendingToggle: boolean;
}

export function applyHeaderClick(g: HeaderGesture, custom: boolean): HeaderGesture & { customCall: boolean } {
  const count = g.count + 1;
  if (count >= 3) {
    if (custom) return { count: 0, mode: g.mode, pendingToggle: false, customCall: false };
    const mode: HeaderMode = g.mode === "fullscreen" ? "normal" : "fullscreen";
    return { count: 0, mode, pendingToggle: false, customCall: false };
  }
  if (count === 2) {
    if (custom) return { count, mode: g.mode, pendingToggle: false, customCall: true };
    if (g.mode === "normal") return { count, mode: "expanded", pendingToggle: false, customCall: false };
    return { count, mode: g.mode, pendingToggle: true, customCall: false };
  }
  return { count, mode: g.mode, pendingToggle: false, customCall: false };
}

export function expireHeaderGesture(g: HeaderGesture): HeaderGesture {
  if (!g.pendingToggle) return { count: 0, mode: g.mode, pendingToggle: false };
  const mode: HeaderMode = g.mode === "expanded" ? "normal" : "expanded";
  return { count: 0, mode, pendingToggle: false };
}

export function isFlowMarked(ids: readonly string[]): boolean {
  return ids[0] === FLOW_COLUMNS || ids.includes(COLUMN_BREAK);
}

/** Music shares a column with Current Goal. Other short widgets share with each other. */
export function sharesColumn(a: string, b: string, isSmall: (id: string) => boolean): boolean {
  if ((a === "music" && b === "goalPlan") || (a === "goalPlan" && b === "music")) return true;
  return isSmall(a) && isSmall(b);
}

export function toColumns(ids: readonly string[], isSmall: (id: string) => boolean): string[][] {
  if (isFlowMarked(ids)) {
    const cols: string[][] = [];
    let cur: string[] = [];
    for (const id of ids) {
      if (id === COLUMN_BREAK) {
        if (cur.length) cols.push(cur);
        cur = [];
        continue;
      }
      if (id === FLOW_COLUMNS) continue;
      cur.push(id);
    }
    if (cur.length) cols.push(cur);
    return cols;
  }
  const cols: string[][] = [];
  for (const id of ids) {
    if (FLOW_META.has(id)) continue;
    const last = cols[cols.length - 1];
    const partner = last?.[last.length - 1];
    if (partner && last.length < 2 && sharesColumn(partner, id, isSmall)) last.push(id);
    else cols.push([id]);
  }
  return cols;
}

export function fromColumns(cols: string[][]): string[] {
  const filled = cols.filter((col) => col.length > 0);
  if (!filled.length) return [];
  const out: string[] = [FLOW_COLUMNS];
  filled.forEach((col, i) => {
    if (i > 0) out.push(COLUMN_BREAK);
    out.push(...col);
  });
  return out;
}

export function tidyZone(ids: string[], isSmall: (id: string) => boolean): string[] {
  if (!isFlowMarked(ids)) return ids.filter((id) => !FLOW_META.has(id));
  return fromColumns(toColumns(ids, isSmall));
}

/** Full cards when the row is wide enough in the bottom zone. Sidebars (left/right) always use compact list cards; hug mode always uses full cards. Height is not an input. */
export function sessionsUseFullCards(
  hug: boolean,
  width: number,
  count: number,
  zone: DockSideName | null = "bottom",
): boolean {
  if (count === 0 || hug) return true;
  if (zone === "left" || zone === "right") return false;
  if (width <= 0) return true;
  const gaps = Math.max(0, count - 1) * 6 + 20;
  return width >= count * FULL_CARD_MIN_WIDTH + gaps;
}

export function popoverPosition(
  rect: { left: number; right: number; top: number },
  viewport: { width: number; height: number },
  popW = POPOVER_WIDTH,
  popH = POPOVER_HEIGHT,
): { left: number; top: number; width: number } {
  const margin = 8;
  const fitsRight = rect.right + margin + popW <= viewport.width - margin;
  const fitsLeft = rect.left - margin - popW >= margin;
  const left = fitsRight
    ? rect.right + margin
    : fitsLeft
      ? rect.left - margin - popW
      : Math.max(margin, Math.min(rect.left, viewport.width - popW - margin));
  const beside = fitsRight || fitsLeft;
  const rawTop = beside ? rect.top - 20 : rect.top - popH - margin;
  const top = Math.max(margin, Math.min(rawTop, viewport.height - popH - margin));
  return { left, top, width: popW };
}

export interface PairResizeResult {
  abovePx: number;
  belowPx: number;
}

/**
 * Conserves the combined height of an adjacent widget pair `(above, below)` while
 * respecting usable minimum sizes for both widgets.
 * `deltaY > 0` grows `above` and shrinks `below`; `deltaY < 0` shrinks `above` and grows `below`.
 */
export function clampPairResize(
  startAbovePx: number,
  startBelowPx: number,
  deltaY: number,
  minAbovePx = DEFAULT_WIDGET_MIN_HEIGHT,
  minBelowPx = DEFAULT_WIDGET_MIN_HEIGHT,
): PairResizeResult {
  const totalRounded = Math.max(0, Math.round(startAbovePx + startBelowPx));
  const effMinAbove = Math.max(0, Math.min(Math.round(minAbovePx), Math.round(startAbovePx), totalRounded));
  const effMinBelow = Math.max(0, Math.min(Math.round(minBelowPx), Math.round(startBelowPx), totalRounded - effMinAbove));
  const targetAbove = Math.round(startAbovePx + deltaY);
  const abovePx = Math.max(effMinAbove, Math.min(totalRounded - effMinBelow, targetAbove));
  const belowPx = totalRounded - abovePx;
  return { abovePx, belowPx };
}

export interface ZoneItemSpec {
  id: string;
  heightPx: number;
  grow: boolean;
  minHeight: number;
}

/**
 * Computes updated flex-grow weights (normalized by `RESIZE_FLEX_UNIT_PX`) when an adjacent
 * pair `(aboveIdx, belowIdx)` in a column zone is resized by `deltaY`.
 * Flexible items outside the pair preserve their rendered proportions; fixed non-growing items
 * outside the pair remain unsized so they stay at their natural height.
 */
export function computeZoneResizeWeights(
  items: readonly ZoneItemSpec[],
  existingWeights: Readonly<Record<string, number>>,
  aboveIdx: number,
  belowIdx: number,
  deltaY: number,
): Record<string, number> {
  if (aboveIdx < 0 || belowIdx >= items.length || aboveIdx + 1 !== belowIdx) {
    return { ...existingWeights };
  }
  const above = items[aboveIdx];
  const below = items[belowIdx];
  const { abovePx, belowPx } = clampPairResize(
    above.heightPx,
    below.heightPx,
    deltaY,
    above.minHeight,
    below.minHeight,
  );
  const next: Record<string, number> = {};
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i === aboveIdx) {
      next[item.id] = Math.max(0.05, abovePx / RESIZE_FLEX_UNIT_PX);
    } else if (i === belowIdx) {
      next[item.id] = Math.max(0.05, belowPx / RESIZE_FLEX_UNIT_PX);
    } else if (item.grow || existingWeights[item.id] !== undefined) {
      next[item.id] = Math.max(0.05, item.heightPx / RESIZE_FLEX_UNIT_PX);
    }
  }
  return next;
}
