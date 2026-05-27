"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { Plug, Plus, Power, RefreshCcw, Trash2, Loader2 } from "lucide-react";

type ServerCfg = { name: string; command: string; args?: string[] };
type Conn = { name: string; tools: { name: string; description?: string }[] };

export function McpPanel() {
  const toast = useStore((s) => s.toast);
  const openModal = useStore((s) => s.openModal);
  const [configs, setConfigs] = useState<ServerCfg[]>([]);
  const [connected, setConnected] = useState<Conn[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", command: "npx", args: "" });

  async function load() {
    try {
      const r = await fetch("/api/mcp");
      const d = await r.json();
      setConfigs(d.configs || []);
      setConnected(d.connected || []);
    } catch {
      toast({ kind: "error", msg: "Failed to load MCP servers" });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!form.name.trim() || !form.command.trim()) {
      toast({ kind: "error", msg: "name and command required" });
      return;
    }
    await fetch("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        server: { name: form.name, command: form.command, args: form.args.split(" ").filter(Boolean) },
      }),
    });
    setAdding(false);
    setForm({ name: "", command: "npx", args: "" });
    toast({ kind: "success", msg: `Added ${form.name}` });
    load();
  }

  async function connectServer(name: string) {
    setBusy(name);
    try {
      const r = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", name }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ kind: "success", msg: `${name}: ${d.tools.length} tools` });
      load();
    } catch (e) {
      toast({ kind: "error", msg: e instanceof Error ? e.message : "connect failed" });
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(name: string) {
    setBusy(name);
    await fetch("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect", name }),
    });
    toast({ kind: "info", msg: `Disconnected ${name}` });
    setBusy(null);
    load();
  }

  function remove(name: string) {
    openModal({
      kind: "confirm",
      title: `Remove ${name}?`,
      body: "This deletes the server config. You can re-add it later.",
      danger: true,
      onConfirm: async () => {
        await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remove", name }),
        });
        toast({ kind: "success", msg: `Removed ${name}` });
        load();
      },
    });
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
          <button onClick={load} className="btn-ghost btn" aria-label="refresh">
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
            <input className="input text-[13px]" placeholder="args (space-separated)" value={form.args} onChange={(e) => setForm({ ...form, args: e.target.value })} />
            <div className="text-[10.5px] text-[var(--text-faint)] px-1">
              Example: <code>-y @modelcontextprotocol/server-filesystem ~/Desktop</code>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={add} className="btn btn-primary">save</button>
              <button onClick={() => setAdding(false)} className="btn">cancel</button>
            </div>
          </div>
        )}

        {configs.length === 0 ? (
          <div className="text-center text-[var(--text-faint)] mt-12 text-sm max-w-md mx-auto">
            <Plug size={28} className="mx-auto mb-3 opacity-50" />
            <p className="mb-2">No MCP servers configured.</p>
            <p className="text-[12px]">
              Add a stdio MCP server (e.g.{" "}
              <code className="text-[var(--accent-3)]">@modelcontextprotocol/server-filesystem</code>) to expose its tools to Own Wiki.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
            {configs.map((c) => {
              const isConn = connected.find((x) => x.name === c.name);
              const isBusy = busy === c.name;
              return (
                <div key={c.name} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`dot ${isConn ? "dot-green" : "dot-amber"}`} />
                      <span className="font-medium text-[14px]">{c.name}</span>
                    </div>
                    <div className="flex gap-1">
                      {isConn ? (
                        <button onClick={() => disconnect(c.name)} disabled={isBusy} className="btn-ghost btn text-[11px]">
                          {isBusy ? <Loader2 size={11} className="animate-spin" /> : <Power size={11} />} stop
                        </button>
                      ) : (
                        <button onClick={() => connectServer(c.name)} disabled={isBusy} className="btn-ghost btn text-[11px]">
                          {isBusy ? <Loader2 size={11} className="animate-spin" /> : <Power size={11} />} connect
                        </button>
                      )}
                      <button onClick={() => remove(c.name)} className="btn-ghost btn text-[11px]" aria-label={`remove ${c.name}`}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--text-faint)] font-mono mb-2 truncate" title={`${c.command} ${(c.args || []).join(" ")}`}>
                    {c.command} {(c.args || []).join(" ")}
                  </div>
                  {isConn && (
                    <div className="text-[11px] text-[var(--text-dim)]">
                      <div className="mb-1">{isConn.tools.length} tools:</div>
                      <div className="flex flex-wrap gap-1">
                        {isConn.tools.slice(0, 10).map((t) => (
                          <span key={t.name} className="chip" title={t.description || t.name}>{t.name}</span>
                        ))}
                        {isConn.tools.length > 10 && <span className="chip">+{isConn.tools.length - 10}</span>}
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
