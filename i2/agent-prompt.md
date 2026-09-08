# MDS Coordinator Skill Improvement — Session Handoff

## Goal

Review and improve the repository's MDS coordinator skill so it gives clear,
portable, evidence-based guidance for roadmap sequencing, worktrees, agents,
validation, and GitHub pull requests.

## Authoritative files

- Skill under review:
  `F:\SoftwareDev\mrdj-dev-suite-i2Workspace\mrdj-dev-suite-improve-mds-coordinator-skill\.cline\skills\mds-coordinator\SKILL.md`
- Skill metadata:
  `F:\SoftwareDev\mrdj-dev-suite-i2Workspace\mrdj-dev-suite-improve-mds-coordinator-skill\.cline\skills\mds-coordinator\metadata.json`
- Roadmap/control files are context only. Do not edit the sibling control
  repository or any product `project/todo.md` while improving this skill.

## Scope and boundaries

- Work only in this worktree.
- Keep `i2/agent-prompt.md` tracked as the historical handoff for this branch.
- Improve instructions, examples, and metadata only; do not change runtime
  code, CLI behavior, package versions, licensing, or generated bundles.
- Preserve the safety rules: verify Git/GitHub facts directly, never infer
  completion from worker claims, require explicit merge authorization, and do
  not delete worktrees or files without an exact authorized target.
- Do not merge, push, publish, or create a pull request.

## Review questions

- Are the classification, scope, and merge-boundary rules unambiguous?
- Are worktree, branch, PR, and roadmap instructions consistent with current
  MDS behavior and usable by Cline without hidden Codex-only assumptions?
- Are destructive actions, dirty/zero-commit worktrees, stale branches, and
  line-ending noise handled safely?
- Is the model-tier guidance proportional and understandable?
- Remove duplicated, contradictory, or obsolete wording without weakening
  required safeguards.

## Validation and handoff

Run:

    mds doctor --fast
    git diff --check
    git status -sb
    git diff origin/main --stat

Report the exact sections changed, the rationale for each material change,
and the observed validation output. Do not claim completion without that
evidence. Do not merge the branch.
