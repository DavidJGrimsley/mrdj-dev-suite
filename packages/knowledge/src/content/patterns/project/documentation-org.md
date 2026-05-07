# Documentation Organization Pattern

## Description

Documentation organization establishes consistent structure for project metadata, guides, and architectural decisions. This pattern uses structured markdown files in dedicated `project/` directories alongside inline code documentation to keep knowledge accessible and maintainable.

## When to Use

**Organize documentation when:**
- ✅ Starting a new project
- ✅ Scaling team from solo to multiple developers
- ✅ Recording architectural decisions
- ✅ Documenting API endpoints and conventions
- ✅ Creating onboarding guides
- ✅ Maintaining style guides and design systems

## Core Concepts

**Documentation Tiers:**
```
1. Project Metadata (project/info.md)
   ├── Purpose, stack, status
   └── Quick reference

2. Architecture Docs (project/architecture.md, copilot-instructions.md)
   ├── System design
   ├── Tech decisions
   └── Patterns used

3. Style & Standards (project/style.md)
   ├── Code style
   ├── Naming conventions
   └── Best practices

4. Roadmap (project/todo.md)
   ├── Features
   ├── Bugs
   └── Improvements

5. Inline Code Comments
   ├── Complex logic
   ├── Why decisions
   └── Usage examples
```

## Code Examples

### Project Info File (project/info.md)

```markdown
# DJsPortfolio - Project Information

## Overview
Personal portfolio and project showcase for David J Grimsley.

## Core Stack
- **Framework**: Expo SDK 55 + React Native 0.83
- **Routing**: Expo Router (file-based)
- **Styling**: Uniwind v1.2.6 + Tailwind v4
- **State**: Zustand (atomic stores)
- **Database**: Supabase (PostgreSQL) + Drizzle ORM
- **Deployment**: Plesk VPS + EAS Build
- **Platforms**: iOS, Android, Web

## Project Status
- Phase: Active Development
- Last Updated: 2025-01-15
- Team Size: 1 (solo)
- Production: Yes (davidjgrimsley.com)

## Getting Started
```bash
pnpm install
pnpm dev
```

## Key Features
- Portfolio showcase with projects
- Contact form integration
- Blog section
- Dark mode support
- PWA support (offline-capable)

## Important Files
- `app.json` - Expo config
- `global.css` - Theme definitions
- `src/app/` - Routing structure
- `src/store/` - State management

## Team Contacts
- David J Grimsley (solo dev)
- Email: contact@davidjgrimsley.com

## Resources
- Production: https://davidjgrimsley.com
- Repository: https://github.com/DavidJGrimsley/DavidsPortfolio
- Issues: [GitHub Issues]
```

### Style Guide File (project/style.md)

```markdown
# DJsPortfolio - Style Guide

## Code Style

### TypeScript
- **Strict Mode**: Enabled
- **Line Length**: 100 characters
- **Imports**: Organized by: external → internal → types
- **Naming**: camelCase for variables/functions, PascalCase for components/classes

### React Components
```typescript
// Functional components with TypeScript
interface ComponentProps {
  title: string;
  onPress: () => void;
  children?: ReactNode;
}

