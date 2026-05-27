// Fixture data for Mnemosyne mockups

const NOW = new Date('2026-05-27T14:32:00Z');

const PAGES = [
  { slug: 'mnemosyne', title: 'Mnemosyne', tags: ['root', 'system'], links: ['ollama','wiki-protocol','vector-store','rag','galaxy-graph','karpathy-llm-wiki'], updated: '2026-05-27', refs: 12, kind: 'concept' },
  { slug: 'ollama', title: 'Ollama', tags: ['runtime', 'local-llm'], links: ['llama3-2','nomic-embed','mnemosyne','playwright-agent'], updated: '2026-05-26', refs: 8, kind: 'tool' },
  { slug: 'llama3-2', title: 'llama3.2 (3B)', tags: ['model', 'chat'], links: ['ollama','rag','prompt-template'], updated: '2026-05-25', refs: 6, kind: 'model' },
  { slug: 'nomic-embed', title: 'nomic-embed-text', tags: ['model','embedding'], links: ['ollama','vector-store','cosine-similarity'], updated: '2026-05-25', refs: 5, kind: 'model' },
  { slug: 'rag', title: 'Retrieval-augmented generation', tags: ['pattern','chat'], links: ['vector-store','llama3-2','cosine-similarity','citations'], updated: '2026-05-26', refs: 11, kind: 'concept' },
  { slug: 'vector-store', title: 'Vector store', tags: ['storage','search'], links: ['rag','cosine-similarity','nomic-embed','chunker'], updated: '2026-05-26', refs: 9, kind: 'concept' },
  { slug: 'cosine-similarity', title: 'Cosine similarity', tags: ['math','search'], links: ['vector-store','rag'], updated: '2026-05-20', refs: 4, kind: 'concept' },
  { slug: 'galaxy-graph', title: 'Galaxy graph', tags: ['viz','ui'], links: ['mnemosyne','wikilinks','force-graph'], updated: '2026-05-22', refs: 7, kind: 'feature' },
  { slug: 'wiki-protocol', title: 'Wiki protocol', tags: ['system','authoring'], links: ['mnemosyne','wikilinks','front-matter','curator-agent'], updated: '2026-05-24', refs: 10, kind: 'concept' },
  { slug: 'wikilinks', title: 'Wikilinks', tags: ['syntax'], links: ['wiki-protocol','galaxy-graph'], updated: '2026-05-22', refs: 6, kind: 'concept' },
  { slug: 'curator-agent', title: 'Curator agent', tags: ['agent','ingest'], links: ['wiki-protocol','ingest-pipeline','llama3-2'], updated: '2026-05-26', refs: 8, kind: 'agent' },
  { slug: 'ingest-pipeline', title: 'Ingest pipeline', tags: ['agent','pipeline'], links: ['curator-agent','pdf-parse','vector-store'], updated: '2026-05-25', refs: 7, kind: 'concept' },
  { slug: 'playwright-agent', title: 'Playwright agent', tags: ['agent','browser'], links: ['mnemosyne','swarm-queue'], updated: '2026-05-23', refs: 4, kind: 'agent' },
  { slug: 'swarm-queue', title: 'Swarm queue (p-queue)', tags: ['agent','runtime'], links: ['playwright-agent','curator-agent','sse-bus'], updated: '2026-05-21', refs: 5, kind: 'concept' },
  { slug: 'sse-bus', title: 'SSE event bus', tags: ['runtime','transport'], links: ['swarm-queue','mnemosyne'], updated: '2026-05-20', refs: 3, kind: 'concept' },
  { slug: 'karpathy-llm-wiki', title: 'Karpathy — LLM wiki', tags: ['source','essay'], links: ['mnemosyne','wiki-protocol'], updated: '2026-05-19', refs: 4, kind: 'source' },
  { slug: 'qyntra', title: 'Qyntra — Collect Connect Recall', tags: ['source','prior-art'], links: ['mnemosyne','galaxy-graph'], updated: '2026-05-18', refs: 3, kind: 'source' },
  { slug: 'mcp-protocol', title: 'Model Context Protocol', tags: ['protocol','tool'], links: ['mnemosyne','tool-call'], updated: '2026-05-15', refs: 5, kind: 'concept' },
  { slug: 'tool-call', title: 'Tool calling', tags: ['agent','pattern'], links: ['mcp-protocol','llama3-2'], updated: '2026-05-14', refs: 4, kind: 'concept' },
  { slug: 'chunker', title: 'Chunker', tags: ['ingest'], links: ['ingest-pipeline','vector-store'], updated: '2026-05-12', refs: 3, kind: 'concept' },
  { slug: 'pdf-parse', title: 'pdf-parse', tags: ['parser','tool'], links: ['ingest-pipeline'], updated: '2026-05-12', refs: 2, kind: 'tool' },
  { slug: 'front-matter', title: 'YAML front-matter', tags: ['syntax'], links: ['wiki-protocol'], updated: '2026-05-10', refs: 2, kind: 'concept' },
  { slug: 'citations', title: 'Inline citations', tags: ['ui','rag'], links: ['rag','mnemosyne'], updated: '2026-05-15', refs: 6, kind: 'concept' },
  { slug: 'force-graph', title: 'react-force-graph-3d', tags: ['tool','viz'], links: ['galaxy-graph'], updated: '2026-05-22', refs: 2, kind: 'tool' },
  { slug: 'prompt-template', title: 'System prompt — curator', tags: ['prompt'], links: ['curator-agent','llama3-2'], updated: '2026-05-21', refs: 3, kind: 'prompt' },
];

