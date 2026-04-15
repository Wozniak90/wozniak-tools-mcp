#!/usr/bin/env node
/**
 * Wozniak Tools MCP Server
 *
 * Umožňuje AI asistentům (Claude, GitHub Copilot, Cursor, ...) instalovat
 * nástroje Jakuba Wozniaka přes Model Context Protocol.
 *
 * Dostupné nástroje (MCP tools):
 *   list_tools           – seznam všech dostupných nástrojů
 *   get_tool_info        – detail nástroje (popis, requirements, README)
 *   check_prerequisites  – zkontroluje, zda má uživatel vše potřebné
 *   install_tool         – nainstaluje nástroj (git clone + npm install)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync, exec } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname } from "path";

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Načti katalog nástrojů
const catalog = JSON.parse(readFileSync(join(__dirname, "catalog.json"), "utf-8"));

// --- Pomocné funkce ---

function getToolById(id) {
  return catalog.tools.find(
    (t) => t.id === id || t.name.toLowerCase().includes(id.toLowerCase())
  );
}

function checkCommand(cmd) {
  try {
    const version = execSync(`${cmd} --version 2>&1`, { encoding: "utf-8" }).trim();
    return { ok: true, version };
  } catch {
    return { ok: false, version: null };
  }
}

function isGitHubUrlConfigured(url) {
  return !url.includes("GITHUB_USERNAME");
}

// Parsuje verzi "v18.12.0" nebo "18.12.0" na číslo major
function parseMajorVersion(versionStr) {
  const match = versionStr?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// --- MCP Server ---

const server = new McpServer({
  name: "wozniak-tools",
  version: "1.0.0",
});

// ─── TOOL: list_tools ────────────────────────────────────────────────────────
server.tool(
  "list_tools",
  "Vrátí seznam všech dostupných nástrojů Jakuba Wozniaka s krátkým popisem.",
  {},
  async () => {
    const lines = catalog.tools.map((t) => {
      const reqs = Object.entries(t.requirements)
        .filter(([k]) => k !== "extras")
        .map(([k, v]) => `${k} ${v}`)
        .join(", ");
      return `• **${t.name}** (\`${t.id}\`)
  ${t.description}
  Requirements: ${reqs}
  Port: ${t.port} | Tags: ${t.tags.join(", ")}`;
    });

    return {
      content: [
        {
          type: "text",
          text: `# Wozniak Tools — dostupné nástroje\n\n${lines.join("\n\n")}

---
Pro instalaci použij \`install_tool\` s ID nástroje.
Pro detailní info použij \`get_tool_info\`.`,
        },
      ],
    };
  }
);

// ─── TOOL: get_tool_info ─────────────────────────────────────────────────────
server.tool(
  "get_tool_info",
  "Vrátí detailní informace o konkrétním nástroji včetně požadavků a odkazu na GitHub.",
  {
    tool_id: z
      .string()
      .describe(
        'ID nebo název nástroje (např. "devops-integrator" nebo "email-agent")'
      ),
  },
  async ({ tool_id }) => {
    const tool = getToolById(tool_id);
    if (!tool) {
      const ids = catalog.tools.map((t) => t.id).join(", ");
      return {
        content: [
          {
            type: "text",
            text: `❌ Nástroj "${tool_id}" nenalezen.\n\nDostupné nástroje: ${ids}`,
          },
        ],
      };
    }

    const extras = tool.requirements.extras
      ? `\nDalší požadavky:\n${tool.requirements.extras.map((e) => `  - ${e}`).join("\n")}`
      : "";

    const githubStatus = isGitHubUrlConfigured(tool.github)
      ? `🔗 GitHub: ${tool.github}`
      : `⚠️  GitHub URL není ještě nakonfigurováno — nástroj nebyl publikován na GitHub.`;

    return {
      content: [
        {
          type: "text",
          text: `# ${tool.name}

${tool.description}

## Požadavky
${Object.entries(tool.requirements)
  .filter(([k]) => k !== "extras")
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join("\n")}${extras}

## Spuštění
Po instalaci spusť: \`${tool.start_command}\`
Aplikace běží na: http://localhost:${tool.port}

## Tagy
${tool.tags.map((t) => `\`${t}\``).join(", ")}

${githubStatus}

---
Pro instalaci zavolej \`install_tool\` s id: "${tool.id}"`,
        },
      ],
    };
  }
);

// ─── TOOL: check_prerequisites ───────────────────────────────────────────────
server.tool(
  "check_prerequisites",
  "Zkontroluje, zda má uživatel nainstalované všechny prerekvizity pro daný nástroj (Node.js, Python, Git, ...).",
  {
    tool_id: z
      .string()
      .describe('ID nástroje (např. "devops-integrator" nebo "email-agent")'),
  },
  async ({ tool_id }) => {
    const tool = getToolById(tool_id);
    if (!tool) {
      return {
        content: [{ type: "text", text: `❌ Nástroj "${tool_id}" nenalezen.` }],
      };
    }

    const results = [];
    let allOk = true;

    // Node.js
    if (tool.requirements.node) {
      const node = checkCommand("node");
      const required = parseMajorVersion(tool.requirements.node);
      const actual = parseMajorVersion(node.version);
      const ok = node.ok && actual >= required;
      if (!ok) allOk = false;
      results.push(
        `${ok ? "✅" : "❌"} Node.js ${tool.requirements.node} — ${
          node.ok ? `nalezena verze ${node.version}` : "NENÍ nainstalován"
        }${!ok && node.ok ? ` (potřeba >= ${required})` : ""}`
      );
      if (!ok) {
        results.push(
          "   👉 Nainstaluj na: https://nodejs.org/en/download/"
        );
      }
    }

    // Python
    if (tool.requirements.python) {
      const py = checkCommand("python") || checkCommand("python3");
      const required = tool.requirements.python.replace(">=", "").trim();
      results.push(
        `${py.ok ? "✅" : "❌"} Python ${tool.requirements.python} — ${
          py.ok ? `nalezena verze ${py.version}` : "NENÍ nainstalován"
        }`
      );
      if (!py.ok) {
        results.push(
          "   👉 Nainstaluj na: https://python.org/downloads/"
        );
        allOk = false;
      }
    }

    // Git (vždy potřeba pro install_tool)
    const git = checkCommand("git");
    results.push(
      `${git.ok ? "✅" : "❌"} Git — ${
        git.ok ? `nalezena verze ${git.version}` : "NENÍ nainstalován"
      }`
    );
    if (!git.ok) {
      results.push("   👉 Nainstaluj na: https://git-scm.com/downloads");
      allOk = false;
    }

    // OS check
    if (
      tool.requirements.os &&
      !tool.requirements.os.includes("all")
    ) {
      const platform = process.platform;
      const platformMap = { win32: "windows", darwin: "macos", linux: "linux" };
      const current = platformMap[platform] || platform;
      const ok = tool.requirements.os.includes(current);
      if (!ok) allOk = false;
      results.push(
        `${ok ? "✅" : "❌"} OS: ${current} ${
          ok ? "(podporováno)" : `(nástroj podporuje pouze: ${tool.requirements.os.join(", ")})`
        }`
      );
    }

    // Extras (informační, neblokující)
    if (tool.requirements.extras) {
      results.push("");
      results.push("ℹ️  Další požadavky (nutné zkontrolovat ručně):");
      tool.requirements.extras.forEach((e) => results.push(`   • ${e}`));
    }

    return {
      content: [
        {
          type: "text",
          text: `# Kontrola prerekvizit: ${tool.name}\n\n${results.join("\n")}\n\n${
            allOk
              ? "✅ Vše v pořádku — můžeš spustit `install_tool`."
              : "❌ Nejprve nainstaluj chybějící prerekvizity."
          }`,
        },
      ],
    };
  }
);

// ─── TOOL: install_tool ───────────────────────────────────────────────────────
server.tool(
  "install_tool",
  `Nainstaluje nástroj z GitHubu: naklonuje repo, spustí npm install a vrátí instrukce ke spuštění.

DŮLEŽITÉ: Před zavoláním tohoto nástroje se vždy zeptej uživatele:
1. "Kam chceš nástroj nainstalovat?" (cílová složka, např. C:\\Tools\\devops-integrator)
2. Potvrd, že chce stáhnout z internetu (GitHub)

Nikdy nevolej tento nástroj bez potvrzeného target_dir od uživatele.`,
  {
    tool_id: z
      .string()
      .describe('ID nástroje (např. "devops-integrator")'),
    target_dir: z
      .string()
      .describe(
        'Cílová složka pro instalaci — POVINNÉ. Zeptej se uživatele, kam chce nástroj nainstalovat. Příklad: "C:\\\\Tools\\\\devops-integrator" nebo "~/tools/devops-integrator"'
      ),
  },
  async ({ tool_id, target_dir }) => {
    const tool = getToolById(tool_id);
    if (!tool) {
      const ids = catalog.tools.map((t) => t.id).join(", ");
      return {
        content: [
          {
            type: "text",
            text: `❌ Nástroj "${tool_id}" nenalezen.\n\nDostupné nástroje: ${ids}\n\nPro seznam nástrojů zavolej \`list_tools\`.`,
          },
        ],
      };
    }

    // Kontrola GitHub URL
    if (!isGitHubUrlConfigured(tool.github)) {
      return {
        content: [
          {
            type: "text",
            text: `⚠️  Nástroj "${tool.name}" zatím není publikován na GitHubu.

GitHub URL v katalogu obsahuje placeholder \`GITHUB_USERNAME\`.

**Co dělat:**
1. Jakub Wozniak musí pushout repo na GitHub
2. Aktualizovat \`catalog.json\` s reálnou URL
3. Pak bude instalace fungovat automaticky

**Mezitím** — pokud máš přístup k lokální kopii, spusť:
\`\`\`
cd <složka s nástrojem>
npm install
node server.js
\`\`\``,
          },
        ],
      };
    }

    // Určení cílové složky — target_dir je povinný
    const installDir = resolve(target_dir);

    // Kontrola, zda složka neexistuje nebo je prázdná
    if (existsSync(installDir)) {
      const contents = execSync(`dir "${installDir}" /b 2>&1 || ls "${installDir}" 2>&1`, {
        encoding: "utf-8",
        shell: true,
      }).trim();
      if (contents.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `⚠️  Složka již existuje a není prázdná: \`${installDir}\`

Pokud chceš přeinstalovat, nejprve složku smaž nebo zvol jiný \`target_dir\`.`,
            },
          ],
        };
      }
    }

    const steps = [];

    // Krok 1: git clone
    steps.push(`📥 Klonum repo z ${tool.github}...`);
    try {
      await execAsync(`git clone "${tool.github}" "${installDir}"`);
      steps.push(`✅ Repo naklonováno do: ${installDir}`);
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `❌ git clone selhal:\n\n${err.stderr || err.message}\n\nZkontroluj:\n- Internetové připojení\n- Zda je git nainstalován (\`git --version\`)\n- Zda je URL správná: ${tool.github}`,
          },
        ],
      };
    }

    // Krok 2: npm install
    steps.push(`\n📦 Instaluji npm závislosti...`);
    try {
      const { stdout } = await execAsync("npm install", { cwd: installDir });
      steps.push(`✅ npm install OK`);
    } catch (err) {
      steps.push(`❌ npm install selhal: ${err.stderr || err.message}`);
    }

    // Krok 3: pip install (pokud je potřeba)
    if (tool.requirements.python) {
      const requirementsPath = join(installDir, "agent", "requirements.txt");
      if (existsSync(requirementsPath)) {
        steps.push(`\n🐍 Instaluji Python závislosti...`);
        try {
          const pythonCmd = (() => {
            try { execSync("python --version 2>&1"); return "python"; }
            catch { return "python3"; }
          })();
          await execAsync(
            `${pythonCmd} -m pip install -r "${requirementsPath}"`,
            { cwd: installDir }
          );
          steps.push(`✅ pip install OK`);
        } catch (err) {
          steps.push(`⚠️  pip install selhal: ${err.message}`);
          steps.push(`   Spusť ručně: pip install -r agent/requirements.txt`);
        }
      }
    }

    const startCmd =
      process.platform === "win32"
        ? `cd "${installDir}" && start.bat`
        : `cd "${installDir}" && ./${tool.start_command.replace("node ", "").replace(".js", ".sh") || "start.sh"}`;

    return {
      content: [
        {
          type: "text",
          text: `# ✅ ${tool.name} nainstalován!

${steps.join("\n")}

## Jak spustit

\`\`\`
cd "${installDir}"
node server.js
\`\`\`

Nebo na Windows dvojklikem na \`start.bat\`.

Aplikace se otevře na: **http://localhost:${tool.port}**

## Další kroky
Při prvním spuštění tě průvodce provede nastavením (API tokeny, konfigurace).
Pro reset konfigurace smaž \`data/config.json\` nebo \`data/devops-config.json\`.`,
        },
      ],
    };
  }
);

// ─── query_devops tool ────────────────────────────────────────────────────────

const DEVOPS_BASE = process.env.DEVOPS_INTEGRATOR_URL || 'http://localhost:4242';

async function devopsCall(apiPath) {
  try {
    const res = await fetch(`${DEVOPS_BASE}${apiPath}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    if (e.cause?.code === 'ECONNREFUSED' || e.message?.includes('ECONNREFUSED')) {
      throw new Error('DevOps Integrator není spuštěn (http://localhost:4242).\nSpusť: npm start ve složce devops-integrator.');
    }
    throw e;
  }
}

server.tool(
  'query_devops',
  `Dotáže se na lokálně běžící DevOps Integrator (http://localhost:4242) a vrátí shrnutí work itemů.

Dostupné akce:
- summary       → pracovní přehled (počty dle projektu, priority, stale)
- assigned      → seznam přiřazených úkolů s priority score
- stale         → stagnující úkoly (nezměněné > 14 dní)
- standup       → automatický standup text pro dnešní den
- high_priority → top 10 položek s nejvyšším priority score

Vyžaduje běžící DevOps Integrator (node server.js nebo npm start).`,
  {
    action:  z.enum(['summary', 'assigned', 'stale', 'standup', 'high_priority'])
              .describe('Typ dotazu'),
    project: z.string().optional().describe('Filtr dle projektu (volitelné)')
  },
  async ({ action, project }) => {
    const data = await devopsCall('/api/devops/items');

    const filterProject = (items) =>
      project
        ? items.filter(i => i.project?.includes(project) || i.projectLabel?.includes(project))
        : items;

    const typeEmoji = (t) =>
      ({ Bug: '🐛', 'User Story': '📖', Task: '✅', Feature: '🚀', Epic: '🏔️' }[t] || '📌');

    const itemLine = (i) =>
      `- ${typeEmoji(i.type)} **${i.title}** [score: ${i.priorityScore ?? '?'}] | ${i.state} | ${i.projectLabel || i.project || '?'} | ${i.staleDays ?? '?'}d`;

    if (action === 'summary') {
      const items = filterProject(data.assigned || []);
      const byProj = {}, staleCount = items.filter(i => i.staleLevel === 'stale').length;
      for (const i of items) { const p = i.projectLabel || i.project || '?'; byProj[p] = (byProj[p] || 0) + 1; }
      const lines = [
        `## 📊 DevOps přehled\n`,
        `**Přiřazeno celkem:** ${items.length} | 🧊 Stale: ${staleCount}`,
        `\n**Dle projektu:**`,
        ...Object.entries(byProj).map(([p, n]) => `- ${p}: ${n}`)
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    if (action === 'assigned') {
      const items = filterProject(data.assigned || [])
        .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
        .slice(0, 20);
      if (!items.length) return { content: [{ type: 'text', text: 'Žádné přiřazené úkoly.' }] };
      const lines = [`## ✅ Přiřazené úkoly (${items.length})\n`, ...items.map(itemLine)];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    if (action === 'stale') {
      const items = filterProject([...(data.assigned || []), ...(data.following || [])])
        .filter((i, idx, arr) => arr.findIndex(x => x.id === i.id) === idx)
        .filter(i => i.staleLevel === 'stale' || i.staleLevel === 'warning')
        .sort((a, b) => (b.staleDays ?? 0) - (a.staleDays ?? 0));
      if (!items.length) return { content: [{ type: 'text', text: 'Žádné stagnující úkoly.' }] };
      const lines = [`## 🧊 Stagnující úkoly (${items.length})\n`, ...items.map(i => `${itemLine(i)} ← ${i.staleDays}d`)];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    if (action === 'high_priority') {
      const items = filterProject([...(data.assigned || []), ...(data.following || [])])
        .filter((i, idx, arr) => arr.findIndex(x => x.id === i.id) === idx)
        .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
        .slice(0, 10);
      if (!items.length) return { content: [{ type: 'text', text: 'Žádné položky.' }] };
      const lines = [`## 🔥 Top priority (${items.length})\n`, ...items.map(itemLine)];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    if (action === 'standup') {
      const since    = Date.now() - 86400000;
      const done     = (data.activity  || []).filter(i => new Date(i.changedDate) >= since);
      const todo     = filterProject(data.assigned || [])
        .filter(i => ['Active', 'In Progress', 'New'].includes(i.state))
        .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
        .slice(0, 6);
      const blocks   = filterProject(data.assigned || [])
        .filter(i => i.staleLevel === 'stale' || i.staleLevel === 'warning')
        .slice(0, 3);

      const lines = [
        `## 🗣️ Standup — ${new Date().toLocaleDateString('cs-CZ')}\n`,
        `### Včera`,
        ...( done.length ? done.map(i => `- ${typeEmoji(i.type)} ${i.title}`) : ['- Žádná aktivita'] ),
        `\n### Dnes`,
        ...( todo.length ? todo.map(i => `- ${typeEmoji(i.type)} ${i.title} [${i.priorityScore ?? '?'}]`) : ['- Nic naplánováno'] ),
        `\n### Bloky`,
        ...( blocks.length ? blocks.map(i => `- ⚠️ ${i.title} (${i.staleDays}d beze změny)`) : ['- Žádné bloky 🟢'] )
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  }
);

// ─── Start serveru ────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
