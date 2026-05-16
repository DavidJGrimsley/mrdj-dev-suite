Perform a comprehensive MDS review of the current Expo project.

1. Call `doctor_scan_project` via MCP to surface errors and warnings.
2. Call `get_skill` for each of the following skill IDs and apply their checks:
   - `expo-router-architecture` — are route files thin and free of business logic?
   - `expo-ssr-safety` — are browser globals and client-only APIs properly guarded?
   - `env-vars` — are public/private env boundaries respected?
   - `seo-metadata` — do web routes have a metadata and indexing strategy?
3. Combine Doctor findings and skill findings into a single prioritized list:
   - P0: errors that block commits or break production
   - P1: warnings that risk bugs or maintainability
   - P2: best-practice gaps worth addressing this sprint
4. For each item provide a specific, actionable fix.
