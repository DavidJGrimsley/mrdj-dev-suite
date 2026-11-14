import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

const require = createRequire(path.join(ROOT, 'package.json'));
const esbuild = require('esbuild');

// Build component bundle for behavioral test execution
const tmpBundleFile = path.join(ROOT, 'scripts/__tests__/.tmp-simulator-ui-bundle.mjs');

esbuild.buildSync({
  entryPoints: [path.join(ROOT, 'src/app/components/SimulatorPreview.tsx')],
  outfile: tmpBundleFile,
  format: 'esm',
  bundle: true,
  external: ['react', 'react-dom'],
  banner: {
    js: `import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);`,
  },
  define: {
    'import.meta.env.BASE_URL': '"/iSquared/"',
  },
});

const React = (await import(pathToFileURL(require.resolve('react')).href)).default;
const ReactDOMServer = (await import(pathToFileURL(require.resolve('react-dom/server')).href)).default;
const {
  SimulatorPreview,
  createClientFallbackSession,
  SIMULATED_PREVIEW_HTML,
} = await import(pathToFileURL(tmpBundleFile).href);

// Clean up temporary bundle after import
try {
  fs.unlinkSync(tmpBundleFile);
} catch {
  // Best-effort cleanup
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Static Hygiene and Security Checks
// ─────────────────────────────────────────────────────────────────────────────

test('SimulatorPreview component passes static hygiene and security checks', () => {
  const filePath = path.join(ROOT, 'src/app/components/SimulatorPreview.tsx');
  assert.ok(fs.existsSync(filePath), 'SimulatorPreview.tsx must exist');

  const content = fs.readFileSync(filePath, 'utf8');

  // Must not reference hardcoded localhost URLs
  assert.doesNotMatch(content, /https?:\/\/(?:localhost|127\.0\.0\.1)/i, 'Must not reference hardcoded localhost URLs');

  // Must not contain secret markers
  assert.doesNotMatch(content, /ISQUARED_BETA_CODE_PEPPER|ISQUARED_ADMIN_PASSWORD_HASH|scrypt\$/i, 'Must not leak server secrets');

  // Uses assetUrl for API routes
  assert.match(content, /assetUrl\(["']api\/simulator\/session["']\)/, 'Must use assetUrl for session endpoint');
  assert.match(content, /assetUrl\(["']api\/simulator\/start["']\)/, 'Must use assetUrl for start endpoint');
  assert.match(content, /assetUrl\(["']api\/simulator\/stop["']\)/, 'Must use assetUrl for stop endpoint');
  assert.match(content, /assetUrl\(["']api\/simulator\/reconcile["']\)/, 'Must use assetUrl for reconcile endpoint');

  // Iframe must use strict sandbox and no-referrer policy
  assert.match(content, /sandbox=["']allow-scripts allow-same-origin allow-forms["']/, 'Iframe must have strict sandbox attributes');
  assert.match(content, /referrerPolicy=["']no-referrer["']/, 'Iframe must enforce no-referrer');

  // Labeled simulated preview indicator
  assert.match(content, /SIMULATED PREVIEW|Simulated Fallback Mode/i, 'Must feature labeled simulated fallback indicators');

  // Handled states: loading, active, unavailable, expired, budget-exhausted, uncertain
  assert.match(content, /uncertain/i, 'Must handle uncertain start state');
  assert.match(content, /expired/i, 'Must handle expired state');
  assert.match(content, /exhausted/i, 'Must handle budget-exhausted state');
  assert.match(content, /reconcile/i, 'Must handle reconciliation action');

  // Must not claim fixed 60-minute allocation when configurable
  assert.doesNotMatch(content, /60-minute/i, 'Must not claim fixed 60-minute allocation when configurable');

  // Must support inline srcDoc simulation without broken iframes or calling disabled endpoints
  assert.match(content, /srcDoc=\{SIMULATED_PREVIEW_HTML\}/, 'Must support inline srcDoc simulation without broken iframes');
  assert.match(content, /SIMULATED_PREVIEW_HTML/, 'Must define self-contained SIMULATED_PREVIEW_HTML');
});

test('App.tsx connects SimulatorPreview to the Android device frame', () => {
  const appPath = path.join(ROOT, 'src/app/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  assert.match(appContent, /import\s*\{\s*SimulatorPreview\s*\}\s*from\s*["']\.\/components\/SimulatorPreview["']/, 'App.tsx must import SimulatorPreview');
  assert.match(appContent, /<SimulatorPreview\s+projectId=["']pet-show-and-tell["']\s+platform=["']android["']/, 'App.tsx must mount SimulatorPreview for Android Pet Show and Tell preview');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Behavioral Tests: Actual UI Unauthenticated & Disabled Cases
// ─────────────────────────────────────────────────────────────────────────────

test('Behavioral: Actual UI Unauthenticated Case displays required login alert without leaking secrets', () => {
  // When an unauthenticated visitor accesses the simulator preview, HTTP 401 produces an error
  const unauthHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SimulatorPreview, {
      projectId: 'pet-show-and-tell',
      platform: 'android',
      initialLoading: false,
      initialError: 'Private beta session required. Sign in with access code to use simulator preview.',
      initialProvider: { available: true, simulated: true },
      initialBudget: null,
      initialSession: null,
    })
  );

  // Verifies the authentication gate is actively presented to the user
  assert.match(unauthHtml, /Private beta session required\. Sign in with access code to use simulator preview\./);
  assert.match(unauthHtml, /Pet Show and Tell/);
  assert.match(unauthHtml, /Start Preview \(5 min max\)/);

  // Verifies no internal secrets or tokens are rendered
  assert.doesNotMatch(unauthHtml, /bearer|secret|cookie|token/i);
});

test('Behavioral: Actual UI Provider Disabled by Default Case renders disabled badge and fallback action', () => {
  // Default state: live EAS Android Simulator is disabled without explicit operator setup
  const disabledHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SimulatorPreview, {
      projectId: 'pet-show-and-tell',
      platform: 'android',
      initialLoading: false,
      initialProvider: {
        available: false,
        simulated: false,
        reason: 'provider_disabled',
        message: 'Live EAS Simulator execution is disabled.',
      },
      initialSimulatedFallbackActive: false,
    })
  );

  // Must render the explicit disabled-by-default explanation
  assert.match(disabledHtml, /Provider Disabled by Default/);
  assert.match(disabledHtml, /EAS Cloud Simulator Unavailable/);
  assert.match(disabledHtml, /Official EAS Android Simulator requires an Expo account, project linkage, and explicit operator authorization\./);

  // Must offer the labeled fallback button
  assert.match(disabledHtml, /Use Labeled Simulated Fallback/);

  // Must NOT render any active iframe or live preview URL
  assert.doesNotMatch(disabledHtml, /<iframe/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Behavioral Tests: Fallback State & Action Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

test('Behavioral: Fallback action creates client session and renders labeled simulated preview without Expo consumption', () => {
  // 1. Verify client fallback session generator produces a valid simulated session
  const fallbackSession = createClientFallbackSession({
    projectId: 'pet-show-and-tell',
    platform: 'android',
    durationSeconds: 300,
  });

  assert.ok(fallbackSession.id.startsWith('sim_client_'), 'Client fallback session ID must have sim_client_ prefix');
  assert.equal(fallbackSession.projectId, 'pet-show-and-tell');
  assert.equal(fallbackSession.platform, 'android');
  assert.equal(fallbackSession.status, 'active');
  assert.equal(fallbackSession.durationSeconds, 300);
  assert.equal(fallbackSession.remainingSeconds, 300);

  // 2. Render active simulated session
  const activeFallbackHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SimulatorPreview, {
      projectId: 'pet-show-and-tell',
      platform: 'android',
      initialLoading: false,
      initialProvider: { available: true, simulated: true, name: 'simulated_fallback' },
      initialSession: fallbackSession,
      initialSimulatedFallbackActive: true,
      initialTimeRemaining: 300,
    })
  );

  // The iframe itself carries the simulated-preview label.
  assert.doesNotMatch(activeFallbackHtml, /LIVE EAS SIMULATOR/);

  // Must render self-contained iframe with srcDoc (not a live external URL)
  assert.match(activeFallbackHtml, /<iframe[^>]*srcdoc=/i);
  assert.match(activeFallbackHtml, /sandbox="allow-scripts allow-same-origin allow-forms"/i);
  assert.match(activeFallbackHtml, /referrerPolicy="no-referrer"/i);

  // The inline simulated document contains Pet Show and Tell Android content
  assert.match(SIMULATED_PREVIEW_HTML, /Simulated Preview · Not a Live EAS Simulator/);
  assert.match(SIMULATED_PREVIEW_HTML, /🐾 Pet Show and Tell/);
  assert.match(SIMULATED_PREVIEW_HTML, /🐶 Buster the Golden Retriever/);
  assert.match(SIMULATED_PREVIEW_HTML, /🐱 Mochi the Calico/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Behavioral Tests: Edge States (Uncertain, Expired, Budget Exhausted)
// ─────────────────────────────────────────────────────────────────────────────

test('Behavioral: Uncertain start state renders held reservation warning and reconcile action', () => {
  const uncertainHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SimulatorPreview, {
      projectId: 'pet-show-and-tell',
      platform: 'android',
      initialLoading: false,
      initialSession: {
        id: 'sim_uncertain_456',
        projectId: 'pet-show-and-tell',
        platform: 'android',
        status: 'uncertain',
        durationSeconds: 300,
        remainingSeconds: 300,
      },
      initialUncertainNotice: 'Connection timed out during session start.',
    })
  );

  assert.match(uncertainHtml, /Start Uncertain/);
  assert.match(uncertainHtml, /Lost Start Response/);
  assert.match(uncertainHtml, /The preview is being checked\. Please try again when its status is confirmed\./);
  assert.match(uncertainHtml, />Reconcile with Provider<\/button>/);
});

test('Behavioral: Expired state renders session limit notice and start new session button', () => {
  const expiredHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SimulatorPreview, {
      projectId: 'pet-show-and-tell',
      platform: 'android',
      initialLoading: false,
      initialSession: {
        id: 'sim_expired_789',
        projectId: 'pet-show-and-tell',
        platform: 'android',
        status: 'expired',
        durationSeconds: 300,
        remainingSeconds: 0,
      },
    })
  );

  assert.match(expiredHtml, /Session Expired/);
  assert.match(expiredHtml, /Preview Session Limit Reached/);
  assert.match(expiredHtml, /Start New Session<\/button>/);
});

test('Behavioral: Budget exhausted state renders safety cap alert and disables new starts', () => {
  const exhaustedHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SimulatorPreview, {
      projectId: 'pet-show-and-tell',
      platform: 'android',
      initialLoading: false,
      initialBudget: {
        monthlyBudgetSeconds: 3600,
        maxSessionSeconds: 300,
        usedSeconds: 3600,
        reservedSeconds: 0,
        remainingSeconds: 0,
        exhausted: true,
      },
    })
  );

  assert.match(exhaustedHtml, /Budget Cap Reached/);
  assert.match(exhaustedHtml, /Monthly Simulator Budget Exhausted/);
  assert.match(exhaustedHtml, /The monthly safety budget for this private beta environment has been reached\./);
  assert.match(exhaustedHtml, /Budget resets at the beginning of each calendar month\./);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Behavioral Tests: Live DeviceScreen, Layout & Bar Duplication Checks
// ─────────────────────────────────────────────────────────────────────────────

test('Behavioral: Active Live EAS state renders DeviceScreen without Expo dashboard chrome or duplicate bars', () => {
  const secretPreviewToken = 'bearer_token_secret_xyz_123';
  const liveSession = {
    id: 'eas_sess_live_123',
    projectId: 'pet-show-and-tell',
    platform: 'android',
    status: 'active',
    durationSeconds: 300,
    remainingSeconds: 280,
    previewApiUrl: 'https://preview.expo.dev/eas_sess_live_123',
    webPreviewToken: secretPreviewToken,
  };

  const liveHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SimulatorPreview, {
      projectId: 'pet-show-and-tell',
      platform: 'android',
      initialLoading: false,
      initialProvider: { available: true, simulated: false, name: 'eas' },
      initialSession: liveSession,
      initialSimulatedFallbackActive: false,
      initialTimeRemaining: 280,
    })
  );

  // Toolbar controls are portaled outside the phone; no target is present in SSR.
  assert.doesNotMatch(liveHtml, /LIVE EAS SIMULATOR|Stop<\/button>/);

  // Must NOT render Expo dashboard chrome or website iframes
  assert.doesNotMatch(liveHtml, /snack-web-player|expo-dashboard|preview-header|expo\.dev\/dashboard/i);

  // Must NOT disclose bearer token in rendered HTML or attributes
  assert.doesNotMatch(liveHtml, new RegExp(secretPreviewToken));
});

test('Behavioral: Layout guarantees no duplicate status bar or duplicate navigation bar inside phone viewport', () => {
  // DeviceFrame outer chassis contains native status bar ('9:41', '100%') and native nav bar
  // SimulatorPreview and SIMULATED_PREVIEW_HTML must not duplicate them.
  assert.doesNotMatch(SIMULATED_PREVIEW_HTML, /<div[^>]*class="status-bar"/i, 'SIMULATED_PREVIEW_HTML must not have a duplicate status bar');
  assert.doesNotMatch(SIMULATED_PREVIEW_HTML, /class="nav-bar"|class="android-nav"/i, 'SIMULATED_PREVIEW_HTML must not have a duplicate navigation bar');

  // Android chrome is suppressed when the live screen owns its system bars.
  const appPath = path.join(ROOT, 'src/app/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.match(appContent, /androidNav && !liveAndroid/);
  assert.match(appContent, /type === "android" && liveAndroid/);
  assert.match(appContent, /ref=\{setSimulatorControls\}/);
});
