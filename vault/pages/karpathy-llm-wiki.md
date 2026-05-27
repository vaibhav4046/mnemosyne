---
title: Karpathy LLM Wiki
tags:
  - LLM
  - Karpathy
  - Wiki
sources:
  - about-mnemosyne
updated: '2026-05-27T10:14:16.720Z'
---
> Andrej Karpathy's pattern: let an LLM act as the curator of a plain-markdown wiki, ingesting sources and continuously maintaining cross-references.

## Four operations

1. **Ingest** — drop a source, agent summarises, writes/updates pages, logs.
2. **Query** — answer with citations; valuable answers get filed back.
3. **Lint** — sweep for contradictions, stale claims, orphan pages.
4. **Maintain** — continuous consistency + cross-ref updates.

Distinct from RAG: knowledge is **persistent and compounding**, not transient retrieval.

See [[mnemosyne]], [[rag-pipeline]].

---

_Updated from [[about-mnemosyne]]_

The Karpathy LLM Wiki is a pattern for LLM-based curators.
