# Changesets

Add a changeset for any publishable package change:

```bash
pnpm changeset
```

`main` publishes through GitHub Actions using npm trusted publishing. The release workflow creates or updates a release PR, and merging that PR publishes the pending package versions to npm.
