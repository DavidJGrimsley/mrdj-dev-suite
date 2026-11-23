// Widget dock: drag-to-rearrange zones, double-click to expand, triple-click for fullscreen,
// delete/restore, and resizable (collapsible) side and bottom panels.
//
// A screen registers its widgets once (`useWidgetDock` / `buildDock`) and renders one
// `WidgetZone` per area: the side columns stack widgets vertically, the panel under the chat
// lays them out as a flow grid. Any widget can be dragged by its header into another zone on
// the same screen, and widgets from the Widgets gallery can be dragged in as well.
import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { GripVertical, Maximize2, Minimize2, Expand, X } from "lucide-react";
import {
  COLUMN_BREAK,
  DEFAULT_WIDGET_MIN_HEIGHT,
  DOCK_CHAT_MIN_PX,
  FLOW_COLUMNS,
  FLOW_META,
  HEADER_CLICK_GAP_MS,
  RESIZE_FLEX_UNIT_PX,
  applyHeaderClick,
  bottomPanelHeight,
  clampPairResize,
  classifyHeaderGestureClick,
  clearDockClickSwallowed,
  computeZoneResizeWeights,
  dockClickWasSwallowed,
  expireHeaderGesture,
  headerAnchorBox,
  pointInHeaderAnchor,
  fromColumns,
  isFlowMarked,
  markDockClickSwallowed,
  nextDockCollapse,
  tidyZone,
  toColumns,
  type DockSideName,
  type HeaderAnchorBox,
  type HeaderGesture,
  type HeaderMode,
} from "./dockBehavior";

export type WidgetMode = "normal" | "expanded" | "fullscreen";
export type DockSide = "left" | "right" | "bottom";

export interface DockWidget {
  id: string;
  /** Accessible name; also used in the drag label and the gallery's "removed" list. */
  title: string;
  /** Zone the widget lives in until the user moves it. */
  zone: string;
  node: ReactNode | ((mode: WidgetMode) => ReactNode);
  /** Preferred height in px inside a column (omit for content height). */
  basis?: number;
  /** Takes a column's leftover height. */
  grow?: boolean;
  /** Relative flex-grow weight when sharing a column with other growing widgets. */
  growWeight?: number;
  /** May shrink below its basis even in the default layout. */
  shrink?: boolean;
  minHeight?: number;
  /**
   * The content sizes itself to the frame and scrolls internally (never scrolls the frame).
   * "expanded" applies that only to the expanded / fullscreen view.
   */
  fill?: boolean | "expanded";
  /** Sits at the bottom of its column while it is the last widget there. */
  pushBottom?: boolean;
  /** Flow zone: short widgets may share one column with the widget above them. */
  small?: boolean;
  /** Flow zone: preferred cell width in px. */
  flowWidth?: number;
  /** Replace the built-in expand/fullscreen with the widget's own enlarge action. */
  onExpand?: () => void;
  /** Whether the widget's remove × action is offered (default true). */
  removable?: boolean;
  /** Music dock: Arrow keys or Enter move the widget to the bottom panel. */
  onHeaderKeyDown?: () => void;
}

type DragState =
  | { kind: "widget"; screen: string; id: string; label: string }
  | { kind: "library"; widgetId: string; label: string };

/** Where a pointer drop lands. Column zones use `index`. Flow zones also say which column. */
interface DropSpot {
  key: string;
  /** Flat insertion index for a vertical column zone. */
  index: number;
  /** Flow zone: join the column under the pointer instead of opening a new column. */
  stack: boolean;
  column: number;
  row: number;
}

/** What a zone registers so the provider can route a pointer drag to it. */
interface ZoneTarget {
  accepts: (drag: DragState) => boolean;
  indexAt: (clientX: number, clientY: number) => DropSpot;
  drop: (drag: DragState, spot: DropSpot) => void;
}

/** The parts of a pointerdown the drag needs (React or native event). */
type PointerStart = Pick<PointerEvent, "button" | "clientX" | "clientY">;

type Layout = Record<string, string[]>;
interface StoredLayout {
  zones: Layout;
  /** Built-in widgets the user removed from this screen (restorable from the gallery). */
  hidden: string[];
}
type LibraryRenderer = (widgetId: string, mode: WidgetMode) => ReactNode;
interface ScreenRegistryEntry {
  hidden: { id: string; title: string }[];
  restore: (id: string) => void;
}

interface DockContextValue {
  layouts: Record<string, StoredLayout | undefined>;
  setLayout: (screen: string, layout: StoredLayout | undefined) => void;
  sizes: Record<string, Partial<Record<DockSide, number>>>;
  setSize: (kind: string, side: DockSide, px: number) => void;
  setSides: (kind: string, next: Partial<Record<DockSide, number>>) => void;
  widgetWeights: Record<string, Record<string, number>>;
  setZoneWeights: (zoneKey: string, weights: Record<string, number> | undefined) => void;
  stackHeights: Record<string, Record<string, number>>;
  setStackPairHeights: (stackKey: string, updates: Record<string, number> | undefined) => void;
  pruneWidgetResize: (screen: string, widgetId: string, remainingPerZone?: Record<string, string[]>) => void;
  drag: DragState | null;
  /** Zone element and drop spot currently under the dragged widget. */
  hover: { el: Element; spot: DropSpot } | null;
  /** Starts tracking a possible drag from a pointerdown; it becomes a drag after a few px. */
  beginDrag: (e: PointerStart, payload: DragState) => void;
  zones: React.MutableRefObject<Map<Element, ZoneTarget>>;
  active: { key: string; mode: Exclude<WidgetMode, "normal"> } | null;
  setActive: (a: { key: string; mode: Exclude<WidgetMode, "normal"> } | null) => void;
  libraryRef: React.MutableRefObject<{ render: LibraryRenderer; label: (id: string) => string } | null>;
  /** Bumped when a library widget lands in a zone so the gallery can close. */
  libraryDrops: number;
  noteLibraryDrop: () => void;
  registry: React.MutableRefObject<Map<string, ScreenRegistryEntry>>;
}

const DockContext = createContext<DockContextValue | null>(null);
const WidgetFillContext = createContext<boolean>(false);

/** True when the enclosing widget frame flex-fills a bounded height (column or overlay). */
export function useWidgetFillsContainer(): boolean {
  return useContext(WidgetFillContext);
}

export const LIBRARY_PREFIX = "lib:";
const DRAG_THRESHOLD_PX = 6;
const MIN_SHARED_HEIGHT = DEFAULT_WIDGET_MIN_HEIGHT;

