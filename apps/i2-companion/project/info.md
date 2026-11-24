# i2 Companion Project Info

## App Name
i2 Companion

## Overview
Multi-platform independent i2 interface for Meta Quest 3/3S, Android, iOS, and Web. i2 Companion is NOT a remote desktop pixel/video stream: it presents the same environments, projects, sessions, conversations, tasks, reviews, emulators (simulated app previews), and widgets as the desktop product. Future releases will connect to a computer-hosted (`local-host`) or cloud-hosted (`cloud-host`) environment so actions across devices update the same environment state; this prototype uses single-device simulated shared environment state only with zero networking.

## Target Users
Developers using i2 and Meta Quest 3/3S, Android, iOS, or Web to monitor projects, interact with Infie, arrange spatial widgets, review sessions/diffs/previews, and run guided companion tutorials.

## Problem this app solves
Developers need a comfortable spatial VR cockpit and portable mobile/web companion to inspect projects, manage sessions, collaborate with Infie, and customize multi-widget workspaces without being tied to a single flat monitor.

## Product Goals
- Deliver an independent native i2 workspace on Quest 3/3S, Android, iOS, and Web where widgets and per-window OpenXR compositor panels share coherent simulated environment state (`EnvironmentProviderPort`) without remote desktop pixel streaming.
- Provide customizable, persistent spatial widget layouts (per-window OpenXR compositor surfaces on Quest) ranging from minimal `Infie + Emulator` to a grouped `Batcave Command` cockpit and unlimited user-designed layouts within real runtime layer limits.
- Maintain strict adapter boundaries separating single-device `Simulated Local Environment` mode (`simulated-local`, zero networking) from future computer-hosted (`local-host`) and cloud-hosted (`cloud-host`) providers using reusable `PrototypeLimit` boundaries.

## Non-Goals
- No live external authentication, real networking, real desktop host connection, real cloud connection, or cross-device sync in this prototype (do not claim two separate devices synchronize today).
- No remote desktop pixel/video streaming (`desktopStream` replaced by native `workspaceEnv` `i² Environments`).
- No account creation inside the companion (accounts originate in the i2 desktop product).

## First User Flow
Sign in with demo credentials (`dev@i2.app` / `password`), pass device-specific companion onboarding/tutorial (with replay), inspect connection state (`Simulated Demo`), and open the Home -> Project -> Session workspace or Quest VR cockpit.

## Core Flows and Features
- Spatial Quest VR sign-in + 2D fallback sign-in (no create-account button; plainly simulated).
- Fully customizable Quest VR spatial widget layouts (add, remove, move, resize, expand, save/restore named presets in local SQLite).
- True 3D Infie character (`Mist`, `Glyph`, `Surge`, `Compile`, `Controller`) with runtime VFX and Mist-intermediary form state machine across all platforms.
- Desktop-prototype parity widgets (`Global To-Do`, `Explorer`, `Project Folder`, `Agent Tasks`, `Human Testing`, `Git`, `Terminal`, `EAS`, `Stylist`, `Doctor`, `Problems`, `Extensions`, `Timeline`, `Search`, `Outline`, `Web Preview`, `Android`, `iOS`, `Sessions`, `Actions`, `Library`, `Preference Sliders`, `Music`) backed by `CapabilityMatrix` + `PrototypeLimit`.
- Device-specific companion tutorials (`quest`, `android`, `ios`, `web`) with local persistence and replay.

## Screens
- Auth / Sign-In (`/` -> Sign-In gate)
- Home (`I2HomeScreen` / `JennyCreationScreen` / `ImportProjectFlow`)
- Project Home (`ProjectHomeScreen`)
- Session View (`SessionScreen` + `Emulators` / `Review`)
- Quest VR Cockpit (`quest-vr` spatial workspace + 2D launcher)
- Settings (`Settings` + Connection Mode + Layout Presets)

## Platforms
- Target platforms: quest, android, ios, web
- First MVP platform: quest (Meta Quest 3 / 3S), then android, ios, web

## Monetization Strategy
Free local companion prototype; pricing tiers (`Personal` / `Business`) are previewed as simulated UI boundaries.

## Team Context
Single developer + AI engineering workflow inside the `mrdj-dev-suite` i2 workspace.

## Legal & Compliance Contact
- Business Name: Mr. DJ's Dev Suite (Local Prototype)
- Contact Email: dev@i2.app
- Address Or Region Note: Local offline-first companion prototype; no external data transmission.

## Later Scope & Possibilities
- Connect `local-host` (`EnvironmentProviderPort`) to a live computer-hosted i2 environment for real project/session/chat/Doctor/Terminal and live preview sync across clients.
- Connect `cloud-host` (`EnvironmentProviderPort`) to a cloud-hosted i2 environment so headset and desktop clients share live state remotely.

## Research, Notes, and References
- Desktop prototype reference: `apps/i2-ide-prototype`
- Infie 3D assets: `generated/infie-prototype`
- Quest VR references: `F:/ReactNativeApps/neo-rock-em-sock-em-robots-i2Workspace` and `F:/ReactNativeApps/medical-viewer-i2Workspace`

# Tech Stack & CESS Onboarding

- TypeScript: Yes
- Package Manager: npm
- Navigation: Expo Router
- Type of Navigation: Stack
- Expo Router app directory: `src/app`
- Platform-specific organization: platform-specific files only
- Platform layout mode: platform-specific layouts
- Web output: static

- Style Library: Uniwind
- Which NativeWindUI components: All
- Components from create-expo-app: No
- Expo UI: Yes
- Expo UI Universal components: Yes
- Expo Native Tabs: Yes

- Which Software Mansion packages: All
- State management library: Zustand
- Auth: None (plainly simulated local demo credentials)
- Onboarding Flow: multi-screen
- Legal Documents: onboarding-agreement
- Onboarding Completion: enter-app
- Legal Update Gate: none
- Onboarding Persistence: zustand-local
- Data Categories: Local UI/app state, Offline sync/cache (SQLite)
- Starting Data mode: local dummy data with Expo SQLite.

- Internationalization: None
- Analytics: None
- EAS: No
- Deployed server: no deployed server planned
- Initial Deployment plan: Meta Quest 3/3S local development build, plus Android, iOS, and static Expo web export

- Start with MDS project guidelines template: Yes
- Use test-to-main safeguards: Yes

## Component Strategy

This record is the Phase 0 style and component decision. Confirmed it before implementation so later agents apply the same UI system without re-asking.

- Style Library: Uniwind
- Expo UI: Yes
- Expo UI Universal components: Yes
- Expo Native Tabs: Yes
- Conflicts:
  - styling-system-and-expo-ui-universal (warning): Uniwind does not style Expo UI Universal components. Use Expo UI APIs for those surfaces; keep product screens on Uniwind.
  - styling-system-and-native-tabs (info): Expo Native Tabs render native tab chrome and ignore Uniwind tab-bar styles.
- Decision: confirmed

## Ejection Inventory

This record is the Phase 0 retain/eject decision for generated starter and template components.

- Decision: confirmed
- Items:
  - settings: retain (active)
  - stylist: eject (ejected — replaced by unified Companion `stylist` widget)
  - exposition: eject (ejected — removed `src/app/exposition`, `src/components/exposition`, `src/features/exposition`)
  - data: retain (active — upgraded to full companion SQLite repositories)
  - onboarding: retain (active — adapted for device-specific companion tutorials)
  - legal: retain (active)
  - expo-sdk-56: eject (upgraded to Expo SDK 57 + RN 0.86.3)
