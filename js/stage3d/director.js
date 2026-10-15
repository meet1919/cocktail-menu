import { buildGlass } from './glass.js';
import { createPiece } from './pieces.js';
import { createLiquid } from './liquid.js';
import { quality } from './quality.js';

const FRONT_AZ = 0.5;     // the camera's starting angle, so effects face the viewer
const SPAWN_GAP = 0.18;   // seconds between ingredients dropping in
const MAX_FILL = 0.85;

// Decides what is in the glass at any scroll position. Physics is not
// reversible, so scrolling back removes pieces and scrolling forward drops them again.
export function createDirector({ THREE, scene, key, halo, physics, controls, drinks }) {
  const dr = drinks.map((c, i) => {
    const glass = buildGlass(c.glass);
    const liquid = createLiquid(glass.inner, c.color);
    glass.group.add(liquid.group);
    glass.group.visible = i === 0;
    scene.add(glass.group);
    return { c, glass, liquid, spawned: new Map(), extra: [], effectOn: false, strand: null, rimLemon: null, fade: { v: i === 0 ? 1 : 0 } };
  });

  let cur = -1;
  let queue = [], acc = 0;
  const streams = [];
  const dropGeo = new THREE.SphereGeometry(0.16, 8, 8);
  const api = { onIngredient: null };

  function setOpacity(d, o) {
    const base = quality.degraded ? 0.28 : 1;
    d.glass.materials.forEach(m => { m.opacity = o * base; });
    d.glass.group.visible = o > 0.01;
  }

  function clearDrink(d) {
    physics.clear();
    d.spawned.clear(); d.extra.length = 0; d.effectOn = false;
    queue = [];
    if (d.strand) d.strand.scale.y = 0;
    if (d.rimLemon) d.rimLemon.scale.setScalar(0);
    d.glass.group.position.x = 0;
    d.liquid.setFoam(false); d.liquid.setBubbles(false);
    d.liquid.setLevel(0); d.liquid.setTint(0);
  }

  // spirits, syrups and honey pour in as a thin stream of droplets
  function pour(d, color, count) {
    const topY = d.glass.inner.topY;
    for (let k = 0; k < count; k++) {
      const m = new THREE.Mesh(dropGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.2 }));
      m.position.set((Math.random() - 0.5) * 0.8, topY + 9 + k * 0.7, (Math.random() - 0.5) * 0.8);
      d.glass.group.add(m);
      streams.push({ m, v: -20 - Math.random() * 10, d });
    }
  }

  function spawn(d, kind, color) {
    if (kind === 'splash') { pour(d, color, 14); return null; }
    if (kind === 'honey') pour(d, '#E8A93B', 8);
    const def = createPiece(kind, color);
    if (!def) return null;
    d.glass.group.add(def.mesh);
    const r = d.glass.inner.radiusAt(d.glass.inner.topY) * 0.3;
    const a = Math.random() * 6.28;
    return physics.add(def, def.mesh, {
      x: Math.cos(a) * r * Math.random(), y: d.glass.inner.topY + 8, z: Math.sin(a) * r * Math.random()
    });
  }

  function runEffect(d, on) {
    const name = d.c.effect, inner = d.glass.inner;
    if (name === 'honeyDrip') {
      if (!d.strand) {
        const len = 5;
        const g = new THREE.CylinderGeometry(0.14, 0.1, len, 8);
        g.translate(0, -len / 2, 0);
        d.strand = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xffd27a, roughness: 0.2, emissive: 0x5a3600, emissiveIntensity: 0.4 }));
        const r = inner.radiusAt(inner.topY) * 0.97;
        d.strand.position.set(r * Math.sin(FRONT_AZ), inner.topY, r * Math.cos(FRONT_AZ));
        d.strand.scale.y = 0;
        d.glass.group.add(d.strand);
      }
      gsap.to(d.strand.scale, { y: on ? 1 : 0, duration: on ? 1.2 : 0.4, overwrite: 'auto' });
    } else if (name === 'iceClink') {
      if (on) {
        for (let k = 0; k < 3; k++) {
          setTimeout(() => {
            if (dr[cur] === d && d.effectOn) { const it = spawn(d, 'ice', d.c.color); if (it) d.extra.push(it); }
          }, k * 150);
        }
        if (!d.rimLemon) {
          const def = createPiece('lemon', d.c.color);
          d.rimLemon = def.mesh;
          const r = inner.radiusAt(inner.topY) + 0.2;
          d.rimLemon.position.set(r * Math.sin(FRONT_AZ + 0.5), inner.topY - 0.2, r * Math.cos(FRONT_AZ + 0.5));
          d.rimLemon.rotation.z = Math.PI / 2.4;
          d.rimLemon.scale.setScalar(0);
          d.glass.group.add(d.rimLemon);
        }
        gsap.to(d.rimLemon.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(1.6)', overwrite: 'auto' });
        gsap.fromTo(d.rimLemon.rotation, { y: -3 }, { y: 0, duration: 0.8, overwrite: 'auto' });
      } else {
        d.extra.forEach(it => physics.remove(it));
        d.extra.length = 0;
        if (d.rimLemon) gsap.to(d.rimLemon.scale, { x: 0, y: 0, z: 0, duration: 0.3, overwrite: 'auto' });
      }
    } else if (name === 'shakeFoam') {
      if (on) {
        gsap.fromTo(d.glass.group.position, { x: -0.3 }, {
          x: 0.3, duration: 0.08, yoyo: true, repeat: 9, ease: 'sine.inOut', overwrite: 'auto',
          onComplete: () => { d.glass.group.position.x = 0; }
        });
        for (let k = 0; k < 6; k++) setTimeout(() => d.liquid.ripple((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 1.2), k * 120);
        setTimeout(() => { if (d.effectOn) d.liquid.setFoam(true); }, 800);
      } else {
        d.liquid.setFoam(false);
      }
    } else if (name === 'bubbles') {
      d.liquid.setBubbles(on);
    }
  }

  api.setActive = function (i, instant) {
    if (i === cur) return;
    const prev = cur >= 0 ? dr[cur] : null;
    if (prev) {
      clearDrink(prev);
      gsap.to(prev.glass.group.scale, { x: 0.85, y: 0.85, z: 0.85, duration: instant ? 0 : 0.4, overwrite: 'auto' });
      // one fade object per drink, so a fade-in and a fade-out can never fight each other
      gsap.to(prev.fade, { v: 0, duration: instant ? 0 : 0.4, overwrite: 'auto', onUpdate: () => setOpacity(prev, prev.fade.v) });
    }
    cur = i;
    const d = dr[i];
    clearDrink(d);
    physics.setGlass(d.glass.inner, d.glass.size.w / 2);
    controls.setFraming(d.glass.size.h, d.glass.size.w, !!instant);
    d.glass.group.scale.set(0.9, 0.9, 0.9);
    gsap.to(d.glass.group.scale, { x: 1, y: 1, z: 1, duration: instant ? 0 : 0.5, overwrite: 'auto' });
    d.fade.v = instant ? 1 : d.fade.v;
    setOpacity(d, d.fade.v);
    gsap.to(d.fade, { v: 1, duration: instant ? 0 : 0.5, overwrite: 'auto', onUpdate: () => setOpacity(d, d.fade.v) });
    const col = new THREE.Color(d.c.color);
    gsap.to(key.color, { r: col.r * 0.6 + 0.4, g: col.g * 0.6 + 0.4, b: col.b * 0.6 + 0.4, duration: 0.8, overwrite: 'auto' });
    gsap.to(halo.material.color, { r: col.r, g: col.g, b: col.b, duration: 0.8, overwrite: 'auto' });
  };

  api.update = function (i, p) {
    if (i !== cur) return;
    const d = dr[i], ings = d.c.ingredients, n = ings.length;
    const x = p * (n + 1.6);
    for (let j = 0; j < n; j++) {
      const want = x >= j + 0.3, has = d.spawned.has(j);
      if (want && !has) {
        d.spawned.set(j, null);
        queue.push({ d, j });
        if (api.onIngredient) api.onIngredient(i, j, true);
      } else if (!want && has) {
        const it = d.spawned.get(j);
        if (it) physics.remove(it);
        d.spawned.delete(j);
        queue = queue.filter(q => !(q.d === d && q.j === j));
        if (api.onIngredient) api.onIngredient(i, j, false);
      }
    }
    d.liquid.setLevel(MAX_FILL * Math.min(1, Math.max(0, (x - 0.5) / n)));
    d.liquid.setTint(Math.min(1, p * 1.1));
    const eff = x >= n + 0.4;
    if (eff !== d.effectOn) { d.effectOn = eff; runEffect(d, eff); }
  };

  api.tick = function (dt) {
    if (cur < 0) return;
    const d = dr[cur];
    acc += dt;
    if (queue.length && acc >= SPAWN_GAP) {
      acc = 0;
      const q = queue.shift();
      if (q.d === d && d.spawned.has(q.j)) {
        const ing = d.c.ingredients[q.j];
        d.spawned.set(q.j, spawn(d, ing.piece, d.c.color));
      }
    }
    for (let k = streams.length - 1; k >= 0; k--) {
      const s = streams[k];
      s.v -= 120 * dt;
      s.m.position.y += s.v * dt;
      if (s.m.position.y <= s.d.liquid.surfaceY() + 0.1 || s.m.position.y < 0) {
        s.d.liquid.ripple(s.m.position.x, s.m.position.z, 0.45);
        if (s.m.parent) s.m.parent.remove(s.m);
        s.m.material.dispose();
        streams.splice(k, 1);
      }
    }
    d.liquid.update(dt);
    dr.forEach((o, k) => { if (k !== cur && o.glass.group.visible) o.liquid.update(dt); });
  };

  api.nudge = function () {
    if (cur < 0) return;
    physics.nudge();
    dr[cur].liquid.ripple(0, 0, 1.1);
  };
  api.activeGlass = () => dr[cur >= 0 ? cur : 0].glass;
  api.surfaceY = () => (cur >= 0 ? dr[cur].liquid.surfaceY() : 0);
  api.rippleActive = (x, z, s) => { if (cur >= 0) dr[cur].liquid.ripple(x, z, s); };
  return api;
}
