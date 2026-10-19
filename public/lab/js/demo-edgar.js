// edgar-mcp case page: a token bucket against a fixed-interval pacer on the
// same request stream, a sliding one-second window, and the measured cache
// and windowing numbers. The limiters are simulated; the 19 and 10 they
// reproduce are the repo's measurements.

const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPAN = 3.2, CEIL = 10, CAP = 10, RATE = 10, GAP = 1 / 9.6;
const css = getComputedStyle(document.body);
const TINT = css.getPropertyValue('--tint').trim() || '#B9A6FF', WARN = '#F0B556', DANGER = '#FF8A7A';

const LOADS = {
  burst: () => Array(30).fill(0),
  two: () => [...Array(16).fill(0), ...Array(16).fill(1.6)],
  steady: () => Array.from({ length: 44 }, (_, i) => i / 14),
};

function bucket(arrivals) {
  let tok = CAP, last = 0; const out = [];
  for (const t of arrivals) {
    let a = Math.max(t, last); tok = Math.min(CAP, tok + (a - last) * RATE);
    if (tok < 1) { a += (1 - tok) / RATE; tok = 1; }
    tok -= 1; last = a; out.push(a);
  }
  return out;
}
function pacer(arrivals) {
  let prev = -Infinity; const out = [];
  for (const t of arrivals) { const a = Math.max(t, prev + GAP); prev = a; out.push(a); }
  return out;
}
// most sends in any half-open [x, x+1) window; the max always starts at a send
const inWin = (xs, from) => xs.filter((a) => a >= from - 1e-9 && a < from + 1 - 1e-9).length;
const peak = (xs) => xs.reduce((m, a) => Math.max(m, inWin(xs, a)), 0);

let B = [], P = [], pkB = 0, pkP = 0, t0 = 0, raf = 0;
function load(name) {
  const arr = LOADS[name]();
  B = bucket(arr); P = pacer(arr); pkB = peak(B); pkP = peak(P);
  $('#pkB').textContent = pkB; $('#pkP').textContent = pkP;
  $('#pkB').className = pkB > CEIL ? 'warn' : '';
  replay();
}
function replay() { cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(frame); }

function frame(now) {
  const head = reduced ? SPAN : Math.min(SPAN, ((now - t0) / 4200) * SPAN);
  if (head < SPAN) { draw(head); raf = requestAnimationFrame(frame); } else rest();
}

// when the sweep ends, park the window on the bucket's worst second
function rest() { draw(SPAN, B.find((a) => inWin(B, a) === pkB) ?? 0); }

