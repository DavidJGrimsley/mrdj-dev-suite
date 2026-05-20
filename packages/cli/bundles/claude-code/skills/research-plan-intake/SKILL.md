---
description: Use when a user has partial product context (notes, research docs, or incomplete project memory) and needs it transformed into canonical MDS project memory.
---

# Skill: Research Plan Intake

Use when a user has partial product context (notes, research docs, or incomplete project memory) and needs it transformed into canonical MDS project memory.

## Main rule

Normalize fragmented input into decision-ready `project/info.md` and `project/style.md` structure without inventing missing product facts.

## Checks

- Parse provided artifacts and classify each required section as clear, ambiguous, or unknown.
- Reuse clear sections directly; ask focused follow-up only for ambiguous or missing high-impact decisions.
- Keep visual guidance in style memory and technical/process guidance in guidelines memory.
- Confirm resulting project memory aligns with current roadmap phase and target platforms.
- Record unresolved unknowns explicitly instead of guessing.

## Preferred structure

- Accept inputs from pasted markdown, notes, and prior project memory files.
- Map extracted content into canonical sections with concise normalization.
- Produce follow-up questions only where answers materially change implementation direction.

## Example fix

- Problem: User provides a long brainstorm doc with no clear MVP flow or audience.
- Fix: Extract known context, mark missing decision points, ask targeted follow-up, then generate canonical project memory sections.

## Agent behavior

- Preserve user intent and wording where it is already clear.
- Keep uncertainty visible and collaborative; do not fill strategic gaps with assumptions that can misdirect implementation.
- Treat this as an MDS-only project-memory skill: use official framework guidance only after product intent is clear, then record the MDS workflow context agents need.
