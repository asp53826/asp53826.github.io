// vllm-lite case page: static batching against paged attention with continuous
// batching, on one request queue and one KV budget. This simulates the two
// allocation policies; it does not run a model. Utilization is measured from
// the simulation itself, live.

const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BLOCK = 16, BLOCKS = 128, BUDGET = BLOCK * BLOCKS, MAX_LEN = 512, STATIC_B = 4, NREQ = 48;
const COLS = 16, ROWS = 8;

function lognormalInt(lo, hi) {
  // lognormal between lo and hi, like the benchmark's ranges
  const mu = Math.log(Math.sqrt(lo * hi)), sigma = Math.log(hi / lo) / 4.5;
  let x;
  do { const u = 1 - Math.random(), v = Math.random(); x = Math.exp(mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); } while (x < lo || x > hi);
  return Math.round(x);
}
function makeRequests() { return Array.from({ length: NREQ }, (_, i) => ({ id: i, prompt: lognormalInt(17, 251), out: lognormalInt(20, 192), hue: (i * 47) % 360 })); }

/* static batching: admit STATIC_B at once, reserve MAX_LEN each, run until the longest finishes */
function staticSim(reqs) {
  const q = reqs.map((r) => ({ ...r })), st = { pass: 0, done: 0, util: [], batch: [] };
  st.step = () => {
    if (!st.batch.length) {
      if (!q.length) return false;
      st.batch = q.splice(0, STATIC_B).map((r) => ({ ...r, gen: 0 }));
    }
    st.pass++;
    for (const s of st.batch) if (s.gen < s.out) s.gen++;
    if (st.batch.every((s) => s.gen >= s.out)) { st.done += st.batch.length; st.lastBatch = st.batch; st.batch = []; }
    st.util.push(st.used() / BUDGET);
    return true;
  };
  st.used = () => (st.batch.length ? st.batch : []).reduce((a, s) => a + Math.min(MAX_LEN, s.prompt + s.gen), 0);
  st.cells = () => {
    const cells = new Array(BLOCKS).fill(null), per = MAX_LEN / BLOCK;
    st.batch.forEach((s, k) => {
      const filled = Math.min(MAX_LEN, s.prompt + s.gen);
      for (let b = 0; b < per; b++) {
        const tok = Math.max(0, Math.min(BLOCK, filled - b * BLOCK));
        cells[k * per + b] = { hue: s.hue, fill: tok / BLOCK, reserved: true, done: s.gen >= s.out };
      }
    });
    return cells;
  };
  return st;
}

/* paged + continuous: blocks on demand, admit whenever blocks are free, free on finish, preempt newest under pressure */
function pagedSim(reqs) {
  const q = reqs.map((r) => ({ ...r })), st = { pass: 0, done: 0, util: [], run: [], free: [...Array(BLOCKS).keys()] };
  const need = (len) => Math.ceil(len / BLOCK);
  st.step = () => {
    if (!q.length && !st.run.length) return false;
    // admit while the prompt plus one growth block fits
    while (q.length && st.free.length >= need(q[0].prompt) + 1) {
      const r = q.shift(), blocks = st.free.splice(0, need(r.prompt));
      st.run.push({ ...r, gen: 0, blocks });
    }
    st.pass++;
    for (const s of st.run) {
      s.gen++;
      const len = s.prompt + s.gen;
      if (need(len) > s.blocks.length) {
        if (!st.free.length) {
          // preempt the newest sequence and recompute it later
          const victim = st.run[st.run.length - 1];
          if (victim !== s) { st.free.push(...victim.blocks); st.run.pop(); q.unshift({ id: victim.id, prompt: victim.prompt, out: victim.out, hue: victim.hue }); }
        }
        if (st.free.length) s.blocks.push(st.free.shift()); else s.gen--;
      }
    }
    for (let i = st.run.length - 1; i >= 0; i--) if (st.run[i].gen >= st.run[i].out) { st.free.push(...st.run[i].blocks); st.run.splice(i, 1); st.done++; }
    st.util.push(st.used() / BUDGET);
    return true;
  };
  st.used = () => st.run.reduce((a, s) => a + s.prompt + s.gen, 0);
  st.cells = () => {
    const cells = new Array(BLOCKS).fill(null);
    for (const s of st.run) {
      const len = s.prompt + s.gen;
      s.blocks.forEach((b, k) => { const tok = Math.max(0, Math.min(BLOCK, len - k * BLOCK)); cells[b] = { hue: s.hue, fill: tok / BLOCK, reserved: false }; });
    }
    return cells;
  };
  return st;
}

