import { HEADER_CLICK_GAP_MS } from "../widgets/dockBehavior.ts";

/** Home right column stays at the B12 height until a third project needs another row. */
export const ACTIVE_PROJECTS_FIXED_HEIGHT_CLASS = "lg:h-[604px]";
/** Minimum space under Generate / Import, matching the home scroll padding. */
export const HOME_BOTTOM_PADDING_CLASS = "pb-[48px]";
/**
 * Recognition gap for headers that commit after the clicks stop (Active Projects
 * and the shell Widget). Same window as the dock, so a natural third click still
 * arrives before a double-click is committed.
 */
export const WIDGET_HEADER_CLICK_MS = HEADER_CLICK_GAP_MS;

export function activeProjectsFit(projectCount: number, tutorial: boolean): "fixed" | "grow" {
  if (tutorial || projectCount <= 2) return "fixed";
  return "grow";
}

export function headerClickAction(clickCount: number): "expand" | "fullscreen" | null {
  if (clickCount === 2) return "expand";
  if (clickCount >= 3) return "fullscreen";
  return null;
}
