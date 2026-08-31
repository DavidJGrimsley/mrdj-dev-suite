# @mr.dj2u/doctor

## 0.1.8

### Patch Changes

- b687345: Make Doctor mode selection explicit in reports and help, add redacted hardcoded credential detection, and restrict Expo server-output warnings to real Expo Router API route files.
- 1b74694: Add Doctor router-safety and API-safety checks for Expo Router groups, layouts, navigation, and API auth, validation, method, service-role, rate-limit, CORS, and error-exposure issues.
- 1b74694: Add Doctor runtime security checks for server-only imports on the client, Expo config credential literals, client process.env policy, localhost fetch, and env template hygiene.
- 9a3d5fe: Fix the remaining Node 24 `DEP0190` risk by switching shell-based command launches to explicit `spawn` command/argument vectors while preserving the current Expo startup and script execution behavior.

## 0.1.7

### Patch Changes

- e5c99c0: Add repository metadata and changesets-based release automation for trusted npm publishing.
