# Quest agent workflow

This is the development setup for the separate Meta Spatial home proof and
legacy Viro Quest prototype in `apps/i2-companion`; neither establishes a
production VR host. See [QUEST_REFERENCE_MAP.md](./QUEST_REFERENCE_MAP.md)
for official documentation. Commands below use PowerShell from the companion
directory unless another directory is named.

## Inventory and current evidence

- The app pins Expo `~57.0.33`, React Native `0.86.3`, and
  `@reactvision/react-viro` `3.0.3`. Keep the renderer patch set and phone path.
- `QUEST_BUILD=1` selects the Quest config plugins. `homeproof` is an Android
  build type with its own application ID and standalone HTML asset. It skips
  React Native boot; it does not currently prove a shared desktop React UI or
  a typed host bridge. The Viro `debug` build uses the patched renderer.
- The home proof config plugin declares Meta Spatial SDK `0.15.0` for the VR
  module and its AAR. After Quest prebuild on 2026-11-23, Gradle's
  `:app:dependencyInsight --configuration homeproofRuntimeClasspath --dependency
  com.meta.spatial:meta-spatial-sdk-vr` resolved the VR module to `0.15.0`.
  Gradle reported Kotlin `2.1.20`, Android build tools `36.0.0` and NDK
  `27.1.12297006`. This dependency report is not an APK build or headset test.
- On 2026-11-23, Meta CLI `1.10.0.30.10` and Android Debug Bridge `36.0.0`
  recognized a connected Quest 3S. Android Studio, the Android SDK, and JDK 17
  are present; the Meta Horizon Android Studio plugin was not detected. The
  CLI is usable through `npx -y metavr`, even when `metavr` is not on PATH.
- Codex has the official Expo plugin and skills. The initial setup recorded an
  Expo OAuth login requirement. Meta CLI initialization installed the official
  Quest skills and registered its MCP server for Codex; the initial setup
  verified CLI docs search and left MCP verification until after a restart.
  See the current session recheck below for the updated status.
  Claude Code already has Expo installed; avoid duplicate installs. The existing
  ReactVision MCP endpoint matches its [official setup documentation](https://viro-community.readme.io/docs/viroreact-mcp-server)
  and returned a read-only overview. Check connection permissions before sharing
  repository data with it; the overview request supplied no source code.
- `gh` is authenticated for this repository. Playwright screenshot tools are
  available to this agent; an actual prototype screenshot was not captured in
  this tooling pass.

### Current session recheck (2026-11-23)

- Codex successfully called Meta documentation search, Expo documentation
  search, the ReactVision overview, and Playwright's tab-list and screenshot
  tools (a blank browser page, not a prototype comparison). After an initial
  check found no device, a subsequent check on 2026-11-23 identified a Quest
  3S in `device` state through both Meta's MCP and `npx -y metavr device list`.
  The MCP device-info call also succeeded. Device connectivity does not prove
  app installation or headset interaction.
- Codex reports the Expo MCP server enabled with OAuth configured. Documentation
  tools work, but authenticated project operations were not verified: this
  checkout does not specify an EAS project ID or owner. The earlier note that
  OAuth login is required reflects the initial setup attempt; if an
  account-dependent operation requests authentication, run `codex mcp login
  expo` and complete the browser sign-in.
- Local Expo automation remains unverified and `expo-mcp` has not been added to
  the app for this check. Expo's [MCP setup guide](https://docs.expo.dev/mcp/)
  describes the additional local development-server setup; do not assume it
  supports Android or Quest interactions without testing. The existing
  Playwright and Meta tools provide separate desktop and headset paths.

## Build paths

Use Node and Java versions compatible with this project. In a fresh worktree,
install the lockfile dependencies with `npm ci`, then generate Android with the
Quest plugins. Prebuild modifies the generated `android/` tree; inspect and
preserve any local native changes before running it. Do not use `--clean` on
an existing tree with unreviewed changes.

```powershell
$env:QUEST_BUILD = '1'
npm ci
npx expo prebuild --platform android --no-install
Set-Location android
.\gradlew.bat :app:dependencies --configuration homeproofRuntimeClasspath
.\gradlew.bat assembleHomeproof -I ..\tools\quest\short-cmake.gradle
.\gradlew.bat assembleDebug -I ..\tools\quest\short-cmake.gradle
Set-Location ..
```

The first APK is the Meta Spatial proof, conventionally under
`android/app/build/outputs/apk/homeproof/`; the second is the Viro Quest debug
build under `android/app/build/outputs/apk/debug/`. These commands describe the
source configuration. `:app:tasks --all` confirmed both assemble task names
after Quest prebuild on 2026-11-23; neither APK was built in this tooling pass.
Record a successful build separately. The
Viro debug app needs its development bundle/server. The patched renderer is
versioned under `native/quest-viro-renderer/`; its rebuild script is
`node tools/quest/build-viro-renderer.mjs`. Rebuilding that AAR changes tracked
renderer artifacts and requires the pinned NDK and toolchain; do it only when
the renderer itself is in scope.

For a phone build, use a separate clean generated Android tree without
`QUEST_BUILD=1`. In PowerShell remove the variable with
`Remove-Item Env:QUEST_BUILD -ErrorAction SilentlyContinue` before prebuilding.
Do not reuse a Quest-generated tree as proof of phone compatibility. `npm run
android` invokes Expo's native Android build; choose the phone/emulator target
deliberately and verify the result. A separate worktree prevents the two native
configurations from overwriting one another.

## Baselines and device evidence

On 2026-11-23 after `npm ci`, `npm run typecheck` passed; `npm run test:unit`
passed all 28 tests; `npm run lint` passed with 10 existing ESLint warnings.
`npm run expo-doctor` failed one of 21 checks: installed patch versions of
`expo-asset`, `expo-constants`, `expo-dev-client`, `expo-router`,
`expo-splash-screen`, and `expo-sqlite` were behind its expected versions.
These dependencies were left unchanged; resolve the mismatch deliberately in
a separate dependency-maintenance task. Test results do not prove on-device
interaction.

```powershell
npm run typecheck
npm run test:unit
npm run lint
npm run expo-doctor
npx -y metavr device list
npx -y metavr docs search 'spatial sdk panels'
```

For a selected connected headset, use `npx -y metavr device info <device-id>`
and the current CLI help before acting. A device connection does not establish
that the app, controller input, keyboard, orientation or performance works.
With the user ready to inspect the headset, capture a native Quest image with
`npx -y metavr capture screenshot -o <output-path>`; see current
`npx -y metavr capture screenshot --help` for targeting and flags. Read logs
with `npx -y metavr log -n 200 -l E`; logs may contain private data.

Store non-app capture artifacts in the workspace's `generated/` directory, not
in the source checkout. Record their paths, capture date, build/commit, headset,
and comparison notes in a versioned QA note. The owner-supplied desktop captures
remain the visual reference; do not commit personal screenshots without review.
Use Playwright or the desktop browser screenshot tool for a matching desktop
view, and compare layout, copy, color, font, spacing and hierarchy explicitly.

## Actions requiring a person or explicit coordination

Expo OAuth requires the user's browser sign-in. Headset installation, launching,
capturing the user's current view, input tests and worn-headset checks require
the user and device to be ready. Avoid changing device settings, clearing logs,
restarting ADB, or installing APKs during a read-only connection check. Never
publish an APK, change the integration branch, or expose tokens as a setup step.
Document unrun or failed checks as pending rather than substituting a desktop
simulation for a headset result.
