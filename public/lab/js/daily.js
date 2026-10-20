// The lab daily: three puzzles generated from today's UTC date, so everyone
// gets the same set without a server. Results and streaks stay in this browser.
import { capture } from './flags.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const sfx = (n, a) => window.__sfx?.play(n, a);
const KEY = 'lab-daily', LAUNCH = Date.UTC(2026, 9, 20);
const today = new Date().toISOString().slice(0, 10);
const number = Math.floor((Date.parse(today) - LAUNCH) / 864e5) + 1;

// seeded RNG: the date string picks every number on this page
function seedOf(s) { let h = 1779033703 ^ s.length; for (const c of s) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry(seedOf('lab-daily:' + today));
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];

function loadAll() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
function saveAll(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }
const all = loadAll(); all.days = all.days || {};
const state = all.days[today] = all.days[today] || { res: [null, null, null], tries: [0, 0, 0] };

/* ---------- 1. stale read ---------- */
function makeHistory() {
  const clients = ['A', 'B', 'C'], ops = [];
  // three writes spaced across the timeline, values 1..3
  let t = ri(3, 8);
  const writes = [1, 2, 3].map((v) => { const s = t, e = s + ri(8, 12); t = e + ri(14, 20); return { kind: 'w', v, s, e, c: pick(clients) }; });
  // a read in each gap after a write; it must return the latest completed value
  const gaps = writes.map((w, i) => [w.e + 2, (writes[i + 1]?.s ?? 100) - 2]);
  const reads = [];
  gaps.forEach(([a, b], i) => {
    if (b - a < 8) return;
    const s = ri(a, b - 7), e = Math.min(b, s + ri(6, 9));
    reads.push({ kind: 'r', v: writes[i].v, s, e, c: pick(clients.filter((c) => c !== writes[i].c)) });
  });
  // one more read before the first write sees the initial 0
  if (writes[0].s > 9) reads.unshift({ kind: 'r', v: 0, s: 1, e: writes[0].s - 2, c: pick(clients) });
  // make exactly one read stale: a read that must see v >= 2 returns something older
  const candidates = reads.filter((r) => r.v >= 1);
  const bad = candidates[Math.floor(rnd() * candidates.length)];
  bad.stale = true; bad.should = bad.v; bad.v = ri(0, bad.v - 1);
  writes.concat(reads).forEach((o) => ops.push(o));
  return { clients, ops, bad };
}

/* ---------- 2. broken greek ---------- */
const N = (x) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
function Phi(x) { const k = 1 / (1 + .2316419 * Math.abs(x)), p = N(x) * k * (.31938153 + k * (-.356563782 + k * (1.781477937 + k * (-1.821255978 + k * 1.330274429)))); return x >= 0 ? 1 - p : p; }
function makeGreeks() {
  for (;;) {
    const call = rnd() < .5, S = ri(80, 120), K = Math.round((S + ri(-15, 15)) / 5) * 5, T = ri(2, 12) / 12, vol = ri(15, 50) / 100, r = .04;
    const d1 = (Math.log(S / K) + (r + vol * vol / 2) * T) / (vol * Math.sqrt(T)), d2 = d1 - vol * Math.sqrt(T);
    const delta = call ? Phi(d1) : Phi(d1) - 1, gamma = N(d1) / (S * vol * Math.sqrt(T)), vega = S * N(d1) * Math.sqrt(T) / 100;
    const theta = (call ? (-S * N(d1) * vol / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * Phi(d2)) : (-S * N(d1) * vol / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * Phi(-d2))) / 365;
    if (theta >= 0 || Math.abs(delta) < .05 || Math.abs(delta) > .95) continue;   // keep every true value unambiguous
    const g = [{ k: 'delta', v: delta, f: 3 }, { k: 'gamma', v: gamma, f: 4 }, { k: 'vega', v: vega, f: 3 }, { k: 'theta', v: theta, f: 3 }];
    const which = pick([0, 0, 1, 2]);   // delta gets broken more often: it has two ways to break
    const why = {
      0: call ? 'A call’s delta lives between 0 and 1: owning it never makes you short the stock.' : 'A put’s delta lives between −1 and 0: owning it never makes you long the stock.',
      1: 'Gamma is never negative for a long option: the payoff is convex.',
      2: 'Vega is never negative for a long option: more uncertainty only adds optionality.',
    }[which];
    const bad = g[which];
    if (which === 0) bad.v = call ? (rnd() < .5 ? -bad.v : bad.v + 1) : (rnd() < .5 ? -bad.v : bad.v - 1);
    else bad.v = -bad.v;
    return { call, S, K, T, vol, r, g, which, why };
  }
}

