// /lab/explore/: the lab as a place. Twelve stations on a ring, each with a
// procedural hologram of what the project does. Drag to orbit, scroll or pinch
// to zoom, click a station (or use the list, or ←/→) to fly in, Esc to leave.
import { capture } from './flags.js';
import tilt from './tilt.js';
const T = window.THREE, gsap = window.gsap;
const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = Math.min(innerWidth, innerHeight) < 560;

const COLOR = { systems: '#5CE1E6', ml: '#8BE59A', quant: '#B9A6FF', autonomy: '#F0B556' };
const AREA = { systems: 'systems', ml: 'ml infrastructure', quant: 'quant', autonomy: 'autonomy / signal' };
const GH = 'https://github.com/asp53826/';
const STATIONS = [
  { id: 'raft-hunt', route: 'systems', kind: 'orb', claim: 'A deterministic simulator pointed at real Raft libraries. It found a 2016-era PySyncObj bug where a deposed leader acknowledges a write nobody committed.', metric: '3 bugs', label: 'found in PySyncObj, each with a fix', href: '../work/raft-hunt.html', cta: 'Watch the bug replay' },
  { id: 'raft-mvcc', route: 'systems', kind: 'cluster', claim: 'Five-node Raft consensus with serializable MVCC and a linearizability checker, run live in WebAssembly.', metric: '598', label: 'assertions across seeded faults', href: '../work/raft-mvcc.html', cta: 'Break the cluster' },
  { id: 'columnar-engine', route: 'systems', kind: 'bars', claim: 'Vector-at-a-time analytical engine: null bitmaps, selection vectors, hash aggregation, joins, TPC-H Q1.', metric: '53.1M', label: 'rows / second', href: '../work/columnar-engine.html', cta: 'Filter a batch' },
  { id: 'lsm-tree', route: 'systems', kind: 'levels', claim: 'Dependency-free LSM-tree with WAL recovery, immutable SSTables, Bloom filters, tombstones and compaction.', metric: '0 deps', label: 'storage engine from scratch' },
  { id: 'dst-harness', route: 'systems', kind: 'orb', claim: 'Deterministic simulation testing: virtual clock, network and disk with seeded fault injection.', metric: '12', label: 'planted Raft bugs, scored by seeds-to-catch' },
  { id: 'vllm-lite', route: 'ml', kind: 'blocks', claim: 'Paged KV cache, continuous batching, chunked prefill and prefix caching for LLM inference.', metric: '5.5×', label: 'better median TTFT', href: '../work/vllm-lite.html', cta: 'Watch both schedulers' },
  { id: 'annlite', route: 'ml', kind: 'graph', claim: 'HNSW vector index from scratch with SIMD distance kernels, benchmarked against FAISS.', metric: 'vs FAISS', label: 'recall-vs-latency' },
  { id: 'dist-train', route: 'ml', kind: 'ring', claim: 'Ring all-reduce built from send/recv with data, tensor and pipeline parallelism.', metric: '3', label: 'parallelism strategies' },
  { id: 'aad-greeks', route: 'quant', kind: 'surface', claim: 'Reverse-mode automatic differentiation for option Greeks, verified to machine precision.', metric: '49×', label: 'faster than bumping at n=50', href: '../aad-greeks.html', cta: 'Read the case study' },
  { id: 'short-gamma', route: 'quant', kind: 'wave', claim: 'An options-desk game on the AAD engine: hedge a short-vol book through ten trading days, the phones and the news.', metric: '▶ play', label: 'in your browser, right now', href: '../play/', cta: 'Play Short Gamma', src: 'aad-greeks' },
  { id: 'order-book-royale', route: 'quant', kind: 'ladder', claim: 'Eight traders, one live limit order book, a rising margin line. The exchange is a port of the Python matching engine.', metric: '8 seats', label: 'last trader standing', href: '../royale/', cta: 'Take a seat', src: null },
  { id: 'edgar-mcp', route: 'quant', kind: 'pages', claim: 'MCP server for SEC EDGAR filings and XBRL facts with global pacing and host-aware caching.', metric: '138×', label: 'faster warm 10-K read', href: '../work/edgar-mcp.html', cta: 'Replay the burst' },
  { id: 'track-fusion', route: 'autonomy', kind: 'orbits', claim: 'Multi-target tracking with IMM, JPDA, track scoring and OSPA evaluation.', metric: '47%', label: 'lower localization error' },
];

