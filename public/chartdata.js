// Turns Astrolog's output into structured chart data:
//  -o0 <file>  → exact positions of the core objects and house cusps
//  -v -sd      → decimal positions of every displayed object (incl. Uranians, dwarf planets)
//  -a          → aspect list computed with Astrolog's own orbs and settings

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

// Keyed by the first four letters Astrolog prints for each object.
// astro = Astrolog's own object name (used for -R0), g = glyph id, abbr = short text label.
export const OBJECTS = {
  sun: { vi: 'Mặt Trời', astro: 'Sun', g: 'sun' },
  moon: { vi: 'Mặt Trăng', astro: 'Moon', g: 'moo' },
  merc: { vi: 'Sao Thủy', astro: 'Mercury', g: 'mer' },
  venu: { vi: 'Sao Kim', astro: 'Venus', g: 'ven' },
  mars: { vi: 'Sao Hỏa', astro: 'Mars', g: 'mar' },
  jupi: { vi: 'Sao Mộc', astro: 'Jupiter', g: 'jup' },
  satu: { vi: 'Sao Thổ', astro: 'Saturn', g: 'sat' },
  uran: { vi: 'Thiên Vương', astro: 'Uranus', g: 'ura' },
  nept: { vi: 'Hải Vương', astro: 'Neptune', g: 'nep' },
  plut: { vi: 'Diêm Vương', astro: 'Pluto', g: 'plu' },
  nort: { vi: 'Bắc Giao (La Hầu)', astro: 'North Node', g: 'nor' },
  sout: { vi: 'Nam Giao (Kế Đô)', astro: 'South Node', g: 'sou' },
  lili: { vi: 'Lilith (Trăng Đen)', astro: 'Lilith', g: 'lil' },
  fort: { vi: 'Phần Phúc', astro: 'Fortune', g: 'for' },
  vert: { vi: 'Vertex', astro: 'Vertex', abbr: 'Vx' },
  east: { vi: 'Điểm Đông', astro: 'East Point', abbr: 'EP' },
  chir: { vi: 'Chiron', astro: 'Chiron', g: 'chi' },
  cere: { vi: 'Ceres', astro: 'Ceres', g: 'cer' },
  pall: { vi: 'Pallas', astro: 'Pallas', g: 'pal' },
  juno: { vi: 'Juno', astro: 'Juno', g: 'jun' },
  vest: { vi: 'Vesta', astro: 'Vesta', g: 'ves' },
  hygi: { vi: 'Hygiea', astro: 'Hygiea', abbr: 'Hyg' },
  phol: { vi: 'Pholus', astro: 'Pholus', abbr: 'Pho' },
  eris: { vi: 'Eris', astro: 'Eris', abbr: 'Eri' },
  haum: { vi: 'Haumea', astro: 'Haumea', abbr: 'Hau' },
  make: { vi: 'Makemake', astro: 'Makemake', abbr: 'Mak' },
  gong: { vi: 'Gonggong', astro: 'Gonggong', abbr: 'Gon' },
  quao: { vi: 'Quaoar', astro: 'Quaoar', abbr: 'Qua' },
  sedn: { vi: 'Sedna', astro: 'Sedna', abbr: 'Sed' },
  orcu: { vi: 'Orcus', astro: 'Orcus', abbr: 'Orc' },
  cupi: { vi: 'Cupido', astro: 'Cupido', abbr: 'Cup' },
  hade: { vi: 'Hades', astro: 'Hades', abbr: 'Had' },
  zeus: { vi: 'Zeus', astro: 'Zeus', abbr: 'Zeu' },
  kron: { vi: 'Kronos', astro: 'Kronos', abbr: 'Kro' },
  apol: { vi: 'Apollon', astro: 'Apollon', abbr: 'Apo' },
  adme: { vi: 'Admetos', astro: 'Admetos', abbr: 'Adm' },
  vulk: { vi: 'Vulkanus', astro: 'Vulkanus', abbr: 'Vlk' },
  pose: { vi: 'Poseidon', astro: 'Poseidon', abbr: 'Pos' },
  vulc: { vi: 'Vulcan', astro: 'Vulcan', abbr: 'Vul' },
  asce: { vi: 'Cung Mọc (ASC)', astro: 'Ascendant', abbr: 'AC', angle: true },
  midh: { vi: 'Thiên Đỉnh (MC)', astro: 'Midheaven', abbr: 'MC', angle: true },
};

export const CORE = ['sun', 'moon', 'merc', 'venu', 'mars', 'jupi', 'satu', 'uran', 'nept', 'plut'];
export const OBJECT_GROUPS = [
  { id: 'points', vi: 'Điểm', keys: ['nort', 'sout', 'lili', 'fort', 'vert', 'east'] },
  { id: 'asteroids', vi: 'Tiểu hành tinh', keys: ['chir', 'cere', 'pall', 'juno', 'vest', 'hygi', 'phol'] },
  { id: 'dwarfs', vi: 'Hành tinh lùn', keys: ['eris', 'haum', 'make', 'gong', 'quao', 'sedn', 'orcu'] },
  { id: 'uranian', vi: 'Uranian (trường phái Hamburg)', keys: ['cupi', 'hade', 'zeus', 'kron', 'apol', 'adme', 'vulk', 'pose', 'vulc'] },
];
export const DEFAULT_EXTRAS = ['nort'];

