# StylistCheck Release Flow

## Test-To-Main Safeguards

- Build features on short-lived feature branches.
- Open pull requests into `test` first.
- Require the `MDS PR Checks` workflow to pass before merging into `test`.
- Smoke test the app from `test` with staging data and staging Supabase keys when Supabase is used.
- Promote from `test` to `main` only after validation.
- Protect `main` so direct pushes are blocked and PR checks are required.

## Supabase Environments

- Local dummy data is the starting point.
- When Supabase is introduced, create separate test/staging and production projects before wiring production data.

## GitHub Setup The User Still Needs To Do

- Create `test` and `main` branches.
- In GitHub branch protection, require pull requests and status checks for `test` and `main`.
- Require the generated `MDS PR Checks` workflow before merge.