/* ---------- station list + info panel (work without WebGL) ---------- */
const nav = $('#stations');
const navBtns = STATIONS.map((s, i) => {
  const b = document.createElement('button'); b.type = 'button'; b.style.setProperty('--c', COLOR[s.route]);
  b.append(document.createElement('i'), s.id); b.addEventListener('click', () => fly(i)); nav.append(b); return b;
});
function showInfo(i) {
  const s = STATIONS[i], info = $('#info');
  info.style.setProperty('--c', COLOR[s.route]);
  $('#iArea').textContent = AREA[s.route]; $('#iName').textContent = s.id; $('#iClaim').textContent = s.claim;
  $('#iMetric').textContent = s.metric; $('#iLabel').textContent = s.label; $('#iPos').textContent = `${i + 1} / ${STATIONS.length}`;
  const acts = $('#iActs'); acts.textContent = '';
  if (s.href) { const a = document.createElement('a'); a.className = 'primary'; a.href = s.href; a.textContent = (s.cta || 'Open') + ' →'; acts.append(a); }
  const src = s.src === undefined ? s.id : s.src;
  if (src) { const a = document.createElement('a'); a.href = GH + src; a.textContent = 'Source ↗'; acts.append(a); }
  info.classList.add('on'); $('#intro').classList.add('gone');
  navBtns.forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
  navBtns[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });
}
function hideInfo() {
  $('#info').classList.remove('on'); $('#intro').classList.remove('gone');
  navBtns.forEach((b) => b.setAttribute('aria-current', 'false'));
}
$('#close').addEventListener('click', () => overview());
$('#prev').addEventListener('click', () => fly((cur - 1 + STATIONS.length) % STATIONS.length));
$('#next').addEventListener('click', () => fly((cur + 1) % STATIONS.length));
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); fly(cur < 0 ? 0 : (cur + 1) % STATIONS.length); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); fly(cur < 0 ? STATIONS.length - 1 : (cur - 1 + STATIONS.length) % STATIONS.length); }
  else if (e.key === 'Escape') overview();
});

let cur = -1, renderer = null;
try { renderer = new T.WebGLRenderer({ canvas: $('#gl'), antialias: true, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
if (!renderer || !T) document.documentElement.classList.add('nogl');

/* ---------- scene ---------- */
const scene = new T.Scene(), cam = new T.PerspectiveCamera(50, innerWidth / innerHeight, .1, 200);
scene.fog = new T.FogExp2(0x05070a, .022);
let composer = null, bloom = null;
if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setSize(innerWidth, innerHeight); renderer.setClearColor(0x05070a, 1);
  if (!small && T.EffectComposer && T.UnrealBloomPass) {
    composer = new T.EffectComposer(renderer); composer.addPass(new T.RenderPass(scene, cam));
    bloom = new T.UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), .95, .55, .08); composer.addPass(bloom);
  }
}
const add = (o) => (scene.add(o), o);
const glow = (hex, opacity = .9) => new T.MeshBasicMaterial({ color: hex, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false });
const lineMat = (hex, opacity = .7) => new T.LineBasicMaterial({ color: hex, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false });
function radialTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new T.CanvasTexture(c);
}
function beamTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)');
  x.fillStyle = g; x.fillRect(0, 0, 4, 128); return new T.CanvasTexture(c);
}
const BEAM = beamTexture();

