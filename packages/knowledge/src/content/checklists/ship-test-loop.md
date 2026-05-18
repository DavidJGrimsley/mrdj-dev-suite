# Ship-Test Loop Checklist

Use this checklist when running the PR loop into `test`.

1. Doctor CI pass: `mds doctor --ci`.
2. Stage intentional files only.
3. Create meaningful commit message.
4. Push branch.
5. Open/update PR to `test`.
6. Wait ~2 minutes before polling checks/comments.
7. Collect failed checks + review comments.
8. Fix issues locally.
9. Rerun Doctor CI.
10. Push and poll again.
11. Repeat up to 5 cycles.
12. Merge only when checks are green and blockers are cleared.
