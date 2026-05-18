# MCP SDK Transport Pattern

Source pattern: `mds-app-mcp/src/index.ts`.

## Core Shape

- Create a high-level `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`.
- Register static markdown resources with stable `mds://` URIs.
- Register tools with schemas and handlers that return MCP text content.
- Register prompts for reusable agent workflows.
- Connect with `StdioServerTransport` for local agent use.
- Keep HTTP/SSE transport as a later hosting concern unless a client needs it.

## MDS Suite Decision

Phase 1 uses stdio as the production MCP transport because it works for local
Codex/Claude workflows and avoids server lifecycle complexity. The server
still exposes pure functions for tests and direct CLI verification:

- `createMrdjMcpServer()`
- `startStdioServer()`
- `listResources()`
- `readResource(uri)`
- `executeTool(name, input)`

## Resource Rule

MCP resources must be generated from `packages/knowledge`, not hand-copied into
`packages/mcp-server`.