// floor
const grid = add(new T.GridHelper(120, 120, 0x1b2a2b, 0x0f1718)); grid.material.transparent = true; grid.material.opacity = .55;
const pool = add(new T.Mesh(new T.CircleGeometry(16, 64), new T.MeshBasicMaterial({ map: radialTexture('rgba(92,225,230,.16)', 'rgba(92,225,230,0)'), transparent: true, depthWrite: false })));
pool.rotation.x = -Math.PI / 2; pool.position.y = .01;
// dust
{
  const n = small ? 700 : 1600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const r = 4 + Math.random() * 40, a = Math.random() * 6.283; pos.set([Math.cos(a) * r, Math.random() * 14, Math.sin(a) * r], i * 3); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  var dust = add(new T.Points(g, new T.PointsMaterial({ color: 0x9feff0, size: .06, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false })));
}
// core
const core = add(new T.Group()); core.position.y = 2.4;
const coreWire = new T.LineSegments(new T.WireframeGeometry(new T.IcosahedronGeometry(1.25, 1)), lineMat(0x5ce1e6, .55)); core.add(coreWire);
const coreIn = new T.Mesh(new T.IcosahedronGeometry(.55, 2), glow(0x5ce1e6, .85)); core.add(coreIn);
const coreBeam = add(new T.Mesh(new T.CylinderGeometry(.5, .9, 14, 32, 1, true), new T.MeshBasicMaterial({ map: BEAM, color: 0x5ce1e6, transparent: true, opacity: .14, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })));
coreBeam.position.y = 7;
// the core is clickable: five taps capture a flag
const coreHit = new T.Mesh(new T.SphereGeometry(1.7, 12, 8), new T.MeshBasicMaterial()); coreHit.visible = false; core.add(coreHit);
let coreTaps = 0, coreKick = 0;

