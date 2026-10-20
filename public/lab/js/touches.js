// Small touches shared by the inner pages: a scroll progress hairline,
// magnetic buttons, a spotlight that follows the pointer across panels,
// text that scrambles into place on nav hover, and ripples on chips.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;

const st = document.createElement('style');
st.textContent = `
.t-progress{position:fixed;left:0;top:0;height:2px;width:100%;transform-origin:0 50%;transform:scaleX(0);background:linear-gradient(90deg,var(--tint,#5CE1E6),#fff);z-index:80;pointer-events:none}
.t-spot{position:relative;isolation:isolate}
.t-spot::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;opacity:0;transition:opacity .3s;background:radial-gradient(420px circle at var(--sx,50%) var(--sy,50%),color-mix(in srgb,var(--tint,#5CE1E6) 12%,transparent),transparent 60%)}
.t-spot:hover::before{opacity:1}
.t-ripple{position:absolute;border-radius:50%;transform:scale(0);background:currentColor;opacity:.25;pointer-events:none;animation:t-rip .6s ease-out forwards}
@keyframes t-rip{to{transform:scale(4);opacity:0}}
`;
document.head.append(st);

// progress hairline
const bar = document.createElement('div'); bar.className = 't-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.append(bar);
const prog = () => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; };
addEventListener('scroll', prog, { passive: true }); addEventListener('resize', prog); prog();

if (fine && !reduced) {
  // magnetic controls
  document.querySelectorAll('.chip, .pill, .acts a, .acts button, .row a.pill').forEach((b) => {
    b.style.transition = (getComputedStyle(b).transition || '') + ', transform .25s cubic-bezier(.2,.8,.2,1)';
    b.addEventListener('pointermove', (e) => { const q = b.getBoundingClientRect(); b.style.transform = `translate(${((e.clientX - q.left - q.width / 2) * .2).toFixed(1)}px, ${((e.clientY - q.top - q.height / 2) * .3).toFixed(1)}px)`; });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
  // pointer spotlight on panels
  document.querySelectorAll('.demo, .note, .round, .panel, .slot, .done').forEach((p) => {
    p.classList.add('t-spot');
    p.addEventListener('pointermove', (e) => { const q = p.getBoundingClientRect(); p.style.setProperty('--sx', (e.clientX - q.left) + 'px'); p.style.setProperty('--sy', (e.clientY - q.top) + 'px'); });
  });
  // nav links scramble into place
  const GLYPHS = '!<>-_\\/[]{}=+*^?#01';
  document.querySelectorAll('.cnav nav a, footer a').forEach((a) => {
    const text = a.textContent; let raf = 0; a.setAttribute('aria-label', text);
    a.addEventListener('pointerenter', () => {
      cancelAnimationFrame(raf); let f = 0;
      const step = () => { a.textContent = [...text].map((c, i) => (c === ' ' || i < f / 2 ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join(''); if (f++ < text.length * 2) raf = requestAnimationFrame(step); else a.textContent = text; };
      step();
    });
  });
}
// ripples, on every pointer type
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest && e.target.closest('.chip, .acts a, .acts button'); if (!b || reduced) return;
  const q = b.getBoundingClientRect(), d = Math.max(q.width, q.height), r = document.createElement('span');
  r.className = 't-ripple'; r.style.width = r.style.height = d + 'px'; r.style.left = (e.clientX - q.left - d / 2) + 'px'; r.style.top = (e.clientY - q.top - d / 2) + 'px';
  if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
  b.style.overflow = 'hidden'; b.append(r); setTimeout(() => r.remove(), 650);
});
