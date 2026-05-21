import { spawn } from 'node:child_process';
import path from 'node:path';

interface SyncResponse {
  projectPath: string;
  updatedFiles: string[];
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await runStylistSync(JSON.stringify(payload));
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown stylist sync error' },
      { status: 400 }
    );
  }
}

async function runStylistSync(inputJson: string): Promise<SyncResponse> {
  const command = process.execPath;
  const localCliEntry = path.resolve(process.cwd(), '..', '..', 'packages', 'cli', 'dist', 'cli.js');
  const args = [localCliEntry, 'stylist', 'sync', '.', '--input-json', inputJson, '--json'];

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
