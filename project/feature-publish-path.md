# Feature to npm Publish Path

Use this path when adding a feature to a publishable package in this monorepo.

## Release Model

This repository uses:

- pnpm workspaces
- Changesets for release notes and version selection
- GitHub Actions for release orchestration
- npm trusted publishing through GitHub Actions OIDC
- Stable npm releases only; feature PRs are not published automatically to `next`

There is no `NPM_TOKEN` in the release process.

The complete flow is:

```text
feature branch -> feature PR -> merge to main
-> automated Version Packages PR -> merge release PR -> npm publish
```

## 1. Start From Main

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/<feature-name>
pnpm install --frozen-lockfile
```

Use the package's actual scope and name in the branch name when practical. Examples:

```text
feat/component-library
fix/doctor-config-check
```

## 2. Implement and Test Locally

Make the feature and its tests in the appropriate package. During development, use focused checks first:

```powershell
pnpm --filter <package-name> type-check
pnpm --filter <package-name> lint
pnpm --filter <package-name> test
pnpm --filter <package-name> build
```

Before opening the PR, run the repository checks:

```powershell
pnpm check:publish-manifests
pnpm ci:repo
mds doctor --fast
```

`pnpm ci:repo` runs type checking, linting, builds, and tests for the publishable packages.

## 3. Add a Changeset

If the feature changes a public package, run:

```powershell
pnpm changeset
```

Select every publishable package whose public behavior or contents changed. Then choose the release type:

- `patch`: bug fixes, small corrections, or non-feature maintenance
- `minor`: new backwards-compatible functionality
- `major`: breaking API or behavior changes

For a new backwards-compatible feature called `component library` in `@mr.dj2u/cli`, choose `minor` and use a summary such as:

```text
Add component library support.
```

Changesets creates a file similar to:

```md
---
"@mr.dj2u/cli": minor
---