/* ---------- 3. order book sweep ---------- */
function makeBook() {
  const mid = ri(9500, 10500) / 100, tick = .01, asks = [], bids = [];
  for (let i = 0; i < 6; i++) { asks.push({ p: +(mid + tick * (1 + i * ri(1, 3))).toFixed(2), q: ri(2, 9) * 100 }); bids.push({ p: +(mid - tick * (1 + i * ri(1, 3))).toFixed(2), q: ri(2, 9) * 100 }); }
  asks.sort((a, b) => a.p - b.p); bids.sort((a, b) => b.p - a.p);
  for (let i = 1; i < 6; i++) { if (asks[i].p <= asks[i - 1].p) asks[i].p = +(asks[i - 1].p + tick).toFixed(2); if (bids[i].p >= bids[i - 1].p) bids[i].p = +(bids[i - 1].p - tick).toFixed(2); }
  const lvl = ri(2, 4), cum = asks.slice(0, lvl + 1).reduce((a, x) => a + x.q, 0), before = cum - asks[lvl].q;
  const qty = before + ri(1, asks[lvl].q / 100) * 100 - (rnd() < .5 ? 50 : 0);
  const options = asks.slice(Math.max(0, lvl - 2), Math.max(0, lvl - 2) + 4).map((a) => a.p);
  return { asks, bids, qty: Math.max(before + 50, qty), lvl, answer: asks[lvl].p, options };
}

const H = makeHistory(), G = makeGreeks(), B = makeBook();
const rounds = [$('#r0'), $('#r1'), $('#r2')];

function score(i, ok) {
  if (state.res[i]) return;
  state.tries[i]++;
  if (ok) state.res[i] = state.tries[i] === 1 ? 'g' : 'y';
  else if (state.tries[i] >= 2) state.res[i] = 'r';
  saveAll(all); paintGrid(i);
}
function paintGrid(pop) {
  [...$('#grid3').children].forEach((c, i) => {
    c.className = state.res[i] || ''; c.textContent = { g: '✓', y: '~', r: '✕' }[state.res[i]] || '';
    if (i === pop) { c.classList.add('pop'); setTimeout(() => c.classList.remove('pop'), 300); }
  });
  rounds.forEach((r, i) => r.classList.toggle('locked', i > 0 && !state.res[i - 1]));
  if (state.res.every(Boolean)) finish();
}
function verdict(i, cls, text) { const v = $('#v' + i); v.className = 'verdict on ' + cls; v.textContent = text; }
function triesText(i) { $('#t' + i).textContent = state.res[i] ? '' : (2 - state.tries[i]) + ' tr' + (2 - state.tries[i] === 1 ? 'y' : 'ies') + ' left'; }

/* render 1 */
(function () {
  const box = $('#hist'), X = (t) => `calc(58px + (100% - 72px) * ${t / 100})`, W = (a, b) => `calc((100% - 72px) * ${(b - a) / 100})`;
  H.clients.forEach((c) => {
    const row = el('div', 'hrow'); row.append(el('span', '', 'client ' + c));
    H.ops.filter((o) => o.c === c).forEach((o) => {
      const b = el(o.kind === 'r' ? 'button' : 'div', 'op ' + o.kind, o.kind === 'w' ? `w(x, ${o.v})` : `r(x) → ${o.v}`);
      b.style.left = X(o.s); b.style.width = W(o.s, o.e);
      if (o.kind === 'r') { b.type = 'button'; b.setAttribute('aria-label', `client ${c} read x and got ${o.v}, from t=${o.s} to t=${o.e}`); o.btn = b; b.onclick = () => choose(o); }
      row.append(b);
    });
    box.append(row);
  });
  const ax = el('div', 'axis'); ['t=0', '25', '50', '75', '100'].forEach((t) => ax.append(el('span', '', t))); box.append(ax);
  const prev = H.ops.filter((o) => o.kind === 'w' && o.e < H.bad.s).pop();
  const explain = `r(x) → ${H.bad.v} on client ${H.bad.c} started at t=${H.bad.s}, after w(x, ${H.bad.should}) finished at t=${prev.e}. Linearizability says a read sees every write that completed before it began, so it must return ${H.bad.should}.`;
  function choose(o) {
    if (state.res[0]) return;
    if (o.stale) { score(0, true); o.btn.classList.add('answer'); sfx('commit'); verdict(0, 'good', '✓ ' + explain); }
    else { o.btn.classList.add('picked-bad'); sfx('error'); score(0, false); if (state.res[0]) { H.bad.btn.classList.add('answer'); verdict(0, 'bad', '✕ ' + explain); } else verdict(0, 'meh', `r(x) → ${o.v} is fine: the latest write that finished before it started wrote ${o.v}. One more try.`); }
    triesText(0);
  }
  if (state.res[0]) { H.bad.btn.classList.add('answer'); verdict(0, state.res[0] === 'r' ? 'bad' : 'good', explain); }
  triesText(0);
})();

