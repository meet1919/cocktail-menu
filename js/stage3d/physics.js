import * as CANNON from 'cannon-es';

const G = -300; // cm/s^2, stronger than real gravity so drops feel snappy
const BANDS = 6, SEGMENTS = 20, THICK = 2.0;

export function createPhysics({ onSplash }) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, G, 0) });
  world.defaultContactMaterial.friction = 0.25;
  world.defaultContactMaterial.restitution = 0.2;
  let walls = [];
  let glassInfo = null;
  const items = new Set(), dying = new Set();

  // Invisible collision walls that follow the inside of the glass.
  function setGlass(inner, rOuter) {
    walls.forEach(w => world.removeBody(w));
    walls = [];
    glassInfo = { inner, rOuter };
    const floor = new CANNON.Body({
      mass: 0, shape: new CANNON.Box(new CANNON.Vec3(rOuter + 1, 1.5, rOuter + 1)),
      position: new CANNON.Vec3(0, inner.baseY - 1.5, 0)
    });
    world.addBody(floor); walls.push(floor);
    const span = inner.topY - inner.baseY;
    for (let k = 0; k < BANDS; k++) {
      const y0 = inner.baseY + span * k / BANDS, y1 = inner.baseY + span * (k + 1) / BANDS;
      const r0 = inner.radiusAt(y0), r1 = inner.radiusAt(y1);
      const rm = (r0 + r1) / 2, ym = (y0 + y1) / 2;
      const len = Math.hypot(r1 - r0, y1 - y0), tilt = Math.atan2(r1 - r0, y1 - y0);
      const half = new CANNON.Vec3(THICK / 2, len / 2 + 0.15, Math.PI * rm / SEGMENTS * 1.15 + 0.05);
      const rc = rm + (THICK / 2) * Math.cos(tilt), yc = ym - (THICK / 2) * Math.sin(tilt);
      const qz = new CANNON.Quaternion();
      qz.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), -tilt);
      for (let m = 0; m < SEGMENTS; m++) {
        const phi = (m / SEGMENTS) * Math.PI * 2;
        const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(half) });
        b.position.set(rc * Math.cos(phi), yc, -rc * Math.sin(phi));
        const qy = new CANNON.Quaternion();
        qy.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), phi);
        qy.mult(qz, b.quaternion);
        world.addBody(b); walls.push(b);
      }
    }
  }

  function add(def, mesh, pos) {
    const shape = def.shape === 'sphere' ? new CANNON.Sphere(def.radius) : new CANNON.Box(new CANNON.Vec3(...def.half));
    const body = new CANNON.Body({
      mass: def.mass, shape, position: new CANNON.Vec3(pos.x, pos.y, pos.z), allowSleep: false
    });
    body.quaternion.setFromEuler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    body.angularVelocity.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    world.addBody(body);
    const item = { body, mesh, buoy: def.buoy, inside: false, baseScale: mesh.scale.clone(), dyingT: 0 };
    items.add(item);
    return item;
  }

  function remove(item) {
    if (!items.has(item)) return;
    items.delete(item);
    world.removeBody(item.body);
    dying.add(item);
  }

  function clear() {
    items.forEach(i => { world.removeBody(i.body); if (i.mesh.parent) i.mesh.parent.remove(i.mesh); });
    dying.forEach(i => { if (i.mesh.parent) i.mesh.parent.remove(i.mesh); });
    items.clear(); dying.clear();
  }

  function nudge() {
    items.forEach(i => {
      const m = i.body.mass;
      i.body.applyImpulse(new CANNON.Vec3((Math.random() - 0.5) * 60 * m, (40 + Math.random() * 40) * m, (Math.random() - 0.5) * 60 * m));
    });
  }

  const FIXED = 1 / 60;
  let acc = 0;

  function buoyancy(surfaceY) {
    items.forEach(it => {
      const b = it.body, depth = surfaceY - b.position.y;
      if (depth > 0) {
        const c = it.buoy, f = Math.min(1, depth / c.depth);
        b.applyForce(new CANNON.Vec3(0, -G * b.mass * c.ratio * f, 0));
        b.linearDamping = 0.85; b.angularDamping = 0.85;
        if (!it.inside) {
          it.inside = true;
          if (b.velocity.y < -4) onSplash(b.position.x, b.position.z, Math.min(1.2, -b.velocity.y / 60));
        }
      } else {
        b.linearDamping = 0.02; b.angularDamping = 0.02; it.inside = false;
      }
    });
  }

  // Fixed 60 Hz sub-steps (at most 3 per frame) so buoyancy acts on every one of them.
  function step(dt, surfaceY) {
    acc = Math.min(acc + dt, FIXED * 3);
    while (acc >= FIXED) {
      buoyancy(surfaceY);
      world.step(FIXED);
      acc -= FIXED;
    }
    items.forEach(it => {
      const b = it.body;
      // safety net: anything that escapes the glass is put back above it
      const gi = glassInfo, rad = Math.hypot(b.position.x, b.position.z);
      const onRim = gi && b.position.y > gi.inner.topY - 0.5 && b.position.y < gi.inner.topY + 3 &&
        rad > gi.inner.radiusAt(gi.inner.topY) + 0.2 && b.velocity.length() < 6;
      if (gi && (onRim || b.position.y < gi.inner.baseY - 2 || rad > gi.rOuter + 1.5)) {
        b.position.set((Math.random() - 0.5) * 1.5, glassInfo.inner.topY + 4, (Math.random() - 0.5) * 1.5);
        b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
      }
      it.mesh.position.copy(b.position); it.mesh.quaternion.copy(b.quaternion);
    });
    dying.forEach(it => {
      it.dyingT += dt;
      const s = Math.max(0, 1 - it.dyingT / 0.25);
      it.mesh.scale.copy(it.baseScale).multiplyScalar(s);
      if (s <= 0) { if (it.mesh.parent) it.mesh.parent.remove(it.mesh); dying.delete(it); }
    });
  }

  return { setGlass, add, remove, clear, nudge, step, count: () => items.size };
}
