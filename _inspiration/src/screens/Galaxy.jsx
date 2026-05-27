// Galaxy — 3D-ish force graph rendered to canvas
// Pure 2D canvas with depth-faked nodes (size + brightness + parallax glow)
// Slow ambient rotation around a fake camera

const { useEffect: useE_gal, useRef: useR_gal, useState: useS_gal } = React;

function GalaxyScreen({ onPick }) {
  const canvasRef = useR_gal(null);
  const [selected, setSelected] = useS_gal('mnemosyne');
  const [activeTag, setActiveTag] = useS_gal(null);

  useE_gal(() => {
    const cnv = canvasRef.current;
    if (!cnv) return;
    const ctx = cnv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    function resize() {
      const r = cnv.getBoundingClientRect();
      cnv.width = r.width * dpr;
      cnv.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cnv);

    // Build node/edge graph
    const pages = window.MDATA.PAGES;
    const colors = window.MDATA.TAG_COLORS;

    // Seeded layout — deterministic positions on a sphere
    const nodes = pages.map((p, i) => {
      const phi = Math.acos(1 - 2 * (i + 0.5) / pages.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        slug: p.slug, title: p.title, kind: p.kind, refs: p.refs,
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta),
      };
    });
    const nodeMap = Object.fromEntries(nodes.map(n => [n.slug, n]));
    const edges = [];
    pages.forEach(p => {
      p.links.forEach(t => {
        if (nodeMap[t]) edges.push([p.slug, t]);
      });
    });

    let rot = 0;
    let raf;
    function draw() {
      const r = cnv.getBoundingClientRect();
      const W = r.width, H = r.height;
      ctx.fillStyle = 'rgba(8,9,15,0.18)';
      ctx.fillRect(0, 0, W, H);

      // Star field
      const t = performance.now() / 1000;
      ctx.save();
      for (let i = 0; i < 90; i++) {
        const sx = (i * 73 % 1000) / 1000 * W;
        const sy = (i * 137 % 1000) / 1000 * H;
        const tw = 0.5 + 0.5 * Math.sin(t * 0.7 + i);
        ctx.fillStyle = `rgba(245,240,228,${0.06 + tw * 0.14})`;
        ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.restore();

      rot += 0.0008;
      const cx = W / 2, cy = H / 2;
      const RADIUS = Math.min(W, H) * 0.32;
      const cos = Math.cos(rot), sin = Math.sin(rot);

      // Project nodes
      const proj = nodes.map(n => {
        const x = n.x * cos - n.z * sin;
        const z = n.x * sin + n.z * cos;
        const persp = 1 / (1.6 - z * 0.5); // depth
        return {
          ...n,
          px: cx + x * RADIUS * persp,
          py: cy + n.y * RADIUS * persp,
          depth: z,
          persp,
        };
      });
      const projMap = Object.fromEntries(proj.map(n => [n.slug, n]));

      // Draw edges (faded by depth)
      ctx.lineCap = 'round';
      edges.forEach(([a, b]) => {
        const A = projMap[a], B = projMap[b];
        if (!A || !B) return;
        const avgDepth = (A.depth + B.depth) / 2;
        const alpha = 0.04 + Math.max(0, avgDepth) * 0.18;
        const selectedTouch = a === selected || b === selected;
        ctx.strokeStyle = selectedTouch ? `rgba(92,224,216,${0.35 + Math.max(0, avgDepth) * 0.25})` : `rgba(245,240,228,${alpha})`;
        ctx.lineWidth = selectedTouch ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(A.px, A.py);
        ctx.lineTo(B.px, B.py);
        ctx.stroke();
      });

      // Draw nodes back-to-front
      proj.sort((a, b) => a.depth - b.depth);
      proj.forEach(n => {
        const color = colors[n.kind] || '#5ce0d8';
        const isSelected = n.slug === selected;
        const isTagged = activeTag && (n.kind === activeTag);
        const dim = activeTag && !isTagged;
        const baseR = 2.5 + Math.log(n.refs + 1) * 1.8;
        const R = baseR * (0.5 + n.persp * 0.7) * (isSelected ? 1.8 : 1);
        const a = dim ? 0.18 : (0.4 + n.persp * 0.5);

        // Halo
        if (isSelected) {
          const g = ctx.createRadialGradient(n.px, n.py, 0, n.px, n.py, R * 5);
          g.addColorStop(0, 'rgba(92,224,216,0.5)');
          g.addColorStop(1, 'rgba(92,224,216,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(n.px, n.py, R * 5, 0, Math.PI * 2); ctx.fill();
        }
        // Core
        ctx.fillStyle = color;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(n.px, n.py, R, 0, Math.PI * 2); ctx.fill();
        // Ring
        ctx.globalAlpha = a * 0.6;
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(n.px, n.py, R + 2.5, 0, Math.PI * 2); ctx.stroke();

        // Label for prominent / selected
        if (isSelected || (n.persp > 0.75 && n.refs >= 6)) {
          ctx.globalAlpha = isSelected ? 1 : 0.6;
          ctx.fillStyle = isSelected ? '#f5f0e4' : 'rgba(245,240,228,0.7)';
          ctx.font = `${isSelected ? '12px' : '10px'} 'JetBrains Mono', monospace`;
          ctx.textAlign = 'left';
          ctx.fillText(n.slug, n.px + R + 6, n.py + 3);
        }
        ctx.globalAlpha = 1;
      });

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    function click(e) {
      const r = cnv.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      // Re-project to find nearest
      const RADIUS = Math.min(r.width, r.height) * 0.32;
      const cx = r.width / 2, cy = r.height / 2;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      let best = null, bestD = 1e9;
      nodes.forEach(n => {
        const x = n.x * cos - n.z * sin;
        const z = n.x * sin + n.z * cos;
        const persp = 1 / (1.6 - z * 0.5);
        const px = cx + x * RADIUS * persp;
        const py = cy + n.y * RADIUS * persp;
        const d = (px - mx) ** 2 + (py - my) ** 2;
        if (d < bestD) { bestD = d; best = n; }
      });
      if (best && bestD < 30 * 30) setSelected(best.slug);
    }
    cnv.addEventListener('click', click);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); cnv.removeEventListener('click', click); };
  }, [selected, activeTag]);

  const sel = window.MDATA.PAGES.find(p => p.slug === selected);
  const TAG_LIST = [
    { kind: 'concept', name: 'Concept', count: 9 },
    { kind: 'agent',   name: 'Agent',   count: 4 },
    { kind: 'tool',    name: 'Tool',    count: 4 },
    { kind: 'model',   name: 'Model',   count: 2 },
    { kind: 'source',  name: 'Source',  count: 2 },
    { kind: 'feature', name: 'Feature', count: 1 },
    { kind: 'system',  name: 'System',  count: 1 },
  ];

  return (
    <div className="galaxy" data-screen-label="galaxy">
      <canvas ref={canvasRef} className="galaxy-canvas" />

      <div className="galaxy-overlay">
        <div className="galaxy-stats">
          <div className="stat"><div className="num">24</div><div className="lbl">Pages</div></div>
          <div className="stat"><div className="num">87</div><div className="lbl">Edges</div></div>
          <div className="stat"><div className="num">3.4</div><div className="lbl">Avg degree</div></div>
        </div>

        <div className="galaxy-filters galaxy-panel">
          <div className="h"><Icon name="filter" size={11} />Filter by kind</div>
          {TAG_LIST.map(t => (
            <div key={t.kind}
                 className="gal-tag-row"
                 onClick={() => setActiveTag(activeTag === t.kind ? null : t.kind)}
                 style={{opacity: activeTag && activeTag !== t.kind ? 0.5 : 1}}>
              <span className="dot" style={{background: window.MDATA.TAG_COLORS[t.kind]}} />
              <span className="name">{t.name}</span>
              <span className="count">{t.count}</span>
            </div>
          ))}
          <div style={{marginTop:14, paddingTop:14, borderTop:'0.5px solid var(--border-dark)'}}>
            <div className="h" style={{marginBottom:8}}><Icon name="link" size={11} />Forces</div>
            <div className="gal-tag-row"><span className="name">Charge</span><span className="count">-220</span></div>
            <div className="gal-tag-row"><span className="name">Link distance</span><span className="count">80</span></div>
            <div className="gal-tag-row"><span className="name">Damping</span><span className="count">0.4</span></div>
          </div>
        </div>

        <div className="galaxy-node-detail galaxy-panel" style={{paddingTop:18}}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
            <span className="dot" style={{width:10, height:10, borderRadius:'50%', background: window.MDATA.TAG_COLORS[sel.kind]}} />
            <span className="eyebrow">{sel.kind} · {sel.refs} refs</span>
            <span style={{flex:1}} />
            <button className="icon-btn" title="Open in wiki" onClick={() => onPick(sel.slug)}>
              <Icon name="arrow" size={13} />
            </button>
          </div>
          <h3>{sel.title}</h3>
          <div className="meta">{'/vault/pages/' + sel.slug + '.md'}</div>
          <div className="excerpt">
            {sel.slug === 'mnemosyne' ? 'A local-first workspace where a small language model acts as librarian: it reads, writes interlinked notes, and recalls them with citations — all on your machine. Coordinates: 127.0.0.1:11434 → 3500. Vault: 24 pages, 1,847 chunks.' :
              `${sel.title} is referenced by ${sel.refs} other pages in this vault. The curator agent last touched this entry on ${sel.updated}. Tags: ${sel.tags.join(', ')}.`}
          </div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:10}}>
            {sel.tags.map(t => <span key={t} className="tag" style={{fontSize:9}}>{t}</span>)}
          </div>
          <div className="h" style={{marginTop:14}}><Icon name="link" size={11} />Outgoing links</div>
          <div className="links">
            {sel.links.slice(0, 5).map(l => (
              <button key={l} className="link" onClick={() => setSelected(l)}>
                <span className="arrow">→</span>
                <span>{l}</span>
                <span style={{marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--fg-on-dark-4)'}}>
                  {window.MDATA.PAGES.find(p=>p.slug===l)?.kind || '—'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="galaxy-controls">
          <button className="gal-ctrl" title="Zoom in"><Icon name="zoomIn" size={14} /></button>
          <button className="gal-ctrl" title="Zoom out"><Icon name="zoomOut" size={14} /></button>
          <button className="gal-ctrl active" title="Pause rotation"><Icon name="pause" size={14} /></button>
          <button className="gal-ctrl" title="Re-center"><Icon name="rotate" size={14} /></button>
          <div style={{width: 1, height:18, background:'var(--border-dark)', margin:'0 4px'}} />
          <button className="gal-ctrl" title="2D layout"><span style={{fontFamily:'var(--font-mono)', fontSize:11}}>2D</span></button>
          <button className="gal-ctrl active" title="3D layout"><span style={{fontFamily:'var(--font-mono)', fontSize:11}}>3D</span></button>
        </div>

        <div className="galaxy-legend">
          <div className="legend-i"><span className="dot" style={{background:'#5ce0d8'}}></span>concept</div>
          <div className="legend-i"><span className="dot" style={{background:'#7cc49b'}}></span>agent</div>
          <div className="legend-i"><span className="dot" style={{background:'#c9a86a'}}></span>tool</div>
          <div className="legend-i"><span className="dot" style={{background:'#c8685a'}}></span>model</div>
          <div className="legend-i"><span className="dot" style={{background:'#a08adf'}}></span>source</div>
        </div>
      </div>
    </div>
  );
}

window.GalaxyScreen = GalaxyScreen;
