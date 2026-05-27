"use client";
import { useStore } from "@/store";
import { CheckCircle2, AlertCircle, XCircle, Info, X } from "lucide-react";

const icons = {
  info: Info,
  success: CheckCircle2,
  warn: AlertCircle,
  error: XCircle,
};

const colors = {
  info: "text-[var(--accent-2)]",
  success: "text-[var(--green)]",
  warn: "text-[var(--amber)]",
  error: "text-[var(--red)]",
};

export function ToastStack() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div className="fixed bottom-12 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const Icon = icons[t.kind];
        return (
          <div
            key={t.id}
            className="glass-strong rounded-lg px-3.5 py-2.5 text-[12.5px] flex items-start gap-2.5 shadow-2xl pointer-events-auto animate-[slideUp_.2s_ease]"
            role="status"
          >
            <Icon size={14} className={`shrink-0 mt-0.5 ${colors[t.kind]}`} />
            <span className="flex-1 leading-snug">{t.msg}</span>
            <button onClick={() => dismiss(t.id)} className="text-[var(--text-faint)] hover:text-white" aria-label="dismiss">
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
