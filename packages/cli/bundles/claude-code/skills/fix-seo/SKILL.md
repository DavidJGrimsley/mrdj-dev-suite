---
description: Apply SEO metadata fixes for Expo web routes with MCP guidance and post-fix verification.
disable-model-invocation: true
---

# /fix-seo

Apply SEO metadata fixes for Expo web routes with MCP guidance and post-fix verification.

## Arguments

- `projectPath`: Expo project path (default: current directory).
- `routeOrFile`: optional route/file focus for targeted checks.

## MCP-First Workflow

1. Confirm the `mr-djs-dev-suite` MCP server is available.
2. Pull `get_skill` for `seo-metadata`.
3. Optionally run `doctor_scan_file` for focused route files, then `doctor_scan_project` for full checks.
4. Use `knowledge_list_resources` (`kind: "rule"`) to ensure canonical/indexing strategy is complete.
5. Implement metadata, canonical, robots, and sitemap corrections in route ownership boundaries.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client <client> --scope project`
2. Direct CLI checks:
   - `mds doctor <projectPath> --ci`
   - Run project-specific web build/preview commands to verify metadata output.

## Verification And Output

- Confirm canonical tags, social metadata, and sitemap/robots behavior on affected routes.
- Output: changed files, resolved SEO gaps, and any remaining manual verification steps.
