// Widget dock: drag-to-rearrange zones, double-click to expand, triple-click for fullscreen,
// delete/restore, and resizable (collapsible) side and bottom panels.
//
// A screen registers its widgets once (`useWidgetDock` / `buildDock`) and renders one
// `WidgetZone` per area: the side columns stack widgets vertically, the panel under the chat
// lays them out as a flow grid. Any widget can be dragged by its header into another zone on
// the same screen, and widgets from the Widgets gallery can be dragged in as well.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { GripVertical, Maximize2, Minimize2, Expand, X } from "lucide-react";

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
  /** Flow zone: short widgets pair up on top of each other in one grid cell. */
  small?: boolean;
  /** Flow zone: preferred cell width in px. */
  flowWidth?: number;
  /** Replace the built-in expand/fullscreen with the widget's own enlarge action. */
  onExpand?: () => void;
}

type DragState =
  | { kind: "widget"; screen: string; id: string; label: string }
  | { kind: "library"; widgetId: string; label: string };

/** What a zone registers so the provider can route a pointer drag to it. */
interface ZoneTarget {
  accepts: (drag: DragState) => boolean;
  indexAt: (clientX: number, clientY: number) => number;
  drop: (drag: DragState, index: number) => void;
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
  drag: DragState | null;
  /** Zone element and insertion index currently under the dragged widget. */
  hover: { el: Element; index: number } | null;
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

export const LIBRARY_PREFIX = "lib:";
const CLICK_WINDOW_MS = 260;
const DRAG_THRESHOLD_PX = 6;
const MIN_SHARED_HEIGHT = 72;

export function WidgetDockProvider({ children }: { children: ReactNode }) {
  const [layouts, setLayouts] = useState<Record<string, StoredLayout | undefined>>({});
  const [sizes, setSizes] = useState<Record<string, Partial<Record<DockSide, number>>>>({});
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
  const noteLibraryDrop = useCallback(() => setLibraryDrops((n) => n + 1), []);

  // Pointer-driven drag (mouse, pen and touch alike): nothing moves until the pointer has
  // travelled a few px, so plain clicks and double/triple clicks on a header still register.
  const beginDrag = useCallback((e: PointerStart, payload: DragState) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let current: { el: Element; index: number } | null = null;

    const targetAt = (x: number, y: number) => {
      for (const el of document.elementsFromPoint(x, y)) {
        const zoneEl = el.closest("[data-dock-zone]");
        const zone = zoneEl && zones.current.get(zoneEl);
        if (zoneEl && zone?.accepts(payload)) return { el: zoneEl, index: zone.indexAt(x, y) };
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
      if (next?.el !== current?.el || next?.index !== current?.index) {
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
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      // The click that ends a drag must not count as a header click or open a gallery tile.
      const swallow = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener("click", swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener("click", swallow, true), 0);
      if (commit && current) zones.current.get(current.el)?.drop(payload, current.index);
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
    () => ({ layouts, setLayout, sizes, setSize, drag, hover, beginDrag, zones, active, setActive, libraryRef, libraryDrops, noteLibraryDrop, registry }),
    [layouts, setLayout, sizes, setSize, drag, hover, beginDrag, active, libraryDrops, noteLibraryDrop],
  );
  return (
    <DockContext.Provider value={value}>
      {children}
      {drag &&
        createPortal(
          <div
            ref={ghostRef}
            data-dock-ghost
            className="fixed left-0 top-0 z-[80] pointer-events-none flex items-center gap-1.5 rounded-[6px] border border-[#2dd4bf]/60 bg-[#1d1b20]/95 px-2.5 py-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.5)] font-['Rounded_Mplus_1c',sans-serif] text-[11px] uppercase tracking-wide text-[#2dd4bf]"
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
  move: (id: string, zone: string, index: number) => void;
  remove: (id: string) => void;
  restore: (id: string) => void;
}

/** Resolves the screen's stored layout against the widgets that exist right now. */
export function useWidgetDock(screen: string, zones: readonly string[], widgets: readonly (DockWidget | false | null | undefined)[]): WidgetDockHandle {
  return buildDock(useDockApi(), screen, zones, widgets);
}

export type DockApi = Pick<DockContextValue, "layouts" | "setLayout" | "registry">;

/** The hook half of `useWidgetDock`, for components that must call hooks before an early return. */
export function useDockApi(): DockApi {
  const { layouts, setLayout, registry } = useDockContext();
  return { layouts, setLayout, registry };
}

export function buildDock({ layouts, setLayout, registry }: DockApi, screen: string, zones: readonly string[], widgets: readonly (DockWidget | false | null | undefined)[]): WidgetDockHandle {
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
        if (placed.has(id) || hiddenIds.has(id)) continue;
        if (known.has(id) || id.startsWith(LIBRARY_PREFIX)) {
          layout[z].push(id);
          placed.add(id);
        }
      }
    }
    // Widgets that appeared after the user arranged things join their home zone.
    for (const w of list) if (!placed.has(w.id) && !hiddenIds.has(w.id)) layout[homeZone(w)].push(w.id);
  } else {
    for (const w of list) layout[homeZone(w)].push(w.id);
  }

  const commit = (next: Layout, hidden: Iterable<string>) => setLayout(screen, { zones: next, hidden: [...hidden] });
  const without = (id: string): Layout => {
    const next: Layout = {};
    for (const z of zones) next[z] = (layout[z] ?? []).filter((x) => x !== id);
    return next;
  };

  const move = (id: string, zone: string, index: number) => {
    let insertAt = index;
    const from = (layout[zone] ?? []).indexOf(id);
    if (from !== -1 && from < index) insertAt -= 1;
    const next = without(id);
    next[zone].splice(Math.max(0, Math.min(insertAt, next[zone].length)), 0, id);
    const hidden = new Set(hiddenIds);
    hidden.delete(id);
    commit(next, hidden);
  };
  const remove = (id: string) => {
    const hidden = new Set(hiddenIds);
    if (!id.startsWith(LIBRARY_PREFIX)) hidden.add(id);
    commit(without(id), hidden);
  };
  const restore = (id: string) => {
    const w = known.get(id);
    if (!w) return;
    const hidden = new Set(hiddenIds);
    hidden.delete(id);
    const next = without(id);
    next[homeZone(w)].push(id);
    commit(next, hidden);
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
}

/** Sizes of the side columns and the panel under the chat, per kind of screen. 0 = collapsed. */
export function useDockSizes(kind: string, defaults: Record<DockSide, number>): DockSizes {
  const { sizes, setSize } = useDockContext();
  return {
    get: (side) => sizes[kind]?.[side] ?? defaults[side],
    set: (side, px) => setSize(kind, side, px),
    defaults,
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
  const maxSize = () => (horizontal ? window.innerHeight * 0.65 : window.innerWidth * 0.45);
  const clamp = (px: number) => (px < collapseAt ? 0 : Math.round(Math.max(min, Math.min(maxSize(), px))));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const start = horizontal ? e.clientY : e.clientX;
    const startValue = value;
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
        const grow = horizontal ? "ArrowUp" : side === "left" ? "ArrowRight" : "ArrowLeft";
        const shrink = horizontal ? "ArrowDown" : side === "left" ? "ArrowLeft" : "ArrowRight";
        if (e.key === grow) { e.preventDefault(); onChange(clamp(Math.max(value, min - 24) + 24)); }
        else if (e.key === shrink) { e.preventDefault(); onChange(clamp(value - 24)); }
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
  const offset = entered ? "0px, 0px" : side === "left" ? "-28px, 0px" : side === "right" ? "28px, 0px" : "0px, 28px";
  return (
    <div
      data-dock-panel={side}
      data-collapsed={size === 0 ? "true" : "false"}
      className={`shrink-0 overflow-hidden ${className}`}
      style={{
        [horizontal ? "height" : "width"]: shown,
        opacity: entered ? 1 : 0,
        transform: settled ? undefined : `translate(${offset})`,
        transition: settled ? undefined : "width 0.7s cubic-bezier(0.22,1,0.36,1), height 0.7s cubic-bezier(0.22,1,0.36,1), opacity 0.5s ease, transform 0.7s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {/* Side panels are flex rows (pass a `flex` display class) so the inner column stretches. */}
      <div className="flex flex-col min-h-0 min-w-0" style={horizontal ? { height: lastOpen.current, width: "100%" } : { width: lastOpen.current, flex: "none" }}>
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
  onReceive,
  children,
}: {
  dock: WidgetDockHandle;
  zone: string;
  /** "column" stacks widgets vertically; "flow" fills rows left to right, top row first. */
  layout?: "column" | "flow";
  className?: string;
  gapClass?: string;
  /** Called after a widget is dropped into this zone (e.g. to re-open a collapsed panel). */
  onReceive?: () => void;
  /** Rendered after the widgets, outside the sortable area. */
  children?: ReactNode;
}) {
  const ctx = useDockContext();
  const zoneRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const ids = dock.layout[zone] ?? [];
  const drag = ctx.drag;
  const accepts = Boolean(drag && (drag.kind === "library" || drag.screen === dock.screen));
  const dropIndex = accepts && zoneRef.current && ctx.hover?.el === zoneRef.current ? ctx.hover.index : null;

  // Registered through a ref so the handlers always see the current layout.
  const target: ZoneTarget = {
    accepts: (d) => d.kind === "library" || d.screen === dock.screen,
    indexAt: (x, y) => {
      const list = listRef.current;
      if (!list) return 0;
      if (layout === "column") {
        const items = Array.from(list.querySelectorAll<HTMLElement>(":scope > [data-dock-item]"));
        for (let i = 0; i < items.length; i++) {
          const r = items[i].getBoundingClientRect();
          if (y < r.top + r.height / 2) return i;
        }
        return items.length;
      }
      // Flow: insert next to the nearest widget, before or after depending on which half the
      // pointer is over (top/bottom half for widgets stacked in one cell, left/right otherwise).
      const items = Array.from(list.querySelectorAll<HTMLElement>("[data-dock-item]"));
      let best = -1;
      let bestDist = Infinity;
      items.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const dx = Math.max(r.left - x, 0, x - r.right);
        const dy = Math.max(r.top - y, 0, y - r.bottom);
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; best = i; }
      });
      if (best === -1) return 0;
      const r = items[best].getBoundingClientRect();
      const stacked = items[best].parentElement?.hasAttribute("data-dock-stack");
      const before = stacked ? y < r.top + r.height / 2 : x < r.left + r.width / 2;
      return before ? best : best + 1;
    },
    drop: (d, index) => {
      if (d.kind === "widget") dock.move(d.id, zone, index);
      else {
        dock.move(`${LIBRARY_PREFIX}${d.widgetId}`, zone, index);
        ctx.noteLibraryDrop();
      }
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

  const marker = (i: number, orientation: "h" | "v") =>
    dropIndex === i ? (
      <div
        key={`marker-${i}`}
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

  let body: ReactNode;
  if (layout === "column") {
    body = (
      <div ref={listRef} className={`flex flex-col ${gapClass} flex-1 min-h-0 overflow-y-auto`} style={{ scrollbarWidth: "thin" }}>
        {ids.map((id, i) => [marker(i, "h"), frame(id, { kind: "column", last: i === ids.length - 1 })])}
        {marker(ids.length, "h")}
        {accepts && ids.length === 0 && dropIndex === null && <DropHint />}
      </div>
    );
  } else {
    // Group consecutive short widgets into pairs that share one grid cell.
    const cells: { ids: string[]; start: number }[] = [];
    ids.forEach((id, i) => {
      const small = dock.widgets.get(id)?.small;
      const last = cells[cells.length - 1];
      if (small && last && last.ids.length < 2 && last.ids.every((x) => dock.widgets.get(x)?.small)) last.ids.push(id);
      else cells.push({ ids: [id], start: i });
    });
    body = (
      <div ref={listRef} className={`flex flex-wrap content-stretch items-stretch ${gapClass} flex-1 min-h-0 overflow-y-auto`} style={{ scrollbarWidth: "thin" }}>
        {cells.map((cell) =>
          cell.ids.length === 1
            ? [marker(cell.start, "v"), frame(cell.ids[0], { kind: "flow" })]
            : [
                marker(cell.start, "v"),
                <div key={`stack-${cell.ids.join("+")}`} data-dock-stack className={`flex flex-col ${gapClass} min-w-0 min-h-0`} style={{ flex: "1 1 240px" }}>
                  {cell.ids.map((id, j) => [j > 0 ? marker(cell.start + j, "h") : null, frame(id, { kind: "stack" })])}
                </div>,
              ],
        )}
        {marker(ids.length, "v")}
        {accepts && ids.length === 0 && dropIndex === null && <DropHint />}
      </div>
    );
  }

  return (
    <div
      ref={zoneRef}
      data-dock-zone={zone}
      data-dock-layout={layout}
      data-dock-accepting={accepts ? "true" : undefined}
      className={`${className} ${accepts ? "outline-1 outline-dashed outline-[#2dd4bf]/35 -outline-offset-1 rounded-[8px]" : ""}`}
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

type FrameSlot = { kind: "column"; last: boolean } | { kind: "flow" } | { kind: "stack" };

function WidgetFrame({ dock, widget, slot }: { dock: WidgetDockHandle; widget: DockWidget; slot: FrameSlot }) {
  const ctx = useDockContext();
  const frameRef = useRef<HTMLDivElement>(null);
  const clickTimer = useRef<number | null>(null);
  const clickCount = useRef(0);
  const key = `${dock.screen}:${widget.id}`;
  const mode: WidgetMode = ctx.active?.key === key ? ctx.active.mode : "normal";
  const dragging = ctx.drag?.kind === "widget" && ctx.drag.screen === dock.screen && ctx.drag.id === widget.id;

  const setMode = useCallback(
    (next: WidgetMode) => ctx.setActive(next === "normal" ? null : { key, mode: next }),
    [ctx, key],
  );

  // Double-click toggles expanded, triple-click toggles fullscreen (from any state).
  const applyClicks = (count: number) => {
    if (widget.onExpand) {
      if (count >= 2) widget.onExpand();
      return;
    }
    if (count === 2) setMode(mode === "expanded" ? "normal" : "expanded");
    else if (count >= 3) setMode(mode === "fullscreen" ? "normal" : "fullscreen");
  };
  const onHeaderClick = (e: { target: EventTarget | null }) => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-widget-header]") || target.closest(INTERACTIVE)) return;
    clickCount.current += 1;
    if (clickTimer.current) window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => {
      const count = clickCount.current;
      clickCount.current = 0;
      applyClicks(count);
    }, CLICK_WINDOW_MS);
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

  // Header gestures are wired with native listeners: some widget content is portaled in from
  // elsewhere in the React tree (the persistent music player), and React events from a portal
  // bubble to its React parent, not to this frame. Native events follow the DOM.
  const dialogRef = useRef<HTMLDivElement>(null);
  const gestures = useRef({ click: (_e: MouseEvent) => {}, down: (_e: PointerEvent) => {} });
  gestures.current = {
    click: (e) => onHeaderClick(e),
    down: (e) => {
      if (mode !== "normal") return;
      const target = e.target as HTMLElement;
      if (!target.closest("[data-widget-header]") || target.closest(INTERACTIVE)) return;
      ctx.beginDrag(e, { kind: "widget", screen: dock.screen, id: widget.id, label: widget.title });
    },
  };
  useEffect(() => {
    const el = mode === "normal" ? frameRef.current : dialogRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => gestures.current.click(e);
    const onDown = (e: PointerEvent) => gestures.current.down(e);
    el.addEventListener("click", onClick);
    el.addEventListener("pointerdown", onDown);
    return () => {
      el.removeEventListener("click", onClick);
      el.removeEventListener("pointerdown", onDown);
    };
  }, [mode]);

  // Unmounting (route change) must not leave a ghost expanded state behind.
  useEffect(() => () => {
    ctx.setActive(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = typeof widget.node === "function" ? widget.node(mode) : widget.node;
  const chip = "rounded bg-[#1d1b20]/85 text-[#666] transition-colors p-0.5";

  const controls =
    mode === "normal" ? (
      <div data-no-widget-gesture className="absolute z-[2] top-[5px] right-[6px] flex items-center gap-1 opacity-0 group-hover/dock:opacity-100 focus-within:opacity-100 transition-opacity">
        {!widget.onExpand && (
          <button type="button" onClick={() => setMode("expanded")} title="Expand" aria-label={`Expand ${widget.title}`} className={`${chip} hover:text-[#abefa3]`}>
            <Maximize2 size={10} />
          </button>
        )}
        <button type="button" data-widget-remove={widget.id} onClick={() => dock.remove(widget.id)} title="Remove widget (bring it back from Widgets)" aria-label={`Remove ${widget.title}`} className={`${chip} hover:text-[#ff8a8a]`}>
          <X size={10} />
        </button>
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
  let style: React.CSSProperties;
  if (slot.kind === "column") {
    const flex = widget.grow ? "1 1 0%" : `0 ${shared || widget.shrink ? 1 : 0} ${widget.basis ? `${widget.basis}px` : "auto"}`;
    const minHeight = shared ? Math.max(MIN_SHARED_HEIGHT, widget.minHeight ?? 0) : widget.minHeight ?? (widget.grow ? 1 : undefined);
    style = { flex, minHeight, marginTop: widget.pushBottom && slot.last ? "auto" : undefined };
  } else if (slot.kind === "flow") {
    style = { flex: `1 1 ${widget.flowWidth ?? 280}px`, minWidth: 0, minHeight: 110 };
  } else {
    style = { flex: "1 1 0%", minHeight: 80 };
  }
  const scrolls = slot.kind !== "column" || shared || widget.grow || widget.shrink || Boolean(widget.basis);
  const fills = widget.fill === true || (widget.fill === "expanded" && mode !== "normal");
  const bodyClass = fills
    ? "flex flex-col min-w-0 min-h-0 flex-[1_1_0%] [&>*]:flex-[1_1_0%] [&>*]:min-h-0"
    : "flex flex-col min-w-0 flex-[1_0_auto] [&>*]:flex-[1_0_auto]";

  return (
    <div
      ref={frameRef}
      data-dock-item={widget.id}
      data-widget-mode={mode}
      className={`group/dock relative flex flex-col w-full min-w-0 rounded-[6px] ${dragging ? "opacity-40" : ""} ${fills ? "overflow-hidden" : scrolls ? "overflow-y-auto" : ""}`}
      style={{ ...style, scrollbarWidth: "thin" }}
    >
      {mode === "normal" ? (
        <>
          {controls}
          <div data-dock-body className={bodyClass}>{content}</div>
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
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
    </div>
  );
}

/** A gallery widget the user dragged into a zone. */
function LibraryFrame({ dock, id, slot }: { dock: WidgetDockHandle; id: string; slot: FrameSlot }) {
  const { libraryRef } = useDockContext();
  const widgetId = id.slice(LIBRARY_PREFIX.length);
  const lib = libraryRef.current;
  const title = lib?.label(widgetId) ?? widgetId;
  const widget: DockWidget = {
    id,
    title,
    zone: "",
    basis: 240,
    fill: true,
    node: (mode) => (
      <div data-library-widget={widgetId} className="flex flex-col rounded-[6px] overflow-clip border border-[rgba(255,255,255,0.05)] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] w-full">
        <div data-widget-header className="bg-[#1d1b20] border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2 px-3 py-[7px] shrink-0 w-full">
          <GripVertical size={12} className="text-[#3a3a3a]" />
          <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">{title}</span>
        </div>
        <div className="bg-[#252323] relative overflow-auto flex-1 min-h-0">
          {lib?.render(widgetId, mode)}
        </div>
      </div>
    ),
  };
  return <WidgetFrame dock={dock} widget={widget} slot={slot} />;
}
