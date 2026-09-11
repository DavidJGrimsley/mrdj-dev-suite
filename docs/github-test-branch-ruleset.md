# GitHub `test` Branch Ruleset

This repository includes a reusable GitHub Repository Rulesets API payload at
`.github/rulesets/test.json`. It protects a `test` integration branch while
allowing an automated, status-check-gated merge without requiring a human
approval.

## Policy

The preset applies only to `refs/heads/test` and:

- requires a pull request before changes reach `test`;
- requires the `Packages CI / packages` and `Doctor (smoke) / doctor` checks;
- requires zero approving reviews and does not require code-owner or last-push
  approval;
- blocks branch deletion and non-fast-forward updates; and
- defines no bypass actors.

The status-check entries omit `integration_id` so the payload remains
portable. GitHub treats that field as optional; if the repository requires a
provider-specific integration, keep the same contexts and add that ID to the
corresponding entries during import.

## One-time prerequisites

This preset assumes that the repository already has a `test` branch. Create it
from the current production base only after reviewing the repository's branch
policy:

```bash
git fetch origin main
git push origin origin/main:refs/heads/test
```

The repository must also allow pull-request auto-merge in **Settings → General
→ Pull Requests → Allow auto-merge**. That repository setting is separate from
the ruleset and is not enabled by this file.

## Apply with GitHub CLI

Run these commands from the repository root after replacing `OWNER/REPO` with
the target repository. Applying a ruleset changes GitHub repository settings;
this project does not run these commands automatically.

```bash
gh api --method POST repos/OWNER/REPO/rulesets \
  --input .github/rulesets/test.json
```

Verify the created ruleset by name and inspect its branch condition and rules:

```bash
gh api repos/OWNER/REPO/rulesets \
  --jq '.[] | select(.name == "MDS test branch (automated merge)")'
```

For an existing ruleset, use its returned `id` with `PATCH` and the same JSON
payload rather than creating a duplicate:

```bash
gh api --method PUT repos/OWNER/REPO/rulesets/RULESET_ID \
  --input .github/rulesets/test.json
```

The token needs permission to administer repository rulesets. A read-only
`gh api repos/OWNER/REPO/rulesets` request can confirm access before applying
anything.

## Apply in the GitHub UI

1. Open **Settings → Rules → Rulesets** and choose **New branch ruleset**.
2. Name it `MDS test branch (automated merge)` and set enforcement to
   **Active**.
3. Set the target to **Branches**, include `test`, and leave exclusions empty.
4. Enable **Require a pull request before merging**. Set required approvals to
   `0`; leave code-owner review, last-push approval, and required conversation
   resolution disabled.
5. Enable required status checks and add exactly:
   - `Packages CI / packages`
   - `Doctor (smoke) / doctor`
6. Enable the protections against branch deletion and force-push/non-fast-
   forward updates.
7. Leave bypass actors empty, review the summary, and save the ruleset.

The UI may display the checks with repository-specific metadata. Select the
checks whose workflow/job names match the contexts above.

## Verification checklist

After the `test` branch exists and the ruleset is applied, verify with a
throwaway feature branch that:

- a direct push to `test` is rejected;
- a pull request into `test` runs both required checks;
- a green pull request can be merged without an approving review; and
- a pull request into `main` remains governed by the repository's separate
  `main` ruleset.

No branch creation, ruleset activation, merge, or roadmap update is part of the
implementation of this preset.
