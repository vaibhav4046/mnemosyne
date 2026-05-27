// Chat screen — streaming RAG with citations

const { useState: useS_chat, useEffect: useE_chat, useRef: useR_chat } = React;

function CiteChip({ n, slug }) {
  return (
    <a className="cite-chip" title={slug}>
      <span className="num">{n}</span>
      {slug}
    </a>
  );
}

function CiteTray({ items }) {
  return (
    <div className="cite-tray">
      <div className="cite-tray-head">
        <Icon name="link" size={11} />
        <span>Sources · {items.length} chunks · cosine ≥ 0.71</span>
      </div>
      <div className="cite-tray-list">
        {items.map((c, i) => (
          <div className="cite-tray-row" key={i}>
            <span className="ix">{i+1}</span>
            <span>
              <span className="title">{c.title}</span>
              <span className="src" style={{marginLeft:8}}>· {c.src} · §{c.section}</span>
            </span>
            <span className="src">{c.score.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SAMPLE_THREAD = [
  {
    role: 'user', time: '14:28',
    text: <span>What does Karpathy say about the LLM as a librarian — and how does that map onto our <code>curator-agent</code> in Mnemosyne?</span>
  },
  {
    role: 'bot', time: '14:28',
    text: (
      <React.Fragment>
        <p>
          Karpathy's <em>LLM Wiki</em> pattern frames the model as a working librarian, not a search engine — it ingests sources, writes interlinked notes by hand, and maintains an index it can later interrogate <CiteChip n={1} slug="karpathy-llm-wiki" />. The recall surface is the wiki itself, not a vector blob.
        </p>
        <h4>How Mnemosyne maps that</h4>
        <p>
          Our <code>curator-agent</code> implements that loop directly. On ingest it:
        </p>
        <ul>
          <li>splits a source into ~800-token semantic chunks via the <code>chunker</code> <CiteChip n={2} slug="ingest-pipeline" />,</li>
          <li>asks the local <code>llama3.2:3b</code> for a JSON plan of 1-4 wiki pages to write or update,</li>
          <li>writes Markdown with YAML front-matter and <code>[[wikilinks]]</code>, then rebuilds the vector index <CiteChip n={3} slug="wiki-protocol" />,</li>
          <li>appends one ledger line to <code>vault/log.md</code>.</li>
        </ul>
        <p>
          The galaxy view is the second half of that bargain — every <code>[[link]]</code> becomes an edge so the librarian's choices are <em>visible</em>, not buried in an embedding cloud <CiteChip n={4} slug="galaxy-graph" />.
        </p>
        <h4>Where we diverge</h4>
        <p>
          Karpathy's gist treats the wiki as the only retrieval surface; we keep a cosine index in parallel because it's still the cheapest path to "find me the chunk that mentions <code>p-queue</code> concurrency." The wiki is what the LLM <em>writes</em>; the vector store is what it <em>reads</em>.
        </p>
        <CiteTray items={[
          { title: 'Karpathy — LLM wiki', src: 'karpathy-llm-wiki.md', section: 'Recall surface', score: 0.84 },
          { title: 'Ingest pipeline',     src: 'ingest-pipeline.md',   section: 'Chunking',       score: 0.79 },
          { title: 'Wiki protocol',       src: 'wiki-protocol.md',     section: 'Curator loop',   score: 0.77 },
          { title: 'Galaxy graph',        src: 'galaxy-graph.md',      section: 'Edges',          score: 0.72 },
        ]} />
      </React.Fragment>
    )
  },
  {
    role: 'user', time: '14:31',
    text: 'Does the curator ever delete a page on its own, or does it only append?'
  },
  {
    role: 'bot', time: '14:31', streaming: true,
    text: (
      <React.Fragment>
        <p>
          By default it only writes and updates — never deletes. The agent is allowed to <em>supersede</em> a page (move its content into a more general one and replace the old body with a <code>moved → [[new-slug]]</code> stub), but the file stays on disk <CiteChip n={1} slug="curator-agent" />.
        </p>
        <p>
          Hard deletion goes through the <code>lint</code> agent, which only runs when you explicitly launch it from the swarm panel<span className="chat-streaming-cursor" />
        </p>
      </React.Fragment>
    )
  },
];

function ChatEmpty({ onPick }) {
  return (
    <div className="chat-empty">
      <div className="chat-empty-inner">
        <BrandMark size={92} />
        <h1>Ask your <em>vault</em>.</h1>
        <p className="sub">Mnemosyne reads from 24 interlinked wiki pages and 1,847 indexed chunks on your machine. Citations are clickable and reversible.</p>
        <div className="suggest-grid">
          {window.MDATA.SUGGESTIONS.map((s, i) => (
            <button className="suggest" key={i} onClick={() => onPick(s.q)}>
              <div className="kind">{s.kind}</div>
              <div className="q">{s.q}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatScreen() {
  const [thread, setThread] = useS_chat(SAMPLE_THREAD);
  const [val, setVal] = useS_chat('');
  const [empty, setEmpty] = useS_chat(false);
  const scrollRef = useR_chat(null);

  useE_chat(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread, empty]);

  function send() {
    if (!val.trim()) return;
    setThread(t => [...t, { role: 'user', time: '14:32', text: val }, { role: 'bot', time: '14:32', text: <p style={{color:'var(--fg-on-dark-3)'}}>retrieving…<span className="chat-streaming-cursor" /></p> }]);
    setVal('');
  }

  return (
    <div className="chat">
      <div className="chat-scroll" ref={scrollRef}>
        {empty ? <ChatEmpty onPick={q => { setVal(q); setEmpty(false); }} /> : (
          <div className="chat-thread">
            {thread.map((m, i) => (
              <div className="msg" key={i}>
                <div className={'msg-avatar ' + (m.role === 'user' ? 'you' : 'bot')}>
                  {m.role === 'user' ? 'VK' : <BrandMark size={18} />}
                </div>
                <div className="msg-body">
                  <div className="msg-meta">
                    <span className="msg-who">{m.role === 'user' ? 'You' : 'Mnemosyne'}</span>
                    <span className="msg-time">{m.time}{m.role === 'bot' ? ' · llama3.2:3b' : ''}</span>
                    {m.streaming && <span className="tag cyan"><span className="status-dot" style={{width:5,height:5,boxShadow:'none'}} />streaming · 142 tok/s</span>}
                  </div>
                  <div className="msg-text">{m.text}</div>
                  {m.role === 'bot' && !m.streaming && (
                    <div className="msg-actions">
                      <button className="msg-action"><Icon name="copy" size={11} /> Copy</button>
                      <button className="msg-action"><Icon name="refresh" size={11} /> Regenerate</button>
                      <button className="msg-action"><Icon name="link" size={11} /> Open sources</button>
                      <button className="msg-action"><Icon name="thumbsup" size={11} /> Save to vault</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="composer-wrap">
        <div className="composer">
          <textarea
            placeholder="Ask the librarian… ([[wikilinks]] auto-suggest)"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
          />
          <div className="composer-bar">
            <button className="composer-chip active"><Icon name="link" size={11} /> RAG</button>
            <button className="composer-chip"><Icon name="globe" size={11} /> Browse</button>
            <button className="composer-chip"><Icon name="upload" size={11} /> Attach</button>
            <button className="composer-chip" onClick={() => setEmpty(e => !e)}><Icon name="history" size={11} /> {empty ? 'Resume' : 'New thread'}</button>
            <div className="right">
              <span className="hint">↵ send · ⇧↵ newline</span>
              <button className="send-btn" disabled={!val.trim()} onClick={send}>
                <Icon name="send" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ChatScreen = ChatScreen;
