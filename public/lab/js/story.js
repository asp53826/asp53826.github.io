// Scroll direction for the home page: inertial scrolling (Lenis) on one clock
// with GSAP's ScrollTrigger, the hero's exit as the camera flies into the
// particle globe, and staggered reveals for section content. The particle
// camera itself reads scroll position in the WebGL loop (see index.html).

const G = window.gsap, ST = window.ScrollTrigger, Lenis = window.Lenis;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HH = () => (document.querySelector('header.nav') || { offsetHeight: 69 }).offsetHeight;

if (G && ST) G.registerPlugin(ST);

let lenis = null;
if (Lenis && !reduced) {
  document.documentElement.style.scrollBehavior = 'auto';
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
  window.__lenis = lenis;
  if (G && ST) {
    lenis.on('scroll', ST.update);
    G.ticker.add((time) => lenis.raf(time * 1000));
    G.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  // the command palette is a modal: freeze the page behind it
  const pal = document.getElementById('pal');
  if (pal) new MutationObserver(() => (pal.open ? lenis.stop() : lenis.start())).observe(pal, { attributes: true, attributeFilter: ['open'] });
}

window.__scrollTo = (target, opts = {}) => {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (typeof target !== 'number' && !el) return;
  if (lenis) lenis.scrollTo(typeof target === 'number' ? target : el, { offset: -HH(), duration: 1.5, ...opts });
  else if (typeof target === 'number') scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
  else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
};

// in-page anchors glide instead of jumping
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (!id || id.length < 2) return;
  const t = document.querySelector(id);
  if (!t) return;
  e.preventDefault();
  window.__scrollTo(t);
  history.replaceState(null, '', id);
});

if (G && ST && !reduced) {
  // the hero dissolves as the camera dives into the globe behind it
  G.to('.hero-copy', {
    yPercent: -22, opacity: 0, filter: 'blur(12px)', ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 10%', scrub: true },
  });
  // the marquee band arrives with a slight lean, then settles
  G.from('.viz', {
    clipPath: 'inset(18% 0 18% 0)', ease: 'none',
    scrollTrigger: { trigger: '.viz', start: 'top bottom', end: 'top 45%', scrub: true },
  });
  // counters, steps and timeline entries rise in sequence instead of all at once
  ST.batch('.steps li, .arc-book li', {
    start: 'top 88%',
    onEnter: (els) => G.fromTo(els, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'expo.out', stagger: .08, overwrite: true }),
    once: true,
  });
  // the bench readout scrubs a slow parallax against its panel
  G.to('#bench .bench-box', { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '#bench', start: 'top bottom', end: 'bottom top', scrub: true } });
}

// layout settles after fonts and the pinned sections measure themselves
if (ST) {
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => ST.refresh());
  addEventListener('load', () => ST.refresh());
}
