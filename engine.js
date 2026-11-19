// Runs the Astrolog WebAssembly build. Each call gets a fresh instance (Astrolog keeps
// global state between charts), but the compiled module and data files are loaded once.

// Only what chart casting needs. atlas.as / timezone.as (city lookups) and astexo.csv
// (exoplanets) are not used by the switches this app passes, and copying them into every
// fresh instance would slow down live rectification.
const DATA_FILES = ['astrolog.as', 'sefstars.txt', 'seorbel.txt'];

let ready = null;

async function compileWasm(url) {
  try {
    return await WebAssembly.compileStreaming(fetch(url));
  } catch {
    // Some static servers send .wasm without the application/wasm type.
    const buf = await (await fetch(url)).arrayBuffer();
    return WebAssembly.compile(buf);
  }
}

async function fetchBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không tải được ${url} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

export function initEngine() {
  if (!ready) {
    ready = (async () => {
      const ephemList = (await (await fetch('data/ephem.txt')).text()).split(/\r?\n/).filter(Boolean);
      const names = [...DATA_FILES, ...ephemList];
      const [wasm, ...bufs] = await Promise.all([
        compileWasm('astrolog.wasm'),
        ...names.map(n => fetchBytes('data/' + n)),
      ]);
      return { wasm, files: names.map((n, i) => [n, bufs[i]]) };
    })();
  }
  return ready;
}

const latin1 = new TextDecoder('latin1');

/** Run Astrolog with the given switches. Returns stdout/stderr text and any requested output files. */
export async function runAstrolog(args, readBack = []) {
  const { wasm, files } = await initEngine();
  const out = [], err = [];
  const M = {
    noInitialRun: true,
    instantiateWasm(imports, done) {
      WebAssembly.instantiate(wasm, imports).then(inst => done(inst));
      return {};
    },
    preRun: [() => {
      M.FS.mkdir('/ephem');
      for (const [name, bytes] of files) M.FS.writeFile('/' + name, bytes);
      M.FS.chdir('/');
      M.FS.init(() => null, c => { if (c !== null) out.push(c); }, c => { if (c !== null) err.push(c); });
    }],
  };
  const mod = await globalThis.createAstrolog(M);
  let status = 0;
  try {
    mod.callMain(args);
  } catch (e) {
    if (e && e.name === 'ExitStatus') status = e.status;
    else throw e;
  }
  const result = {};
  for (const f of readBack) {
    try { result[f] = mod.FS.readFile(f); } catch { result[f] = null; }
  }
  return {
    status,
    stdout: latin1.decode(new Uint8Array(out)),
    stderr: latin1.decode(new Uint8Array(err)),
    files: result,
  };
}

// Astrolog's text output uses DOS code page 437 for its special characters
// (box drawing for grids, 248 = degree sign). Names are passed in as ASCII, so every
// byte above 127 in the output is one of these.
const CP437_HIGH =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»' +
  '░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀' +
  'αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
// Astrolog also writes the Latin-1 degree sign (176) in some charts; it never means a shade block.
const cp437 = code => (code === 176 ? '°' : code >= 128 && code <= 255 ? CP437_HIGH[code - 128] : String.fromCharCode(code));

export function fixChars(s) {
  return s
    .replace(/&#(\d+);/g, (m, n) => (+n >= 128 && +n <= 255 ? cp437(+n) : m))
    .replace(/[\u0080-ÿ]/g, ch => (ch === ' ' ? ch : cp437(ch.charCodeAt(0))));
}

const COLOR_CLASS = {
  white: 'k-white', '#bfbfbf': 'k-ltgray', '#7f7f7f': 'k-gray', gray: 'k-gray', silver: 'k-ltgray',
  red: 'k-red', maroon: 'k-maroon', '#ff0000': 'k-red', '#7f0000': 'k-maroon',
  blue: 'k-blue', navy: 'k-navy', '#0000ff': 'k-blue', '#00007f': 'k-navy',
  '00ff00': 'k-green', '#00ff00': 'k-green', lime: 'k-green', green: 'k-dkgreen', '#007f00': 'k-dkgreen',
  yellow: 'k-yellow', '#ffff00': 'k-yellow', olive: 'k-olive', '#7f7f00': 'k-olive',
  magenta: 'k-magenta', fuchsia: 'k-magenta', '#ff00ff': 'k-magenta', purple: 'k-purple', '#7f007f': 'k-purple',
  cyan: 'k-cyan', aqua: 'k-cyan', '#00ffff': 'k-cyan', teal: 'k-teal', '#007f7f': 'k-teal',
  orange: 'k-orange', '#ff7f00': 'k-orange', black: 'k-black', '#000000': 'k-black',
};

/** Turn Astrolog's -kh HTML into a themeable fragment (spans with classes instead of <font color>). */
export function astrologHtmlToFragment(html) {
  let body = html.replace(/^[\s\S]*?<body>/i, '').replace(/<\/body>[\s\S]*$/i, '');
  body = body.replace(/<font face="[^"]*">/gi, '<span>');
  body = body.replace(/<font color="([^"]*)">/gi, (_, c) => {
    const cls = COLOR_CLASS[c.toLowerCase()];
    return cls ? `<span class="${cls}">` : `<span style="color:${/^[0-9a-f]{6}$/i.test(c) ? '#' + c : c}">`;
  });
  body = body.replace(/<\/font>/gi, '</span>');
  return fixChars(body);
}
