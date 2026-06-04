"use client";
import { useEffect } from "react";
import { useStore } from "@/store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { ChatPanel } from "./chat-panel";
import { WikiPanel } from "./wiki-panel";
import { GraphPanel } from "./graph-panel";
import { FilesPanel } from "./files-panel";
import { AgentsPanel } from "./agents-panel";
import { McpPanel } from "./mcp-panel";
import { SettingsPanel } from "./settings-panel";
import { ToastStack } from "./toast-stack";
import { ModalHost } from "./modal";
import { ErrorBoundary } from "./error-boundary";
import { CommandPalette } from "./command-palette";
import { Menu } from "lucide-react";

const VIEW_KEYS: Record<string, "chat" | "wiki" | "graph" | "files" | "agents" | "mcp" | "settings"> = {
  "1": "chat", "2": "wiki", "3": "graph", "4": "files", "5": "agents", "6": "mcp", "7": "settings",
};

export function Shell() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const setPaletteOpen = useStore((s) => s.setPaletteOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const toast = useStore((s) => s.toast);

  // Auto-index the user's Desktop/Documents/Downloads in the background so chat
  // can answer about local files with no manual ingest. Throttled to once / 8h
  // (the scan itself is idempotent — unchanged files are skipped instantly).
  useEffect(() => {
    const KEY = "ownwiki:lastDesktopScan";
    const last = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - last < 8 * 3600_000) return;
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/desktop-scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        if (!r.ok) return;
        localStorage.setItem(KEY, String(Date.now()));
        toast({ kind: "info", msg: "Indexing your Desktop, Documents & Downloads…", ttl: 4000 });
      } catch {}
    }, 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      // ⌘1–7 jump to view (skip when typing in a field)
      if (mod && VIEW_KEYS[e.key]) {
        const el = document.activeElement;
        const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable);
        if (!typing) {
          e.preventDefault();
          setView(VIEW_KEYS[e.key]);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaletteOpen, setView]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden absolute top-3 left-3 z-20 btn-ghost btn p-2"
          aria-label="open menu"
        >
          <Menu size={16} />
        </button>
        <Topbar />
        <div className="flex-1 overflow-hidden min-h-0">
          <ErrorBoundary>
            <div key={view} className="h-full anim-view">
              {view === "chat" && <ChatPanel />}
              {view === "wiki" && <WikiPanel />}
              {view === "graph" && <GraphPanel />}
              {view === "files" && <FilesPanel />}
              {view === "agents" && <AgentsPanel />}
              {view === "mcp" && <McpPanel />}
              {view === "settings" && <SettingsPanel />}
            </div>
          </ErrorBoundary>
        </div>
      </main>
      <ToastStack />
      <ModalHost />
      <CommandPalette />
    </div>
  );
}
