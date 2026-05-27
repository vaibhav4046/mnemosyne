"use client";
import { useStore, type View } from "@/store";
import {
  MessageSquare,
  BookOpen,
  Network,
  Folder,
  Cpu,
  Plug,
  Settings,
  Brain,
} from "lucide-react";

const items: { id: View; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "wiki", label: "Wiki", icon: BookOpen },
  { id: "graph", label: "Graph", icon: Network },
  { id: "files", label: "Files", icon: Folder },
  { id: "agents", label: "Agents", icon: Cpu },
  { id: "mcp", label: "MCP", icon: Plug },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  return (
    <aside className="glass-strong flex flex-col w-[230px] shrink-0 h-full relative z-10">
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-[var(--border)]">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] shadow-lg shadow-[var(--accent)]/20">
          <Brain size={20} className="text-white" />
        </div>
        <div>
          <div className="font-semibold text-[15px] leading-tight">Mnemosyne</div>
          <div className="text-[10px] text-[var(--text-faint)] uppercase tracking-wider">
            Knowledge OS
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {items.map((it) => {
          const active = view === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] transition-all ${
                active
                  ? "bg-gradient-to-r from-[var(--accent)]/20 to-transparent text-white border-l-2 border-[var(--accent)] shadow-inner"
                  : "text-[var(--text-dim)] hover:bg-[var(--bg-card)] hover:text-white border-l-2 border-transparent"
              }`}
            >
              <Icon size={16} />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-[var(--border)] text-[10px] text-[var(--text-faint)]">
        <div className="flex items-center gap-1.5">
          <span className="dot dot-violet pulse-soft" />
          local-first · ollama · v0.1
        </div>
      </div>
    </aside>
  );
}
