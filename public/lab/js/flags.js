// Five hidden flags across the lab. Finding all five opens /lab/vault/.
// State lives in this browser only; it's a game, not a lock.
const KEY = 'lab-flags';
export const FLAGS = [
  { id: 'ssh', name: 'Back door', hint: 'The terminal on the home page answers to more than help. Try connecting to the lab.' },
  { id: 'kill9', name: 'Survivor', hint: 'There is a red button. Press it and stay until the cluster recovers.' },
  { id: 'core', name: 'Heartbeat', hint: 'In the 3D room, the thing in the middle wants attention. Five times.' },
  { id: 'daily', name: 'Daily driver', hint: 'Solve one daily challenge.' },
  { id: 'source', name: 'Use the source', hint: 'Somebody left a note where only view-source can see it. Submit it in the shell.' },
];
// The source flag, compared by hash so the answer isn't sitting next to the check.
const SOURCE_HASH = 'c73e461c';

function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }
export const found = () => FLAGS.filter((f) => load()[f.id]);
export const has = (id) => !!load()[id];

export function hash(str) {
  let h = 2166136261; for (const ch of str.trim().toLowerCase()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
export const checkSource = (s) => hash(s) === SOURCE_HASH;

let toastEl = null;
function toast(html) {
  if (!toastEl) {
    const st = document.createElement('style');
    st.textContent = '.flag-toast{position:fixed;left:50%;top:max(18px,env(safe-area-inset-top));z-index:200;transform:translate(-50%,-140%);display:flex;align-items:center;gap:12px;padding:12px 18px;border-radius:14px;border:1px solid #F0B556;background:rgba(14,12,6,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#F7E7C6;font:13px "JetBrains Mono",ui-monospace,monospace;box-shadow:0 0 40px rgba(240,181,86,.25);transition:transform .5s cubic-bezier(.2,.8,.2,1);max-width:calc(100vw - 24px)}'
      + '.flag-toast.on{transform:translate(-50%,0)}.flag-toast b{color:#F0B556}.flag-toast a{color:#5CE1E6;text-decoration:underline}';
    document.head.append(st);
    toastEl = document.createElement('div'); toastEl.className = 'flag-toast'; toastEl.setAttribute('role', 'status'); document.body.append(toastEl);
  }
  toastEl.innerHTML = html; toastEl.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove('on'), 5200);
}

export function capture(id) {
  const f = FLAGS.find((x) => x.id === id); if (!f) return false;
  const s = load(); if (s[id]) return false;
  s[id] = Date.now(); save(s);
  const n = found().length, base = location.pathname.includes('/lab/') ? location.pathname.slice(0, location.pathname.indexOf('/lab/') + 5) : '/lab/';
  window.__sfx?.play(n === FLAGS.length ? 'win' : 'flag'); window.__sfx?.buzz([30, 40, 30]);
  toast(`🚩 <span>flag <b>${n}/${FLAGS.length}</b> · ${f.name}</span>` + (n === FLAGS.length ? ` <a href="${base}vault/">the vault is open →</a>` : ''));
  dispatchEvent(new CustomEvent('lab-flag', { detail: { id, n } }));
  return true;
}

window.__flags = { capture, found, has, FLAGS, checkSource };
