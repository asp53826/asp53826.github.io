// Draws a FAULTLINE snapshot: five nodes, their roles and terms, every log
// entry (committed entries solid, uncommitted ones outlined in amber), and the
// links a partition cuts. It never draws a message the engine did not send:
// state changes are shown as a pulse on the node that changed.

const ROLE_COL = { leader: null, candidate: '#B9A6FF', follower: '#BDC5BF' };

export function createClusterView(canvas, { onSelect } = {}) {
  const ctx = canvas.getContext('2d');
  let state = null, sel = 1, visible = true;
  const pulses = [];
  const css = () => getComputedStyle(document.documentElement);
  const accent = () => (css().getPropertyValue('--accent') || '#8BE59A').trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const R = Math.min(w * .34, h * .34), cx = w / 2, cy = h / 2 - 10;
    return { w, h, pos: (i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R * .92]; } };
  }

  function update(next) {
    if (state) {
      next.nodes.forEach((n, i) => {
        const o = state.nodes[i];
        if (!o || o.role !== n.role || o.term !== n.term || o.commit !== n.commit || o.lastIndex !== n.lastIndex) pulses.push({ i, t0: performance.now(), kind: o && o.role !== n.role ? 'role' : 'log' });
      });
      if (next.isolated !== state.isolated) pulses.push({ i: Math.max(0, (next.isolated || state.isolated) - 1), t0: performance.now(), kind: 'cut' });
    }
    state = next;
  }

  function select(id) { sel = id; }

  canvas.addEventListener('click', (e) => {
    if (!state) return;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, L = layout();
    let best = -1, bd = 1e9;
    for (let i = 0; i < 5; i++) { const [px, py] = L.pos(i), d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = i; } }
    if (best >= 0 && bd < 60) { sel = best + 1; if (onSelect) onSelect(sel); }
  });
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(canvas);

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden || !state) return;
    const L = layout(); if (!L.w) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (canvas.width !== Math.round(L.w * dpr) || canvas.height !== Math.round(L.h * dpr)) { canvas.width = Math.round(L.w * dpr); canvas.height = Math.round(L.h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, L.w, L.h);
    const A = accent(), iso = state.isolated, now = performance.now();
    const leaderTerm = Math.max(0, ...state.nodes.filter((n) => n.role === 'leader' && n.id !== iso).map((n) => n.term));

    // links
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
      const [x1, y1] = L.pos(i), [x2, y2] = L.pos(j), a = state.nodes[i], b = state.nodes[j];
      const cut = iso && (a.id === iso || b.id === iso);
      ctx.lineWidth = 1;
      if (cut) {
        ctx.strokeStyle = 'rgba(240,181,86,.55)'; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; ctx.strokeStyle = '#F0B556'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(mx - 4, my - 4); ctx.lineTo(mx + 4, my + 4); ctx.moveTo(mx + 4, my - 4); ctx.lineTo(mx - 4, my + 4); ctx.stroke();
      } else {
        const lead = (a.role === 'leader' && a.term === leaderTerm) || (b.role === 'leader' && b.term === leaderTerm);
        ctx.strokeStyle = lead ? hexA(A, .38) : 'rgba(255,255,255,.07)';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
    }

    // partition halo
    if (iso) {
      const [x, y] = L.pos(iso - 1);
      ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(240,181,86,.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 52, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#F0B556'; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText('partitioned', x + 58, y - 18);
    }

    // pulses on change
    for (let k = pulses.length - 1; k >= 0; k--) {
      const p = pulses[k], age = (now - p.t0) / 900;
      if (age > 1 || reduced) { pulses.splice(k, 1); continue; }
      const [x, y] = L.pos(p.i);
      ctx.strokeStyle = p.kind === 'cut' ? 'rgba(240,181,86,' + (1 - age) + ')' : hexA(A, 1 - age);
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 30 + age * 34, 0, 7); ctx.stroke();
    }

    // nodes
    ctx.textAlign = 'center';
    state.nodes.forEach((n, i) => {
      const [x, y] = L.pos(i), R = 27, lead = n.role === 'leader';
      if (lead) { const ph = reduced ? .3 : (ts % 1600) / 1600; ctx.strokeStyle = hexA(A, (1 - ph) * .6); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, R + 4 + ph * 14, 0, 7); ctx.stroke(); }
      ctx.lineWidth = 2;
      ctx.fillStyle = lead ? A : n.role === 'candidate' ? '#221c38' : '#0c110f';
      ctx.strokeStyle = lead ? A : ROLE_COL[n.role] || '#BDC5BF';
      if (lead) { ctx.shadowColor = A; ctx.shadowBlur = 18; }
      ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      if (n.id === sel) { ctx.setLineDash([2, 4]); ctx.strokeStyle = 'rgba(233,236,232,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, R + 9, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = lead ? '#05070a' : '#E9ECE8'; ctx.font = '700 14px "JetBrains Mono", monospace'; ctx.fillText('n' + n.id, x, y + 5);
      ctx.font = '11px "JetBrains Mono", monospace'; ctx.fillStyle = lead ? A : n.role === 'candidate' ? '#B9A6FF' : '#A3ACA6';
      ctx.fillText(n.role + ' · t' + n.term, x, y + R + 17);
      // the log: one cell per entry, committed solid, uncommitted amber outline
      const cells = Math.max(1, n.lastIndex), cw = 9, gap = 3, total = cells * cw + (cells - 1) * gap;
      let cx = x - total / 2; const cy = y + R + 25;
      if (!n.lastIndex) { ctx.fillStyle = '#8E978F'; ctx.fillText('empty log', x, cy + 8); }
      else for (let e = 1; e <= n.lastIndex; e++) {
        if (e <= n.commit) { ctx.fillStyle = e === n.commit && lead ? A : '#C9D2CB'; ctx.fillRect(cx, cy, cw, cw); }
        else { ctx.strokeStyle = '#F0B556'; ctx.lineWidth = 1.4; ctx.strokeRect(cx + .7, cy + .7, cw - 1.4, cw - 1.4); }
        cx += cw + gap;
      }
    });

    // legend
    ctx.textAlign = 'left'; ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#C9D2CB'; ctx.fillRect(10, L.h - 34, 8, 8); ctx.fillStyle = '#8E978F'; ctx.fillText('committed entry', 24, L.h - 26);
    ctx.strokeStyle = '#F0B556'; ctx.lineWidth = 1.4; ctx.strokeRect(10.7, L.h - 17.3, 6.6, 6.6); ctx.fillStyle = '#8E978F'; ctx.fillText('appended, not committed', 24, L.h - 10);
  }
  requestAnimationFrame(frame);
  return { update, select, get selected() { return sel; } };
}

function hexA(hex, a) {
  const h = hex.replace('#', ''); const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
}
