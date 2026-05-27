"use client";
import { useStore } from "@/store";
import { Sidebar } from "./sidebar";
import { ChatPanel } from "./chat-panel";
import { WikiPanel } from "./wiki-panel";
import { GraphPanel } from "./graph-panel";
import { FilesPanel } from "./files-panel";
import { AgentsPanel } from "./agents-panel";
import { McpPanel } from "./mcp-panel";
import { SettingsPanel } from "./settings-panel";
import { StatusBar } from "./status-bar";

export function Shell() {
  const view = useStore((s) => s.view);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {view === "chat" && <ChatPanel />}
          {view === "wiki" && <WikiPanel />}
          {view === "graph" && <GraphPanel />}
          {view === "files" && <FilesPanel />}
          {view === "agents" && <AgentsPanel />}
          {view === "mcp" && <McpPanel />}
          {view === "settings" && <SettingsPanel />}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
