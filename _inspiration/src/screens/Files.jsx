// Files — sandboxed FS browser

const { useState: useS_files } = React;

function FilesScreen() {
  const roots = window.MDATA.ROOTS;
  const files = window.MDATA.FILES;
  const [activeRoot, setActiveRoot] = useS_files('Desktop');

  function fileIcon(kind) {
    if (kind === 'folder') return 'folder';
    if (kind === 'pdf') return 'filePdf';
    if (kind === 'md' || kind === 'txt') return 'fileText';
    if (kind === 'docx') return 'fileText';
    if (kind === 'csv') return 'fileText';
    return 'fileText';
  }

  return (
    <div className="files-layout" data-screen-label="files">
      <div className="files-side">
        <div className="group">
          <div className="label"><span>Sandboxed roots</span><Icon name="plus" size={11} style={{color:'var(--fg-on-dark-3)'}} /></div>
          {roots.map(r => (
            <button key={r.name} className={'root ' + (activeRoot === r.name ? 'active' : '')} onClick={() => setActiveRoot(r.name)}>
              <Icon name={r.icon} className="ic" />
              <span>{r.name}</span>
              <span className="path">{r.count}</span>
            </button>
          ))}
        </div>

        <div className="group">
          <div className="label"><span>Saved filters</span></div>
          <button className="root">
            <Icon name="filter" className="ic" />
            <span>Un-ingested PDFs</span>
            <span className="path">11</span>
          </button>
          <button className="root">
            <Icon name="alert" className="ic" />
            <span>Failed parses</span>
            <span className="path">2</span>
          </button>
          <button className="root">
            <Icon name="history" className="ic" />
            <span>Touched today</span>
            <span className="path">9</span>
          </button>
        </div>

        <div className="group">
          <div className="label"><span>Ingest stats</span></div>
          <div style={{padding:'8px 10px'}}>
            <div style={{display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--fg-on-dark-2)', marginBottom:6, letterSpacing:'.04em'}}>
              <span style={{color:'var(--fg-on-dark-3)'}}>This week</span>
              <span>14 / 22</span>
            </div>
            <div style={{height:3, background:'var(--navy-3)', borderRadius:999, overflow:'hidden'}}>
              <div style={{height:'100%', width:'64%', background:'var(--cyan)'}} />
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--fg-on-dark-4)', marginTop:8, letterSpacing:'.04em'}}>
              <span>Pages spawned</span><span>+8</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--fg-on-dark-4)', marginTop:4, letterSpacing:'.04em'}}>
              <span>Chunks indexed</span><span>+412</span>
            </div>
          </div>
        </div>
      </div>

      <div className="files-main">
        <div className="files-toolbar">
          <div className="crumb-path">
            <Icon name="folder" size={13} style={{color:'var(--fg-on-dark-3)'}} />
            <span>~</span>
            <span className="sep">/</span>
            <span className="end">{activeRoot}</span>
          </div>
          <span style={{flex:1}} />
          <span className="tag">{files.length} items</span>
          <button className="btn btn-secondary btn-sm">
            <Icon name="filter" size={12} />
            Filter
          </button>
          <button className="btn btn-secondary btn-sm">
            <Icon name="upload" size={12} />
            Drop a file
          </button>
          <button className="btn btn-primary btn-sm">
            <Icon name="play" size={12} />
            Ingest selection
          </button>
        </div>

        <div className="files-list">
          <div className="file-row header">
            <span></span>
            <span>Name</span>
            <span>Modified</span>
            <span>Size</span>
            <span>Status</span>
            <span></span>
          </div>
          {files.map((f, i) => (
            <div className="file-row" key={i}>
              <div style={{display:'grid', placeItems:'center'}}>
                <Icon name={fileIcon(f.kind)} size={16} style={{color: f.isFolder ? 'var(--brass)' : 'var(--fg-on-dark-3)'}} />
              </div>
              <div className="fname">
                <span>{f.name}</span>
                {!f.isFolder && <span className="ext">{f.kind}</span>}
                {f.pages && <span className="ext" style={{color:'var(--fg-on-dark-3)'}}>· {f.pages} pages</span>}
              </div>
              <div className="mod">{f.mod}</div>
              <div className="size">{f.size}</div>
              <div className={'stat ' + (f.status === 'ingested' ? 'ingested' : f.status === 'queued' ? 'queued' : f.status === 'failed' ? 'failed' : '')}>
                {f.status === 'ingested' && '● indexed'}
                {f.status === 'queued' && '○ queued'}
                {f.status === 'failed' && '✕ failed'}
                {f.status === 'skipped' && '· skipped'}
                {f.status === '—' && '—'}
              </div>
              <div className="actions">
                {f.status !== 'ingested' && !f.isFolder && (
                  <button className="btn btn-ghost btn-sm" title="Ingest"><Icon name="play" size={12} /></button>
                )}
                <button className="btn btn-ghost btn-sm" title="More"><Icon name="more" size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.FilesScreen = FilesScreen;
