import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export type McpServerConfig = {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

type Conn = { client: Client; tools: { name: string; description?: string; inputSchema: unknown }[] };

const live = new Map<string, Conn>();

/**
 * Only these launchers may be spawned. Prevents arbitrary-binary RCE through a
 * crafted MCP config (e.g. command="powershell"). MCP servers in practice are
 * launched via a package runner or node.
 */
const ALLOWED_COMMANDS = new Set(["npx", "node", "uvx", "uv", "python", "python3", "bunx", "deno"]);

/** Env keys that must never be overridden by a server config (code-exec vectors). */
const PROTECTED_ENV = new Set(["PATH", "NODE_OPTIONS", "LD_PRELOAD", "LD_LIBRARY_PATH", "DYLD_INSERT_LIBRARIES"]);

export function isAllowedCommand(command: unknown): command is string {
  if (typeof command !== "string") return false;
  // strip path + extension → bare launcher name
  const base = command.replace(/\\/g, "/").split("/").pop() || command;
  const bare = base.replace(/\.(exe|cmd|bat)$/i, "").toLowerCase();
  return ALLOWED_COMMANDS.has(bare);
}

function safeEnv(extra?: Record<string, string>): Record<string, string> {
  const base = { ...process.env } as Record<string, string>;
  if (!extra) return base;
  for (const [k, v] of Object.entries(extra)) {
    if (PROTECTED_ENV.has(k.toUpperCase())) continue;
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    if (typeof v === "string") base[k] = v;
  }
  return base;
}

export async function connect(cfg: McpServerConfig): Promise<Conn> {
  if (live.has(cfg.name)) return live.get(cfg.name)!;
  if (!isAllowedCommand(cfg.command)) {
    throw new Error(`command not allowed: "${cfg.command}". Allowed: ${[...ALLOWED_COMMANDS].join(", ")}`);
  }
  const args = Array.isArray(cfg.args) ? cfg.args.filter((a) => typeof a === "string").slice(0, 64) : [];
  const transport = new StdioClientTransport({
    command: cfg.command,
    args,
    env: safeEnv(cfg.env),
  });
  const client = new Client({ name: `ownwiki-${cfg.name}`, version: "1.0.0" });
  await client.connect(transport);
  const toolList = await client.listTools();
  const conn: Conn = { client, tools: toolList.tools };
  live.set(cfg.name, conn);
  return conn;
}

export async function callTool(name: string, tool: string, args: Record<string, unknown>) {
  const conn = live.get(name);
  if (!conn) throw new Error(`Server not connected: ${name}`);
  return conn.client.callTool({ name: tool, arguments: args });
}

export function listConnected() {
  return [...live.entries()].map(([name, c]) => ({ name, tools: c.tools }));
}

export async function disconnect(name: string) {
  const conn = live.get(name);
  if (!conn) return;
  try {
    await conn.client.close();
  } catch {}
  live.delete(name);
}
