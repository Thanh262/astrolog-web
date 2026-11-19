import { initEngine, runAstrolog, astrologHtmlToFragment } from './engine.js';
import {
  buildChart, ASPECTS, ELEMENTS, MODES, OBJECTS, OBJECT_GROUPS, CORE, DEFAULT_EXTRAS,
  objectSwitches, splitLon, norm,
} from './chartdata.js';
import { renderWheel, attachWheel } from './wheel.js';
import { glyph } from './glyphs.js';
import {
  loadAtlas, searchCities, isValidZone, zoneInfo,
  astroZone, astroDst, astroLon, astroLat, formatOffset,
} from './atlas.js';

const $ = id => document.getElementById(id);
const form = $('chartForm');
const f = {
  name: $('name'), date: $('date'), time: $('time'), city: $('city'),
  lat: $('lat'), lon: $('lon'), tz: $('tz'), house: $('house'), zodiac: $('zodiac'),
};
const suggest = $('citySuggest');
const tabBody = $('tabBody');

const pad = n => String(n).padStart(2, '0');
const ascii = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\x20-\x7e]/g, '').trim();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- per-device storage (best effort) ----------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('astrolog-web.' + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('astrolog-web.' + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
};

// ---------- theme ----------
const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};
$('themeBtn').addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('astrolog-web.theme', next); } catch { /* ignore */ }
  onThemeChange();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onThemeChange);
function onThemeChange() {
  if (wheelLight === null && current && activeTab === 'classic' && classicView === 'wheel') renderTab('classic');
}

// ---------- engine status ----------
initEngine()
  .then(() => { $('engineTag').textContent = 'Lõi Astrolog 7.80 · Swiss Ephemeris'; })
  .catch(err => { $('engineTag').textContent = 'Lỗi nạp lõi: ' + err.message; });

// ---------- defaults ----------
(function setDefaults() {
  const now = new Date();
  f.date.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  f.time.value = '12:00';
  f.lat.value = '21.0245'; f.lon.value = '105.8412'; f.tz.value = 'Asia/Bangkok';
  f.city.value = 'Hanoi, VN';
})();

loadAtlas().then(() => {
  const hanoi = searchCities('Hanoi', 20).find(c => c.cc === 'VN');
  if (hanoi && f.city.value === 'Hanoi, VN') pickCity(hanoi, false);
});

// ---------- city autocomplete ----------
let matches = [];
let activeIdx = -1;

