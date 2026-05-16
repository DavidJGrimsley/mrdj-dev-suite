Turn raw research, notes, or ideas into canonical MDS project memory.

1. Call `get_skill` with `research-plan-intake` to load the MDS research plan intake skill.
2. Ask the user to paste their research notes, idea dump, or partial `project/info.md` sections.
3. Apply the skill to shape the input into the canonical sections of `project/info.md`:
   - Product vision and goals
   - Target users and core flows
   - Tech decisions and constraints
   - Deployment target
4. Present the shaped output for review before writing any files.
5. On confirmation, write (or merge into) `project/info.md`, preserving any existing Imported Notes section.

$ARGUMENTS
