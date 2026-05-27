import { NextRequest, NextResponse } from "next/server";
import { connect, listConnected, disconnect, callTool } from "@/lib/mcp/client";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const CONFIG_PATH = path.join(process.cwd(), "data", "mcp.json");

async function loadConfigs() {
  try {
    return JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  } catch {
    return { servers: [] };
  }
}

async function saveConfigs(cfg: unknown) {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

export async function GET() {
  const cfg = await loadConfigs();
  return NextResponse.json({ configs: cfg.servers, connected: listConnected() });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as
    | { action: "add"; server: { name: string; command: string; args?: string[] } }
    | { action: "connect"; name: string }
    | { action: "disconnect"; name: string }
    | { action: "call"; name: string; tool: string; args: Record<string, unknown> };

  const cfg = await loadConfigs();
  if (body.action === "add") {
    cfg.servers = (cfg.servers || []).filter((s: { name: string }) => s.name !== body.server.name);
    cfg.servers.push(body.server);
    await saveConfigs(cfg);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "connect") {
    const server = cfg.servers.find((s: { name: string }) => s.name === body.name);
    if (!server) return NextResponse.json({ error: "not configured" }, { status: 404 });
    try {
      const conn = await connect(server);
      return NextResponse.json({ tools: conn.tools });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "connect failed" }, { status: 500 });
    }
  }
  if (body.action === "disconnect") {
    await disconnect(body.name);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "call") {
    const res = await callTool(body.name, body.tool, body.args);
    return NextResponse.json(res);
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
