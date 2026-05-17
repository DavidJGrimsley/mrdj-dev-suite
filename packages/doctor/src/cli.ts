#!/usr/bin/env node

import { runDoctorCli } from './cli-main.js';

async function main(): Promise<void> {
  const result = await runDoctorCli(process.argv.slice(2));
  process.stdout.write(result.output + '\n');
  process.exitCode = result.exitCode;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
