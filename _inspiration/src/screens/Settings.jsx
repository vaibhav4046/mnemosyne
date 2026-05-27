// Settings — health + introspection

function SettingsScreen() {
  return (
    <div className="settings-screen" data-screen-label="settings">
      <div className="agents-head">
        <div>
          <div className="eyebrow" style={{marginBottom:10}}>System</div>
          <h1>Settings.</h1>
          <div className="sub">Configuration, model selection, and live health.</div>
        </div>
      </div>

      <div className="health-card">
        <div className="health-cell">
          <div className="h">Ollama</div>
          <div className="v">127.0.0.1<span style={{fontSize:14, color:'var(--fg-on-dark-3)'}}>:11434</span></div>
          <div className="live"><span className="status-dot" /> live · 7 day uptime</div>
        </div>
        <div className="health-cell">
          <div className="h">Vault</div>
          <div className="v">24 pages</div>
          <div className="vsub">1,847 chunks · 4.2 MB on disk</div>
        </div>
        <div className="health-cell">
          <div className="h">Last ingest</div>
          <div className="v">3 min ago</div>
          <div className="vsub">karpathy-llm-os.pdf · 3 pages spawned</div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Models</h2>
        <div className="sub">Pulled locally via Ollama. Switch chat or embed model without restarting the app.</div>

        <div className="settings-row">
          <div>
            <div className="k">Chat model</div>
            <div className="h normal">The librarian. Used for retrieval-augmented answers and curator JSON plans.</div>
          </div>
          <div>
            <select className="input mono" defaultValue="llama3.2:3b">
              <option>llama3.2:3b</option>
              <option>llama3.2:1b</option>
              <option>qwen2.5:7b</option>
              <option>phi3:mini</option>
            </select>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="k">Embed model</div>
            <div className="h normal">Used by <span className="mono">vector.ts</span> to embed chunks and queries before cosine retrieval.</div>
          </div>
          <div>
            <select className="input mono" defaultValue="nomic-embed-text">
              <option>nomic-embed-text</option>
              <option>mxbai-embed-large</option>
              <option>all-minilm</option>
            </select>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="k">Temperature</div>
            <div className="h normal">Lower keeps the librarian dry and precise. Higher invites speculation.</div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:14}}>
            <input type="range" min="0" max="1" step="0.05" defaultValue="0.2" style={{flex:1, accentColor:'var(--cyan)'}} />
            <span className="mono" style={{color:'var(--cyan)', minWidth:36, textAlign:'right'}}>0.20</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Vault</h2>
        <div className="sub">Where Mnemosyne reads, writes, and lints.</div>

        <div className="settings-row">
          <div>
            <div className="k">Vault path</div>
            <div className="h normal">All Markdown pages live as plain files. Open in any editor.</div>
          </div>
          <div>
            <div className="input mono" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <span>./vault</span>
              <Icon name="folder" size={13} style={{color:'var(--cyan)'}} />
            </div>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="k">Auto-curator</div>
            <div className="h normal">Spawn a curator-agent on every successful ingest. Recommended.</div>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <div className="toggle on" />
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="k">Live-reload graph</div>
            <div className="h normal">Watch <span className="mono">vault/</span> with chokidar and re-render the galaxy. Off by default until v0.5.</div>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <div className="toggle" />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Privacy</h2>
        <div className="sub">Mnemosyne never phones home. These are dry-by-default toggles in case you want to share.</div>

        <div className="settings-row">
          <div>
            <div className="k">Anonymous telemetry</div>
            <div className="h normal">Off. There is no telemetry endpoint to send to.</div>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <div className="toggle" />
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="k">Allow web fetches</div>
            <div className="h normal">When on, the browser-agent and <span className="mono">fetch</span> MCP can reach the open internet. Allow-listed domains only.</div>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <div className="toggle on" />
          </div>
        </div>
      </div>

      <div className="settings-section" style={{marginBottom:0}}>
        <h2>About</h2>
        <div className="sub">Mnemosyne · v0.4.2 · MIT. Built on Next.js 15, Ollama, p-queue, and stubborn local-first principles.</div>
        <div style={{display:'flex', gap:10, marginTop:18}}>
          <button className="btn btn-secondary"><Icon name="book" size={13} />README</button>
          <button className="btn btn-secondary"><Icon name="terminal" size={13} />Open vault/log.md</button>
          <button className="btn btn-secondary"><Icon name="refresh" size={13} />Re-index</button>
        </div>
      </div>
    </div>
  );
}

window.SettingsScreen = SettingsScreen;
