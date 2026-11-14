import React from "react";
import type { ProviderId } from "./types.ts";

export const PROVIDER_ACCENT: Record<ProviderId, string> = {
  openai: "#60a5fa",
  claude: "#c084fc",
  gemini: "#a5b4fc",
};

/**
 * Compact, recognizable local SVG provider marks (no external network assets or icon libraries).
 */
export function ProviderIcon({
  provider,
  size = 14,
  className = "",
}: {
  provider: ProviderId;
  size?: number;
  className?: string;
}) {
  const color = PROVIDER_ACCENT[provider];

  if (provider === "openai") {
    // Recognizable OpenAI interwoven knot mark
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        data-provider-icon="openai"
        className={`shrink-0 ${className}`}
      >
        <path
          d="M12 2.75a4.25 4.25 0 0 1 3.74 2.23 4.25 4.25 0 0 1 5.01 5.29 4.25 4.25 0 0 1-1.26 6.84 4.25 4.25 0 0 1-5.64 4.14A4.25 4.25 0 0 1 8.26 19a4.25 4.25 0 0 1-5.01-5.29 4.25 4.25 0 0 1 1.26-6.84A4.25 4.25 0 0 1 12 2.75Z"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polygon
          points="12,8.4 15.1,10.2 15.1,13.8 12,15.6 8.9,13.8 8.9,10.2"
          stroke={color}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M12 4.5v3.9M15.1 10.2l3.4-1.95M15.1 13.8l3.4 1.95M12 15.6v3.9M8.9 13.8l-3.4 1.95M8.9 10.2L5.5 8.25"
          stroke={color}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (provider === "claude") {
    // Recognizable Anthropic/Claude radiating starburst mark
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        data-provider-icon="claude"
        className={`shrink-0 ${className}`}
      >
        <path
          d="M12 2.5v5.1M12 16.4v5.1M2.5 12h5.1M16.4 12h5.1M5.28 5.28l3.6 3.6M15.12 15.12l3.6 3.6M18.72 5.28l-3.6 3.6M8.88 15.12l-3.6 3.6M7.6 3.6l2.3 4.55M14.1 15.85l2.3 4.55M20.4 7.6l-4.55 2.3M8.15 14.1l-4.55 2.3"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="2.2" fill={color} />
      </svg>
    );
  }

  // Recognizable Gemini 4-point sparkle star mark
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      data-provider-icon="gemini"
      className={`shrink-0 ${className}`}
    >
      <path
        d="M12 2.2C12.75 7.45 16.55 11.25 21.8 12C16.55 12.75 12.75 16.55 12 21.8C11.25 16.55 7.45 12.75 2.2 12C7.45 11.25 11.25 7.45 12 2.2Z"
        fill={color}
        fillOpacity="0.22"
        stroke={color}
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <circle cx="18.2" cy="5.8" r="1.1" fill={color} />
    </svg>
  );
}
