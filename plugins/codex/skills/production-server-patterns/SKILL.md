# Skill: Production Server Patterns

Use when setting up or debugging how an Expo project serves production traffic.

## Main rule

Pick one explicit production serving mode per environment and codify it in scripts; avoid mixed runtime assumptions.

## Checks

- Confirm selected mode is documented: managed Expo/EAS, Express adapter, or dual-server.
- Confirm serving scripts match the selected runtime (`npx expo serve`, `node server.js`, or dual process scripts).
- Confirm routing boundaries are clear when app and API are separate services.
- Confirm env var ownership differs correctly across app server and API server in dual-server mode.
- Confirm “fresh” start scripts exist where server state/caches can cause drift.

## Preferred structure

- Define `serve:prod` and `serve:prod:fresh` scripts for the chosen mode.
- Keep server bootstrap and adapter code in dedicated files/modules.
- Keep deployment notes aligned with runtime mode in project memory.

## Example fix

- Problem: Team mixes Expo serve and custom Express commands, causing inconsistent behavior.
- Fix: Select one primary mode per environment, standardize scripts, and document routing/env boundaries.

## Agent behavior

- Use the project’s declared serving mode unless a migration is explicitly requested.
- Delegate framework runtime primitives to official Expo docs, then enforce MDS conventions for script consistency, environment boundaries, and operational clarity.
