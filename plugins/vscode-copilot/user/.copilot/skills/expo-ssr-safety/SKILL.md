---
name: "Expo SSR Safety Skill"
description: "Instructions for avoiding web/server runtime crashes."
---

# Skill: Expo SSR Safety

Use when preparing or debugging Expo Router web/server output paths.

## Main rule

Assume server runtime first: guard browser-only APIs, isolate native-only code, and keep shared modules safe in both client and server contexts.

## Checks

- Guard `window`, `document`, `navigator`, `localStorage`, and `sessionStorage` access.
- Confirm client-only packages are not imported by server/API execution paths.
- Confirm storage/session access happens in client-safe lifecycle points.
- Verify API routes and server modules do not rely on browser globals.
- Validate dynamic imports or adapters for platform-specific behavior.

## Preferred structure

- Use small environment-check helpers for browser-global access.
- Split client-only logic behind platform/runtime-specific modules.
- Keep server-safe defaults and explicit fallbacks in shared utilities.

## Example fix

- Problem: Shared auth helper reads `localStorage` at module load and crashes SSR.
- Fix: Move storage access into guarded runtime functions and provide a server-safe fallback.

## Agent behavior

- Fix crash-risk paths first, then clean up architecture.
- Delegate framework SSR primitives to official Expo docs, then apply MDS-specific guard patterns and Doctor rule compatibility.

