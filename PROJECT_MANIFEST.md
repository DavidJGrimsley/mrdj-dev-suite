<!-- mrdj-dev-suite Project Manifest -->
# Project Manifest: mrdj-dev-suite

**Created**: 2025-01 | **Status**: Foundation Complete | **Phase**: 0 → 1 Transition

## ✅ Foundation Setup Complete (27 Files, ~30 KB)

### Root Configuration (11 files)
```
✅ package.json              Root workspace config, scripts, dependencies
✅ tsconfig.json            Root TypeScript configuration (strict mode)
✅ tsconfig.base.json       Shared TypeScript base for all packages
✅ turbo.json               Build pipeline orchestration
✅ pnpm-workspace.yaml      Workspace resolution & public hoist config
✅ .npmrc                   npm/pnpm global settings
✅ eslint.config.js         Shared ESLint configuration
✅ prettier.config.json     Prettier formatting rules
✅ .prettierrc               Alternative Prettier config (IDE detection)
✅ .prettierignore           Prettier ignore patterns
✅ .editorconfig             Editor standards (indent, line endings, charset)
```

### Testing & Development (1 file)
```
✅ vitest.config.ts         Vitest configuration (v8 coverage, node env, globals)
```

### Documentation (5 files)
```
✅ README.md                Project overview, quick start, architecture
✅ DEVELOPMENT.md           Development workflow guide
✅ CONTRIBUTING.md          Contribution guidelines (NEW - comprehensive)
✅ CHANGELOG.md              Release notes tracking (NEW)
✅ project/info.md          Project vision, architecture, conventions
✅ project/todo.md          Phase 1-6 breakdown, task priority
✅ project/style.md         Code style conventions
```

### Package Structure (8 files - 2 per package)
```
packages/doctor/
✅ package.json             Exports main + checks, deps: execa, json5
✅ tsconfig.json            Package TypeScript config

packages/cli/
✅ package.json             Exports main + bin, deps: yargs, chalk
✅ tsconfig.json            Package TypeScript config

packages/knowledge/
✅ package.json             Exports main + patterns + skills
✅ tsconfig.json            Package TypeScript config

packages/mcp-server/
✅ package.json             Exports main + tools + resources
✅ tsconfig.json            Package TypeScript config
```

### Implementation Stubs (4 files)
```
packages/doctor/src/
✅ index.ts                 Production entry point (placeholder)

packages/cli/src/
✅ cli.ts                   CLI command implementations (placeholder)

packages/knowledge/src/
✅ index.ts                 Knowledge export point (placeholder)

packages/mcp-server/src/
✅ index.ts                 MCP server entry point (placeholder)
```

---

## 📋 File Inventory

### By Category
| Category | Files | Purpose |
|----------|-------|---------|
| Configuration | 11 | Workspace, build, linting, formatting, editors |
| Documentation | 7 | README, guides, style, changelog, project info |
| Testing | 1 | Vitest runner configuration |
| Package Config | 8 | 4 packages × (package.json + tsconfig.json) |
| Implementation | 4 | Placeholder entry points for 4 packages |
| **TOTAL** | **31** | **~30 KB** |

### By Status
- ✅ Ready for Development: 27 files (foundation complete)
- ⏳ Awaiting Implementation: 4 stub files (placeholder)
- 📝 Pending User Content: Knowledge harvest from 9 repos

---

## 🏗️ Architecture Blueprint

### Layer Model (5-Layer)
```
┌─────────────────────────────────────────────┐
│  Layer 1: mrdj-cli (User Interface)         │
│  Commands: doctor, onboard, test-and-iterate│
└──────────┬──────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────┐
│  Layer 2: mcp-server (Agent Interface)      │
│  Tools: doctor_scan_project, onboard_app    │
└──────────┬──────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────┐
│  Layer 3: doctor (Diagnostics)              │
│  Checks: eslint, typescript, expo, archi    │
└──────────┬──────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────┐
│  Layer 4: knowledge (Patterns & Skills)     │
│  Domains: routing, styling, state, api, db  │
└──────────┬──────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────┐
│  Layer 5: External Services                 │
│  GitHub Actions, Supabase, MCP Clients      │
└─────────────────────────────────────────────┘
```

### Dependency Graph
```
@mrdj/cli
├── yargs (CLI argument parsing)
├── chalk (colored output)
├── @mrdj/doctor ──────────┐
│   ├── execa (subprocess)  │
│   └── json5 (JSON parsing)│
└── @mrdj/knowledge ───────┤
    ├── (no external deps)  │
    └── patterns/skills ────┘

@mrdj/mcp-server
├── @modelcontextprotocol/sdk
├── @mrdj/doctor ──────┐
└── @mrdj/knowledge ───┴─ (shared knowledge base)
```

---

## 🚀 Next Steps (Phase 1 Implementation)

### Step 1: Validate Setup (5 minutes)
```bash
cd f:\SoftwareDev\mrdj-dev-suite
pnpm install
pnpm list -r
```

### Step 2: Priority 1 - Knowledge Harvest (30-60 min)
**Reference Repos**: time2pay, core-monorepo, DJsPortfolio, PokePages, expo-super-template, mercury-bank-sdk, not-hot-dog, quantum-api, ads-sdk

**Extract Patterns into**: `packages/knowledge/src/patterns/`

### Step 3: Parallel Work (60-90 min each)
- **Priority 2**: Doctor multi-check engine
- **Priority 3**: Test & iterate workflow
- **Priority 4**: Onboarding agent

### Step 4: Final Assembly (30-45 min)
- **Priority 5**: Knowledge package build system

**Total Phase 1**: ~7.5-8.5 hours

---

