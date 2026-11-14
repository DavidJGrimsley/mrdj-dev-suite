/**
 * CLI command: mds framework
 *
 * Inspects registered frameworks, templates, and host prerequisites.
 */

import chalk from 'chalk';
import {
  checkPrerequisitesForFramework,
  listFrameworkDescriptors,
  listFrameworkTemplates,
  type FrameworkId,
} from '../generator.js';

export interface FrameworkListArgv {
  json?: boolean;
}

export interface FrameworkCheckArgv {
  framework?: string;
  json?: boolean;
}

export async function runFrameworkListCommand(argv: FrameworkListArgv): Promise<void> {
  const frameworks = listFrameworkDescriptors();

  if (argv.json) {
    const output = frameworks.map((f) => ({
      ...f,
      templates: listFrameworkTemplates(f.id),
    }));
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(chalk.bold('\nSupported Frameworks (Default: Exact):\n'));

  for (const f of frameworks) {
    const isDefaultTag = f.isDefault ? chalk.green(' [DEFAULT]') : '';
    console.log(`• ${chalk.bold.cyan(f.displayName)} (${f.id})${isDefaultTag}`);
    console.log(`  ${f.description}`);
    console.log(`  Action: "${f.defaultActionLabel}" | Maturity: ${f.maturity}`);
    console.log(`  Supported Platforms: ${f.supportedPlatforms.join(', ')}`);

    const templates = listFrameworkTemplates(f.id);
    if (templates.length > 0) {
      console.log(`  Templates: ${templates.map((t) => `${t.name} (${t.id})`).join(', ')}`);
    }
    console.log();
  }

  console.log(
    chalk.dim(`Tip: Run 'mds framework check exact' to verify local toolchain readiness.\n`)
  );
}

export async function runFrameworkCheckCommand(argv: FrameworkCheckArgv): Promise<void> {
  const frameworkId = (argv.framework || 'exact') as FrameworkId;
  const report = checkPrerequisitesForFramework(frameworkId);

  if (argv.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(chalk.bold(`\nPrerequisite Check: ${frameworkId}\n`));
  console.log(`Status: ${report.satisfied ? chalk.green('READY') : chalk.yellow('MISSING PREREQUISITES')}`);
  console.log(`Summary: ${report.summary}\n`);

  for (const p of report.prerequisites) {
    const statusIcon = p.installed ? chalk.green('✓') : p.required ? chalk.red('✗') : chalk.yellow('!');
    const requiredTag = p.required ? chalk.red('(Required)') : chalk.dim('(Optional for web)');
    console.log(`${statusIcon} ${chalk.bold(p.name)} ${requiredTag}`);
    if (p.installed) {
      console.log(`    ${chalk.dim(p.details ?? 'Installed')}`);
    } else {
      console.log(`    ${chalk.yellow(p.actionableFix)}`);
    }
  }

  if (report.notes.length > 0) {
    console.log(chalk.bold('\nNotes:'));
    for (const note of report.notes) {
      console.log(`- ${note}`);
    }
  }
  console.log();
}
