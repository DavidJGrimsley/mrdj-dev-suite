import fs from 'node:fs/promises';

function usage() {
  return [
    'Usage: summarize-doctor-report.mjs --report <path> --min-score <n> --doctor-exit-code <n>',
  ].join('\n');
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--report') {
      args.report = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--min-score') {
      args.minScore = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--doctor-exit-code') {
      args.doctorExitCode = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.report || !args.minScore || args.doctorExitCode == null) {
    throw new Error(usage());
  }

  const minScore = Number(args.minScore);
  if (!Number.isFinite(minScore)) {
    throw new Error(`--min-score must be a number; got ${args.minScore}`);
  }

  const doctorExitCode = Number(args.doctorExitCode);
  if (!Number.isFinite(doctorExitCode)) {
    throw new Error(`--doctor-exit-code must be a number; got ${args.doctorExitCode}`);
  }

  return { reportPath: args.report, minScore, doctorExitCode };
}

function appendOutput(lines) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return Promise.resolve();
  return fs.appendFile(outputPath, lines.join('\n') + '\n', 'utf8');
}

function appendStepSummary(markdown) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return Promise.resolve();
  return fs.appendFile(summaryPath, markdown + '\n', 'utf8');
}

function bulletList(values, limit = 20) {
  const truncated = values.length > limit;
  const shown = values.slice(0, limit);
  const lines = shown.map((value) => `- ${value}`);
  if (truncated) {
    lines.push(`- …and ${values.length - limit} more`);
  }
  return lines.join('\n');
}

function formatDetails(details) {
  if (!details || typeof details !== 'object') {
    return '';
  }

  if (Array.isArray(details.findings)) {
    return ['**Findings**', bulletList(details.findings)].join('\n');
  }
  if (Array.isArray(details.missing)) {
    return ['**Missing**', bulletList(details.missing)].join('\n');
  }
  if (Array.isArray(details.hits)) {
    const values = details.hits
      .slice(0, 20)
      .map((hit) => {
        if (!hit || typeof hit !== 'object') return String(hit);
        const file = typeof hit.file === 'string' ? hit.file : 'unknown';
        const line = typeof hit.line === 'number' ? hit.line : undefined;
        return line ? `${file}:${line}` : file;
      });
    return ['**Hits**', bulletList(values)].join('\n');
  }

  const text = JSON.stringify(details, null, 2);
  const maxChars = 6_000;
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n…(truncated)` : text;
}

function checkLabel(status) {
  return status === 'error' ? 'FAIL' : status === 'warn' ? 'WARN' : status;
}

async function main() {
  const { reportPath, minScore, doctorExitCode } = parseArgs(process.argv.slice(2));
  const raw = await fs.readFile(reportPath, 'utf8');
  const sanitized = raw.replace(/^\uFEFF/, '').replace(/\u0000/g, '');
  const report = JSON.parse(sanitized);

  const summary = report?.summary ?? {};
  const score = Number(summary.score ?? 0);
  const errors = Number(summary.errors ?? 0);
  const warnings = Number(summary.warnings ?? 0);
  const passed = Number(summary.passed ?? 0);
  const skipped = Number(summary.skipped ?? 0);

  const oneLine = `Doctor score ${score}/100 (${errors} errors, ${warnings} warnings)`;
  console.log(oneLine);

  await appendOutput([
    `score=${score}`,
    `errors=${errors}`,
    `warnings=${warnings}`,
    `passed=${passed}`,
    `skipped=${skipped}`,
  ]);

  const checks = Array.isArray(report?.checks) ? report.checks : [];
  const notable = checks.filter((check) => check && (check.status === 'error' || check.status === 'warn'));

  const sections = notable.map((check) => {
    const name = typeof check.name === 'string' ? check.name : 'unknown';
    const message = typeof check.message === 'string' ? check.message : '';
    const detailsText = formatDetails(check.details);
    const header = `### ${checkLabel(check.status)} ${name}`;
    return [header, message, detailsText].filter(Boolean).join('\n\n');
  });

  const summaryMd = [
    '# MDS Doctor',
    '',
    `- Score: **${score}/100** (min-score: **${minScore}**)`,
    `- Counts: **${errors} errors**, **${warnings} warnings**, **${passed} passed**, **${skipped} skipped**`,
    '',
    sections.length > 0 ? '## Findings' : '## Findings',
    '',
    sections.length > 0 ? sections.join('\n\n') : '_No warnings or errors._',
    '',
  ].join('\n');

  await appendStepSummary(summaryMd);

  const shouldFail = doctorExitCode !== 0 || score < minScore;
  if (shouldFail) {
    const reasons = [
      doctorExitCode !== 0 ? `Doctor exit code ${doctorExitCode}` : null,
      score < minScore ? `score ${score} < min-score ${minScore}` : null,
    ].filter(Boolean);
    console.error(`Failing CI: ${reasons.join('; ')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
