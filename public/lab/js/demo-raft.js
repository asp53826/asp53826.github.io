// raft-mvcc case page: the full FAULTLINE console on the real WebAssembly engine.
import { loadFaultline, invariants } from './faultline.js';
import { createClusterView } from './cluster-view.js';

const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SCENARIOS = [
  { id: 'election', t: 'Clean election', toks: ['r', 'c1', 'p'] },
  { id: 'minority', t: 'Minority leader', toks: ['r', 'c1', 'i1', 'p', 't11'] },
  { id: 'repair', t: 'Heal and repair', toks: ['r', 'c1', 'i1', 'p', 't11', 'h', 't5'] },
  { id: 'stale', t: 'Stale-read oracle', toks: ['r', 'v', 's'] },
];

const view = createClusterView($('#cv'), { onSelect: (id) => { $('#sel').textContent = 'n' + id; } });
let eng = null, ops = 0, seq = 0, running = false;

const scnEl = $('#scenarios');
const scnBtns = SCENARIOS.map((s) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'scn'; b.setAttribute('aria-pressed', 'false');
  b.innerHTML = '<strong></strong><small></small>';
  b.querySelector('strong').textContent = s.t; b.querySelector('small').textContent = s.toks.join(' → ');
  b.addEventListener('click', () => runScenario(s, b));
  scnEl.append(b); return b;
});

function tape(tok, label, tick) {
  const li = document.createElement('li');
  li.innerHTML = '<span></span><code></code><p style="margin:0"></p>';
  li.children[0].textContent = String(++seq).padStart(2, '0'); li.children[1].textContent = tok; li.children[2].textContent = label + (tick != null ? ' · tick ' + tick : '');
  const t = $('#tape'); t.append(li); while (t.children.length > 30) t.firstChild.remove(); t.scrollTop = t.scrollHeight;
}

function show(s) {
  view.update(s);
  $('#tick').textContent = String(s.tick).padStart(3, '0'); $('#drop').textContent = s.dropped; $('#ops').textContent = ops;
  $('#event').textContent = s.event;
  const inv = $('#inv'); inv.textContent = '';
  for (const r of invariants(s)) {
    const d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'), dot = document.createElement('i');
    dot.style.background = r.state === 'pass' ? 'var(--tint)' : r.state === 'wait' ? 'var(--warn)' : 'var(--danger)';
    dt.append(dot, r.label); dd.textContent = r.detail; d.append(dt, dd); inv.append(d);
  }
}

function run(tok) {
  if (tok === 'v' || tok === 's') {
    const r = eng.history(tok === 's');
    const msg = r.linearizable ? `history accepted, witness ${r.witness.join(' → ')}, ${r.exploredStates} states explored` : `stale read rejected after ${r.exploredStates} explored states`;
    $('#event').textContent = 'oracle: ' + msg + '.'; tape(tok, msg);
    return;
  }
  const s = eng.run(tok); ops = tok === 'r' ? 0 : ops + 1; show(s); tape(tok, s.event, s.tick);
}

async function runScenario(s, btn) {
  if (!eng || running) return;
  running = true; scnBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  document.querySelectorAll('[data-tok],[data-hist]').forEach((b) => { b.disabled = true; });
  for (const t of s.toks) { run(t); if (!reduced) await new Promise((r) => setTimeout(r, 650)); }
  document.querySelectorAll('[data-tok],[data-hist]').forEach((b) => { b.disabled = false; });
  running = false;
}

document.querySelectorAll('[data-tok]').forEach((b) => b.addEventListener('click', () => {
  if (!eng) return; let t = b.dataset.tok; if (t === 'c' || t === 'i') t += view.selected; run(t);
}));
document.querySelectorAll('[data-hist]').forEach((b) => b.addEventListener('click', () => { if (eng) run(b.dataset.hist === '1' ? 's' : 'v'); }));

try {
  eng = await loadFaultline();
  $('#engState').textContent = '● raft-mvcc engine loaded';
  run('r');
  setTimeout(() => runScenario(SCENARIOS[2], scnBtns[2]), 900);
} catch (e) {
  $('#engState').textContent = 'engine unavailable: ' + e.message; $('#engState').style.color = 'var(--warn)';
  $('#event').textContent = 'The engine loads from /wasm/faultline/ on asp53826.github.io.';
}
