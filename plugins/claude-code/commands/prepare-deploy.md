Prepare the current Expo project for deployment.

1. Call `get_skill` with `deployment` to load the MDS deployment readiness skill.
2. Apply all checks from the skill against the current project.
3. Call `doctor_scan_project` to catch any Doctor errors that would block a clean build.
4. Produce a deployment checklist:
   - Items already passing (green)
   - Items that need attention before shipping (red — fix these first)
   - Items that are optional but recommended (yellow)
5. Suggest the appropriate production serving mode for this project (EAS `npx expo serve`, Express `node server.js`, or dual-server) based on what you find in the project.
