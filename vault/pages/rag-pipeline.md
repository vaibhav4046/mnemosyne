---
title: RAG Pipeline
tags: [architecture, rag]
sources: []
updated: 2026-05-27
---

> How retrieval-augmented generation works inside [[mnemosyne]].

## Steps

1. **Ingest** — text is chunked (800 char, 120 overlap).
2. **Embed** — each chunk is embedded with `nomic-embed-text` via [[ollama]].
3. **Store** — vectors written to `data/vectors.json` with source/title metadata.
4. **Retrieve** — at query time, cosine-similar top-k chunks are pulled.
5. **Generate** — context + question sent to chat model, streamed back as SSE.
6. **Cite** — sources displayed inline as chips.

The wiki layer adds a second context: page titles and tags are also passed to the model so it can link with `[[wiki-slug]]` cross-refs.
