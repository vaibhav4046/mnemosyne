"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Network, RefreshCcw } from "lucide-react";
import { useStore } from "@/store";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

type GraphData = {
  nodes: { id: string; label: string; group: string }[];
  links: { source: string; target: string }[];
};

const colors = ["#8b5cf6", "#06b6d4", "#ec4899", "#22d3a8", "#f59e0b", "#ef4444", "#a78bfa", "#34d399"];

export function GraphPanel() {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const setView = useStore((s) => s.setView);
  const setSelectedSlug = useStore((s) => s.setSelectedSlug);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  async function load() {
    const r = await fetch("/api/wiki");
    const d = await r.json();
    setData(d.graph);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => {
      if (ref.current) setSize({ w: ref.current.clientWidth, h: ref.current.clientHeight });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const groups = [...new Set(data.nodes.map((n) => n.group))];
  const groupColor = (g: string) => colors[groups.indexOf(g) % colors.length];

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="h-12 px-5 flex items-center justify-between border-b border-[var(--border)] glass">
        <div className="flex items-center gap-2.5">
          <Network size={15} className="text-[var(--accent)]" />
          <span className="font-medium text-[14px]">Graph</span>
          <span className="text-[11px] text-[var(--text-faint)]">
            · galaxy · {data.nodes.length} nodes · {data.links.length} links
          </span>
        </div>
        <button onClick={load} className="btn-ghost btn">
          <RefreshCcw size={13} /> refresh
        </button>
      </header>

      <div ref={ref} className="flex-1 relative">
        {data.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--text-faint)] text-sm">
            Wiki is empty — ingest sources to build the galaxy.
          </div>
        ) : (
          <ForceGraph3D
            graphData={data}
            width={size.w}
            height={size.h}
            backgroundColor="rgba(0,0,0,0)"
            nodeLabel={(n) => (n as { label: string }).label}
            nodeColor={(n) => groupColor((n as { group: string }).group)}
            nodeOpacity={0.95}
            linkColor={() => "rgba(139, 92, 246, 0.35)"}
            linkWidth={0.6}
            linkOpacity={0.5}
            nodeRelSize={5}
            onNodeClick={(n) => {
              setSelectedSlug((n as { id: string }).id);
              setView("wiki");
            }}
          />
        )}
        <div className="absolute top-4 right-4 glass rounded-lg p-3 text-[11px] space-y-1 max-w-[200px]">
          <div className="text-[var(--text-faint)] mb-1">tags</div>
          {groups.map((g) => (
            <div key={g} className="flex items-center gap-1.5">
              <span className="dot" style={{ background: groupColor(g), boxShadow: `0 0 8px ${groupColor(g)}` }} />
              <span>{g}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
