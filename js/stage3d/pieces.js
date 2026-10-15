import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { glassMaterial } from './materials.js';

function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const lemonTop = () => canvasTex(256, (g) => {
  g.fillStyle = '#F4D35E'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.fillStyle = '#FBE98A'; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 5;
  for (let a = 0; a < 8; a++) {
    g.beginPath(); g.moveTo(128, 128);
    g.lineTo(128 + 108 * Math.cos(a * Math.PI / 4), 128 + 108 * Math.sin(a * Math.PI / 4)); g.stroke();
  }
});

const pineappleTex = () => canvasTex(128, (g, s) => {
  g.fillStyle = '#F7C948'; g.fillRect(0, 0, s, s);
  g.strokeStyle = '#C98F10'; g.lineWidth = 4;
  for (let i = 0; i <= s; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke();
  }
});

// A pointed leaf lying flat in the XZ plane, slightly cupped.
export function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -1);
  s.bezierCurveTo(0.75, -0.55, 0.75, 0.45, 0, 1);
  s.bezierCurveTo(-0.75, 0.45, -0.75, -0.55, 0, -1);
  const g = new THREE.ShapeGeometry(s, 10);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, 0.18 * x * x); }
  g.computeVertexNormals();
  return g;
}

const leafMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, side: THREE.DoubleSide });

// Returns a mesh plus the physics description for one ingredient, or null for
// 'splash' (spirits and syrups are poured as a stream instead).
export function createPiece(kind, color) {
  switch (kind) {
    case 'ice': {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(2.2, 2.2, 2.2, 3, 0.3), glassMaterial({ color: 0xd8ecff, base: 0.3, rim: 0.95, power: 1.6, roughness: 0.12 }));
      return { mesh, shape: 'box', half: [1.1, 1.1, 1.1], mass: 1, buoy: { ratio: 1.8, depth: 1.2 } };
    }
    case 'lemon': {
      const top = new THREE.MeshStandardMaterial({ map: lemonTop(), roughness: 0.5 });
      const side = new THREE.MeshStandardMaterial({ color: 0xf4d35e, roughness: 0.5 });
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.35, 40), [side, top, top]);
      return { mesh, shape: 'box', half: [1.3, 0.18, 1.3], mass: 0.6, buoy: { ratio: 1.0, depth: 2.5 } };
    }
    case 'mint':
    case 'basil': {
      const basil = kind === 'basil';
      const mesh = new THREE.Mesh(leafGeometry(), leafMat(basil ? 0x3f8f3a : 0x5dbb63));
      mesh.scale.setScalar(basil ? 1.5 : 1.15);
      const k = mesh.scale.x;
      return { mesh, shape: 'box', half: [0.7 * k, 0.08, 1.0 * k], mass: 0.15, buoy: { ratio: 2.2, depth: 0.3 } };
    }
    case 'pineapple': {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(1.6, 1.6, 1.6, 2, 0.2), new THREE.MeshStandardMaterial({ map: pineappleTex(), roughness: 0.5 }));
      return { mesh, shape: 'box', half: [0.8, 0.8, 0.8], mass: 0.9, buoy: { ratio: 0.6, depth: 1 } };
    }
    case 'honey': {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshStandardMaterial({
        color: 0xe8a93b, roughness: 0.15, emissive: 0x5a3600, emissiveIntensity: 0.4
      }));
      return { mesh, shape: 'sphere', radius: 0.5, mass: 0.3, buoy: { ratio: 0.5, depth: 1 } };
    }
    default:
      return null;
  }
}