/* ---------- holograms ---------- */
const H = {
  cluster(c) {
    const g = new T.Group(), nodes = [], R = .95;
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 - Math.PI / 2, m = new T.Mesh(new T.SphereGeometry(.15, 16, 12), glow(c)); m.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); g.add(m); nodes.push(m); }
    const pts = []; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) pts.push(nodes[i].position, nodes[j].position);
    g.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), lineMat(c, .28)));
    const ring = new T.Mesh(new T.TorusGeometry(.28, .015, 8, 40), glow(c)); g.add(ring);
    return { g, up(t) { const k = Math.floor(t / 2.4) % 5, p = (t % 2.4) / 2.4; nodes.forEach((n, i) => n.scale.setScalar(i === k ? 1.5 : 1)); ring.position.copy(nodes[k].position); ring.scale.setScalar(1 + p * 1.6); ring.material.opacity = 1 - p; g.rotation.y = Math.sin(t * .4) * .6; } };
  },
  bars(c) {
    const g = new T.Group(), on = glow(c, .85), off = glow(c, .16), bars = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const m = new T.Mesh(new T.BoxGeometry(.2, 1, .2), off); m.position.set((i - 2.5) * .3, 0, (j - 2.5) * .3); g.add(m); bars.push(m); }
    return { g, up(t) { bars.forEach((m, k) => { const h = .15 + Math.abs(Math.sin(t * 1.3 + k * .61)) * 1.3; m.scale.y = h; m.position.y = h / 2 - .7; m.material = Math.sin(t * .9 + (k % 6) * 1.1) > .2 ? on : off; }); g.rotation.y = t * .25; } };
  },
  levels(c) {
    const g = new T.Group(), lv = [], drops = [];
    for (let i = 0; i < 4; i++) { const w = .5 + i * .45, m = new T.Mesh(new T.BoxGeometry(w, .1, w * .55), glow(c, .25 + i * .08)); m.position.y = .7 - i * .42; g.add(m); lv.push(m); }
    for (let i = 0; i < 6; i++) { const d = new T.Mesh(new T.BoxGeometry(.08, .08, .08), glow(c)); g.add(d); drops.push(d); }
    return { g, up(t) { drops.forEach((d, i) => { const p = ((t * .7 + i / 6) % 1); d.position.set((i - 2.5) * .1, 1.4 - p * .7, 0); d.material.opacity = 1 - p * .4; }); const k = Math.floor(t / 1.6) % 4, f = (t % 1.6) / 1.6; lv.forEach((m, i) => { m.material.opacity = (.25 + i * .08) + (i === k ? (1 - f) * .6 : 0); }); g.rotation.y = t * .3; } };
  },
  orb(c) {
    const g = new T.Group(), wire = new T.LineSegments(new T.WireframeGeometry(new T.IcosahedronGeometry(.85, 1)), lineMat(c, .5)); g.add(wire);
    const n = 60, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = new T.Vector3().randomDirection ? new T.Vector3().randomDirection() : new T.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(); v.multiplyScalar(Math.random() * .6); pos.set([v.x, v.y, v.z], i * 3); }
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3)); const pm = new T.PointsMaterial({ color: c, size: .07, transparent: true, blending: T.AdditiveBlending, depthWrite: false }); g.add(new T.Points(pg, pm));
    const base = new T.Color(c), fault = new T.Color('#FF8A7A');
    return { g, up(t) { wire.rotation.y = t * .5; wire.rotation.x = t * .2; const hit = (t % 3.1) < .18; wire.material.color.copy(hit ? fault : base); pm.color.copy(hit ? fault : base); } };
  },
  blocks(c) {
    const g = new T.Group(), on = glow(c, .9), off = glow(c, .12), cells = [];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 8; k++) { const m = new T.Mesh(new T.BoxGeometry(.2, .2, .2), off); m.position.set((k - 3.5) * .25, (1.5 - r) * .25, 0); g.add(m); cells.push(m); }
    return { g, up(t) { const step = Math.floor(t * 5); cells.forEach((m, i) => { const seq = (i * 7) % 32, life = (step - seq * 2) % 48; m.material = life >= 0 && life < 30 ? on : off; }); g.rotation.y = Math.sin(t * .5) * .5; } };
  },
  graph(c) {
    const g = new T.Group(), n = 34, P = [];
    for (let i = 0; i < n; i++) { const v = new T.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(.4 + Math.random() * .6); P.push(v); }
    const nb = P.map((p, i) => P.map((q, j) => [p.distanceTo(q), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]).slice(0, 3).map(([, j]) => j));
    const seg = []; nb.forEach((js, i) => js.forEach((j) => seg.push(P[i], P[j])));
    g.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(seg), lineMat(c, .3)));
    const pg = new T.BufferGeometry().setFromPoints(P); g.add(new T.Points(pg, new T.PointsMaterial({ color: c, size: .08, transparent: true, blending: T.AdditiveBlending, depthWrite: false })));
    const walker = new T.Mesh(new T.SphereGeometry(.07, 12, 8), glow('#ffffff')); g.add(walker); let at = 0, to = nb[0][0], last = 0;
    return { g, up(t) { if (t - last > .45) { last = t; at = to; to = nb[at][Math.floor(Math.random() * 3)]; } walker.position.lerpVectors(P[at], P[to], Math.min(1, (t - last) / .45)); g.rotation.y = t * .2; } };
  },
  ring(c) {
    const g = new T.Group(), R = .85;
    g.add(new T.Mesh(new T.TorusGeometry(R, .012, 8, 80), glow(c, .4)));
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, m = new T.Mesh(new T.BoxGeometry(.22, .22, .22), glow(c, .7)); m.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); g.add(m); }
    const packets = Array.from({ length: 6 }, () => { const m = new T.Mesh(new T.SphereGeometry(.05, 10, 8), glow('#ffffff')); g.add(m); return m; });
    return { g, up(t) { packets.forEach((m, i) => { const a = i / 6 * 6.283 + t * 1.2; m.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); }); g.rotation.y = Math.sin(t * .35) * .8; } };
  },
  surface(c) {
    const geo = new T.PlaneGeometry(1.9, 1.9, 22, 22), m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2.6; const g = new T.Group(); g.add(m); const pos = geo.attributes.position;
    return { g, up(t) { for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, Math.exp(-(x * x + y * y) * 1.2) * .7 * Math.cos(t * .8 + x * 1.5) + Math.sin(x * 2.4 + t) * .06); } pos.needsUpdate = true; g.rotation.y = t * .2; } };
  },
  wave(c) {
    const g = new T.Group(), N = 120, pts = Array.from({ length: N }, () => new T.Vector3()), geo = new T.BufferGeometry().setFromPoints(pts);
    const line = new T.Line(geo, lineMat(c, .9)); g.add(line);
    const axis = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-1.1, -.55, 0), new T.Vector3(1.1, -.55, 0)]), lineMat(c, .25)); g.add(axis);
    const dot = new T.Mesh(new T.SphereGeometry(.08, 12, 8), glow('#ffffff')); g.add(dot); const pos = geo.attributes.position;
    return { g, up(t) { const s = .35 + Math.sin(t * .6) * .12; for (let i = 0; i < N; i++) { const x = -1.1 + 2.2 * i / (N - 1); pos.setXYZ(i, x, -.55 + 1.2 * Math.exp(-(x * x) / (2 * s * s)) * (.35 / s) * .7, 0); } pos.needsUpdate = true; const k = Math.floor(((Math.sin(t * .9) + 1) / 2) * (N - 1)); dot.position.set(pos.getX(k), pos.getY(k), 0); g.rotation.y = Math.sin(t * .4) * .5; } };
  },
  ladder(c) {
    const g = new T.Group(), bids = [], asks = [], ask = '#F0B556';
    for (let i = 0; i < 9; i++) {
      const b = new T.Mesh(new T.BoxGeometry(1, .08, .08), glow(c, .8)), a = new T.Mesh(new T.BoxGeometry(1, .08, .08), glow(ask, .8));
      b.position.y = a.position.y = (i - 4) * .14; g.add(b, a); bids.push(b); asks.push(a);
    }
    g.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, -.75, 0), new T.Vector3(0, .75, 0)]), lineMat('#ffffff', .35)));
    return { g, up(t) { for (let i = 0; i < 9; i++) { const wb = .15 + Math.abs(Math.sin(t * 1.7 + i * .9)) * .8, wa = .15 + Math.abs(Math.cos(t * 1.4 + i * 1.3)) * .8; bids[i].scale.x = wb; bids[i].position.x = -wb / 2 - .04; asks[i].scale.x = wa; asks[i].position.x = wa / 2 + .04; } g.rotation.y = Math.sin(t * .3) * .5; } };
  },
  pages(c) {
    const g = new T.Group(), pages = [], edge = new T.EdgesGeometry(new T.PlaneGeometry(.9, 1.2));
    for (let i = 0; i < 6; i++) {
      const p = new T.Group(); p.add(new T.Mesh(new T.PlaneGeometry(.9, 1.2), glow(c, .07)));
      p.add(new T.LineSegments(edge, lineMat(c, .8)));
      const rows = []; for (let r = 0; r < 6; r++) rows.push(new T.Vector3(-.32, .4 - r * .14, .001), new T.Vector3(.32 - (r % 3) * .12, .4 - r * .14, .001));
      p.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(rows), lineMat(c, .45))); g.add(p); pages.push(p);
    }
    return { g, up(t) { pages.forEach((p, i) => { const a = Math.sin(t * .8 + i * .5) * .5; p.position.set(Math.sin(a) * .5, (i - 2.5) * .04, -i * .12); p.rotation.y = a; }); } };
  },
  orbits(c) {
    const g = new T.Group(), L = 40, tracks = [];
    for (let k = 0; k < 3; k++) {
      const pts = Array.from({ length: L }, () => new T.Vector3()), geo = new T.BufferGeometry().setFromPoints(pts);
      const line = new T.Line(geo, lineMat(c, .7)), head = new T.Mesh(new T.SphereGeometry(.07, 12, 8), glow('#ffffff')), gate = new T.Mesh(new T.TorusGeometry(.16, .01, 6, 32), glow(c, .7));
      g.add(line, head, gate); tracks.push({ geo, head, gate, k });
    }
    const at = (k, t) => new T.Vector3(Math.sin(t * (.7 + k * .2) + k * 2) * .9, Math.sin(t * (1.1 + k * .15) + k) * .5, Math.cos(t * (.7 + k * .2) + k * 2) * .5);
    return { g, up(t) { for (const tr of tracks) { const pos = tr.geo.attributes.position; for (let i = 0; i < L; i++) { const v = at(tr.k, t - (L - i) * .03); pos.setXYZ(i, v.x, v.y, v.z); } pos.needsUpdate = true; const h = at(tr.k, t); tr.head.position.copy(h); tr.gate.position.copy(h); tr.gate.lookAt(cam.position); } } };
  },
};

