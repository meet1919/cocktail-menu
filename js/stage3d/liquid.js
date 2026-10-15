import * as THREE from 'three';

const MAX_RIPPLES = 6;

// A fake-but-convincing liquid: a tinted volume clipped at the current level, a
// rippling surface, an optional foam layer and rising bubbles.
export function createLiquid(inner, colorHex) {
  const full = new THREE.Color(colorHex);
  const pale = full.clone().lerp(new THREE.Color(0xffffff), 0.55);
  const group = new THREE.Group();
  const span = inner.topY - inner.baseY;
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), inner.baseY);

  // volume: the inner profile, cut off by a clipping plane at the liquid level
  const pts = [new THREE.Vector2(0, inner.baseY)];
  for (let i = 0; i <= 24; i++) {
    const y = inner.baseY + span * i / 24;
    pts.push(new THREE.Vector2(inner.radiusAt(y) * 0.97, y));
  }
  const mat = new THREE.MeshPhysicalMaterial({
    color: pale.clone(), roughness: 0.05, transparent: true, opacity: 0.82,
    side: THREE.DoubleSide, clippingPlanes: [plane], envMapIntensity: 0.9
  });
  group.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mat));

  // surface: concentric rings so ripples can displace it
  const sGeo = new THREE.RingGeometry(0.001, 1, 48, 12);
  sGeo.rotateX(-Math.PI / 2);
  const base = Float32Array.from(sGeo.attributes.position.array);
  const surface = new THREE.Mesh(sGeo, new THREE.MeshPhysicalMaterial({
    color: pale.clone(), roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.88, side: THREE.DoubleSide
  }));
  surface.visible = false;
  group.add(surface);

  // foam layer
  const foam = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.5, 48),
    new THREE.MeshStandardMaterial({ color: 0xf6f1e1, roughness: 0.9 })
  );
  foam.scale.y = 0; foam.visible = false;
  group.add(foam);

  // bubbles
  const COUNT = 40;
  const bubbles = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
    COUNT
  );
  const bs = Array.from({ length: COUNT }, () => ({ a: Math.random() * 6.28, r: Math.random(), y: Math.random() * span, v: 2 + Math.random() * 3 }));
  bubbles.visible = false;
  group.add(bubbles);
  let bubblesOn = false;

  const ripples = [];
  const st = { level: 0, vel: 0, target: 0 };
  const dummy = new THREE.Object3D();

  const surfaceY = () => inner.baseY + st.level * span;

  function setLevel(f) { st.target = f; }
  function setTint(t) {
    mat.color.copy(pale).lerp(full, Math.min(1, Math.max(0, t)));
    surface.material.color.copy(mat.color);
  }
  function ripple(x, z, strength) {
    ripples.push({ x, z, a: strength, age: 0 });
    if (ripples.length > MAX_RIPPLES) ripples.shift();
  }

  function update(dt) {
    // critically damped spring toward the target level
    const w = 6;
    st.vel += (w * w * (st.target - st.level) - 2 * w * st.vel) * dt;
    st.level += st.vel * dt;
    const y = surfaceY();
    plane.constant = y;
    const R = Math.max(0.01, inner.radiusAt(Math.max(y, inner.baseY + 0.01)) * 0.97);
    surface.position.y = y;
    surface.scale.set(R, 1, R);
    surface.visible = st.level > 0.004;
    foam.position.y = y + 0.25;
    foam.scale.x = foam.scale.z = R * 0.98;

    // ripples
    ripples.forEach(r => { r.age += dt; });
    for (let i = ripples.length - 1; i >= 0; i--) if (ripples[i].age > 1.2) ripples.splice(i, 1);
    if (surface.visible) {
      const pos = surface.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const ux = base[i * 3], uz = base[i * 3 + 2];
        let h = 0;
        for (const r of ripples) {
          const d = Math.hypot(ux * R - r.x, uz * R - r.z);
          h += 0.25 * r.a * Math.exp(-r.age * 2.4) * Math.sin(d * 3.5 - r.age * 9) * Math.exp(-d * 0.25);
        }
        pos.setY(i, h);
      }
      pos.needsUpdate = true;
      if (ripples.length) surface.geometry.computeVertexNormals();
    }

    if (bubblesOn) {
      for (let i = 0; i < COUNT; i++) {
        const b = bs[i];
        b.y += b.v * dt;
        if (b.y > y - inner.baseY - 0.3) { b.y = 0; b.a = Math.random() * 6.28; b.r = Math.random(); }
        const yy = inner.baseY + 0.3 + b.y;
        const rr = inner.radiusAt(yy) * 0.8 * b.r;
        dummy.position.set(Math.cos(b.a) * rr, yy, Math.sin(b.a) * rr);
        dummy.updateMatrix();
        bubbles.setMatrixAt(i, dummy.matrix);
      }
      bubbles.instanceMatrix.needsUpdate = true;
    }
  }

  return {
    group, setLevel, setTint, surfaceY, ripple, update,
    setFoam(on) {
      if (on) foam.visible = true;
      if (window.gsap) {
        gsap.to(foam.scale, { y: on ? 1 : 0, duration: 0.6, overwrite: 'auto', onComplete: () => { foam.visible = on; } });
      } else {
        foam.scale.y = on ? 1 : 0; foam.visible = on;
      }
    },
    setBubbles(on) { bubblesOn = on; bubbles.visible = on; }
  };
}
