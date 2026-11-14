import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { RefreshCw, AlertTriangle, Smartphone, Monitor } from "lucide-react";
import type { PreviewVersion } from "./types.ts";
import { PREVIEW_MANIFEST, getResolvedPreviewUrl, isLoopbackHostname } from "./manifest.ts";
import {
  fitScale,
  getPreviewViewport,
  type PreviewDevice,
  type PreviewOrientation,
} from "./viewport.ts";

// How long the iframe may take to load before the honest unavailable state is shown.
const LOAD_TIMEOUT_MS = 15000;
// Bounded reachability probe timeout for loopback snapshot URLs so stopped servers fail fast.
const LOOPBACK_PROBE_TIMEOUT_MS = 2500;
// Height of the size-readout row above the viewport (kept out of the fit calculation).
const HEADER_ROW_PX = 30;

function isLoopbackPreviewUrl(url: string): boolean {
  if (!url || typeof window === "undefined") return false;
  try {
    const parsed = new URL(url, window.location.href);
    return isLoopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
}

interface ExactWebPreviewFrameProps {
  version: PreviewVersion;
  device: PreviewDevice;
  orientation: PreviewOrientation;
  /** "inline" fits the viewport to the column width (capped by maxHeight); "fill" fits the parent box. */
  mode?: "inline" | "fill";
  maxHeight?: number;
  className?: string;
}

/**
 * The real embedded web preview. The iframe element is laid out at the true CSS viewport size for
 * the chosen device/orientation (so media queries inside it respond); only a wrapper transform
 * visually shrinks it to fit.
 */
export function ExactWebPreviewFrame({
  version,
  device,
  orientation,
  mode = "inline",
  maxHeight = 420,
  className = "",
}: ExactWebPreviewFrameProps) {
  const manifest = PREVIEW_MANIFEST[version];
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => getResolvedPreviewUrl(version));
  const [probeReady, setProbeReady] = useState<boolean>(() => {
    const initial = getResolvedPreviewUrl(version);
    return Boolean(initial) && !isLoopbackPreviewUrl(initial);
  });
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    resolvedUrl ? "loading" : "unavailable"
  );
  const [reloadNonce, setReloadNonce] = useState<number>(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const url = getResolvedPreviewUrl(version);
    setResolvedUrl(url);
    if (!url) {
      setProbeReady(false);
      setStatus("unavailable");
      return;
    }
    if (!isLoopbackPreviewUrl(url)) {
      setProbeReady(true);
      setStatus("loading");
      return;
    }

    let cancelled = false;
    setProbeReady(false);
    setStatus("loading");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), LOOPBACK_PROBE_TIMEOUT_MS);

    void fetch(url, {
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(() => {
        if (cancelled) return;
        setProbeReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setProbeReady(false);
        setStatus("unavailable");
      })
      .finally(() => {
        window.clearTimeout(timer);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [version, reloadNonce]);

  useEffect(() => {
    if (status !== "loading") return;
    const t = window.setTimeout(() => setStatus("unavailable"), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [status, version, reloadNonce]);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const viewport = getPreviewViewport(device, orientation);
  const available =
    mode === "fill"
      ? { width: box.width, height: box.height - HEADER_ROW_PX }
      : { width: box.width, height: maxHeight };
  const scale = fitScale(viewport, available);
  const scaledWidth = Math.round(viewport.width * scale);
  const scaledHeight = Math.round(viewport.height * scale);

  const reload = () => {
    setStatus("loading");
    setReloadNonce((n) => n + 1);
  };

  return (
    <div
      ref={boxRef}
      className={`flex flex-col items-center justify-center select-none ${
        mode === "fill" ? "w-full h-full" : "w-full"
      } ${className}`}
      data-testid="exact-web-preview-frame"
      data-preview-version={version}
      data-device={device}
      data-orientation={orientation}
      data-layout-width={viewport.width}
      data-layout-height={viewport.height}
      data-scale={scale.toFixed(3)}
    >
      <div className="flex w-full items-center justify-between gap-2 px-1 pb-1.5 text-[10px] font-['Rounded_Mplus_1c',sans-serif] text-[#777]">
        <span data-testid="preview-size-readout">
          {viewport.width} × {viewport.height}
        </span>
        <button
          type="button"
          onClick={reload}
          title="Reload preview"
          aria-label="Reload preview"
          className="p-1 rounded text-[#71717a] hover:text-white hover:bg-white/5 transition-colors"
        >
          <RefreshCw size={11} className={status === "loading" ? "animate-spin text-[#2dd4bf]" : ""} />
        </button>
      </div>

      <div
        data-testid="preview-viewport"
        className="relative shrink-0 overflow-hidden rounded-[6px] border border-white/10 bg-white"
        style={{ width: scaledWidth, height: scaledHeight }}
      >
        {resolvedUrl && probeReady && status !== "unavailable" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: viewport.width,
              height: viewport.height,
              transformOrigin: "top left",
              transform: `scale(${scale})`,
            }}
          >
            <iframe
              key={`${resolvedUrl}-${reloadNonce}`}
              src={resolvedUrl}
              data-testid="preview-iframe"
              title={manifest.label}
              aria-label={manifest.label}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              onLoad={() => setStatus("ready")}
              style={{ width: viewport.width, height: viewport.height, border: "none", display: "block" }}
            />
          </div>
        )}

        {status === "loading" && (
          <div
            data-testid="preview-loading"
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090b]/90 gap-2"
          >
            <RefreshCw size={20} className="animate-spin text-[#2dd4bf]" />
            <p className="text-[11px] text-[#a1a1aa]">Loading preview...</p>
          </div>
        )}

        {status === "unavailable" && (
          <div
            data-testid="preview-unavailable"
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090b] p-3 text-center gap-2"
          >
            <AlertTriangle size={22} className="text-[#f59e0b]" />
            <p className="text-[12px] font-semibold text-white">Preview unavailable</p>
            <p className="text-[11px] text-[#a1a1aa] max-w-[240px]">
              The web preview isn't running right now.
            </p>
            <button
              type="button"
              data-testid="preview-retry-button"
              onClick={reload}
              className="px-3 py-1 rounded-md bg-[#27272a] text-white text-[11px] hover:bg-[#3f3f46]"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Desktop/Mobile and Portrait/Landscape toggles shared by the inline widget and the modal. */
export function PreviewViewportControls({
  device,
  orientation,
  onDeviceChange,
  onOrientationChange,
}: {
  device: PreviewDevice;
  orientation: PreviewOrientation;
  onDeviceChange: (device: PreviewDevice) => void;
  onOrientationChange: (orientation: PreviewOrientation) => void;
}) {
  const btn = (active: boolean) =>
    `flex items-center gap-1 px-2 py-1 rounded text-[10px] font-['Rounded_Mplus_1c',sans-serif] transition-colors ${
      active ? "bg-[#373434] text-white" : "text-[#666] hover:text-[#aaa]"
    }`;
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="preview-viewport-controls">
      <div role="group" aria-label="Device" className="flex items-center gap-0.5 bg-black/30 rounded-[5px] p-0.5">
        {(["desktop", "mobile"] as const).map((d) => (
          <button
            key={d}
            type="button"
            data-testid={`preview-device-${d}`}
            aria-pressed={device === d}
            onClick={() => onDeviceChange(d)}
            className={btn(device === d)}
          >
            {d === "desktop" ? <Monitor size={10} /> : <Smartphone size={10} />}
            {d === "desktop" ? "Desktop" : "Mobile"}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Orientation" className="flex items-center gap-0.5 bg-black/30 rounded-[5px] p-0.5">
        {(["portrait", "landscape"] as const).map((o) => (
          <button
            key={o}
            type="button"
            data-testid={`preview-orientation-${o}`}
            aria-pressed={orientation === o}
            onClick={() => onOrientationChange(o)}
            className={btn(orientation === o)}
          >
            {o === "portrait" ? "Portrait" : "Landscape"}
          </button>
        ))}
      </div>
    </div>
  );
}
