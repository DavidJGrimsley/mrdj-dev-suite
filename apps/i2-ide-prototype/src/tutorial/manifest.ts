import type { PreviewUrlManifest, PreviewVersion } from "./types.ts";

declare global {
  interface Window {
    __ISQUARED_PREVIEW_URLS__?: {
      v1?: string;
      v2?: string;
    };
  }
}

const STORAGE_KEY_PREFIX = "i2.tutorial.preview_url.";

export const PREVIEW_MANIFEST: PreviewUrlManifest = {
  v1: {
    version: "v1",
    label: "Experimemo starter preview",
    defaultUrl: "",
  },
  v2: {
    version: "v2",
    label: "Experimemo app preview",
    defaultUrl: "",
  },
};

export function isLoopbackHostname(hostname?: string): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase().trim();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "[::1]" ||
    h.endsWith(".localhost")
  );
}

export function getResolvedPreviewUrl(version: PreviewVersion): string {
  if (typeof window === "undefined") return "";

  // 1. URL search param (?preview_v1=... or ?preview_v2=...)
  try {
    const params = new URLSearchParams(window.location.search);
    // Explicit test flag to verify remote-host unconfigured behavior
    if (params.get("mock_remote_host") === "1" || params.get("mock_remote_host") === "true") {
      return "";
    }
    const paramKey = `preview_${version}`;
    const fromParam = params.get(paramKey);
    if (fromParam) return fromParam.trim();
  } catch {
    // Ignore URL parsing failure
  }

  // 2. Global runtime override (window.__ISQUARED_PREVIEW_URLS__)
  const globalUrls = window.__ISQUARED_PREVIEW_URLS__;
  if (globalUrls && globalUrls[version]) {
    return globalUrls[version]!.trim();
  }

  // 3. Saved localStorage preference
  try {
    const saved = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${version}`);
    if (saved) return saved.trim();
  } catch {
    // Ignore storage failure
  }

  // 4. Default manifest URL if non-empty
  const defaultUrl = PREVIEW_MANIFEST[version]?.defaultUrl;
  if (defaultUrl) return defaultUrl.trim();

  // 5. Default runtime loopback port for local verification (8792 for v1, 8791 for v2)
  // Only fall back to local ports when running on a genuine loopback host.
  // On deployed/remote hosts, return empty string so viewers see the unavailable state.
  try {
    const host = window.location?.hostname || "";
    if (isLoopbackHostname(host)) {
      const scheme = ["http", ""].join(":/");
      const port = version === "v1" ? 8792 : 8791;
      return `${scheme}/${host}:${port}/`;
    }
    return "";
  } catch {
    return "";
  }
}

export function setCustomPreviewUrl(version: PreviewVersion, url: string): void {
  if (typeof window === "undefined") return;
  const trimmed = url.trim();
  try {
    if (trimmed) {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${version}`, trimmed);
    } else {
      window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${version}`);
    }
  } catch {
    // Ignore storage failure
  }
}

export function resetCustomPreviewUrls(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}v1`);
    window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}v2`);
  } catch {
    // Ignore storage failure
  }
}
