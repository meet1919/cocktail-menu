import { leafGeometry } from './pieces.js';

// A few mint leaves drifting slowly around the glass, for atmosphere.
export function createAmbientLeaves(THREE, scene, onFrame) {
  const geo = leafGeometry();
  const leaves = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0x4fae5a, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.85
    }));
    const a = (i / 6) * Math.PI * 2 + Math.random(), r = 16 + Math.random() * 10;
    m.userData = { a, r, y0: 8 + Math.random() * 14, ph: Math.random() * 6.28, sp: 0.1 + Math.random() * 0.12 };
    m.scale.setScalar(1.6 + Math.random() * 0.8);
    scene.add(m);
    leaves.push(m);
  }
  let t = 0;
  onFrame(dt => {
    t += dt;
    leaves.forEach(m => {
      const u = m.userData, a = u.a + t * u.sp * 0.2;
      m.position.set(Math.cos(a) * u.r, u.y0 + Math.sin(t * u.sp * 3 + u.ph) * 1.2, Math.sin(a) * u.r);
      m.rotation.set(Math.sin(t * u.sp * 2 + u.ph) * 0.8, t * u.sp * 2, Math.cos(t * u.sp * 2 + u.ph) * 0.8);
    });
  });
}
