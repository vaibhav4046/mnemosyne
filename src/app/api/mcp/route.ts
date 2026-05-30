import { NextRequest, NextResponse } from "next/server";
import { connect, listConnected, disconnect, callTool, isAllowedCommand } from "@/lib/mcp/client";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const CONFIG_PATH = path.join(process.cwd(), "data", "mcp.json");

async function loadConfigs() {
  try {
    const parsed = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
    const servers = Array.isArray(parsed?.servers)
      ? parsed.servers.filter((s: unknown) => s && typeof (s as { name?: unknown }).name === "string")
      : [];
    return { servers };
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
    | { action: "remove"; name: string }
    | { action: "connect"; name: string }
    | { action: "disconnect"; name: string }
    | { action: "call"; name: string; tool: string; args: Record<string, unknown> };

  const cfg = await loadConfigs();
  if (body.action === "add") {
    if (!body.server?.name || !body.server?.command) {
      return NextResponse.json({ error: "name and command required" }, { status: 400 });
    }
    if (typeof body.server.name !== "string" || body.server.name.length > 64 || !/^[\w .-]+$/.test(body.server.name)) {
      return NextResponse.json({ error: "invalid server name" }, { status: 400 });
    }
    if (!isAllowedCommand(body.server.command)) {
      return NextResponse.json(
        { error: `command not allowed: "${body.server.command}". Allowed launchers: npx, node, uvx, uv, python, python3, bunx, deno` },
        { status: 400 },
      );
    }
    const clean = {
      name: body.server.name,
      command: body.server.command,
      args: Array.isArray(body.server.args) ? body.server.args.filter((a) => typeof a === "string").slice(0, 64) : [],
    };
    cfg.servers = (cfg.servers || []).filter((s: { name: string }) => s.name !== clean.name);
    cfg.servers.push(clean);
    await saveConfigs(cfg);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "remove") {
    cfg.servers = (cfg.servers || []).filter((s: { name: string }) => s.name !== body.name);
    await saveConfigs(cfg);
    try { await disconnect(body.name); } catch {}
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
    if (typeof body.name !== "string" || typeof body.tool !== "string") {
      return NextResponse.json({ error: "name and tool required" }, { status: 400 });
    }
    try {
      const res = await callTool(body.name, body.tool, (body.args as Record<string, unknown>) || {});
      return NextResponse.json(res);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "call failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
