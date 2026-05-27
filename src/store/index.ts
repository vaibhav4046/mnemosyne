"use client";
import { create } from "zustand";

export type View = "chat" | "wiki" | "graph" | "files" | "agents" | "mcp" | "settings";

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: { source: string; title: string; score: number }[];
  streaming?: boolean;
};

type State = {
  view: View;
  setView: (v: View) => void;
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
};

export const useStore = create<State>((set) => ({
  view: "chat",
  setView: (v) => set({ view: v }),
  chats: [],
  appendChat: (t) => set((s) => ({ chats: [...s.chats, t] })),
  updateChat: (id, patch) =>
    set((s) => ({ chats: s.chats.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  clearChats: () => set({ chats: [] }),
  selectedSlug: null,
  setSelectedSlug: (s) => set({ selectedSlug: s }),
  modelInfo: null,
  setModelInfo: (m) => set({ modelInfo: m }),
}));
