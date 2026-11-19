// SVG chart wheel drawn from Astrolog's computed positions.
// Single wheel: natal chart. Bi-wheel: natal inside, a second chart (e.g. progressed) outside.
import { glyphInner, hasGlyph } from './glyphs.js';
import { SIGNS, ASPECTS, norm } from './chartdata.js';

const ONE = {
  out: 490, zin: 418, h: 268, a: 228, glyph: 2.0,
  rings: [{ top: 418, tick: 400, pl: 357, deg: 311, retro: 287 }],
};
const BI = {
  out: 490, zin: 418, h: 214, a: 182, glyph: 1.7, sep: 316,
  rings: [
    { top: 418, tick: 402, pl: 384, deg: 350, retro: 331 }, // outer: second chart
    { top: 316, tick: 302, pl: 281, deg: 250, retro: 232 }, // inner: natal
  ],
};
const ANGLE_LABEL = { 0: 'AC', 3: 'IC', 6: 'DC', 9: 'MC' };
const f = n => n.toFixed(1);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Spread glyph positions apart so that no two are closer than `sep` degrees. */
function spread(items, sep) {
  const n = items.length;
  if (n < 2) return items.map(i => i.lon);
  const order = items.map((it, i) => ({ i, t: norm(it.lon) })).sort((a, b) => a.t - b.t);
  const p = order.map(o => o.t);
  for (let iter = 0; iter < 200; iter++) {
    let moved = false;
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      let d = p[k2] - p[k];
      if (k2 === 0) d += 360;
      if (d < sep) {
        const s = (sep - d) / 2;
        p[k] -= s; p[k2] += s; moved = true;
      }
    }
    for (let k = 0; k < n; k++) p[k] += (order[k].t - p[k]) * 0.02;
    if (!moved) break;
  }
  const out = new Array(n);
  order.forEach((o, k) => { out[o.i] = p[k]; });
  return out;
}

/**
 * chart: natal data. Options:
 *  outer: second chart's data (objects) for a bi-wheel; its keys get the prefix "p:".
 *  cross: aspects to draw in a bi-wheel [{a:'p:key', b:'key', type}]
 */
