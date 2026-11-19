// City search over Astrolog's atlas.as and time zone offsets from the browser's own
// IANA time zone database (which includes historical DST rules).

let cities = null;

const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

export async function loadAtlas() {
  if (cities) return cities;
  const text = await (await fetch('data/atlas.as')).text();
  const list = [];
  let tz = '';
  let started = false;
  for (const line of text.split(/\r?\n/)) {
    if (!started) { if (line.startsWith('-YY')) started = true; continue; }
    if (!line || line.startsWith(';')) continue;
    const p = line.split('\t');
    if (p.length < 4) continue;
    if (p[4]) tz = p[4].trim();
    const name = p[3].trim();
    list.push({ lon: -parseFloat(p[0]), lat: parseFloat(p[1]), cc: p[2], name, tz, key: fold(name) });
  }
  cities = list;
  return cities;
}

export function searchCities(query, limit = 8) {
  if (!cities) return [];
  const q = fold(query);
  if (!q) return [];
  const starts = [], contains = [];
  for (const c of cities) {
    if (c.key.startsWith(q)) starts.push(c);
    else if (q.length >= 3 && c.key.includes(q)) contains.push(c);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

export function isValidZone(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

const fmtCache = new Map();
function offsetAt(tz, instantMs) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    fmtCache.set(tz, f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(instantMs)).map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - instantMs) / 60000); // minutes east of UTC
}

/** Offset (minutes east of UTC) and daylight-saving part in effect for a local wall time in a zone. */
export function zoneInfo(tz, y, m, d, hh, mm) {
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let off = offsetAt(tz, wall);
  off = offsetAt(tz, wall - off * 60000);
  const std = Math.min(offsetAt(tz, Date.UTC(y, 0, 1, 12)), offsetAt(tz, Date.UTC(y, 6, 1, 12)));
  return { total: off, standard: std, dst: off - std };
}

const hm = mins => {
  const a = Math.abs(mins);
  return `${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}`;
};

/** Astrolog zone string: hours WEST of UTC, so UTC+7 becomes "-7:00". */
export const astroZone = minsEast => (minsEast > 0 ? '-' : '') + hm(minsEast);
export const astroDst = mins => hm(mins);

function dms(value, pos, neg) {
  const dir = value < 0 ? neg : pos;
  let a = Math.abs(value);
  let deg = Math.floor(a);
  let min = Math.round((a - deg) * 60);
  if (min === 60) { deg += 1; min = 0; }
  return `${deg}${dir}${String(min).padStart(2, '0')}`;
}
export const astroLon = lonEast => dms(lonEast, 'E', 'W');
export const astroLat = lat => dms(lat, 'N', 'S');

export function formatOffset(minsEast) {
  return `UTC${minsEast < 0 ? '−' : '+'}${hm(minsEast)}`;
}
