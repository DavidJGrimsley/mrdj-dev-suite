---
'@mr.dj2u/cli': patch
'@mr.dj2u/doctor': patch
---

Fix the remaining Node 24 `DEP0190` risk by switching shell-based command launches to explicit `spawn` command/argument vectors while preserving the current Expo startup and script execution behavior.
