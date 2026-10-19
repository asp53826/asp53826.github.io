// columnar-engine case page: mask-then-compact on a 32-row batch, with an
// independently written row-at-a-time reference checking every result, and
// the repo's measured crossover table drawn as a chart.

const $ = (s) => document.querySelector(s);
const N = 32;
let region = [], revenue = [], vReg = [], vRev = [], R = 2, bs = 8;

function reroll() {
  region = []; revenue = []; vReg = []; vRev = [];
  for (let i = 0; i < N; i++) {
    region.push(1 + ((Math.random() * 4) | 0)); vReg.push(Math.random() > .12);
    revenue.push(Math.round(Math.random() * 500)); vRev.push(Math.random() > .12);
  }
}

/* vector path: per batch, compare into a byte mask (validity-aware), then compact */
function filterVector(values, valid, pred, incoming) {
  const out = [], masks = new Array(N).fill(null);
  if (incoming) {
    // a chained predicate walks only the incoming row IDs, still in batches
    for (let b = 0; b < incoming.length; b += bs) {
      const ids = incoming.slice(b, b + bs), mask = ids.map((r) => (valid[r] && pred(values[r]) ? 1 : 0));
      ids.forEach((r, k) => { masks[r] = mask[k]; if (mask[k]) out.push(r); });
    }
  } else {
    for (let b = 0; b < N; b += bs) {
      const mask = [];
      for (let r = b; r < Math.min(N, b + bs); r++) mask.push(valid[r] && pred(values[r]) ? 1 : 0);
      mask.forEach((m, k) => { masks[b + k] = m; if (m) out.push(b + k); });
    }
  }
  return { out, masks };
}
function groupSum(sel) { const g = new Map(); for (const r of sel) { if (!vReg[r] || !vRev[r]) continue; g.set(region[r], (g.get(region[r]) || 0) + revenue[r]); } return g; }

/* scalar reference: one row at a time, a sorted object instead of a map */
function scalarReference(regionWanted, thr) {
  const ids = [], sums = {};
  for (let r = 0; r < N; r++) {
    const regionKnown = vReg[r], revenueKnown = vRev[r];
    if (!regionKnown || region[r] !== regionWanted) continue;
    if (!revenueKnown || !(revenue[r] >= thr)) continue;
    ids.push(r); sums[region[r]] = (sums[region[r]] || 0) + revenue[r];
  }
  return { ids, sums };
}

function render() {
  const thr = +$('#thr').value; $('#thrOut').textContent = thr;
  const f1 = filterVector(region, vReg, (v) => v === R);
  const f2 = filterVector(revenue, vRev, (v) => v >= thr, f1.out);
  const agg = groupSum(f2.out), ref = scalarReference(R, thr);
  const g = $('#grid'); g.textContent = '';
  const cell = (txt, cls) => { const d = document.createElement('div'); d.textContent = txt; if (cls) d.className = cls; g.append(d); };
  const bound = (r) => (r % bs === 0 && r ? ' bound' : '');
  cell('row', 'h'); for (let r = 0; r < N; r++) cell(r, 'bit0' + bound(r));
  cell('region', 'h'); for (let r = 0; r < N; r++) cell(vReg[r] ? region[r] : '∅', (vReg[r] ? '' : 'null') + bound(r));
  cell('region valid', 'h'); for (let r = 0; r < N; r++) cell(vReg[r] ? '1' : '0', (vReg[r] ? 'bit1' : 'bit0') + bound(r));
  cell('mask = ' + R, 'h'); for (let r = 0; r < N; r++) cell(f1.masks[r], (f1.masks[r] ? 'm1' : 'm0') + bound(r));
  cell('revenue', 'h'); for (let r = 0; r < N; r++) cell(vRev[r] ? revenue[r] : '∅', (vRev[r] ? '' : 'null') + bound(r));
  cell('mask ≥ ' + thr, 'h'); for (let r = 0; r < N; r++) cell(f2.masks[r] == null ? '·' : f2.masks[r], (f2.masks[r] == null ? 'skip' : f2.masks[r] ? 'm1' : 'm0') + bound(r));
  cell('selected', 'h'); for (let r = 0; r < N; r++) cell(f2.out.includes(r) ? '●' : '', (f2.out.includes(r) ? 'sel' : '') + bound(r));
  $('#s1').textContent = '[' + f1.out.join(', ') + ']  (' + f1.out.length + ' of 32)';
  $('#s2').textContent = '[' + f2.out.join(', ') + ']  (' + f2.out.length + ', ' + f1.out.length + ' rows visited, not 32)';
  $('#agg').textContent = [...agg].map(([k, v]) => 'region ' + k + ' → ' + v).join('  ') || 'no surviving rows';
  const same = JSON.stringify(ref.ids) === JSON.stringify(f2.out) && JSON.stringify(ref.sums) === JSON.stringify(Object.fromEntries([...agg].sort()));
  const o = $('#oracle'); o.textContent = (same ? '✓ agrees: ' : '✗ disagrees: ') + ref.ids.length + ' rows, sums ' + JSON.stringify(ref.sums);
  o.className = same ? 'ok' : 'bad';
}