/* render 2 */
(function () {
  const c = $('#contract');
  [['type', G.call ? 'call' : 'put'], ['spot', G.S], ['strike', G.K], ['expiry', Math.round(G.T * 12) + ' mo'], ['vol', Math.round(G.vol * 100) + '%'], ['rate', '4%']].forEach(([k, v]) => { const s = el('span', '', k + ' '); s.append(el('b', '', String(v))); c.append(s); });
  const gk = $('#gk');
  G.g.forEach((g, i) => {
    const b = el('button'); b.type = 'button'; b.append(el('span', '', g.k + (g.k === 'vega' ? ' / vol pt' : g.k === 'theta' ? ' / day' : '')), el('b', '', (g.v >= 0 ? '+' : '') + g.v.toFixed(g.f)));
    b.onclick = () => {
      if (state.res[1]) return;
      if (i === G.which) { score(1, true); b.classList.add('answer'); sfx('commit'); verdict(1, 'good', '✓ ' + G.why); }
      else { b.classList.add('picked-bad'); sfx('error'); score(1, false); if (state.res[1]) { gk.children[G.which].classList.add('answer'); verdict(1, 'bad', '✕ ' + G.why); } else verdict(1, 'meh', `${g.k} is plausible here. Think about which sign or bound can never break.`); }
      triesText(1);
    };
    gk.append(b);
  });
  if (state.res[1]) { gk.children[G.which].classList.add('answer'); verdict(1, state.res[1] === 'r' ? 'bad' : 'good', G.why); }
  triesText(1);
})();

/* render 3 */
(function () {
  $('#bookQ').textContent = `A market order to buy ${B.qty.toLocaleString('en-US')} shares hits this book. What’s the worst (highest) price it pays?`;
  const book = $('#book'), max = Math.max(...B.asks.concat(B.bids).map((x) => x.q));
  [['ask', 'asks · sellers', B.asks], ['bid', 'bids · buyers', B.bids]].forEach(([cls, title, lv]) => {
    const s = el('div', 'side ' + cls); s.append(el('h3', '', title));
    lv.forEach((x) => { const r = el('div', 'lv'), bar = el('i'); bar.style.width = (x.q / max * 100) + '%'; r.append(bar, el('span', '', x.p.toFixed(2)), el('span', '', x.q.toLocaleString('en-US'))); s.append(r); });
    book.append(s);
  });
  let cum = 0; const path = B.asks.slice(0, B.lvl + 1).map((a, i) => { const take = Math.min(a.q, B.qty - cum); cum += take; return `${take.toLocaleString('en-US')} @ ${a.p.toFixed(2)}`; }).join(' + ');
  const explain = `Buys lift the asks from the lowest price up: ${path}. The last fill is at ${B.answer.toFixed(2)}.`;
  const opts = $('#opts');
  B.options.forEach((p) => {
    const b = el('button', 'chip', p.toFixed(2)); b.type = 'button';
    b.onclick = () => {
      if (state.res[2]) return;
      if (p === B.answer) { score(2, true); b.classList.add('answer'); sfx('commit'); verdict(2, 'good', '✓ ' + explain); }
      else { b.classList.add('picked-bad'); sfx('error'); score(2, false); if (state.res[2]) { [...opts.children].find((x) => x.textContent === B.answer.toFixed(2))?.classList.add('answer'); verdict(2, 'bad', '✕ ' + explain); } else verdict(2, 'meh', p < B.answer ? 'Not enough size at or below that price. Count the shares level by level.' : 'Too far: the order is filled before it gets there.'); }
      triesText(2);
    };
    opts.append(b);
  });
  if (state.res[2]) { [...opts.children].find((x) => x.textContent === B.answer.toFixed(2))?.classList.add('answer'); verdict(2, state.res[2] === 'r' ? 'bad' : 'good', explain); }
  triesText(2);
})();

/* stats, share, countdown */
function stats() {
  const days = Object.keys(all.days).filter((d) => all.days[d].res.every(Boolean)).sort();
  // count back from today (or yesterday, if today isn't finished yet) while every day was completed
  const done = new Set(days), d = new Date(today + 'T00:00:00Z'); let streak = 0;
  if (!done.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  while (done.has(d.toISOString().slice(0, 10))) { streak++; d.setUTCDate(d.getUTCDate() - 1); }
  $('#mStreak').textContent = streak; $('#mPlayed').textContent = days.length;
}
let finished = false;
function finish() {
  if (finished) { stats(); return; }
  finished = true;
  const sq = state.res.map((r) => ({ g: '🟩', y: '🟨', r: '🟥' }[r])).join('');
  const txt = `The lab daily #${number} ${sq}\nstale read · broken Greek · order book\nasp53826.github.io/lab/daily`;
  $('#shareTxt').textContent = txt; $('#done').classList.add('on');
  $('#liBtn').href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent('https://asp53826.github.io/lab/daily/');
  $('#copyBtn').onclick = async () => { try { await navigator.clipboard.writeText(txt); $('#copyBtn').textContent = 'Copied ✓'; } catch (e) { $('#copyBtn').textContent = 'Select and copy above'; } };
  const perfect = state.res.every((r) => r === 'g'); if (perfect) sfx('win');
  capture('daily'); stats();
}

$('#dNo').textContent = '#' + number;
$('#dDate').textContent = new Date(today + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
paintGrid(); stats();
function countdown() {
  const ms = Date.parse(today) + 864e5 - Date.now();
  if (ms <= 0) { $('#mNext').textContent = 'reload'; return; }
  const h = Math.floor(ms / 36e5), m = Math.floor(ms / 6e4) % 60;
  $('#mNext').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
countdown(); setInterval(countdown, 30000);
