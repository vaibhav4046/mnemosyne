/* Lightweight icon component — Lucide-style strokes drawn inline.
   Pass name + size. All icons use currentColor. */

const ICONS = {
  chat: 'M21 15a4 4 0 0 1-4 4H8l-5 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  galaxy: null, // custom
  files: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  agents: null, // custom (atom/swarm)
  mcp: 'M3 12h4l3-9 4 18 3-9h4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4 16.9l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.4.2.9.4 1.5.4H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  send: 'M22 2L11 13 M22 2l-7 20-4-9-9-4z',
  stop: 'M6 6h12v12H6z',
  copy: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6v4H9z',
  refresh: 'M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5',
  thumbsup: 'M7 10v12 M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l4.18-9.16A1.5 1.5 0 0 1 13.5 2.5L15 5.88z',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7 M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  folder: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  filePdf: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  fileText: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  fileImage: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M20 22l-4.5-6L9 22',
  desktop: 'M2 3h20v14H2z M8 21h8 M12 17v4',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  filter: 'M22 3H2l8 9.5V19l4 2v-8.5z',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z',
  terminal: 'M4 17l6-6-6-6 M12 19h8',
  database: null, // ellipse-based
  tag: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z M7 7h.01',
  plus: 'M12 5v14 M5 12h14',
  zoomIn: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3 M11 8v6 M8 11h6',
  zoomOut: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3 M8 11h6',
  rotate: 'M3 12a9 9 0 1 0 9-9 M3 4v8h8',
  play: 'M5 3l14 9-14 9z',
  pause: 'M6 4h4v16H6z M14 4h4v16h-4z',
  arrow: 'M5 12h14 M13 5l7 7-7 7',
  chevron: 'M9 18l6-6-6-6',
  chevronDown: 'M6 9l6 6 6-6',
  x: 'M18 6L6 18 M6 6l12 12',
  more: 'M12 12h.01 M19 12h.01 M5 12h.01',
  alert: 'M10.3 3.86L1.82 18a2 2 0 0 0 1.7 3h16.94a2 2 0 0 0 1.7-3L13.7 3.86a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01',
  check: 'M20 6L9 17l-5-5',
  flame: 'M8.5 14.5A2.5 2.5 0 0 0 11 17l1.5-1.5L11 14a2.5 2.5 0 0 0-2.5.5z M14.5 9.5a2 2 0 0 0-2 0c-1 .5-3.5 2.5-3.5 5.5a3 3 0 1 0 6 0 5 5 0 0 0 1.5-3.5 5 5 0 0 0-2-2.5z',
  power: 'M18.36 6.64a9 9 0 1 1-12.73 0 M12 2v10',
  history: 'M3 3v5h5 M3.05 13A9 9 0 1 0 6 5.3L3 8 M12 7v5l4 2',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0',
  question: 'M9 9a3 3 0 1 1 6 0c0 2-3 3-3 3 M12 17h.01',
  brain: 'M9 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3 M15 4.5a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3 M9 4.5h6 M9 19.5h6 M6 12h12',
  list: 'M3 6h18 M3 12h18 M3 18h18',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
  trash: 'M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
};

function Icon({ name, size = 16, stroke = 1.5, style, className }) {
  const d = ICONS[name];
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    style, className,
  };

  if (name === 'galaxy') {
    return (
      <svg {...props}>
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-22 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(22 12 12)" opacity="0.6" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="20" cy="9" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="4" cy="14" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === 'agents') {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="2" />
        <circle cx="5" cy="6" r="1.5" />
        <circle cx="19" cy="6" r="1.5" />
        <circle cx="5" cy="18" r="1.5" />
        <circle cx="19" cy="18" r="1.5" />
        <path d="M6.4 7L10.5 10.7 M17.6 7L13.5 10.7 M6.4 17L10.5 13.3 M17.6 17L13.5 13.3" />
      </svg>
    );
  }
  if (name === 'database') {
    return (
      <svg {...props}>
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5" />
        <path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" />
      </svg>
    );
  }

  // Multi-path: split d on " M "
  const parts = d.split(/(?=M)/);
  return (
    <svg {...props}>
      {parts.map((p, i) => <path key={i} d={p.trim()} />)}
    </svg>
  );
}

function BrandMark({ size = 32 }) {
  // Mnemosyne logomark — three nested orbits with a memory node
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.2">
      <g className="orbit">
        <ellipse cx="32" cy="32" rx="28" ry="11" transform="rotate(-22 32 32)" opacity="0.7" />
        <ellipse cx="32" cy="32" rx="28" ry="11" transform="rotate(22 32 32)" opacity="0.4" />
      </g>
      <circle cx="32" cy="32" r="4" fill="currentColor" stroke="none" />
      <circle cx="32" cy="32" r="7" opacity="0.4" />
      <circle cx="60" cy="32" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="32" cy="4" r="1" fill="currentColor" stroke="none" opacity="0.7" />
    </svg>
  );
}

window.Icon = Icon;
window.BrandMark = BrandMark;
