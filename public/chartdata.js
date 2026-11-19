// Turns Astrolog's output into structured chart data:
//  -o0 <file>  → exact positions of planets and house cusps
//  -a (plain)  → aspect list computed with Astrolog's own orbs and settings

export const SIGNS = [
  { id: 'ari', abbr: 'Ari', vi: 'Bạch Dương', el: 'fire', mode: 'card' },
  { id: 'tau', abbr: 'Tau', vi: 'Kim Ngưu', el: 'earth', mode: 'fixed' },
  { id: 'gem', abbr: 'Gem', vi: 'Song Tử', el: 'air', mode: 'mut' },
  { id: 'can', abbr: 'Can', vi: 'Cự Giải', el: 'water', mode: 'card' },
  { id: 'leo', abbr: 'Leo', vi: 'Sư Tử', el: 'fire', mode: 'fixed' },
  { id: 'vir', abbr: 'Vir', vi: 'Xử Nữ', el: 'earth', mode: 'mut' },
  { id: 'lib', abbr: 'Lib', vi: 'Thiên Bình', el: 'air', mode: 'card' },
  { id: 'sco', abbr: 'Sco', vi: 'Bọ Cạp', el: 'water', mode: 'fixed' },
  { id: 'sag', abbr: 'Sag', vi: 'Nhân Mã', el: 'fire', mode: 'mut' },
  { id: 'cap', abbr: 'Cap', vi: 'Ma Kết', el: 'earth', mode: 'card' },
  { id: 'aqu', abbr: 'Aqu', vi: 'Bảo Bình', el: 'air', mode: 'fixed' },
  { id: 'pis', abbr: 'Pis', vi: 'Song Ngư', el: 'water', mode: 'mut' },
];

export const ELEMENTS = { fire: 'Lửa', earth: 'Đất', air: 'Khí', water: 'Nước' };
export const MODES = { card: 'Tiên phong', fixed: 'Kiên định', mut: 'Linh hoạt' };

// Keyed by the first three letters Astrolog uses for each object.
export const OBJECTS = {
  sun: { vi: 'Mặt Trời', en: 'Sun' },
  moo: { vi: 'Mặt Trăng', en: 'Moon' },
  mer: { vi: 'Sao Thủy', en: 'Mercury' },
  ven: { vi: 'Sao Kim', en: 'Venus' },
  mar: { vi: 'Sao Hỏa', en: 'Mars' },
  jup: { vi: 'Sao Mộc', en: 'Jupiter' },
  sat: { vi: 'Sao Thổ', en: 'Saturn' },
  ura: { vi: 'Thiên Vương', en: 'Uranus' },
  nep: { vi: 'Hải Vương', en: 'Neptune' },
  plu: { vi: 'Diêm Vương', en: 'Pluto' },
  nor: { vi: 'Bắc Giao (La Hầu)', en: 'North Node' },
  sou: { vi: 'Nam Giao (Kế Đô)', en: 'South Node' },
  chi: { vi: 'Chiron', en: 'Chiron' },
  lil: { vi: 'Lilith', en: 'Lilith' },
  asc: { vi: 'Cung Mọc (ASC)', en: 'Ascendant', angle: 'AC' },
  mid: { vi: 'Thiên Đỉnh (MC)', en: 'Midheaven', angle: 'MC' },
};

export const ASPECTS = {
  Con: { vi: 'Hợp', angle: 0, kind: 'neutral' },
  Opp: { vi: 'Đối', angle: 180, kind: 'hard' },
  Squ: { vi: 'Vuông', angle: 90, kind: 'hard' },
  Tri: { vi: 'Tam hợp', angle: 120, kind: 'soft' },
  Sex: { vi: 'Lục hợp', angle: 60, kind: 'soft' },
  Inc: { vi: 'Lệch (150°)', angle: 150, kind: 'minor' },
  SSx: { vi: 'Bán lục hợp', angle: 30, kind: 'minor' },
  SSq: { vi: 'Bán vuông', angle: 45, kind: 'minor' },
  Ses: { vi: 'Vuông rưỡi', angle: 135, kind: 'minor' },
  Qui: { vi: 'Ngũ phân', angle: 72, kind: 'minor' },
  BQn: { vi: 'Nhị ngũ phân', angle: 144, kind: 'minor' },
};

