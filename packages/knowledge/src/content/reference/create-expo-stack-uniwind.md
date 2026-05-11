# create-expo-stack Uniwind Exploration

Source: https://github.com/roninoss/create-expo-stack

## Findings

- The project describes itself as an interactive CLI for `rn-new`.
- It already supports multiple styling choices, including NativeWind,
  Unistyles, StyleSheets, and Tamagui.
- The README describes a per-file template model: base files live in a base
  template folder, while optional package features live in package template
  folders and use EJS to patch shared files.

## Phase 1 Decision

A friendly upstream Uniwind contribution should stay small:

- add Uniwind as another styling option,
- follow the existing package-slice template convention,
- include `web` in Expo Router generated `app.json` platforms when web config
  and dependencies are generated,
- add focused Software Mansion core package options where they are not already
  covered,
- avoid MrDJ project memory files, MCP config, agent prompts, or richer
  boilerplate,
- keep the deeper post-create setup in `mrdj onboard` and
  `create-expo-super-stack`.

No local Phase 1 code should depend on the upstream fork or PR existing.
