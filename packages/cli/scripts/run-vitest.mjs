#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const env = { ...process.env };

if (args.some((argument) => /generator-matrix/u.test(argument))) {
  env.MDS_RUN_GENERATOR_MATRIX = '1';
}

const result = spawnSync('vitest', ['run', '--passWithNoTests', ...args], {
  env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