function draw(head, ws) {
  const cv = $('#tl'), ctx = cv.getContext('2d'), w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const narrow = w < 600, L = narrow ? 18 : Math.min(150, w * .2), R = w - 18, X = (t) => L + (t / SPAN) * (R - L);
  const lanes = [{ name: 'token bucket', xs: B, y: h * (narrow ? .36 : .32) }, { name: 'pacer', xs: P, y: h * (narrow ? .74 : .7) }];
  const winStart = ws ?? Math.max(0, head - 1), winEnd = Math.min(head, winStart + 1);
  // sliding window
  ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(X(winStart), 10, X(winEnd) - X(winStart), h - 40);
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(X(winStart) + .5, 10); ctx.lineTo(X(winStart) + .5, h - 30); ctx.stroke(); ctx.setLineDash([]);
  // seconds axis
  ctx.font = '11px JetBrains Mono, monospace'; ctx.fillStyle = '#8E978F'; ctx.textAlign = 'center';
  for (let s = 0; s <= 3; s++) { ctx.fillText(s + ' s', X(s), h - 10); ctx.fillStyle = '#1c2320'; ctx.fillRect(X(s), 14, 1, h - 46); ctx.fillStyle = '#8E978F'; }
  for (const lane of lanes) {
    const n = inWin(lane.xs.filter((a) => a <= head), winStart), over = n > CEIL;
    ctx.textAlign = 'left'; ctx.fillStyle = '#BDC5BF'; ctx.font = '12px JetBrains Mono, monospace';
    const lx = narrow ? L : 12, ly = narrow ? lane.y + 20 : lane.y - 6;
    ctx.fillText(lane.name, lx, ly);
    ctx.fillStyle = over ? DANGER : '#8E978F'; ctx.fillText(n + ' in window' + (over ? ' > 10' : ''), narrow ? lx + 110 : lx, narrow ? ly : ly + 18);
    ctx.fillStyle = '#1a201d'; ctx.fillRect(L, lane.y, R - L, 1);
    // stack same-instant sends so a burst reads as a burst
    const seen = new Map();
    for (const a of lane.xs) {
      if (a > head) break;
      const k = Math.round(a * 1000), st = seen.get(k) || 0; seen.set(k, st + 1);
      const inside = a >= winStart - 1e-9 && a < winStart + 1 - 1e-9;
      ctx.fillStyle = inside ? (over ? DANGER : lane.name === 'pacer' ? TINT : WARN) : '#3a423e';
      ctx.beginPath(); ctx.arc(X(a), lane.y - st * 7, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    if (lane.name === 'pacer') $('#winP').textContent = n; else { $('#winB').textContent = n; $('#winB').className = over ? 'warn' : ''; }
  }
  // playhead
  if (ws == null) { ctx.fillStyle = TINT; ctx.fillRect(X(head) - .5, 10, 1.5, h - 40); }
}

document.querySelectorAll('[data-load]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-load]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); load(b.dataset.load);
}));
$('#replay').addEventListener('click', replay);
addEventListener('resize', rest);
load('burst');
if ('IntersectionObserver' in window) {
  let first = true;
  new IntersectionObserver((es) => { if (es[0].isIntersecting && !first) return; if (es[0].isIntersecting) { first = false; replay(); } }, { threshold: .4 }).observe($('#tl'));
}

/* measured cache numbers, log-scaled so 0.2 ms is still visible */
const CACHE = [
  { k: 'companyfacts', cold: 97, warm: 1.4 },
  { k: '10-K text', cold: 154, warm: 1.1 },
];
const bars = $('#bars');
CACHE.forEach((c) => {
  const row = document.createElement('div'); row.className = 'bar';
  row.innerHTML = '<span></span><span class="track"><i></i></span><span class="v"></span>';
  row.children[0].textContent = c.k; bars.append(row); c.el = row;
});
const scale = (ms) => (Math.log10(ms) + 1) / (Math.log10(200) + 1);
function cache(mode) {
  for (const c of CACHE) {
    const ms = c[mode], i = c.el.querySelector('i');
    i.style.width = Math.max(2, scale(ms) * 100) + '%'; i.style.background = mode === 'cold' ? WARN : TINT;
    c.el.querySelector('.v').textContent = ms + ' ms';
  }
  $('#cacheNote').textContent = mode === 'cold' ? 'network, paced' : 'disk, no request sent';
}
document.querySelectorAll('[data-cache]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-cache]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); cache(b.dataset.cache);
}));
cache('cold');

/* windowing a 10-K */
const DOC = 206000;
function windows() {
  const w = +$('#win').value, n = Math.ceil(DOC / w), lastLen = DOC - (n - 1) * w;
  $('#winOut').textContent = w.toLocaleString('en-US');
  const segs = $('#segs'); segs.textContent = '';
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span'); const len = i === n - 1 ? lastLen : w;
    s.style.flexGrow = String(len / w); if (i === n - 1 && lastLen < w) s.className = 'part';
    s.textContent = n <= 12 ? String(i + 1) : ''; segs.append(s);
  }
  $('#segNote').textContent = `${n} windows; the last holds ${lastLen.toLocaleString('en-US')} characters. The server ships 40,000, which is 6 pages for a typical 10-K.`;
}
$('#win').addEventListener('input', windows);
windows();