export function WidgetDockProvider({ children }: { children: ReactNode }) {
  const [layouts, setLayouts] = useState<Record<string, StoredLayout | undefined>>({});
  const [sizes, setSizes] = useState<Record<string, Partial<Record<DockSide, number>>>>({});
  const [widgetWeights, setWidgetWeights] = useState<Record<string, Record<string, number>>>({});
  const [stackHeights, setStackHeights] = useState<Record<string, Record<string, number>>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<DockContextValue["hover"]>(null);
  const [active, setActive] = useState<DockContextValue["active"]>(null);
  const [libraryDrops, setLibraryDrops] = useState(0);
  const libraryRef = useRef<DockContextValue["libraryRef"]["current"]>(null);
  const zones = useRef(new Map<Element, ZoneTarget>());
  const registry = useRef(new Map<string, ScreenRegistryEntry>());
  const ghostRef = useRef<HTMLDivElement>(null);
  const setLayout = useCallback((screen: string, layout: StoredLayout | undefined) => {
    setLayouts((all) => ({ ...all, [screen]: layout }));
  }, []);
  const setSize = useCallback((kind: string, side: DockSide, px: number) => {
    setSizes((all) => ({ ...all, [kind]: { ...all[kind], [side]: px } }));
  }, []);
  const setSides = useCallback((kind: string, next: Partial<Record<DockSide, number>>) => {
    setSizes((all) => ({ ...all, [kind]: { ...all[kind], ...next } }));
  }, []);
  const setZoneWeights = useCallback((zoneKey: string, weights: Record<string, number> | undefined) => {
    setWidgetWeights((all) => {
      if (!weights || Object.keys(weights).length === 0) {
        if (!(zoneKey in all)) return all;
        const copy = { ...all };
        delete copy[zoneKey];
        return copy;
      }
      return { ...all, [zoneKey]: weights };
    });
  }, []);
  const setStackPairHeights = useCallback((stackKey: string, updates: Record<string, number> | undefined) => {
    setStackHeights((all) => {
      if (!updates || Object.keys(updates).length === 0) {
        if (!(stackKey in all)) return all;
        const copy = { ...all };
        delete copy[stackKey];
        return copy;
      }
      return { ...all, [stackKey]: { ...all[stackKey], ...updates } };
    });
  }, []);
  const pruneWidgetResize = useCallback(
    (screen: string, widgetId: string, remainingPerZone?: Record<string, string[]>) => {
      const prefix = `${screen}:`;
      setWidgetWeights((all) => {
        let changed = false;
        const next: Record<string, Record<string, number>> = {};
        for (const [k, map] of Object.entries(all)) {
          if (!k.startsWith(prefix)) {
            next[k] = map;
            continue;
          }
          const zoneName = k.slice(prefix.length);
          const allowed = remainingPerZone?.[zoneName];
          const filtered: Record<string, number> = {};
          for (const [id, w] of Object.entries(map)) {
            if (id === widgetId) {
              changed = true;
              continue;
            }
            if (allowed && !allowed.includes(id)) {
              changed = true;
              continue;
            }
            filtered[id] = w;
          }
          if (Object.keys(filtered).length >= 2) next[k] = filtered;
          else if (Object.keys(map).length > 0) changed = true;
        }
        return changed ? next : all;
      });
      setStackHeights((all) => {
        let changed = false;
        const next: Record<string, Record<string, number>> = {};
        for (const [k, map] of Object.entries(all)) {
          if (!k.startsWith(prefix) || !(widgetId in map)) {
            next[k] = map;
            continue;
          }
          changed = true;
          const copy = { ...map };
          delete copy[widgetId];
          if (Object.keys(copy).length >= 2) next[k] = copy;
        }
        return changed ? next : all;
      });
    },
    [],
  );
  const noteLibraryDrop = useCallback(() => setLibraryDrops((n) => n + 1), []);

  // Pointer-driven drag (mouse, pen and touch alike): nothing moves until the pointer has
  // travelled a few px, so plain clicks and double/triple clicks on a header still register.
  const beginDrag = useCallback((e: PointerStart, payload: DragState) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let current: { el: Element; spot: DropSpot } | null = null;

    const targetAt = (x: number, y: number) => {
      for (const el of document.elementsFromPoint(x, y)) {
        const zoneEl =
          el.closest("[data-dock-zone]") ??
          el.closest("[data-dock-panel]")?.querySelector("[data-dock-zone]") ??
          null;
        const zone = zoneEl && zones.current.get(zoneEl);
        if (zoneEl && zone?.accepts(payload)) return { el: zoneEl, spot: zone.indexAt(x, y) };
      }
      return null;
    };
    const onMove = (ev: PointerEvent) => {
      if (!dragging) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) return;
        dragging = true;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
        setDrag(payload);
      }
      const ghost = ghostRef.current;
      if (ghost) ghost.style.transform = `translate(${ev.clientX + 12}px, ${ev.clientY + 12}px)`;
      const next = targetAt(ev.clientX, ev.clientY);
      if (next?.el !== current?.el || next?.spot.key !== current?.spot.key) {
        current = next;
        setHover(next);
      }
    };
    const finish = (commit: boolean) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      if (!dragging) return;
      markDockClickSwallowed();
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      // The click that ends a drag must not count as a header click or open a gallery tile.
      const swallow = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
        clearDockClickSwallowed();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      // The click may be dispatched after this timer. If it never arrives, drop the flag
      // so later header clicks still expand. If it arrives first, the swallow handler
      // already cleared it.
      window.setTimeout(() => {
        window.removeEventListener("click", swallow, true);
        clearDockClickSwallowed();
      }, 0);
      if (commit && current) zones.current.get(current.el)?.drop(payload, current.spot);
      setHover(null);
      setDrag(null);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape" || !dragging) return;
      ev.stopImmediatePropagation();
      finish(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
  }, []);

  const value = useMemo(
    () => ({
      layouts,
      setLayout,
      sizes,
      setSize,
      setSides,
      widgetWeights,
      setZoneWeights,
      stackHeights,
      setStackPairHeights,
      pruneWidgetResize,
      drag,
      hover,
      beginDrag,
      zones,
      active,
      setActive,
      libraryRef,
      libraryDrops,
      noteLibraryDrop,
      registry,
    }),
    [
      layouts,
      setLayout,
      sizes,
      setSize,
      setSides,
      widgetWeights,
      setZoneWeights,
      stackHeights,
      setStackPairHeights,
      pruneWidgetResize,
      drag,
      hover,
      beginDrag,
      active,
      libraryDrops,
      noteLibraryDrop,
    ],
  );
  return (
    <DockContext.Provider value={value}>
      {children}
      {drag &&
        createPortal(
          <div
            ref={ghostRef}
            data-dock-ghost
            className="fixed left-0 top-0 z-[10050] pointer-events-none flex items-center gap-1.5 rounded-[6px] border border-[#2dd4bf]/60 bg-[#1d1b20]/95 px-2.5 py-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.5)] font-['Rounded_Mplus_1c',sans-serif] text-[11px] uppercase tracking-wide text-[#2dd4bf]"
            style={{ transform: "translate(-999px, -999px)" }}
          >
            <GripVertical size={12} />
            {drag.label}
          </div>,
          document.body,
        )}
    </DockContext.Provider>
  );
}

function useDockContext(): DockContextValue {
  const ctx = useContext(DockContext);
  if (!ctx) throw new Error("WidgetDockProvider is missing");
  return ctx;
}

/** Lets the shell supply how gallery ("library") widgets render once docked in a zone. */
export function useRegisterLibraryWidgets(render: LibraryRenderer, label: (id: string) => string) {
  const { libraryRef } = useDockContext();
  libraryRef.current = { render, label };
}

/** Drag source helpers for Widgets gallery tiles. */
export function useLibraryDrag() {
  const { drag, beginDrag, libraryDrops } = useDockContext();
  const start = useCallback(
    (e: React.PointerEvent, widgetId: string, label: string) => beginDrag(e, { kind: "library", widgetId, label }),
    [beginDrag],
  );
  return { dragging: drag?.kind === "library", start, libraryDrops };
}

/** True while any widget (or gallery tile) is being dragged. */
export function useDockDragging(): boolean {
  return useDockContext().drag !== null;
}

/** Widgets the user removed from a screen, with a way to bring each one back. */
export function useRemovedWidgets(screen: string | null): ScreenRegistryEntry {
  const { layouts, registry } = useDockContext();
  // `layouts` is read so the list refreshes whenever a widget is removed or restored.
  void layouts;
  return (screen && registry.current.get(screen)) || { hidden: [], restore: () => {} };
}

export interface WidgetDockHandle {
  screen: string;
  widgets: Map<string, DockWidget>;
  layout: Layout;
  customized: boolean;
  move: (id: string, zone: string, index: number, flow?: { stack: boolean; column: number; row: number }) => void;
  remove: (id: string) => void;
  restore: (id: string) => void;
}

/** Resolves the screen's stored layout against the widgets that exist right now. */
export function useWidgetDock(screen: string, zones: readonly string[], widgets: readonly (DockWidget | false | null | undefined)[]): WidgetDockHandle {
  return buildDock(useDockApi(), screen, zones, widgets);
}

export type DockApi = Pick<DockContextValue, "layouts" | "setLayout" | "registry"> &
  Partial<Pick<DockContextValue, "pruneWidgetResize">>;

/** The hook half of `useWidgetDock`, for components that must call hooks before an early return. */
export function useDockApi(): DockApi {
  const { layouts, setLayout, registry, pruneWidgetResize } = useDockContext();
  return { layouts, setLayout, registry, pruneWidgetResize };
}

