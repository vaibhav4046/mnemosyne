"use client";
import { useEffect, useState } from "react";
import { Settings, Brain, Database, Folder, Sparkles } from "lucide-react";

type ModelInfo = {
  host: string;
  chatModel: string;
  embedModel: string;
  models: string[];
  online: boolean;
  vectorCount: number;
  sources: string[];
};

export function SettingsPanel() {
  const [info, setInfo] = useState<ModelInfo | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/models");
      setInfo(await r.json());
    })();
  }, []);

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="h-12 px-5 flex items-center gap-2.5 border-b border-[var(--border)] glass">
        <Settings size={15} className="text-[var(--accent)]" />
        <span className="font-medium text-[14px]">Settings</span>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin p-6 space-y-4 max-w-3xl">
        <Section title="Ollama" icon={<Brain size={14} />}>
          <Row label="Host" value={info?.host || "—"} />
          <Row label="Chat model" value={info?.chatModel || "—"} />
          <Row label="Embedding model" value={info?.embedModel || "—"} />
          <Row label="Status" value={info?.online ? "online" : "offline"} valueClass={info?.online ? "text-[var(--green)]" : "text-[var(--red)]"} />
          <Row label="Installed models" value={info?.models.join(", ") || "—"} />
        </Section>

        <Section title="Vector store" icon={<Database size={14} />}>
          <Row label="Backend" value="JSON + cosine (in-memory cache)" />
          <Row label="Chunks indexed" value={String(info?.vectorCount ?? 0)} />
          <Row label="Sources" value={String(info?.sources.length ?? 0)} />
        </Section>

        <Section title="Vault" icon={<Folder size={14} />}>
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
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2 text-[13px] font-medium">
        <span className="text-[var(--accent)]">{icon}</span>
        {title}
      </div>
      <div className="divide-y divide-[var(--border)]/50">{children}</div>
    </div>
  );
}

function Row({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="px-4 py-2.5 flex items-center text-[12.5px]">
      <span className="text-[var(--text-dim)] w-44 shrink-0">{label}</span>
      <span className={`font-mono text-[12px] ${valueClass}`}>{value}</span>
    </div>
  );
}
