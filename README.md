# Wozniak Tools — MCP Server

> Model Context Protocol server pro instalaci nástrojů Jakuba Wozniaka.  
> Přidej do svého AI klienta a pak stačí říct „nainstaluj DevOps Integrator".

---

## 🚀 Dostupné nástroje

| Nástroj | Popis | Port |
|---|---|---|
| **DevOps Integrator** | Přehled Azure DevOps work itemů — lokálně, bez cloudu | 4242 |

---

## ⚡ Přidání do AI klienta

### Claude Desktop
Přidej do `claude_desktop_config.json` (nebo v Settings → Integrations):

```json
{
  "mcpServers": {
    "wozniak-tools": {
      "command": "npx",
      "args": ["-y", "@wozniak/tools"]
    }
  }
}
```

### Cursor
Přidej do `.cursor/mcp.json` v projektu nebo do globálního nastavení:

```json
{
  "mcpServers": {
    "wozniak-tools": {
      "command": "npx",
      "args": ["-y", "@wozniak/tools"]
    }
  }
}
```

### GitHub Copilot CLI
Přidej do `~/.copilot/mcp-servers.json`:

```json
{
  "wozniak-tools": {
    "command": "npx",
    "args": ["-y", "@wozniak/tools"]
  }
}
```

### Smithery (jednoduchá instalace)
```bash
npx -y @smithery/cli install @wozniak/tools --client claude
```

---

## 💬 Příklady použití

Po přidání do AI klienta stačí napsat:

```
Nainstaluj Wozniakův DevOps Integrator do složky C:\Tools
```
```
Jaké nástroje má Wozniak dostupné?
```
```
Zkontroluj prerekvizity pro Email Agent
```
```
Nainstaluj email-agent
```

---

## 🛠️ Dostupné MCP funkce

| Funkce | Popis |
|---|---|
| `list_tools` | Zobrazí katalog všech dostupných nástrojů |
| `get_tool_info` | Detail nástroje: popis, requirements, port |
| `check_prerequisites` | Zkontroluje Node.js, Python, Git na tvém PC |
| `install_tool` | Naklonuje repo, `npm install`, volitelně `pip install` |

---

## 📋 Prerekvizity

- **Node.js 18+** — [nodejs.org](https://nodejs.org/en/download/)
- **Git** — [git-scm.com](https://git-scm.com/downloads)
- Pro Email Agent navíc: **Python 3.11+**, **Microsoft Outlook**

---

## 🏗️ Lokální spuštění (dev)

```bash
git clone https://github.com/Wozniak90/wozniak-tools-mcp
cd wozniak-tools-mcp
npm install
node index.js
```

---

## 📝 Přidání nového nástroje

Edituj `catalog.json` — přidej nový objekt do pole `tools`:

```json
{
  "id": "muj-nastroj",
  "name": "Můj Nástroj",
  "description": "Popis co dělá",
  "github": "https://github.com/Wozniak90/muj-nastroj",
  "requirements": { "node": ">=18", "os": ["windows", "macos", "linux"] },
  "port": 4244,
  "start_command": "node server.js",
  "tags": ["tag1", "tag2"]
}
```

---

## 🔗 Viz také

- [DevOps Integrator](https://github.com/Wozniak90/devops-integrator)
- [Model Context Protocol — Docs](https://modelcontextprotocol.io)
- [Smithery.ai — MCP Registry](https://smithery.ai)
