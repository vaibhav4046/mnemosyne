"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Network, RefreshCcw, Search, Maximize2, Play, Pause } from "lucide-react";
import { useStore } from "@/store";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

type RawGraph = {
  nodes: { id: string; label: string; group: string }[];
  links: { source: string; target: string }[];
};

const PALETTE = ["#a855f7", "#06b6d4", "#ec4899", "#22d3a8", "#f59e0b", "#ef4444", "#c084fc", "#34d399", "#fb923c", "#60a5fa"];

export function GraphPanel() {
  const [data, setData] = useState<RawGraph>({ nodes: [], links: [] });
  const setView = useStore((s) => s.setView);
  const setSelectedSlug = useStore((s) => s.setSelectedSlug);
  const ref = useRef<HTMLDivElement>(null);
  const fgRef = useRef<{ d3Force?: (n: string, f?: unknown) => unknown; zoomToFit?: (ms: number, pad: number) => void } | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [rotating, setRotating] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  async function load() {
    const r = await fetch("/api/wiki");
    const d = await r.json();
    setData(d.graph);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => {
      if (ref.current) setSize({ w: ref.current.clientWidth, h: ref.current.clientHeight });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const incoming = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of data.links) map[l.target] = (map[l.target] || 0) + 1;
    return map;
  }, [data]);

  const groups = useMemo(() => [...new Set(data.nodes.map((n) => n.group))], [data]);
  const groupColor = (g: string) => PALETTE[Math.max(0, groups.indexOf(g)) % PALETTE.length];

  const filteredNodes = useMemo(() => {
    const lower = q.toLowerCase();
    return data.nodes.filter((n) => {
      if (activeTag && n.group !== activeTag) return false;
      if (lower && !(n.id.toLowerCase().includes(lower) || n.label.toLowerCase().includes(lower))) return false;
      return true;
    });
  }, [data.nodes, q, activeTag]);

  const filteredData = useMemo(() => {
    const ids = new Set(filteredNodes.map((n) => n.id));
    return {
      nodes: filteredNodes.map((n) => ({ ...n, val: 4 + (incoming[n.id] || 0) * 3 })),
      links: data.links.filter((l) => {
        const s = typeof l.source === "string" ? l.source : (l.source as { id: string }).id;
        const t = typeof l.target === "string" ? l.target : (l.target as { id: string }).id;
        return ids.has(s) && ids.has(t);
      }),
    };
  }, [filteredNodes, data.links, incoming]);

  useEffect(() => {
    if (!fgRef.current) return;
    setTimeout(() => fgRef.current?.zoomToFit?.(800, 60), 500);
  }, [filteredData.nodes.length]);

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="h-12 px-5 flex items-center justify-between glass" style={{ borderBottom: "0.5px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <Network size={15} style={{ color: "var(--violet)" }} />
          <span className="font-medium text-[14px]">Galaxy</span>
          <span className="text-[11px]" style={{ color: "var(--fg-3)" }}>
            · {filteredData.nodes.length}/{data.nodes.length} nodes · {filteredData.links.length} links
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-3)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="filter nodes…"
              className="input text-[11px] py-1 pl-7 w-44"
              aria-label="filter graph"
            />
          </div>
          <button onClick={() => setShowLabels(!showLabels)} className="btn-ghost btn text-[11px]" title="toggle labels">
            {showLabels ? "labels on" : "labels off"}
          </button>
          <button onClick={() => setRotating(!rotating)} className="btn-ghost btn text-[11px]" title="toggle auto-rotate">
            {rotating ? <Pause size={11} /> : <Play size={11} />}
          </button>
          <button onClick={() => fgRef.current?.zoomToFit?.(600, 60)} className="btn-ghost btn text-[11px]" title="fit view">
            <Maximize2 size={11} />
          </button>
          <button onClick={load} className="btn-ghost btn text-[11px]" title="refresh">
            <RefreshCcw size={11} />
          </button>
        </div>
      </header>

      <div ref={ref} className="flex-1 relative" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(168,85,247,0.03), transparent 60%)" }}>
        {data.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "var(--fg-3)" }}>
            Vault is empty — ingest sources to build the galaxy.
          </div>
        ) : (
          <ForceGraph3DInner
            data={filteredData}
            size={size}
            showLabels={showLabels}
            rotating={rotating}
            groupColor={groupColor}
            fgRef={fgRef}
            onClick={(id) => { setSelectedSlug(id); setView("wiki"); }}
          />
        )}

        <div className="absolute top-4 right-4 glass-strong rounded-lg p-3 text-[11px] space-y-1 max-w-[200px] max-h-[60vh] overflow-y-auto scroll-thin">
          <div className="mono text-[9.5px] tracking-[0.16em] uppercase mb-1.5" style={{ color: "var(--fg-3)" }}>tags</div>
          <button onClick={() => setActiveTag(null)} className="flex items-center gap-2 w-full text-left" style={{ color: !activeTag ? "var(--fg-1)" : "var(--fg-3)" }}>
            <span className="dot" style={{ background: "var(--fg-3)", boxShadow: "none" }} />
            <span>all ({data.nodes.length})</span>
          </button>
          {groups.map((g) => {
            const count = data.nodes.filter((n) => n.group === g).length;
            const active = activeTag === g;
            return (
              <button key={g} onClick={() => setActiveTag(active ? null : g)} className="flex items-center gap-2 w-full text-left" style={{ color: active ? "var(--fg-1)" : "var(--fg-3)" }}>
                <span className="dot" style={{ background: groupColor(g), boxShadow: `0 0 8px ${groupColor(g)}` }} />
                <span className="truncate">{g} ({count})</span>
              </button>
            );
          })}
        </div>

        <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-2 text-[10px] mono tracking-[0.06em]" style={{ color: "var(--fg-3)" }}>
          click node → open page · drag to rotate · scroll to zoom
        </div>
      </div>
    </div>
  );
}

