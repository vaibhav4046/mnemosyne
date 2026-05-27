"use client";
import { useEffect, useState } from "react";
import { Plug, Plus, Power, RefreshCcw, Trash2 } from "lucide-react";

type ServerCfg = { name: string; command: string; args?: string[] };
type Conn = { name: string; tools: { name: string; description?: string }[] };

export function McpPanel() {
  const [configs, setConfigs] = useState<ServerCfg[]>([]);
  const [connected, setConnected] = useState<Conn[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", command: "", args: "" });

  async function load() {
    const r = await fetch("/api/mcp");
    const d = await r.json();
    setConfigs(d.configs);
    setConnected(d.connected);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    await fetch("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        server: { name: form.name, command: form.command, args: form.args.split(" ").filter(Boolean) },
      }),
    });
    setAdding(false);
    setForm({ name: "", command: "", args: "" });
    load();
  }

  async function connect(name: string) {
    await fetch("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect", name }),
    });
    load();
  }

  async function disconnect(name: string) {
    await fetch("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect", name }),
    });
    load();
  }

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="h-12 px-5 flex items-center justify-between border-b border-[var(--border)] glass">
        <div className="flex items-center gap-2.5">
          <Plug size={15} className="text-[var(--accent)]" />
          <span className="font-medium text-[14px]">MCP Servers</span>
          <span className="text-[11px] text-[var(--text-faint)]">· Model Context Protocol</span>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost btn">
            <RefreshCcw size={13} />
          </button>
          <button onClick={() => setAdding(true)} className="btn btn-primary">
            <Plus size={13} /> add server
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin p-6">
        {adding && (
          <div className="glass-strong rounded-xl p-4 mb-5 space-y-2 max-w-xl">
            <div className="text-[13px] font-medium mb-2">Add MCP server</div>
            <input className="input text-[13px]" placeholder="name (e.g. filesystem)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input text-[13px]" placeholder="command (e.g. npx)" value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} />
            <input className="input text-[13px]" placeholder="args (space-separated, e.g. -y @modelcontextprotocol/server-filesystem ~/Desktop)" value={form.args} onChange={(e) => setForm({ ...form, args: e.target.value })} />
            <div className="flex gap-2 pt-1">
              <button onClick={add} className="btn btn-primary">save</button>
              <button onClick={() => setAdding(false)} className="btn">cancel</button>
            </div>
          </div>
        )}

        {configs.length === 0 ? (
          <div className="text-center text-[var(--text-faint)] mt-12 text-sm max-w-md mx-auto">
            <p className="mb-2">No MCP servers configured.</p>
            <p className="text-[12px]">
              Add a stdio MCP server (e.g. <code className="text-[var(--accent-3)]">@modelcontextprotocol/server-filesystem</code>) to expose its tools to Mnemosyne.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
            {configs.map((c) => {
              const isConn = connected.find((x) => x.name === c.name);
              return (
                <div key={c.name} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`dot ${isConn ? "dot-green" : "dot-amber"}`} />
                      <span className="font-medium text-[14px]">{c.name}</span>
                    </div>
                    <div className="flex gap-1">
                      {isConn ? (
                        <button onClick={() => disconnect(c.name)} className="btn-ghost btn text-[11px]">
                          <Power size={11} /> stop
                        </button>
                      ) : (
                        <button onClick={() => connect(c.name)} className="btn-ghost btn text-[11px]">
                          <Power size={11} /> connect
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--text-faint)] font-mono mb-2 truncate">
                    {c.command} {(c.args || []).join(" ")}
                  </div>
                  {isConn && (
                    <div className="text-[11px] text-[var(--text-dim)]">
                      <div className="mb-1">{isConn.tools.length} tools:</div>
                      <div className="flex flex-wrap gap-1">
                        {isConn.tools.slice(0, 8).map((t) => (
                          <span key={t.name} className="chip">{t.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
