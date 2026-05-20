# Contributing to Mr. DJ's Dev Suite

Thank you for contributing! This guide explains how to work within the monorepo structure, follow our standards, and submit changes.

## Getting Started

### Prerequisites
- Node.js >=18.0.0
- pnpm >=8.0.0

### Initial Setup
```bash
# Clone the repository
git clone <repo-url> && cd <repo-folder>

# Install dependencies
pnpm install

# Verify setup
pnpm list -r

# Review documentation
cat DEVELOPMENT.md  # Development workflow
cat project/info.md # Project overview
cat project/todo.md # Task breakdown
```

## Code Standards

### TypeScript
- **Strict Mode**: All code in `tsconfig.json` with `"strict": true`
- **Avoid**: `any`, implicit types, unchecked indexed access
- **Prefer**: Discriminated unions, type inference, exhaustive checks
- **File Extensions**: Use `.ts` / `.tsx` for all source code

### Naming Conventions
- **Packages**: Lowercase, kebab-case (`@mr.dj2u/package-name`)
- **Directories**: Lowercase, descriptive (`src/`, `checks/`, `resources/`)
- **Files**: lowercase for utilities/types, PascalCase for classes/components
- **Functions**: camelCase for all
- **Constants**: UPPER_SNAKE_CASE for config, lowercase otherwise

### Import Organization
```typescript
// 1. External packages (alphabetical)
import execa from 'execa';
import { readFile } from 'fs/promises';

// 2. Internal packages (@mr.dj2u/*)
import { Doctor } from '@mr.dj2u/doctor';
import { Skills } from '@mr.dj2u/knowledge';

// 3. Local imports (relative)
import { Config } from './config';
import type { CheckResult } from './types';
```

### Error Handling
```typescript
// ❌ DON'T: Throw generic errors
throw new Error('Something failed');

// ✅ DO: Create context-specific errors
class DoctorError extends Error {
  constructor(public check: string, message: string) {
    super(`${check}: ${message}`);
    this.name = 'DoctorError';
  }
}

// ✅ DO: Handle errors explicitly
try {
  await runCheck();
} catch (error) {
  logger.error('Check failed', { check, error });
  results.push({ status: 'failed', error: error.message });
}
```

## Monorepo Structure

### Understanding Packages
```
packages/
├── doctor/              # Health checks & diagnostics
│   └── src/checks/     # Check implementations
├── cli/                 # Command-line interface
│   └── src/commands/   # CLI command handlers
├── knowledge/           # Patterns, skills, conventions
│   └── src/patterns/   # Domain-organized patterns
└── mcp-server/          # Model Context Protocol integration
    └── src/tools/      # MCP tool definitions
```

### Workspace Dependencies
**Format**: Use `workspace:*` for internal dependencies
```json
{
  "dependencies": {
    "@mr.dj2u/doctor": "workspace:*",
    "@mr.dj2u/knowledge": "workspace:*"
  }
}
```

### Cross-Package Communication
```typescript
// ✅ DO: Import from package entry point
import { Doctor } from '@mr.dj2u/doctor';
import { Skills, Patterns } from '@mr.dj2u/knowledge';

// ❌ DON'T: Import from subdirectories
import { Doctor } from '@mr.dj2u/doctor/src/index';
```

## Development Workflow

### 1. Create Feature Branch
```bash
# From latest main
git checkout main && git pull

# Create feature branch
git checkout -b feat/your-feature-name

# Format: feat/*, fix/*, refactor/*, docs/*, test/*
```

### 2. Make Changes
```bash
# Watch for errors
pnpm type-check  # TypeScript errors
pnpm lint        # ESLint violations
pnpm test        # Unit tests
pnpm build       # Compilation errors
```

### 3. Test Locally
```bash
# Run specific package tests
pnpm --filter @mr.dj2u/doctor test

# Run all tests
pnpm test

# Test CLI locally (after build)
pnpm build
node packages/cli/dist/cli.js doctor ./packages/doctor
```

### 4. Commit & Push
```bash
# Auto-format with Prettier
pnpm prettier --write .

# Commit with semantic messages
git add .
git commit -m "feat(doctor): add eslint check validator

- Implement ESLint parsing in doctor/src/checks/
- Add error reporting for lint violations
- Integrate with doctor_scan_project_full MCP tool"

git push origin feat/your-feature-name
```

### 5. Create Pull Request
- Link related issues
- Describe changes and rationale
- Reference architectural patterns used
- Include test coverage (if applicable)

## Testing

### Unit Tests
```typescript
// tests/utils.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { parseESLintOutput } from '../src/utils';

describe('parseESLintOutput', () => {
  it('should parse eslint JSON output', () => {
    const output = [{ filePath: 'app.ts', messages: [] }];
    const result = parseESLintOutput(output);
    expect(result).toHaveLength(1);
  });

  it('should handle empty results', () => {
    expect(parseESLintOutput([])).toEqual([]);
  });
});
```

### Running Tests
```bash
# All tests
pnpm test

# Watch mode (during development)
pnpm test --watch

# Coverage report
pnpm test --coverage
```

### Coverage Expectations
- **Minimum**: 70% line coverage
- **Target**: 85%+ for public APIs
- **Generate**: HTML report at `coverage/index.html`

## Documentation

