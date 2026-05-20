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

Skills and prompt workflows are generated from the knowledge package. Do not edit generated copies by hand; update `packages/knowledge/src/content` or the generator scripts instead.