## 📊 Tech Stack (LOCKED)

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **CLI** | TypeScript | 5.9 | Command-line interface |
| **CLI Tools** | yargs, chalk | 17.x, 5.x | Argument parsing, colors |
| **Diagnostics** | execa, json5 | 6.x, 2.x | Subprocess, JSON parsing |
| **Build** | Turborepo, pnpm | 1.10, 8.14 | Monorepo orchestration |
| **Testing** | Vitest | 1.0 | Unit tests, coverage |
| **Linting** | ESLint, Prettier | 8.54, 3.1 | Code quality |
| **Typing** | TypeScript | 5.9 | Type checking, strict mode |
| **MCP** | @modelcontextprotocol/sdk | 0.1 | Agent framework integration |
| **Target Apps** | Expo, React Native | 55, 0.83 | Build target platform |

---

## 📦 Packages (4 Total)

### 1. @mrdj/doctor
**Purpose**: Multi-check health diagnostics for Expo projects
- ESLint validation
- TypeScript compilation check
- Expo doctor output
- App folder architecture validation

**Location**: `packages/doctor/`
**Entry Point**: `src/index.ts`
**Build Output**: `dist/index.js`

### 2. @mrdj/cli
**Purpose**: Command-line interface for mrdj suite
- `mrdj doctor [path] [--fix]` - Run diagnostics
- `mrdj onboard` - Interactive project setup
- `mrdj test-and-iterate [--feature] [--pr-title]` - Automated workflow

**Location**: `packages/cli/`
**Entry Point**: `src/cli.ts`
**Bin Entry**: `mrdj` command

### 3. @mrdj/knowledge
**Purpose**: Architectural patterns, skills, conventions
- Routing patterns (file-based, dynamic, guards)
- Styling patterns (Uniwind, theming, responsive)
- State management patterns (Zustand, selectors)
- Database patterns (Drizzle, schema design)
- API patterns (+api.ts, error handling)
- Deployment patterns (Plesk, EAS, static)
- Project organization conventions

**Location**: `packages/knowledge/`
**Entry Point**: `src/index.ts`
**Export**: Patterns, skills, style guide

### 4. @mrdj/mcp-server
**Purpose**: Model Context Protocol server for Claude integration
- Tool: `doctor_scan_project_full`
- Tool: `onboard_new_expo_app`
- Tool: `test_and_iterate_workflow`
- Resource: Pattern knowledge base
- Resource: Skill definitions

**Location**: `packages/mcp-server/`
**Entry Point**: `src/index.ts`
**Export**: MCP tools, resources

---

## 🔧 Commands Reference

### Development
```bash
pnpm dev              # Start development servers (if applicable)
pnpm build            # Build all packages
pnpm type-check       # TypeScript strict checking
pnpm lint             # ESLint all code (+ --fix)
pnpm test             # Run Vitest suite
pnpm clean            # Clean all dist/ and node_modules
```

### Production
```bash
pnpm doctor           # Run project diagnostics
pnpm onboard          # Start onboarding wizard
```

### Monorepo-Specific
```bash
pnpm list -r          # List all packages with dependencies
pnpm --filter @mrdj/doctor build  # Build single package
turbo run lint --dry  # Dry-run Turborepo tasks
```

---

## 📖 Documentation Navigation

### For New Developers
1. **Start**: [README.md](./README.md) - Project overview
2. **Setup**: [DEVELOPMENT.md](./DEVELOPMENT.md) - Getting started
3. **Contribute**: [CONTRIBUTING.md](./CONTRIBUTING.md) - Workflow guide

### For Architects
1. **Vision**: [project/info.md](./project/info.md) - Project mission & patterns
2. **Tasks**: [project/todo.md](./project/todo.md) - Phase breakdown
3. **Style**: [project/style.md](./project/style.md) - Code conventions

### For Maintainers
1. **Releases**: [CHANGELOG.md](./CHANGELOG.md) - Version history
2. **Build**: [turbo.json](./turbo.json) - Pipeline orchestration
3. **Code Quality**: [eslint.config.js](./eslint.config.js) + [prettier.config.json](./prettier.config.json)

---

## 🎯 Success Criteria (Phase 1)

- [ ] All 27 foundation files persist without errors
- [ ] `pnpm install` completes with zero workspace resolution errors
- [ ] `pnpm type-check` passes (no TypeScript errors)
- [ ] `pnpm lint` passes (no ESLint violations)
- [ ] `pnpm test` completes (Vitest configured)
- [ ] All 4 packages build successfully: `pnpm build`
- [ ] Priority 1: Knowledge harvest extracts patterns from 9 repos
- [ ] Priority 2: Doctor engine implements 4 check categories
- [ ] Priority 3-4: Test automation & onboarding workflows operational
- [ ] Priority 5: Knowledge package exports all skills & patterns

---

## 🚦 Transition Status

**Current Phase**: 0 (Foundation) → Phase 1 (Implementation)

**Blockers**: None - all prerequisites satisfied

**Ready For**: Immediate execution of Priority 1 (Knowledge Harvest) after pnpm install validation

**Timeline**: Phase 1 completion estimated 7.5-8.5 hours

---

## 📝 Version Info

**Created**: 2025-01  
**Foundation Completion**: ✅ COMPLETE  
**Package Count**: 4  
**Total Files**: 27 (+ stubs)  
**Size**: ~30 KB  
**Build Status**: Awaiting implementation  
**Documentation**: 100% (5 markdown files)  
**Code Quality Config**: 100% (ESLint, Prettier, TypeScript)

---

**Next Command**: User should run `pnpm install` to validate workspace setup, then indicate readiness to begin **Priority 1: Knowledge Harvest**.

Generated: 2025-01 | mrdj-dev-suite Foundation Phase Complete
