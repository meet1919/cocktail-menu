import { createScene } from './scene.js';

export async function createStage3D(container, drinks) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage3d';
  container.appendChild(canvas);
  const sc = createScene(canvas, container);
  sc.camera.position.set(0, 8, 30);
  sc.camera.lookAt(0, 6, 0);
  const svg = document.getElementById('stage-glass');
  if (svg) svg.style.display = 'none';

  return {
    kind: '3d',
    scene: sc,
    glassRect() {
      const r = canvas.getBoundingClientRect();
      return { left: r.left + r.width * 0.3, top: r.top + r.height * 0.14, width: r.width * 0.4, height: r.height * 0.72 };
    },
    bodyCount: () => 0,
    dispose: () => sc.dispose()
  };
}
