"use client";
import { create } from "zustand";
import { nanoid } from "nanoid";

export type View = "chat" | "wiki" | "graph" | "files" | "agents" | "mcp" | "settings";

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: { source: string; title: string; score: number }[];
  streaming?: boolean;
  error?: string;
};

export type Toast = {
  id: string;
  kind: "info" | "success" | "warn" | "error";
  msg: string;
  ttl?: number;
};

export type ModalRequest =
  | { kind: "prompt"; title: string; placeholder?: string; defaultValue?: string; onSubmit: (v: string) => void }
  | { kind: "confirm"; title: string; body?: string; danger?: boolean; onConfirm: () => void };

type State = {
  view: View;
  setView: (v: View) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (b: boolean) => void;
  chats: ChatTurn[];
  appendChat: (t: ChatTurn) => void;
  updateChat: (id: string, patch: Partial<ChatTurn>) => void;
  clearChats: () => void;
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

const CHAT_KEY = "mn.chats.v1";

function loadChats(): ChatTurn[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistChats(chats: ChatTurn[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(chats.slice(-200)));
  } catch {}
}

export const useStore = create<State>((set, get) => ({
  view: "chat",
  setView: (v) => set({ view: v, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (b) => set({ sidebarOpen: b }),
  chats: typeof window !== "undefined" ? loadChats() : [],
  appendChat: (t) => set((s) => {
    const next = [...s.chats, t];
    persistChats(next);
    return { chats: next };
  }),
  updateChat: (id, patch) =>
    set((s) => {
      const next = s.chats.map((c) => (c.id === id ? { ...c, ...patch } : c));
      persistChats(next);
      return { chats: next };
    }),
  clearChats: () => {
    persistChats([]);
    set({ chats: [] });
  },
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
