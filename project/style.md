# Code Conventions: mrdj-dev-suite

This document defines code style, patterns, and conventions for mrdj-dev-suite development.

---

## Language & Tooling

- **Language:** TypeScript 5.9+ (strict mode)
- **Runtime:** Node.js 18+ (for CLI/MCP server)
- **Package Manager:** pnpm
- **Build Tool:** Turborepo + tsx (esbuild)
- **Linter:** ESLint (shared config across packages)
- **Type Checker:** TypeScript (`--noEmit`)
- **Formatter:** Prettier (2 spaces, semicolons, single quotes)

---

## File & Folder Structure

### Package Layout
```
packages/
  <package>/
    src/
      index.ts          ← Main entry point
      <domain>/
        *.ts            ← Domain-specific modules
    tests/
      <domain>.test.ts  ← Unit tests (vitest)
    package.json
    tsconfig.json
    README.md           ← Package overview
```

### Naming Conventions
- **Files:** kebab-case (e.g., `app-architecture.ts`, `eslint-checker.ts`)
- **Folders:** kebab-case (e.g., `src/checks/`, `src/reporters/`)
- **Classes:** PascalCase (e.g., `EslintChecker`, `ProjectScanner`)
- **Functions:** camelCase (e.g., `scanProject`, `reportErrors`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `DEFAULT_TIMEOUT`)
- **Interfaces/Types:** PascalCase (e.g., `ScanResult`, `CheckReport`)

---

## TypeScript

### Type Annotations
- Always export types/interfaces from modules that use them
- Use explicit return types on all functions
- Use `interface` for object shapes, `type` for unions/functions
- Avoid `any`; use `unknown` with type guards if necessary

```typescript
// ✅ Good
interface ScanResult {
  errors: string[];
  warnings: string[];
  passed: boolean;
}

export async function scanProject(folder: string): Promise<ScanResult> {
  // ...
}

// ❌ Avoid
export async function scanProject(folder: any): any {
  // ...
}
```

### Imports
- Use absolute imports: `import { scanner } from '@mrdj/doctor'`
- Group imports: React Native/Node libs, then local modules, then types
- Use namespace imports for large modules: `import * as fs from 'fs'`

```typescript
// ✅ Good
import * as fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

import { doctor } from '@mrdj/doctor';
import { report } from '@mrdj/reporter';

import type { ScanResult } from './types';
```

### Error Handling
- Define custom error classes for domain-specific errors
- Use typed error results or exceptions consistently (prefer typed results for expected errors)
- Always log errors before throwing or returning

```typescript
// ✅ Good
class ESLintError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export async function runESLint(folder: string): Promise<{
  errors: ESLintError[];
  warnings: any[];
}> {
  try {
    // ...
  } catch (err) {
    console.error('ESLint check failed:', err);
    throw new ESLintError(`Failed to run ESLint in ${folder}`, 'ESLINT_EXEC_FAILED');
  }
}
```

---

## Modules & Exports

### Entry Points
- Each package has `src/index.ts` that re-exports public API
- Keep entry points minimal; use barrel exports for major domains

```typescript
// packages/doctor/src/index.ts
export { ProjectScanner, scanProject, ScanResult } from './scanner';
export { DoctorReport, reportIssues } from './reporter';
export type { CheckOptions } from './types';
```

### Async/Await
- Use async/await, not .then() chains
- Prefer `await` over fire-and-forget Promises
- Handle errors with try/catch

```typescript
// ✅ Good
export async function processProject(folder: string): Promise<void> {
  try {
    const result = await scanner.scan(folder);
    await reporter.publish(result);
  } catch (err) {
    console.error('Processing failed:', err);
    throw err;
  }
}

// ❌ Avoid
export function processProject(folder: string): Promise<void> {
  return scanner.scan(folder)
    .then(result => reporter.publish(result))
    .catch(err => console.error(err));
}
```

---

## Testing

### Test File Naming
- Test files colocated with source: `src/scanner.ts` → `tests/scanner.test.ts`
- Use Vitest for unit tests