function renderSuggest() {
  if (!matches.length) { closeSuggest(); return; }
  suggest.innerHTML = matches.map((c, i) =>
    `<li role="option" id="opt${i}" data-i="${i}" aria-selected="${i === activeIdx}">
       <span>${esc(c.name)}</span><span class="cc">${esc(c.cc)} · ${esc(c.tz)}</span></li>`).join('');
  suggest.hidden = false;
  f.city.setAttribute('aria-expanded', 'true');
  f.city.setAttribute('aria-activedescendant', activeIdx >= 0 ? 'opt' + activeIdx : '');
}
function closeSuggest() {
  suggest.hidden = true; matches = []; activeIdx = -1;
  f.city.setAttribute('aria-expanded', 'false');
}
function pickCity(c, focusNext = true) {
  f.city.value = `${c.name}, ${c.cc}`;
  f.lat.value = c.lat.toFixed(4);
  f.lon.value = c.lon.toFixed(4);
  f.tz.value = c.tz;
  closeSuggest();
  updateZoneNote();
  if (focusNext) f.city.blur();
}
f.city.addEventListener('input', async () => {
  await loadAtlas();
  matches = searchCities(f.city.value);
  activeIdx = matches.length ? 0 : -1;
  renderSuggest();
});
f.city.addEventListener('keydown', e => {
  if (suggest.hidden) return;
  if (e.key === 'ArrowDown') { activeIdx = (activeIdx + 1) % matches.length; renderSuggest(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { activeIdx = (activeIdx - 1 + matches.length) % matches.length; renderSuggest(); e.preventDefault(); }
  else if (e.key === 'Enter' && activeIdx >= 0) { pickCity(matches[activeIdx]); e.preventDefault(); }
  else if (e.key === 'Escape') closeSuggest();
});
f.city.addEventListener('blur', () => setTimeout(closeSuggest, 150));
suggest.addEventListener('mousedown', e => {
  const li = e.target.closest('li');
  if (li) { e.preventDefault(); pickCity(matches[+li.dataset.i]); }
});

// ---------- time zone note ----------
function updateZoneNote() {
  const note = $('zoneNote');
  const tz = f.tz.value.trim();
  if (!tz || !isValidZone(tz) || !f.date.value || !f.time.value) {
    note.textContent = 'Kinh độ dương là phía Đông. Múi giờ theo chuẩn IANA, tự xét giờ mùa hè.';
    return;
  }
  const [y, m, d] = f.date.value.split('-').map(Number);
  const [hh, mm] = f.time.value.split(':').map(Number);
  const z = zoneInfo(tz, y, m, d, hh, mm);
  note.textContent = `Giờ địa phương lúc sinh: ${formatOffset(z.total)}` +
    (z.dst ? ` (đang áp dụng giờ mùa hè +${Math.abs(z.dst) / 60}h)` : '') + '.';
}
[f.tz, f.date, f.time].forEach(el => el.addEventListener('change', updateZoneNote));

// ---------- form ----------
function showError(msg, el) {
  const box = $('formError');
  Object.values(f).forEach(x => x.removeAttribute('aria-invalid'));
  if (!msg) { box.hidden = true; return; }
  box.textContent = msg; box.hidden = false;
  if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
}
Object.values(f).forEach(el => el.addEventListener('input', () => {
  if (el.getAttribute('aria-invalid')) showError('');
}));

function readForm() {
  if (!f.date.value) return showError('Chọn ngày sinh.', f.date);
  if (!f.time.value) return showError('Chọn giờ sinh.', f.time);
  const lat = parseFloat(f.lat.value), lon = parseFloat(f.lon.value);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return showError('Vĩ độ phải trong khoảng −90 đến 90. Hãy chọn nơi sinh từ danh sách.', f.lat);
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return showError('Kinh độ phải trong khoảng −180 đến 180.', f.lon);
  const tz = f.tz.value.trim();
  if (!tz || !isValidZone(tz)) return showError('Múi giờ không hợp lệ. Dùng tên IANA, ví dụ Asia/Ho_Chi_Minh.', f.tz);
  showError('');
  return {
    name: f.name.value.trim(), date: f.date.value, time: f.time.value.slice(0, 5),
    place: f.city.value.trim() || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    lat, lon, tz, house: f.house.value, zodiac: f.zodiac.value, extras: selectedExtras(),
  };
}
function fillForm(c) {
  f.name.value = c.name; f.date.value = c.date; f.time.value = c.time; f.city.value = c.place;
  f.lat.value = c.lat; f.lon.value = c.lon; f.tz.value = c.tz;
  f.house.value = c.house; f.zodiac.value = c.zodiac;
  setExtras(c.extras || DEFAULT_EXTRAS);
  updateZoneNote();
}

// ---------- object picker (extra planets and points) ----------
const picker = $('objectPicker');
picker.innerHTML = OBJECT_GROUPS.map(g => `
  <div class="obj-group">
    <div class="obj-group-head"><span>${g.vi}</span>
      <button type="button" class="link-btn" data-group="${g.id}">Chọn hết</button></div>
    <div class="obj-chips">${g.keys.map(k => `
      <label class="obj-chip" title="${esc(OBJECTS[k].vi)}">
        <input type="checkbox" value="${k}">
        ${objGlyph(k, 15)}<span>${esc(OBJECTS[k].vi.replace(/\s*\(.*\)$/, ''))}</span>
      </label>`).join('')}</div>
  </div>`).join('');

function selectedExtras() {
  return [...picker.querySelectorAll('input:checked')].map(i => i.value);
}
function setExtras(keys) {
  picker.querySelectorAll('input').forEach(i => { i.checked = keys.includes(i.value); });
  updatePickerCount();
}
function updatePickerCount() {
  $('objCount').textContent = `${CORE.length + 2 + selectedExtras().length} thiên thể`;
}
function onExtrasChange() {
  updatePickerCount();
  store.set('extras', selectedExtras());
  if (current) { current = { ...current, extras: selectedExtras() }; resetCache(); renderTab(activeTab); }
}
picker.addEventListener('change', onExtrasChange);
picker.addEventListener('click', e => {
  const b = e.target.closest('[data-group]');
  if (!b) return;
  const boxes = [...picker.querySelectorAll(`.obj-group:has([data-group="${b.dataset.group}"]) input`)];
  const all = boxes.every(i => i.checked);
  boxes.forEach(i => { i.checked = !all; });
  onExtrasChange();
});
document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
  const p = b.dataset.preset;
  setExtras(p === 'basic' ? DEFAULT_EXTRAS
    : p === 'popular' ? ['nort', 'sout', 'lili', 'fort', 'vert', 'chir', 'cere', 'pall', 'juno', 'vest']
      : OBJECT_GROUPS.flatMap(g => g.keys));
  onExtrasChange();
}));
setExtras(store.get('extras', DEFAULT_EXTRAS));

