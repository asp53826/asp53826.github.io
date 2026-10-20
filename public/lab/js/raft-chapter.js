// The Raft chapter on the home page. Scrolling through the pinned section
// replays the failover story one engine call at a time; each step's picture is
// the WebAssembly engine's own state after replaying every call up to it, so
// scrolling backwards is exact, not an undo animation.

import { loadFaultline, invariants, sonify } from './faultline.js';
import { createClusterView } from './cluster-view.js';

const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const STORY = [
  { tok: ['r'], t: 'Five followers, nobody in charge', d: 'A fresh cluster with deterministic election timers. No leader yet.' },
  { tok: ['c1'], t: 'Node 1 wins an election', d: 'Term 1. A majority voted, and every log holds the leader’s first entry.' },
  { tok: ['i1'], t: 'A partition cuts the leader off', d: 'Node 1 still believes it leads. The other four can’t hear it.' },
  { tok: ['p7'], t: 'A client writes to the old leader', d: 'It appends tx-7 locally. Without a majority, its commit index can’t move.' },
  { tok: ['t11'], t: 'The majority elects a new leader', d: 'After 11 logical ticks node 2 wins term 2. Two nodes think they lead, in different terms. That’s safe.' },
  { tok: ['h', 't5'], t: 'The network heals', d: 'Node 1 sees term 2, steps down, and its uncommitted tx-7 is repaired away.' },
  { tok: ['p8'], t: 'The next write commits everywhere', d: 'tx-8 reaches a majority. All five commit indexes and MVCC digests converge.' },
];

const cv = $('#raftCv');
if (cv) main();

async function main() {
  const view = createClusterView(cv, { onSelect: (id) => { $('#rcSel').textContent = 'n' + id; } });
  const stepsEl = $('#rcSteps');
  const items = STORY.map((s, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button';
    b.innerHTML = '<b>0' + (i + 1) + '</b><strong></strong><span></span>';
    b.querySelector('strong').textContent = s.t; b.querySelector('span').textContent = s.d;
    b.addEventListener('click', () => { stopPlay(); setStep(i); });
    li.append(b); stepsEl.append(li); return li;
  });

  let eng = null, step = -1, playing = null;
  try {
    eng = await loadFaultline();
    $('#rcEngine').textContent = '● raft-mvcc · C++17 → WebAssembly';
  } catch (e) {
    $('#rcEngine').textContent = 'engine unavailable here: ' + e.message;
    $('#rcEngine').style.color = 'var(--warn)';
    $('#rcEvent').textContent = 'The WebAssembly engine loads from /wasm/faultline/ on asp53826.github.io.';
    return;
  }

  function show(s, note) {
    view.update(s);
    $('#rcTick').textContent = String(s.tick).padStart(3, '0');
    $('#rcDrop').textContent = s.dropped;
    $('#rcEvent').textContent = note ? note + ' ' + s.event : s.event;
    const inv = $('#rcInv'); inv.textContent = '';
    for (const r of invariants(s)) {
      const d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'), dot = document.createElement('i');
      dot.style.background = r.state === 'pass' ? 'var(--accent)' : r.state === 'wait' ? 'var(--warn)' : 'var(--danger)';
      dt.append(dot, r.label); dd.textContent = r.detail; d.append(dt, dd); inv.append(d);
    }
  }

  function setStep(k) {
    k = Math.max(0, Math.min(STORY.length - 1, k));
    if (k === step) return;
    step = k;
    let s;
    for (let i = 0; i <= k; i++) for (const t of STORY[i].tok) s = eng.run(t);
    show(s, 'engine:');
    sonify(STORY[k].tok[STORY[k].tok.length - 1], s);
    items.forEach((li, i) => { li.classList.toggle('on', i === k); li.classList.toggle('done', i < k); });
  }

  // manual controls append to whatever state is on screen
  document.querySelectorAll('#raft [data-tok]').forEach((b) => b.addEventListener('click', () => {
    stopPlay();
    let tok = b.dataset.tok;
    if (tok === 'c' || tok === 'i') tok += view.selected;
    const s = eng.run(tok);
    if (tok === 'r') step = 0, items.forEach((li, i) => { li.classList.toggle('on', i === 0); li.classList.toggle('done', false); });
    show(s, 'you ran ' + tok + ':'); sonify(tok, s);
  }));
  document.querySelectorAll('#raft [data-hist]').forEach((b) => b.addEventListener('click', () => {
    const r = eng.history(b.dataset.hist === '1');
    $('#rcEvent').textContent = r.linearizable
      ? `oracle: history accepted after ${r.exploredStates} explored states, witness ${r.witness.join(' → ')}.`
      : `oracle: stale read rejected, no legal linearization in ${r.exploredStates} explored states.`;
  }));

  function stopPlay() { if (playing) { clearInterval(playing); playing = null; $('#rcPlay').textContent = '▶ Play the story'; } }
  $('#rcPlay').addEventListener('click', () => {
    if (playing) { stopPlay(); return; }
    step = -1; setStep(0);
    $('#rcPlay').textContent = '■ Stop';
    playing = setInterval(() => { if (step >= STORY.length - 1) stopPlay(); else setStep(step + 1); }, reduced ? 900 : 2200);
  });

  setStep(0);

  // pinned scroll story on large screens
  const G = window.gsap, ST = window.ScrollTrigger;
  const pinOK = G && ST && !reduced && matchMedia('(min-width: 1000px) and (min-height: 720px)').matches;
  if (!pinOK) return;
  G.registerPlugin(ST);
  const pin = $('#raftPin');
  pin.classList.add('pinned');
  const HH = () => (document.querySelector('header.nav') || { offsetHeight: 69 }).offsetHeight;
  ST.create({
    trigger: pin,
    start: () => 'top ' + HH(),
    end: () => '+=' + Math.round(innerHeight * 2.4),
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate(self) {
      if (playing) return;
      setStep(Math.min(STORY.length - 1, Math.floor(self.progress * STORY.length)));
      $('#rcProg').style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
    },
  });
  ST.refresh();
}
