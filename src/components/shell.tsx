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

export function Shell() {
  const view = useStore((s) => s.view);
  const setPaletteOpen = useStore((s) => s.setPaletteOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);

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