type InnerProps = {
  data: { nodes: { id: string; label: string; group: string; val: number }[]; links: { source: string; target: string }[] };
  size: { w: number; h: number };
  showLabels: boolean;
  rotating: boolean;
  groupColor: (g: string) => string;
  fgRef: React.MutableRefObject<{ d3Force?: (n: string, f?: unknown) => unknown; zoomToFit?: (ms: number, pad: number) => void } | null>;
  onClick: (id: string) => void;
};

function ForceGraph3DInner({ data, size, showLabels, rotating, groupColor, fgRef, onClick }: InnerProps) {
  const [SpriteText, setSpriteText] = useState<((s: string) => unknown) | null>(null);

  useEffect(() => {
    (async () => {
      const mod = await import("three-spritetext");
      const Ctor = (mod.default ?? mod) as unknown as new (s: string) => unknown;
      setSpriteText(() => (s: string) => new Ctor(s));
    })();
  }, []);

  useEffect(() => {
    if (!fgRef.current) return;
    const ctrl = (fgRef.current as unknown as { controls?: () => { autoRotate: boolean; autoRotateSpeed: number } }).controls?.();
    if (ctrl) {
      ctrl.autoRotate = rotating;
      ctrl.autoRotateSpeed = 0.6;
    }
  }, [rotating, fgRef]);

  return (
    <ForceGraph3D
      ref={fgRef as never}
      graphData={data}
      width={size.w}
      height={size.h}
      backgroundColor="rgba(0,0,0,0)"
      nodeLabel={(n) => (n as { label: string }).label}
      nodeColor={(n) => groupColor((n as { group: string }).group)}
      nodeOpacity={1}
      nodeRelSize={4}
      nodeVal={(n) => (n as { val: number }).val}
      linkColor={() => "rgba(168, 92, 247, 0.45)"}
      linkWidth={0.8}
      linkOpacity={0.55}
      linkDirectionalParticles={2}
      linkDirectionalParticleSpeed={0.004}
      linkDirectionalParticleWidth={1.2}
      linkDirectionalParticleColor={() => "rgba(192, 132, 252, 0.95)"}
      nodeThreeObject={
        showLabels && SpriteText
          ? ((n: unknown) => {
              const node = n as { label: string; group: string };
              const sprite = SpriteText(node.label) as { color: string; textHeight: number; backgroundColor: string; padding: number; borderRadius: number };
              sprite.color = "#f5f0e4";
              sprite.textHeight = 3;
              sprite.backgroundColor = "rgba(15, 18, 32, 0.7)";
              sprite.padding = 2;
              sprite.borderRadius = 2;
              return sprite as unknown as { isObject3D?: true };
            }) as never
          : undefined
      }
      nodeThreeObjectExtend={true}
      onNodeClick={(n) => onClick((n as { id: string }).id)}
    />
  );
}
