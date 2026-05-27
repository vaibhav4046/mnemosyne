"use client";
import { create } from "zustand";
import { nanoid } from "nanoid";

export type View = "chat" | "wiki" | "graph" | "files" | "agents" | "mcp" | "settings";

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: { source: string; title: string; score: number }[];
  attachments?: { name: string; kind: string; chars: number }[];
  streaming?: boolean;
  error?: string;
  t?: string;
};

export type Thread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatTurn[];
};

export type Toast = { id: string; kind: "info" | "success" | "warn" | "error"; msg: string; ttl?: number };

export type ModalRequest =
  | { kind: "prompt"; title: string; placeholder?: string; defaultValue?: string; onSubmit: (v: string) => void }
  | { kind: "confirm"; title: string; body?: string; danger?: boolean; onConfirm: () => void };

type State = {
  view: View;
  setView: (v: View) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (b: boolean) => void;

  threads: Thread[];
  currentThreadId: string | null;
  newThread: () => string;
  switchThread: (id: string) => void;
  deleteThread: (id: string) => void;
  renameThread: (id: string, title: string) => void;
  appendToCurrent: (t: ChatTurn) => void;
  updateInCurrent: (id: string, patch: Partial<ChatTurn>) => void;
  clearCurrent: () => void;

  selectedSlug: string | null;
  setSelectedSlug: (s: string | null) => void;

  modelInfo: {
    host: string;
    chatModel: string;
    embedModel: string;
    models: string[];
    online: boolean;
    vectorCount: number;
    sources: string[];
  } | null;
  setModelInfo: (m: State["modelInfo"]) => void;

  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;

  modal: ModalRequest | null;
  openModal: (r: ModalRequest) => void;
  closeModal: () => void;

  paletteOpen: boolean;
  setPaletteOpen: (b: boolean) => void;
};

const STORE_KEY = "ow.threads.v2";
const LEGACY_KEY = "mn.chats.v1";

type Persist = { threads: Thread[]; currentThreadId: string | null };

function load(): Persist {
  if (typeof window === "undefined") return { threads: [], currentThreadId: null };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // migrate legacy single-thread chats
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const chats = JSON.parse(legacy) as ChatTurn[];
      if (Array.isArray(chats) && chats.length) {
        const id = nanoid(8);
        const thread: Thread = {
          id,
          title: chats[0]?.content?.slice(0, 50) || "Imported thread",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: chats,
        };
        return { threads: [thread], currentThreadId: id };
      }
    }
  } catch {}
  return { threads: [], currentThreadId: null };
}

function persist(s: Persist) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ threads: s.threads.slice(-40), currentThreadId: s.currentThreadId }));
  } catch {}
}

function newThreadObj(): Thread {
  const now = new Date().toISOString();
  return { id: nanoid(8), title: "New thread", createdAt: now, updatedAt: now, messages: [] };
}

const initial = typeof window !== "undefined" ? load() : { threads: [], currentThreadId: null };

export const useStore = create<State>((set, get) => ({
  view: "chat",
  setView: (v) => set({ view: v, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (b) => set({ sidebarOpen: b }),

  threads: initial.threads,
  currentThreadId: initial.currentThreadId,
  newThread: () => {
    const t = newThreadObj();
    set((s) => {
      const threads = [...s.threads, t];
      persist({ threads, currentThreadId: t.id });
      return { threads, currentThreadId: t.id };
    });
    return t.id;
  },
  switchThread: (id) => set((s) => {
    persist({ threads: s.threads, currentThreadId: id });
    return { currentThreadId: id };
  }),
  deleteThread: (id) => set((s) => {
    const threads = s.threads.filter((t) => t.id !== id);
    const cur = s.currentThreadId === id ? (threads[threads.length - 1]?.id ?? null) : s.currentThreadId;
    persist({ threads, currentThreadId: cur });
    return { threads, currentThreadId: cur };
  }),
  renameThread: (id, title) => set((s) => {
    const threads = s.threads.map((t) => (t.id === id ? { ...t, title, updatedAt: new Date().toISOString() } : t));
    persist({ threads, currentThreadId: s.currentThreadId });
    return { threads };
  }),
  appendToCurrent: (m) => set((s) => {
    let { currentThreadId, threads } = s;
    if (!currentThreadId) {
      const t = newThreadObj();
      threads = [...threads, t];
      currentThreadId = t.id;
    }
    threads = threads.map((t) =>
      t.id === currentThreadId
        ? { ...t, messages: [...t.messages, { ...m, t: new Date().toISOString() }], updatedAt: new Date().toISOString() }
        : t,
    );
    persist({ threads, currentThreadId });
    return { threads, currentThreadId };
  }),
  updateInCurrent: (id, patch) => set((s) => {
    if (!s.currentThreadId) return {};
    const threads = s.threads.map((t) =>
      t.id === s.currentThreadId
        ? { ...t, messages: t.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)), updatedAt: new Date().toISOString() }
        : t,
    );
    persist({ threads, currentThreadId: s.currentThreadId });
    return { threads };
  }),
  clearCurrent: () => set((s) => {
    if (!s.currentThreadId) return {};
    const threads = s.threads.map((t) => (t.id === s.currentThreadId ? { ...t, messages: [] } : t));
    persist({ threads, currentThreadId: s.currentThreadId });
    return { threads };
  }),

  selectedSlug: null,
  setSelectedSlug: (s) => set({ selectedSlug: s }),

  modelInfo: null,
  setModelInfo: (m) => set({ modelInfo: m }),

  toasts: [],
  toast: (t) => {
    const id = nanoid(6);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), t.ttl || 4500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  modal: null,
  openModal: (r) => set({ modal: r }),
  closeModal: () => set({ modal: null }),

  paletteOpen: false,
  setPaletteOpen: (b) => set({ paletteOpen: b }),
}));

export function useCurrentThread(): Thread | null {
  return useStore((s) => s.threads.find((t) => t.id === s.currentThreadId) ?? null);
}