### Test Structure
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scanProject } from '../src/scanner';

describe('ProjectScanner', () => {
  let tempFolder: string;

  beforeEach(async () => {
    tempFolder = await createTempFolder();
  });

  afterEach(async () => {
    await deleteTempFolder(tempFolder);
  });

  it('should detect ESLint errors', async () => {
    // Arrange
    const source = 'const x = 1'; // Missing semicolon or bad lint
    await fs.writeFile(path.join(tempFolder, 'bad.ts'), source);

    // Act
    const result = await scanProject(tempFolder);

    // Assert
    expect(result.errors).toContain(expect.stringMatching(/ESLint/));
  });

  it('should pass on clean code', async () => {
    // Arrange
    const source = 'const x = 1;'; // Good
    await fs.writeFile(path.join(tempFolder, 'good.ts'), source);

    // Act
    const result = await scanProject(tempFolder);

    // Assert
    expect(result.passed).toBe(true);
  });
});
```

---

## CLI Commands

### Command Structure
- Commands live in `packages/cli/src/commands/<command>.ts`
- Each command exports: `name`, `description`, `options`, `handler`
- Use `yargs` or `commander` for CLI framework

```typescript
// packages/cli/src/commands/doctor.ts
export const command = 'doctor [options]';
export const description = 'Scan project for issues';

export const options = {
  fix: { type: 'boolean', default: false, description: 'Auto-fix lint issues' },
  json: { type: 'boolean', default: false, description: 'Output JSON' },
};

export async function handler(argv: any): Promise<void> {
  const result = await scanProject(process.cwd());
  
  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatReport(result));
  }
  
  process.exit(result.passed ? 0 : 1);
}
```

### Output Format
- Use colors for terminal output (chalk/kleur)
- Provide JSON output for CI integration
- Always exit with meaningful code (0 = success, 1 = errors)

```typescript
// ✅ Good CLI output
export function formatReport(report: DoctorReport): string {
  const lines: string[] = [];
  
  if (report.errors.length > 0) {
    lines.push(chalk.red(`❌ ${report.errors.length} errors`));
    report.errors.forEach(err => lines.push(`  ${err.message}`));
  }
  
  if (report.warnings.length > 0) {
    lines.push(chalk.yellow(`⚠️  ${report.warnings.length} warnings`));
    report.warnings.forEach(warn => lines.push(`  ${warn.message}`));
  }
  
  if (report.passed) {
    lines.push(chalk.green('✅ All checks passed'));
  }
  
  return lines.join('\n');
}
```

---

## MCP Server

### Tool Definition
- Tools are defined in `packages/mcp-server/src/tools/`
- Each tool is a class implementing `McpTool`
- Export tools from `src/index.ts`

```typescript
// packages/mcp-server/src/tools/doctor-scanner.ts
export class DoctorScannerTool implements McpTool {
  readonly name = 'doctor_scan_project_full';
  readonly description = 'Scan project for issues (lint, tsc, expo doctor, architecture)';

  readonly inputSchema = z.object({
    projectFolder: z.string().describe('Absolute path to project folder'),
    checks: z.array(z.enum(['eslint', 'tsc', 'expo', 'architecture', 'ssr', 'env']))
      .optional()
      .describe('Specific checks to run (default: all)'),
  });

  async handler(input: unknown): Promise<any> {
    const { projectFolder, checks } = this.inputSchema.parse(input);
    const result = await scanProject(projectFolder, { checks });
    return result;
  }
}
```

### Resources (Guides, Patterns, Skills)
- Resources are Markdown files in `packages/knowledge/src/`
- Expose via MCP: `mrdj://patterns/*`, `mrdj://guides/*`
- Include frontmatter for metadata

```markdown
---
title: App Folder Architecture
description: How to structure Expo Router app/ folder for clean, maintainable apps
keywords: expo-router, app-folder, architecture, structure
type: pattern
tags: [expo-router, architecture, best-practices]
---

# App Folder Architecture

## Overview
Keep your app/ files thin. Delegate business logic to features/, services/, hooks/, etc.

...
```

