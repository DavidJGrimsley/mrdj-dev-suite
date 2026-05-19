# Reference Repo Evacuation

Phase 1 captured the useful patterns from the temporary multi-root workspace so
`mds-dev-suite` can run from a clean single-folder workspace.

## Captured Sources

| Source repo | Captured knowledge | Suite destination |
| --- | --- | --- |
| `mds-app-mcp` | MCP SDK server construction, stdio transport, resource registration, prompt registration, and guide loading pattern. | `reference/mcp-sdk-transport.md`, MCP server implementation |
| `mds-pokemon-mcp` | MCP family naming and guide/resource convention. | Knowledge resource URI rules |
| `mds-fne-mcp` | MCP family naming and tool/resource split. | Knowledge resource URI rules |
| `time2pay` | Uniwind setup, CI-equivalent checks, env handling, Expo deployment shape, Doctor dogfood target. | Patterns, Doctor fixtures, `reference/doctor-dogfood.md` |
| `DJsPortfolio` | API route proxy patterns, Drizzle schema examples, docs organization, route structure, Doctor dogfood target. | API/database/project patterns |
| `PokePages` | Dynamic route hierarchies, Zustand stores, Drizzle migrations, Doctor dogfood target. | Routing/state/database patterns |
| `not-hot-dog` | Small app route structure and docs memory convention. | Project/routing patterns |
| `expo-super-template` | Post-create defaults, Uniwind Metro/global CSS setup, onboarding target shape, Doctor dogfood target. | Styling/onboarding guides |
| `core-monorepo` | Turborepo package layout, shared package exports, package-manager detection, Doctor dogfood target. | Project/deployment patterns |
| `mercury-bank-sdk` | Library package export fields, npm workspace scripts, build/test/typecheck workflow. | Project/library and package CI patterns |
| `ads-sdk` | Small TypeScript SDK package shape and publish build workflow. | Package/CI reference notes |
| `quantum-api` | Dual ESM/CJS SDK build pattern and generated package metadata workflow. | Package/CI reference notes |

## Evacuation Rules

- Keep repo names and relative file paths as source notes; do not depend on
  machine-specific absolute paths.
- Keep reference repos read-only during harvest.
- Delete `temp/` clones after their patterns are promoted or intentionally
  discarded.
- A new engineer should be able to open only `mds-dev-suite` and still access
  all Phase 1 knowledge through `packages/knowledge`.