/* ---------- stations on a ring ---------- */
const RING = 11, hits = [], holos = [], labels = [];
STATIONS.forEach((s, i) => {
  const a = i / STATIONS.length * Math.PI * 2, c = COLOR[s.route], grp = add(new T.Group());
  grp.position.set(Math.cos(a) * RING, 0, Math.sin(a) * RING); s.angle = a;
  const ped = new T.Mesh(new T.CylinderGeometry(1.25, 1.45, .3, 48), new T.MeshBasicMaterial({ color: 0x0b1011 })); ped.position.y = .15; grp.add(ped);
  const ring = new T.Mesh(new T.TorusGeometry(1.4, .025, 8, 72), glow(c, .8)); ring.rotation.x = Math.PI / 2; ring.position.y = .31; grp.add(ring);
  const beam = new T.Mesh(new T.CylinderGeometry(1.15, 1.25, 4, 40, 1, true), new T.MeshBasicMaterial({ map: BEAM, color: c, transparent: true, opacity: .07, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  beam.position.y = 2.3; beam.rotation.x = Math.PI; grp.add(beam);
  const holo = H[s.kind](c); holo.g.position.y = 2.3; grp.add(holo.g); holos.push(holo);
  const hit = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 4.4, 12), new T.MeshBasicMaterial()); hit.visible = false; hit.position.y = 2.2; hit.userData.i = i; grp.add(hit); hits.push(hit);
  s.ring = ring; s.beam = beam; s.pos = grp.position;
  const lbl = document.createElement('div'); lbl.className = 'lbl'; lbl.style.setProperty('--c', c); lbl.append(document.createElement('i'), s.id); $('#labels').append(lbl); labels.push(lbl);
});

/* ---------- camera: target + spherical offset, tweened between views ---------- */
const OVERVIEW = { tx: 0, ty: 1.6, tz: 0, yaw: .9, pitch: .42, dist: small ? 34 : 27 };
const view = { ...OVERVIEW };
let tween = null, hover = -1;
const nearestYaw = (from, to) => to + Math.round((from - to) / (Math.PI * 2)) * Math.PI * 2;
function go(target) {
  tween?.kill();
  target = { ...target, yaw: nearestYaw(view.yaw, target.yaw) };
  if (reduced || !gsap) { Object.assign(view, target); return; }
  tween = gsap.to(view, { ...target, duration: 1.7, ease: 'power3.inOut' });
}
function fly(i, quiet) {
  if (i < 0 || i >= STATIONS.length) return;
  cur = i; const s = STATIONS[i];
  // look in from slightly off-axis so the core isn't right behind the hologram, and
  // shift the target so the station sits clear of the info panel
  // (the tour has no panel, so it centres the station above the caption instead)
  const yaw = s.angle + .32, wide = innerWidth > 760, side = wide && !quiet ? 1.7 : 0;
  go({ tx: s.pos.x + Math.sin(yaw) * side, ty: quiet ? 1.5 : wide ? 2.3 : 1.3, tz: s.pos.z - Math.cos(yaw) * side, yaw, pitch: .26, dist: wide ? 7.6 : 10 });
  if (!quiet) { showInfo(i); history.replaceState(null, '', '#' + s.id); }
  window.__sfx?.play('note', i);
}
function overview() {
  if (cur < 0) return;
  cur = -1; go({ ...OVERVIEW, yaw: view.yaw }); hideInfo(); history.replaceState(null, '', location.pathname);
}

/* ---------- input: orbit, zoom, pinch, pick ---------- */
const cv = $('#gl'), ray = new T.Raycaster(), ndc = new T.Vector2(), ptrs = new Map();
let dragged = 0, pinch0 = 0, idleAt = 0;
function pick(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); const h = ray.intersectObjects(hits, false)[0]; return h ? h.object.userData.i : -1; }
cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragged = 0; tween?.kill(); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } });
cv.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId);
  if (!p) { hover = pick(e.clientX, e.clientY); cv.classList.toggle('hot', hover >= 0); return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; dragged += Math.abs(dx) + Math.abs(dy); idleAt = performance.now();
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) zoom(pinch0 / d); pinch0 = d; return; }
  cv.classList.add('drag'); view.yaw += dx * .005; view.pitch = Math.min(1.25, Math.max(.04, view.pitch + dy * .004));
});
function end(e) {
  const wasDrag = dragged > 6, single = ptrs.size === 1; ptrs.delete(e.pointerId); cv.classList.remove('drag'); if (ptrs.size < 2) pinch0 = 0;
  if (single && !wasDrag && e.type === 'pointerup') {
    const i = pick(e.clientX, e.clientY);
    if (i < 0 && cur < 0 && ray.intersectObject(coreHit, false).length) { tapCore(); return; }
    if (i >= 0) fly(i); else if (cur >= 0) overview();
  }
}
function tapCore() {
  coreTaps++; coreKick = 1; window.__sfx?.play('note', coreTaps * 2); window.__sfx?.buzz(20);
  if (coreTaps === 5) { coreKick = 2.2; window.__sfx?.play('heal'); capture('core'); }
}
cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
function zoom(f) { tween?.kill(); const lo = cur < 0 ? 12 : 3.6, hi = cur < 0 ? 46 : 14; view.dist = Math.min(hi, Math.max(lo, view.dist * f)); idleAt = performance.now(); }
cv.addEventListener('wheel', (e) => { e.preventDefault(); zoom(1 + Math.max(-.25, Math.min(.25, e.deltaY * .0012))); }, { passive: false });

