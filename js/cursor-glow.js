/* Cursor-following light effect — a soft glow that trails the mouse.
   The star backplate uses a slower lerp so it appears to lag behind and
   pass under the foreground glow. Pure visual; pointer-events: none. */
export function initCursorGlow() {
  const el = document.getElementById('cursor-glow');
  if (!el || !window.matchMedia?.('(pointer: fine)').matches) return;
  const lit = document.querySelector('#star-lit .inner');
  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 3;
  let x = tx;
  let y = ty;
  let lx = tx;
  let ly = ty;
  let raf = null;

  const tick = () => {
    x += (tx - x) * 0.16;
    y += (ty - y) * 0.16;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    if (lit) {
      lx += (tx - lx) * 0.085;
      ly += (ty - ly) * 0.085;
      lit.style.setProperty('--sx', `${lx.toFixed(1)}px`);
      lit.style.setProperty('--sy', `${ly.toFixed(1)}px`);
    }
    const moving = Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4 ||
      (lit && (Math.abs(tx - lx) > 0.4 || Math.abs(ty - ly) > 0.4));
    raf = moving ? requestAnimationFrame(tick) : null;
  };
  const onMove = (e) => {
    /* nothing under the splash is visible; don't animate hidden layers */
    if (document.documentElement.classList.contains('splash-pending')) return;
    tx = e.clientX;
    ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  };
  window.addEventListener('mousemove', onMove, { passive: true });
  // initial placement
  el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  if (lit) {
    lit.style.setProperty('--sx', `${lx}px`);
    lit.style.setProperty('--sy', `${ly}px`);
  }
}