form.addEventListener('submit', e => {
  e.preventDefault();
  const c = readForm();
  if (c) cast(c);
});
$('nowBtn').addEventListener('click', () => {
  const tz = isValidZone(f.tz.value.trim()) ? f.tz.value.trim() : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  f.date.value = `${p.year}-${p.month}-${p.day}`;
  f.time.value = `${p.hour}:${p.minute}`;
  if (!f.name.value.trim()) f.name.value = 'Thời điểm hiện tại';
  updateZoneNote();
  const c = readForm();
  if (c) cast(c);
});

// ---------- chart ----------
let current = null;   // the chart as entered
let shift = 0;        // minutes added while rectifying the birth time
let activeTab = 'wheel';
let wheelLight = null; // null = follow theme
let renderSeq = 0;
const cache = new Map();

/** The chart with the rectification shift applied. */
function shiftChart(c, minutes) {
  if (!minutes) return c;
  const [y, m, d] = c.date.split('-').map(Number);
  const [hh, mm] = c.time.split(':').map(Number);
  const t = new Date(Date.UTC(2000, m - 1, d, hh, mm) + minutes * 60000);
  t.setUTCFullYear(t.getUTCFullYear() - 2000 + y); // keeps years before 100 AD intact
  return {
    ...c,
    date: `${String(t.getUTCFullYear()).padStart(4, '0')}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`,
    time: `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`,
  };
}
const view = () => shiftChart(current, shift);

function baseArgs(c) {
  const [y, m, d] = c.date.split('-').map(Number);
  const [hh, mm] = c.time.split(':').map(Number);
  const z = zoneInfo(c.tz, y, m, d, hh, mm);
  const args = ['-qb', String(m), String(d), String(y), `${hh}:${pad(mm)}`,
    astroDst(z.dst), astroZone(z.standard), astroLon(c.lon), astroLat(c.lat),
    '-zi', ascii(c.name) || 'Chart', ascii(c.place) || '-', '-c', String(c.house),
    ...objectSwitches(c.extras || DEFAULT_EXTRAS)];
  if (c.zodiac === 'sidereal') args.push('-s');
  return { args, zone: z };
}

function resetCache() {
  cache.forEach(p => Promise.resolve(p).then(v => { if (v?.url) URL.revokeObjectURL(v.url); }, () => {}));
  cache.clear();
}

function fmtShift(min) {
  const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
  return (min < 0 ? '−' : '+') + (h ? `${h} giờ ${m ? m + ' phút' : ''}` : `${m} phút`).trim();
}

function updateHeader() {
  const c = view();
  const { zone } = baseArgs(c);
  const [y, m, d] = c.date.split('-');
  $('chartTitle').textContent = c.name || 'Lá số';
  // Same text length whatever the shift, so the header never re-wraps while rotating.
  $('chartMeta').innerHTML = `<span class="${shift ? 'meta-shifted' : ''}" title="${shift ? 'Giờ đang thử (' + esc(fmtShift(shift)) + ')' : ''}">` +
    esc(`${d}/${m}/${y} lúc ${c.time}`) + '</span>' +
    esc(` · ${c.place} · ${formatOffset(zone.total)}` + (c.zodiac === 'sidereal' ? ' · Sidereal' : '') +
      ` · ${f.house.querySelector(`option[value="${c.house}"]`)?.textContent || ''}`);
}

function cast(c) {
  current = c;
  shift = 0;
  resetCache();
  updateHeader();
  $('emptyState').hidden = true;
  $('chartView').hidden = false;
  updateSaveBtn();
  renderTab(activeTab);
  if (matchMedia('(max-width: 900px)').matches) $('chartView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (b) renderTab(b.dataset.tab);
});

const TEXT_TABS = {
  positions: { sw: ['-v'] },
  aspects: { sw: ['-a'] },
  grid: { sw: ['-g'] },
  interp: { sw: ['-v', '-I'], note: 'Diễn giải gốc của Astrolog (tiếng Anh).' },
};
const CLASSIC_VIEWS = [
  ['wheel', 'Bánh xe gốc'], ['positions', 'Vị trí'], ['aspects', 'Góc chiếu'], ['grid', 'Lưới'],
];
let classicView = 'wheel';

async function cached(key, make) {
  if (!cache.has(key)) {
    cache.set(key, make());
    // Rectifying creates one entry per tried time; keep only the most recent ones.
    for (const k of cache.keys()) {
      if (cache.size <= 40) break;
      if (k !== key) { Promise.resolve(cache.get(k)).then(v => { if (v?.url) URL.revokeObjectURL(v.url); }, () => {}); cache.delete(k); }
    }
  }
  try { return await cache.get(key); } catch (e) { cache.delete(key); throw e; }
}

