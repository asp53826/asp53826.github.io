// kill -9 the website: every section of the page is a replica, the nav is the
// leader. The button SIGKILLs the leader and a few replicas, then the page
// runs an election and replays its log until everything is back.
import { capture } from './flags.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sfx = (n, a) => window.__sfx?.play(n, a);
const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 120) : ms));

const st = document.createElement('style');
st.textContent = `
.k9-btn{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:8px 14px;border-radius:999px;border:1px solid #ff5a4f;background:radial-gradient(circle at 30% 30%,#ff7a6e,#c51f16);color:#fff;font:700 12px var(--mono,monospace);letter-spacing:.02em;cursor:pointer;box-shadow:0 0 0 0 rgba(255,90,79,.6),0 6px 20px rgba(197,31,22,.35);animation:k9pulse 2.4s infinite}
.k9-btn:hover{filter:brightness(1.1)}
.k9-btn:active{transform:translateY(1px) scale(.98)}
.k9-btn[disabled]{opacity:.6;animation:none;cursor:progress}
@keyframes k9pulse{70%{box-shadow:0 0 0 12px rgba(255,90,79,0),0 6px 20px rgba(197,31,22,.35)}100%{box-shadow:0 0 0 0 rgba(255,90,79,0),0 6px 20px rgba(197,31,22,.35)}}
.k9-node:not(header){position:relative}
.k9-down>*{filter:grayscale(1) brightness(.5) contrast(1.2)!important;animation:k9glitch .38s steps(2) infinite}
.k9-down::after{content:attr(data-k9);position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-6deg);z-index:30;padding:10px 18px;border:3px solid #ff5a4f;border-radius:10px;color:#ff5a4f;font:900 clamp(18px,3vw,34px) var(--mono,monospace);letter-spacing:.06em;background:rgba(5,7,10,.75);white-space:nowrap;pointer-events:none;text-shadow:0 0 18px rgba(255,90,79,.6)}
.k9-heal{animation:k9heal .9s ease-out}
@keyframes k9glitch{0%{transform:translate(0)}25%{transform:translate(-3px,1px) skewX(-2deg);clip-path:inset(10% 0 30% 0)}50%{transform:translate(3px,-2px);clip-path:inset(40% 0 5% 0)}75%{transform:translate(-1px,2px) skewX(1deg);clip-path:none}100%{transform:translate(0)}}
@keyframes k9heal{0%{box-shadow:inset 0 0 0 2px #5CE1E6,0 0 60px rgba(92,225,230,.5)}100%{box-shadow:inset 0 0 0 0 transparent,0 0 0 transparent}}
header.nav.k9-down::after{font-size:13px;padding:4px 10px;border-width:2px;transform:translate(-50%,-50%)}
.k9-log{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(70px,calc(env(safe-area-inset-bottom) + 70px));z-index:120;width:min(440px,calc(100vw - 28px));max-height:min(52vh,420px);display:flex;flex-direction:column;border-radius:16px;border:1px solid #3A443E;background:rgba(6,8,9,.94);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 30px 80px rgba(0,0,0,.6);font:12.5px/1.55 var(--mono,monospace);color:#BDC5BF;transform:translateY(20px);opacity:0;transition:transform .4s cubic-bezier(.2,.8,.2,1),opacity .3s}
.k9-log.on{transform:none;opacity:1}
.k9-log header{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #202624;color:#8E978F}
.k9-log header b{color:#ff5a4f}
.k9-log header b.ok{color:#5CE1E6}
.k9-log ol{list-style:none;margin:0;padding:10px 14px;overflow:auto;display:flex;flex-direction:column;gap:2px}
.k9-log li span{color:#5a625d;margin-right:8px}
.k9-log .bad{color:#ff8a7a}.k9-log .ok{color:#5CE1E6}.k9-log .warn{color:#F0B556}.k9-log .big{color:#E9ECE8;font-weight:700}
.k9-log button{background:none;border:0;color:#8E978F;cursor:pointer;font:inherit;min-height:32px;padding:0 6px}
.k9-bar{height:3px;background:#141a18}.k9-bar i{display:block;height:100%;width:0;background:#5CE1E6;transition:width .3s}
html.k9-shake body{animation:k9shake .5s}
@keyframes k9shake{20%{transform:translate(-6px,2px)}40%{transform:translate(5px,-3px)}60%{transform:translate(-3px,3px)}80%{transform:translate(2px,-1px)}}
@media (prefers-reduced-motion:reduce){.k9-down>*{animation:none}html.k9-shake body{animation:none}}
@media (max-width:640px){.k9-btn{min-height:36px;padding:6px 11px;font-size:11px}}
`;
document.head.append(st);

let running = false, log, list, head, bar, t0;
function panel() {
  if (log) return;
  log = document.createElement('aside'); log.className = 'k9-log'; log.setAttribute('aria-live', 'polite'); log.setAttribute('aria-label', 'Recovery log');
  head = document.createElement('header'); head.innerHTML = '<span>recovery log · <b>DEGRADED</b></span>';
  const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'Close log'); x.onclick = () => log.classList.remove('on');
  head.append(x); bar = document.createElement('div'); bar.className = 'k9-bar'; bar.append(document.createElement('i'));
  list = document.createElement('ol'); log.append(head, bar, list); document.body.append(log);
}
function line(text, cls = '') {
  const li = document.createElement('li'); const ts = document.createElement('span');
  ts.textContent = '+' + ((performance.now() - t0) / 1000).toFixed(2) + 's'; li.append(ts, text); if (cls) li.className = cls;
  list.append(li); list.scrollTop = list.scrollHeight;
}