addEventListener('resize', () => {
  cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  if (renderer) renderer.setSize(innerWidth, innerHeight); if (composer) composer.setSize(innerWidth, innerHeight);
});

/* ---------- frame ---------- */
const clock = new T.Clock(), tmp = new T.Vector3();
function frame() {
  const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
  if (!reduced && cur < 0 && !ptrs.size && !tween?.isActive() && performance.now() - idleAt > 2500) view.yaw += dt * (touring ? .12 : .05);
  // a tilted phone leans the camera without fighting your drags
  const lean = tilt.on && !ptrs.size ? 1 : 0, yaw = view.yaw + tilt.x * .7 * lean, pitch = Math.min(1.25, Math.max(.04, view.pitch + tilt.y * .3 * lean));
  const cp = Math.cos(pitch);
  cam.position.set(view.tx + Math.cos(yaw) * cp * view.dist, view.ty + Math.sin(pitch) * view.dist, view.tz + Math.sin(yaw) * cp * view.dist);
  cam.lookAt(view.tx, view.ty, view.tz);
  const tt = reduced ? 1.5 : t;
  holos.forEach((h, i) => { h.up(tt + i * .37); h.g.position.y = 2.3 + (reduced ? 0 : Math.sin(t * .9 + i) * .08); });
  STATIONS.forEach((s, i) => { const on = i === hover || i === cur; s.ring.material.opacity = on ? 1 : .55; s.beam.material.opacity = i === cur ? .05 : on ? .16 : .07; });
  if (bloom) bloom.strength += ((cur >= 0 ? .6 : .95) - bloom.strength) * .06;
  core.rotation.y = tt * .2; coreWire.rotation.x = tt * .13; coreKick *= .93; coreIn.scale.setScalar(1 + Math.sin(tt * 2) * .06 + coreKick * .5); coreWire.scale.setScalar(1 + coreKick * .25);
  if (dust) dust.rotation.y = tt * .01;
  // labels follow their stations; fade the ones you're not looking at
  STATIONS.forEach((s, i) => {
    tmp.set(s.pos.x, 4.6, s.pos.z).project(cam); const lbl = labels[i];
    if (tmp.z > 1 || Math.abs(tmp.x) > 1.2 || Math.abs(tmp.y) > 1.2) { lbl.style.opacity = '0'; return; }
    lbl.style.opacity = ''; lbl.style.transform = `translate(${(tmp.x + 1) / 2 * innerWidth}px, ${(1 - tmp.y) / 2 * innerHeight}px) translate(-50%, -100%)`;
    lbl.classList.toggle('dim', cur >= 0 && i !== cur);
  });
  if (composer) composer.render(); else renderer.render(scene, cam);
  requestAnimationFrame(frame);
  if (!frame.shown) { frame.shown = true; setTimeout(() => $('#veil')?.classList.add('gone'), 250); }
}
if (renderer) {
  requestAnimationFrame(frame);
  const deep = STATIONS.findIndex((s) => '#' + s.id === location.hash);
  if (/[?&]tour\b/.test(location.search)) setTimeout(tour, reduced ? 0 : 900);
  else if (deep >= 0) setTimeout(() => fly(deep), reduced ? 0 : 600);
}

