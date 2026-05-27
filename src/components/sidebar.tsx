"use client";
import Image from "next/image";
import { useStore, type View } from "@/store";
import {
  MessageSquare,
  BookOpen,
  Network,
  Folder,
  Cpu,
  Plug,
  Settings,
  Command,
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
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const setPaletteOpen = useStore((s) => s.setPaletteOpen);

  return (
    <aside
      className={`glass-strong flex flex-col w-[230px] shrink-0 h-full relative z-10 sidebar-mobile ${sidebarOpen ? "open" : ""}`}
      aria-label="Primary navigation"
    >
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-[var(--border)]">
        <div className="w-9 h-9 rounded-lg overflow-hidden shadow-lg shadow-[var(--accent)]/30 relative">
          <Image src="/logo.svg" alt="Mnemosyne logo" width={36} height={36} priority />
        </div>
        <div>
          <div className="font-semibold text-[15px] leading-tight tracking-tight">Mnemosyne</div>
          <div className="text-[10px] text-[var(--text-faint)] uppercase tracking-wider">
            Knowledge OS
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5" aria-label="Sections">
        {items.map((it) => {
          const active = view === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              aria-current={active ? "page" : undefined}
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

      <div className="px-2 pb-2">
        <button
          onClick={() => setPaletteOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-[var(--text-dim)] hover:text-white hover:bg-[var(--bg-card)] border border-[var(--border)]"
          aria-label="Open command palette"
        >
          <Command size={12} />
          <span className="flex-1 text-left">Command palette</span>
          <span className="kbd">⌘K</span>
        </button>
      </div>

      <div className="px-4 py-3 border-t border-[var(--border)] text-[10px] text-[var(--text-faint)]">
        <div className="flex items-center gap-1.5">
          <span className="dot dot-violet pulse-soft" />
          local-first · ollama · v1.0
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-0"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </aside>
  );
}