async function renderTab(tab) {
  activeTab = tab;
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  if (!current) return;
  const seq = ++renderSeq;
  const chartAtStart = current;
  tabBody.innerHTML = '<div class="loading"><span class="spinner"></span>Đang tính…</div>';
  try {
    if (tab === 'interp') {
      const v = await cached(`${shift}|text:interp`, () => computeText('interp'));
      if (seq !== renderSeq) return;
      tabBody.innerHTML = `<p class="note">${TEXT_TABS.interp.note}</p><div class="term">${v.html}</div>`;
    } else if (tab === 'classic') {
      await renderClassic(seq);
    } else {
      const data = await cached(`${shift}|data`, computeData);
      if (seq !== renderSeq || chartAtStart !== current) return;
      if (tab === 'wheel') showSvgWheel(data);
      else if (tab === 'positions') tabBody.innerHTML = positionsHtml(data);
      else if (tab === 'aspects') tabBody.innerHTML = aspectsHtml(data);
    }
  } catch (err) {
    if (seq === renderSeq) tabBody.innerHTML = `<p class="error">Lỗi khi chạy Astrolog: ${esc(err.message || err)}</p>`;
  }
}

async function renderClassic(seq) {
  const light = wheelLight ?? !isDark();
  const bar = `<div class="seg" role="group" aria-label="Kiểu hiển thị cổ điển">${CLASSIC_VIEWS.map(([k, label]) =>
    `<button type="button" data-view="${k}" aria-pressed="${k === classicView}">${label}</button>`).join('')}</div>`;
  let body;
  if (classicView === 'wheel') {
    const v = await cached(`${shift}|classic:wheel:${light}`, () => computeWheel(light));
    if (seq !== renderSeq) return;
    tabBody.innerHTML = bar + `<p class="note">Hình bánh xe do chính Astrolog vẽ, giống bản trên Windows.</p>`;
    showWheel(v, light, true);
  } else {
    const v = await cached(`${shift}|text:${classicView}`, () => computeText(classicView));
    if (seq !== renderSeq) return;
    body = `<div class="term">${v.html}</div>`;
    tabBody.innerHTML = bar + body;
  }
  tabBody.querySelector('.seg').addEventListener('click', e => {
    const b = e.target.closest('button[data-view]');
    if (b && b.dataset.view !== classicView) { classicView = b.dataset.view; renderTab('classic'); }
  });
}

async function computeData() {
  const { args } = baseArgs(view());
  const res = await runAstrolog([...args, '_X', '_k', '-sd', '-v', '-a', '-o0', '/pos.as'], ['/pos.as']);
  const pos = res.files['/pos.as'];
  if (!pos) throw new Error(res.stderr || res.stdout || 'không có dữ liệu vị trí');
  return buildChart(new TextDecoder('latin1').decode(pos), res.stdout);
}

// ---------- structured views ----------
const ASPECT_KIND_VI = { hard: 'Xung khắc', soft: 'Hài hòa', neutral: 'Hợp', minor: 'Góc phụ' };
const objName = k => OBJECTS[k]?.vi || k;
function objGlyph(k, size = 18) {
  const o = OBJECTS[k];
  return (o?.g && glyph(o.g, size, 'g-obj')) ||
    `<span class="g-txt" style="min-width:${size}px">${esc(o?.abbr || k)}</span>`;
}
const dm = o => `${o.deg}°${String(o.min).padStart(2, '0')}′`;
const signCell = p => `<span class="sign-cell el-${p.sign.el}">${glyph(p.sign.id, 16, 'g-sign')}<span>${dm(p)} ${p.sign.vi}</span></span>`;
const orbText = orb => { const m = Math.round(Math.abs(orb) * 60); return `${Math.floor(m / 60)}°${String(m % 60).padStart(2, '0')}′`; };

function balanceHtml(data) {
  const total = Object.values(data.elements).reduce((s, a) => s + a.length, 0) || 1;
  const row = (cls, label, keys) => `
    <div class="bal-row">
      <span class="bal-label">${label}</span>
      <span class="bal-bar"><span class="bal-fill ${cls}" style="width:${(keys.length / total) * 100}%"></span></span>
      <span class="bal-n">${keys.length}</span>
      <span class="bal-icons">${keys.map(k => glyph(k, 14, 'g-obj')).join('')}</span>
    </div>`;
  return `
    <div class="balance">
      <h3>Nguyên tố</h3>
      ${Object.entries(ELEMENTS).map(([k, v]) => row('el-' + k, v, data.elements[k])).join('')}
      <h3>Tính chất</h3>
      ${Object.entries(MODES).map(([k, v]) => row('mode', v, data.modes[k])).join('')}
    </div>`;
}

