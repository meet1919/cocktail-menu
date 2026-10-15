import * as THREE from 'three';
import { glassMaterial } from './materials.js';

const SPECS = {
  highball: { H: 14, rb: 3.2, rt: 3.6, w: 0.25, base: 0.9 },
  rocks: { H: 8.5, rb: 3.6, rt: 4.2, w: 0.3, base: 1.2 },
  coupe: { H: 14, R: 5.5, w: 0.2, bowl: 4.5 }
};

function straight(s) {
  const rbi = s.rb - s.w, rti = s.rt - s.w;
  const pts = [[0, 0], [s.rb - 0.25, 0], [s.rb, 0.2], [s.rt, s.H], [rti, s.H], [rbi, s.base], [0, s.base]];
  const inner = {
    baseY: s.base, topY: s.H,
    radiusAt: y => rbi + (rti - rbi) * Math.min(1, Math.max(0, (y - s.base) / (s.H - s.base)))
  };
  return { pts, inner, size: { h: s.H, w: s.rt * 2 } };
}

function coupe(s) {
  const { R, w, bowl, H } = s;
  const yb = H - bowl, Ri = R - w, ybi = yb + w, di = H - ybi;
  const pts = [[0, 0], [3.2, 0], [3.3, 0.2], [1.1, 0.55], [0.38, 1.1], [0.38, yb - 0.2]];
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const r = 0.38 + (R - 0.38) * i / N;
    pts.push([r, yb + bowl * Math.pow(r / R, 2)]);
  }
  pts.push([Ri, H]);
  for (let i = N; i >= 0; i--) {
    const r = Ri * i / N;
    pts.push([r, ybi + di * Math.pow(r / Ri, 2)]);
  }
  const inner = {
    baseY: ybi, topY: H,
    radiusAt: y => (y <= ybi ? 0 : Ri * Math.sqrt(Math.min(1, (y - ybi) / di)))
  };
  return { pts, inner, size: { h: H, w: R * 2 } };
}

// Builds a hollow glass by spinning a profile curve around the vertical axis.
export function buildGlass(type) {
  const spec = SPECS[type];
  const { pts, inner, size } = type === 'coupe' ? coupe(spec) : straight(spec);
  const geo = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 72);
  const mat = glassMaterial({ color: 0xcfdde8, base: 0.025, rim: 0.85, power: 3.4 });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, mat));

  // invisible cylinder used only to decide whether a pointer is on the glass
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(size.w / 2, size.w / 2, size.h, 16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = size.h / 2;
  group.add(hit);

  return { group, inner, hit, size, materials: [mat] };
}
