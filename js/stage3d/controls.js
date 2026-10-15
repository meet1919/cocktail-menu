import * as THREE from 'three';

const FOV = 35 * Math.PI / 180;
const EL_MIN = 5 * Math.PI / 180, EL_MAX = 40 * Math.PI / 180;

// Orbits the camera around the glass. A drag has to start on the glass, so the
// rest of the panel still scrolls the page.
export function createControls({ camera, canvas, getHit, onNudge, onResize }) {
  const st = { az: 0.5, el: 0.35, vel: 0, radius: 30, ty: 6, tRadius: 30, tTy: 6, idle: 0 };
  let framing = { h: 14, w: 7 };
  let dragging = false, sx = 0, sy = 0, lx = 0, ly = 0, t0 = 0, tl = 0, moved = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = getHit();
    return !!hit && ray.intersectObject(hit, false).length > 0;
  }

  canvas.addEventListener('pointerdown', e => {
    if (!pick(e)) return;
    dragging = true; moved = 0;
    sx = lx = e.clientX; sy = ly = e.clientY; t0 = tl = performance.now();
    st.vel = 0; st.idle = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) { canvas.style.cursor = pick(e) ? 'grab' : ''; return; }
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    moved = Math.max(moved, Math.hypot(e.clientX - sx, e.clientY - sy));
    const now = performance.now(), dtm = Math.max(0.016, (now - tl) / 1000);
    tl = now;
    st.az -= dx * 0.008;
    st.vel = Math.max(-6, Math.min(6, -dx * 0.008 / dtm));
    st.el = Math.min(EL_MAX, Math.max(EL_MIN, st.el + dy * 0.004));
    st.idle = 0;
  });
  function end() {
    if (!dragging) return;
    dragging = false;
    if (moved < 6 && performance.now() - t0 < 250) { st.vel = 0; onNudge(); }
  }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  function refit() {
    const extentV = Math.max(framing.h / 0.72, (framing.w / 0.8) / camera.aspect);
    st.tRadius = extentV / (2 * Math.tan(FOV / 2));
    st.tTy = framing.h * 0.45;
  }
  onResize(refit);

  function update(dt) {
    if (!dragging) {
      st.az += st.vel * dt;
      st.vel *= Math.pow(0.03, dt);
      st.idle += dt;
      if (st.idle > 3 && Math.abs(st.vel) < 0.05) st.az += (0.4 * Math.PI / 180) * dt;
    }
    const k = 1 - Math.exp(-6 * dt);
    st.radius += (st.tRadius - st.radius) * k;
    st.ty += (st.tTy - st.ty) * k;
    camera.position.set(
      st.radius * Math.cos(st.el) * Math.sin(st.az),
      st.ty + st.radius * Math.sin(st.el),
      st.radius * Math.cos(st.el) * Math.cos(st.az)
    );
    camera.lookAt(0, st.ty, 0);
  }

  return {
    update,
    setFraming(height, width, instant) {
      framing = { h: height, w: width };
      refit();
      if (instant) { st.radius = st.tRadius; st.ty = st.tTy; }
    },
    get azimuth() { return st.az; }
  };
}
