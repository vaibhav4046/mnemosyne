---
title: Own Wiki
tags:
  - meta
  - system
sources: []
updated: '2026-05-27T11:00:00.000Z'
---

> Own Wiki is a personal knowledge OS — a local-first self-improving AI memory wiki powered by [[ollama]].

## What it is

A desktop-class web application that behaves like a small operating system for your knowledge.

- **Wiki** of interlinked Markdown pages, curated by a local LLM.
- **RAG chat** that retrieves cited context before answering.
- **Multi-step browser agent** (Playwright) that takes natural-language tasks and works the web on your behalf.
- **Swarm intelligence** — parallel agents whose outputs are synthesised into a single wiki page.
- **Self-improving loop** — background ticker enriches sparse pages and applies link suggestions.
- **File access** sandboxed to chosen desktop roots.
- **MCP** client to plug in external tools.

## Three layers

1. **Collect** — connectors and file ingestion populate raw context.
2. **Connect** — embeddings + LLM compile sources into [[wiki-pages]] with [[citations]].
3. **Recall** — chat, 3D galaxy, predictive surfacing.

See also: [[karpathy-llm-wiki]], [[ollama]], [[rag-pipeline]], [[browser-agent]], [[swarm-intelligence]].
