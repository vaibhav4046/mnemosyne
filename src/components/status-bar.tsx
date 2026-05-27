"use client";
import { useEffect } from "react";
import { useStore } from "@/store";
import { Database, Wifi, WifiOff, Layers } from "lucide-react";

export function StatusBar() {
  const modelInfo = useStore((s) => s.modelInfo);
  const setModelInfo = useStore((s) => s.setModelInfo);

  useEffect(() => {
    const tick = async () => {
      try {
        const r = await fetch("/api/models");
        const d = await r.json();
        setModelInfo(d);
      } catch {
        setModelInfo({ host: "", chatModel: "", embedModel: "", models: [], online: false, vectorCount: 0, sources: [] });
      }
    };
    tick();
    const i = setInterval(tick, 8000);
    return () => clearInterval(i);
  }, [setModelInfo]);

  const online = modelInfo?.online ?? false;

  return (
    <div className="h-8 px-4 flex items-center justify-between text-[11px] text-[var(--text-faint)] border-t border-[var(--border)] bg-[var(--bg-elev)]/60 backdrop-blur z-10">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          {online ? (
            <Wifi size={11} className="text-[var(--green)]" />
          ) : (
            <WifiOff size={11} className="text-[var(--red)]" />
          )}
          ollama {online ? "live" : "offline"}
        </span>
        <span className="flex items-center gap-1.5">
          <Layers size={11} />
          {modelInfo?.chatModel || "—"} · {modelInfo?.embedModel || "—"}
        </span>
        <span className="flex items-center gap-1.5">
          <Database size={11} />
          {modelInfo?.vectorCount ?? 0} chunks · {modelInfo?.sources.length ?? 0} sources
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span>{modelInfo?.host || ""}</span>
      </div>
    </div>
  );
}
