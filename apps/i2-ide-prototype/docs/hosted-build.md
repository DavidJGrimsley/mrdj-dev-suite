# iSquared Prototype: Hosted Browser Build & Deployment Guide

This document describes how the `i2-ide-prototype` application is built and verified for deployment as the hosted browser private beta under the subpath `/iSquared/`.

---

## 1. Overview

The `i2-ide-prototype` application is normally developed locally as a standalone Vite application running at the root (`/`). When deployed to the private beta on `https://davidjgrimsley.com/iSquared/`, it must:

1. Serve all HTML, scripts, CSS, fonts, and images from the base path `/iSquared/`.
2. Avoid hardcoded localhost or loopback endpoints.
3. Exclude source maps, secret keys, development-only artifacts, or local database files.
4. Support page refreshes and direct navigation through client-side state machine handling.
5. Remain decoupled from authentication: authentication and access gating are enforced by the portfolio Express server; the iSquared application itself contains no access-code logic.

---

## 2. Build Commands

From `apps/i2-ide-prototype`:

```bash
# Standard hosted build to dist-hosted/web
pnpm build:hosted

# Hosted build with a tar archive for upload
pnpm build:hosted:archive

# Custom output directory or base path
node scripts/build-hosted.mjs --base /iSquared/ --out dist-hosted --archive
```

### Build Artifacts Produced

```text
dist-hosted/
├── web/                      <-- Static files to be served by the portfolio server
│   ├── index.html            <-- Module script pointing to /iSquared/assets/...
│   ├── assets/               <-- Minified JS, CSS, and hashed image assets
│   ├── robots.txt            <-- Disallow: /
│   └── (public assets)       <-- Static media loaded via assetUrl()
├── manifest.json             <-- Build metadata: git commit, dirty status, file count, sha256
└── isquared-web.tgz          <-- Optional tarball (produced with --archive)
```

---

## 3. Asset Path Resolution (`assetUrl`)

In development, assets in `public/assets/` can be accessed via `/assets/...`. However, under `/iSquared/`, requests to `/assets/...` will hit the root domain and fail.

All static asset references in source code use the `assetUrl()` helper located at `src/app/assetUrl.ts`:

```typescript
import { assetUrl } from "./assetUrl";

const heroImage = assetUrl("/assets/infie-form-mist.png");
```

- When running in dev mode (`vite dev`), `import.meta.env.BASE_URL` is `/`, resolving to `/assets/infie-form-mist.png`.
- When built with `build:hosted`, `import.meta.env.BASE_URL` is `/iSquared/`, resolving to `/iSquared/assets/infie-form-mist.png`.

The automated test `scripts/__tests__/source-asset-urls.test.mjs` scans all source files (`.tsx`, `.ts`, `.css`) and fails if any literal `"/assets/"` string is used without `assetUrl()`.

---

## 4. Automated Verification (`verifyHostedOutput`)

The build script automatically invokes `scripts/lib/verify-hosted-output.mjs` immediately after Vite finishes building. The verification asserts:

1. `index.html` exists and references scripts and stylesheets strictly under `/iSquared/`.
2. No source maps are bundled (`//# sourceMappingURL=` is forbidden).
3. No localhost or loopback URLs (`localhost`, `127.0.0.1`, `[::1]`) are bundled.
4. No sensitive secrets or tokens (e.g. `ISQUARED_BETA_CODE_PEPPER`, `scrypt$`) appear in client bundles.
5. No forbidden file extensions (`.map`, `.sqlite`, `.db`, `.env`, `.ts`) are placed in the output directory.

If any check fails, the build exits with code 1 and aborts archive generation.

---

## 5. Testing the Hosted Build

To run the automated tests for the hosted build tooling:

```bash
cd apps/i2-ide-prototype
pnpm test
```

This runs:
- `scripts/__tests__/hosted-build.test.mjs`: Tests base path normalization and `verifyHostedOutput` validations.
- `scripts/__tests__/source-asset-urls.test.mjs`: Scans the entire source tree to ensure no un-prefixed asset paths exist.

---

## 6. Hosted Prototype Capabilities and Limitations

Because this prototype is hosted in a standard web browser:

1. **Static Demonstration Mode:**
   - The application runs purely in the client browser.
   - Onboarding sequence (beats B00 through B20), interactive Infie animations, stage transitions, workspace view, and project overview are fully functional.

2. **Desktop & Local File Access Limitations:**
   - Actual local filesystem manipulation, spawning native compiler processes, or connecting to local Docker/CLI tools requires the local desktop runtime of Mr. DJ's Dev Suite.
   - The in-app modal and pricing screens are mock demonstration UI and do not charge or require external billing integrations.