const rb = $('#regBtns');
[1, 2, 3, 4].forEach((r) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = r; b.setAttribute('aria-pressed', String(r === R)); b.onclick = () => { R = r; [...rb.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render(); }; rb.append(b); });
const bb = $('#bsBtns');
[1, 7, 8, 32].forEach((n) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = n; b.setAttribute('aria-pressed', String(n === bs)); b.onclick = () => { bs = n; [...bb.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render(); }; bb.append(b); });
$('#thr').addEventListener('input', render);
$('#reroll').addEventListener('click', () => { reroll(); render(); });
reroll(); render();

/* the measured crossover, straight from the README */
const X = [
  { rows: '1,000', surv: '6.7%', s: 3.21, v: 3.71, unit: 'µs' },
  { rows: '10,000', surv: '7.0%', s: 25.08, v: 26.92, unit: 'µs' },
  { rows: '10,000', surv: '36.8%', s: 127.29, v: 66.08, unit: 'µs' },
  { rows: '100,000', surv: '66.6%', s: 1599.58, v: 826.5, unit: 'µs' },
  { rows: '1,000,000', surv: '7.4%', s: 4060.5, v: 3685.62, unit: 'µs' },
  { rows: '1,000,000', surv: '66.8%', s: 16297.67, v: 8739.08, unit: 'µs' },
];
const svg = $('#xover'), NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; svg.append(e); return e; };
const L = 60, Rr = 990, T = 30, B = 290, colW = (Rr - L) / X.length;
mk('line', { x1: L, y1: B + .5, x2: Rr, y2: B + .5, stroke: '#36403a' });
mk('text', { x: L - 8, y: T + 4, 'text-anchor': 'end', fill: '#8E978F', 'font-size': 12, 'font-family': 'JetBrains Mono, monospace' }, 'slower');
mk('text', { x: L - 8, y: B, 'text-anchor': 'end', fill: '#8E978F', 'font-size': 12, 'font-family': 'JetBrains Mono, monospace' }, '0');
X.forEach((d, i) => {
  const x0 = L + i * colW + colW * .18, bw = colW * .28, max = Math.max(d.s, d.v);
  const hs = (B - T) * d.s / max, hv = (B - T) * d.v / max, speed = d.s / d.v, lose = speed < 1;
  const g = document.createElementNS(NS, 'g'); g.setAttribute('tabindex', '0'); g.style.cursor = 'pointer'; svg.append(g);
  const r1 = document.createElementNS(NS, 'rect'); Object.entries({ x: x0, y: B - hs, width: bw, height: hs, rx: 3, fill: '#5b6560' }).forEach(([k, v]) => r1.setAttribute(k, v));
  const r2 = document.createElementNS(NS, 'rect'); Object.entries({ x: x0 + bw + 6, y: B - hv, width: bw, height: hv, rx: 3, fill: lose ? '#F0B556' : '#8BE59A' }).forEach(([k, v]) => r2.setAttribute(k, v));
  const tl = document.createElementNS(NS, 'text'); Object.entries({ x: x0 + bw + 3, y: Math.min(B - hs, B - hv) - 10, 'text-anchor': 'middle', fill: lose ? '#F0B556' : '#8BE59A', 'font-size': 18, 'font-weight': 700, 'font-family': 'JetBrains Mono, monospace' }).forEach(([k, v]) => tl.setAttribute(k, v)); tl.textContent = speed.toFixed(2) + '×';
  const lb = document.createElementNS(NS, 'text'); Object.entries({ x: x0 + bw + 3, y: B + 22, 'text-anchor': 'middle', fill: '#BDC5BF', 'font-size': 13, 'font-family': 'JetBrains Mono, monospace' }).forEach(([k, v]) => lb.setAttribute(k, v)); lb.textContent = d.rows;
  const lb2 = document.createElementNS(NS, 'text'); Object.entries({ x: x0 + bw + 3, y: B + 40, 'text-anchor': 'middle', fill: '#8E978F', 'font-size': 12, 'font-family': 'JetBrains Mono, monospace' }).forEach(([k, v]) => lb2.setAttribute(k, v)); lb2.textContent = d.surv + ' survive';
  g.append(r1, r2, tl, lb, lb2);
  const note = () => { $('#xnote').innerHTML = ''; $('#xnote').textContent = `${d.rows} rows, ${d.surv} surviving: scalar ${d.s.toLocaleString('en-US')} µs, vector ${d.v.toLocaleString('en-US')} µs. ` + (lose ? 'The vector path loses here: the mask and compaction pass cost more than they save.' : `The vector path is ${speed.toFixed(2)}× faster.`); };
  g.addEventListener('mouseenter', note); g.addEventListener('focus', note); g.addEventListener('click', note);
});
