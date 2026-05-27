---
title: Wiki Pages
tags: [meta]
sources: []
updated: 2026-05-27
---

> Each wiki page is a markdown file in `vault/pages/<slug>.md` with YAML front-matter.

## Schema

```yaml
title: Display title
tags: [list, of, tags]
sources: [source-ids-that-fed-this-page]
updated: ISO date
```

## Cross-references

Use `[[slug]]` inside the body. The graph builder walks these to draw the 3D galaxy.

## Index

`vault/index.md` is auto-rebuilt after every ingest.