function aspectRow(a) {
  const info = ASPECTS[a.type] || { vi: a.type, kind: 'minor' };
  return `<tr class="k-${info.kind}">
    <td class="obj" title="${esc(objName(a.a))}">${objGlyph(a.a)}<span>${esc(objName(a.a))}</span></td>
    <td class="asp-cell"><span class="asp-badge ${info.kind}">${glyph(a.type, 16, 'g-asp') || esc(a.type)}<span>${esc(info.vi)}</span></span></td>
    <td class="obj" title="${esc(objName(a.b))}">${objGlyph(a.b)}<span>${esc(objName(a.b))}</span></td>
    <td class="num">${orbText(a.orb)}</td>
    <td class="power"><span class="pow-bar"><span style="width:${Math.min(a.power / 15, 1) * 100}%"></span></span></td>
  </tr>`;
}

function positionsHtml(data) {
  const planetRows = data.objects.map(o => `
    <tr>
      <td class="obj">${objGlyph(o.key)}<span>${esc(o.info.vi.replace(/\s*\(.*\)$/, ''))}<span class="paren">${esc((o.info.vi.match(/\s*\(.*\)$/) || [''])[0])}</span></span></td>
      <td>${signCell(o.pos)}</td>
      <td class="num">${o.house ?? '–'}</td>
      <td class="num">${o.retro ? '<span class="retro" title="Nghịch hành">℞</span>' : ''}<span class="spd">${o.info.angle || o.key === 'fort' || o.key === 'vert' || o.key === 'east' ? '' : (o.speed >= 0 ? '+' : '') + o.speed.toFixed(3)}</span></td>
    </tr>`).join('');
  const houseRows = data.cusps ? data.cusps.map((c, i) => `
    <tr><td class="num">${i + 1}</td><td>${signCell(splitLon(c))}</td></tr>`).join('') : '';
  return `
    <div class="grid-2">
      <section>
        <h3>Hành tinh</h3>
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th>Thiên thể</th><th>Vị trí</th><th class="num">Nhà</th><th class="num"><span class="spd">Tốc độ/ngày</span></th></tr></thead>
          <tbody>${planetRows}</tbody>
        </table></div>
      </section>
      <section>
        <h3>Đỉnh các nhà</h3>
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th class="num">Nhà</th><th>Đỉnh nhà</th></tr></thead>
          <tbody>${houseRows}</tbody>
        </table></div>
        ${balanceHtml(data)}
      </section>
    </div>`;
}

function aspectGridHtml(data) {
  const objs = data.objects;
  const map = new Map(data.aspects.map(a => [`${a.a}|${a.b}`, a]).concat(data.aspects.map(a => [`${a.b}|${a.a}`, a])));
  let rows = '';
  objs.forEach((row, r) => {
    let cells = '';
    for (let c = 0; c < r; c++) {
      const a = map.get(`${row.key}|${objs[c].key}`);
      const info = a && (ASPECTS[a.type] || { kind: 'minor', vi: a.type });
      cells += a
        ? `<td class="ag-cell ${info.kind}" title="${esc(objName(row.key))} ${esc(info.vi)} ${esc(objName(objs[c].key))} · orb ${orbText(a.orb)}">${glyph(a.type, 15, 'g-asp') || esc(a.type)}</td>`
        : '<td class="ag-cell"></td>';
    }
    rows += `<tr><th>${objGlyph(row.key, 16)}</th>${cells}<td class="ag-diag">${objGlyph(row.key, 16)}</td></tr>`;
  });
  return `<div class="table-wrap"><table class="aspect-grid">${rows}</table></div>`;
}

function aspectsHtml(data) {
  const list = [...data.aspects].sort((a, b) => b.power - a.power);
  const counts = {};
  list.forEach(a => { const k = ASPECTS[a.type]?.kind || 'minor'; counts[k] = (counts[k] || 0) + 1; });
  return `
    <div class="aspect-top">
      <section>
        <h3>Lưới góc chiếu</h3>
        ${aspectGridHtml(data)}
      </section>
      <section class="aspect-stats">
        <h3>Tổng quan</h3>
        <ul class="chips">
          ${['hard', 'soft', 'neutral', 'minor'].filter(k => counts[k]).map(k =>
            `<li class="chip ${k}">${ASPECT_KIND_VI[k]} <b>${counts[k]}</b></li>`).join('')}
        </ul>
        <p class="hint">Sức mạnh và biên độ (orb) do Astrolog tính theo thiết lập trong astrolog.as.</p>
      </section>
    </div>
    <h3>Danh sách góc chiếu <span class="muted">(mạnh nhất trước)</span></h3>
    <div class="table-wrap"><table class="tbl aspects">
      <thead><tr><th>Thiên thể</th><th>Góc chiếu</th><th>Thiên thể</th><th class="num">Orb</th><th>Sức mạnh</th></tr></thead>
      <tbody>${list.map(aspectRow).join('')}</tbody>
    </table></div>`;
}