function smallFlag(widgets: Map<string, DockWidget>): (id: string) => boolean {
  return (id) => widgets.get(id)?.small === true;
}

export function buildDock({ layouts, setLayout, registry, pruneWidgetResize }: DockApi, screen: string, zones: readonly string[], widgets: readonly (DockWidget | false | null | undefined)[]): WidgetDockHandle {
  const list = widgets.filter(Boolean) as DockWidget[];
  const known = new Map(list.map((w) => [w.id, w]));
  const stored = layouts[screen];
  const hiddenIds = new Set(stored?.hidden ?? []);
  const homeZone = (w: DockWidget) => (zones.includes(w.zone) ? w.zone : zones[0]);
  const layout: Layout = {};
  for (const z of zones) layout[z] = [];
  if (stored) {
    const placed = new Set<string>();
    for (const z of zones) {
      for (const id of stored.zones[z] ?? []) {
        if (FLOW_META.has(id)) {
          layout[z].push(id);
          continue;
        }
        if (placed.has(id) || hiddenIds.has(id)) continue;
        if (known.has(id) || id.startsWith(LIBRARY_PREFIX)) {
          layout[z].push(id);
          placed.add(id);
        }
      }
    }
    // Widgets that appeared after the user arranged things join their home zone.
    for (const w of list) if (!placed.has(w.id) && !hiddenIds.has(w.id)) {
      const dest = layout[homeZone(w)];
      if (isFlowMarked(dest) && dest[dest.length - 1] !== COLUMN_BREAK) dest.push(COLUMN_BREAK);
      dest.push(w.id);
    }
    for (const z of zones) layout[z] = tidyZone(layout[z], smallFlag(known));
  } else {
    for (const w of list) layout[homeZone(w)].push(w.id);
  }

  const commit = (next: Layout, hidden: Iterable<string>, changedId?: string) => {
    const zonesOut: Layout = {};
    for (const z of zones) zonesOut[z] = tidyZone(next[z] ?? [], smallFlag(known));
    setLayout(screen, { zones: zonesOut, hidden: [...hidden] });
    if (changedId) pruneWidgetResize?.(screen, changedId, zonesOut);
  };
  const without = (id: string): Layout => {
    const next: Layout = {};
    for (const z of zones) next[z] = (layout[z] ?? []).filter((x) => x !== id);
    return next;
  };

  const move = (id: string, zone: string, index: number, flow?: { stack: boolean; column: number; row: number }) => {
    const hidden = new Set(hiddenIds);
    hidden.delete(id);
    if (!flow) {
      let insertAt = index;
      const from = (layout[zone] ?? []).indexOf(id);
      if (from !== -1 && from < index) insertAt -= 1;
      const next = without(id);
      next[zone].splice(Math.max(0, Math.min(insertAt, next[zone].length)), 0, id);
      commit(next, hidden, id);
      return;
    }
    // Flow drop. `column` / `row` refer to the columns on screen, which still include this widget.
    const before = toColumns(layout[zone] ?? [], smallFlag(known));
    let srcCol = -1;
    let srcRow = -1;
    before.forEach((col, ci) => {
      const ri = col.indexOf(id);
      if (ri !== -1) { srcCol = ci; srcRow = ri; }
    });
    let column = flow.column;
    let row = flow.row;
    if (srcCol !== -1) {
      const sameColumn = srcCol === flow.column;
      if (sameColumn && before[srcCol].length === 1) return;
      if (before[srcCol].length === 1 && srcCol < column) column -= 1;
      if (sameColumn && srcRow < row) row -= 1;
    }
    const cols = before.map((col) => col.filter((x) => x !== id)).filter((col) => col.length > 0);
    if (flow.stack) {
      if (!cols[column]) cols.splice(Math.max(0, Math.min(column, cols.length)), 0, [id]);
      else cols[column].splice(Math.max(0, Math.min(row, cols[column].length)), 0, id);
    } else {
      cols.splice(Math.max(0, Math.min(column, cols.length)), 0, [id]);
    }
    const next = without(id);
    next[zone] = fromColumns(cols);
    commit(next, hidden, id);
  };
  const remove = (id: string) => {
    const hidden = new Set(hiddenIds);
    if (!id.startsWith(LIBRARY_PREFIX)) hidden.add(id);
    commit(without(id), hidden, id);
  };
  const restore = (id: string) => {
    const w = known.get(id);
    if (!w) return;
    const hidden = new Set(hiddenIds);
    hidden.delete(id);
    const next = without(id);
    const dest = next[homeZone(w)];
    if (isFlowMarked(dest) && dest[dest.length - 1] !== COLUMN_BREAK) dest.push(COLUMN_BREAK);
    dest.push(id);
    commit(next, hidden, id);
  };

  registry.current.set(screen, {
    hidden: list.filter((w) => hiddenIds.has(w.id)).map((w) => ({ id: w.id, title: w.title })),
    restore,
  });
  return { screen, widgets: known, layout, customized: Boolean(stored), move, remove, restore };
}

// ─── Panel sizes & grab bars ────────────────────────────────────────────────

export interface DockSizes {
  get: (side: DockSide) => number;
  set: (side: DockSide, px: number) => void;
  defaults: Record<DockSide, number>;
  /** Collapse every side to 0, or restore the exact sizes from before that collapse. */
  toggleAll: () => void;
}

/** Sizes of the side columns and the panel under the chat, per kind of screen. 0 = collapsed. */
export function useDockSizes(kind: string, defaults: Record<DockSide, number>): DockSizes {
  const { sizes, setSize, setSides } = useDockContext();
  const memory = useRef<Record<DockSideName, number> | null>(null);
  const toggleAll = useCallback(() => {
    const current = {
      left: sizes[kind]?.left ?? defaults.left,
      right: sizes[kind]?.right ?? defaults.right,
      bottom: sizes[kind]?.bottom ?? defaults.bottom,
    };
    const next = nextDockCollapse(current, memory.current, defaults);
    memory.current = next.remembered;
    setSides(kind, next.sizes);
  }, [defaults, kind, setSides, sizes]);
  return {
    get: (side) => sizes[kind]?.[side] ?? defaults[side],
    set: (side, px) => setSize(kind, side, px),
    defaults,
    toggleAll,
  };
}

/**
 * Invisible grab bar between the chat and a panel. Drag to resize; dragging close to the edge
 * collapses the panel completely, and the bar stays behind so it can be dragged back out.
 * Double-click (or Enter) toggles between collapsed and the default size.
 */
