---
title: Mnemosyne
tags: [meta, system]
sources: []
updated: 2026-05-27
---

> Mnemosyne is a personal knowledge OS — a local-first AI memory wiki powered by [[ollama]].

## What it is

A web application that behaves like a small operating system for your knowledge:

- **Wiki** of interlinked markdown pages, curated by an LLM.
- **RAG chat** that retrieves cited context before answering.
- **Multi-agent swarm** running in parallel: ingest, lint, browser, file scan.
- **3D galaxy** view of the page graph.
- **File access** sandboxed to chosen desktop roots.
- **MCP** client to plug in external tools.

## Layers

1. **Collect** — connectors and file ingestion populate raw context.
2. **Connect** — embeddings + LLM compile sources into [[wiki-pages]] with [[citations]].
3. **Recall** — chat, graph, predictive surfacing.

See also: [[karpathy-llm-wiki]], [[ollama]], [[rag-pipeline]].
