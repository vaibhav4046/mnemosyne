// Command palette overlay

const { useState: useS_pal, useEffect: useE_pal } = React;

function Palette({ onClose, onScreen }) {
  const [q, setQ] = useS_pal('');
  const [active, setActive] = useS_pal(0);
  const sections = window.MDATA.PALETTE_ITEMS;
  const flat = sections.flatMap(s => s.items.map(i => ({ ...i, section: s.section })));

  useE_pal(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(flat.length - 1, a + 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
      if (e.key === 'Enter') {
        const it = flat[active];
        if (it && it.kbd && it.kbd.startsWith('⌘') && /\d/.test(it.kbd)) {
          const idx = parseInt(it.kbd[1], 10);
          const id = ['chat','wiki','galaxy','files','agents','mcp','settings'][idx - 1];
          if (id) { onScreen(id); onClose(); }
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, flat, onClose, onScreen]);

  let runningIx = 0;
  return (
    <div className="palette-back" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <div className="palette-search">
          <Icon name="search" className="ic" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search vault, jump, ingest, run command…" />
          <span className="esc">esc</span>
        </div>

        <div className="palette-body">
          {sections.map(section => (
            <div className="palette-section" key={section.section}>
              <div className="label">{section.section}</div>
              {section.items.map(item => {
                const ix = runningIx++;
                return (
                  <button
                    key={item.label + ix}
                    className={'palette-item ' + (ix === active ? 'active' : '')}
                    onMouseEnter={() => setActive(ix)}
                    onClick={() => {
                      if (item.kbd && /\d/.test(item.kbd)) {
                        const idx = parseInt(item.kbd[1], 10);
                        const id = ['chat','wiki','galaxy','files','agents','mcp','settings'][idx - 1];
                        if (id) onScreen(id);
                      }
                      onClose();
                    }}
                  >
                    <Icon name={item.ic} className="ic" />
                    <span>{item.label}</span>
                    <span className="sub">{item.sub}</span>
                    {item.kbd && <span className="kbd">{item.kbd}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="palette-foot">
          <span><span className="k">↑</span><span className="k">↓</span>navigate</span>
          <span><span className="k">↵</span>open</span>
          <span><span className="k">⌘P</span>find page</span>
          <span style={{marginLeft:'auto'}}>llama3.2:3b · powered by <span style={{color:'var(--cyan)'}}>ollama</span></span>
        </div>
      </div>
    </div>
  );
}

window.Palette = Palette;
