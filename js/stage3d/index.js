import * as THREE from 'three';
import { createScene } from './scene.js';
import { createControls } from './controls.js';
import { createPhysics } from './physics.js';
import { createDirector } from './director.js';

// `embedded` is for a small extra stage (the browse detail sheet): it must leave the
// page's own SVG glass alone.
export async function createStage3D(container, drinks, { embedded = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage3d';
  container.appendChild(canvas);
  const sc = createScene(canvas, container);
  const svg = document.getElementById('stage-glass');
  if (svg && !embedded) svg.style.display = 'none';

  let director = null;
  const physics = createPhysics({ onSplash: (x, z, s) => director && director.rippleActive(x, z, s) });
  const controls = createControls({
    camera: sc.camera, canvas,
    getHit: () => director && director.activeGlass().hit,
    onNudge: () => director && director.nudge(),
    onResize: sc.onResize
  });
  director = createDirector({ THREE, scene: sc.scene, key: sc.key, physics, controls, drinks });
  director.setActive(0, true);

  sc.onFrame(dt => {
    controls.update(dt);
    physics.step(dt, director.surfaceY());
    director.tick(dt);
  });

  // where the glass currently sits on screen (used by the preloader handoff)
  function glassRect() {
    const g = director.activeGlass();
    const R = g.size.w / 2, H = g.size.h;
    const cr = canvas.getBoundingClientRect();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const x of [-R, R]) for (const y of [0, H]) for (const z of [-R, R]) {
      const p = new THREE.Vector3(x, y, z).project(sc.camera);
      const sx = cr.left + (p.x + 1) / 2 * cr.width, sy = cr.top + (1 - p.y) / 2 * cr.height;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  }

  return { kind: '3d', scene: sc, controls, director, glassRect, bodyCount: physics.count, dispose: () => { sc.dispose(); canvas.remove(); } };
}
