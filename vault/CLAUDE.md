# Wiki Schema

This is the Mnemosyne personal knowledge vault. The LLM curates these pages.

## Conventions
- Every page lives in `pages/<slug>.md`.
- Front-matter: `title, tags, sources, links, updated`.
- Cross-references use `[[wiki-slug]]` syntax.
- The agent maintains `index.md` (catalog) and `log.md` (append-only ledger).

## Operations
- **Ingest**: agent reads a source, summarises, creates/updates pages, logs.
- **Query**: chat retrieves cited context from pages + raw sources.
- **Lint**: agent sweeps for contradictions, stale claims, orphans.
- **Maintain**: continuous consistency + cross-ref updates.