function nodes() {
  const label = (s) => (s.id || s.getAttribute('aria-label') || s.querySelector('h2')?.textContent || 'section').toString().trim().toLowerCase().replace(/\s+/g, '-').slice(0, 14);
  return [...document.querySelectorAll('main > section')].filter((s) => !s.hidden && s.offsetHeight > 80).map((s, i) => ({ el: s, name: 'n' + (i + 1), label: label(s) }));
}

export async function kill9() {
  if (running) return; running = true;
  const btns = document.querySelectorAll('.k9-btn'); btns.forEach((b) => { b.disabled = true; });
  panel(); list.textContent = ''; t0 = performance.now(); log.classList.add('on');
  head.querySelector('b').textContent = 'DEGRADED'; head.querySelector('b').className = ''; bar.firstChild.style.width = '0';
  const all = nodes(), nav = document.querySelector('header.nav');
  // kill the leader plus a minority of replicas, never more: the cluster has to survive this
  const victims = all.filter(() => Math.random() < .5).slice(0, Math.max(1, Math.floor(all.length / 2) - 1));
  if (!victims.length && all.length) victims.push(all[0]);
  const visible = all.find((n) => { const r = n.el.getBoundingClientRect(); return r.top < innerHeight * .6 && r.bottom > innerHeight * .3; });
  if (visible && !victims.includes(visible)) victims[0] = visible;   // make sure you see one die

  line('$ kill -9 1   # pid 1 is the leader: the nav bar', 'big');
  sfx('crash'); window.__sfx?.buzz([80, 40, 120]);
  document.documentElement.classList.add('k9-shake'); setTimeout(() => document.documentElement.classList.remove('k9-shake'), 600);
  window.__fx?.chaos?.();
  if (nav) { nav.classList.add('k9-node', 'k9-down'); nav.dataset.k9 = 'LEADER LOST'; }
  line('leader n0 (nav) stopped responding · SIGKILL, no shutdown hook', 'bad');
  await sleep(500);
  for (const v of victims) {
    v.el.classList.add('k9-node', 'k9-down'); v.el.dataset.k9 = `${v.name} · ${v.label} · DOWN`;
    line(`replica ${v.name} (${v.label}) crashed`, 'bad'); sfx('note', 0); await sleep(260);
  }
  const alive = all.length - victims.length;
  line(`${alive} of ${all.length} replicas alive · quorum is ${Math.floor(all.length / 2) + 1} · ${alive > all.length / 2 ? 'still have a majority' : 'no majority'}`, 'warn');
  await sleep(900);

  const term = 7 + Math.floor(Math.random() * 5), cand = all.filter((n) => !victims.includes(n))[0];
  line(`election timeout on ${cand?.name || 'n1'} after 287 ms · becomes candidate, term ${term}`, 'warn'); sfx('note', 3);
  await sleep(700);
  line(`RequestVote(term ${term}) → granted by ${alive - 1}, self-vote 1 · ${alive}/${all.length}`); sfx('note', 5);
  await sleep(600);
  line(`${cand?.name || 'n1'} is leader for term ${term} · nav handed to the new leader`, 'ok'); sfx('elect');
  if (nav) { nav.classList.remove('k9-down'); nav.classList.add('k9-heal'); setTimeout(() => nav.classList.remove('k9-heal', 'k9-node'), 1000); }
  await sleep(700);

  let healed = alive;
  for (const v of victims) {
    line(`${v.name} restarted · replaying WAL from last checkpoint…`);
    await sleep(500);
    v.el.classList.remove('k9-down'); v.el.classList.add('k9-heal'); setTimeout(() => v.el.classList.remove('k9-heal', 'k9-node'), 1000);
    healed++; bar.firstChild.style.width = (healed / all.length * 100) + '%';
    line(`${v.name} (${v.label}) caught up · ${healed} of ${all.length} healthy`, 'ok'); sfx('commit');
    await sleep(350);
  }
  bar.firstChild.style.width = '100%';
  line('linearizability check over the incident window: ok · 0 acknowledged writes lost', 'big'); sfx('heal');
  head.querySelector('b').textContent = 'HEALTHY'; head.querySelector('b').className = 'ok';
  capture('kill9');
  btns.forEach((b) => { b.disabled = false; });
  running = false;
  setTimeout(() => { if (!running) log.classList.remove('on'); }, 9000);
}

// the button lives in the nav, next to the palette shortcut
function mount() {
  const nav = document.querySelector('header.nav .links') || document.querySelector('header.nav');
  if (!nav || document.querySelector('.k9-btn')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'k9-btn'; b.textContent = 'kill -9';
  b.title = 'Crash the website and watch it recover'; b.dataset.cursor = 'crash it';
  b.addEventListener('click', kill9); nav.append(b);
}
window.__kill9 = kill9;
mount();
