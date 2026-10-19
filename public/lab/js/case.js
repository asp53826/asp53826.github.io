// Shared motion for case pages: inertial scrolling, staggered reveals as
// sections arrive, and numbers that roll up when their stats come into view.
// Content is visible without any of this; it only animates from a visible state.

const G = window.gsap, ST = window.ScrollTrigger, Lenis = window.Lenis;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (G && ST) G.registerPlugin(ST);
if (Lenis && !reduced) {
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  window.__lenis = lenis;
  if (G && ST) { lenis.on('scroll', ST.update); G.ticker.add((t) => lenis.raf(t * 1000)); G.ticker.lagSmoothing(0); }
  else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
}

if (G && ST && !reduced) {
  // hero pieces arrive in sequence (the title itself morphs in via the view transition)
  G.from('.chero .eyebrow, .chero .thesis, .cstats div', { y: 26, opacity: 0, duration: 1, ease: 'expo.out', stagger: .07, delay: .15 });
  ST.batch('.reveal', {
    start: 'top 86%', once: true,
    onEnter: (els) => G.fromTo(els, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: .09, overwrite: true }),
  });
  // stats roll up from zero, keeping their own formatting
  document.querySelectorAll('.cstats dd[data-n]').forEach((dd) => {
    const target = parseFloat(dd.dataset.n), dec = (dd.dataset.n.split('.')[1] || '').length, pre = dd.dataset.pre || '', suf = dd.dataset.suf || '';
    const o = { v: 0 };
    G.to(o, { v: target, duration: 1.6, ease: 'power3.out', delay: .35, onUpdate: () => { dd.textContent = pre + o.v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; } });
  });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => ST.refresh());
}
