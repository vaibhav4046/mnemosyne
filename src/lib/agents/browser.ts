import { chatOnce } from "../ollama";
import { assertPublicUrl } from "../validate";
import type { AgentRunner } from "./types";

export type BrowserInput = {
  url?: string;
  task: string;
  query?: string; // explicit search query (swarm passes the topic)
  maxSources?: number;
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const FETCH_TIMEOUT = 15000;

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text") && !ct.includes("html") && !ct.includes("xml")) throw new Error(`non-text (${ct})`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/** Strip HTML to readable plain text. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

type SearchHit = { title: string; url: string; snippet: string };

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** DuckDuckGo lite/html — static markup, no key. Either layout, several class names. */
async function ddgSearch(query: string, limit: number): Promise<SearchHit[]> {
  const hits: SearchHit[] = [];
  const add = (title: string, href: string) => {
    let u = href;
    const uddg = u.match(/[?&]uddg=([^&]+)/);
    if (uddg) u = decodeURIComponent(uddg[1]);
    if (u.startsWith("//")) u = "https:" + u;
    if (!/^https?:\/\//.test(u)) return;
    if (u.includes("duckduckgo.com")) return;
    const tt = htmlToText(title).slice(0, 140);
    if (tt && !hits.some((h) => h.url === u)) hits.push({ title: tt, url: u, snippet: "" });
  };
  for (const endpoint of [
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
  ]) {
    if (hits.length >= limit) break;
    try {
      const html = await fetchText(endpoint);
      // generic: any anchor whose href is a real external http(s) link or a uddg redirect
      const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) && hits.length < limit) {
        const href = m[1];
        if (href.includes("uddg=") || (/^https?:\/\//.test(href) && !href.includes("duckduckgo.com"))) {
          add(m[2], href);
        }
      }
    } catch {}
  }
  return hits.slice(0, limit);
}

/** Wikipedia REST search — always reachable, no key, no rate block. Guaranteed fallback. */
async function wikiSearch(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const data = (await fetchJson(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=${limit}&srsearch=${encodeURIComponent(query)}`,
    )) as { query?: { search?: { title: string; snippet: string }[] } };
    const results = data?.query?.search || [];
    return results.map((r) => ({
      title: r.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
      snippet: htmlToText(r.snippet || ""),
    }));
  } catch {
    return [];
  }
}

/** Multi-engine search: DDG first, Wikipedia guaranteed fallback. */
async function webSearch(query: string, limit: number): Promise<SearchHit[]> {
  let hits = await ddgSearch(query, limit);
  if (hits.length < 2) {
    const wiki = await wikiSearch(query, limit);
    const seen = new Set(hits.map((h) => h.url));
    for (const w of wiki) if (!seen.has(w.url)) hits.push(w);
  }
  return hits.slice(0, limit);
}

/**
 * Research runner: deterministic search → fetch top sources → grounded summary.
 * No LLM-driven clicking (a small local model can't do that reliably) — this is
 * what made swarm results inaccurate. Now: real search, real page text, the model
 * only summarises grounded content with citations.
 */
export const browserRunner: AgentRunner = async (job, log) => {
  const input = job.input as BrowserInput;
  const maxSources = Math.min(Math.max(input.maxSources || 4, 1), 6);
  const query = (input.query || input.task || "").trim();

  const sources: Array<{ title: string; url: string; text: string }> = [];

  // 1) Gather candidate URLs — either the given URL, or a web search.
  let candidates: SearchHit[] = [];
  if (input.url) {
    // A provided start URL must pass the SSRF guard. If it's private/loopback/
    // blocked-scheme we FAIL hard — never silently fall back to web search, or a
    // caller could probe internal hosts and the job would still "succeed".
    let safe: string;
    try {
      safe = await assertPublicUrl(input.url);
    } catch (e) {
      throw new Error(`start URL blocked: ${e instanceof Error ? e.message : e}`);
    }
    candidates.push({ title: input.url, url: safe, snippet: "" });
  }
  if (candidates.length < maxSources) {
    log(`Searching the web for: ${query}`);
    try {
      const hits = await webSearch(query, maxSources * 2);
      log(`Found ${hits.length} search results`);
      candidates = candidates.concat(hits);
    } catch (e) {
      log(`search failed: ${e instanceof Error ? e.message : e}`, "warn");
    }
  }
  if (candidates.length === 0) throw new Error("No sources found (search + URL both failed)");

  // 2) Fetch + extract each candidate (SSRF-guarded, capped). Keep per-source text
  // SHORT — a small local model degrades badly on huge dumped context.
  const PER_SOURCE = 1800;
  for (const c of candidates) {
    if (sources.length >= maxSources) break;
    try {
      const safe = await assertPublicUrl(c.url);
      const html = await fetchText(safe);
      const text = htmlToText(html).slice(0, PER_SOURCE);
      if (text.length > 120) {
        sources.push({ title: c.title || safe, url: safe, text });
        log(`✓ read ${safe} (${text.length} chars)`);
      } else {
        log(`skip ${safe} — too little text (JS app?)`, "warn");
      }
    } catch (e) {
      log(`skip ${c.url} — ${e instanceof Error ? e.message : e}`, "warn");
    }
  }
  if (sources.length === 0) throw new Error("Fetched no readable sources");

  // 3) Grounded summary — model only uses provided source text, cites [n].
  // Tight context + an imperative prompt that forbids refusals/meta-commentary,
  // which small models otherwise emit on long inputs.
  log(`Summarising ${sources.length} sources`);
  const ctx = sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.text}`).join("\n\n");
  const raw = await chatOnce([
    {
      role: "system",
      content:
        "You are a research analyst writing an encyclopedia-style brief. Use ONLY the numbered " +
        "sources. Write 2-4 dense factual paragraphs answering the task, citing sources as [n] " +
        "inline. Use concrete names, numbers, dates. Do NOT refuse, do NOT mention being an AI, " +
        "do NOT comment on the sources or the task — output only the brief itself.",
    },
    { role: "user", content: `Task: ${input.task}\n\nSOURCES:\n${ctx}\n\nWrite the brief now:` },
  ]);

  // Guard against small-model refusals / meta filler — fall back to source snippets.
  const looksBad = !raw || raw.length < 80 || /\b(i can'?t help|i cannot help|as an ai|i can help with that|you'?ve provided|it seems like)\b/i.test(raw);
  const answer = looksBad
    ? `Key points on ${query}, drawn from the sources:\n\n` +
      sources.map((s, i) => `- **${s.title}** [${i + 1}]: ${s.text.slice(0, 240).trim()}…`).join("\n")
    : raw;

  return {
    task: input.task,
    query,
    answer,
    grounded: !looksBad,
    sources: sources.map((s, i) => ({ n: i + 1, title: s.title, url: s.url })),
    sourceCount: sources.length,
  };
};
