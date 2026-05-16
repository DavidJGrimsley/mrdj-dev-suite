Continue development on the current Expo project by picking the next task from `project/todo.md`.

1. Call `get_skill` with `continue-development` to load the MDS continue-development skill.
2. Read `project/todo.md` to understand the current phase and task state.
3. Identify the next logical task following the skill's rules:
   - Finish any in-progress work in the current phase before moving on.
   - Only defer a task with an explicit note when the developer makes that choice.
4. Confirm the chosen task with the user before starting.
5. Begin the task, running `doctor_scan_project` before any commit.

$ARGUMENTS
