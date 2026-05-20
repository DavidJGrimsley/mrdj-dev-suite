---
name: "Dev Server Management Skill"
description: "Instructions for recovering Expo/Metro local dev-server state and resolving port/cache conflicts."
---

# Skill: Dev Server Management

Use when Expo or Metro local development servers fail to boot cleanly, hang, or bind to conflicting ports.

## Main rule

Use a deterministic reset path first; do not work around unstable server state with ad-hoc port fallbacks.

## Checks

- Run `mds clear-expo-start`  before manual troubleshooting.
- If a conflict remains, run `mds free-port <port...>` for blocked ports.
- Confirm Expo/Metro caches are cleared before retrying startup.
- Treat fallback to port `8082` as an unresolved state that requires full reset.
- Confirm the same recovery scripts are available to teammates and automation.

## Preferred structure

- Keep project scripts for clear-expo-start and targeted port cleanup.
- Standardize a single restart path in project memory (`project/guidelines.md`).
- Use explicit “fresh” commands when booting local or production-like flows.

## Example fix

- Problem: `expo start` repeatedly falls back to `8082` after a partial crash.
- Fix: Run `mds clear-expo-start`, free remaining blocked ports, clear cache, and restart via the project's clear-expo-start script.

## Agent behavior

- Prefer established MDS cleanup commands over custom shell sequences.
- Avoid introducing alternate fallback port workflows that hide root-cause server state issues.
- Delegate Expo or Metro mechanics to official Expo guidance, then apply MDS reset commands, script consistency, and onboarding defaults.
