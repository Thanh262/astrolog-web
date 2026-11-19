// Transits: the sky at a chosen moment against the natal chart.
// Positions come from Astrolog; the monthly list of exact transits is Astrolog's own -t listing.
import { runAstrolog } from './engine.js';
import { buildChart, keyOf, OBJECTS } from './chartdata.js';
import { MAJOR } from './progression.js';

const latin1 = new TextDecoder('latin1');
const signed = v => ((v % 360) + 540) % 360 - 180;
export const SLOW = ['jupi', 'satu', 'uran', 'nept', 'plut', 'nort', 'chir'];

/** Astrolog snapshot of the sky for a chart object (date/time/place/tz). */
export async function transitSnapshot(args) {
  const res = await runAstrolog([...args, '_X', '_k', '-sd', '-v', '-o0', '/pos.as'], ['/pos.as']);
  const pos = res.files['/pos.as'];
  if (!pos) throw new Error(res.stderr || res.stdout || 'không tính được transit');
  const data = buildChart(latin1.decode(pos), res.stdout);
  // Transiting angles depend on where you stand, not on the natal chart; leave them out.
  data.objects = data.objects.filter(o => !o.info.angle);
  return data;
}

/** Transit-to-natal aspects within `orb` degrees (returns of a planet to itself included). */
export function transitAspects(transit, natal, orb) {
  const out = [];
  for (const t of transit.objects) {
    for (const n of natal.objects) {
      const sep = Math.abs(signed(t.lon - n.lon));
      for (const [type, angle] of MAJOR) {
        const o = sep - angle;
        if (Math.abs(o) > orb) continue;
        const later = Math.abs(signed(t.lon + (t.speed || 0) * 0.1 - n.lon)) - angle;
        out.push({ a: 'p:' + t.key, b: n.key, pKey: t.key, type, orb: o, applying: Math.abs(later) < Math.abs(o) });
      }
    }
  }
  return out.sort((x, y) => Math.abs(x.orb) - Math.abs(y.orb));
}

/**
 * Astrolog's list of exact transits in one month (-t). `movers` are object keys allowed to
 * transit; times are in the zone given by zoneArgs.
 */
export async function monthTransits(args, zoneArgs, movers, month, year) {
  const names = movers.filter(k => OBJECTS[k]).map(k => OBJECTS[k].astro);
  const res = await runAstrolog([...args, ...zoneArgs, '_X', '_k', '-RT0', ...names, '-t', String(month), String(year)]);
  const re = /^\s*(\d+)\/\s*(\d+)\/(-?\d+)\s+(\d+):(\d+)(am|pm)\s+trans\s+(.+?)\s+([([<])\w{3}[)\]>]\s+(\w{3})\s+natal\s+[([<]\w{3}[)\]>]\s+(.+?)\s*(?:\((.+)\))?\s*$/;
  const events = [];
  for (const line of res.stdout.split(/\r?\n/)) {
    const m = line.match(re);
    if (!m) continue;
    const [, mo, d, y, h, mi, ap, tName, br, type, nName, note] = m;
    let hh = +h % 12;
    if (ap === 'pm') hh += 12;
    events.push({ y: +y, m: +mo, d: +d, hh, mm: +mi, t: keyOf(tName), retro: br === '[', type, n: keyOf(nName), note: note || '' });
  }
  return events;
}
