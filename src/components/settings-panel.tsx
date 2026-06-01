"use client";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/store";
import { Settings, Brain, Database, Folder, Sparkles, RefreshCcw, Activity, Heart, Loader2, Zap, KeyRound, Check, X, Plug } from "lucide-react";

type Health = { ok: boolean; checks: Record<string, { ok: boolean; detail?: string }>; uptimeSec: number };
type AutoImprove = { enabled: boolean; intervalSec: number; lastTick: string | null; lastAction: string | null; ticks: number };
type ProviderId = "ollama" | "groq" | "gemini" | "openrouter";
type Prov = {
  settings: {
    provider: ProviderId;
    models: Record<ProviderId, string>;
    fallback: ProviderId[];
    keys: Record<string, string>;
    configured: Record<ProviderId, boolean>;
  };
  status: { provider: ProviderId; online: boolean; reachable: Record<ProviderId, boolean>; ollamaModels: string[]; activeModel: string };
  defaultModels: Record<ProviderId, string>;
};

const PROVIDERS: { id: ProviderId; label: string; note: string; keyUrl?: string; needsKey: boolean }[] = [
  { id: "ollama", label: "Ollama", note: "Local · private · free. No key.", needsKey: false },
  { id: "groq", label: "Groq", note: "Free tier · very fast cloud. Paste API key.", keyUrl: "https://console.groq.com/keys", needsKey: true },
  { id: "gemini", label: "Google Gemini", note: "Free tier · also gives embeddings.", keyUrl: "https://aistudio.google.com/apikey", needsKey: true },
  { id: "openrouter", label: "OpenRouter", note: "Free models (:free). Paste API key.", keyUrl: "https://openrouter.ai/keys", needsKey: true },
];

