---
name: "SEO Metadata Skill"
description: "Instructions for production web metadata, canonical URLs, and indexing strategy."
---

# Skill: SEO Metadata

Use when preparing Expo web routes for crawlability, sharing previews, and production indexing behavior.

## Main rule

Define metadata intentionally per route group and ensure canonical/indexing strategy is explicit before release.

## Checks

- Confirm title, description, and canonical strategy are defined for production web routes.
- Confirm Open Graph and social preview metadata exist for key entry routes.
- Confirm dynamic routes have deterministic metadata sources.
- Confirm sitemap and robots strategy is documented for the chosen web output mode.
- Confirm duplicate or conflicting titles/canonicals are resolved.

## Preferred structure

- Keep shared metadata defaults centralized and route-level overrides explicit.
- Keep metadata source-of-truth close to route ownership boundaries.
- Keep SEO rules documented in project memory so onboarding and Doctor checks align.

## Example fix

- Problem: Dynamic content routes ship with repeated title/description and no canonical mapping.
- Fix: Add route-level metadata builder, include canonical generation logic, and update sitemap coverage.

## Agent behavior

- Prioritize production routes and highest-traffic entry points first.
- Delegate framework metadata primitives to official Expo guidance, then enforce MDS standards for canonical/indexing completeness.
