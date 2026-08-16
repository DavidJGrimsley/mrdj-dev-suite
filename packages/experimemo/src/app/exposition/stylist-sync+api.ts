import { spawn } from 'node:child_process';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import defaultThemeTokens from '@/theme/tokens';

interface SyncResponse {
  projectPath: string;
  updatedFiles: string[];
}

interface StylistSyncRequestBody {
  theme: unknown;
  metadata?: {
    writePolicy?: 'managed' | 'overwrite';
    styleLibrary?:
      | 'auto'
      | 'uniwind'
      | 'nativewind'
      | 'nativewindui'
      | 'unistyles'
      | 'restyle'
      | 'tamagui'
      | 'stylesheet';
  };
}

function parseSyncResponse(stdout: string): SyncResponse {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error('Stylist sync returned empty output.');
  }
  try {
    return JSON.parse(trimmed) as SyncResponse;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}$/);
    if (!match) {
      throw new Error('Stylist sync returned non-JSON output.');
    }
    return JSON.parse(match[0]) as SyncResponse;
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;
    const normalized = normalizeSyncPayload(payload);
    const result = await runStylistSync(JSON.stringify(normalized.theme), normalized.metadata);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown stylist sync error' },
      { status: 400 }
    );
  }
}

export async function GET() {
  const configPath = path.resolve(process.cwd(), 'project', 'stylist.config.json');
  const themePath = path.resolve(process.cwd(), 'project', 'theme.json');
  const stylePath = path.resolve(process.cwd(), 'project', 'style.md');

  const themeFromJson = await readThemeJson(themePath);
  const themeFromStyle = await readThemeFromStyleMarkdown(stylePath);
  const resolvedTheme = themeFromStyle ?? themeFromJson ?? defaultThemeTokens;
  const themeSource = themeFromStyle ? 'style.md' : themeFromJson ? 'theme.json' : 'default';
  const mismatchDetected =
    Boolean(themeFromJson) &&
    Boolean(themeFromStyle) &&
    JSON.stringify(themeFromJson) !== JSON.stringify(themeFromStyle);
  try {
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { writePolicy?: string; styleLibrary?: string };
    return Response.json({
      hasConfig: true,
      writePolicy: parsed.writePolicy ?? null,
      styleLibrary: parsed.styleLibrary ?? null,
      theme: resolvedTheme,
      themeSource,
      mismatchDetected,
    });
  } catch {
    return Response.json({
      hasConfig: false,
      writePolicy: null,
      styleLibrary: null,
      theme: resolvedTheme,
      themeSource,
      mismatchDetected,
    });
  }
}

function normalizeSyncPayload(value: unknown): StylistSyncRequestBody {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid stylist payload.');
  }

  const asRecord = value as Record<string, unknown>;
  if ('theme' in asRecord && asRecord.theme) {
    return {
      theme: asRecord.theme,
      metadata:
        asRecord.metadata && typeof asRecord.metadata === 'object'
          ? (asRecord.metadata as StylistSyncRequestBody['metadata'])
          : undefined,
    };
  }

  if ('metadata' in asRecord) {
    throw new Error('Invalid stylist payload: missing theme.');
  }

  return { theme: value };
}

async function runStylistSync(
  inputJson: string,
  metadata?: StylistSyncRequestBody['metadata']
): Promise<SyncResponse> {
  const tempDir = path.resolve(process.cwd(), '.expo', 'stylist-sync');
  await mkdir(tempDir, { recursive: true });
  const tempInputPath = path.join(
    tempDir,
    `theme-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
  await writeFile(tempInputPath, inputJson, 'utf8');

  const fileExists = async (filePath: string): Promise<boolean> => {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  const runAttempt = async (
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv
  ): Promise<SyncResponse> => {
    return await new Promise<SyncResponse>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        env,
      });

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });

      child.on('error', (error) => {
        reject(error);
      });

      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Stylist sync timed out after 120 seconds.'));
      }, 120000);

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(
            new Error(stderr.trim() || `Stylist sync failed with exit code ${code ?? 'unknown'}.`)
          );
          return;
        }

        try {
          resolve(parseSyncResponse(stdout));
        } catch (error) {
          reject(
            new Error(
              `Failed to parse stylist sync output: ${error instanceof Error ? error.message : String(error)}${stderr.trim() ? ` | stderr: ${stderr.trim()}` : ''}`
            )
          );
        }
      });
    });
  };

  const scriptPath = path.resolve(process.cwd(), 'scripts', 'stylist-sync-android.mjs');
  const env = {
    ...process.env,
    MDS_STYLIST_INPUT_FILE: path.relative(process.cwd(), tempInputPath),
    MDS_STYLIST_WRITE_POLICY: metadata?.writePolicy ?? 'managed',
    MDS_STYLIST_STYLE_LIBRARY: metadata?.styleLibrary ?? 'auto',
  };

  try {
    if (!(await fileExists(scriptPath))) {
      throw new Error('Stylist sync helper is missing. Run npm install, then retry.');
    }
    return await runAttempt(process.execPath, [scriptPath], env);
  } finally {
    try {
      await unlink(tempInputPath);
    } catch {
      // no-op
    }
  }
}

async function readThemeJson(filePath: string): Promise<unknown | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function readThemeFromStyleMarkdown(filePath: string): Promise<unknown | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const startToken = '<!-- MDS_STYLIST_THEME_START -->';
    const endToken = '<!-- MDS_STYLIST_THEME_END -->';
    const startIndex = raw.indexOf(startToken);
    const endIndex = raw.indexOf(endToken);
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      return null;
    }
    const block = raw.slice(startIndex, endIndex + endToken.length);
    const match = block.match(/```json\s*([\s\S]*?)\s*```/i);
    if (!match?.[1]) {
      return null;
    }
    return JSON.parse(match[1]) as unknown;
  } catch {
    return null;
  }
}
