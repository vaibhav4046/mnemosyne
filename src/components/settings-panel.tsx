"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { Settings, Brain, Database, Folder, Sparkles, RefreshCcw, Activity, Heart, Loader2 } from "lucide-react";

type ModelInfo = {
  host: string;
  chatModel: string;
  embedModel: string;
  models: string[];
  online: boolean;
  vectorCount: number;
  sources: string[];
};

type Health = { ok: boolean; checks: Record<string, { ok: boolean; detail?: string }>; uptimeSec: number };

export function SettingsPanel() {
  const toast = useStore((s) => s.toast);
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const [r1, r2] = await Promise.all([fetch("/api/models"), fetch("/api/health")]);
      setInfo(await r1.json());
      setHealth(await r2.json());
    } catch {}
  }

  useEffect(() => {
    load();
  }, []);

  async function rebuildIndex() {
    setBusy("rebuild");
    try {
      const r = await fetch("/api/vault", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rebuild-index" }) });
      const d = await r.json();
      toast({ kind: "success", msg: `Index rebuilt — ${d.pages} pages` });
    } catch {
      toast({ kind: "error", msg: "rebuild failed" });
    } finally {
      setBusy(null);
    }
  }

  async function runLint() {
    setBusy("lint");
    try {
      await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "lint", title: "Settings: lint", input: {} }),
      });
      toast({ kind: "info", msg: "Lint job queued — see Agents panel" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="h-12 px-5 flex items-center justify-between border-b border-[var(--border)] glass">
        <div className="flex items-center gap-2.5">
          <Settings size={15} className="text-[var(--accent)]" />
          <span className="font-medium text-[14px]">Settings</span>
        </div>
        <button onClick={load} className="btn-ghost btn"><RefreshCcw size={13} /></button>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin p-6 space-y-4 max-w-3xl">
        <Section title="Health" icon={<Heart size={14} />}>
          {health ? (
            <>
              <Row label="Overall" value={health.ok ? "OK" : "DEGRADED"} valueClass={health.ok ? "text-[var(--green)]" : "text-[var(--red)]"} />
              {Object.entries(health.checks).map(([k, v]) => (
                <Row key={k} label={k} value={`${v.ok ? "✓" : "✗"} ${v.detail || ""}`} valueClass={v.ok ? "text-[var(--green)]" : "text-[var(--red)]"} />
              ))}
              <Row label="Uptime" value={`${health.uptimeSec}s`} />
            </>
          ) : (
            <Row label="Status" value="checking…" />
          )}
        </Section>

        <Section title="Ollama" icon={<Brain size={14} />}>
          <Row label="Host" value={info?.host || "—"} />
          <Row label="Chat model" value={info?.chatModel || "—"} />
          <Row label="Embedding model" value={info?.embedModel || "—"} />
          <Row label="Status" value={info?.online ? "online" : "offline"} valueClass={info?.online ? "text-[var(--green)]" : "text-[var(--red)]"} />
          <Row label="Installed models" value={info?.models.join(", ") || "—"} />
        </Section>

        <Section title="Vector store" icon={<Database size={14} />} action={
          <button onClick={runLint} disabled={!!busy} className="btn-ghost btn text-[11px]">
            {busy === "lint" ? <Loader2 size={11} className="animate-spin" /> : <Activity size={11} />} run lint
          </button>
        }>
          <Row label="Backend" value="JSON + cosine (in-memory cache)" />
          <Row label="Chunks indexed" value={String(info?.vectorCount ?? 0)} />
          <Row label="Sources" value={String(info?.sources.length ?? 0)} />
        </Section>

        <Section title="Vault" icon={<Folder size={14} />} action={
          <button onClick={rebuildIndex} disabled={!!busy} className="btn-ghost btn text-[11px]">
            {busy === "rebuild" ? <Loader2 size={11} className="animate-spin" /> : <RefreshCcw size={11} />} rebuild index
          </button>
        }>
          <Row label="Path" value="./vault" />
          <Row label="Layout" value="pages/*.md + index.md + log.md + CLAUDE.md" />
        </Section>

        <Section title="Tech stack" icon={<Sparkles size={14} />}>
          <Row label="Frontend" value="Next.js 15 · React 19 · Tailwind 4 · Zustand · lucide-react" />
          <Row label="3D viz" value="react-force-graph-3d · three.js" />
          <Row label="Markdown" value="react-markdown · remark-gfm · gray-matter" />
          <Row label="LLM" value="ollama (chat + embed) · streaming via SSE" />
          <Row label="Browser agent" value="Playwright (chromium, headless)" />
          <Row label="Tools" value="@modelcontextprotocol/sdk · p-queue" />
          <Row label="File parsers" value="pdf-parse · mammoth (docx)" />
        </Section>

        <Section title="Keyboard" icon={<Sparkles size={14} />}>
          <Row label="Command palette" value="⌘K / Ctrl+K" />
          <Row label="Send chat" value="⏎ (Shift+⏎ for newline)" />
          <Row label="Close modal / palette" value="Esc" />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2 text-[13px] font-medium">
        <span className="text-[var(--accent)]">{icon}</span>
        <span className="flex-1">{title}</span>
        {action}
      </div>
      <div className="divide-y divide-[var(--border)]/50">{children}</div>
    </div>
  );
}

function Row({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="px-4 py-2.5 flex items-center text-[12.5px]">
      <span className="text-[var(--text-dim)] w-44 shrink-0">{label}</span>
      <span className={`font-mono text-[12px] break-all ${valueClass}`}>{value}</span>
    </div>
  );
}