export function MyComponent({ title, onPress, children }: ComponentProps) {
  return <View>{/* ... */}</View>;
}
```

### State Management
- Use Zustand for global state
- One store per domain (authStore, postStore, etc.)
- Use selectors to prevent re-renders
- Persist cross-platform data to AsyncStorage

### Styling
- Use `className` (Uniwind) for layout/spacing
- Use `style={{}}` only for dynamic values
- No CSS-in-JS or StyleSheet.create()
- Define colors in `src/constants/theme.ts`

### Error Handling
```typescript
try {
  const result = await api.call();
} catch (error) {
  console.error('Context:', error);
  setError(error.message);
}
```

## File Organization

### Component Structure
```
components/
├── Button/
│   ├── Button.tsx           # Implementation
│   ├── Button.stories.tsx   # Storybook (if used)
│   └── index.ts             # Export
```

### Feature Structure
```
features/auth/
├── hooks/
├── services/
├── store.ts
├── types.ts
└── index.ts
```

## Naming Conventions

### Files
- Routes: lowercase (`profile.tsx`, `[id].tsx`)
- Components: PascalCase (`Button.tsx`, `UserCard.tsx`)
- Utilities: camelCase (`formatting.ts`, `validators.ts`)
- Types: PascalCase in files (`types.ts`, `User` interface)

### Variables
- Constants: UPPER_SNAKE_CASE (`API_URL`, `MAX_RETRIES`)
- Variables: camelCase (`userName`, `isLoading`)
- Classes: PascalCase (`UserService`, `AuthProvider`)

### Functions
- Hooks: camelCase prefixed with `use` (`useAuth()`, `useForm()`)
- Handlers: camelCase prefixed with `handle` (`handlePress()`, `handleChange()`)
- Async: descriptive name (`fetchUsers()`, `createPost()`)

## Git Workflow

### Branch Naming
- Feature: `feature/description` → PR → merge to develop
- Fix: `fix/description` → PR → merge to develop
- Release: `release/version` → PR → merge to main + develop

### Commit Messages
```
feat: add user authentication
fix: resolve navigation bug
docs: update README
style: format code
perf: optimize list rendering
```

## Documentation

### Comments in Code
- Explain WHY, not WHAT
- Use for complex logic only
- Keep updated with code changes

```typescript
// ✅ Good - explains intent
// Retry with exponential backoff to handle transient failures
const retryWithBackoff = (fn, maxAttempts) => { ... };

// ❌ Bad - just describes code
// Loop through items
items.forEach(item => { ... });
```

### JSDoc for Public APIs
```typescript
/**
 * Fetch posts for a user
 * @param userId - The user ID to fetch posts for
 * @param limit - Maximum number of posts to return (default: 10)
 * @returns Array of posts or error
 */
export async function getUserPosts(
  userId: string,
  limit: number = 10
): Promise<Post[]> {
  // ...
}
```

## Design System

### Colors
Use semantic naming:
```typescript
colors: {
  primary: '#007AFF',        // Main action color
  secondary: '#5AC8FA',      // Secondary action
  success: '#34C759',        // Success state
  error: '#FF3B30',          // Error state
  warning: '#FF9500',        // Warning state
}
```

### Spacing Scale
```typescript
spacing: {
  xs: 4,    // Small gaps
  sm: 8,    // Component internal spacing
  md: 16,   // Section spacing
  lg: 24,   // Page spacing
  xl: 32,   // Large sections
}
```

### Typography
```typescript
typography: {
  h1: { size: 32, weight: 700 },      // Page title
  h2: { size: 24, weight: 700 },      // Section title
  body: { size: 16, weight: 400 },    // Body text
  small: { size: 14, weight: 400 },   // Meta text
}
```
```

### Architecture Decisions (project/architecture.md)

```markdown
# DJsPortfolio - Architecture Decisions

## ADR-001: State Management
**Decision**: Use Zustand for global state

**Rationale**:
- Minimal boilerplate vs Redux
- Atomic subscriptions prevent re-renders
- Built-in persistence middleware
- TypeScript-first design

**Alternatives Considered**:
- Redux: Too verbose for small team
- Context API: Performance concerns at scale

## ADR-002: Styling Approach
**Decision**: Uniwind (Tailwind v4) + CSS Variables for theming

**Rationale**:
- Familiar Tailwind syntax
- Cross-platform (native + web)
- CSS Variables support light/dark mode
- Build-time optimization

**Migration Path**:
- From NativeWind v4 to Uniwind (Q1 2025)

## ADR-003: Database
**Decision**: Supabase (PostgreSQL) + Drizzle ORM

**Rationale**:
- Type-safe query building
- Auto-generated migrations
- Row-level security (RLS)
- Automatic schema inference

**Limitations**:
- PostgreSQL only (no other databases)
- Schema must be defined in Drizzle

## ADR-004: API Design
**Decision**: RESTful API with clear versioning

**Rationale**:
- Simple, familiar conventions
- Easy to test and document
- Versioning allows breaking changes

**Endpoints**:
```
GET    /api/v1/posts
POST   /api/v1/posts
GET    /api/v1/posts/:id
PUT    /api/v1/posts/:id
DELETE /api/v1/posts/:id
```

## ADR-005: Deployment
**Decision**: Plesk VPS + EAS Build

**Rationale**:
- Full control over server
- nginx reverse proxy
- SSL/TLS management
- EAS handles app store builds

**Current Infrastructure**:
- Primary: davidjgrimsley.com (Plesk)
- Static exports: Web build
- API Server: Node.js on port 3000
```

