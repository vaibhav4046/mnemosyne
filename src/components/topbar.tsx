"use client";
import { useStore } from "@/store";
import { Search, AlertTriangle } from "lucide-react";

const LABELS: Record<string, string> = {
  chat: "Chat",
  wiki: "Wiki",
  graph: "Galaxy",
  files: "Files",
  agents: "Agents",
  mcp: "MCP Servers",
  settings: "Settings",
};

export function Topbar() {
  const view = useStore((s) => s.view);
  const selectedSlug = useStore((s) => s.selectedSlug);
  const setPaletteOpen = useStore((s) => s.setPaletteOpen);
  const modelInfo = useStore((s) => s.modelInfo);
  const offline = modelInfo !== null && !modelInfo.online;

  const crumbs = [LABELS[view] || view];
  if (view === "wiki" && selectedSlug) crumbs.push(selectedSlug);

  return (
    <div className="shrink-0">
      <div className="flex items-center h-[56px] px-[28px] gap-4" style={{ borderBottom: "0.5px solid var(--border-2)" }}>
        <div className="flex items-center gap-[10px] mono text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-3)" }}>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-[10px]">
              {i > 0 && <span style={{ color: "var(--fg-4)" }}>›</span>}
              <span style={i === crumbs.length - 1 ? { color: "var(--fg-1)" } : undefined}>{c}</span>
            </span>
          ))}
        </div>
        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-auto flex items-center gap-2 px-[12px] py-[6px] rounded-sm mono text-[12px] transition-colors"
          style={{ background: "var(--navy-2)", border: "0.5px solid var(--border)", color: "var(--fg-3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--fg-3)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <Search size={13} />
          <span>Search vault, jump, ingest…</span>
          <span className="kbd ml-1">⌘K</span>
        </button>
      </div>
      {offline && (
        <div
          className="flex items-center gap-2.5 px-[28px] py-2 text-[12px]"
          style={{ background: "rgba(224,180,92,0.08)", borderBottom: "0.5px solid rgba(224,180,92,0.25)", color: "var(--amber)" }}
          role="alert"
        >
          <AlertTriangle size={13} className="shrink-0" />
          <span>
            <strong>No AI engine connected.</strong> Start Ollama locally, or add a free cloud key (Groq · Gemini · OpenRouter) in{" "}
            <button onClick={() => useStore.getState().setView("settings")} className="underline" style={{ color: "var(--fg-1)" }}>Settings → AI Providers</button>. Reconnects automatically.
          </span>
        </div>
      )}
    </div>
  );
}
