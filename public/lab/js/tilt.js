// Phone tilt: a smoothed {x, y} in -1..1 from the device's orientation, shared
// by the particle sphere and the 3D room. iOS asks for permission, so a small
// "tilt" button appears on touch devices that need it; others just start.
const T = { x: 0, y: 0, on: false };
window.__tilt = T;
const touch = matchMedia('(pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let base = null, tx = 0, ty = 0;

function onOrient(e) {
  if (e.beta == null || e.gamma == null) return;
  if (!base) base = { b: e.beta, g: e.gamma };   // whatever angle you hold it at is "level"
  tx = Math.max(-1, Math.min(1, (e.gamma - base.g) / 30));
  ty = Math.max(-1, Math.min(1, (e.beta - base.b) / 30));
  T.on = true;
}
(function smooth() { requestAnimationFrame(smooth); T.x += (tx - T.x) * .08; T.y += (ty - T.y) * .08; })();
function start() { addEventListener('deviceorientation', onOrient); base = null; }

if (touch && !reduced && 'DeviceOrientationEvent' in window) {
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    const st = document.createElement('style');
    st.textContent = '.tilt-btn{position:fixed;left:max(64px,calc(env(safe-area-inset-left) + 64px));bottom:max(14px,env(safe-area-inset-bottom));z-index:70;min-height:40px;padding:8px 14px;border-radius:999px;border:1px solid #3A443E;background:rgba(8,10,12,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#BDC5BF;font:12px "JetBrains Mono",ui-monospace,monospace}';
    document.head.append(st);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tilt-btn'; b.textContent = '📱 tilt';
    b.onclick = async () => { try { if (await DeviceOrientationEvent.requestPermission() === 'granted') { start(); b.remove(); } else b.textContent = 'tilt blocked'; } catch (e) { b.remove(); } };
    document.body.append(b);
  } else start();
}
export default T;