const TAG_COLORS = {
  system:   '#5ce0d8',
  concept:  '#5ce0d8',
  tool:     '#c9a86a',
  model:    '#c8685a',
  agent:    '#7cc49b',
  source:   '#a08adf',
  feature:  '#e0b45c',
  prompt:   '#c8685a',
};

const FILES = [
  { name: 'karpathy-llm-os.pdf', kind: 'pdf', size: '1.2 MB', mod: '2 days ago', status: 'ingested', pages: 14 },
  { name: 'qyntra-recall-paper.pdf', kind: 'pdf', size: '847 KB', mod: '3 days ago', status: 'ingested', pages: 9 },
  { name: 'ollama-cookbook.md', kind: 'md', size: '24 KB', mod: '5 hours ago', status: 'ingested' },
  { name: 'mcp-spec-draft.docx', kind: 'docx', size: '312 KB', mod: '1 hour ago', status: 'queued' },
  { name: 'force-graph-notes.txt', kind: 'txt', size: '8 KB', mod: '6 days ago', status: 'ingested' },
  { name: 'vector-stores-benchmark.csv', kind: 'csv', size: '142 KB', mod: '1 week ago', status: 'failed' },
  { name: 'log-2026-05-12.md', kind: 'md', size: '12 KB', mod: '2 weeks ago', status: 'ingested' },
  { name: 'observation-screenshots/', kind: 'folder', size: '— ', mod: 'today', status: '—', isFolder: true },
  { name: 'ingestion-rules.md', kind: 'md', size: '4 KB', mod: '3 hours ago', status: 'ingested' },
  { name: 'untitled-draft.md', kind: 'md', size: '< 1 KB', mod: 'today', status: 'skipped' },
];

const ROOTS = [
  { name: 'Desktop', path: '~/Desktop', icon: 'desktop', count: 124 },
  { name: 'Documents', path: '~/Documents', icon: 'folder', count: 412 },
  { name: 'Downloads', path: '~/Downloads', icon: 'download', count: 1847 },
  { name: 'Inbox', path: '~/Mnemosyne/inbox', icon: 'upload', count: 7 },
];