export function renderWheel(chart, { title = '', outer = null, cross = [], outerLabel = '' } = {}) {
  const R = outer ? BI : ONE;
  const ascLon = chart.cusps ? chart.cusps[0] : (chart.objects.find(o => o.key === 'asce')?.lon ?? 0);
  const rad = lon => ((180 + lon - ascLon) * Math.PI) / 180;
  const pt = (r, lon) => [r * Math.cos(rad(lon)), -r * Math.sin(rad(lon))];
  const xy = (r, lon) => { const [x, y] = pt(r, lon); return `${f(x)} ${f(y)}`; };
  const line = (r1, l1, r2, l2, cls, extra = '') => {
    const [x1, y1] = pt(r1, l1), [x2, y2] = pt(r2, l2);
    return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="${cls}"${extra}/>`;
  };
  const g = [];

  // Zodiac band
  g.push(`<circle r="${R.out}" class="w-face"/>`);
  SIGNS.forEach((s, i) => {
    const a = i * 30, b = a + 30;
    g.push(`<path class="band el-${s.el}" d="M${xy(R.out, a)}A${R.out} ${R.out} 0 0 0 ${xy(R.out, b)}L${xy(R.zin, b)}A${R.zin} ${R.zin} 0 0 1 ${xy(R.zin, a)}Z"/>`);
    const [x, y] = pt((R.out + R.zin) / 2, a + 15);
    g.push(`<g class="sg el-${s.el}" transform="translate(${f(x - 16)} ${f(y - 16)}) scale(1.6)"><title>${s.vi}</title>${glyphInner(s.id)}</g>`);
    g.push(line(R.zin, a, R.out, a, 'w-line'));
  });
  for (let d = 0; d < 360; d++) {
    const len = d % 10 === 0 ? 14 : d % 5 === 0 ? 10 : 5;
    g.push(line(R.zin, d, R.zin - len, d, 'w-tick'));
  }
  g.push(`<circle r="${R.out}" class="w-line w-strong"/><circle r="${R.zin}" class="w-line"/>`);
  if (outer) g.push(`<circle r="${R.sep}" class="w-line w-sep"/>`);
  g.push(`<circle r="${R.h}" class="w-line"/><circle r="${R.a}" class="w-line w-inner"/>`);

  // Houses (natal)
  if (chart.cusps) {
    chart.cusps.forEach((c, i) => {
      const angular = i in ANGLE_LABEL;
      g.push(line(angular ? R.out + 26 : (outer ? R.sep : R.zin), c, R.a, c, angular ? 'w-angle' : 'w-cusp'));
      if (angular) {
        const [x, y] = pt(R.out + 42, c);
        g.push(`<text x="${f(x)}" y="${f(y)}" class="w-angle-label">${ANGLE_LABEL[i]}</text>`);
      }
      const next = chart.cusps[(i + 1) % 12];
      const mid = c + norm(next - c) / 2;
      const [x, y] = pt((R.h + R.a) / 2, mid);
      g.push(`<text x="${f(x)}" y="${f(y)}" class="w-house">${i + 1}</text>`);
    });
  }

  // Aspect lines (between true positions)
  if (outer) {
    const pBy = Object.fromEntries(outer.objects.map(o => [o.key, o]));
    const nBy = Object.fromEntries(chart.objects.map(o => [o.key, o]));
    cross.forEach(asp => {
      const A = pBy[asp.a.replace(/^p:/, '')], B = nBy[asp.b];
      if (!A || !B) return;
      const kind = ASPECTS[asp.type]?.kind || 'minor';
      const w = (2.6 - Math.min(Math.abs(asp.orb), 1) * 1.2).toFixed(2);
      g.push(line(R.a, A.lon, R.a, B.lon, `asp ${kind}${asp.type === 'Con' ? ' conj' : ''}`, ` data-a="${asp.a}" data-b="${asp.b}" style="stroke-width:${w}"`));
    });
  } else {
    const byKey = Object.fromEntries(chart.objects.map(o => [o.key, o]));
    chart.aspects.forEach(asp => {
      const A = byKey[asp.a], B = byKey[asp.b];
      if (!A || !B || asp.type === 'Con') return;
      const kind = ASPECTS[asp.type]?.kind || 'minor';
      const w = (1.4 + Math.min(asp.power / 5, 2.2)).toFixed(2);
      g.push(line(R.a, A.lon, R.a, B.lon, `asp ${kind}`, ` data-a="${asp.a}" data-b="${asp.b}" style="stroke-width:${w}"`));
    });
  }

  // Planet rings
  const drawRing = (objs, ring, prefix, cls, labelSuffix) => {
    const sep = Math.min(((R.glyph * 20 + 8) / ring.pl) * 57.3, 340 / Math.max(objs.length, 1));
    const disp = spread(objs, sep);
    objs.forEach((o, i) => {
      const d = disp[i];
      const house = o.natalHouse ?? o.house;
      const label = `${o.info.vi}${labelSuffix}: ${o.pos.deg}°${String(o.pos.min).padStart(2, '0')}′ ${o.pos.sign.vi}` +
        (house ? `, nhà ${house}` : '') + (o.retro ? ', nghịch hành' : '');
      const [gx, gy] = pt(ring.pl, d);
      const [tx, ty] = pt(ring.deg, d);
      const half = 10 * R.glyph;
      const parts = [
        line(ring.top, o.lon, ring.tick, o.lon, 'pl-tick'),
        line(ring.tick, o.lon, ring.pl + half + 4, d, 'pl-lead'),
        `<circle cx="${f(pt(R.a, o.lon)[0])}" cy="${f(pt(R.a, o.lon)[1])}" r="4" class="pl-dot"/>`,
        `<circle cx="${f(gx)}" cy="${f(gy)}" r="${half + 13}" class="pl-hit"/>`,
        hasGlyph(o.info.g)
          ? `<g class="pl-glyph" transform="translate(${f(gx - half)} ${f(gy - half)}) scale(${R.glyph})">${glyphInner(o.info.g)}</g>`
          : `<text x="${f(gx)}" y="${f(gy)}" class="pl-text">${esc(o.info.abbr || o.name.slice(0, 3))}</text>`,
        `<text x="${f(tx)}" y="${f(ty)}" class="pl-deg">${o.pos.deg}°<tspan class="pl-min">${String(o.pos.min).padStart(2, '0')}′</tspan></text>`,
      ];
      if (o.retro) {
        const [rx, ry] = pt(ring.retro, d);
        parts.push(`<text x="${f(rx)}" y="${f(ry)}" class="pl-retro">℞</text>`);
      }
      g.push(`<g class="pl${cls}" data-k="${prefix}${o.key}" tabindex="0" role="button" aria-label="${esc(label)}"><title>${esc(label)}</title>${parts.join('')}</g>`);
    });
  };

  if (outer) {
    drawRing(outer.objects, R.rings[0], 'p:', ' outer', outerLabel);
    drawRing(chart.objects.filter(o => !o.info.angle), R.rings[1], '', '', '');
  } else {
    drawRing(chart.objects.filter(o => !o.info.angle), R.rings[0], '', '', '');
  }

  return `<svg class="wheel-svg${outer ? ' bi' : ''}" viewBox="-566 -566 1132 1132" role="img" aria-label="${esc(title)}">${g.join('')}</svg>`;
}

/** Hover/tap a planet to highlight its aspects. Calls onSelect(key|null). */
export function attachWheel(root, onSelect, initialPinned = null) {
  const svg = root.querySelector('.wheel-svg');
  let pinned = svg.querySelector(`.pl[data-k="${initialPinned}"]`) ? initialPinned : null;
  const show = key => {
    svg.classList.toggle('focus', !!key);
    svg.querySelectorAll('.pl').forEach(p => { p.classList.remove('linked'); p.classList.toggle('on', p.dataset.k === key); });
    svg.querySelectorAll('.asp').forEach(l => {
      const on = key && (l.dataset.a === key || l.dataset.b === key);
      l.classList.toggle('on', !!on);
      if (on) {
        const other = l.dataset.a === key ? l.dataset.b : l.dataset.a;
        svg.querySelector(`.pl[data-k="${other}"]`)?.classList.add('on', 'linked');
      }
    });
    onSelect?.(key);
  };
  svg.querySelectorAll('.pl').forEach(p => {
    p.addEventListener('mouseenter', () => { if (!pinned) show(p.dataset.k); });
    p.addEventListener('mouseleave', () => { if (!pinned) show(null); });
    const toggle = () => {
      pinned = pinned === p.dataset.k ? null : p.dataset.k;
      show(pinned);
    };
    p.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
  svg.addEventListener('click', () => { if (pinned) { pinned = null; show(null); } });
  if (pinned) show(pinned);
}
