# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project foundation and monorepo setup
- Turborepo configuration for parallel task execution
- Packages: doctor, cli, knowledge, mcp-server
- Project documentation (info.md, todo.md, style.md)
- Development guide (DEVELOPMENT.md)
- First working Doctor engine and CLI wiring
- Pattern metadata catalog seeded from scanned repos
- Ship-to-test and post-create onboarding workflow direction

### In Progress
- **Phase 1: Foundation** (Knowledge harvest, doctor implementation, onboarding agent)
  - Priority 1: Knowledge harvest from 9 production repos
  - Priority 2: Doctor multi-check engine
  - Priority 3: Test & iterate workflow automation
  - Priority 4: Onboarding agent implementation
  - Priority 5: Knowledge package build system

### Planned
- **Phase 2**: create-expo-stack fork, GitHub Actions doctor, DWAH hosting
- **Phase 3**: Advanced features and optimizations
- **Phase 4**: Team collaboration features
- **Phase 5**: CI/CD pipeline automation
- **Phase 6**: Documentation and community support

## [0.1.10] - 2026-06-09

### Added
- shared `info.md` extraction for Super Stack intake, including seeded answers, evidence tracking, preserved notes, and naming derivation
- new `create_expo_super_stack_extract_info` MCP tool for extract-first guided generation
- machine-readable MDS snapshot blocks in generated `project/info.md` so future apps can reuse prior onboarding decisions

### Changed
- Super Stack guided flow now extracts project memory first and asks follow-up questions only for missing or ambiguous fields
- app naming now uses one normal app-name question when needed and derives the folder slug automatically
- runtime version reporting now surfaces concrete installed package versions and warnings for stale or mismatched installs
- generator flow now targets Expo SDK 56 explicitly and validates the final Expo dependency before finishing
- regenerated Codex, Claude, and VS Code prompt assets so published guidance matches the extract-first flow

### Fixed
- redundant intake questions for audience and naming when those answers already exist in `info.md`
- stale published MCP install target after the new release bump

## [0.1.9] - 2026-06-09

### Added
- `mds roadmap` CLI support and roadmap generation coverage
- richer Super Stack onboarding and stylist scaffolding updates
- MCP server guidance for the new release and roadmap flows

### Changed
- regenerated Codex, Claude, and VS Code plugin assets from the knowledge source of truth
- refreshed published package references for the CLI and MCP install flows

### Fixed
- create-expo-super-stack lint failure in release prep
- Doctor checks around Expo config, SEO metadata, and todo-for-context handling

## [0.1.0] - 2025-01-XX

### Initial Release
- Project vision: AI dev-suite for Expo developers
- Monorepo foundation with Turborepo + pnpm workspaces
- 4 core packages: doctor, cli, knowledge, mcp-server
- TypeScript 5.9 strict mode with shared configuration
- ESLint + Prettier code quality tooling
- Vitest testing framework integration
- Comprehensive documentation and development guide

---

## How to Update This Changelog

1. Add entries under `[Unreleased]` as work completes
2. When releasing a version:
   - Create a new section: `## [X.Y.Z] - YYYY-MM-DD`
   - Move items from `[Unreleased]` into the version section
   - Update links at bottom if this is not the first release

## Sections to Use

- **Added**: New features
- **Changed**: Modifications to existing functionality
- **Deprecated**: Features marked for removal
- **Removed**: Features that were removed
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes

## Example Entry

```markdown
## [0.2.0] - 2025-02-15

### Added
- Knowledge harvest from 9 production repos
- Doctor multi-check engine with 4 validators
- CLI mds doctor command with --fix flag

### Changed
- Restructured packages/ layout for clarity

### Fixed
- TypeScript errors in workspace linking
```