const AGENTS = [
  { id: 'a-01', kind: 'ingest',   label: 'karpathy-llm-os.pdf',  sub: 'extract → chunk → embed → write 3 pages',   state: 'running', progress: 64, time: '00:42' },
  { id: 'a-02', kind: 'browser',  label: 'mcp.context.dev/spec', sub: 'playwright · main-content extract',         state: 'running', progress: 22, time: '00:18' },
  { id: 'a-03', kind: 'lint',     label: 'vault/',               sub: 'broken wikilinks · dead front-matter',      state: 'running', progress: 81, time: '00:09' },
  { id: 'a-04', kind: 'query',    label: '"cosine vs dot product"', sub: 'top-12 chunks · rerank',                state: 'done',    progress: 100, time: '00:04' },
  { id: 'a-05', kind: 'ingest',   label: 'mcp-spec-draft.docx',  sub: 'queued · concurrency limit (3)',            state: 'queued',  progress: 0,  time: '—' },
  { id: 'a-06', kind: 'browser',  label: 'qyntra-app.vercel.app',sub: 'screenshot + summarise main',               state: 'failed',  progress: 30, time: '00:08' },
  { id: 'a-07', kind: 'file',     label: '~/Documents/notes/',   sub: 'scan · index · 47 new files found',          state: 'done',    progress: 100, time: '00:32' },
];

const MCP_SERVERS = [
  { name: 'filesystem', pkg: '@modelcontextprotocol/server-filesystem', tools: ['list','read','write','watch'], state: true, color: 'cyan', desc: 'Sandboxed read/write under jailed roots. Exposes Desktop, Documents, and the vault to agents.' },
  { name: 'fetch', pkg: '@modelcontextprotocol/server-fetch', tools: ['http.get','http.post','headers'], state: true, color: 'brass', desc: 'HTTP client with strict allow-list. Used by the browser agent for non-Playwright fetches.' },
  { name: 'sqlite', pkg: '@modelcontextprotocol/server-sqlite', tools: ['query','schema','exec'], state: false, color: 'mars', desc: 'Read-only SQLite adapter. Mount any database file and query it from chat.' },
  { name: 'git-log', pkg: 'mnemosyne/mcp-git', tools: ['log','blame','diff','show'], state: true, color: 'cyan', desc: 'Local git introspection. Surfaces commit history as ingestible source notes.' },
];

const PALETTE_ITEMS = [
  { section: 'Navigate', items: [
    { ic: 'chat',     label: 'Chat',          sub: 'Streaming RAG',     kbd: '⌘1' },
    { ic: 'book',     label: 'Wiki',          sub: '24 pages',          kbd: '⌘2' },
    { ic: 'galaxy',   label: 'Galaxy',        sub: '3D graph',          kbd: '⌘3' },
    { ic: 'files',    label: 'Files',         sub: '4 roots',           kbd: '⌘4' },
    { ic: 'agents',   label: 'Agents',        sub: '3 running',         kbd: '⌘5' },
  ]},
  { section: 'Actions', items: [
    { ic: 'upload',   label: 'Ingest a file…',     sub: 'PDF, DOCX, MD',    kbd: '⌘I' },
    { ic: 'edit',     label: 'New wiki page…',     sub: 'vault/pages/',     kbd: '⌘N' },
    { ic: 'play',     label: 'Launch swarm',       sub: 'Three parallel jobs', kbd: '⌘L' },
    { ic: 'refresh',  label: 'Re-index vault',     sub: 'rebuild vector store', kbd: '⌘R' },
  ]},
  { section: 'Jump to page', items: [
    { ic: 'star',     label: 'mnemosyne',          sub: 'root · 12 refs' },
    { ic: 'star',     label: 'galaxy-graph',       sub: 'feature · 7 refs' },
    { ic: 'star',     label: 'curator-agent',      sub: 'agent · 8 refs' },
  ]},
];

const SUGGESTIONS = [
  { kind: 'Recall',  q: 'What does Karpathy say about the LLM as a librarian?' },
  { kind: 'Cross-link',  q: 'How does the curator agent decide when to fork a page?' },
  { kind: 'Define',  q: 'Explain cosine similarity in the context of the vector store.' },
  { kind: 'Survey',  q: 'Summarise everything I have on local-first inference.' },
];

window.MDATA = { PAGES, TAG_COLORS, FILES, ROOTS, AGENTS, MCP_SERVERS, PALETTE_ITEMS, SUGGESTIONS, NOW };
