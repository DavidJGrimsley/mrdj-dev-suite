// True CSS layout sizes for the responsive web preview. The iframe element is laid out at
// exactly these dimensions (so browser media queries inside it see them); a scale-to-fit
// wrapper may shrink it visually, but never changes the layout size.

export type PreviewDevice = "desktop" | "mobile";
export type PreviewOrientation = "portrait" | "landscape";

export interface PreviewViewport {
  width: number;
  height: number;
}

export const PREVIEW_VIEWPORTS: Record<
  PreviewDevice,
  Record<PreviewOrientation, PreviewViewport>
> = {
  desktop: {
    portrait: { width: 960, height: 1200 },
    landscape: { width: 1200, height: 960 },
  },
  mobile: {
    portrait: { width: 390, height: 720 },
    landscape: { width: 720, height: 390 },
  },
};

export const DEFAULT_PREVIEW_DEVICE: PreviewDevice = "desktop";
export const DEFAULT_PREVIEW_ORIENTATION: PreviewOrientation = "portrait";

export function getPreviewViewport(
  device: PreviewDevice,
  orientation: PreviewOrientation
): PreviewViewport {
  return PREVIEW_VIEWPORTS[device][orientation];
}

/** Scale (<= 1) that fits a viewport inside the available box. Never enlarges. */
export function fitScale(
  viewport: PreviewViewport,
  available: { width: number; height: number }
): number {
  if (!(available.width > 0) || !(available.height > 0)) return 1;
  const scale = Math.min(
    1,
    available.width / viewport.width,
    available.height / viewport.height
  );
  return Math.max(0.05, scale);
}
