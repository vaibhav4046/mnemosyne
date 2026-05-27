// MCP — server cards

function McpScreen() {
  const servers = window.MDATA.MCP_SERVERS;
  return (
    <div className="mcp-screen" data-screen-label="mcp">
      <div className="agents-head">
        <div>
          <div className="eyebrow" style={{marginBottom:10}}>Model Context Protocol</div>
          <h1>Connected tools.</h1>
          <div className="sub">stdio MCP servers exposed to every agent in the swarm. Permissions are per-agent and revoked on close.</div>
        </div>
        <div className="right">
          <button className="btn btn-secondary"><Icon name="refresh" size={13} />Reconnect all</button>
          <button className="btn btn-primary"><Icon name="plus" size={13} />Add server</button>
        </div>
      </div>

      <div className="mcp-cards">
        {servers.map(s => (
          <div className="mcp-card" key={s.name}>
            <div className="mcp-card-head">
              <div className={'mcp-card-ic ' + (s.color || '')}>
                <Icon name={s.name === 'filesystem' ? 'folder' : s.name === 'fetch' ? 'globe' : s.name === 'sqlite' ? 'database' : 'terminal'} size={20} />
              </div>
              <div style={{flex:1}}>
                <h3>{s.name}</h3>
                <div className="pkg">{s.pkg}</div>
              </div>
              <span className={s.state ? 'tag solid-cyan' : 'tag'} style={{textTransform:'uppercase'}}>
                {s.state ? 'connected' : 'idle'}
              </span>
            </div>
            <p className="desc">{s.desc}</p>
            <div className="tools">
              {s.tools.map(t => <span key={t} className="tag mono" style={{fontFamily:'var(--font-mono)', textTransform:'none', letterSpacing:'.04em'}}>{t}</span>)}
            </div>
            <div className="foot">
              <div className="live">
                <span className={'status-dot ' + (s.state ? '' : 'off')} />
                {s.state ? `${Math.floor(20 + Math.random()*180)} calls today` : 'never connected'}
              </div>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <button className="btn btn-ghost btn-sm" title="Logs"><Icon name="terminal" size={12} /></button>
                <button className="btn btn-ghost btn-sm" title="Edit"><Icon name="edit" size={12} /></button>
                <div className={'toggle ' + (s.state ? 'on' : '')} />
              </div>
            </div>
          </div>
        ))}

        {/* Add-new card */}
        <div className="mcp-card" style={{
          background: 'transparent',
          borderStyle: 'dashed',
          borderColor: 'var(--border-dark)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', minHeight: 240,
        }}>
          <div className="mcp-card-ic" style={{background: 'transparent', border:'0.5px dashed var(--border-dark)', marginBottom:12}}>
            <Icon name="plus" size={20} />
          </div>
          <h3 style={{marginBottom:6}}>Add an MCP server</h3>
          <p className="desc" style={{maxWidth:280, marginBottom:14}}>Paste a stdio command or pick a packaged server. Agents will inherit its tools on next connect.</p>
          <button className="btn btn-secondary btn-sm"><Icon name="upload" size={12} />Connect…</button>
        </div>
      </div>

      <div style={{marginTop:36, padding:'18px 22px', background:'var(--navy)', border:'0.5px solid var(--border-dark)', borderRadius:'var(--radius-md)'}}>
        <div className="eyebrow" style={{marginBottom:10}}>Permission policy</div>
        <p style={{color:'var(--fg-on-dark-2)', fontSize:14, lineHeight:1.6, maxWidth:'68ch', margin:0}}>
          Each agent receives a subset of the connected tools at spawn time. The <span className="mono" style={{color:'var(--cyan)'}}>curator-agent</span> can call <span className="mono">filesystem.read</span> and <span className="mono">fetch.*</span> but never <span className="mono">filesystem.write</span> outside <span className="mono">vault/pages/</span>. The <span className="mono" style={{color:'var(--brass)'}}>playwright-agent</span> sees the network tools but no filesystem at all.
        </p>
      </div>
    </div>
  );
}

window.McpScreen = McpScreen;
