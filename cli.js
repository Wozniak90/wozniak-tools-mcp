#!/usr/bin/env node
/**
 * @wozniak90/tools CLI entry point
 *
 * npx @wozniak90/tools         → spustí MCP server
 * npx @wozniak90/tools setup   → spustí setup skript
 */

const arg = process.argv[2];

if (arg === "setup") {
  // Dynamically import setup.js and run it
  import("./setup.js").catch((err) => {
    console.error("Setup failed:", err.message);
    process.exit(1);
  });
} else {
  // Start MCP server
  import("./index.js").catch((err) => {
    console.error("MCP server failed:", err.message);
    process.exit(1);
  });
}
