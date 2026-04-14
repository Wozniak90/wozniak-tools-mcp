#!/usr/bin/env node
/**
 * @wozniak90/tools setup
 *
 * Automaticky nakonfiguruje MCP server do detekovaných AI klientů:
 *   - Claude Desktop
 *   - Cursor
 *   - VS Code (Copilot)
 *
 * Spuštění: npx @wozniak90/tools setup
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

const MCP_ENTRY = {
  command: "npx",
  args: ["-y", "@wozniak90/tools"],
};

const SERVER_KEY = "wozniak-tools";

// ─── Pomocné funkce ────────────────────────────────────────────────────────────

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function writeJson(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n", "utf-8");
}

function mergeServer(config, serverKey, entry) {
  // Různé AI klienti mají různou strukturu
  if (!config.mcpServers) config.mcpServers = {};
  if (config.mcpServers[serverKey]) {
    return false; // Already configured
  }
  config.mcpServers[serverKey] = entry;
  return true;
}

// ─── Claude Desktop ────────────────────────────────────────────────────────────

function getClaudeConfigPath() {
  switch (process.platform) {
    case "win32":
      return join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json");
    case "darwin":
      return join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
    default:
      return join(homedir(), ".config", "Claude", "claude_desktop_config.json");
  }
}

function setupClaude() {
  const configPath = getClaudeConfigPath();
  const appDir = dirname(configPath);

  // Detekce zda je Claude nainstalován (složka existuje nebo config existuje)
  const installed = existsSync(appDir) || existsSync(configPath);
  if (!installed) {
    return { status: "not_found", client: "Claude Desktop" };
  }

  const config = readJson(configPath) || {};
  const added = mergeServer(config, SERVER_KEY, MCP_ENTRY);

  if (!added) {
    return { status: "already_configured", client: "Claude Desktop", path: configPath };
  }

  writeJson(configPath, config);
  return { status: "configured", client: "Claude Desktop", path: configPath };
}

// ─── Cursor ────────────────────────────────────────────────────────────────────

function getCursorConfigPath() {
  // Cursor ukládá MCP config do ~/.cursor/mcp.json
  return join(homedir(), ".cursor", "mcp.json");
}

function setupCursor() {
  const configPath = getCursorConfigPath();
  const cursorDir = join(homedir(), ".cursor");

  const installed = existsSync(cursorDir);
  if (!installed) {
    return { status: "not_found", client: "Cursor" };
  }

  const config = readJson(configPath) || {};
  const added = mergeServer(config, SERVER_KEY, MCP_ENTRY);

  if (!added) {
    return { status: "already_configured", client: "Cursor", path: configPath };
  }

  writeJson(configPath, config);
  return { status: "configured", client: "Cursor", path: configPath };
}

// ─── VS Code (GitHub Copilot) ──────────────────────────────────────────────────

function getVSCodeMcpPath() {
  // VS Code 1.99+ podporuje MCP přes settings nebo .vscode/mcp.json
  // Globální user settings
  switch (process.platform) {
    case "win32":
      return join(process.env.APPDATA || "", "Code", "User", "mcp.json");
    case "darwin":
      return join(homedir(), "Library", "Application Support", "Code", "User", "mcp.json");
    default:
      return join(homedir(), ".config", "Code", "User", "mcp.json");
  }
}

function setupVSCode() {
  const settingsDir = dirname(getVSCodeMcpPath());
  const configPath = getVSCodeMcpPath();

  const installed = existsSync(settingsDir);
  if (!installed) {
    return { status: "not_found", client: "VS Code" };
  }

  const config = readJson(configPath) || {};
  const added = mergeServer(config, SERVER_KEY, MCP_ENTRY);

  if (!added) {
    return { status: "already_configured", client: "VS Code", path: configPath };
  }

  writeJson(configPath, config);
  return { status: "configured", client: "VS Code", path: configPath };
}

// ─── Hlavní funkce ─────────────────────────────────────────────────────────────

function printResult(result) {
  switch (result.status) {
    case "configured":
      console.log(`  ✅ ${result.client} — nakonfigurováno`);
      console.log(`     Soubor: ${result.path}`);
      break;
    case "already_configured":
      console.log(`  ℹ️  ${result.client} — již nakonfigurováno (přeskočeno)`);
      break;
    case "not_found":
      console.log(`  ⬜ ${result.client} — nenalezeno (není nainstalováno)`);
      break;
  }
}

function main() {
  console.log("");
  console.log("🔧 Wozniak Tools — Setup MCP serveru");
  console.log("═".repeat(45));
  console.log("");
  console.log("Konfiguruji @wozniak90/tools do AI klientů...");
  console.log("");

  const results = [setupClaude(), setupCursor(), setupVSCode()];
  results.forEach(printResult);

  const configured = results.filter((r) => r.status === "configured");
  const alreadyDone = results.filter((r) => r.status === "already_configured");
  const notFound = results.filter((r) => r.status === "not_found");

  console.log("");

  if (configured.length === 0 && alreadyDone.length === 0) {
    console.log("⚠️  Žádný AI klient nenalezen.");
    console.log("");
    console.log("Nainstaluj jeden z podporovaných klientů:");
    console.log("  • Claude Desktop — https://claude.ai/download");
    console.log("  • Cursor         — https://cursor.sh");
    console.log("  • VS Code        — https://code.visualstudio.com");
    console.log("");
    console.log("Pak znovu spusť: npx @wozniak90/tools setup");
    return;
  }

  if (configured.length > 0) {
    console.log("═".repeat(45));
    console.log("");
    console.log("✅ MCP server nakonfigurován!");
    console.log("");
    console.log("📌 Co teď udělat:");
    configured.forEach((r) => {
      console.log(`   1. Restartuj ${r.client}`);
    });
    console.log("   2. Řekni AI: \"Nainstaluj mi Wozniakův DevOps Integrator\"");
    console.log("");
    console.log("AI se tě zeptá, kam chceš nástroj nainstalovat,");
    console.log("a pak ho stáhne z GitHubu a nainstaluje za tebe.");
  } else {
    console.log("═".repeat(45));
    console.log("ℹ️  Vše bylo již nakonfigurováno dříve.");
    console.log("   Restartuj své AI klienty pokud MCP ještě nefunguje.");
  }

  console.log("");
}

main();
