// Live visitors: other people's cursors on the page you're on, plus a count of
// everyone on the lab right now. Rides the same relay as Order Book Royale.
// Off unless data/relay.json names a relay (set at build time from the
// LAB_RELAY_URL repository variable), so a plain deploy opens no sockets.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const ROOT = location.pathname.includes('/lab/') ? location.pathname.slice(0, location.pathname.indexOf('/lab/') + 5) : '/lab/';
const PAGE = location.pathname.replace(ROOT, '') || 'index.html';
const NAMES = ['otter', 'heron', 'lynx', 'koi', 'wren', 'yak', 'gecko', 'ibis', 'puffin', 'marten', 'newt', 'orca'];
const COLORS = ['#5CE1E6', '#B9A6FF', '#8BE59A', '#F0B556', '#FF8A7A', '#7CC8FF'];
const hashOf = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };

let url = '';
try { const r = await fetch(ROOT + 'data/relay.json', { cache: 'no-cache' }); if (r.ok) url = ((await r.json()).url || '').trim(); } catch (e) { /* no relay */ }

if (/^wss?:\/\//.test(url) && 'WebSocket' in window) {
  let id = ''; try { id = sessionStorage.getItem('lab:peer') || ''; } catch (e) { /* private mode */ }
  if (!/^[a-z0-9]{6,24}$/.test(id)) { id = 'v' + Math.random().toString(36).slice(2, 12).replace(/[^a-z0-9]/g, '0').padEnd(10, '0'); try { sessionStorage.setItem('lab:peer', id); } catch (e) { /* fine */ } }

  const st = document.createElement('style');
  st.textContent = `
.pr-layer{position:fixed;inset:0;pointer-events:none;z-index:150;overflow:hidden}
.pr-cur{position:absolute;left:0;top:0;transition:transform .12s linear,opacity .4s;will-change:transform}
.pr-cur svg{width:18px;height:18px;filter:drop-shadow(0 0 6px var(--c))}
.pr-cur span{position:absolute;left:14px;top:16px;padding:2px 8px;border-radius:999px;background:var(--c);color:#05070a;font:600 11px "JetBrains Mono",ui-monospace,monospace;white-space:nowrap}
.pr-count{position:fixed;left:max(14px,env(safe-area-inset-left));bottom:max(62px,calc(env(safe-area-inset-bottom) + 62px));z-index:70;display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;border:1px solid #3A443E;background:rgba(8,10,12,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#BDC5BF;font:12px "JetBrains Mono",ui-monospace,monospace}
.pr-count i{width:8px;height:8px;border-radius:50%;background:#8BE59A;box-shadow:0 0 8px #8BE59A;animation:prp 1.6s infinite}
@keyframes prp{50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.pr-cur{transition:none}.pr-count i{animation:none}}`;
  document.head.append(st);
  const layer = document.createElement('div'); layer.className = 'pr-layer'; layer.setAttribute('aria-hidden', 'true'); document.body.append(layer);
  const count = document.createElement('div'); count.className = 'pr-count'; count.setAttribute('role', 'status'); count.hidden = true; document.body.append(count);
  const cursors = new Map();   // peer -> {el, p, seen}

  function render() {
    let here = 0;
    for (const [peer, c] of cursors) {
      const p = c.p || {};
      if (p.page !== PAGE || p.x == null || Date.now() - c.seen > 15000) { if (c.el) c.el.style.opacity = '0'; continue; }
      here++;
      if (!c.el) {
        const h = hashOf(peer), col = COLORS[h % COLORS.length];
        c.el = document.createElement('div'); c.el.className = 'pr-cur'; c.el.style.setProperty('--c', col);
        c.el.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="' + col + '" stroke="#05070a" stroke-width="1.2"/></svg><span></span>';
        c.el.querySelector('span').textContent = NAMES[(h >>> 4) % NAMES.length];
        layer.append(c.el);
      }
      const x = p.x * innerWidth, y = p.y * document.documentElement.scrollHeight - scrollY;
      c.el.style.opacity = y < -30 || y > innerHeight + 30 ? '0' : '1';
      c.el.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
    }
    const total = cursors.size + 1;
    count.hidden = total < 2;
    count.innerHTML = '<i></i>'; count.append(total + ' on the lab' + (here ? ` · ${here + 1} on this page` : ''));
  }
  addEventListener('scroll', render, { passive: true });

  let ws = null, open = false, retry = 0, mine = { page: PAGE, x: null, y: null };
  function send(m) { if (open) try { ws.send(JSON.stringify(m)); } catch (e) { /* reconnecting */ } }
  function connect() {
    try { ws = new WebSocket(url.replace(/\/+$/, '') + '/room/lab-presence?peer=' + id); } catch (e) { return; }
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string' || e.data === 'pong') return;
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.t === 'hello') { open = true; retry = 0; id = m.me; cursors.clear(); layer.textContent = ''; for (const x of m.peers || []) if (x.peer !== id) cursors.set(x.peer, { p: x.p, seen: Date.now() }); send({ t: 'p', p: mine }); }
      else if (m.t === 'p' && m.peer !== id) { const c = cursors.get(m.peer) || {}; c.p = m.p; c.seen = Date.now(); cursors.set(m.peer, c); }
      else if (m.t === 'bye') { cursors.get(m.peer)?.el?.remove(); cursors.delete(m.peer); }
      render();
    };
    ws.onclose = () => { open = false; cursors.clear(); layer.textContent = ''; render(); setTimeout(connect, Math.min(15000, 800 * 2 ** retry++)); };
  }
  connect();
  setInterval(() => { if (open) try { ws.send('ping'); } catch (e) { /* fine */ } }, 20000);
  setInterval(render, 5000);

  // share my cursor (desktop only), at most ~12 updates a second
  if (fine && !reduced) {
    let pending = false;
    addEventListener('pointermove', (e) => {
      mine = { page: PAGE, x: +(e.clientX / innerWidth).toFixed(4), y: +((e.clientY + scrollY) / document.documentElement.scrollHeight).toFixed(4) };
      if (pending) return; pending = true; setTimeout(() => { pending = false; send({ t: 'p', p: mine }); }, 80);
    }, { passive: true });
    document.addEventListener('mouseleave', () => { mine = { page: PAGE, x: null, y: null }; send({ t: 'p', p: mine }); });
  }
  addEventListener('pagehide', () => { try { ws && ws.close(1000); } catch (e) { /* fine */ } });
}
