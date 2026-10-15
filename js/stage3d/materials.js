import * as THREE from 'three';

// Fresnel glass: almost clear when seen face-on, bright and reflective toward the
// edges. Unlike transmission materials it also works on a transparent canvas,
// so the page shows through behind the glass.
export function glassMaterial({ color = 0xffffff, base = 0.05, rim = 0.85, power = 2.2, envMapIntensity = 1.4, roughness = 0.04 } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color, metalness: 0, roughness, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.03,
    transparent: true, side: THREE.DoubleSide, depthWrite: false, envMapIntensity
  });
  mat.onBeforeCompile = shader => {
    shader.uniforms.uBase = { value: base };
    shader.uniforms.uRim = { value: rim };
    shader.uniforms.uPower = { value: power };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float uBase;\nuniform float uRim;\nuniform float uPower;\nvoid main() {')
      .replace('#include <opaque_fragment>', `
        float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), uPower);
        gl_FragColor = vec4( outgoingLight, diffuseColor.a * mix( uBase, uRim, fr ) );
        #ifdef USE_TRANSMISSION
        #endif`);
  };
  mat.customProgramCacheKey = () => 'fresnelGlass';
  return mat;
}