### Code Comments
- **WHAT**: What does this do?
- **WHY**: Why is it done this way?
- **AVOID**: Restating what the code already says

```typescript
// ❌ Bad: Restates the code
const errors = [];  // Create empty array

// ✅ Good: Explains the why
// Pre-allocate errors array to collect all check failures
// We need ALL failures, not just the first one, so user can fix everything
const errors = [];
```

### JSDoc for Public APIs
```typescript
/**
 * Scan a project directory for diagnostic issues.
 * 
 * @param projectPath - Root directory to scan (must contain package.json)
 * @param options - Configuration options
 * @param options.fix - Automatically fix fixable issues (default: false)
 * @returns Promise resolving to ScanResult with status, checks, and errors
 * 
 * @throws DoctorError if project not found or invalid
 * 
 * @example
 * const result = await doctor.scan('./my-app', { fix: true });
 * console.log(`Found ${result.errors.length} issues`);
 */
export async function scan(
  projectPath: string,
  options?: ScanOptions
): Promise<ScanResult> {
  // Implementation...
}
```

## Performance Considerations

### Bundle Size
- Keep packages <100 KB each
- Lazy-load heavy dependencies
- Check with `turbo run build` and review dist/ sizes

### TypeScript Build
- Enable incremental builds
- Use project references for fast recompilation
- Monitor type-check time (target <5 seconds)

### Runtime
- Async operations for I/O (file reads, subprocess execution)
- Parallel execution where possible (Turbo pipelines)
- Avoid blocking operations in CLI

## Release Process

### Version Bumping
```bash
# Update version in package.json
# Follow semantic versioning (major.minor.patch)

# Example: 0.1.0 → 0.2.0 (minor feature release)
# Example: 0.2.0 → 1.0.0 (major: breaking changes)
# Example: 1.0.1 → 1.0.2 (patch: bug fixes)
```

### CHANGELOG Updates
1. Document changes under `[Unreleased]`
2. Add new version section when releasing
3. Include: Added, Changed, Fixed, Removed (as applicable)

### Publishing (Future)
```bash
# Tag release
git tag -a v0.2.0 -m "Release version 0.2.0"

# Push with tags
git push origin main --tags
```

## Working with the Doctor Package

### Adding a New Check
```typescript
// packages/doctor/src/checks/new-check.ts
import type { CheckResult } from '../types';

export async function newCheck(projectPath: string): Promise<CheckResult> {
  try {
    // Run diagnostic
    const issues = await runDiagnostic(projectPath);
    
    return {
      name: 'new-check',
      status: issues.length === 0 ? 'passed' : 'failed',
      issues,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'new-check',
      status: 'error',
      error: error.message,
    };
  }
}
```

### Registering Checks
```typescript
// packages/doctor/src/index.ts
import { newCheck } from './checks/new-check';

export async function runDiagnostics(projectPath: string) {
  const results = await Promise.all([
    eslintCheck(projectPath),
    typeScriptCheck(projectPath),
    expoCheck(projectPath),
    architectureCheck(projectPath),
    newCheck(projectPath),  // Add here
  ]);
  return results;
}
```

## Working with the Knowledge Package

### Adding Patterns
```typescript
// packages/knowledge/src/patterns/routing.ts
export const routingPatterns = {
  fileBasedRouting: {
    name: 'File-Based Routing',
    description: 'Use app/ folder with automatic route generation',
    example: 'app/(drawer)/guides/[region]/[guide].tsx',
  },
  // Add more patterns...
};
```

### Exporting from Index
```typescript
// packages/knowledge/src/index.ts
export * from './patterns/routing';
export * from './patterns/styling';
export * from './patterns/state';
// ... etc
```

## Common Issues & Solutions

### Issue: Workspace dependencies not linking
```bash
# Solution: Reinstall with workspace protocol
pnpm install --force
```

### Issue: TypeScript errors after dependency changes
```bash
# Solution: Rebuild type definitions
pnpm build
pnpm type-check
```

### Issue: Turbo cache causing stale builds
```bash
# Solution: Clear turbo cache
pnpm turbo run clean
rm -rf .turbo/
```

### Issue: ESLint can't find dependencies
```bash
# Solution: Ensure eslint.config.js uses ignores patterns
# and run from monorepo root, not package directory
pnpm lint  # ✅ From monorepo root
```

## Getting Help

1. **Read Documentation**
   - [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
   - [project/info.md](./project/info.md) - Project architecture
   - [project/style.md](./project/style.md) - Code style guide

2. **Check Existing Issues**
   - GitHub Issues for known problems

3. **Ask for Help**
   - Create an issue with detailed context
   - Include command output and error messages
   - Reference relevant code sections

## Code Review Checklist

Before submitting a PR, verify:

- [ ] Tests pass: `pnpm test`
- [ ] No type errors: `pnpm type-check`
- [ ] No lint violations: `pnpm lint` (or use --fix)
- [ ] Code formatted: `pnpm prettier --write .`
- [ ] Documentation updated if needed
- [ ] CHANGELOG.md updated for user-facing changes
- [ ] Commit messages follow semantic format
- [ ] No console.log statements left in code
- [ ] Error handling included for async operations
- [ ] New public APIs documented with JSDoc

## Thank You!

Your contributions help make Mr. DJ's Dev Suite better for all Expo developers. We appreciate your time and effort! 🙏
