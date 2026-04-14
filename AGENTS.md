# AGENTS.md — Wozniak Tools MCP

> Instrukce pro AI agenty (GitHub Copilot, Claude, Cursor) jak nastavit a použít
> Wozniak Tools MCP server pro instalaci nástrojů Jakuba Wozniaka.

---

## Kdy použít tento návod

Uživatel říká například:
- „Nainstaluj mi Wozniakův DevOps Integrator"
- „Chci používat wozniak tools"
- „Nastav mi wozniak MCP"
- „Jak nainstaluji devops-integrator od Wozniaka?"

---

## Postup pro AI (krok za krokem)

### Krok 1 — Nastav MCP server (pokud ještě není)

Spusť tento příkaz za uživatele:

```bash
npx @wozniak90/tools setup
```

Skript automaticky:
- Detekuje nainstalované AI klienty (Claude Desktop, Cursor, VS Code)
- Přidá MCP konfiguraci do příslušných config souborů
- Vypíše instrukce pro restart

**Po spuštění řekni uživateli:**
> „Restartuj [název klienta] a pak se vrať — pak ti nástroj nainstaluju přímo přes MCP."

---

### Krok 2 — Po restartu klienta (MCP je aktivní)

Jakmile uživatel restartuje AI klienta, MCP server je dostupný.
Zavolej nástroje v tomto pořadí:

1. `check_prerequisites` — ověř Node.js, Git
2. Zeptej se uživatele: **„Kam chceš DevOps Integrator nainstalovat?"**
3. `install_tool` s `tool_id: "devops-integrator"` a `target_dir` od uživatele

---

## Pokud uživatel nemá žádný MCP klient

Nabídni manuální instalaci:

```bash
# 1. Klonuj repo
git clone https://github.com/Wozniak90/devops-integrator
cd devops-integrator

# 2. Instaluj závislosti
npm install

# 3. Spusť
node server.js
```

Pak otevři: **http://localhost:4242**

---

## Dostupné nástroje (po konfiguraci MCP)

| Nástroj | Popis |
|---|---|
| `list_tools` | Všechny dostupné nástroje |
| `get_tool_info` | Detail nástroje |
| `check_prerequisites` | Kontrola prerekvizit |
| `install_tool` | Instalace z GitHubu (ptá se na složku) |

---

## Konfigurace MCP (manuálně)

### Claude Desktop (`%APPDATA%\Claude\claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "wozniak-tools": {
      "command": "npx",
      "args": ["-y", "@wozniak90/tools"]
    }
  }
}
```

### Cursor (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "wozniak-tools": {
      "command": "npx",
      "args": ["-y", "@wozniak90/tools"]
    }
  }
}
```

### VS Code (`mcp.json` v User settings)

```json
{
  "mcpServers": {
    "wozniak-tools": {
      "command": "npx",
      "args": ["-y", "@wozniak90/tools"]
    }
  }
}
```

---

## Links

- npm: https://www.npmjs.com/package/@wozniak90/tools
- DevOps Integrator: https://github.com/Wozniak90/devops-integrator