const signIndex = abbr => SIGNS.findIndex(s => s.abbr.toLowerCase() === abbr.toLowerCase());
const keyOf = name => name.trim().slice(0, 3).toLowerCase();

const CUSP_NAMES = ['asce', '2nd', '3rd', 'nadi', '5th', '6th', 'desc', '8th', '9th', 'midh', '11th', '12th'];

/** Parse the -o0 position file. */
export function parsePositions(text) {
  const objects = [];
  const cusps = new Array(12).fill(null);
  const re = /^-YF\s+(\S+)\s+(\d+)\s+([A-Za-z]{3})\s+([\d.]+),\s*(-?\d+)\s+(-?[\d.]+),\s*(-?[\d.]+)\s+(-?[\d.]+)/;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(re);
    if (!m) continue;
    const [, name, deg, sign, min, latD, latM, vel, dist] = m;
    const si = signIndex(sign);
    if (si < 0) continue;
    const lon = si * 30 + +deg + +min / 60;
    const ci = CUSP_NAMES.indexOf(name.toLowerCase());
    if (ci >= 0) cusps[ci] = lon;
    if (ci > 0) continue; // cusps other than the Ascendant are not chart objects
    const latNeg = latD.startsWith('-') || +latM < 0;
    const lat = (latNeg ? -1 : 1) * (Math.abs(+latD) + Math.abs(+latM) / 60);
    objects.push({ key: keyOf(name), name, lon, lat, speed: +vel, dist: +dist, retro: +vel < 0 });
  }
  // The Midheaven is only listed as the 10th cusp; add it as an object too.
  if (cusps[9] != null && !objects.some(o => o.key === 'mid')) {
    objects.push({ key: 'mid', name: 'Midh', lon: cusps[9], lat: 0, speed: 0, dist: 0, retro: false });
  }
  return { objects, cusps };
}

/** Parse the plain-text -a aspect list. */
export function parseAspects(text) {
  const out = [];
  const re = /^\s*\d+:\s+(.+?)\s+[([]\w{3}[)\]]\s+(\w{3})\s+[([]\w{3}[)\]]\s+(.+?)\s+-\s+orb:\s*([+-]?)(\d+)[:°](\d+)'\s+-\s+power:\s*([\d.]+)/;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(re);
    if (!m) continue;
    const [, a, asp, b, sign, d, mi, power] = m;
    out.push({ a: keyOf(a), b: keyOf(b), type: asp, orb: (+d + +mi / 60) * (sign === '-' ? -1 : 1), power: +power });
  }
  return out;
}

export const norm = x => ((x % 360) + 360) % 360;

export function houseOf(lon, cusps) {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i], b = cusps[(i + 1) % 12];
    const span = norm(b - a), off = norm(lon - a);
    if (off < span) return i + 1;
  }
  return 1;
}

export function splitLon(lon) {
  const l = norm(lon);
  const si = Math.floor(l / 30);
  // Truncate (not round) minutes, the same way Astrolog prints positions.
  const totalMin = Math.floor((l - si * 30) * 60 + 1e-9);
  return { sign: SIGNS[si], si, deg: Math.floor(totalMin / 60), min: totalMin % 60 };
}

export const fmtDM = lon => { const s = splitLon(lon); return `${s.deg}°${String(s.min).padStart(2, '0')}′`; };

export function buildChart(posText, aspText) {
  const { objects, cusps } = parsePositions(posText);
  const aspects = parseAspects(aspText);
  const ok = cusps.every(c => c != null);
  for (const o of objects) {
    o.info = OBJECTS[o.key] || { vi: o.name, en: o.name };
    o.pos = splitLon(o.lon);
    o.house = ok ? houseOf(o.lon, cusps) : null;
  }
  // Balance of elements and modalities over the ten planets (Astrolog's own convention).
  const counted = objects.filter(o => ['sun', 'moo', 'mer', 'ven', 'mar', 'jup', 'sat', 'ura', 'nep', 'plu'].includes(o.key));
  const elements = { fire: [], earth: [], air: [], water: [] };
  const modes = { card: [], fixed: [], mut: [] };
  for (const o of counted) { elements[o.pos.sign.el].push(o.key); modes[o.pos.sign.mode].push(o.key); }
  return { objects, cusps: ok ? cusps : null, aspects, elements, modes };
}
