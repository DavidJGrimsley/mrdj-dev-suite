import path from 'node:path';

import chalk from 'chalk';

import {
  ROADMAP_BLOCKED_MARKER_WARNING,
  ROADMAP_CLARIFICATION_WARNING,
  generateProjectRoadmap,
} from '../roadmap.js';

export interface RoadmapArgv {
  path?: string;
  json?: boolean;
  append?: boolean;
  phase?: number;
}

export async function runRoadmapCommand(argv: RoadmapArgv): Promise<void> {
  const projectPath = path.resolve(argv.path ?? '.');
  const result = await generateProjectRoadmap(projectPath, {
    // A brand-new project may safely receive its first TODO. Existing TODOs
    // remain proposal-only unless --append and a target phase are supplied.
    write: !argv.json,
    append: argv.append === true,
    targetPhase: argv.phase,
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

  if (result.needsClarification) {
    console.log(chalk.yellow(`NEEDS CLARIFICATION ${result.todoPath}`));
    console.log(chalk.yellow(ROADMAP_CLARIFICATION_WARNING));
    console.log();
    console.log(chalk.bold('Clarification questions'));
    for (const question of result.clarificationQuestions) {
      console.log(`- ${question.prompt}`);
    }
    if (result.confidenceWarnings.length > 0) {
      console.log();
      console.log(chalk.bold('Why it paused'));
      for (const warning of result.confidenceWarnings) {
        console.log(`- ${warning}`);
      }
    }
    return;
  }

  if (result.proposalOnly) {
    console.log(chalk.yellow(`PROPOSAL ${result.todoPath}`));
    console.log(
      chalk.yellow(
        'The existing TODO was not changed. Review the additions, then rerun with --append --phase N only after approving their wording and target phase.'
      )
    );
    if (result.proposedAdditions.length > 0) {
      console.log();
      console.log(chalk.bold('Proposed additions'));
      for (const task of result.proposedAdditions) {
        console.log(`- [ ] ${task}`);
      }
    }
  } else {
    console.log(result.wrote ? chalk.green(`APPENDED ${result.todoPath}`) : chalk.gray(`UNCHANGED ${result.todoPath}`));
  }
  console.log(chalk.dim(`Preserved statuses: ${result.preservedStatuses}`));
  if (result.warnings.length > 0) {
    console.log();
    console.log(chalk.yellow('Warnings'));
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }
}
