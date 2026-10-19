// Shipping log: renders data/live.json, a snapshot written at build time by
// scripts/lab-live.mjs. If the snapshot is missing the section stays hidden.
const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  const d = Math.round(s / 86400); return d === 1 ? 'yesterday' : d + ' days ago';
}

let data;
try {
  const res = await fetch('data/live.json', { cache: 'no-cache' });
  if (res.ok) data = await res.json();
} catch (e) { /* no snapshot: leave the section hidden */ }

if (data && data.days?.length) {
  const total = data.days.reduce((a, [, n]) => a + n, 0), active = data.days.filter(([, n]) => n).length;
  const last = data.recent?.[0];
  $('#shipAgo').textContent = (last ? ago(last.at) : 'recently') + '.';
  $('#shipGen').textContent = 'snapshot ' + ago(data.generated);

  const stats = $('#shipStats');
  for (const [k, v] of [['commits, 26 weeks', total], ['days with a commit', active], ['repos pushed', data.repos.length]]) {
    const d = el('div'); d.append(el('dt', '', k), el('dd', '', v.toLocaleString('en-US'))); stats.append(d);
  }

  // heatmap: one column per week, Sunday on top, like GitHub's
  const heat = $('#heat'), max = Math.max(1, ...data.days.map(([, n]) => n));
  const lead = new Date(data.days[0][0] + 'T00:00:00Z').getUTCDay();
  for (let i = 0; i < lead; i++) heat.append(el('i', 'pad'));
  for (const [d, n] of data.days) {
    const c = el('i'); c.dataset.l = n ? String(Math.min(4, Math.ceil((n / max) * 4))) : '0';
    c.title = `${n} commit${n === 1 ? '' : 's'} on ${d}`; heat.append(c);
  }
  heat.setAttribute('aria-label', `${total} commits on ${active} days over the last 26 weeks`);

  const list = $('#commits');
  for (const c of (data.recent || []).slice(0, 6)) {
    const li = el('li'), a = el('a'); a.href = c.url;
    a.append(el('code', '', c.sha), el('span', '', c.msg), el('small', '', c.repo + ' · ' + ago(c.at)));
    li.append(a); list.append(li);
  }

  const ci = $('#ci');
  for (const r of data.repos.slice(0, 8)) {
    const li = el('li'), a = el('a'); a.href = r.ci?.url || r.url;
    const state = !r.ci ? ['none', 'no CI'] : r.ci.status !== 'completed' ? ['wip', 'running'] : r.ci.conclusion === 'success' ? ['ok', 'passing'] : ['bad', r.ci.conclusion || 'failed'];
    const name = el('span'); name.append(r.name, el('small', '', '  ' + ago(r.pushed_at))); name.lastChild.style.color = 'var(--dim)';
    a.append(name, el('b', state[0], state[1])); li.append(a); ci.append(li);
  }

  $('#ship').hidden = false;
  window.ScrollTrigger?.refresh();
}
