import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./paths";

export type ProviderId = "ollama" | "groq" | "gemini" | "openrouter";

export type Settings = {
  provider: ProviderId;
  models: Partial<Record<ProviderId, string>>;
  keys: Partial<Record<Exclude<ProviderId, "ollama">, string>>;
  fallback: ProviderId[];
};

const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  ollama: "llama3.2:3b",
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.0-flash",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
};

const DEFAULTS: Settings = {
  provider: "ollama",
  models: { ...DEFAULT_MODELS },
  keys: {},
  fallback: ["ollama", "groq", "gemini", "openrouter"],
};

let cache: Settings | null = null;

function sanitize(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Settings>;
  const provider: ProviderId = (["ollama", "groq", "gemini", "openrouter"] as const).includes(r.provider as ProviderId)
    ? (r.provider as ProviderId)
    : "ollama";
  const models = { ...DEFAULT_MODELS, ...(r.models && typeof r.models === "object" ? r.models : {}) };
  const keysIn = r.keys && typeof r.keys === "object" ? (r.keys as Record<string, unknown>) : {};
  const keys: Settings["keys"] = {};
  for (const k of ["groq", "gemini", "openrouter"] as const) {
    if (typeof keysIn[k] === "string" && (keysIn[k] as string).trim()) keys[k] = (keysIn[k] as string).trim();
  }
  const fallback = Array.isArray(r.fallback)
    ? (r.fallback.filter((p) => ["ollama", "groq", "gemini", "openrouter"].includes(p)) as ProviderId[])
    : DEFAULTS.fallback;
  return { provider, models, keys, fallback: fallback.length ? fallback : DEFAULTS.fallback };
}

export async function readSettings(): Promise<Settings> {
  if (cache) return cache;
  try {
    const raw = JSON.parse(await fs.readFile(SETTINGS_PATH, "utf8"));
    cache = sanitize(raw);
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export async function writeSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = await readSettings();
  const next = sanitize({
    ...cur,
    ...patch,
    models: { ...cur.models, ...(patch.models || {}) },
    keys: { ...cur.keys, ...(patch.keys || {}) },
  });
  cache = next;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2));
  return next;
}

export async function clearKey(id: "groq" | "gemini" | "openrouter"): Promise<Settings> {
  const cur = await readSettings();
  const keys = { ...cur.keys };
  delete keys[id];
  const next: Settings = sanitize({ ...cur, keys });
  // sanitize drops missing keys; assign explicitly then persist verbatim.
  next.keys = keys;
  cache = next;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2));
  return next;
}

/** Mask keys for any client-facing response — never leak full secrets. */
export function publicView(s: Settings) {
  const mask = (v?: string) => (v ? `••••••••${v.slice(-4)}` : "");
  return {
    provider: s.provider,
    models: s.models,
    fallback: s.fallback,
    keys: {
      groq: mask(s.keys.groq),
      gemini: mask(s.keys.gemini),
      openrouter: mask(s.keys.openrouter),
    },
    configured: {
      ollama: true,
      groq: !!s.keys.groq,
      gemini: !!s.keys.gemini,
      openrouter: !!s.keys.openrouter,
    },
  };
}
