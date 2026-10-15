import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { quality } from './quality.js';

function radialTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function createScene(canvas, container) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const maxDpr = innerWidth < 768 ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, maxDpr));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;

  const camera = new THREE.PerspectiveCamera(35, 1, 1, 300);

  const key = new THREE.SpotLight(0xffffff, 450, 90, 0.55, 0.7, 2);
  key.position.set(14, 26, 16);
  key.target.position.set(0, 6, 0);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6);
  rim.position.set(-10, 12, -14);
  scene.add(key, key.target, rim, new THREE.AmbientLight(0xffffff, 0.08));

  // soft contact shadow under the glass (the page itself shows through everywhere else)
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(0,0,0,.6)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  scene.add(shadow);

  // render loop, switched off while the stage is off screen or the tab is hidden
  const noAdapt = new URLSearchParams(location.search).has('hq'); // ?hq keeps full quality for testing
  const frameCbs = [], resizeCbs = [];
  let running = false, visible = true, paused = false, disposed = false, last = 0, elapsed = 0, ema = 16, windowT = 0;

  function loop(now) {
    const raw = (now - last) / 1000 || 0.016;
    const dt = Math.min(0.05, raw);
    last = now;
    elapsed += dt;
    frameCbs.forEach(f => f(dt));
    renderer.render(scene, camera);
    if (!noAdapt && !quality.degraded && elapsed > 3) {
      // gaps over 250 ms mean the browser throttled or paused us, not that rendering is slow
      if (raw < 0.25) ema = ema * 0.95 + raw * 1000 * 0.05;
      windowT += dt;
      if (windowT > 2) { if (ema > 28) degrade(); windowT = 0; }
    }
  }
  function updateRun() {
    if (disposed) return;
    const should = visible && !paused && !document.hidden;
    if (should && !running) { running = true; last = performance.now(); renderer.setAnimationLoop(loop); }
    else if (!should && running) { running = false; renderer.setAnimationLoop(null); }
  }
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; updateRun(); });
  io.observe(container);
  document.addEventListener('visibilitychange', updateRun);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    resizeCbs.forEach(f => f());
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  updateRun();

  function degrade() {
    if (quality.degraded) return;
    quality.degraded = true;
    renderer.setPixelRatio(1);
    resize();
    scene.traverse(o => {
      [].concat(o.material || []).forEach(m => {
        if (m.transmission > 0) { m.transmission = 0; m.transparent = true; m.opacity = Math.min(m.opacity, 0.3); m.needsUpdate = true; }
      });
    });
  }

  return {
    THREE, renderer, scene, camera, key, rim,
    onFrame: f => frameCbs.push(f),
    onResize: f => resizeCbs.push(f),
    degrade,
    // stop rendering while something else (the browse view) covers the stage
    setPaused(on) { paused = !!on; updateRun(); },
    dispose() {
      disposed = true;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', updateRun);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };
}
