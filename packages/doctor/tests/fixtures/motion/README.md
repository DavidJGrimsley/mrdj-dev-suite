# Motion Fixtures

A fixture is a small, repeatable sample input used in tests.

In this folder, each fixture is a generic motion example that represents a
pattern MDS should reason about. They are intentionally anonymous and are not
tuned to any real app.

## Included Fixtures

- `marketing-hero-parallax.tsx`
  - Intended classification: parallax or scroll-linked motion
  - Expected Doctor behavior: warn when the scene is dense and undocumented
- `marketing-hero-parallax-noted.tsx`
  - Intended classification: parallax or scroll-linked motion
  - Expected Doctor behavior: pass when a nearby motion budget note exists
- `dense-animated-list.tsx`
  - Intended classification: list-heavy motion
  - Expected Doctor behavior: warn when many repeated animated rows are present
- `simple-route-fades.tsx`
  - Intended classification: one-shot transition
  - Expected Doctor behavior: pass
- `expanding-panel.tsx`
  - Intended classification: layout transition
  - Expected Doctor behavior: pass
- `draggable-sheet.tsx`
  - Intended classification: gesture-driven motion
  - Expected Doctor behavior: pass
- `branded-loader.tsx`
  - Intended classification: loading animation
  - Expected Doctor behavior: pass

## Why These Exist

- They give Doctor and MCP tests generic motion shapes to scan.
- They give plugin prompts a safe local smoke-test target.
- They help us test motion reasoning without favoring any one app or codebase.
