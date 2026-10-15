import * as THREE from 'three';
import { createScene } from './scene.js';
import { buildGlass } from './glass.js';
import { createControls } from './controls.js';

export async function createStage3D(container, drinks) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage3d';
  container.appendChild(canvas);
  const sc = createScene(canvas, container);
  const svg = document.getElementById('stage-glass');
  if (svg) svg.style.display = 'none';

  const glass = buildGlass(drinks[0].glass);
  sc.scene.add(glass.group);

  const controls = createControls({
    camera: sc.camera, canvas, getHit: () => glass.hit,
    onNudge: () => {}, onResize: sc.onResize
  });
  controls.setFraming(glass.size.h, glass.size.w, true);
  sc.onFrame(dt => controls.update(dt));

  // where the glass currently sits on screen (used by the preloader handoff)
  function glassRect() {
    const R = glass.size.w / 2, H = glass.size.h;
    const cr = canvas.getBoundingClientRect();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const x of [-R, R]) for (const y of [0, H]) for (const z of [-R, R]) {
      const p = new THREE.Vector3(x, y, z).project(sc.camera);
      const sx = cr.left + (p.x + 1) / 2 * cr.width, sy = cr.top + (1 - p.y) / 2 * cr.height;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  }

  return { kind: '3d', scene: sc, controls, glassRect, bodyCount: () => 0, dispose: () => sc.dispose() };
}
