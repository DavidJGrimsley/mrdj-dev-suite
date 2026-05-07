# Package And CI Patterns

Harvested from `core-monorepo`, `mercury-bank-sdk`, `ads-sdk`, and
`quantum-api`.

## Useful Patterns

- Root `ci` scripts should compose lint, typecheck, tests, and build in the
  same order expected by GitHub checks.
- Package managers differ by repo; Doctor should detect `packageManager` first,
  then lockfiles.
- SDK packages should expose `types`, ESM entry points, and clear build scripts.
- Dual ESM/CJS packages need explicit metadata generation for the CJS output
  folder instead of relying on package-manager magic.
- Monorepos should let root scripts fan out through Turbo or workspace commands,
  while leaf packages keep simple `build`, `typecheck`, and `test` scripts.

## Doctor Implications

- Missing `lint` or `typecheck` is a warning for local repos.
- Broken script file targets are errors.
- `--ci` should run available checks, not assume every repo has the same script
  names.

