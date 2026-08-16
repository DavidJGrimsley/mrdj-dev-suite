# Experimemo Project Info

## App Name
Experimemo

## Overview

Experimemo is a stable regression fixture for MDS generator quality. It exercises Expo Router route groups, stack modal presentation, generated exposition pages, Theme/Stylist artifacts, local data, onboarding, and web/iOS/Android output.

## Target Users

MDS maintainers validating generated Expo app quality across web and mobile.

## Problem this app solves
# TodoForContext(optional): Explain the user problem or pain this app exists to solve.

## Product Goals

# TodoForContext(optional): Add the business/product outcomes that would make this app successful.

## Non-Goals

Production app polish; Hosted backend integration; Real user authentication; Extra features beyond regression coverage

## First User Flow

Open the home screen, navigate generated exposition links, launch onboarding, open the settings modal, review Stylist output, and exercise the local data exposition screen.

## Core Flows and Features

- Open the home screen, navigate generated exposition links, launch onboarding, open the settings modal, review Stylist output, and exercise the local data exposition screen.

## Screens

- Home; Settings modal; Onboarding welcome, features, legal review, and complete screens; Exposition hub; Stylist exposition; Data exposition; Expo SDK 56 exposition

## Platforms

- Target platforms: web, ios, android
- First MVP platform: web

## Monetization Strategy

# TodoForContext(optional): Add monetization notes when relevant. Include pricing, subscriptions, ads, sponsorship, lead-gen, internal ROI, or note that monetization is not planned.

## Team Context

# TodoForContext(optional): Add team size, roles, delegated responsibilities, stakeholders, and client contacts if useful.

## Later Scope & Possibilities

# TodoForContext(optional): Add future ideas or enhancements outside the first MVP.

## Research, Notes, and References

- # TodoForContext(optional): Add designs, repos, docs, client notes, analytics, credentials process, or research links.


# Tech Stack & CESS Onboarding

- TypeScript: Yes
- Package Manager: pnpm
- Navigation: Expo Router
- Type of Navigation: Tabs
- Expo Router app directory: `src/app`
- Platform-specific organization: platform-specific files only
- Platform layout mode: shared layouts
- Web output: static

- Style Library: StyleSheet
- Which NativeWindUI components: All
- Components from create-expo-app: Yes
- Expo UI: No
- Expo UI Universal components: No
- Expo Native Tabs: Yes

- Which Software Mansion packages: All
- State management library: Zustand
- Auth: None
- Onboarding Flow: multi-screen
- Legal Documents: none
- Onboarding Completion: enter-app
- Legal Update Gate: none
- Onboarding Persistence: zustand-local
- Data Categories: Local UI/app state, Offline sync/cache
- Starting Data mode: local dummy data with Expo SQLite.

- Internationalization: None
- Analytics: None
- EAS: No
- EAS Usage: not planned yet
- Deployed server: no deployed server planned
- Initial Deployment plan: Local regression validation through Expo web export and Android emulator smoke checks.

- Start with MDS project guidelines template: Yes
- Use test-to-main safeguards: Yes

## Component Strategy

This record is the Phase 0 style and component decision. Confirm it before implementation so later agents apply the same UI system without re-asking.

- Style Library: StyleSheet
- Expo UI: No
- Expo UI Universal components: No
- Expo Native Tabs: Yes
- Conflicts:
  - styling-system-and-native-tabs (info): Expo Native Tabs render native tab chrome and ignore StyleSheet tab-bar styles.
- Decision: pending

## Ejection Inventory

This record is the Phase 0 retain/eject decision for generated starter and template components. Run `mds eject` to review the inventory and confirm.

- Decision: pending
- Items:
  - settings: retain (missing)
  - stylist: eject (missing)
  - exposition: eject (missing)
  - data: retain (missing)
  - onboarding: retain (missing)
  - create-expo-app: retain (missing)
  - create-expo-stack: retain (missing)
