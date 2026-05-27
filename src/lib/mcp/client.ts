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

export async function connect(cfg: McpServerConfig): Promise<Conn> {
  if (live.has(cfg.name)) return live.get(cfg.name)!;
  const transport = new StdioClientTransport({
    command: cfg.command,
    args: cfg.args || [],
    env: { ...process.env, ...(cfg.env || {}) } as Record<string, string>,
  });
  const client = new Client({ name: `mnemosyne-${cfg.name}`, version: "0.1.0" });
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
  await conn.client.close();
  live.delete(name);
}