### Roadmap File (project/todo.md)

```markdown
# DJsPortfolio - Roadmap & TODO

## Current Quarter (Q1 2025)
- [ ] Migrate from NativeWind to Uniwind
- [ ] Add blog system (Markdown-based)
- [ ] Implement analytics (privacy-respecting)
- [ ] Add dark mode toggle (currently auto)

## Backlog - High Priority
- [ ] Add search functionality
- [ ] Implement offline support (PWA)
- [ ] Add AI chat for portfolio questions
- [ ] Create reusable component library

## Backlog - Medium Priority
- [ ] Add internationalization (i18n)
- [ ] Create admin dashboard
- [ ] Add form validation improvements
- [ ] Implement caching strategy

## Backlog - Low Priority
- [ ] Add animations (micro-interactions)
- [ ] Create design system docs
- [ ] Add performance monitoring
- [ ] Create CI/CD dashboard

## Known Issues
- [ ] Mobile landscape orientation needs adjustment
- [ ] Some animations jank on older devices
- [ ] Form validation messages need i18n

## Completed ✅
- ✅ Initial portfolio setup (v1)
- ✅ Dark mode support
- ✅ Mobile optimization
- ✅ SSL/TLS setup
- ✅ Contact form integration
```

### GitHub-Specific Instructions (copilot-instructions.md)

```markdown
# Copilot Instructions

When working on this repository, follow these guidelines:

## Architecture
- See [project/architecture.md](./project/architecture.md)

## Component Style
- Functional React components with TypeScript
- Props interface required
- Use Uniwind for styling
- Prefer Pressable over TouchableOpacity

## State Management
- Zustand for global state
- One store per domain
- Use selectors for derived state

## File Organization
- Routes in src/app/
- Components in src/components/
- Business logic in src/features/
- Types in src/types/

## Common Tasks

### Adding a New Feature
1. Create feature folder: `src/features/feature-name/`
2. Add types: `src/features/feature-name/types.ts`
3. Add hooks: `src/features/feature-name/hooks/`
4. Add services: `src/features/feature-name/services/`
5. Create store: `src/features/feature-name/store.ts`
6. Export barrel: `src/features/feature-name/index.ts`

### Adding a New Screen
1. Create route in `src/app/feature/screen.tsx`
2. Create component in `src/components/screens/ScreenComponent.tsx`
3. Import component in route file
4. Update navigation if needed

### Testing Changes
```bash
pnpm dev              # Start dev server
pnpm lint             # Check lint
pnpm typecheck        # Check types
```
```

## Documentation Best Practices

### ✅ DO

1. **Keep docs close to code**
   ```
   src/features/auth/
   ├── README.md        # Feature-specific docs
   ├── types.ts
   └── hooks/
   ```

2. **Use clear file names**
   ```
   ✅ info.md, style.md, todo.md
   ❌ meta.md, guide.md, work.md
   ```

3. **Update docs with code changes**
   ```markdown
   # When you change API
   Update: src/services/api.ts AND project/architecture.md
   ```

### ❌ DON'T

1. **Don't let docs become stale**
   ```markdown
   ❌ "Last updated: 2023-01-01"
   ✅ Link to relevant code files
   ```

2. **Don't duplicate information**
   ```markdown
   ❌ Copy-paste into multiple files
   ✅ Link to single source of truth
   ```

3. **Don't ignore documentation**
   ```markdown
   ❌ "Will document later"
   ✅ Write docs as you code
   ```

## Related Patterns

- [Folder Structure](./folder-structure.md) — Project layout
- [Configuration Patterns](./configuration-patterns.md) — Config files
- [Library Exports](./library-exports.md) — Package exports

---

*Pattern extracted from production repositories: DJsPortfolio, not-hot-dog*
*Examples: project/info.md, project/style.md, copilot-instructions.md*