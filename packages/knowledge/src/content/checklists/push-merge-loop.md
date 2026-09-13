# Push-Merge Loop Checklist

Use this checklist when running the PR loop into `test`.

1. Doctor CI pass: `mds doctor --ci`.
2. Stage intentional files only.
3. Create meaningful commit message.
4. Push branch.
5. Open/update PR to `test`.
6. Wait ~2 minutes before each evidence snapshot; never tight-loop GitHub.
7. Record the PR URL, base, and current `headRefOid`.
8. Collect required checks, reviews, top-level comments, and every paginated review thread with `gh api graphql`.
9. Inspect unresolved Copilot, Codex, human, and other bot feedback without filtering by author.
10. Classify findings as actionable/blocking, informational, resolved, or outdated, recording a reason for non-blocking classifications.
11. Fix actionable issues locally and rerun Doctor CI.
12. Push only after Doctor passes, then poll the new head again.
13. Count every evidence snapshot and stop after 5 total cycles.
14. Before readiness, take a fresh snapshot and confirm the head SHA did not change during collection.
15. Merge only when required checks are green, none are pending or unknown, and all blocking feedback is cleared.
16. On API/auth/pagination failure, unexpected head movement, or cycle-5 blockers, stop and report concrete remaining actions.

