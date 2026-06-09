import path from 'node:path';

import chalk from 'chalk';

import { ROADMAP_BLOCKED_MARKER_WARNING, generateProjectRoadmap } from '../roadmap.js';

export interface RoadmapArgv {
  path?: string;
  json?: boolean;
}

export async function runRoadmapCommand(argv: RoadmapArgv): Promise<void> {
  const projectPath = path.resolve(argv.path ?? '.');
  const result = await generateProjectRoadmap(projectPath, {
    write: !argv.json,
    preserveStatus: true,
  });

  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(chalk.bold('mds roadmap'));
  console.log(chalk.dim(result.projectPath));
  console.log();
  if (result.blockedByMarkers) {
    console.log(chalk.yellow(`BLOCKED ${result.todoPath}`));
    console.log(chalk.yellow(ROADMAP_BLOCKED_MARKER_WARNING));
    console.log();
    console.log(chalk.bold('Unresolved markers'));
    for (const hit of result.markerHits) {
      console.log(`- ${hit.file}:${hit.line} ${hit.text}`);
    }
    return;
  }

  console.log(result.wrote ? chalk.green(`UPDATED ${result.todoPath}`) : chalk.gray(`UNCHANGED ${result.todoPath}`));
  console.log(chalk.dim(`Preserved statuses: ${result.preservedStatuses}`));
  if (result.warnings.length > 0) {
    console.log();
    console.log(chalk.yellow('Warnings'));
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }
}