export function SettingsPanel() {
  const toast = useStore((s) => s.toast);
  const [health, setHealth] = useState<Health | null>(null);
  const [auto, setAuto] = useState<AutoImprove | null>(null);
  const [prov, setProv] = useState<Prov | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; ms?: number; error?: string }>>({});

  const load = useCallback(async () => {
    try {
      const [h, a, p] = await Promise.all([
        fetch("/api/health").then((r) => r.json()).catch(() => null),
        fetch("/api/auto-improve").then((r) => r.json()).catch(() => null),
        fetch("/api/providers").then((r) => r.json()).catch(() => null),
      ]);
      setHealth(h);
      setAuto(a);
      setProv(p);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveProvider(patch: Record<string, unknown>) {
    setBusy("save");
    try {
      const r = await fetch("/api/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", ...patch }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "save failed");
      setProv((cur) => (cur ? { ...cur, settings: d.settings, status: d.status } : cur));
      toast({ kind: "success", msg: "Provider settings saved" });
    } catch (e) {
      toast({ kind: "error", msg: e instanceof Error ? e.message : "save failed" });
    } finally {
      setBusy(null);
    }
  }

  async function saveKey(id: string) {
    const v = (keyDraft[id] || "").trim();
    if (!v) return;
    await saveProvider({ keys: { [id]: v } });
    setKeyDraft((d) => ({ ...d, [id]: "" }));
  }

  async function clearKey(id: string) {
    setBusy("save");
    try {
      const r = await fetch("/api/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clearKey", provider: id }) });
      const d = await r.json();
      setProv((cur) => (cur ? { ...cur, settings: d.settings, status: d.status } : cur));
      toast({ kind: "info", msg: `${id} key removed` });
    } finally {
      setBusy(null);
    }
  }

  async function testProvider(id: string) {
    setBusy("test:" + id);
    try {
      const r = await fetch("/api/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", provider: id }) });
      const d = await r.json();
      setTestResult((t) => ({ ...t, [id]: d }));
      toast({ kind: d.ok ? "success" : "error", msg: d.ok ? `${id} OK · ${d.ms}ms` : `${id}: ${d.error || "failed"}` });
    } finally {
      setBusy(null);
    }
  }

  async function toggleAuto() {
    setBusy("auto");
    try {
      const r = await fetch("/api/auto-improve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !auto?.enabled, intervalSec: auto?.intervalSec || 90 }) });
      setAuto(await r.json());
    } finally {
      setBusy(null);
    }
  }

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

  const active = prov?.settings.provider;

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="h-12 px-5 flex items-center justify-between glass" style={{ borderBottom: "0.5px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <Settings size={15} style={{ color: "var(--violet)" }} />
          <span className="font-medium text-[14px]">Settings</span>
        </div>
        <button onClick={load} className="btn-ghost btn"><RefreshCcw size={13} /></button>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin p-6 space-y-4 max-w-3xl w-full mx-auto">
        {/* ── AI PROVIDERS ─────────────────────────────────────────── */}
        <Section title="AI Providers" icon={<Plug size={14} />} hint="Pick an engine. Cloud keys are free-tier and stored only on this machine.">
          <div className="p-4 space-y-3">
            {PROVIDERS.map((p) => {
              const configured = prov?.settings.configured[p.id];
              const reachable = prov?.status.reachable[p.id];
              const isActive = active === p.id;
              const tr = testResult[p.id];
              return (
                <div key={p.id} className="rounded-lg p-3" style={{ background: "var(--navy)", border: `0.5px solid ${isActive ? "var(--violet)" : "var(--border)"}` }}>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className={`dot ${reachable ? "dot-green" : "dot-amber"}`} />
                    <span className="text-[13px] font-medium" style={{ color: "var(--fg-1)" }}>{p.label}</span>
                    {isActive && <span className="chip violet">active</span>}
                    {configured && !p.needsKey && <span className="chip">local</span>}
                    {tr && <span className="chip" style={{ color: tr.ok ? "var(--success)" : "var(--danger)" }}>{tr.ok ? `${tr.ms}ms` : "fail"}</span>}
                    <div className="ml-auto flex gap-1.5">
                      <button onClick={() => testProvider(p.id)} disabled={!!busy} className="btn-ghost btn text-[11px]">
                        {busy === "test:" + p.id ? <Loader2 size={11} className="animate-spin" /> : <Activity size={11} />} test
                      </button>
                      {!isActive && (
                        <button onClick={() => saveProvider({ provider: p.id })} disabled={!!busy || (p.needsKey && !configured)} className="btn btn-secondary text-[11px] disabled:opacity-40">
                          use
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] mb-2" style={{ color: "var(--fg-3)" }}>{p.note}{p.keyUrl && (
                    <> · <a href={p.keyUrl} target="_blank" rel="noreferrer" style={{ color: "var(--violet-2)" }}>get key ↗</a></>
                  )}</div>
                  {p.needsKey && (
                    <div className="flex items-center gap-2">
                      <KeyRound size={12} style={{ color: "var(--fg-3)" }} className="shrink-0" />
                      {configured ? (
                        <>
                          <code className="text-[11px] flex-1 mono" style={{ color: "var(--fg-2)" }}>{prov?.settings.keys[p.id] || "••••"}</code>
                          <button onClick={() => clearKey(p.id)} className="btn-ghost btn text-[11px]"><X size={11} /> remove</button>
                        </>
                      ) : (
                        <>
                          <input
                            type="password"
                            value={keyDraft[p.id] || ""}
                            onChange={(e) => setKeyDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") saveKey(p.id); }}
                            placeholder={`Paste ${p.label} API key`}
                            className="input text-[12px] py-1 flex-1"
                            aria-label={`${p.label} API key`}
                          />
                          <button onClick={() => saveKey(p.id)} disabled={!keyDraft[p.id]?.trim()} className="btn btn-primary text-[11px] disabled:opacity-40"><Check size={11} /> save</button>
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10.5px] mono shrink-0" style={{ color: "var(--fg-4)" }}>model</span>
                    {p.id === "ollama" && prov?.status.ollamaModels?.length ? (
                      <select
                        value={prov?.settings.models[p.id] || ""}
                        onChange={(e) => saveProvider({ models: { [p.id]: e.target.value } })}
                        className="input text-[11px] py-1"
                      >
                        {prov.status.ollamaModels.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    ) : (
                      <input
                        defaultValue={prov?.settings.models[p.id] || prov?.defaultModels[p.id] || ""}
                        onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== prov?.settings.models[p.id]) saveProvider({ models: { [p.id]: v } }); }}
                        className="input text-[11px] py-1 flex-1 mono"
                        aria-label={`${p.label} model`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            <div className="text-[10.5px]" style={{ color: "var(--fg-4)" }}>
              Fallback order: {prov?.settings.fallback.join(" → ")}. If the active engine fails, the next configured one is used automatically.
            </div>
          </div>
        </Section>

        {/* ── HEALTH ───────────────────────────────────────────────── */}
        <Section title="Health" icon={<Heart size={14} />}>
          {health ? (
            <>
              <Row label="Overall" value={health.ok ? "OK" : "degraded"} valueClass={health.ok ? "text-[var(--green)]" : "text-[var(--amber)]"} />
              {Object.entries(health.checks).map(([k, v]) => (
                <Row key={k} label={k} value={`${v.ok ? "✓" : "✗"} ${v.detail || ""}`} valueClass={v.ok ? "text-[var(--green)]" : "text-[var(--red)]"} />
              ))}
              <Row label="Uptime" value={`${health.uptimeSec}s`} />
            </>
          ) : <Row label="Status" value="checking…" />}
        </Section>

        {/* ── SELF-IMPROVING ───────────────────────────────────────── */}
        <Section title="Self-improving loop" icon={<Zap size={14} />} action={
          <button onClick={toggleAuto} disabled={busy === "auto"} className={`btn-ghost btn text-[11px] ${auto?.enabled ? "text-[var(--green)]" : ""}`}>
            {busy === "auto" ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}{auto?.enabled ? "ON — pause" : "OFF — enable"}
          </button>
        }>
          <Row label="Status" value={auto?.enabled ? "ENABLED" : "paused"} valueClass={auto?.enabled ? "text-[var(--green)]" : ""} />
          <Row label="Interval" value={`${auto?.intervalSec ?? 90}s`} />
          <Row label="Ticks" value={String(auto?.ticks ?? 0)} />
          <Row label="Last action" value={auto?.lastAction ?? "—"} />
        </Section>

        {/* ── VAULT ────────────────────────────────────────────────── */}
        <Section title="Vault" icon={<Folder size={14} />} action={
          <button onClick={rebuildIndex} disabled={!!busy} className="btn-ghost btn text-[11px]">
            {busy === "rebuild" ? <Loader2 size={11} className="animate-spin" /> : <RefreshCcw size={11} />} rebuild index
          </button>
        }>
          <Row label="Storage" value="per-user · %APPDATA%/Own Wiki" />
          <Row label="Layout" value="pages/*.md + index.md + log.md" />
        </Section>

        {/* ── STACK ────────────────────────────────────────────────── */}
        <Section title="Tech stack" icon={<Sparkles size={14} />}>
          <Row label="Frontend" value="Next.js 15 · React 19 · Tailwind 4 · Zustand" />
          <Row label="AI" value="Ollama + Groq + Gemini + OpenRouter (fallback chain)" />
          <Row label="3D viz" value="react-force-graph-3d · three.js" />
          <Row label="Agents" value="ingest · enrich · lint · browser · synthesize · query · file" />
          <Row label="Desktop" value="Electron · per-user data · branded build" />
        </Section>

        <Section title="Keyboard" icon={<Brain size={14} />}>
          <Row label="Command palette" value="⌘K / Ctrl+K" />
          <Row label="Jump to view" value="⌘1 – ⌘7" />
          <Row label="Send chat" value="⏎ (⇧⏎ newline)" />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, action, hint, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl overflow-hidden card-hover">
      <div className="px-4 py-2.5 flex items-center gap-2 text-[13px] font-medium" style={{ borderBottom: "0.5px solid var(--border)" }}>
        <span style={{ color: "var(--violet)" }}>{icon}</span>
        <span className="flex-1">{title}</span>
        {action}
      </div>
      {hint && <div className="px-4 pt-2.5 text-[11px]" style={{ color: "var(--fg-3)" }}>{hint}</div>}
      <div className="divide-y" style={{ borderColor: "var(--border-2)" }}>{children}</div>
    </div>
  );
}

function Row({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="px-4 py-2.5 flex items-center gap-3 text-[12.5px]">
      <span className="w-40 shrink-0" style={{ color: "var(--fg-3)" }}>{label}</span>
      <span className={`font-mono text-[12px] break-all ${valueClass}`} style={valueClass ? undefined : { color: "var(--fg-1)" }}>{value}</span>
    </div>
  );
}
