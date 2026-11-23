# i2 Companion Guidelines

## Source Of Truth

- The `project/` folder is the golden source of truth for product intent,
  roadmap, visual style, and technical rules.
- Agents and contributors must read `project/info.md`, `project/todo.md`,
  `project/style.md`, and this file before making product or architecture
  changes.
- Honor the `Component Strategy` section in `project/info.md` (`Decision: confirmed`).

## Product Context

- Audience: i2 developers on Meta Quest 3/3S, Android, iOS, and Web
- Core flows: Sign-in with demo credentials, coherent simulated shared environment state across independent i2 widgets (`EnvironmentProviderPort` with honest future `local-host` / `cloud-host` boundaries — never claim cross-device sync today and never model as remote desktop video streaming), Quest VR per-window OpenXR compositor cockpit, 3D Infie state machine, and device-specific tutorials
- Data needs: Local UI/app state and SQLite persistence (`expo-sqlite` native + WASM COOP/COEP on web)
- Deployment target: Meta Quest 3/3S (`QUEST_BUILD=1`), Android, iOS, and static Web
- Target platforms:
  - quest (via `QUEST_BUILD=1` Android build)
  - android
  - ios
  - web
- First MVP platform: quest
- Expo Router app directory: `src/app`
- Platform-specific organization: platform-specific files only
- Platform layout mode: platform-specific layouts
- Web output: static
- Deployed server: no deployed server planned
- Auth: plainly simulated local demo login (`dev@i2.app` / `password`); never claim it secures a hosted deployment
- Data start: local dummy data with Expo SQLite
- Test-to-main safeguards: yes

## Expo & Quest Architecture

- Keep Expo Router route files thin; route files import feature screens or layouts.
- Put reusable business logic in `src/features`, `src/services`, `src/ports`, `src/adapters`, `src/data`, or `src/stores`.
- Dual-root Quest boundary: `VRActivity` shares the JS runtime with `MainActivity` but mounts a separate React root; bridge shared state exclusively via module-level `zustand/vanilla` stores.
- Isolate `@reactvision/react-viro` Quest build modifications behind `QUEST_BUILD=1` (`app.config.ts`) so phone builds remain stock.
- Prefer Uniwind with Tailwind v4 for 2D styling work; keep private credentials out of `EXPO_PUBLIC_` and SQLite.

## Workflow

- Run `npm run lint`, `npm run typecheck`, `npm run test:unit`, and `npm run build:web` before declaring changes ready.
- Never fabricate physical headset validation when a Quest 3/3S device is not attached.

## Selected Defaults

- project-docs
- guidelines
- uniwind
- doctor
- test-to-main
- sqlite-local
