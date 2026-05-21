# StylistCheck Agent Instructions

The `project/` folder is the source of truth. Before changing behavior, architecture, styling, or roadmap details, read:

- `project/info.md`
- `project/todo.md`
- `project/style.md`
- `project/guidelines.md`

Expo Router routes belong in `src/app`. Platform layout mode: shared layouts.

If the user says `mds continue` or `MDS Continue`, first run `mds continue` from the app root if available. Use the MDS Continue brief to propose the next plan and wait for approval before editing files. If the command is unavailable, manually inspect markers, Doctor status, git status, and `project/todo.md` in that order.

Before any intake, planning, scaffolding, or phase work, scan every `project/` file for the marker `# TodoForContext(optional):`. If any are present, stop and tell the user to fill the section underneath OR delete the marker line to acknowledge they do not want to add that context. Only proceed when zero markers remain.

Then build from `project/todo.md` in phase order. Do not make changes that conflict with project memory. If the files are unclear or generic, update the project memory first or ask the user.
