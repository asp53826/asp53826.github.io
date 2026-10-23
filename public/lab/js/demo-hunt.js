// raft-hunt case page: step through finding 001 on the exact node states the
// simulator recorded (replay.json in the raft-hunt repo), and draw finding 002's
// message counts.
const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TERM = ['#5b6560', '#8BE59A', '#F0B556', '#B9A6FF', '#5CE1E6'];

let data, k = 0, timer = null;
try { data = await (await fetch('../data/raft-hunt-001.json')).json(); } catch (e) { data = null; }

function render() {
  const s = data.steps[k];
  $('#hStep').textContent = `${k + 1} / ${data.steps.length}`;
  $('#hT').textContent = `t = ${s.t.toFixed(2)} s`;
  $('#hTitle').textContent = s.title;
  $('#hText').textContent = s.text;
  const grid = $('#hNodes'); grid.textContent = '';
  for (const [nid, n] of Object.entries(s.nodes)) {
    const col = el('div', 'hnode' + (s.focus === nid ? ' focus' : '') + (n.cut.length ? ' cut' : ''));
    const head = el('div', 'hhead');
    head.append(el('b', '', nid), el('span', 'role ' + n.role, n.role), el('span', 'term', `term ${n.term}`));
    col.append(head);
    if (n.cut.length) col.append(el('div', 'hcut', `cut off from ${n.cut.join(', ')}`));
    const log = el('ol', 'hlog');
    for (const [idx, term, what] of n.log) {
      const li = el('li');
      li.style.setProperty('--c', TERM[term % TERM.length]);
      if (idx <= n.commit) li.classList.add('committed');
      if (idx <= n.applied) li.classList.add('applied');
      if (what.includes('stale')) li.classList.add('stale');
      li.append(el('span', 'idx', idx), el('span', 'what', what), el('span', 'tt', 't' + term));
      log.append(li);
    }
    col.append(log);
    const foot = el('div', 'hfoot');
    foot.append(el('span', '', `commit ${n.commit} · applied ${n.applied}`));
    const x = el('b', 'x' + (n.x === 'stale' ? ' bad' : ''), `x = ${n.x === null ? '∅' : JSON.stringify(n.x)}`);
    foot.append(x);
    col.append(foot);
    grid.append(col);
  }
  const acks = $('#hAcks'); acks.textContent = '';
  for (const a of s.acks) {
    const li = el('li', a.value === 'stale' ? 'bad' : '');
    li.textContent = `t=${a.t.toFixed(2)}  put(x, ${JSON.stringify(a.value)}) via ${a.at} → ${a.result}`;
    acks.append(li);
  }
  if (!s.acks.length) acks.append(el('li', 'dim', 'no acknowledgements yet'));
  $('#hPrev').disabled = k === 0;
  $('#hNext').disabled = k === data.steps.length - 1;
  if (k === data.steps.length - 1) window.__sfx?.play('error'); else window.__sfx?.play('note', k);
}

function step(d) { k = Math.max(0, Math.min(data.steps.length - 1, k + d)); render(); }
function play() {
  if (timer) { clearInterval(timer); timer = null; $('#hPlay').textContent = '▶ Play'; return; }
  if (k === data.steps.length - 1) k = -1;
  $('#hPlay').textContent = '❚❚ Pause';
  step(1);
  timer = setInterval(() => { if (k >= data.steps.length - 1) { play(); return; } step(1); }, 3200);
}

if (data) {
  $('#hPrev').onclick = () => step(-1);
  $('#hNext').onclick = () => step(1);
  $('#hPlay').onclick = play;
  render();
  if (!reduced && 'IntersectionObserver' in window) {
    let started = false;
    new IntersectionObserver((es) => { if (es[0].isIntersecting && !started) { started = true; play(); } }, { threshold: .5 }).observe($('#hNodes'));
  }
} else {
  $('#hTitle').textContent = 'Replay data unavailable';
}

/* finding 002: messages one leader tick sends a lagging follower */
const bars = [
  { label: 'stock 0.3.17, one tick', v: 82441, note: 'in-process transport, real fork' },
  { label: 'stock, over real TCP', v: 2788, note: 'during one 0.36 s compaction' },
  { label: 'with the fix, one tick', v: 1, note: 'one message per period' },
];
const max = Math.log10(100000);
const box = $('#stormBars');
for (const b of bars) {
  const row = el('div', 'srow');
  const track = el('span', 'strack'), fill = el('i');
  fill.style.width = (Math.max(0.02, Math.log10(Math.max(1, b.v)) / max) * 100) + '%';
  if (b.v < 10) fill.classList.add('good');
  track.append(fill);
  row.append(el('span', 'slab', b.label), track, el('b', '', b.v.toLocaleString('en-US')), el('small', '', b.note));
  box.append(row);
}
