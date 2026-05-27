// Mnemosyne — top-level App

const { useState: useS_app, useEffect: useE_app } = React;

function App() {
  const [route, setRoute] = useS_app('chat'); // can be "chat", "wiki", "wiki:slug", etc.
  const [paletteOpen, setPaletteOpen] = useS_app(false);

  useE_app(() => {
    function onKey(e) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(p => !p); }
      if (meta && /^[1-6]$/.test(e.key)) {
        e.preventDefault();
        const ids = ['chat','wiki','galaxy','files','agents','mcp'];
        setRoute(ids[parseInt(e.key, 10) - 1]);
      }
      if (meta && e.key === ',') { e.preventDefault(); setRoute('settings'); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const screenId = route.split(':')[0];
  const wikiSlug = route.startsWith('wiki:') ? route.split(':')[1] : 'mnemosyne';

  const crumbs = {
    chat:    ['Workspace', 'Chat'],
    wiki:    ['Vault', 'Wiki', wikiSlug],
    galaxy:  ['Vault', 'Galaxy'],
    files:   ['Workspace', 'Files'],
    agents:  ['Runtime', 'Agents'],
    mcp:     ['Runtime', 'MCP servers'],
    settings:['System', 'Settings'],
  }[screenId];

  const right = {
    chat: (
      <React.Fragment>
        <button className="icon-btn" title="History"><Icon name="history" size={15} /></button>
        <button className="icon-btn" title="New thread"><Icon name="edit" size={15} /></button>
      </React.Fragment>
    ),
    wiki: (
      <React.Fragment>
        <button className="icon-btn" title="Edit"><Icon name="edit" size={15} /></button>
        <button className="icon-btn" title="Open in galaxy" onClick={() => setRoute('galaxy')}><Icon name="galaxy" size={15} /></button>
      </React.Fragment>
    ),
    galaxy: (
      <React.Fragment>
        <button className="icon-btn" title="Filters"><Icon name="filter" size={15} /></button>
      </React.Fragment>
    ),
  }[screenId];

  return (
    <div className="app">
      <Sidebar screen={screenId} onScreen={id => setRoute(id)} />

      <main className="main">
        <Topbar
          crumbs={crumbs}
          right={right}
          onPalette={() => setPaletteOpen(true)}
        />
        <div className="screen">
          {screenId === 'chat' && <ChatScreen />}
          {screenId === 'wiki' && <WikiScreen slug={wikiSlug} onPick={s => setRoute('wiki:' + s)} />}
          {screenId === 'galaxy' && <GalaxyScreen onPick={s => setRoute('wiki:' + s)} />}
          {screenId === 'files' && <FilesScreen />}
          {screenId === 'agents' && <AgentsScreen />}
          {screenId === 'mcp' && <McpScreen />}
          {screenId === 'settings' && <SettingsScreen />}
        </div>
      </main>

      {paletteOpen && (
        <Palette onClose={() => setPaletteOpen(false)} onScreen={id => setRoute(id)} />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
