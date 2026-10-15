import * as THREE from 'three';
import { createScene } from './scene.js';
import { buildGlass } from './glass.js';
import { createLiquid } from './liquid.js';

const TILT = 0.3;       // how far each glass leans in for the toast
const FILL = 0.6;
const GRAVITY = -70;

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,.6)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// Two glasses that lean together and clink, with a spray of droplets.
export function createCheers(container) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage3d';
  container.appendChild(canvas);
  const sc = createScene(canvas, container);

  // the scene's own contact shadow sits at the centre; this stage has two glasses instead
  sc.scene.traverse(o => { if (o.isMesh && o.geometry.type === 'PlaneGeometry') o.visible = false; });

  // a fixed pair that reads bright against the dark page: sunny gold and fresh lime
  const a = '#F2A33A', b = '#B6E27A';

  const shadowMap = shadowTexture();
  function make(color) {
    const g = buildGlass('highball');
    const liq = createLiquid(g.inner, color);
    liq.setTint(1);
    g.group.add(liq.group);
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false })
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.02;
    g.group.add(sh);
    sc.scene.add(g.group);
    return { g, liq, color };
  }
  const A = make(a), B = make(b);

  const H = A.g.size.h, rt = A.g.size.w / 2;
  const x0 = rt * 0.98 + H * Math.sin(TILT);   // base offset at the moment the rims touch
  const xRest = rt * 1.35;                       // base offset when standing upright
  A.g.group.position.x = -xRest;
  B.g.group.position.x = xRest;

  function refit() {
    const cam = sc.camera, fov = cam.fov * Math.PI / 180;
    const dW = ((x0 + rt) * 2 + 8) / 2 / (Math.tan(fov / 2) * cam.aspect);
    const dH = (H + 8) / 2 / Math.tan(fov / 2);
    cam.position.set(0, H * 0.5 + 2, Math.max(dW, dH));
    cam.lookAt(0, H * 0.5, 0);
  }
  sc.onResize(refit);
  refit();

  // droplets thrown up when the glasses meet
  const drops = [];
  const dropGeo = new THREE.SphereGeometry(0.15, 8, 8);
  function burst() {
    for (let k = 0; k < 18; k++) {
      const m = new THREE.Mesh(dropGeo, new THREE.MeshStandardMaterial({ color: k % 2 ? A.color : B.color, roughness: 0.2 }));
      m.position.set(0, H * Math.cos(TILT), 0);
      sc.scene.add(m);
      const ang = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
      drops.push({
        m, vx: Math.cos(ang) * sp * 0.6, vy: 14 + Math.random() * 14, vz: Math.sin(ang) * sp * 0.4,
        life: 0, max: 0.9 + Math.random() * 0.4
      });
    }
    A.liq.ripple(0, 0, 1.1);
    B.liq.ripple(0, 0, 1.1);
    if (window.Bar && Bar.sound) Bar.sound.play('cheers');
  }

  sc.onFrame(dt => {
    A.liq.update(dt);
    B.liq.update(dt);
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.life += dt;
      d.vy += GRAVITY * dt;
      d.m.position.x += d.vx * dt;
      d.m.position.y += d.vy * dt;
      d.m.position.z += d.vz * dt;
      d.m.scale.setScalar(Math.max(0, 1 - Math.max(0, (d.life / d.max - 0.6) / 0.4)));
      if (d.life >= d.max) {
        sc.scene.remove(d.m);
        d.m.material.dispose();
        drops.splice(i, 1);
      }
    }
  });

  let tl = null;
  function clink() {
    if (tl) tl.kill();
    A.g.group.position.x = -xRest; B.g.group.position.x = xRest;
    A.g.group.rotation.z = 0; B.g.group.rotation.z = 0;
    A.liq.setLevel(FILL); B.liq.setLevel(FILL);
    tl = gsap.timeline();
    [[A, -1], [B, 1]].forEach(([s, sgn]) => {
      const p = s.g.group.position, r = s.g.group.rotation;
      tl.to(p, { x: sgn * x0, duration: 0.9, ease: 'power2.in' }, 0.4)
        .to(r, { z: sgn * TILT, duration: 0.9, ease: 'power2.in' }, 0.4)
        .to(p, { x: sgn * (x0 + 0.7), duration: 0.12, ease: 'power2.out' }, 1.3)
        .to(r, { z: sgn * (TILT - 0.08), duration: 0.12, ease: 'power2.out' }, 1.3)
        .to(p, { x: sgn * xRest, duration: 1.3, ease: 'power2.inOut' }, 1.6)
        .to(r, { z: 0, duration: 1.3, ease: 'power2.inOut' }, 1.6);
    });
    tl.add(burst, 1.3);
  }

  return {
    clink,
    dispose() {
      if (tl) tl.kill();
      sc.dispose();
      canvas.remove();
    }
  };
}
