import type { DoctorCheckResult } from '../types.js';
import { readOptionalText, relative } from '../utils.js';

const BROWSER_GLOBAL_PATTERN = /\b(window|document|localStorage|sessionStorage|navigator)\b/g;
const WINDOW_GUARD_PATTERN = /typeof\s+(window|document|navigator)\s*!==?\s*['"]undefined['"]/;

export async function scanFileSsrSafety(
  projectPath: string,
  filePath: string
): Promise<DoctorCheckResult> {
  const contents = (await readOptionalText(filePath)) ?? '';
  const findings = findSsrFindings(projectPath, filePath, contents);

  return findings.length > 0
    ? {
        name: 'ssr safety',
        status: 'warn',
        message: 'Browser globals may need SSR/client-only guards.',
        details: { findings },
      }
    : {
        name: 'ssr safety',
        status: 'pass',
        message: 'No obvious SSR-unsafe browser globals found.',
      };
}

export function findSsrFindings(projectPath: string, filePath: string, contents: string): string[] {
  if (!BROWSER_GLOBAL_PATTERN.test(contents)) {
    BROWSER_GLOBAL_PATTERN.lastIndex = 0;
    return [];
  }
  BROWSER_GLOBAL_PATTERN.lastIndex = 0;

  if (WINDOW_GUARD_PATTERN.test(contents)) {
    return [];
  }

  BROWSER_GLOBAL_PATTERN.lastIndex = 0;
  const matches = [...new Set([...contents.matchAll(BROWSER_GLOBAL_PATTERN)].map((m) => m[0]))];
  return [`${relative(projectPath, filePath)}: uses ${matches.join(', ')}; verify SSR/client guards.`];
}
