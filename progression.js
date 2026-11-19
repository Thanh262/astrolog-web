// Progressions: Astrolog computes the progressed positions (-p1 secondary with solar arc
// angles, -p0 solar arc). This module adds the progressed-to-natal aspects and a yearly
// timeline, interpolated between a few Astrolog snapshots of the progressed chart.
import { runAstrolog } from './engine.js';
import { buildChart, houseOf, norm } from './chartdata.js';

export const METHODS = {
  secondary: { sw: '-p1', vi: 'Thứ cấp (Secondary)', short: 'Thứ cấp' },
  solar: { sw: '-p0', vi: 'Cung Mặt Trời (Solar arc)', short: 'Solar arc' },
};
export const MAJOR = [['Con', 0], ['Sex', 60], ['Squ', 90], ['Tri', 120], ['Opp', 180]];
export const ORB = 1; // degrees, the usual orb for progressions

// Secondary progressed outer planets barely move in a lifetime, so astrologers read
// the fast movers and the progressed angles.
const SECONDARY_MOVERS = ['sun', 'moon', 'merc', 'venu', 'mars', 'asce', 'midh'];

const signed = v => ((v % 360) + 540) % 360 - 180; // shortest signed difference
const latin1 = new TextDecoder('latin1');
const YEAR_MS = 365.2422 * 86400000;

export const dateParts = d => [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
export const isoDate = d => `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
export const parseIso = s => { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(2000, m - 1, d)); t.setUTCFullYear(y); return t; };

/** Astrolog snapshot of the progressed chart for one target date. */
export async function snapshot(baseArgs, zoneArgs, method, date) {
  const [y, m, d] = dateParts(date);
  const res = await runAstrolog([...baseArgs, ...zoneArgs, METHODS[method].sw, String(m), String(d), String(y),
    '_X', '_k', '-sd', '-v', '-o0', '/pos.as'], ['/pos.as']);
  const pos = res.files['/pos.as'];
  if (!pos) throw new Error(res.stderr || res.stdout || 'không tính được tiến trình');
  return buildChart(latin1.decode(pos), res.stdout);
}

export function movers(method, prog) {
  return method === 'solar' ? prog.objects : prog.objects.filter(o => SECONDARY_MOVERS.includes(o.key));
}

function skipPair(method, pKey, nKey) {
  // Under solar arc every point moves the same arc, so a point always aspects its own natal place.
  return pKey === nKey && (method === 'solar' || pKey !== 'moon');
}

/** Progressed-to-natal aspects within ORB at one moment. */
export function crossAspects(method, prog, natal) {
  const out = [];
  for (const p of movers(method, prog)) {
    for (const n of natal.objects) {
      if (skipPair(method, p.key, n.key)) continue;
      const sep = Math.abs(signed(p.lon - n.lon));
      for (const [type, angle] of MAJOR) {
        const orb = sep - angle;
        if (Math.abs(orb) > ORB) continue;
        // Applying if a small step forward in time brings the aspect closer to exact.
        const later = Math.abs(signed(p.lon + (p.speed || 0) * 0.05 - n.lon)) - angle;
        out.push({ a: 'p:' + p.key, b: n.key, pKey: p.key, type, orb, applying: Math.abs(later) < Math.abs(orb) });
      }
    }
  }
  return out.sort((x, y) => Math.abs(x.orb) - Math.abs(y.orb));
}

/** Natal houses for progressed points (bi-wheel convention). */
export function natalHouses(prog, natal) {
  if (!natal.cusps) return;
  for (const o of prog.objects) o.natalHouse = houseOf(o.lon, natal.cusps);
}

/**
 * Events in one calendar year: exact progressed-to-natal aspects and sign ingresses,
 * found by linear interpolation between quarterly Astrolog snapshots (dates are approximate).
 */
export async function yearTimeline(baseArgs, zoneArgs, method, natal, year) {
  const mk = (y, m) => { const t = new Date(Date.UTC(2000, m, 1)); t.setUTCFullYear(y); return t; };
  const dates = [mk(year, 0), mk(year, 3), mk(year, 6), mk(year, 9), mk(year + 1, 0)];
  const snaps = [];
  for (const d of dates) snaps.push(await snapshot(baseArgs, zoneArgs, method, d));
  const events = [];
  for (let i = 0; i < 4; i++) {
    const A = snaps[i], B = snaps[i + 1];
    const t0 = dates[i].getTime(), t1 = dates[i + 1].getTime();
    const at = frac => new Date(t0 + (t1 - t0) * frac);
    for (const p0 of movers(method, A)) {
      const p1 = B.objects.find(o => o.key === p0.key);
      if (!p1) continue;
      const delta = signed(p1.lon - p0.lon);
      if (Math.abs(delta) < 1e-6) continue;
      const crossing = target => { const f = signed(target - p0.lon) / delta; return f >= 0 && f < 1 ? f : null; };
      // Sign ingresses
      for (let k = 0; k < 12; k++) {
        const f = crossing(k * 30);
        if (f !== null) events.push({ date: at(f), kind: 'ingress', p: p0.key, sign: delta > 0 ? k : (k + 11) % 12 });
      }
      // Exact aspects to natal points
      for (const n of natal.objects) {
        if (skipPair(method, p0.key, n.key)) continue;
        for (const [type, angle] of MAJOR) {
          const targets = angle === 0 || angle === 180 ? [n.lon + angle] : [n.lon + angle, n.lon - angle];
          for (const tgt of targets) {
            const f = crossing(norm(tgt));
            if (f !== null) events.push({ date: at(f), kind: 'aspect', p: p0.key, n: n.key, type, retro: delta < 0 });
          }
        }
      }
    }
  }
  return events.sort((a, b) => a.date - b.date);
}

/** Age in years at the target date, and the real date whose sky is the progressed chart. */
export function progressedMoment(birthIso, birthTime, target) {
  const [hh, mm] = birthTime.split(':').map(Number);
  const birth = parseIso(birthIso).getTime() + (hh * 60 + mm) * 60000;
  const age = (target.getTime() - birth) / YEAR_MS;
  return { age, sky: new Date(birth + age * 86400000) };
}
