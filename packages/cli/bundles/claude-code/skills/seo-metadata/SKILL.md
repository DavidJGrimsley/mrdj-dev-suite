---
description: Use when preparing Expo web routes for crawlability, sharing previews, and production indexing behavior.
---

# Skill: SEO Metadata

Use when preparing Expo web routes for crawlability, sharing previews, and production indexing behavior.

## Main rule

Define metadata intentionally per route group and ensure canonical/indexing strategy is explicit before release.

## Checks

- Confirm title, description, and canonical strategy are defined for production web routes.
- Confirm Open Graph and social preview metadata exist for key entry routes.
- Confirm dynamic routes have deterministic metadata sources and structured data appropriate to the page type.
- For `web.output: "server"`, confirm the root layout renders the route tree on the server; a loading overlay may cover it visually but must not replace it in the initial HTML.
- Prefer a route `generateMetadata` export for server-rendered dynamic metadata so title, description, canonical, and Open Graph values are resolved before streaming.
- Confirm sitemap and robots strategy is documented for the chosen web output mode.
- Confirm duplicate or conflicting titles/canonicals are resolved.

## Preferred structure

- Keep shared metadata defaults centralized and route-level overrides explicit.
- Keep metadata source-of-truth close to route ownership boundaries.
- Emit one JSON-LD payload per page. Reuse deterministic loader fallback data when live data is unavailable, and avoid rendering the same payload through both a head helper and a body script.
- Keep SEO rules documented in project memory so onboarding and Doctor checks align.

## Example fix

- Problem: A server-rendered data-loader route returns HTTP 200 but the raw HTML contains only a loading shell, while metadata appears only after hydration.
- Fix: Keep the route outlet mounted during the server and first client render, add deterministic `generateMetadata`, emit one route-specific JSON-LD payload, and update sitemap coverage.

## Agent behavior

- Prioritize production routes and highest-traffic entry points first.
- Verify production-style raw HTML with JavaScript disabled. Check unique page content, loader data, title, description, canonical, Open Graph, and parseable JSON-LD on every affected sitemap route.
- Delegate framework metadata primitives to official Expo guidance, then enforce MDS standards for canonical/indexing completeness.
