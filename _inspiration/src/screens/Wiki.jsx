// Wiki — index + page

const { useState: useS_wiki } = React;

function WikiSidebar({ slug, onPick }) {
  const pages = window.MDATA.PAGES;
  const groups = {
    'Pinned': ['mnemosyne','galaxy-graph','curator-agent','wiki-protocol'],
    'Recent': pages.slice().sort((a,b)=>b.updated.localeCompare(a.updated)).slice(0,6).map(p=>p.slug),
    'Tags': null,
  };

  return (
    <div className="wiki-side">
      <div className="search">
        <Icon name="search" className="ic" />
        <input className="input" placeholder="Search pages and content…" />
      </div>

      <div className="wiki-side-section">
        <div className="label">Pinned</div>
        {groups['Pinned'].map(s => {
          const p = pages.find(x => x.slug === s);
          return (
            <button key={s} className={'item ' + (slug === s ? 'active' : '')} onClick={() => onPick(s)}>
              <Icon name="star" className="ic" />
              <span>{p.title}</span>
              <span className="count">{p.refs}</span>
            </button>
          );
        })}
      </div>

      <div className="wiki-side-section">
        <div className="label">Recent</div>
        {groups['Recent'].map(s => {
          const p = pages.find(x => x.slug === s);
          return (
            <button key={s} className={'item ' + (slug === s ? 'active' : '')} onClick={() => onPick(s)}>
              <Icon name="fileText" className="ic" />
              <span>{p.title}</span>
              <span className="count">{p.refs}</span>
            </button>
          );
        })}
      </div>

      <div className="wiki-side-section">
        <div className="label">By tag</div>
        {[['concept', 9], ['agent', 4], ['tool', 4], ['model', 2], ['source', 2], ['system', 1]].map(([t, n]) => (
          <button key={t} className="item">
            <Icon name="tag" className="ic" />
            <span>{t}</span>
            <span className="count">{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WikiPage({ slug, onPick }) {
  const page = window.MDATA.PAGES.find(p => p.slug === slug) || window.MDATA.PAGES[0];
  // Render the curator-agent page as the "demo" content since it's the richest
  if (page.slug === 'curator-agent') {
    return <CuratorPage onPick={onPick} />;
  }
  return <MnemosynePage onPick={onPick} />;
}

function MnemosynePage({ onPick }) {
  return (
    <article className="wiki-page" data-screen-label="wiki-page">
      <div className="frontmatter">
        <span className="fm-tag brass">OQ-0001 · ROOT</span>
        <span className="fm-tag cyan">CONCEPT</span>
        <span className="fm-tag">SYSTEM</span>
        <span className="fm-tag mars">12 BACKLINKS</span>
        <span style={{flex:1}} />
        <span style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--ink-3)', letterSpacing:'.04em'}}>UPDATED 2026-05-27 · 14:08 UTC</span>
      </div>

      <h1>Mnemosyne — a personal knowledge OS.</h1>
      <p className="deck">A local-first workspace where a small language model acts as librarian: it reads, writes interlinked notes, and recalls them with citations — all on your machine.</p>

      <div className="lede-meta">
        <div className="col"><span className="k">Coordinates</span><span className="v">127.0.0.1 : 11434 → 3500</span></div>
        <div className="col"><span className="k">Curator</span><span className="v">llama3.2:3b · nomic-embed</span></div>
        <div className="col"><span className="k">Vault</span><span className="v">24 pages · 1,847 chunks</span></div>
        <div className="col"><span className="k">Surface</span><span className="v">chat · wiki · galaxy · swarm</span></div>
      </div>

      <div className="body">
        <p>
          Mnemosyne treats your knowledge the way an observatory treats the sky: catalogued, cross-referenced, and re-read on a schedule.
          The librarian is a 3B-parameter model running under <button className="wikilink" onClick={() => onPick('ollama')}>Ollama</button> on loopback;
          the catalogue is plain Markdown under <code>vault/pages/</code>; the index is a flat JSON vector store keyed by
          a <button className="wikilink" onClick={() => onPick('cosine-similarity')}>cosine</button> read of <button className="wikilink" onClick={() => onPick('nomic-embed')}>nomic-embed-text</button>.
        </p>

        <div className="callout">
          <Icon name="star" size={20} className="callout-ic" />
          <div className="callout-body">"The wiki is what the LLM writes. The vector store is what it reads."</div>
        </div>

        <h2>How a thought lands</h2>
        <p>
          Drop a PDF into <code>~/Mnemosyne/inbox</code>. The <button className="wikilink" onClick={() => onPick('curator-agent')}>curator agent</button> wakes up, splits the document with the <button className="wikilink" onClick={() => onPick('chunker')}>chunker</button>, runs each chunk through the embedder, and then asks the chat model — in JSON-mode — which existing pages this material amends and which new ones it should spawn.
          New <button className="wikilink" onClick={() => onPick('wikilinks')}>wikilinks</button> immediately become edges in the <button className="wikilink" onClick={() => onPick('galaxy-graph')}>galaxy graph</button>; the inverted index rebuilds in the background.
        </p>

        <h2>The four surfaces</h2>
        <p>
          Mnemosyne deliberately does not ship a homepage. The application is its own homepage, with four equally privileged surfaces that all read from the same vault:
        </p>
        <ul>
          <li><strong style={{color:'var(--ink)'}}>Chat</strong> — RAG against the vector store, with citations rendered as chips that link back to the source page.</li>
          <li><strong style={{color:'var(--ink)'}}>Wiki</strong> — what you are reading. Pages of plain markdown with YAML front-matter, editable in any editor.</li>
          <li><strong style={{color:'var(--ink)'}}>Galaxy</strong> — every <button className="wikilink" onClick={() => onPick('wikilinks')}>[[link]]</button> rendered as an edge in 3D. Click any node to jump back here.</li>
          <li><strong style={{color:'var(--ink)'}}>Swarm</strong> — the agent registry. Ingest, lint, browser, and MCP tools running under a single concurrency knob.</li>
        </ul>

        <h2>Tenets</h2>
        <p>The project's three non-negotiables, in the order they were decided:</p>
        <ul>
          <li><em>Local-first.</em> No keys, no telemetry, no cloud. If your laptop is offline, Mnemosyne still works.</li>
          <li><em>Plain files.</em> The vault is a folder of <code>.md</code> files. If Mnemosyne disappears tomorrow, you keep your notes.</li>
          <li><em>The model is staff, not infrastructure.</em> It writes, lints, and answers — but never blocks the user.</li>
        </ul>

        <div className="code-block">
          <span className="lang">vault/pages/mnemosyne.md</span>
          <span className="cm">{`# YAML front-matter`}</span>{`\n`}
          <span className="kw">---</span>{`\n`}
          title: <span className="str">"Mnemosyne"</span>{`\n`}
          tags: <span className="str">[root, system]</span>{`\n`}
          sources: <span className="str">[karpathy-llm-wiki, qyntra]</span>{`\n`}
          updated: <span className="str">2026-05-27T14:08:00.000Z</span>{`\n`}
          <span className="kw">---</span>
        </div>

        <h2>Prior art</h2>
        <p>
          Two essays anchor the design: <button className="wikilink" onClick={() => onPick('karpathy-llm-wiki')}>Karpathy's LLM Wiki gist</button>, which proposed treating the model as a working note-taker, and <button className="wikilink" onClick={() => onPick('qyntra')}>Qyntra's Collect/Connect/Recall framing</button>, which gave us the galaxy view and the cadence of the swarm.
        </p>
        <p>
          A third influence is unattributed and unreciprocated: the way a real notebook accrues marginalia. The <button className="wikilink dead" onClick={() => onPick('marginalia')}>marginalia</button> page does not exist yet — it is in the queue.
        </p>
      </div>
    </article>
  );
}

function CuratorPage({ onPick }) {
  return (
    <article className="wiki-page">
      <div className="frontmatter">
        <span className="fm-tag brass">OQ-0011 · AGENT</span>
        <span className="fm-tag cyan">CURATOR</span>
        <span className="fm-tag">8 BACKLINKS</span>
        <span style={{flex:1}} />
        <span style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--ink-3)', letterSpacing:'.04em'}}>UPDATED 2026-05-26 · 09:14 UTC</span>
      </div>
      <h1>Curator agent.</h1>
      <p className="deck">The librarian. Ingests a source, writes 1–4 pages, links them, and rebuilds the index.</p>
      <div className="body">
        <p>The curator is the only agent allowed to <em>write</em> to <code>vault/pages/</code>. Everything else — <button className="wikilink" onClick={() => onPick('playwright-agent')}>browser</button>, lint, file-scan — reads.</p>
      </div>
    </article>
  );
}

function WikiTOC() {
  return (
    <div className="wiki-toc">
      <div className="h">On this page</div>
      <a className="toc-item active">How a thought lands</a>
      <a className="toc-item">The four surfaces</a>
      <a className="toc-item l2">Chat</a>
      <a className="toc-item l2">Wiki</a>
      <a className="toc-item l2">Galaxy</a>
      <a className="toc-item l2">Swarm</a>
      <a className="toc-item">Tenets</a>
      <a className="toc-item">Prior art</a>

      <div className="backlinks">
        <div className="h">Backlinks</div>
        {['ollama','curator-agent','galaxy-graph','wiki-protocol','rag','swarm-queue','karpathy-llm-wiki','qyntra'].map(s => (
          <a key={s} className="bl-item">
            <Icon name="arrow" className="ic" />{s}
          </a>
        ))}
      </div>
    </div>
  );
}

function WikiScreen({ slug, onPick }) {
  return (
    <div className="wiki-layout">
      <WikiSidebar slug={slug} onPick={onPick} />
      <WikiPage slug={slug} onPick={onPick} />
      <WikiTOC />
    </div>
  );
}

window.WikiScreen = WikiScreen;