/* ---------- recruiter autopilot: the lab in about sixty seconds ---------- */
const TOUR = [
  ['raft-hunt', 'A simulator that owns a Raft library\'s clock, network and disk. Pointed at PySyncObj, it found a bug from 2016: a deposed leader acknowledges a write nobody committed.'],
  ['raft-mvcc', 'Raft consensus and MVCC in C++17, checked by 598 assertions under seeded faults. It runs in your browser as WebAssembly.'],
  ['columnar-engine', 'A vectorized query engine: 53.1M rows a second on TPC-H Q1, and a benchmark that shows exactly where it loses.'],
  ['vllm-lite', 'LLM serving from scratch. A paged KV cache takes memory use from 21% to 94% of the same budget.'],
  ['edgar-mcp', 'An MCP server over SEC filings. Its own test caught the rate limiter sending 19 requests into a 10-per-second window.'],
  ['aad-greeks', 'Adjoint Greeks: every sensitivity in one reverse sweep, 49× faster than bumping at fifty inputs.'],
  ['order-book-royale', 'An eight-player order book battle. The exchange is a port of the Python matching engine, held to parity in CI.'],
  ['track-fusion', 'Multi-target tracking with 47% lower localization error, published alongside the regime where it fails.'],
];
let touring = 0;
const capEl = document.createElement('div'); capEl.className = 'cap'; capEl.setAttribute('aria-live', 'polite');
capEl.innerHTML = '<small></small><p></p><div class="cap-bar"><i></i></div><div class="cap-ctl"><button type="button" class="cap-skip">skip tour ✕</button></div>';
document.body.append(capEl);
const card = document.createElement('div'); card.className = 'endcard'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Contact');
card.innerHTML = '<span class="eyebrow">that was the lab</span><h2>Aaryan Patel</h2><p>Systems &amp; software engineer · UGA Computer Science, December 2026. Looking for systems, ML infrastructure or quant roles starting 2027.</p>'
  + '<div class="acts"><a class="primary" href="mailto:aaryansp26@gmail.com">aaryansp26@gmail.com</a><a href="https://www.linkedin.com/in/aaryanpatelsystems/">LinkedIn ↗</a><a href="https://github.com/asp53826">GitHub ↗</a><a href="https://asp53826.github.io/resume/Aaryan-Patel-Systems-Resume.pdf">Résumé ↗</a></div>'
  + '<button type="button" class="again">keep exploring</button>';