---

## Documentation

### README.md Structure
Each package should have `README.md` with:
1. Brief description
2. Installation
3. Quick start
4. API reference
5. Examples
6. Contributing notes

```markdown
# @mrdj/doctor

Scan Expo projects for lint, type, architecture, and deployment issues.

## Installation

\`\`\`bash
pnpm add @mrdj/doctor
\`\`\`

## Quick Start

\`\`\`bash
mrdj doctor /path/to/project
\`\`\`

## API

### scanProject(folder: string, options?: ScanOptions): Promise<ScanResult>
...
```

### Inline Comments
- Comment "why", not "what" — the code should be self-explanatory
- Comment complex algorithms, edge cases, and non-obvious decisions
- Avoid comment bloat; keep comments concise

```typescript
// ✅ Good
// SSR safety check: window/document must be guarded in server routes
export function checkSSRSafety(code: string): SSRIssue[] {
  // ...
}

// ❌ Avoid
// Check if window is used
if (code.includes('window')) { // This is obvious from the code
  // ...
}
```

---

## Git & Commits

### Commit Messages
- Use conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`
- Keep messages concise (~50 chars), add details in body if needed

```
feat(doctor): add ssr-safety check for localStorage

- Detects localStorage usage during render
- Suggests useEffect or storage adapter patterns
- Tests added for 5 common patterns
```

### Branch Naming
- Feature branches: `feat/app-architecture-check`
- Bug fixes: `fix/doctor-eslint-parsing`
- Docs: `docs/cli-usage-guide`

---

## Performance & Scalability

### Doctor Checks
- Parallelize checks where possible (ESLint, tsc, expo doctor can run in parallel)
- Cache results (don't re-scan unchanged files)
- Limit file reads to project folder; don't scan node_modules/

### MCP Tools
- Timeouts: 30s for scan operations, 10s for simple lookups
- Streaming: return results incrementally for large scans
- Error messages: provide actionable feedback, not raw output

---

## Security

### Sensitive Data
- Never log or expose .env values
- Sanitize file paths in error messages
- Don't commit .env, .env.local, or API keys

### Input Validation
- Always validate MCP tool inputs with Zod
- Sanitize CLI arguments
- Validate file paths (prevent directory traversal)

```typescript
// ✅ Good
const input = z.object({
  projectFolder: z.string().refine(
    (p) => !p.includes('..'),
    'Path traversal not allowed'
  ),
}).parse(userInput);
```

---

## Dependencies

### Guidelines
- Keep dependency count minimal
- Prefer well-maintained, widely-used packages
- Avoid peer dependency hell: pin versions in packages
- Document why each dependency is needed in package.json `comments`

### Workspace Dependencies
- Use workspace protocol: `"@mrdj/doctor": "workspace:*"`
- Allows monorepo tools to resolve locally

```json
{
  "dependencies": {
    "@mrdj/doctor": "workspace:*",
    "zod": "^3.22.0"
  }
}
```

---

## Debugging & Logging

### Logging Strategy
- Use `console.error` for errors
- Use `console.log` for info (not `console.info`)
- Use `console.warn` for warnings
- Use `console.debug` for development (not in production)
- Prefix logs with context: `[doctor]`, `[cli:onboard]`, etc.

```typescript
// ✅ Good
console.error('[doctor] ESLint check failed:', err.message);
console.warn('[doctor] SSR safety: localStorage detected');
console.log('[cli:onboard] Creating project folder...');
```

### Debug Mode
- Check `process.env.DEBUG` for verbose output
- Example: `DEBUG=mrdj:* mrdj doctor`

---

## Code Review Checklist

Before merging a PR, ensure:
- [ ] TypeScript compiles with no errors
- [ ] ESLint passes
- [ ] Tests pass (or new tests added)
- [ ] Types exported correctly
- [ ] Error messages are clear and actionable
- [ ] No console.log in production code (use proper logging)
- [ ] Dependencies are documented
- [ ] README updated if API changed
- [ ] Commit messages follow conventional commits
