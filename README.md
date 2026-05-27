# Mnemosyne

**A local-first personal knowledge OS — your own Wikipedia, curated by a local LLM.**

Mnemosyne is a web application (not a static site) that runs a small Operating-System-like environment for your knowledge. The LLM is the librarian: it ingests sources, writes and maintains an interlinked Markdown wiki, retrieves cited context for chat, and runs background agents in parallel — all on your own machine via [Ollama](https://ollama.com).

Inspired by Andrej Karpathy's "LLM Wiki" pattern and the recall surfaces of [Qyntra](https://qyntra-app.vercel.app/), Mnemosyne combines a plain-Markdown vault, a vector-RAG layer, a 3D galaxy graph, and a multi-agent swarm into a single dark, sleek workspace.

---

## Screenshots

| Chat (streaming RAG with citations) | Wiki (interlinked Markdown pages) |
| --- | --- |
| ![chat](docs/screenshots/01-chat.png) | ![wiki](docs/screenshots/02-wiki.png) |

| Galaxy (3D force graph of links) | Files (sandboxed desktop ingestion) |
| --- | --- |
| ![graph](docs/screenshots/03-graph.png) | ![files](docs/screenshots/04-files.png) |

| Agents (parallel swarm dashboard) | MCP servers (plug in tools) |
| --- | --- |
| ![agents](docs/screenshots/05-agents.png) | ![mcp](docs/screenshots/06-mcp.png) |

| Settings (introspection of the stack) |
| --- |
| ![settings](docs/screenshots/07-settings.png) |

---

## Features

- **Streaming RAG chat** — every answer is grounded in cosine-retrieved context from your local vector store; citations rendered inline as chips.
- **Wiki as code** — `vault/pages/*.md` files with YAML front-matter and `[[wiki-slug]]` cross-references. Open in any editor.
- **LLM curator** — ingesting a source spawns an agent that summarises, writes/updates 1-4 pages, links them, rebuilds the index, and appends a log entry.
- **Parallel agent swarm** — runs ingest, lint, file-scan, query, and Playwright-driven browser agents under a single in-process queue with live SSE updates.
- **3D Galaxy** — every `[[link]]` becomes an edge in a `react-force-graph-3d` scene; nodes are colour-coded by tag, click jumps to the page.
- **Sandboxed desktop ingest** — a path-jailed filesystem layer exposes your Desktop / Documents / Downloads as roots; one click sends a file through `pdf-parse` / `mammoth` and into the wiki.
- **MCP client** — connect any stdio MCP server (filesystem, fetch, custom) and expose its tools to the agents.
- **Local-first by default** — Ollama runs at `127.0.0.1:11434`; no keys, no telemetry, no cloud.

---

## Architecture

```
+--------------------+        +--------------------+
|   Next.js shell    | <----- |     Zustand        |
|  (App Router, RSC) |        |  view + chat store |
+----------+---------+        +--------------------+
           |
           |  fetch/SSE
           v
+--------------------+        +-----------------------------+
|     API routes     | -----> |  Agent registry (p-queue)   |
|   /api/chat (SSE)  |        |  ingest · lint · query ·    |
|   /api/ingest      |        |  browser · file · MCP       |
|   /api/wiki[/slug] |        +--------------+--------------+
|   /api/agents/...  |                       |
|   /api/files       |          +------------+-------------+
|   /api/mcp         |          |                          |
|   /api/models      |          v                          v
+--------------------+     +---------+              +-------------+
                           |  Wiki   |              |   Vector    |
                           | vault/  |              |  store      |
                           |   *.md  |              | JSON+cosine |
                           +---------+              +-------------+
                                |                          ^
                                |                          |
                                v                          |
                           +----------+              +-----------+
                           |  Ollama  |  embed/chat  |  chunker  |
                           |  HTTP    |<-------------+           |
                           +----------+              +-----------+
                                ^
                                |
                          +-----+------+
                          | Playwright |
                          | (chromium) |
                          +------------+
```

---

## Tech stack & why

| Layer | Choice | Reason |
| --- | --- | --- |
| Framework | **Next.js 15 (App Router, Turbopack)** | One process serves UI + server actions + SSE. Server components keep the bundle small while still letting us call `node:fs` and `playwright` server-side. |
| UI | **React 19 + Tailwind 4** | Streaming-friendly, lets us drive token-level updates without ceremony. Tailwind 4 gives us CSS variables for the dark theme with no class bloat. |
| State | **Zustand** | Minimal store, no provider boilerplate, plays nicely with selector subscriptions for live agent updates. |
| Icons | **lucide-react** | Crisp single-file SVG icons that match the dark aesthetic. |
| Markdown | **react-markdown + remark-gfm + gray-matter** | Standard pipeline; gray-matter parses YAML front-matter so the wiki layer can read/write the same files an editor would. |
| 3D viz | **react-force-graph-3d + three.js** | The "galaxy" view of the wiki — Qyntra's signature recall surface — rendered with WebGL for thousands of nodes at 60fps. |
| LLM | **Ollama (`llama3.2:3b` chat, `nomic-embed-text` embed)** | Free, local, fast on a laptop; no API keys; streaming over loopback is sub-100ms TTFT. |
| Vector store | **JSON file + cosine similarity (in-memory cache)** | Zero native deps (no `better-sqlite3` build pain on Windows), portable across machines. Adequate for tens of thousands of chunks; swap for sqlite-vec or LanceDB later. |
| Concurrency | **p-queue** | Tiny, dependable parallel queue with a single concurrency knob — perfect for an agent swarm. |
| Browser agent | **Playwright (headless chromium)** | Mature DOM access + screenshots; the agent loads a URL, summarises the main content with the local LLM, and returns the screenshot inline. |
| File parsers | **pdf-parse, mammoth** | PDF and `.docx` ingestion; plain-text fallback for everything else. |
| Tool protocol | **`@modelcontextprotocol/sdk`** | Standard stdio MCP client — drop in `@modelcontextprotocol/server-filesystem`, `server-fetch`, or anything custom. |

---

## Vault schema

```
vault/
├── CLAUDE.md          ← schema + conventions for the LLM curator
├── index.md           ← auto-rebuilt catalog of pages
├── log.md             ← append-only ledger of ingests/queries/lints
└── pages/
    ├── mnemosyne.md
    ├── ollama.md
    ├── karpathy-llm-wiki.md
    └── ...            ← one page per atomic concept
```

Each page has YAML front-matter:

```yaml
---
title: Display title
tags: [list, of, tags]
sources: [source-id-1, source-id-2]
updated: 2026-05-27T00:00:00.000Z
---
```

Cross-references use `[[slug]]` and become edges in the galaxy.

---

## Running it

### Prerequisites

- Node 20+
- [Ollama](https://ollama.com) running locally
- Models pulled:
  ```bash
  ollama pull llama3.2:3b
  ollama pull nomic-embed-text
  ```

### Start

```bash
npm install
npx playwright install chromium     # for the browser agent
npm run dev                          # http://localhost:3500
```

Open `http://localhost:3500`. The status bar should read **ollama live · llama3.2:3b · nomic-embed-text**.

### Try it

1. **Files** → pick a PDF from Desktop → click `ingest`. An ingest agent embeds, summarises, and writes wiki pages.
2. **Chat** → ask a question about the document. Citations appear as chips.
3. **Wiki** → see the new pages. `[[wikilinks]]` are clickable.
4. **Graph** → watch the page appear in the 3D galaxy.
5. **Agents** → hit `launch swarm` to fan out three parallel jobs (lint + two browser scans).
6. **MCP** → add a stdio MCP server and expose its tools.

### Environment

```bash
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_CHAT_MODEL=llama3.2:3b
OLLAMA_EMBED_MODEL=nomic-embed-text
MNEMOSYNE_VAULT=./vault
```

---

## Project layout

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts             SSE-streamed RAG chat
│   │   ├── ingest/route.ts           queues an ingest agent
│   │   ├── wiki/route.ts             list + graph
│   │   ├── wiki/[slug]/route.ts      GET / PUT / DELETE a page
│   │   ├── agents/route.ts           spawn + list jobs
│   │   ├── agents/stream/route.ts    SSE feed of agent updates
│   │   ├── files/route.ts            sandboxed FS browser
│   │   ├── mcp/route.ts              MCP server CRUD + connect
│   │   └── models/route.ts           Ollama + vector store status
│   ├── layout.tsx · globals.css      dark theme + animations
│   └── page.tsx                      mounts <Shell />
├── components/                       shell, sidebar, panels, status-bar
├── lib/
│   ├── ollama.ts                     chat / embed / generateJSON
│   ├── vector.ts                     JSON-backed cosine store
│   ├── wiki.ts                       parse / write / link Markdown pages
│   ├── fs.ts                         sandboxed FS + PDF/docx extractors
│   ├── agents/
│   │   ├── registry.ts               in-process p-queue + SSE pub/sub
│   │   ├── ingest.ts · lint.ts · browser.ts · file.ts · query.ts
│   │   └── types.ts · index.ts
│   └── mcp/client.ts                 stdio MCP client wrapper
└── store/index.ts                    Zustand
```

---

## Roadmap

- swap JSON vector store for `sqlite-vec` once Windows build pipeline is sorted
- `chokidar` watcher on `vault/` for live reloading the graph
- WebRTC-based pair sessions for shared wikis
- inline RAG sources panel on every page
- per-agent permission scopes for the MCP layer

---

## Credits

- [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the LLM Wiki pattern.
- [Qyntra](https://qyntra-app.vercel.app/) — Collect/Connect/Recall framing and the galaxy view.
- [Ollama](https://ollama.com) — making local LLMs ergonomic.

---

MIT.
