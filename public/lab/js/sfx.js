// Opt-in sound effects for the lab. Off by default; one tap on the speaker
// button turns them on and the choice sticks. Everything is synthesized with
// Web Audio, so there are no files to load. Other scripts call
// window.__sfx.play('elect') and the call is a no-op while sound is off.
const KEY = 'lab-sfx';
let on = false, ctx = null, out = null, noiseBuf = null, btn = null;
try { on = localStorage.getItem(KEY) === '1'; } catch (e) { /* private mode */ }

function boot() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); out = ctx.createGain(); out.gain.value = .5;
  const comp = ctx.createDynamicsCompressor(); out.connect(comp); comp.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}
function tone(hz, t, { type = 'sine', dur = .18, peak = .22, glide = 0, delay = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain(), s = t + delay;
  o.type = type; o.frequency.setValueAtTime(hz, s); if (glide) o.frequency.exponentialRampToValueAtTime(glide, s + dur);
  g.gain.setValueAtTime(.0001, s); g.gain.exponentialRampToValueAtTime(peak, s + .008); g.gain.exponentialRampToValueAtTime(.0001, s + dur);
  o.connect(g); g.connect(out); o.start(s); o.stop(s + dur + .02);
}
function hiss(t, { freq = 2000, type = 'bandpass', dur = .2, peak = .3, delay = 0 } = {}) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), st = t + delay;
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(.0001, st); g.gain.exponentialRampToValueAtTime(peak, st + .004); g.gain.exponentialRampToValueAtTime(.0001, st + dur);
  s.connect(f); f.connect(g); g.connect(out); s.start(st); s.stop(st + dur + .02);
}

// A minor pentatonic so anything that fires together still sounds intended.
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];
const SOUNDS = {
  blip: (t) => tone(880, t, { type: 'triangle', dur: .06, peak: .12 }),
  tick: (t) => hiss(t, { freq: 6000, type: 'highpass', dur: .03, peak: .12 }),
  note: (t, i = 0) => tone(SCALE[((i % SCALE.length) + SCALE.length) % SCALE.length], t, { type: 'triangle', dur: .22, peak: .16 }),
  elect: (t) => [0, 2, 4, 6].forEach((k, i) => tone(SCALE[k], t, { type: 'triangle', dur: .25, peak: .16, delay: i * .07 })),
  commit: (t) => { tone(SCALE[5], t, { dur: .3, peak: .12 }); tone(SCALE[7], t, { dur: .3, peak: .08, delay: .02 }); },
  crash: (t) => { hiss(t, { freq: 900, type: 'lowpass', dur: .45, peak: .5 }); tone(110, t, { type: 'sawtooth', dur: .4, peak: .25, glide: 38 }); },
  heal: (t) => { tone(220, t, { type: 'sine', dur: .7, peak: .16, glide: 660 }); tone(330, t, { type: 'triangle', dur: .7, peak: .08, glide: 990, delay: .05 }); },
  error: (t) => { tone(196, t, { type: 'square', dur: .12, peak: .08 }); tone(185, t, { type: 'square', dur: .18, peak: .08, delay: .12 }); },
  flag: (t) => [0, 4, 7, 9].forEach((k, i) => tone(SCALE[k] * 2, t, { type: 'square', dur: .16, peak: .07, delay: i * .09 })),
  win: (t) => [0, 2, 4, 7, 9].forEach((k, i) => tone(SCALE[k] * 2, t, { type: 'triangle', dur: .35, peak: .14, delay: i * .1 })),
};

function play(name, arg) {
  if (!on || !SOUNDS[name]) return;
  if (!boot()) return;
  if (ctx.state === 'suspended') ctx.resume();
  try { SOUNDS[name](ctx.currentTime + .01, arg); } catch (e) { /* audio hiccup, ignore */ }
}
function buzz(pattern) { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(pattern); } catch (e) { /* unsupported */ } }

function set(v) {
  on = v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* fine */ }
  if (on) { boot(); ctx && ctx.resume(); play('heal'); }
  if (btn) { btn.setAttribute('aria-pressed', String(on)); btn.querySelector('span').textContent = on ? 'sound on' : 'sound off'; }
  dispatchEvent(new CustomEvent('lab-sfx', { detail: on }));
}

function ui() {
  if (document.querySelector('.sfx-btn') || document.documentElement.dataset.noSfxUi != null) return;
  const st = document.createElement('style');
  st.textContent = '.sfx-btn{position:fixed;left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));z-index:70;display:flex;align-items:center;gap:8px;min-height:40px;padding:8px 14px;border-radius:999px;border:1px solid #3A443E;background:rgba(8,10,12,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#BDC5BF;font:12px "JetBrains Mono",ui-monospace,monospace;cursor:pointer}'
    + '.sfx-btn:hover{color:#E9ECE8;border-color:#8E978F}.sfx-btn svg{width:16px;height:16px}.sfx-btn[aria-pressed="true"]{color:#05070A;background:#5CE1E6;border-color:#5CE1E6}'
    + '.sfx-btn .w{opacity:0}.sfx-btn[aria-pressed="true"] .w{opacity:1}.sfx-btn[aria-pressed="true"] .x{opacity:0}'
    + '@media (max-width:640px){.sfx-btn span{display:none}.sfx-btn{padding:8px 11px}}';
  document.head.append(st);
  btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sfx-btn'; btn.setAttribute('aria-pressed', String(on));
  btn.setAttribute('aria-label', 'Sound effects');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path class="w" d="M15.5 8.5a5 5 0 0 1 0 7"/><path class="w" d="M19 5a10 10 0 0 1 0 14"/><path class="x" d="m22 9-6 6M16 9l6 6"/></svg><span></span>';
  btn.querySelector('span').textContent = on ? 'sound on' : 'sound off';
  btn.addEventListener('click', () => set(!on));
  document.body.append(btn);
}
// Browsers only start audio after a gesture; resume on the first one if sound was left on.
addEventListener('pointerdown', () => { if (on) { boot(); ctx && ctx.state === 'suspended' && ctx.resume(); } }, { once: true, capture: true });

window.__sfx = { play, buzz, set, get on() { return on; } };
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', ui); else ui();
export default window.__sfx;
