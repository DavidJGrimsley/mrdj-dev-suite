/**
 * Exact-tailored canonical project memory generation.
 *
 * Produces structured project memory (info.md, style.md, todo.md, guidelines.md, info.original.md)
 * without imposing Expo React Native, Metro, Expo Router, or Expo Doctor assumptions.
 */

import { existsSync, readFileSync } from 'node:fs';
import type { GenerationPlan } from '@mr.dj2u/framework-registry';

export function buildExactProjectMemory(plan: GenerationPlan): Record<string, string> {
  const appName = plan.appName;
  const bundleId = plan.bundleId;
  const templateId = plan.templateId;
  const platforms = plan.targetPlatforms.join(', ') || 'web';
  const revision = plan.pinnedRevision.commit.slice(0, 10);
  const options = plan.options ?? {};
  const projectInfo = options.projectInfo as { displayName?: string; description?: string } | undefined;

  // Check for original info content or source file path
  let originalContent: string | undefined = typeof options.originalInfoContent === 'string' ? options.originalInfoContent : undefined;
  const sourceInfo = options.sourceInfo as { path?: unknown; sha256?: unknown } | undefined;
  if (!originalContent && sourceInfo && typeof sourceInfo.path === 'string' && existsSync(sourceInfo.path)) {
    try {
      originalContent = readFileSync(sourceInfo.path, 'utf8');
    } catch {
      // Ignored if unreadable
    }
  }

  // Only record requirements supplied by the caller; unresolved choices remain visible.
  const answers = (options.answers ?? options.productRequirements ?? {}) as Record<string, unknown>;
  const displayName = typeof answers.displayAppName === 'string' ? answers.displayAppName : (typeof projectInfo?.displayName === 'string' ? projectInfo.displayName : appName);
  const field = (key: string): string => {
    const value = answers[key] ?? (key === 'overview' ? projectInfo?.description : undefined);
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length) return value.map(String).join(', ');
    return '# TodoForContext(optional): Discuss and confirm.';
  };
  const infoMd = `# ${displayName}

## Product Overview
${field('overview')}

- **Application Name**: ${displayName} (id: \`${appName}\`)
- **Framework**: Exact (upstream commit \`${revision}\`)
- **Template Starter**: ${templateId}
- **Application ID / Bundle**: \`${bundleId}\`
- **Target Platforms**: ${platforms}

## Target Users
${field('audience')}

## Problem Solved
${field('problemStatement')}

## Product Goals
${field('productGoals')}

## Non-Goals
${field('nonGoals')}

## First User Flow
${field('firstUserFlow')}

## Core Flows & Features
${field('coreFlows')}

## Screens
${field('screens')}

## Technical Architecture
- **UI Specification**: Contract (\`app.contract\`)
- **Data Logic Seam**: TypeScript (\`app.ts\`)
- **Build & Development Runner**: \`bun exact.mjs\`
`;

  const styleMd = `# ${displayName} — Visual & Style Direction

## Presentation Principles
Exact adheres to the **"Write the web, ship the platform"** principle:
- **Layout is CSS's**: Flexbox, box-sizing, and standardized web geometry.
- **Presentation belongs to the platform**: Controls, system typography, system colors, and accessibility tokens align with host expectations (DOM on web, UIKit on iOS, AppKit on macOS).
- **Say less**: Structure the interface with semantic tags (\`header\`, \`list\`, \`dialog\`, \`button\`) and leave metric specifics to the platform's theme.

## Color Tokens & Theme
- Background: \`-exact-secondary-background\`
- Text: System label color
- Accents: System platform blue or custom brand tamber (\`app.tamber\`)
`;

  const guidelinesMd = `# ${displayName} — Engineering Guidelines

## Exact Framework Rules
1. **Toolchain**: Install Bun >=1.4.2 (upstream pins 1.4.2) with the official bun.sh installer and Rust 1.97.0 with rustup.rs, including the wasm32-unknown-unknown target. Use standard user locations (~/.bun/bin, ~/.cargo/bin) on normal PATH. Restart terminals/editors after installation; check \`bun --version\`, \`cargo --version\` and \`rustup target list --installed\`. Task-local tools do not establish readiness.
2. **Commands**:
   - Web development loop: \`bun exact.mjs web\`
   - Production preview: \`npm run build\`, then \`npm start\`, when those upstream scripts are present. Start serves prebuilt dist; use the web development loop when dist is absent. npm legitimately invokes the package script; Bun executes Exact.
   - Automated test suite: \`bun exact.mjs test web\`
   - Contract compilation gate: \`bun exact.mjs contract build app.contract --json --errors-only\`
   - Native builds (where supported): \`bun exact.mjs run\`
3. **Seam Safety**:
   - Keep view logic in \`app.contract\`.
   - Keep business logic and data providers in \`app.ts\`.
   - Never run Expo Doctor on an Exact project; Exact diagnostics belong to Exact.
4. **Agent Testing**:
   - Write automated user journeys in \`app.test.contract\`.
   - Verify all tests pass before completing development milestones.
`;

  const todoMd = `# ${displayName} — Implementation Roadmap

## Phase 1: Greenfield Setup & Verification
- [x] Scaffold initial Exact application structure (\`${templateId}\`)
- [ ] Confirm initial test and startup reports; run \`bun exact.mjs test web\` and \`bun exact.mjs web\` successfully
- [ ] Verify Contract compilation via \`bun exact.mjs contract build\`

## Phase 2: Product Implementation
- [ ] Review the confirmed product requirements and plan implementation tasks
- [ ] Implement the approved features and add relevant tests

## Phase 3: Platform Hardening & Release
- [ ] Validate responsive layout on the confirmed target platforms
- [ ] Verify light and dark mode appearance
- [ ] Complete pre-release validation
`;

  const files: Record<string, string> = {
    'info.md': infoMd,
    'style.md': styleMd,
    'guidelines.md': guidelinesMd,
    'todo.md': todoMd,
  };
  if (originalContent) {
    files['info.original.md'] = originalContent;
  }
  return files;
}
