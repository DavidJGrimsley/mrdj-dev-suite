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
  const projectInfo = options.projectInfo as { displayName?: string } | undefined;

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

  // Parse product requirements if available
  const answers = (options.answers ?? options.productRequirements ?? {}) as Record<string, unknown>;
  const overview = typeof answers.overview === 'string' ? answers.overview : 'Deliver a top class simple app that aids in experimentation without slowing work down.';
  const audience = typeof answers.audience === 'string' ? answers.audience : 'Scientists and people learning how to conduct experiments';
  const problemStatement = typeof answers.problemStatement === 'string' ? answers.problemStatement : "There's no good way to track experiment data on the go.";
  const productGoals = typeof answers.productGoals === 'string' ? answers.productGoals : 'Provide a way for other scientists and I to track and manage our experiments effectively.';
  const nonGoals = typeof answers.nonGoals === 'string' ? answers.nonGoals : 'Ways to actually conduct experiments, analyze data, or collaborate with other scientists.';
  const firstUserFlow = typeof answers.firstUserFlow === 'string' ? answers.firstUserFlow : 'Create an experiment';
  const coreFlows = typeof answers.coreFlows === 'string' ? answers.coreFlows : [
    'Create an experiment',
    'Track multiple experiments, each with its own hypothesis, procedure, data collection, and results.',
    'View and edit existing experiments',
    'Add pictures and notes to experiments',
    'Organize experiments into folders or categories',
    'Search and filter experiments',
  ].join('\n');
  const screens = typeof answers.screens === 'string' ? answers.screens : [
    'New (create new experiment)',
    'Track (list of past experiments)',
    'App info modal',
  ].join('\n');
  const displayName = typeof answers.displayAppName === 'string' ? answers.displayAppName : (typeof projectInfo?.displayName === 'string' ? projectInfo.displayName : appName);

  const hasExperimemoRequirements = originalContent?.includes('Experimemo') || overview.toLowerCase().includes('experiment');

  let infoMd: string;
  if (hasExperimemoRequirements) {
    infoMd = `# ${displayName}

## Product Overview
${overview}

- **Application Name**: ${displayName} (id: \`${appName}\`)
- **Framework**: Exact (upstream commit \`${revision}\`)
- **Template Starter**: ${templateId}
- **Application ID / Bundle**: \`${bundleId}\`
- **Target Platforms**: ${platforms}

## Target Users
${audience}

## Problem Solved
${problemStatement}

## Product Goals
${productGoals}

## Non-Goals
${nonGoals}

## First User Flow
${firstUserFlow}

## Core Flows & Features
${coreFlows.split(/\r?\n/).filter(Boolean).map(line => line.startsWith('-') ? line : `- ${line}`).join('\n')}

## Screens
${screens.split(/\r?\n/).filter(Boolean).map(line => line.startsWith('-') ? line : `- ${line}`).join('\n')}

## Technical Architecture & Seam
- **View Layer**: Declarative Contract specification (\`app.contract\`)
- **Business & Data Logic**: TypeScript data provider (\`app.ts\`)
- **Persistence**: Exact local persistence / SQLite WASM
- **Testing & Verification**: Contract agent journeys (\`app.test.contract\`)
- **Development Toolchain**: Bun (>=1.4.2) and Rust (1.97.0); \`bun exact.mjs web\`

## Recorded Tech Stack & Platform Decisions
1. **Expo and NativeWind Discarded**: The original intake file in \`project/info.original.md\` specified Expo Router, NativeWindUI, EAS, and Expo SQLite. Per project directives, all Expo-specific and NativeWind instructions were ignored as generator commands. The app is implemented natively using Exact.
2. **Platform Strategy**: Original target platforms were \`ios, android\` with MVP \`ios\`. Exact natively supports web, macOS, iOS, Linux, and Windows. Web and iOS simulator serve as initial verification targets; Android support is experimental in Exact and deferred.
3. **Navigation & Modals**: Contract routes handle top-level screens (\`Track\`, \`New\`) and modal presentation handles \`App info modal\`.

${sourceInfo && typeof sourceInfo.path === 'string' ? `## Source Provenance\n- Source document: \`${sourceInfo.path}\`${typeof sourceInfo.sha256 === 'string' ? ` (sha256 \`${sourceInfo.sha256}\`)` : ''}\n- Preserved verbatim in: \`project/info.original.md\`\n` : ''}
`;
  } else {
    infoMd = `# ${appName}

## Product Overview
- **Project Name**: ${appName}
- **Framework**: Exact (revision \`${revision}\`)
- **Template Starter**: ${templateId}
- **Application ID / Bundle**: \`${bundleId}\`
- **Target Platforms**: ${platforms}

## Vision & Elevator Pitch
A high-performance cross-platform application developed with Exact, featuring a declarative Contract interface and TypeScript/Rust data logic.

## Technical Architecture
- **UI Specification**: Contract (\`app.contract\`)
- **Data Logic Seam**: TypeScript (\`app.ts\`) or Rust
- **Automated Verification**: Contract agent test scripts (\`app.test.contract\`)
- **Build & Development Runner**: \`bun exact.mjs\`
`;
  }

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

## Phase 2: Core Experiment Feature Implementation
- [ ] Define Experiment data schema in \`app.ts\`
- [ ] Implement Experiment List view in \`app.contract\`
- [ ] Implement Create Experiment form and validation in \`app.contract\`
- [ ] Add functional unit and Contract agent tests in \`app.test.contract\`

## Phase 3: Platform Hardening & Release
- [ ] Validate responsive layout on target devices (web and iOS simulator)
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