/** Astrolog switches that show exactly the core planets, the angles and the chosen extras. */
export function objectSwitches(extras = DEFAULT_EXTRAS) {
  const keys = [...CORE, ...extras.filter(k => OBJECTS[k] && !CORE.includes(k)), 'asce', 'midh'];
  return ['-R0', ...keys.map(k => OBJECTS[k].astro)];
}

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
export const keyOf = name => name.trim().slice(0, 4).toLowerCase();

const CUSP_NAMES = ['asce', '2nd', '3rd', 'nadi', '5th', '6th', 'desc', '8th', '9th', 'midh', '11th', '12th'];

/** Parse the -o0 position file (core objects only, full precision). */
export function parsePositions(text) {
  const objects = new Map();
  const cusps = new Array(12).fill(null);
  const re = /^-YF\s+(\S+)\s+(\d+)\s+([A-Za-z]{3})\s+([\d.]+),\s*(-?\d+)\s+(-?[\d.]+),\s*(-?[\d.]+)\s+(-?[\d.]+)/;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(re);
    if (!m) continue;
    const [, name, deg, sign, min, latD, latM, vel] = m;
    const si = signIndex(sign);
    if (si < 0) continue;
    const lon = si * 30 + +deg + +min / 60;
    const ci = CUSP_NAMES.indexOf(name.toLowerCase());
    if (ci >= 0) cusps[ci] = lon;
    if (ci > 0) continue;
    const latNeg = latD.startsWith('-') || +latM < 0;
    const lat = (latNeg ? -1 : 1) * (Math.abs(+latD) + Math.abs(+latM) / 60);
    objects.set(keyOf(name), { lon, lat, speed: +vel });
  }
  return { objects, cusps };
}

/** Parse the -v listing printed with -sd (decimal degrees). Returns objects in Astrolog's order. */
export function parseListing(text) {
  const objects = [];
  const cusps = new Array(12).fill(null);
  const re = /^([A-Za-z][A-Za-z ]{0,3}):\s+([\d.]+)\s+(R?)\s*([+-]\s*[\d.]+)\s.*?\[\s*\d+\w\w house\](?:\s+\[[^\]]*\])?\s+([+-]?[\d.]+)/;
  for (const line of text.split(/\r?\n/)) {
    const c = line.match(/House cusp\s+(\d+):\s+([\d.]+)/);
    if (c) cusps[+c[1] - 1] = +c[2];
    const m = line.match(re);
    if (!m) continue;
    const [, name, lon, r, lat, vel] = m;
    objects.push({ key: keyOf(name), name: name.trim(), lon: +lon, lat: parseFloat(lat.replace(/\s/g, '')), speed: +vel, retroFlag: r === 'R' });
  }
  return { objects, cusps };
}

/** Parse the plain-text -a aspect list (zodiac or decimal display). */
export function parseAspects(text) {
  const out = [];
  const re = /^\s*\d+:\s+(.+?)\s+[([<][^)\]>]*[)\]>]\s+(\w{3})\s+[([<][^)\]>]*[)\]>]\s+(.+?)\s+-\s+orb:\s*([+-]?)(\d+(?:\.\d+)?)(?:[:°](\d+)')?\s+-\s+power:\s*([\d.]+)/;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(re);
    if (!m) continue;
    const [, a, asp, b, sign, d, mi, power] = m;
    const orb = (mi !== undefined ? +d + +mi / 60 : +d) * (sign === '-' ? -1 : 1);
    out.push({ a: keyOf(a), b: keyOf(b), type: asp, orb, power: +power });
  }
  return out;
}

export const norm = x => ((x % 360) + 360) % 360;

export function houseOf(lon, cusps) {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i], b = cusps[(i + 1) % 12];
    if (norm(lon - a) < norm(b - a)) return i + 1;
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

export function buildChart(posText, stdout) {
  const precise = parsePositions(posText);
  const listing = parseListing(stdout);
  const aspects = parseAspects(stdout);
  const objects = listing.objects.map(o => {
    const p = precise.objects.get(o.key);
    return p ? { ...o, ...p } : o;
  });
  if (!objects.some(o => o.key === 'midh') && precise.cusps[9] != null) {
    objects.push({ key: 'midh', name: 'Midh', lon: precise.cusps[9], lat: 0, speed: 0 });
  }
  const cusps = precise.cusps.every(c => c != null) ? precise.cusps
    : listing.cusps.every(c => c != null) ? listing.cusps : null;
  for (const o of objects) {
    o.info = OBJECTS[o.key] || { vi: o.name, abbr: o.name.slice(0, 3) };
    o.pos = splitLon(o.lon);
    o.house = cusps ? houseOf(o.lon, cusps) : null;
    o.retro = o.info.angle ? false : (o.retroFlag ?? o.speed < 0);
  }
  // Balance of elements and modalities over the ten planets (Astrolog's own convention).
  const elements = { fire: [], earth: [], air: [], water: [] };
  const modes = { card: [], fixed: [], mut: [] };
  for (const o of objects.filter(x => CORE.includes(x.key))) {
    elements[o.pos.sign.el].push(o.key);
    modes[o.pos.sign.mode].push(o.key);
  }
  return { objects, cusps, aspects, elements, modes };
}
