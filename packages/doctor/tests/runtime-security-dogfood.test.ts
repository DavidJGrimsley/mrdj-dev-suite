import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { runDoctor } from '../src/index.js';

const MATRIX_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../cli/tests/fixtures/test-apps-matrix.json'
);

interface MatrixFile {
  platform_defaults?: Record<string, { apps_root?: string }>;
  apps?: Array<{ name: string; local_path: string }>;
}

const matrix = JSON.parse(readFileSync(MATRIX_PATH, 'utf8')) as MatrixFile;
const appsRoot =
  process.env.MDS_APPS_ROOT ??
  matrix.platform_defaults?.[process.platform]?.apps_root ??
  path.resolve('F:/ReactNativeApps');

const DOGFOOD_APPS = ['time2pay', 'DJsPortfolio', 'PokePages'];

describe('runtime security dogfood', () => {
  for (const appName of DOGFOOD_APPS) {
    const app = matrix.apps?.find((entry) => entry.name === appName);
    const appPath = app ? path.resolve(appsRoot, app.local_path) : '';
    const present = Boolean(appPath && existsSync(appPath));

    it.skipIf(!present)(`scans ${appName} without crashing or leaking secret values`, async () => {
      const report = await runDoctor(appPath, { runScripts: false });
      const serialized = JSON.stringify(report);
      const runtime = report.checks.find((check) => check.name === 'runtime security');
      const env = report.checks.find((check) => check.name === 'env hygiene');

      expect(report.checks.length).toBeGreaterThan(0);
      expect(runtime).toBeDefined();
      expect(env).toBeDefined();
      expect(serialized).not.toMatch(/sk_live_[A-Za-z0-9]{16,}/);
      expect(serialized).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(serialized).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{20,}/);
    });
  }
});
