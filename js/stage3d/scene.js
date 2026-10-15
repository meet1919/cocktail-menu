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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  const maxDpr = innerWidth < 768 ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, maxDpr));
  renderer.setClearColor(0x0e0c0b, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0e0c0b, 28, 62);
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

  // bar counter that fades out toward its edge, plus a soft contact shadow
  const counter = new THREE.Mesh(
    new THREE.CircleGeometry(45, 64),
    new THREE.MeshStandardMaterial({
      color: 0x17120f, roughness: 0.6, metalness: 0, envMapIntensity: 0.25
    })
  );
  counter.rotation.x = -Math.PI / 2;
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(0,0,0,.6)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  scene.add(counter, shadow);

  // out-of-focus warm lights on a ring around the glass
  const glow = radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
  const bokeh = [];
  for (let i = 0; i < 30; i++) {
    const mat = new THREE.SpriteMaterial({
      map: glow, color: new THREE.Color().setHSL(0.07 + Math.random() * 0.05, 0.9, 0.55),
      transparent: true, opacity: 0.1 + Math.random() * 0.18, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    });
    const s = new THREE.Sprite(mat);
    const a = Math.random() * Math.PI * 2, r = 42 + Math.random() * 14, sz = 4 + Math.random() * 9;
    s.position.set(Math.cos(a) * r, 4 + Math.random() * 30, Math.sin(a) * r);
    s.scale.set(sz, sz, 1);
    s.userData = { y0: s.position.y, ph: Math.random() * 6.28, sp: 0.15 + Math.random() * 0.2 };
    scene.add(s);
    bokeh.push(s);
  }

  // soft halo behind the glass, tinted with the active drink's colour
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, color: 0xe8a93b, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending,
    depthTest: false, depthWrite: false, fog: false
  }));
  halo.position.set(0, 6.5, 0);
  halo.scale.set(34, 34, 1);
  halo.renderOrder = -1;
  scene.add(halo);

  // render loop, switched off while the stage is off screen or the tab is hidden
  const noAdapt = new URLSearchParams(location.search).has('hq'); // ?hq keeps full quality for testing
  const frameCbs = [], resizeCbs = [];
  let running = false, visible = true, last = 0, elapsed = 0, ema = 16, windowT = 0;

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    elapsed += dt;
    bokeh.forEach(s => { s.position.y = s.userData.y0 + Math.sin(elapsed * s.userData.sp + s.userData.ph) * 1.5; });
    frameCbs.forEach(f => f(dt));
    renderer.render(scene, camera);
    if (!noAdapt && !quality.degraded && elapsed > 3) {
      ema = ema * 0.95 + dt * 1000 * 0.05;
      windowT += dt;
      if (windowT > 2) { if (ema > 28) degrade(); windowT = 0; }
    }
  }
  function updateRun() {
    const should = visible && !document.hidden;
    if (should && !running) { running = true; last = performance.now(); renderer.setAnimationLoop(loop); }
    else if (!should && running) { running = false; renderer.setAnimationLoop(null); }
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; updateRun(); }).observe(container);
  document.addEventListener('visibilitychange', updateRun);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    resizeCbs.forEach(f => f());
  }
  new ResizeObserver(resize).observe(container);
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
    THREE, renderer, scene, camera, key, rim, halo,
    onFrame: f => frameCbs.push(f),
    onResize: f => resizeCbs.push(f),
    degrade,
    dispose() { renderer.setAnimationLoop(null); renderer.dispose(); }
  };
}
