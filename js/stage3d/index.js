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

  return { kind: '3d', scene: sc, controls, director, bodyCount: physics.count, dispose: () => { sc.dispose(); canvas.remove(); } };
}
