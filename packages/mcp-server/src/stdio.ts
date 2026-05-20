#!/usr/bin/env node
import { startStdioServer } from './index.js';

startStdioServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Fatal error in mr-djs-dev-suite MCP server:', message);
  process.exit(1);
});
