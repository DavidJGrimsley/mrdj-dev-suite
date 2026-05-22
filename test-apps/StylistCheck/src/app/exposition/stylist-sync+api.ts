import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import stylistThemeTokens from '../../theme/tokens';

interface SyncResponse {
  projectPath: string;
  updatedFiles: string[];
}

interface StylistSyncRequestBody {
  theme: unknown;
  metadata?: {
    writePolicy?: 'managed' | 'overwrite';
    styleLibrary?: 'auto' | 'uniwind' | 'nativewind' | 'nativewindui' | 'unistyles' | 'restyle' | 'tamagui' | 'stylesheet';
  };
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
  const resolvedTheme = themeFromStyle ?? themeFromJson ?? stylistThemeTokens;
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

  return { theme: value };
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

async function runStylistSync(
  inputJson: string,
  metadata?: StylistSyncRequestBody['metadata']
): Promise<SyncResponse> {
  const command = process.execPath;
  const localCliEntry = path.resolve(process.cwd(), '..', '..', 'packages', 'cli', 'dist', 'cli.js');
  const args = [localCliEntry, 'stylist', 'sync', '.', '--input-json', inputJson, '--json'];
  if (metadata?.writePolicy) {
    args.push('--write-policy', metadata.writePolicy);
  }
  if (metadata?.styleLibrary) {
    args.push('--style-library', metadata.styleLibrary);
  }

  return await new Promise<SyncResponse>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
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

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Stylist sync failed with exit code ${code ?? 'unknown'}.`));
        return;
      }

      try {
        resolve(JSON.parse(stdout) as SyncResponse);
      } catch (error) {
        reject(new Error(`Failed to parse stylist sync output: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  });
}
