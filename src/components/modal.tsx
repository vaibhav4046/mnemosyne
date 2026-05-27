"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";
import { X } from "lucide-react";

export function ModalHost() {
  const modal = useStore((s) => s.modal);
  const close = useStore((s) => s.closeModal);
  const inputRef = useRef<HTMLInputElement>(null);
  const [val, setVal] = useState("");

  useEffect(() => {
    if (modal?.kind === "prompt") {
      setVal(modal.defaultValue || "");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [modal]);

  useEffect(() => {
    if (!modal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, close]);

  if (!modal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm animate-[fade_.15s_ease]"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-xl w-full max-w-md p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-[14px]">{modal.title}</h2>
          <button onClick={close} className="text-[var(--text-faint)] hover:text-white" aria-label="close">
            <X size={14} />
          </button>
        </div>
        {modal.kind === "prompt" && (
          <>
            <input
              ref={inputRef}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={modal.placeholder || ""}
              className="input"
              onKeyDown={(e) => {
                if (e.key === "Enter" && val.trim()) {
                  modal.onSubmit(val.trim());
                  close();
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={close} className="btn">cancel</button>
              <button
                onClick={() => {
                  if (val.trim()) {
                    modal.onSubmit(val.trim());
                    close();
                  }
                }}
                disabled={!val.trim()}
                className="btn btn-primary disabled:opacity-50"
              >
                ok
              </button>
            </div>
          </>
        )}
        {modal.kind === "confirm" && (
          <>
            {modal.body && <p className="text-[13px] text-[var(--text-dim)] mb-4">{modal.body}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={close} className="btn">cancel</button>
              <button
                onClick={() => {
                  modal.onConfirm();
                  close();
                }}
                className={`btn ${modal.danger ? "" : "btn-primary"}`}
                style={modal.danger ? { background: "var(--red)", borderColor: "var(--red)", color: "white" } : undefined}
              >
                {modal.danger ? "delete" : "confirm"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