export function DockSplitter({
  side,
  value,
  onChange,
  defaultSize,
  min = 160,
  collapseAt = 70,
  thickness = 8,
  className = "",
}: {
  side: DockSide;
  value: number;
  onChange: (px: number) => void;
  defaultSize: number;
  min?: number;
  collapseAt?: number;
  thickness?: number;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const horizontal = side === "bottom";
  const maxSize = () => (horizontal ? window.innerHeight : window.innerWidth * 0.45);
  const clamp = (px: number) => (px < collapseAt ? 0 : Math.round(Math.max(min, Math.min(maxSize(), px))));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const start = horizontal ? e.clientY : e.clientX;
    const panelEl = horizontal
      ? e.currentTarget.parentElement?.querySelector<HTMLElement>("[data-dock-panel='bottom']")
      : null;
    const renderedPanelHeight = panelEl ? Number(panelEl.dataset.panelHeight || 0) : 0;
    const startValue = horizontal && value > 0 && renderedPanelHeight > 0 ? renderedPanelHeight : value;
    // The left panel grows when the bar moves right; the right and bottom panels grow the other way.
    const sign = side === "left" ? 1 : -1;
    setDragging(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = horizontal ? "row-resize" : "col-resize";
    const onMove = (ev: PointerEvent) => onChange(clamp(startValue + sign * ((horizontal ? ev.clientY : ev.clientX) - start)));
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const toggle = () => onChange(value === 0 ? defaultSize : 0);
  const label = side === "bottom" ? "Resize the panel under the chat" : `Resize the ${side} column`;

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={horizontal ? "horizontal" : "vertical"}
      aria-valuenow={value}
      title={value === 0 ? "Drag to bring the panel back" : "Drag to resize · drag to the edge to collapse"}
      data-dock-splitter={side}
      data-orientation={horizontal ? "horizontal" : "vertical"}
      data-dragging={dragging ? "true" : "false"}
      data-collapsed={value === 0 ? "true" : "false"}
      className={`i2-dock-splitter ${className}`}
      style={horizontal ? { height: thickness, width: "100%" } : { width: thickness, alignSelf: "stretch" }}
      onPointerDown={onPointerDown}
      onDoubleClick={toggle}
      onKeyDown={(e) => {
        const panelEl = horizontal
          ? e.currentTarget.parentElement?.querySelector<HTMLElement>("[data-dock-panel='bottom']")
          : null;
        const renderedPanelHeight = panelEl ? Number(panelEl.dataset.panelHeight || 0) : 0;
        const baseValue = horizontal && value > 0 && renderedPanelHeight > 0 ? renderedPanelHeight : value;
        const grow = horizontal ? "ArrowUp" : side === "left" ? "ArrowRight" : "ArrowLeft";
        const shrink = horizontal ? "ArrowDown" : side === "left" ? "ArrowLeft" : "ArrowRight";
        if (e.key === grow) { e.preventDefault(); onChange(clamp(Math.max(baseValue, min - 24) + 24)); }
        else if (e.key === shrink) { e.preventDefault(); onChange(clamp(baseValue - 24)); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      }}
    />
  );
}

/**
 * A resizable panel (side column or the area under the chat). `size` 0 collapses it without
 * unmounting its content; `animateIn` slides it open from nothing when it first appears.
 */
export function DockPanel({
  side,
  size,
  animateIn = false,
  className = "",
  children,
}: {
  side: DockSide;
  size: number;
  animateIn?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const horizontal = side === "bottom";
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slide = animateIn && !reduced;
  const [entered, setEntered] = useState(!slide);
  const [settled, setSettled] = useState(!slide);
  const lastOpen = useRef(size || 240);
  if (size > 0) lastOpen.current = size;

  useEffect(() => {
    if (entered) return;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [entered]);
  useEffect(() => {
    if (!entered || settled) return;
    const done = window.setTimeout(() => setSettled(true), 820);
    return () => window.clearTimeout(done);
  }, [entered, settled]);

  const shown = entered ? size : 0;
  const panelRef = useRef<HTMLDivElement>(null);
  const [centreBox, setCentreBox] = useState<{ centre: number; bar: number; chatMin: number } | null>(null);
  const [flowMetrics, setFlowMetrics] = useState<{ contentPx: number; itemCount: number }>({ contentPx: 0, itemCount: 0 });
  const prevMetricsRef = useRef({ contentPx: 0, itemCount: 0 });
  const prevSizeRef = useRef(size);
  const prevUsedRef = useRef(shown);
  const manualShrinkRef = useRef(false);
  const manualHeightRef = useRef(false);

  useLayoutEffect(() => {
    if (!horizontal) return;
    const el = panelRef.current;
    const centre = el?.closest("[data-dock-center]") as HTMLElement | null;
    if (!el || !centre) return;
    const measure = () => {
      const bar = centre.querySelector<HTMLElement>("[data-dock-splitter='bottom']");
      const chat = centre.querySelector<HTMLElement>("[data-dock-chat]");
      let chatChrome = 0;
      if (chat) {
        for (const child of Array.from(chat.children) as HTMLElement[]) {
          if (getComputedStyle(child).flexGrow === "0") chatChrome += child.offsetHeight;
        }
      }
      const chatMin = Math.max(DOCK_CHAT_MIN_PX, chatChrome > 0 ? chatChrome + 48 : DOCK_CHAT_MIN_PX);
      const next = { centre: centre.clientHeight, bar: bar?.offsetHeight ?? 8, chatMin };
      setCentreBox((prev) =>
        prev && prev.centre === next.centre && prev.bar === next.bar && prev.chatMin === next.chatMin ? prev : next,
      );
      const flow = el.querySelector<HTMLElement>("[data-dock-flow-list]");
      const nextContent = flow ? Math.ceil(Math.max(flow.offsetHeight, flow.scrollHeight)) : 0;
      const nextItems = el.querySelectorAll("[data-dock-item]").length;
      setFlowMetrics((prev) =>
        Math.abs(prev.contentPx - nextContent) <= 1 && prev.itemCount === nextItems
          ? prev
          : { contentPx: nextContent, itemCount: nextItems },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(centre);
    const chat = centre.querySelector<HTMLElement>("[data-dock-chat]");
    if (chat) ro.observe(chat);
    const flow = el.querySelector<HTMLElement>("[data-dock-flow-list]");
    if (flow) ro.observe(flow);
    const mo = new MutationObserver(() => {
      const nextFlow = el.querySelector<HTMLElement>("[data-dock-flow-list]");
      if (nextFlow) ro.observe(nextFlow);
      measure();
    });
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [horizontal, shown]);

  if (size !== prevSizeRef.current && prevSizeRef.current > 0) manualHeightRef.current = true;
  if (size === 0) {
    manualHeightRef.current = false;
    manualShrinkRef.current = false;
  } else if (
    flowMetrics.contentPx > prevMetricsRef.current.contentPx + 2 ||
    flowMetrics.itemCount > prevMetricsRef.current.itemCount
  ) {
    manualShrinkRef.current = false;
  } else if (size !== prevSizeRef.current) {
    if (prevSizeRef.current > 0 && size < Math.max(prevUsedRef.current, flowMetrics.contentPx) - 1) {
      manualShrinkRef.current = true;
    } else if (size >= flowMetrics.contentPx) {
      manualShrinkRef.current = false;
    }
  }
  prevMetricsRef.current = flowMetrics;
  prevSizeRef.current = size;
  const effectiveContentPx = manualShrinkRef.current ? 0 : flowMetrics.contentPx;
  // Prefer fitting the widgets first. Automatic growth stops at half the center;
  // an explicit splitter resize may use the rest of the viewport.
  const used = !horizontal || shown === 0
    ? shown
    : centreBox
      ? bottomPanelHeight(shown, centreBox.centre, centreBox.chatMin, centreBox.bar, effectiveContentPx, manualHeightRef.current)
      : Math.max(shown, effectiveContentPx);
  prevUsedRef.current = used;
  const offset = entered ? "0px, 0px" : side === "left" ? "-28px, 0px" : side === "right" ? "28px, 0px" : "0px, 28px";
  return (
    <div
      ref={panelRef}
      data-dock-panel={side}
      data-collapsed={size === 0 ? "true" : "false"}
      data-panel-height={horizontal ? used : undefined}
      className={`shrink-0 overflow-hidden ${className}`}
      style={{
        width: horizontal ? "100%" : shown,
        height: horizontal ? used : undefined,
        minHeight: horizontal ? 0 : undefined,
        opacity: entered ? 1 : 0,
        transform: settled ? undefined : `translate(${offset})`,
        transition: settled ? undefined : "width 0.7s cubic-bezier(0.22,1,0.36,1), height 0.7s cubic-bezier(0.22,1,0.36,1), min-height 0.7s cubic-bezier(0.22,1,0.36,1), opacity 0.5s ease, transform 0.7s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {/* Side panels are flex rows (pass a `flex` display class) so the inner column stretches. */}
      <div
        data-dock-panel-body=""
        className="flex flex-col min-w-0 min-h-0"
        style={horizontal
          ? { height: "100%", width: "100%", minHeight: 0, overflow: "hidden" }
          : { width: lastOpen.current, flex: "none", height: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Zone ───────────────────────────────────────────────────────────────────

export function WidgetZone({
  dock,
  zone,
  layout = "column",
  className = "",
  gapClass = "gap-[8px]",
  showDropHint = false,
  onReceive,
  children,
}: {
  dock: WidgetDockHandle;
  zone: string;
  /** "column" stacks widgets vertically; "flow" fills rows left to right, top row first. */
  layout?: "column" | "flow";
  className?: string;
  gapClass?: string;
  /** Show the drop target outline and "Drop here" hint even before a drag begins (e.g. B18 Turn 0). */
  showDropHint?: boolean;
  /** Called after a widget is dropped into this zone (e.g. to re-open a collapsed panel). */
  onReceive?: () => void;
  /** Rendered after the widgets, outside the sortable area. */
  children?: ReactNode;
}) {
  const ctx = useDockContext();
  const zoneRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [resizingEdge, setResizingEdge] = useState<{ id: string; edge: "top" | "bottom" } | null>(null);
  const ids = dock.layout[zone] ?? [];
  const drag = ctx.drag;
  const accepts = Boolean(drag && (drag.kind === "library" || drag.screen === dock.screen));
  const showAccepting = accepts || showDropHint;
  const dropKey = accepts && zoneRef.current && ctx.hover?.el === zoneRef.current ? ctx.hover.spot.key : null;

  // Registered through a ref so the handlers always see the current layout.
  const target: ZoneTarget = {
    accepts: (d) => d.kind === "library" || d.screen === dock.screen,
    indexAt: (x, y) => {
      const list = listRef.current;
      const at = (spot: DropSpot): DropSpot => spot;
      if (!list) return at({ key: "i0", index: 0, stack: false, column: 0, row: 0 });
      if (layout === "column") {
        const items = Array.from(list.querySelectorAll<HTMLElement>(":scope > [data-dock-item]"));
        for (let i = 0; i < items.length; i++) {
          const r = items[i].getBoundingClientRect();
          if (y < r.top + r.height / 2) return at({ key: `i${i}`, index: i, stack: false, column: 0, row: i });
        }
        return at({ key: `i${items.length}`, index: items.length, stack: false, column: 0, row: items.length });
      }
      // Flow columns. The inner band of a column stacks the widget there (music over Current
      // Goal, for example). The left and right edges open a new column beside it.
      const columns = Array.from(list.querySelectorAll<HTMLElement>(":scope > [data-dock-column]"));
      if (columns.length === 0) return at({ key: "c0", index: 0, stack: false, column: 0, row: 0 });
      let best = 0;
      let bestDist = Infinity;
      columns.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const dx = Math.max(r.left - x, 0, x - r.right);
        const dy = Math.max(r.top - y, 0, y - r.bottom);
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; best = i; }
      });
      const r = columns[best].getBoundingClientRect();
      const edge = Math.max(16, Math.min(36, r.width * 0.2));
      const inside = y >= r.top && y <= r.bottom && x >= r.left + edge && x <= r.right - edge;
      if (!inside) {
        const column = x < r.left + r.width / 2 ? best : best + 1;
        return at({ key: `c${column}`, index: column, stack: false, column, row: 0 });
      }
      const items = Array.from(columns[best].querySelectorAll<HTMLElement>(":scope > [data-dock-item]"));
      let row = items.length;
      for (let i = 0; i < items.length; i++) {
        const ir = items[i].getBoundingClientRect();
        if (y < ir.top + ir.height / 2) { row = i; break; }
      }
      return at({ key: `s${best}-${row}`, index: row, stack: true, column: best, row });
    },
    drop: (d, spot) => {
      const id = d.kind === "widget" ? d.id : `${LIBRARY_PREFIX}${d.widgetId}`;
      if (layout === "flow") {
        // New arrivals get a simple best fit. Existing bottom widgets retain exact drop placement.
        const alreadyHere = ids.includes(id);
        const incoming = dock.widgets.get(id);
        const sourceHeight = document.querySelector<HTMLElement>(`[data-dock-item="${CSS.escape(id)}"]`)?.getBoundingClientRect().height;
        const short = sourceHeight ? sourceHeight <= 160 : Boolean(incoming?.small);
        const cols = toColumns(ids, (key) => Boolean(dock.widgets.get(key)?.small));
        const shortCol = cols.findIndex((col) => col.length === 1 && (col[0] === "sessions" || Boolean(dock.widgets.get(col[0])?.small)));
        if (!alreadyHere && short && shortCol >= 0) {
          dock.move(id, zone, 1, { stack: true, column: shortCol, row: 1 });
        } else if (!alreadyHere) {
          dock.move(id, zone, cols.length, { stack: false, column: cols.length, row: 0 });
        } else dock.move(id, zone, spot.index, { stack: spot.stack, column: spot.column, row: spot.row });
      }
      else dock.move(id, zone, spot.index);
      if (d.kind === "library") ctx.noteLibraryDrop();
      onReceive?.();
    },
  };
  const targetRef = useRef(target);
  targetRef.current = target;
  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    const map = ctx.zones.current;
    map.set(el, {
      accepts: (d) => targetRef.current.accepts(d),
      indexAt: (x, y) => targetRef.current.indexAt(x, y),
      drop: (d, i) => targetRef.current.drop(d, i),
    });
    return () => { map.delete(el); };
  }, [ctx.zones]);

  const marker = (key: string, orientation: "h" | "v") =>
    dropKey === key ? (
      <div
        key={`marker-${key}`}
        data-dock-marker
        aria-hidden
        className={`shrink-0 rounded-full bg-[#2dd4bf] shadow-[0_0_10px_rgba(45,212,191,0.7)] ${orientation === "h" ? "h-[3px] -my-[2px]" : "w-[3px] self-stretch -mx-[2px]"}`}
      />
    ) : null;

  const frame = (id: string, slot: FrameSlot) => {
    const widget = dock.widgets.get(id);
    return widget ? (
      <WidgetFrame key={id} dock={dock} widget={widget} slot={slot} />
    ) : (
      <LibraryFrame key={id} dock={dock} id={id} slot={slot} />
    );
  };

  const labelOf = (id: string) =>
    dock.widgets.get(id)?.title ??
    (id.startsWith(LIBRARY_PREFIX) ? (ctx.libraryRef.current?.label(id.slice(LIBRARY_PREFIX.length)) ?? id) : id);

  const minHeightOf = (id: string) => {
    const w = dock.widgets.get(id);
    if (w?.minHeight !== undefined) return w.minHeight;
    if (id.startsWith(LIBRARY_PREFIX)) {
      const libId = id.slice(LIBRARY_PREFIX.length);
      return libId === "emuWeb" || libId === "emuAndroid" || libId === "emuIos" ? 160 : 120;
    }
    return MIN_SHARED_HEIGHT;
  };

  let body: ReactNode;
  if (layout === "column") {
    const columnIds = ids.filter((id) => !FLOW_META.has(id));
    const zoneKey = `${dock.screen}:${zone}`;
    const zoneWeights = ctx.widgetWeights[zoneKey] ?? {};
    const hasNativeGrowOrWeight = columnIds.some(
      (id) =>
        zoneWeights[id] !== undefined ||
        dock.widgets.get(id)?.grow === true ||
        id.startsWith(LIBRARY_PREFIX),
    );
    const fallbackId = !hasNativeGrowOrWeight
      ? [...columnIds].reverse().find((id) => !dock.widgets.get(id)?.pushBottom)
      : undefined;

    const makeSnapshot = () => {
      const listEl = listRef.current;
      if (!listEl) return null;
      const els = Array.from(listEl.querySelectorAll<HTMLElement>(":scope > [data-dock-item]"));
      if (els.length !== columnIds.length) return null;
      return columnIds.map((id, idx) => ({
        id,
        heightPx: els[idx].getBoundingClientRect().height,
        grow: Boolean(dock.widgets.get(id)?.grow || id.startsWith(LIBRARY_PREFIX) || id === fallbackId),
        minHeight: minHeightOf(id),
      }));
    };

    const startColumnResize = (edge: "top" | "bottom", widgetIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const aboveIdx = edge === "bottom" ? widgetIndex : widgetIndex - 1;
      const belowIdx = aboveIdx + 1;
      if (aboveIdx < 0 || belowIdx >= columnIds.length) return;
      const snapshot = makeSnapshot();
      if (!snapshot) return;
      e.preventDefault();
      e.stopPropagation();
      const startY = e.clientY;
      const baseWeights = { ...(ctx.widgetWeights[zoneKey] ?? {}) };
      setResizingEdge({ id: columnIds[widgetIndex], edge });
      document.body.setAttribute("data-widget-resizing", "true");
      document.body.style.userSelect = "none";
      document.body.style.cursor = "row-resize";
      const onMove = (ev: PointerEvent) => {
        ctx.setZoneWeights(zoneKey, computeZoneResizeWeights(snapshot, baseWeights, aboveIdx, belowIdx, ev.clientY - startY));
      };
      const finish = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        document.body.removeAttribute("data-widget-resizing");
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        setResizingEdge(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    };

    const keyColumnResize = (edge: "top" | "bottom", widgetIndex: number, e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const aboveIdx = edge === "bottom" ? widgetIndex : widgetIndex - 1;
      const belowIdx = aboveIdx + 1;
      if (aboveIdx < 0 || belowIdx >= columnIds.length) return;
      const snapshot = makeSnapshot();
      if (!snapshot) return;
      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 32 : 16;
      const deltaY = e.key === "ArrowDown" ? step : -step;
      ctx.setZoneWeights(zoneKey, computeZoneResizeWeights(snapshot, ctx.widgetWeights[zoneKey] ?? {}, aboveIdx, belowIdx, deltaY));
    };

    body = (
      <div ref={listRef} className={`flex flex-col ${gapClass} flex-1 min-h-0 overflow-y-auto`} style={{ scrollbarWidth: "thin" }}>
        {columnIds.map((id, i) => [
          marker(`i${i}`, "h"),
          frame(id, {
            kind: "column",
            zone,
            last: i === columnIds.length - 1,
            fallbackGrow: id === fallbackId,
            canResizeTop: i > 0,
            canResizeBottom: i < columnIds.length - 1,
            resizingEdge: resizingEdge?.id === id ? resizingEdge.edge : null,
            topNeighborTitle: i > 0 ? labelOf(columnIds[i - 1]) : undefined,
            bottomNeighborTitle: i < columnIds.length - 1 ? labelOf(columnIds[i + 1]) : undefined,
            onStartResize: (edge, e) => startColumnResize(edge, i, e),
            onKeyResize: (edge, e) => keyColumnResize(edge, i, e),
            onResetZoneResize: () => ctx.setZoneWeights(zoneKey, undefined),
          }),
        ])}
        {marker(`i${columnIds.length}`, "h")}
        {showAccepting && columnIds.length === 0 && <DropHint />}
      </div>
    );
  } else {
    // Each flow cell is a column. Short widgets, and an explicit inside-drop, stack in that column.
    const columns = toColumns(ids, smallFlag(dock.widgets));
    const stackKey = `${dock.screen}:${zone}`;

    const startStackResize = (colIds: string[], edge: "top" | "bottom", rowIdx: number, e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const aboveIdx = edge === "bottom" ? rowIdx : rowIdx - 1;
      const belowIdx = aboveIdx + 1;
      if (aboveIdx < 0 || belowIdx >= colIds.length) return;
      const colEl = e.currentTarget.closest("[data-dock-column]");
      if (!colEl) return;
      const els = Array.from(colEl.querySelectorAll<HTMLElement>(":scope > [data-dock-item]"));
      if (els.length !== colIds.length) return;
      e.preventDefault();
      e.stopPropagation();
      const aboveId = colIds[aboveIdx];
      const belowId = colIds[belowIdx];
      const startAbove = els[aboveIdx].getBoundingClientRect().height;
      const startBelow = els[belowIdx].getBoundingClientRect().height;
      const minAbove = minHeightOf(aboveId);
      const minBelow = minHeightOf(belowId);
      const startY = e.clientY;
      setResizingEdge({ id: colIds[rowIdx], edge });
      document.body.setAttribute("data-widget-resizing", "true");
      document.body.style.userSelect = "none";
      document.body.style.cursor = "row-resize";
      const onMove = (ev: PointerEvent) => {
        const { abovePx, belowPx } = clampPairResize(startAbove, startBelow, ev.clientY - startY, minAbove, minBelow);
        ctx.setStackPairHeights(stackKey, { [aboveId]: abovePx, [belowId]: belowPx });
      };
      const finish = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        document.body.removeAttribute("data-widget-resizing");
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        setResizingEdge(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    };

    const keyStackResize = (colIds: string[], edge: "top" | "bottom", rowIdx: number, e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const aboveIdx = edge === "bottom" ? rowIdx : rowIdx - 1;
      const belowIdx = aboveIdx + 1;
      if (aboveIdx < 0 || belowIdx >= colIds.length) return;
      const colEl = e.currentTarget.closest("[data-dock-column]");
      if (!colEl) return;
      const els = Array.from(colEl.querySelectorAll<HTMLElement>(":scope > [data-dock-item]"));
      if (els.length !== colIds.length) return;
      e.preventDefault();
      e.stopPropagation();
      const aboveId = colIds[aboveIdx];
      const belowId = colIds[belowIdx];
      const step = e.shiftKey ? 32 : 16;
      const deltaY = e.key === "ArrowDown" ? step : -step;
      const { abovePx, belowPx } = clampPairResize(
        els[aboveIdx].getBoundingClientRect().height,
        els[belowIdx].getBoundingClientRect().height,
        deltaY,
        minHeightOf(aboveId),
        minHeightOf(belowId),
      );
      ctx.setStackPairHeights(stackKey, { [aboveId]: abovePx, [belowId]: belowPx });
    };

    body = (
      <div ref={listRef} data-dock-flow-list data-flow-shared={columns.flat().length > 1 ? "true" : "false"} className={`grid ${gapClass} w-full flex-1 min-h-0 overflow-auto`} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gridAutoRows: "minmax(160px, 1fr)", scrollbarWidth: "thin" }}>
        {columns.map((col, ci) => {
          return (
            <Fragment key={`${ci}:${col.join("+")}`}>
              {marker(`c${ci}`, "v")}
              <div data-dock-column data-dock-stack={col.length > 1 ? "true" : undefined} className={`flex flex-col ${gapClass} min-w-0 min-h-0 overflow-y-auto`}>
                {col.map((id, j) => (
                  <Fragment key={id}>
                    {marker(`s${ci}-${j}`, "h")}
                    {frame(
                      id,
                      col.length > 1
                        ? {
                            kind: "stack",
                            zone,
                            canResizeTop: j > 0,
                            canResizeBottom: j < col.length - 1,
                            resizingEdge: resizingEdge?.id === id ? resizingEdge.edge : null,
                            topNeighborTitle: j > 0 ? labelOf(col[j - 1]) : undefined,
                            bottomNeighborTitle: j < col.length - 1 ? labelOf(col[j + 1]) : undefined,
                            onStartResize: (edge, e) => startStackResize(col, edge, j, e),
                            onKeyResize: (edge, e) => keyStackResize(col, edge, j, e),
                            onResetZoneResize: () => ctx.setStackPairHeights(stackKey, undefined),
                          }
                        : { kind: "flow" },
                    )}
                  </Fragment>
                ))}
                {marker(`s${ci}-${col.length}`, "h")}
              </div>
            </Fragment>
          );
        })}
        {marker(`c${columns.length}`, "v")}
        {showAccepting && columns.length === 0 && <DropHint />}
      </div>
    );
  }

  return (
    <div
      ref={zoneRef}
      data-dock-zone={zone}
      data-dock-layout={layout}
      data-dock-accepting={showAccepting ? "true" : undefined}
      className={`${className} ${layout === "flow" ? `flex-1 min-h-0 overflow-hidden w-full` : ""} ${showAccepting ? "outline-1 outline-dashed outline-[#2dd4bf]/35 -outline-offset-1 rounded-[8px]" : ""}`}
    >
      {body}
      {children}
    </div>
  );
}

function DropHint() {
  return (
    <div className="flex-1 min-h-[60px] grid place-items-center font-['Rounded_Mplus_1c',sans-serif] text-[10px] uppercase tracking-wide text-[#2dd4bf]/70">
      Drop here
    </div>
  );
}

// ─── Frame ──────────────────────────────────────────────────────────────────

const INTERACTIVE = "button, a, input, textarea, select, [role='button'], [data-no-widget-gesture]";

function headerOwnedBy(target: Element, widgetId: string, frameOnly = false, allowMoveGrip = false): boolean {
  if (!target.closest("[data-widget-header]")) return false;
  if (target.closest(INTERACTIVE) && !(allowMoveGrip && target.closest("[data-widget-move-grip]"))) return false;
  const overlay = target.closest("[data-widget-overlay]");
  if (frameOnly && overlay) return false;
  const owner = overlay ?? target.closest("[data-dock-item]");
  const id = owner?.getAttribute("data-widget-overlay") ?? owner?.getAttribute("data-dock-item");
  return id === widgetId;
}

type ResizeHandlers = {
  zone: string;
  canResizeTop?: boolean;
  canResizeBottom?: boolean;
  resizingEdge?: "top" | "bottom" | null;
  topNeighborTitle?: string;
  bottomNeighborTitle?: string;
  onStartResize?: (edge: "top" | "bottom", e: React.PointerEvent<HTMLDivElement>) => void;
  onKeyResize?: (edge: "top" | "bottom", e: React.KeyboardEvent<HTMLDivElement>) => void;
  onResetZoneResize?: () => void;
};

type FrameSlot =
  | ({ kind: "column"; last: boolean; fallbackGrow?: boolean } & ResizeHandlers)
  | { kind: "flow" }
  | ({ kind: "stack" } & ResizeHandlers);

function WidgetFrame({ dock, widget, slot }: { dock: WidgetDockHandle; widget: DockWidget; slot: FrameSlot }) {
  const ctx = useDockContext();
  const frameRef = useRef<HTMLDivElement>(null);
  const clickTimer = useRef<number | null>(null);
  const gesture = useRef<HeaderGesture>({ count: 0, mode: "normal", pendingToggle: false });
  const headerAnchor = useRef<HeaderAnchorBox | null>(null);
  const key = `${dock.screen}:${widget.id}`;
  const mode: WidgetMode = ctx.active?.key === key ? ctx.active.mode : "normal";
  const dragging = ctx.drag?.kind === "widget" && ctx.drag.screen === dock.screen && ctx.drag.id === widget.id;
  const widgetRef = useRef(widget);
  widgetRef.current = widget;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  if (gesture.current.count === 0) gesture.current.mode = mode;

  const setMode = useCallback(
    (next: WidgetMode) => {
      modeRef.current = next;
      if (gesture.current.count === 0) gesture.current.mode = next;
      ctx.setActive(next === "normal" ? null : { key, mode: next });
    },
    [ctx, key],
  );

  const commitGestureMode = (next: HeaderMode) => {
    gesture.current.mode = next;
    if (next !== modeRef.current) setMode(next);
  };
  const onHeaderClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (dockClickWasSwallowed()) return;
    const header = target.closest("[data-widget-header]");
    const owned = headerOwnedBy(target, widget.id);
    const overlay = target.closest("[data-widget-overlay]");
    const kind = classifyHeaderGestureClick({
      onInteractive: Boolean(target.closest(INTERACTIVE)),
      onOwnedHeader: owned,
      gestureOpen: gesture.current.count > 0,
      inAnchor: pointInHeaderAnchor(headerAnchor.current, event.clientX, event.clientY),
      onForeignHeader: Boolean(header) && !owned,
      onOwnOverlay: overlay?.getAttribute("data-widget-overlay") === widget.id,
    });
    if (!kind) return;
    // The expanding overlay covers the header. Swallow the continuation so the
    // backdrop's "click outside" handler does not restore the widget first.
    if (kind === "continue") {
      event.preventDefault();
      event.stopPropagation();
    } else if (header) {
      headerAnchor.current = headerAnchorBox(header.getBoundingClientRect());
    }
    const next = applyHeaderClick(gesture.current, Boolean(widgetRef.current.onExpand));
    gesture.current = { count: next.count, mode: next.mode, pendingToggle: next.pendingToggle };
    if (next.count === 0) headerAnchor.current = null;
    if (next.customCall) widgetRef.current.onExpand?.();
    if (!widgetRef.current.onExpand) commitGestureMode(next.mode);
    if (clickTimer.current) window.clearTimeout(clickTimer.current);
    clickTimer.current = null;
    if (next.count === 0) return;
    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null;
      // Expand / Fullscreen / Restore set the mode directly. Do not let the
      // header-click timer pull that choice back when it expires.
      if (gesture.current.mode !== modeRef.current) {
        gesture.current = { count: 0, mode: modeRef.current, pendingToggle: false };
        headerAnchor.current = null;
        return;
      }
      const expired = expireHeaderGesture(gesture.current);
      gesture.current = expired;
      headerAnchor.current = null;
      if (!widgetRef.current.onExpand) commitGestureMode(expired.mode);
    }, HEADER_CLICK_GAP_MS);
  };
  useEffect(() => () => { if (clickTimer.current) window.clearTimeout(clickTimer.current); }, []);

  useEffect(() => {
    if (mode === "normal") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("normal");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, setMode]);

  // Capture on window so a portaled music player and a header that has just moved into the
  // overlay both count, including a third click that arrives before this frame re-renders.
  const dialogRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      onHeaderClick(e);
    };
    const onDown = (e: PointerEvent) => {
      if (modeRef.current !== "normal") return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!headerOwnedBy(target, widget.id, true, true)) return;
      const current = widgetRef.current;
      ctxRef.current.beginDrag(e, { kind: "widget", screen: dock.screen, id: current.id, label: current.title });
    };
    window.addEventListener("click", onClick, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("pointerdown", onDown, true);
    };
    // The handler reads refs so it stays valid for the life of this widget id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dock.screen, widget.id]);

  // Unmounting (route change) must not leave a ghost expanded state behind.
  useEffect(() => () => {
    ctx.setActive(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = typeof widget.node === "function" ? widget.node(mode) : widget.node;
  const chip = "rounded bg-[#1d1b20]/85 text-[#666] transition-colors p-0.5";

  const controls =
    mode === "normal" ? (
      <div data-no-widget-gesture className={`absolute z-[50] top-[5px] right-[6px] flex items-center gap-1 transition-opacity ${widget.id === "music" ? "opacity-100" : "opacity-0 group-hover/dock:opacity-100 focus-within:opacity-100"}`}>
        {!widget.onExpand && (
          <button type="button" onClick={() => setMode("expanded")} title="Expand" aria-label={`Expand ${widget.title}`} className={`${chip} hover:text-[#abefa3]`}>
            <Maximize2 size={10} />
          </button>
        )}
        {widget.removable !== false && (
          <button type="button" data-widget-remove={widget.id} onClick={() => dock.remove(widget.id)} title="Remove widget (bring it back from Widgets)" aria-label={`Remove ${widget.title}`} className={`${chip} hover:text-[#ff8a8a]`}>
            <X size={10} />
          </button>
        )}
      </div>
    ) : (
      <div data-no-widget-gesture className="absolute z-[2] top-[9px] right-[10px] flex items-center gap-1">
        <button type="button" onClick={() => setMode(mode === "fullscreen" ? "expanded" : "fullscreen")} title={mode === "fullscreen" ? "Exit fullscreen" : "Fullscreen"} aria-label={mode === "fullscreen" ? "Exit fullscreen" : "Fullscreen"} className="p-1 rounded text-[#777] hover:text-[#abefa3] hover:bg-white/5 transition-colors">
          {mode === "fullscreen" ? <Minimize2 size={13} /> : <Expand size={13} />}
        </button>
        <button type="button" onClick={() => setMode("normal")} title="Back to normal" aria-label={`Restore ${widget.title}`} className="p-1 rounded text-[#666] hover:text-[#abefa3] hover:bg-white/5 transition-colors">
          <X size={14} />
        </button>
      </div>
    );

  // How the frame takes space depends on where it sits.
  const shared = dock.customized;
  const zoneKey = `${dock.screen}:${"zone" in slot ? slot.zone : ""}`;
  const customWeight = slot.kind === "column" ? ctx.widgetWeights[zoneKey]?.[widget.id] : undefined;
  const stackHeight = slot.kind === "stack" ? ctx.stackHeights[zoneKey]?.[widget.id] : undefined;
  const effectiveGrow =
    slot.kind === "column" && (customWeight !== undefined || Boolean(widget.grow) || Boolean(slot.fallbackGrow));
  let style: React.CSSProperties;
  if (slot.kind === "column") {
    const growValue = customWeight ?? widget.growWeight ?? 1;
    const flex = effectiveGrow
      ? `${growValue} 1 0%`
      : `0 ${shared || widget.shrink ? 1 : 0} ${widget.basis ? `${widget.basis}px` : "auto"}`;
    const minHeight =
      widget.minHeight ??
      (customWeight !== undefined
        ? DEFAULT_WIDGET_MIN_HEIGHT
        : shared
          ? MIN_SHARED_HEIGHT
          : effectiveGrow
            ? DEFAULT_WIDGET_MIN_HEIGHT
            : 0);
    style = { flex, minHeight, marginTop: widget.pushBottom && slot.last && customWeight === undefined ? "auto" : undefined };
  } else if (slot.kind === "flow") {
    // Bound every flow frame to its grid cell; long bodies scroll inside it.
    style = { flex: "1 1 0%", width: "100%", minHeight: 72, overflow: "hidden" };
  } else {
    style =
      stackHeight !== undefined
        ? { flex: `${stackHeight} 1 0%`, width: "100%", minHeight: widget.minHeight ?? DEFAULT_WIDGET_MIN_HEIGHT }
        : { flex: `${widget.small ? 0 : 1} 1 ${widget.small ? (widget.basis ?? 100) + "px" : "0%"}`, width: "100%", minHeight: widget.minHeight ?? DEFAULT_WIDGET_MIN_HEIGHT };
  }
  // A bottom-panel widget sizes to its content unless stacked with explicit heights. Column widgets
  // with grow/basis/custom weights fill their bounded share and scale inner bodies accordingly.
  const boundedHeight =
    mode !== "normal" ||
    (slot.kind === "column" && (effectiveGrow || Boolean(widget.basis))) ||
    slot.kind === "flow" || slot.kind === "stack";
  const scrolls = (slot.kind !== "column" || shared || effectiveGrow || widget.shrink || Boolean(widget.basis));
  const fills = boundedHeight && (widget.fill === true || widget.fill === "expanded" || effectiveGrow || stackHeight !== undefined);
  const bodyClass = boundedHeight
    ? "flex flex-col min-w-0 min-h-0 flex-[1_1_0%] [&>*]:flex-[1_1_0%] [&>*]:min-h-0"
    : "flex flex-col min-w-0 flex-auto [&>*]:flex-auto [&>*]:min-h-0";
  const bodyOverflowClass =
    mode === "normal"
      ? `rounded-[6px] ${fills ? "overflow-hidden" : scrolls ? "overflow-y-auto" : ""}`
      : "";

  const renderEdgeHandle = (edge: "top" | "bottom") => {
    if (mode !== "normal" || slot.kind === "flow") return null;
    const enabled = edge === "top" ? slot.canResizeTop : slot.canResizeBottom;
    if (!enabled) return null;
    const otherTitle = edge === "top" ? slot.topNeighborTitle : slot.bottomNeighborTitle;
    const label =
      edge === "top"
        ? `Resize ${otherTitle ?? "previous widget"} and ${widget.title}`
        : `Resize ${widget.title} and ${otherTitle ?? "next widget"}`;
    const isDraggingEdge = slot.resizingEdge === edge;
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label={label}
        tabIndex={0}
        data-no-widget-gesture
        data-widget-resize={edge}
        data-resize-widget={widget.id}
        data-dragging={isDraggingEdge ? "true" : undefined}
        title="Drag to resize vertically (double-click to reset)"
        className={`i2-widget-edge-handle ${edge === "top" ? "-top-[4px]" : "-bottom-[4px]"}`}
        onPointerDown={(e) => slot.onStartResize?.(edge, e)}
        onKeyDown={(e) => slot.onKeyResize?.(edge, e)}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          slot.onResetZoneResize?.();
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  };

  return (
    <div
      ref={frameRef}
      data-dock-item={widget.id}
      data-widget-mode={mode}
      tabIndex={widget.onHeaderKeyDown ? 0 : undefined}
      onKeyDown={widget.onHeaderKeyDown ? (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "Enter") {
          event.preventDefault();
          widget.onHeaderKeyDown?.();
        }
      } : undefined}
      className={`group/dock relative flex flex-col w-full min-w-0 rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abefa3]/50 ${dragging ? "opacity-40" : ""}`}
      style={{ ...style, maxHeight: "100%", scrollbarWidth: "thin" }}
    >
      <WidgetFillContext.Provider value={boundedHeight}>
        {mode === "normal" ? (
          <>
            <div data-dock-body className={`${bodyClass} ${bodyOverflowClass}`} style={{ scrollbarWidth: "thin" }}>
              {content}
            </div>
            {controls}
            {renderEdgeHandle("top")}
            {renderEdgeHandle("bottom")}
          </>
        ) : (
          <>
            <div data-dock-body className="grid place-items-center flex-1 rounded-[6px] border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 font-['Rounded_Mplus_1c',sans-serif] text-[10px] uppercase tracking-wide text-[#555]" style={{ minHeight: 48 }}>
              {widget.title} · {mode}
            </div>
            {createPortal(
              <div
                data-widget-overlay={widget.id}
                data-widget-mode={mode}
                className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onClick={() => setMode("normal")}
              >
                <div
                  ref={dialogRef}
                  role="dialog"
                  aria-label={widget.title}
                  onClick={(e) => e.stopPropagation()}
                  className={`bg-[#1a1a1a] border border-white/8 rounded-[10px] shadow-2xl flex flex-col overflow-auto ${mode === "fullscreen" ? "fixed inset-3" : "relative w-[860px] h-[580px] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"}`}
                >
                  {controls}
                  <div data-dock-body className={`${bodyClass} [&>*]:!rounded-none [&>*]:!border-0`} style={{ zoom: mode === "fullscreen" ? 1.7 : 1.4 }}>
                    {content}
                  </div>
                </div>
              </div>,
              document.body,
            )}
          </>
        )}
      </WidgetFillContext.Provider>
    </div>
  );
}

/** A gallery widget the user dragged into a zone. */
function LibraryFrame({ dock, id, slot }: { dock: WidgetDockHandle; id: string; slot: FrameSlot }) {
  const { libraryRef } = useDockContext();
  const widgetId = id.slice(LIBRARY_PREFIX.length);
  const lib = libraryRef.current;
  const title = lib?.label(widgetId) ?? widgetId;
  const isEmulator = widgetId === "emuWeb" || widgetId === "emuAndroid" || widgetId === "emuIos";
  const widget: DockWidget = {
    id,
    title,
    zone: "",
    grow: true,
    growWeight: isEmulator ? 1.5 : 1,
    basis: isEmulator ? 380 : 240,
    minHeight: isEmulator ? 160 : 120,
    fill: true,
    node: (mode) => (
      <div data-library-widget={widgetId} className="flex flex-col rounded-[6px] overflow-clip border border-[rgba(255,255,255,0.05)] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] w-full">
        <div data-widget-header className="bg-[#1d1b20] border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2 px-3 py-[7px] shrink-0 w-full">
          <GripVertical size={12} className="text-[#3a3a3a]" />
          <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">{title}</span>
        </div>
        <div className="bg-[#252323] relative flex flex-col overflow-auto flex-1 min-h-0">
          {lib?.render(widgetId, mode)}
        </div>
      </div>
    ),
  };
  return <WidgetFrame dock={dock} widget={widget} slot={slot} />;
}
