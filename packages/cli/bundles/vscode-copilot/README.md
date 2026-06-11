# Mr. DJ's Dev Suite VS Code Copilot Bundle

This bundle is generated from `packages/knowledge` and targets native VS Code Copilot customization surfaces:

- `.vscode/mcp.json` for the MDS MCP server.
- `.vscode/settings.json` for Copilot customization discovery settings.
- `.github/copilot-instructions.md` for workspace instructions.
- `.github/agents/mds.agent.md` for a custom Copilot agent.
- `.github/prompts/*.prompt.md` for reusable prompt workflows.
- `.github/skills/*/SKILL.md` for generated MDS skills.

## Project Install

```bash
mds agent install --client vscode --scope project --target .
```

## User Install

```bash
mds agent install --client vscode --scope user
```

User-scope setup copies the generated assets into `~/.copilot` and uses VS Code's `code --add-mcp` flow for the MCP server when the `code` command is available. If it is not available, the CLI prints the exact manual command.

## Verify

```bash
mds agent verify --client vscode --target .
```

If VS Code Copilot keeps using stale workflow text after reinstall:

1. Re-run the installer for the scope you want:
   - `mds agent install --client vscode --scope project --target .`
   - or `mds agent install --client vscode --scope user`
2. Re-run verify:
   - `mds agent verify --client vscode --scope project --target .`
   - or `mds agent verify --client vscode --scope user`
3. Restart VS Code so the prompt and MCP config refresh.
4. If it still looks stale, delete the generated MDS copies for that scope and reinstall:
   - project scope: `.github/prompts/create-expo-super-stack.prompt.md`, `.github/agents/mds.agent.md`, and related generated MDS files
   - user scope: `~/.copilot/prompts`, `~/.copilot/agents`, and `~/.copilot/skills/workflow-*` MDS copies
5. After restart, call `mds_runtime_versions` from the host surface to confirm which runtime is active.

Skills and prompt workflows are generated from the knowledge package. Do not edit generated copies by hand; update `packages/knowledge/src/content` or the generator scripts instead.