function focusHtml(data, key) {
  if (!key) {
    return `<p class="hint">Chạm hoặc rê chuột vào một hành tinh để xem vị trí và các góc chiếu của nó.</p>`;
  }
  const o = data.objects.find(x => x.key === key);
  if (!o) return focusHtml(data, null);
  const list = data.aspects.filter(a => a.a === key || a.b === key).sort((a, b) => b.power - a.power);
  return `
    <div class="focus-head">${objGlyph(key, 26)}<div><b>${esc(o.info.vi)}</b>
      <div class="muted">${dm(o.pos)} ${o.pos.sign.vi}${o.house ? ` · Nhà ${o.house}` : ''}${o.retro ? ' · Nghịch hành' : ''}</div></div></div>
    ${list.length ? `<ul class="focus-list">${list.map(a => {
      const other = a.a === key ? a.b : a.a;
      const info = ASPECTS[a.type] || { vi: a.type, kind: 'minor' };
      return `<li><span class="asp-badge ${info.kind}">${glyph(a.type, 14, 'g-asp') || esc(a.type)}<span>${esc(info.vi)}</span></span>
        ${objGlyph(other, 16)}<span>${esc(objName(other))}</span><span class="muted num">${orbText(a.orb)}</span></li>`;
    }).join('')}</ul>` : '<p class="hint">Không có góc chiếu chính.</p>'}`;
}

// ---------- wheel + birth-time rectification ----------
let pinnedKey = null;
let rotateMode = false;
let renderedShift = 0;
let wheelBusy = false, wheelDirty = false;

function showSvgWheel(data) {
  tabBody.innerHTML = `
    <div class="rectify" id="rectify">
      <div class="rect-time">
        <div class="rect-line"><b id="rectTime"></b><span id="rectShift" class="shift-badge"></span></div>
        <div class="muted rect-angles"><span id="rectAC">&nbsp;</span><span id="rectMC">&nbsp;</span></div>
      </div>
      <div class="rect-steps" role="group" aria-label="Chỉnh giờ sinh">
        ${[-60, -10, -1, 1, 10, 60].map(s => `<button type="button" data-step="${s}" aria-label="${s > 0 ? 'Tăng' : 'Giảm'} ${Math.abs(s) === 60 ? '1 giờ' : Math.abs(s) + ' phút'}">${s < 0 ? '−' : '+'}${Math.abs(s) === 60 ? '1g' : Math.abs(s) + 'p'}</button>`).join('')}
      </div>
      <div class="rect-actions">
        <button type="button" class="btn small" id="rotateBtn" aria-pressed="${rotateMode}">
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>
          Xoay bánh xe</button>
        <button type="button" class="btn small" id="rectReset">Đặt lại</button>
        <button type="button" class="btn small accent" id="rectApply">Dùng giờ này</button>
      </div>
      <p class="hint rect-hint" id="rectHint"${rotateMode ? '' : ' hidden'}>Kéo bánh xe theo chiều kim đồng hồ để tăng giờ, ngược chiều để lùi giờ (1° ≈ 4 phút). Trên máy tính có thể dùng phím ← → (giữ Shift: 10 phút).</p>
    </div>
    <div class="wheel-layout">
      <div class="wheel-box${rotateMode ? ' rotating' : ''}" id="wheelBox" tabindex="0" aria-label="Bánh xe lá số"></div>
      <aside class="wheel-side">
        <div class="focus card-inset" id="focusInfo"></div>
        <div class="card-inset" id="balanceInfo"></div>
        <div class="legend">
          <span><i class="lg hard"></i>Xung khắc</span>
          <span><i class="lg soft"></i>Hài hòa</span>
          <span><i class="lg minor"></i>Góc phụ</span>
        </div>
      </aside>
    </div>`;
  bindRectify();
  drawWheel(data, shift);
}

