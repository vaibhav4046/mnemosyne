// Sidebar, topbar, status footer, and screen router

const { useState, useEffect, useRef, useCallback } = React;

const NAV = [
  { id: 'chat',     label: 'Chat',     icon: 'chat',     kbd: '⌘1' },
  { id: 'wiki',     label: 'Wiki',     icon: 'book',     kbd: '⌘2', badgeCount: 24 },
  { id: 'galaxy',   label: 'Galaxy',   icon: 'galaxy',   kbd: '⌘3' },
  { id: 'files',    label: 'Files',    icon: 'files',    kbd: '⌘4' },
  { id: 'agents',   label: 'Agents',   icon: 'agents',   kbd: '⌘5', badge: '3' },
  { id: 'mcp',      label: 'MCP servers', icon: 'mcp',   kbd: '⌘6' },
  { id: 'settings', label: 'Settings', icon: 'settings', kbd: '⌘,' },
];

function Sidebar({ screen, onScreen }) {
  return (
    <aside className="sidebar" data-screen-label="sidebar">
      <div className="brand">
        <div className="brand-mark"><BrandMark size={32} /></div>
        <div>
          <div className="brand-name">Mnemosyne</div>
          <div className="brand-sub">v0.4 · local</div>
        </div>
      </div>

      <nav className="nav-section">
        <div className="nav-label"><span>Workspace</span></div>
        {NAV.slice(0, 6).map(item => (
          <button key={item.id} className={'nav-item ' + (screen === item.id ? 'active' : '')} onClick={() => onScreen(item.id)}>
            <Icon name={item.icon} size={16} className="nav-ic" />
            <span>{item.label}</span>
            {item.badge ? <span className="nav-badge">{item.badge}</span> : <span className="nav-kbd">{item.kbd}</span>}
          </button>
        ))}
      </nav>

      <nav className="nav-section">
        <div className="nav-label"><span>Pinned pages</span></div>
        {['mnemosyne','galaxy-graph','curator-agent','wiki-protocol'].map(slug => (
          <button key={slug} className="nav-item" onClick={() => onScreen('wiki:' + slug)}>
            <Icon name="star" size={13} className="nav-ic" style={{color:'var(--brass)'}} />
            <span style={{fontSize:13, color:'var(--fg-on-dark-2)'}}>{slug}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <nav className="nav-section" style={{paddingTop:0}}>
        {NAV.slice(6).map(item => (
          <button key={item.id} className={'nav-item ' + (screen === item.id ? 'active' : '')} onClick={() => onScreen(item.id)}>
            <Icon name={item.icon} size={16} className="nav-ic" />
            <span>{item.label}</span>
            <span className="nav-kbd">{item.kbd}</span>
          </button>
        ))}
      </nav>

      <div className="status">
        <div className="status-row">
          <span className="status-dot" />
          <span className="label">ollama</span>
          <span className="val">live</span>
        </div>
        <div className="status-row">
          <Icon name="brain" size={11} style={{color:'var(--fg-on-dark-3)'}} />
          <span className="label">chat</span>
          <span className="val mono">llama3.2:3b</span>
        </div>
        <div className="status-row">
          <Icon name="database" size={11} style={{color:'var(--fg-on-dark-3)'}} />
          <span className="label">embed</span>
          <span className="val mono">nomic-embed</span>
        </div>
        <div className="status-row">
          <Icon name="agents" size={11} style={{color:'var(--fg-on-dark-3)'}} />
          <span className="label">vault</span>
          <span className="val mono">24 pages · 1.8k chunks</span>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs, onPalette, right }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">›</span>}
            <span className={i === crumbs.length - 1 ? 'now' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div style={{marginLeft:'auto', display:'flex', gap:6, alignItems:'center'}}>
        {right}
        <button className="cmd-trigger" onClick={onPalette}>
          <Icon name="search" size={13} />
          <span>Search vault, jump, ingest…</span>
          <span className="kbd">⌘K</span>
        </button>
      </div>
    </div>
  );
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
window.NAV = NAV;
