"use client";
import { useEffect } from "react";
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
  Star,
  Brain,
  Database,
  Activity,
  Plus,
  Trash2,
  Sun,
  Moon,
} from "lucide-react";

type NavItem = { id: View; label: string; icon: React.ComponentType<{ size?: number }>; kbd: string };

const NAV: NavItem[] = [
  { id: "chat",     label: "Chat",        icon: MessageSquare, kbd: "⌘1" },
  { id: "wiki",     label: "Wiki",        icon: BookOpen,      kbd: "⌘2" },
  { id: "graph",    label: "Galaxy",      icon: Network,       kbd: "⌘3" },
  { id: "files",    label: "Files",       icon: Folder,        kbd: "⌘4" },
  { id: "agents",   label: "Agents",      icon: Cpu,           kbd: "⌘5" },
  { id: "mcp",      label: "MCP servers", icon: Plug,          kbd: "⌘6" },
];
const BOTTOM: NavItem[] = [
  { id: "settings", label: "Settings", icon: Settings, kbd: "⌘," },
];

export function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const setPaletteOpen = useStore((s) => s.setPaletteOpen);
  const modelInfo = useStore((s) => s.modelInfo);
  const setModelInfo = useStore((s) => s.setModelInfo);
  const threads = useStore((s) => s.threads);
  const currentThreadId = useStore((s) => s.currentThreadId);
  const newThread = useStore((s) => s.newThread);
  const switchThread = useStore((s) => s.switchThread);
  const deleteThread = useStore((s) => s.deleteThread);
  const openModal = useStore((s) => s.openModal);
  const setSelectedSlug = useStore((s) => s.setSelectedSlug);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const setSidebarWidth = useStore((s) => s.setSidebarWidth);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    function onMove(ev: MouseEvent) {
      setSidebarWidth(startW + (ev.clientX - startX));
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/models", { cache: "no-store" });
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (!cancelled) setModelInfo(d);
      } catch {
        if (!cancelled) setModelInfo({ host: "", chatModel: "—", embedModel: "—", models: [], online: false, vectorCount: 0, sources: [] });
      }
    };
    tick();
    const i = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(i); };
  }, [setModelInfo]);

  return (
    <aside
      className={`star-grid flex flex-col shrink-0 h-full relative z-10 sidebar-mobile ${sidebarOpen ? "open" : ""}`}
      style={{ background: "var(--navy)", borderRight: "0.5px solid var(--border)", width: sidebarWidth }}
      aria-label="Primary navigation"
    >
      <div
        onMouseDown={startResize}
        onDoubleClick={() => setSidebarWidth(252)}
        className="absolute top-0 right-[-3px] bottom-0 w-[6px] z-20 cursor-col-resize group"
        title="drag to resize · double-click to reset"
        aria-label="resize sidebar"
        role="separator"
      >
        <div className="absolute inset-y-0 left-[2px] w-[2px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "var(--violet)" }} />
      </div>
      <div className="flex items-center gap-3 px-[22px] py-[20px]" style={{ borderBottom: "0.5px solid var(--border-2)" }}>
        <div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden">
          <Image src="/logo.svg" alt="Own Wiki" width={36} height={36} priority />
        </div>
        <div>
          <div className="serif text-[22px] leading-none" style={{ color: "var(--fg-1)" }}>Own Wiki</div>
          <div className="mono text-[9px] tracking-[0.18em] uppercase mt-1" style={{ color: "var(--fg-3)" }}>v1.0 · local</div>
        </div>
      </div>

      <nav className="px-[14px] pt-[18px] pb-[8px]" aria-label="Workspace">
        <div className="mono text-[10px] tracking-[0.18em] uppercase px-[10px] pb-[10px]" style={{ color: "var(--fg-3)" }}>
          Workspace
        </div>
        {NAV.map((it) => {
          const active = view === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              aria-current={active ? "page" : undefined}
              className="w-full flex items-center gap-3 px-[12px] py-[9px] rounded text-[14px] transition-colors relative"
              style={{
                color: active ? "var(--violet-2)" : "var(--fg-2)",
                background: active ? "rgba(168, 85, 247, 0.06)" : "transparent",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(245, 240, 228, 0.03)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              {active && <span className="absolute left-[-14px] top-[8px] bottom-[8px] w-[2px]" style={{ background: "var(--violet)" }} />}
              <Icon size={16} />
              <span>{it.label}</span>
              <span className="mono ml-auto text-[10px]" style={{ color: "var(--fg-4)" }}>{it.kbd}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-[14px] pt-[14px] pb-[8px]">
        <div className="mono text-[10px] tracking-[0.18em] uppercase px-[10px] pb-[8px] flex items-center justify-between" style={{ color: "var(--fg-3)" }}>
          <span>Threads · {threads.length}</span>
          <button onClick={() => { newThread(); setView("chat"); }} className="hover:text-white" aria-label="new thread" title="new thread">
            <Plus size={11} />
          </button>
        </div>
        <div className="max-h-[160px] overflow-y-auto scroll-thin">
          {threads.length === 0 && (
            <div className="text-[10.5px] px-[10px] py-[6px]" style={{ color: "var(--fg-4)" }}>No threads yet.</div>
          )}
          {[...threads].reverse().slice(0, 12).map((t) => {
            const active = t.id === currentThreadId;
            return (
              <div key={t.id} className="flex items-center group">
                <button
                  onClick={() => { switchThread(t.id); setView("chat"); }}
                  className="flex-1 text-left px-[12px] py-[6px] rounded text-[12px] truncate transition-colors"
                  style={{ color: active ? "var(--violet-2)" : "var(--fg-2)", background: active ? "rgba(168, 85, 247, 0.06)" : "transparent" }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(245, 240, 228, 0.03)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  {t.title}
                </button>
                <button
                  onClick={() => openModal({ kind: "confirm", title: `Delete "${t.title}"?`, body: `${t.messages.length} messages will be removed.`, danger: true, onConfirm: () => deleteThread(t.id) })}
                  className="opacity-0 group-hover:opacity-100 px-2 transition-opacity"
                  style={{ color: "var(--fg-4)" }}
                  aria-label="delete thread"
                  title="delete thread"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-[14px] pt-[14px] pb-[8px]">
        <div className="mono text-[10px] tracking-[0.18em] uppercase px-[10px] pb-[8px]" style={{ color: "var(--fg-3)" }}>
          Pinned pages
        </div>
        {["own-wiki", "memory", "karpathy-llm-wiki", "ollama"].map((slug) => (
          <button
            key={slug}
            onClick={() => { setSelectedSlug(slug); setView("wiki"); }}
            className="w-full flex items-center gap-3 px-[12px] py-[6px] rounded text-[13px] transition-colors"
            style={{ color: "var(--fg-2)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245, 240, 228, 0.03)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Star size={13} style={{ color: "var(--brass)" }} />
            <span>{slug}</span>
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <nav className="px-[14px] pb-[8px]" aria-label="Settings">
        {BOTTOM.map((it) => {
          const active = view === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className="w-full flex items-center gap-3 px-[12px] py-[9px] rounded text-[14px] transition-colors relative"
              style={{
                color: active ? "var(--violet-2)" : "var(--fg-2)",
                background: active ? "rgba(168, 85, 247, 0.06)" : "transparent",
              }}
            >
              {active && <span className="absolute left-[-14px] top-[8px] bottom-[8px] w-[2px]" style={{ background: "var(--violet)" }} />}
              <Icon size={16} />
              <span>{it.label}</span>
              <span className="mono ml-auto text-[10px]" style={{ color: "var(--fg-4)" }}>{it.kbd}</span>
            </button>
          );
        })}
        <button
          onClick={() => setPaletteOpen(true)}
          className="w-full flex items-center gap-3 px-[12px] py-[9px] rounded text-[13px] transition-colors mt-1"
          style={{ color: "var(--fg-3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg-1)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-3)")}
          aria-label="Open command palette"
        >
          <Command size={14} />
          <span className="flex-1 text-left">Command palette</span>
          <span className="kbd">⌘K</span>
        </button>
      </nav>

      <div className="mx-[14px] mb-[10px] flex items-center justify-between">
        <span className="mono text-[10px] tracking-[0.16em] uppercase flex items-center gap-1.5" style={{ color: "var(--fg-3)" }}>
          {theme === "dark" ? <Moon size={11} /> : <Sun size={11} />}
          {theme === "dark" ? "Dark" : "Light"}
        </span>
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle light / dark theme" title="Toggle theme">
          <span className="knob">{theme === "dark" ? <Moon size={11} color="#fff" /> : <Sun size={11} color="#fff" />}</span>
        </button>
      </div>

      <div className="m-[14px] mt-0 p-[14px] rounded-md" style={{ background: "var(--navy-2)", border: "0.5px solid var(--border)" }}>
        <div className="flex items-center gap-2 mono text-[11px] mb-[6px]" style={{ color: "var(--fg-2)" }}>
          <span className="status-dot" style={{ background: modelInfo?.online ? "var(--success)" : "var(--danger)" }} />
          <span style={{ color: "var(--fg-3)", flex: 1 }}>ollama</span>
          <span style={{ color: "var(--fg-1)" }}>{modelInfo?.online ? "live" : "offline"}</span>
        </div>
        <div className="flex items-center gap-2 mono text-[11px] mb-[6px]">
          <Brain size={11} style={{ color: "var(--fg-3)" }} />
          <span style={{ color: "var(--fg-3)", flex: 1 }}>chat</span>
          <span style={{ color: "var(--fg-1)" }}>{modelInfo?.chatModel?.replace(/:latest$/, "") || "—"}</span>
        </div>
        <div className="flex items-center gap-2 mono text-[11px] mb-[6px]">
          <Database size={11} style={{ color: "var(--fg-3)" }} />
          <span style={{ color: "var(--fg-3)", flex: 1 }}>embed</span>
          <span style={{ color: "var(--fg-1)" }}>{modelInfo?.embedModel?.replace(/:latest$/, "").slice(0, 14) || "—"}</span>
        </div>
        <div className="flex items-center gap-2 mono text-[11px]">
          <Activity size={11} style={{ color: "var(--fg-3)" }} />
          <span style={{ color: "var(--fg-3)", flex: 1 }}>vault</span>
          <span style={{ color: "var(--fg-1)" }}>{modelInfo?.vectorCount ?? 0} chunks</span>
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
