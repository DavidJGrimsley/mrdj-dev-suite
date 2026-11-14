/**
 * Non-mutating toolchain and prerequisite detection for supported frameworks.
 *
 * Discovers host tools honestly without executing arbitrary remote scripts or altering system state.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { identifyExecutable } from './runner.js';
import type {
  FrameworkId,
  PrerequisiteReport,
  PrerequisiteStatus,
} from '@mr.dj2u/framework-registry';

function runToolVersion(binary: string, args: readonly string[] = ['--version']): {
  installed: boolean;
  version?: string;
  error?: string;
} {
  try {
    let executable = binary;
    try {
      executable = identifyExecutable(binary);
    } catch {
      // If not on PATH as an identified executable, keep binary name for spawnSync fallback
    }
    let result = spawnSync(executable, [...args], {
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if ((result.status !== 0 || !result.stdout) && process.platform === 'win32' && !executable.toLowerCase().endsWith('.exe')) {
      result = spawnSync('cmd.exe', ['/d', '/s', '/c', executable, ...args], {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    }

    if (result.status === 0 && result.stdout) {
      const firstLine = result.stdout.trim().split(/\r?\n/)[0]?.trim();
      return { installed: true, version: firstLine };
    }

    return {
      installed: false,
      error: result.stderr?.trim() || `Exit code ${result.status}`,
    };
  } catch (err) {
    return {
      installed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function findChromeBinary(): { installed: boolean; path?: string } {
  if (process.env.CHROME && existsSync(process.env.CHROME)) {
    return { installed: true, path: process.env.CHROME };
  }

  if (process.platform === 'win32') {
    const standardCandidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(
        process.env.LOCALAPPDATA ?? 'C:\\Users\\Default\\AppData\\Local',
        'Google\\Chrome\\Application\\chrome.exe'
      ),
    ];
    for (const candidate of standardCandidates) {
      if (existsSync(candidate)) {
        return { installed: true, path: candidate };
      }
    }
  } else if (process.platform === 'darwin') {
    const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (existsSync(macPath)) {
      return { installed: true, path: macPath };
    }
  } else {
    // Linux
    const linuxCandidates = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
    for (const candidate of linuxCandidates) {
      if (existsSync(candidate)) {
        return { installed: true, path: candidate };
      }
    }
  }

  const check = runToolVersion(process.platform === 'win32' ? 'chrome.exe' : 'google-chrome');
  return { installed: check.installed };
}

export function checkExactPrerequisites(): PrerequisiteReport {
  const bunCheck = runToolVersion('bun');
  const cargoCheck = runToolVersion('cargo');
  const rustcCheck = runToolVersion('rustc');
  const chromeCheck = findChromeBinary();
  const gitCheck = runToolVersion('git');

  const prerequisites: PrerequisiteStatus[] = [
    {
      name: 'Bun',
      binary: 'bun',
      installed: bunCheck.installed,
      version: bunCheck.version,
      required: true,
      actionableFix:
        'Install Bun >=1.4.2 (upstream pins 1.4.2) from https://bun.sh in the standard user location, then restart your terminal/editor and check `bun --version` on normal PATH.',
      details: bunCheck.installed ? `Found: ${bunCheck.version}` : 'Bun is required to execute Exact CLI and build web targets.',
    },
    {
      name: 'Rust & Cargo',
      binary: 'cargo',
      installed: cargoCheck.installed && rustcCheck.installed,
      version: cargoCheck.version,
      required: true,
      actionableFix:
        'Install Rust with the official https://rustup.rs installer, add ~/.cargo/bin to PATH and restart your terminal/editor. Install toolchain 1.97.0 and its wasm32-unknown-unknown target; then run official setup --check.',
      details: cargoCheck.installed
        ? `Found: ${cargoCheck.version}`
        : 'Missing Rust toolchain. Compiler and build verification are blocked.',
    },
    {
      name: 'Google Chrome',
      binary: 'chrome',
      installed: chromeCheck.installed,
      required: false,
      actionableFix:
        'Install Google Chrome from https://www.google.com/chrome/ or set CHROME environment variable for automated agent test driving.',
      details: chromeCheck.installed ? 'Chrome is available for headless test driving.' : 'Chrome not detected.',
    },
    {
      name: 'Git',
      binary: 'git',
      installed: gitCheck.installed,
      version: gitCheck.version,
      required: true,
      actionableFix: 'Install Git from https://git-scm.com.',
      details: gitCheck.installed ? `Found: ${gitCheck.version}` : 'Git is required for template cloning and checkouts.',
    },
  ];

  const bunVersion = bunCheck.version?.match(/(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number) ?? [];
  const bunCompatible = (bunVersion[0] ?? 0) > 1 || (bunVersion[0] === 1 && ((bunVersion[1] ?? 0) > 4 || (bunVersion[1] === 4 && (bunVersion[2] ?? 0) >= 2)));
  const satisfied = bunCompatible && gitCheck.installed && cargoCheck.installed && rustcCheck.installed;
  const notes: string[] = ['Tools are resolved from ordinary PATH, never task-local generated artifacts. Upstream package.json pins bun@1.4.2, engines >=1.4.2. Run pinned checkout setup --check; inventory alone does not certify startup.'];
  if (!bunCompatible) notes.push('Bun >=1.4.2 required; detected version does not satisfy pinned upstream minimum.');

  if (!cargoCheck.installed) {
    notes.push(
      'Rust toolchain is not installed. Contract compiler and web/native build verification require Rust.'
    );
  }
  if (!chromeCheck.installed) {
    notes.push('Google Chrome is not installed; automated browser agent test scripts will be skipped.');
  }

  return {
    frameworkId: 'exact',
    satisfied,
    prerequisites,
    summary: satisfied
      ? 'Base Exact tools detected; official setup --check remains required.'
      : 'Exact prerequisites missing or incompatible. Bun >=1.4.2, Git and Rust are required.',
    notes,
  };
}

export function checkExpoPrerequisites(): PrerequisiteReport {
  const nodeCheck = runToolVersion('node');
  const pnpmCheck = runToolVersion('pnpm');
  // The generated app may choose npm or pnpm; either package manager satisfies the generator itself.
  const npmCheck = pnpmCheck.installed ? pnpmCheck : runToolVersion('npm');
  const gitCheck = runToolVersion('git');

  const prerequisites: PrerequisiteStatus[] = [
    {
      name: 'Node.js',
      binary: 'node',
      installed: nodeCheck.installed,
      version: nodeCheck.version ?? process.version,
      required: true,
      actionableFix: 'Install Node.js (>= 18.0.0) from https://nodejs.org.',
    },
    {
      name: 'pnpm / npm',
      binary: pnpmCheck.installed ? 'pnpm' : 'npm',
      installed: npmCheck.installed,
      version: npmCheck.version,
      required: true,
      actionableFix: 'Install Node.js with npm, or pnpm via `npm install -g pnpm`.',
    },
    {
      name: 'Git',
      binary: 'git',
      installed: gitCheck.installed,
      version: gitCheck.version,
      required: true,
      actionableFix: 'Install Git from https://git-scm.com.',
    },
  ];

  const satisfied = nodeCheck.installed && npmCheck.installed && gitCheck.installed;

  return {
    frameworkId: 'expo-react-native',
    satisfied,
    prerequisites,
    summary: satisfied
      ? 'Expo React Native prerequisites satisfied.'
      : 'Expo prerequisites missing. Node.js or Git required.',
    notes: [],
  };
}

export function checkPrerequisitesForFramework(frameworkId: FrameworkId): PrerequisiteReport {
  if (frameworkId === 'exact') {
    return checkExactPrerequisites();
  }
  if (frameworkId === 'expo-react-native') {
    return checkExpoPrerequisites();
  }

  return {
    frameworkId,
    satisfied: false,
    prerequisites: [],
    summary: `No specific prerequisite checks defined for framework "${frameworkId}".`,
    notes: [],
  };
}