function drawWheel(data, forShift) {
  const box = $('wheelBox');
  box.innerHTML = renderWheel(data, { title: `Bánh xe lá số của ${current.name || 'lá số'}` });
  renderedShift = forShift;
  $('balanceInfo').innerHTML = balanceHtml(data);
  $('focusInfo').innerHTML = focusHtml(data, pinnedKey);
  attachWheel(box, key => { pinnedKey = key; $('focusInfo').innerHTML = focusHtml(data, key); }, pinnedKey);
  const asc = data.objects.find(o => o.key === 'asce'), mc = data.objects.find(o => o.key === 'midh');
  $('rectAC').textContent = asc ? `AC ${dm(asc.pos)} ${asc.pos.sign.vi}` : ' ';
  $('rectMC').textContent = mc ? `MC ${dm(mc.pos)} ${mc.pos.sign.vi}` : ' ';
  previewRotation();
  updateRectControls();
}

function previewRotation() {
  const svg = $('wheelBox')?.querySelector('svg');
  if (svg) svg.style.transform = shift === renderedShift ? '' : `rotate(${(shift - renderedShift) / 4}deg)`;
}

function updateRectControls() {
  if (!$('rectify')) return;
  const c = view();
  const [y, m, d] = c.date.split('-');
  $('rectTime').textContent = `${c.time} · ${d}/${m}/${y}`;
  $('rectShift').classList.toggle('zero', !shift);
  $('rectShift').textContent = shift ? fmtShift(shift) : 'giờ gốc';
  $('rectReset').disabled = !shift;
  $('rectApply').disabled = !shift;
}

function setShift(s) {
  s = Math.max(-4320, Math.min(4320, Math.round(s)));
  if (s === shift) return;
  shift = s;
  updateHeader();
  updateRectControls();
  previewRotation();
  scheduleWheel();
}

async function scheduleWheel() {
  if (wheelBusy) { wheelDirty = true; return; }
  wheelBusy = true;
  try {
    do {
      wheelDirty = false;
      const s = shift;
      const data = await cached(`${s}|data`, computeData);
      if (activeTab !== 'wheel' || !$('wheelBox')) break;
      drawWheel(data, s);
    } while (wheelDirty);
  } catch (err) {
    toast('Lỗi khi tính lá số: ' + (err.message || err));
  } finally {
    wheelBusy = false;
  }
}

function bindRectify() {
  const box = $('wheelBox');
  $('rectify').addEventListener('click', e => {
    const step = e.target.closest('[data-step]');
    if (step) setShift(shift + +step.dataset.step);
  });
  $('rotateBtn').addEventListener('click', () => {
    rotateMode = !rotateMode;
    $('rotateBtn').setAttribute('aria-pressed', String(rotateMode));
    $('rectHint').hidden = !rotateMode;
    box.classList.toggle('rotating', rotateMode);
    if (rotateMode) box.focus({ preventScroll: true });
  });
  $('rectReset').addEventListener('click', () => setShift(0));
  $('rectApply').addEventListener('click', () => {
    const c = { ...view() };
    fillForm(c);
    cast(c);
    toast(`Đã đổi giờ sinh thành ${c.time}.`);
  });

  // Drag to rotate (only in rotate mode, so normal swipes still scroll the page).
  let st = null, justDragged = false;
  const angle = e => {
    const r = box.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  };
  box.addEventListener('pointerdown', e => {
    if (!rotateMode || e.button > 0) return;
    st = { id: e.pointerId, x: e.clientX, y: e.clientY, last: angle(e), total: 0, base: shift, moved: false };
  });
  box.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.moved) {
      if (Math.hypot(e.clientX - st.x, e.clientY - st.y) < 6) return;
      st.moved = true;
      box.setPointerCapture(e.pointerId);
      box.classList.add('dragging');
    }
    const a = angle(e);
    let d = a - st.last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    st.last = a;
    st.total += d;
    setShift(st.base + st.total * 4);
  });
  const end = () => {
    if (st?.moved) { justDragged = true; box.classList.remove('dragging'); }
    st = null;
  };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);
  box.addEventListener('click', e => {
    if (justDragged) { e.stopPropagation(); e.preventDefault(); justDragged = false; }
  }, true);
  box.addEventListener('keydown', e => {
    if (!rotateMode) return;
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setShift(shift + step); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setShift(shift - step); e.preventDefault(); }
  });
}

async function computeWheel(light) {
  const { args } = baseArgs(view());
  const res = await runAstrolog([...args, '-X', '-Xbw', '-Xw', '900', '900', '_Xv0', '-Xt', '-XS', '200', '-Xs', '200', light ? '=Xr' : '_Xr', '-Xo', '/chart.bmp'], ['/chart.bmp']);
  const bmp = res.files['/chart.bmp'];
  if (!bmp) throw new Error(res.stderr || res.stdout || 'không tạo được hình');
  return { url: URL.createObjectURL(new Blob([bmp], { type: 'image/bmp' })) };
}