function draw(cv, cells) {
  const ctx = cv.getContext('2d'), w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const pad = 8, gap = 3, cw = (w - pad * 2 - gap * (COLS - 1)) / COLS, ch = (h - pad * 2 - gap * (ROWS - 1)) / ROWS;
  cells.forEach((c, i) => {
    const x = pad + (i % COLS) * (cw + gap), y = pad + Math.floor(i / COLS) * (ch + gap);
    if (!c) { ctx.fillStyle = '#121816'; ctx.fillRect(x, y, cw, ch); return; }
    if (c.reserved && c.fill === 0) {
      ctx.fillStyle = '#1a1813'; ctx.fillRect(x, y, cw, ch);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, cw, ch); ctx.clip(); ctx.strokeStyle = '#3a3324'; ctx.lineWidth = 2;
      for (let k = -ch; k < cw; k += 6) { ctx.beginPath(); ctx.moveTo(x + k, y + ch); ctx.lineTo(x + k + ch, y); ctx.stroke(); }
      ctx.restore(); return;
    }
    ctx.fillStyle = '#121816'; ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = `hsla(${180 + (c.hue % 60) - 30}, 70%, ${c.done ? 32 : 58}%, 1)`;
    ctx.fillRect(x, y + ch * (1 - c.fill), cw, ch * c.fill);
  });
}

let S, P, timer = null, speed = 3, playing = !reduced;
const pct = (x) => Math.round(x * 100) + '%';
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function reset() {
  const reqs = makeRequests();
  S = staticSim(reqs); P = pagedSim(reqs);
  $('#verdict').textContent = '';
  paint();
}
function paint() {
  draw($('#cvS'), S.cells()); draw($('#cvP'), P.cells());
  const uS = S.used() / BUDGET, uP = P.used() / BUDGET;
  $('#uS').textContent = pct(uS); $('#uP').textContent = pct(uP);
  $('#mS').style.width = pct(uS); $('#mP').style.width = pct(uP);
  $('#aS').textContent = pct(avg(S.util)); $('#aP').textContent = pct(avg(P.util));
  $('#dS').textContent = S.done + ' / ' + NREQ; $('#dP').textContent = P.done + ' / ' + NREQ;
  $('#pS').textContent = S.pass; $('#pP').textContent = P.pass;
}
function tick() {
  let moved = false;
  for (let k = 0; k < speed; k++) { moved = S.step() | moved; moved = P.step() | moved; }
  paint();
  if (S.done === NREQ && P.done === NREQ) {
    $('#verdict').textContent = `done: paging finished in ${P.pass} passes at ${pct(avg(P.util))} average use; static needed ${S.pass} passes at ${pct(avg(S.util))}.`;
    stop(); setTimeout(() => { if (!timer && playing) { reset(); start(); } }, 4000);
  }
}
function start() { if (!timer) timer = setInterval(tick, 80); }
function stop() { clearInterval(timer); timer = null; }

$('#play').addEventListener('click', (e) => {
  playing = !playing; e.currentTarget.setAttribute('aria-pressed', String(playing)); e.currentTarget.textContent = playing ? '❚❚ Pause' : '▶ Play';
  playing ? start() : stop();
});
$('#reset').addEventListener('click', () => { stop(); reset(); if (playing) start(); });
document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => {
  speed = +b.dataset.speed; document.querySelectorAll('[data-speed]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
}));
addEventListener('resize', paint);
reset();
if (playing) { start(); } else { $('#play').textContent = '▶ Play'; $('#play').setAttribute('aria-pressed', 'false'); }
// don't burn cycles while off-screen
if ('IntersectionObserver' in window) new IntersectionObserver((es) => { if (!es[0].isIntersecting) stop(); else if (playing) start(); }).observe($('.duo'));
