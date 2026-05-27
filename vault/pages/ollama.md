---
title: Ollama
tags:
  - LLM
  - Ollama
  - Inference
sources:
  - about-mnemosyne
updated: '2026-05-27T10:14:16.733Z'
---
> Local LLM runtime. Mnemosyne talks to it over HTTP at `http://127.0.0.1:11434`.

## Models used

- **Chat**: `llama3.2:3b` (fast, ~2GB)
- **Embeddings**: `nomic-embed-text` (768-dim)

## Why local

- No API keys, no per-token cost.
- Private — nothing leaves the machine.
- Streaming is fast over loopback.

See [[mnemosyne]], [[rag-pipeline]].

---

_Updated from [[about-mnemosyne]]_

Ollama is a tool for local LLM inference.
