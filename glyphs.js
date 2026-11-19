// Astrological glyphs drawn as SVG strokes (20x20 box), so they look the same on every
// device instead of falling back to color emoji for the zodiac signs.

const P = {
  // planets & points
  sun: '<circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="1.3" class="g-fill"/>',
  moo: '<path d="M12.5 2.8A7.5 7.5 0 1 0 12.5 17.2 8 8 0 0 1 12.5 2.8Z"/>',
  mer: '<circle cx="10" cy="9.4" r="3.6"/><path d="M10 13v6M7.4 16.2h5.2M6.6 1.8a3.4 3.4 0 0 0 6.8 0"/>',
  ven: '<circle cx="10" cy="7.3" r="5"/><path d="M10 12.3v7.2M6.8 16h6.4"/>',
  mar: '<circle cx="8.3" cy="11.7" r="5.2"/><path d="M12 8 17.5 2.5M12.6 2.5h4.9v4.9"/>',
  jup: '<path d="M4 6.5C4 3 9.2 2.6 9.2 6.6c0 3.4-3 5.9-5.7 7.4H17M13.5 3v16.5"/>',
  sat: '<path d="M6.5 2v11.5M3.6 5h5.8M6.5 10.2c1.6-2.6 7.6-2.8 7.6 1.3 0 2.6-3.1 3.9-3.1 6 0 1.6 2.1 2 3.6 1"/>',
  ura: '<path d="M5 3v9M15 3v9M5 7.5h10M10 3v11"/><circle cx="10" cy="16.6" r="2.4"/>',
  nep: '<path d="M4 4c0 6 2.8 8 6 8s6-2 6-8M10 3v16.5M7 16.3h6M2.8 5.6 4 3.6l1.3 2M8.8 4.8 10 2.8l1.2 2M14.7 5.6 16 3.6l1.2 2"/>',
  plu: '<path d="M4.3 4.6c0 7.2 11.4 7.2 11.4 0M10 11.4V19M7 16h6"/><circle cx="10" cy="6" r="2.6"/>',
  nor: '<path d="M6.6 15C3 11.3 4 4 10 4s7 7.3 3.4 11"/><circle cx="6.2" cy="16.4" r="1.8"/><circle cx="13.8" cy="16.4" r="1.8"/>',
  sou: '<path d="M6.6 5C3 8.7 4 16 10 16s7-7.3 3.4-11"/><circle cx="6.2" cy="3.6" r="1.8"/><circle cx="13.8" cy="3.6" r="1.8"/>',
  chi: '<circle cx="10" cy="15.5" r="3"/><path d="M10 12.5V2M10 7.5l5-5M10 7.5l5 4"/>',
  lil: '<path d="M12.5 1.8A6 6 0 1 0 12.5 13.2 6.4 6.4 0 0 1 12.5 1.8ZM9 13.5v6M6.5 17h5"/>',
  // signs
  ari: '<path d="M3 8.5C2.6 3.2 9.6 2.4 10 8.6V18M17 8.5c.4-5.3-6.6-6.1-7-.1"/>',
  tau: '<circle cx="10" cy="13" r="5"/><path d="M3 3c1 4 4 5 7 5s6-1 7-5"/>',
  gem: '<path d="M4 3.5c4 1.6 8 1.6 12 0M4 16.5c4-1.6 8-1.6 12 0M7.5 4.7v10.6M12.5 4.7v10.6"/>',
  can: '<path d="M16.5 7C13.5 3 5.5 3.5 4.3 7.5M3.5 13c3 4 11 3.5 12.2-.5"/><circle cx="6.6" cy="8" r="2.4"/><circle cx="13.4" cy="12" r="2.4"/>',
  leo: '<circle cx="6.3" cy="12.6" r="2.8"/><path d="M9.1 12.4c-.2-5-.2-8.9 3.4-8.9 3.6 0 4 3.5 2.5 6.5-1.5 3-1.5 5.5.5 7 1 .6 2 .1 2-.8"/>',
  vir: '<path d="M3 5v10M3 7c0-3 4-3 4 0v8M7 7c0-3 4-3 4 0v6.5c0 3.2 3 3.6 4.6 1.4M11 11c1-3 5.2-3 4.6.8-.4 3-3.4 5.7-5.6 6.7"/>',
  lib: '<path d="M3 17h14M3 13.5h4.2C5.6 6.6 14.4 6.6 12.8 13.5H17"/>',
  sco: '<path d="M3 5v10M3 7c0-3 4-3 4 0v8M7 7c0-3 4-3 4 0v8c0 2.2 2 2.6 5 2.6M14 15.4l2.3 2.2-2.3 2.2"/>',
  sag: '<path d="M4 16.5 16 4.5M10 4.5h6v6M6.4 9.6l4.4 4.4"/>',
  cap: '<path d="M2.8 5c1.6 0 2.6 2 3.1 4.4l1.6 6.6 3-10.4c1-2.6 3.6-2.6 3.6.4v7.3c0-2.3 3.8-2.6 3.8.6 0 3.1-3.6 3.6-5.2 1.6"/>',
  aqu: '<path d="M2.5 8.5 5.6 6l3.1 2.5L11.8 6l3.1 2.5L17.5 6.4M2.5 14l3.1-2.5L8.7 14l3.1-2.5 3.1 2.5 2.6-2.1"/>',
  pis: '<path d="M4 3c4 4 4 10 0 14M16 3c-4 4-4 10 0 14M5.4 10h9.2"/>',
  // aspects
  Con: '<circle cx="8" cy="12" r="4.5"/><path d="M11.2 8.8 16.5 3.5"/>',
  Opp: '<circle cx="5" cy="15" r="2.8"/><circle cx="15" cy="5" r="2.8"/><path d="M7 13l6-6"/>',
  Squ: '<rect x="4" y="4" width="12" height="12" rx=".5"/>',
  Tri: '<path d="M10 3.2 17 16H3Z"/>',
  Sex: '<path d="M10 3v14M3.9 6.5l12.2 7M3.9 13.5l12.2-7"/>',
  Inc: '<path d="M4 4l6 3.5L16 4M10 7.5V17"/>',
  SSx: '<path d="M4 16l6-3.5 6 3.5M10 12.5V3"/>',
  SSq: '<path d="M16 5 4 15h12"/>',
  Ses: '<rect x="4" y="7" width="9" height="9" rx=".5"/><path d="M13 7l4-4M4 7V3"/>',
};

export const SIGN_IDS = ['ari', 'tau', 'gem', 'can', 'leo', 'vir', 'lib', 'sco', 'sag', 'cap', 'aqu', 'pis'];

export function hasGlyph(id) { return id in P; }

/** Raw glyph group (for embedding inside a larger SVG). */
export function glyphInner(id) { return P[id] || ''; }

/** Standalone inline SVG icon. */
export function glyph(id, size = 18, cls = '') {
  if (!P[id]) return '';
  return `<svg class="glyph ${cls}" viewBox="0 0 20 20" width="${size}" height="${size}" aria-hidden="true">${P[id]}</svg>`;
}