document.body.append(card);
card.querySelector('.again').onclick = () => { card.classList.remove('on'); stopTour(); };
capEl.querySelector('.cap-skip').onclick = () => { stopTour(); card.classList.add('on'); };
function caption(title, text, k) {
  capEl.querySelector('small').textContent = title; capEl.querySelector('p').textContent = text;
  capEl.querySelector('.cap-bar i').style.width = (k * 100) + '%';
  capEl.classList.remove('swap'); void capEl.offsetWidth; capEl.classList.add('swap');
}
async function tour() {
  const my = ++touring, n = TOUR.length + 2;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 2500) : ms)).then(() => { if (my !== touring) throw new Error('stopped'); });
  card.classList.remove('on'); hideInfo(); $('#intro').classList.add('gone');
  document.body.classList.add('touring'); capEl.classList.add('on');
  try {
    cur = -1; go({ ...OVERVIEW, yaw: view.yaw + .8, pitch: .5, dist: OVERVIEW.dist * 1.08 });
    caption('the lab · in sixty seconds', 'Aaryan Patel builds systems, then tries to break them. Twelve projects, each with its tests and its measurements.', 1 / n);
    await wait(5000);
    for (const [k, [id, text]] of TOUR.entries()) {
      const i = STATIONS.findIndex((s) => s.id === id);
      fly(i, true); caption(`${k + 1} / ${TOUR.length} · ${id}`, text, (k + 2) / n);
      await wait(6600);
    }
    cur = -1; go({ ...OVERVIEW, yaw: view.yaw + 1.4, pitch: .7, dist: OVERVIEW.dist * 1.25 });
    caption('your move', '', 1); window.__sfx?.play('win');
    await wait(1600);
    capEl.classList.remove('on'); card.classList.add('on'); card.querySelector('a').focus({ preventScroll: true });
  } catch (e) { /* stopped by the visitor */ }
}
function stopTour() {
  if (!document.body.classList.contains('touring')) return;
  touring++; document.body.classList.remove('touring'); capEl.classList.remove('on');
  if (cur < 0) $('#intro').classList.remove('gone');
}
addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (card.classList.contains('on')) card.classList.remove('on'); stopTour(); } });
cv.addEventListener('pointerdown', () => { if (touring && document.body.classList.contains('touring')) stopTour(); });
$('#tourBtn')?.addEventListener('click', tour);
navBtns.forEach((b) => b.addEventListener('click', stopTour, true));
