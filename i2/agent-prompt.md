# MPL-2.0 Open-Source Foundation — Session Handoff

## Goal

Prepare the current MDS monorepo for an MPL-2.0 public-source release while
preserving all third-party licensing and keeping future i2 commercial and
governance decisions explicit.

## Scope and boundaries

- Work only in this worktree:
  `F:\SoftwareDev\mrdj-dev-suite-i2Workspace\mrdj-dev-suite-license-mpl`.
- Do not modify the separate `F:\SoftwareDev\mrdj-dev-suite-i2Workspace\project`
  repository or any other worktree.
- Do not merge, publish packages, change versions, or create a pull request.
- Preserve all existing third-party notices and their MIT license texts.
- Do not add an automated DCO CI gate. DCO enforcement is documented and
  reviewer-managed for now.

## Required changes

1. Add the unmodified MPL-2.0 text at root `LICENSE` and `DCO` with the
   standard Developer Certificate of Origin 1.1 text.
2. Set the root `package.json` and each publishable package manifest to
   `"license": "MPL-2.0"`; retain root `"private": true`.
3. Put an MPL-2.0 `LICENSE` in every publishable package: `cli`,
   `create-expo-super-stack`, `doctor`, `knowledge`, `library-registry`, and
   `mcp-server`. Replace the registry's first-party MIT license.
4. Update `packages/library-registry/THIRD_PARTY_NOTICES.md` to identify
   MDS-authored assets as MPL-2.0 while retaining the upstream Expo and
   create-expo-stack MIT notices unchanged.
5. Add a concise `README.md` license section and update `CONTRIBUTING.md` to
   require `git commit -s` / `Signed-off-by:` for contributions, referring to
   `DCO`.
6. Add an open-core boundary to `project/info.md`: current MDS is MPL-2.0;
   intended local IDE/runtime/SDK/plugin formats are open; hosted systems,
   private data, commercial operations, and official branding are separate;
   copyright ownership, trademark policy, nonprofit structure, and future
   per-repository i2 licenses remain decisions.
7. Append unchecked tasks, without modifying existing task text, as new
   `Phase 13` and `Phase 20` sections at the end of `project/todo.md`. Track
   the current MPL/DCO release in Phase 13 and the future licensing map,
   trademark, ownership, marketplace, and contribution-governance decisions
   in Phase 20.

## Validation and handoff

Run `mds doctor --fast`, `pnpm type-check`, `pnpm lint`, `pnpm test`,
`pnpm build`, and `git diff --check`. Also verify every publishable package
declares `MPL-2.0` and has a `LICENSE` file. Report commands and observed
results, then show `git status -sb` and the direct diff/stat against `main`.
Do not claim completion without that evidence.
