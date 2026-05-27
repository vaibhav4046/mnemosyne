// Agents — swarm dashboard

function Sparkline({ data, color = 'var(--cyan)' }) {
  const W = 100, H = 24;
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 2) - 1}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={W} cy={H - (data[data.length-1] / max) * (H - 2) - 1} r="2" fill={color} />
    </svg>
  );
}

function AgentsScreen() {
  const agents = window.MDATA.AGENTS;
  return (
    <div className="agents-screen" data-screen-label="agents">
      <div className="agents-head">
        <div>
          <div className="eyebrow" style={{marginBottom:10}}>Parallel swarm · p-queue concurrency 3</div>
          <h1>Three agents in orbit.</h1>
          <div className="sub">Live SSE feed from <span className="mono">/api/agents/stream</span>. Two browser scans queued behind the active ingest.</div>
        </div>
        <div className="right">
          <button className="btn btn-secondary"><Icon name="pause" size={13} />Pause swarm</button>
          <button className="btn btn-primary"><Icon name="play" size={13} />Launch new</button>
        </div>
      </div>

      <div className="swarm-grid">
        <div className="swarm-stat">
          <div className="lbl">Running</div>
          <div><span className="v">3</span><span className="unit">/ 3 slots</span></div>
          <div className="spark"><Sparkline data={[1,2,1,3,2,3,3,3]} /></div>
        </div>
        <div className="swarm-stat">
          <div className="lbl">Queued</div>
          <div><span className="v">2</span></div>
          <div className="spark"><Sparkline data={[0,1,2,1,2,3,3,2]} color="var(--warning)" /></div>
        </div>
        <div className="swarm-stat">
          <div className="lbl">Done · last hour</div>
          <div><span className="v">14</span></div>
          <div className="spark"><Sparkline data={[2,3,1,4,3,5,3,4]} color="var(--success)" /></div>
        </div>
        <div className="swarm-stat">
          <div className="lbl">Avg tok/s</div>
          <div><span className="v">141</span><span className="unit">llama3.2:3b</span></div>
          <div className="spark"><Sparkline data={[120,128,135,142,138,144,139,141]} color="var(--brass)" /></div>
        </div>
      </div>

      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
        <div className="eyebrow">Active jobs</div>
        <div style={{display:'flex', gap:8}}>
          <span className="tag">all</span>
          <span className="tag">running</span>
          <span className="tag">queued</span>
          <span className="tag">done</span>
          <span className="tag">failed</span>
        </div>
      </div>

      {agents.map(a => (
        <div className="agent-row" key={a.id}>
          <span className={'stat-dot stat-' + a.state} />
          <div>
            <div className="kind">{a.kind}</div>
            <div className="mono" style={{fontSize:10, color:'var(--fg-on-dark-4)', letterSpacing:'.02em', marginTop:2}}>{a.id}</div>
          </div>
          <div className="label-col">
            <div>{a.label}</div>
            <div className="sub">{a.sub}</div>
          </div>
          <div className={'progress ' + a.state}>
            <div className="bar" style={{width: a.progress + '%'}} />
          </div>
          <div className={'state-tag ' + a.state}>{a.state}</div>
          <div className="time">{a.time}</div>
        </div>
      ))}

      <div className="agent-log">
        <div className="head">
          <Icon name="terminal" size={13} style={{color:'var(--cyan)'}} />
          <span className="eyebrow" style={{color:'var(--fg-on-dark-2)'}}>Live ledger · vault/log.md</span>
          <span style={{flex:1}} />
          <span className="tag">tail -f</span>
          <button className="btn btn-ghost btn-sm"><Icon name="copy" size={12} /></button>
        </div>
        <div className="body">
          <div><span className="ts">14:32:17</span><span className="lvl-info">ingest</span> · karpathy-llm-os.pdf · chunk 28/44 · embedding…</div>
          <div><span className="ts">14:32:14</span><span className="lvl-ok">curator</span> · wrote vault/pages/llm-os.md · 4 wikilinks created</div>
          <div><span className="ts">14:32:11</span><span className="lvl-info">browser</span> · mcp.context.dev/spec · domcontentloaded · 1.4s</div>
          <div><span className="ts">14:32:08</span><span className="lvl-ok">lint</span> · 0 broken wikilinks · 1 page missing front-matter · curator-agent#tags</div>
          <div><span className="ts">14:32:03</span><span className="lvl-warn">browser</span> · qyntra-app.vercel.app · timeout 30s · retry 1/3</div>
          <div><span className="ts">14:31:58</span><span className="lvl-info">file</span> · scan ~/Documents/notes/ · 47 candidates · 12 already indexed</div>
          <div><span className="ts">14:31:42</span><span className="lvl-ok">query</span> · "cosine vs dot product" · 12 chunks · 0.04s</div>
          <div><span className="ts">14:31:35</span><span className="lvl-info">ingest</span> · karpathy-llm-os.pdf · pdf-parse · 14 pages extracted</div>
        </div>
      </div>
    </div>
  );
}

window.AgentsScreen = AgentsScreen;