Add component library support.
```

The changeset is a release instruction. It does not change package versions and does not publish to npm. If the command is canceled before completion, no changeset is created.

If no publishable package changed, do not add a changeset.

## 4. Commit and Open the Feature PR

Review the files before staging. Do not accidentally include unrelated local work.

```powershell
git status
git diff --stat
```

Stage the feature files and the generated changeset explicitly:

```powershell
git add <feature-files> .changeset/<generated-name>.md
git diff --cached --check
git commit -m "feat(<package>): add component library"
git push -u origin feat/<feature-name>
```

Open a PR against `main`. The PR's `Packages CI` and `Doctor (smoke)` checks validate the change. Opening or merging this feature PR does not publish to npm.

## 5. Merge the Feature PR

When the feature PR merges into `main`, the `Release` workflow sees the changeset and creates or updates a bot PR named similar to:

```text
chore(release): version packages
```

That release PR is the review point for the actual version changes. Changesets will:

- Update package versions
- Create or update package changelogs
- Update internal package dependency ranges when needed
- Update `pnpm-lock.yaml`
- Delete the consumed changeset file

Do not manually edit those generated release files.

The release workflow uses a GitHub App installation token instead of the built-in `GITHUB_TOKEN` so GitHub does not pause the auto-created release PR for manual workflow approval. In this repo, that token is generated from `vars.RELEASE_BOT_APP_CLIENT_ID` and `secrets.RELEASE_BOT_APP_PRIVATE_KEY`, and the GitHub App must be installed on this repository with access to the public packages it publishes.

## 6. Review and Merge the Release PR

Review the generated versions and changelog text. Confirm that the intended package is included and that the bump type is correct. Then merge the release PR.

Merging the release PR triggers the `Release` workflow again. With no pending changesets, the workflow runs:

```powershell
pnpm run publish:mds
```

The workflow authenticates to npm using the GitHub Actions OIDC identity and the trusted publisher connection configured for each npm package. It publishes only package versions that do not already exist on npm, then creates Git tags for the published versions.

## 7. Verify the npm Release

Check the published version directly from the npm registry:

```powershell
npm view <package-name> version
npm view <package-name> dist-tags --json
```

The expected stable release should appear as the `latest` dist-tag.

## Version Examples

For a package currently at `0.1.26`:

```text
patch -> 0.1.27
minor -> 0.2.0
major -> 1.0.0
```

Choose the bump based on the public API impact, not on how large the code diff is.

## New Public Package Checklist

When adding a brand-new publishable package instead of changing an existing one:

1. Add its package manifest and workspace files.
2. Add a changeset for the new public package.
3. Run `pnpm install` so the lockfile is current.
4. Run `pnpm check:publish-manifests` and `pnpm ci:repo`.
5. Confirm CI already sees the new package:
   - The package is under `packages/*`, so it is included by `pnpm-workspace.yaml`.
   - The package has the expected package scripts (`build`, `type-check`, `lint`, `test`, and `prepack` when it ships files).
   - `pnpm ci:repo` includes the package in Turbo's package scope.
6. Bootstrap the npm registry entry if this package has never been published.
7. Configure a separate npm trusted publisher entry for the new package using:
   - Publisher: GitHub Actions
   - Organization/user: `davidjgrimsley`
   - Repository: `mrdj-dev-suite`
   - Workflow filename: `release.yml`
   - Allowed action: `Allow npm publish`

### New Package Bootstrap When CI Already Exists

Use this subsection when release CI and trusted publishing already exist for the repo, but a new workspace package has just been added. Existing package trusted-publisher settings do not automatically apply to the new package; npm trusted publishing is configured per package.

First verify whether the package exists:

```powershell
npm view '<package-name>' version
```

If npm returns `E404`, the package does not exist yet. Because npm trusted publishers are configured from a package's npm settings page, create the package once with a targeted manual first publish:

```powershell
npm whoami
pnpm --filter '<package-name>' build
pnpm --filter '<package-name>' test
npm pack --dry-run --json .\packages\<package-directory>
Push-Location .\packages\<package-directory>
npm publish --access public --tag bootstrap
Pop-Location
```

Only run the targeted `npm publish` from the new package directory. Use the `bootstrap` dist-tag for this first registry entry so the placeholder `0.0.0` version does not become the package's `latest` release. Do not run `pnpm run publish:mds` locally; that would publish every unpublished changed package and bypass the normal release workflow.

After the first publish, configure trusted publishing for that package on npm:

1. Open `https://www.npmjs.com/package/<package-name>/access`.
2. Add a GitHub Actions trusted publisher:
   - Organization/user: `davidjgrimsley`
   - Repository: `mrdj-dev-suite`
   - Workflow filename: `release.yml`
   - Allowed action: `npm publish`
3. Keep the feature changeset in the branch. The normal feature PR and release PR flow will publish the intended release version through GitHub Actions after the release PR merges.

For example, when adding `@mr.dj2u/library-registry`, the one-time bootstrap command is:

```powershell
Push-Location .\packages\library-registry
npm publish --access public --tag bootstrap
Pop-Location
```

Then add the trusted publisher for `@mr.dj2u/library-registry` before merging the generated release PR. The release PR should publish the bumped version through CI with provenance.

## Agent Guardrails

When an agent is asked to publish a feature:

- Inspect the affected package before choosing the changeset.
- Add a changeset for every affected public package.
- Do not manually bump package versions on the feature branch.
- Do not run `pnpm run publish:mds` locally as a substitute for the release workflow.
- Run `pnpm check:publish-manifests`, `pnpm ci:repo`, and `mds doctor --fast` before committing.
- Stage only files belonging to the feature; preserve unrelated worktree changes.
- Explain that npm publishing happens only after the automated release PR is merged.
- If a release workflow fails, inspect the failed step before retrying. A frozen-lockfile failure must be fixed before npm publishing can be attempted.