async function computeText(tab) {
  const { args } = baseArgs(view());
  const res = await runAstrolog([...args, '_X', ...TEXT_TABS[tab].sw, '-kh', '-os', '/out.html'], ['/out.html']);
  const out = res.files['/out.html'];
  if (!out) throw new Error(res.stderr || res.stdout || 'không có kết quả');
  return { html: astrologHtmlToFragment(new TextDecoder('latin1').decode(out)) };
}

function showWheel(v, light) {
  tabBody.insertAdjacentHTML('beforeend', `
    <div class="wheel-bar">
      <label class="toggle"><input type="checkbox" id="wheelLight" ${light ? 'checked' : ''}> Nền sáng</label>
      <button class="btn small" type="button" id="dlPng">Tải ảnh PNG</button>
    </div>
    <div class="wheel-wrap"><img id="wheelImg" src="${v.url}" alt="Bánh xe lá số của ${esc(current.name || 'lá số')}"></div>`);
  $('wheelLight').addEventListener('change', e => { wheelLight = e.target.checked; renderTab('classic'); });
  $('dlPng').addEventListener('click', () => {
    const img = $('wheelImg');
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.getContext('2d').drawImage(img, 0, 0);
    cv.toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `${ascii(current.name).replace(/\s+/g, '-') || 'la-so'}-${current.date}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  });
}

// ---------- saved charts ----------
const sameChart = (a, b) => a.name === b.name && a.date === b.date && a.time === b.time && a.place === b.place;

function renderSaved() {
  const list = store.get('charts', []);
  $('savedCount').textContent = list.length;
  $('savedEmpty').hidden = list.length > 0;
  $('savedList').innerHTML = list.map((c, i) => {
    const [y, m, d] = c.date.split('-');
    return `<li>
      <button class="open" type="button" data-i="${i}"><b>${esc(c.name || 'Lá số')}</b><small>${d}/${m}/${y} ${esc(c.time)} · ${esc(c.place)}</small></button>
      <button class="del" type="button" data-del="${i}" aria-label="Xóa ${esc(c.name || 'lá số')}">✕</button></li>`;
  }).join('');
}
function updateSaveBtn() {
  const saved = current && store.get('charts', []).some(c => sameChart(c, current));
  $('saveBtn').textContent = saved ? 'Đã lưu' : 'Lưu';
  $('saveBtn').disabled = !!saved;
}
$('saveBtn').addEventListener('click', () => {
  if (!current) return;
  const list = store.get('charts', []).filter(c => !sameChart(c, current));
  list.unshift(current);
  store.set('charts', list.slice(0, 200));
  renderSaved(); updateSaveBtn();
});
$('savedList').addEventListener('click', e => {
  const list = store.get('charts', []);
  const open = e.target.closest('[data-i]');
  const del = e.target.closest('[data-del]');
  if (open) { const c = list[+open.dataset.i]; fillForm(c); cast(c); }
  else if (del) {
    const c = list[+del.dataset.del];
    if (confirm(`Xóa lá số “${c.name || 'Lá số'}” khỏi máy này?`)) {
      list.splice(+del.dataset.del, 1); store.set('charts', list); renderSaved(); updateSaveBtn();
    }
  }
});
renderSaved();
updateZoneNote();

// ---------- install as an app (PWA) ----------
function toast(msg, ms = 3500) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, ms);
}

const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let installEvent = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installEvent = e;
  $('installBtn').hidden = false;
});
$('installBtn').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = null;
  $('installBtn').hidden = true;
  if (outcome === 'accepted') toast('Đang cài astro-com lên máy…');
});
window.addEventListener('appinstalled', () => { $('installBtn').hidden = true; toast('Đã cài xong. Mở astro-com từ màn hình chính.'); });

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (isIOS && !standalone && !store.get('iosHintClosed', false)) $('iosHint').hidden = false;
$('iosHintClose').addEventListener('click', () => { $('iosHint').hidden = true; store.set('iosHintClosed', true); });

if ('serviceWorker' in navigator && window.isSecureContext) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => {
    navigator.serviceWorker.ready.then(() => {
      $('offlineState').textContent = '· Đã sẵn sàng dùng khi không có mạng.';
      if (!hadController) toast('Đã lưu app về máy, lần sau dùng được cả khi không có mạng.');
    });
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'activated' && hadController) toast('Đã cập nhật bản mới. Tải lại trang để dùng.', 6000);
      });
    });
  }).catch(() => { /* offline support unavailable */ });
}
window.addEventListener('offline', () => toast('Đang không có mạng. App vẫn lập lá số bình thường.'));
