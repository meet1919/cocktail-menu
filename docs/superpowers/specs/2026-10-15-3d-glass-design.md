# 3D Glass Stage — Design Spec

**Date:** 2026-10-15
**Builds on:** `2026-10-02-cocktail-menu-design.md` (the finished SVG menu)
**Deliverable:** Replace the pinned SVG glass with a real-time 3D scene: a refractive glass, 3D ingredients with physics, drag-to-rotate, and a bar environment. The SVG stage stays as the fallback.

## 1. Goal

The right-hand panel becomes a 3D scene. Scrolling still builds each drink in order (same story as today), but ingredients are real 3D objects that fall, collide and float under a physics engine. The visitor can drag to rotate the glass at any time and tap it to nudge the contents.

## 2. Decisions (agreed with the user)

| Topic | Decision |
|---|---|
| Interaction model | **Scroll-driven + drag to rotate.** Scroll spawns each ingredient; physics decides how it lands. Drag orbits the view at any time. |
| 3D library | **Three.js** (pinned `0.170.0`), ES modules via an import map from jsDelivr. |
| Physics | **cannon-es** (pinned `0.20.0`), not Rapier (about 1 MB of WASM, too heavy for about 20 bodies). |
| Liquid | **Faked, not simulated.** A coloured see-through volume plus a rippling surface. No fluid simulation. |
| Fallback | The current SVG stage, unchanged. |
| Hosting | Static files on Vercel. Libraries load from the CDN. |

## 3. Scope

**In:** 3D glass (3 shapes), environment, orbit controls, tap nudge, 3D ingredient pieces, physics world with buoyancy, liquid volume and surface ripples, per-drink effects, scroll integration, preloader handoff, adaptive quality, SVG fallback.

**Out (not built):** real fluid simulation, sound, downloaded HDR images or 3D model files, pouring-liquid physics, gyroscope or tilt-to-shake input, VR, pinch zoom, keyboard rotation.

## 4. Architecture

New ES modules under `js/stage3d/`. Each file has one job.

| File | Responsibility | Depends on |
|---|---|---|
| `index.js` | `export async function createStage3D(container, drinks) → Stage3D`. Wires the modules together and owns the render loop's on/off gating. | all below |
| `scene.js` | Renderer, camera, lights, environment map, bar counter, background bokeh lights, resize handling, per-frame callback list. | three |
| `glass.js` | Glass profiles and `buildGlass(type) → { group, inner }`. `inner` = `{ height, baseY, radiusAt(y) }`, used by physics and liquid. | three |
| `pieces.js` | `createPiece(kind, color) → { mesh, shape, mass, buoyancy }` for `mint, basil, lemon, honey, pineapple, ice, splash`. | three |
| `physics.js` | cannon-es world, glass wall colliders from `inner`, `addPiece()`, `removePiece()`, buoyancy and damping, fixed-step update. | cannon-es |
| `liquid.js` | Liquid volume, surface disc with ripples, foam layer, bubbles. `setLevel(f)`, `ripple(x, z, strength)`. | three, glass |
| `controls.js` | Pointer orbit, momentum, idle auto-rotate, tap-to-nudge. | scene |
| `director.js` | Per-drink logic: `setActive(i)`, `update(i, progress)` spawns and removes pieces by scroll progress, drives liquid level and effects. | physics, pieces, liquid |

**Existing files that change**

| File | Change |
|---|---|
| `index.html` | Add `<script type="importmap">` before all scripts. |
| `js/main.js` | Try 3D first (`await Bar.try3D()`); on any failure fall back to `Bar.createStage` (SVG). |
| `js/scroll.js` | If `stage.kind === '3d'`, drive `stage.director` from the same section ScrollTriggers. The SVG branch is untouched. |
| `js/preloader.js` | Accept `target` as either an element or a `{left, top, width, height}` rect. |
| `styles.css` | Style for the canvas container; `touch-action: pan-y` on the canvas. |

**Stage interface.** Both stages return an object with `kind` (`'svg'` or `'3d'`).
- SVG: unchanged (`groups`, `glowEl`).
- 3D: `{ kind: '3d', director, glassRect(): {left, top, width, height}, bodyCount(): number, dispose() }`.

**Loading.** `Bar.try3D()` does a dynamic `import('./stage3d/index.js')`, which works from the existing classic scripts. It resolves to the 3D stage, or `null` if any condition in section 10 fails.

## 5. The scene

**Units:** 1 unit = 1 cm.

**Glasses.** Each glass is built with `LatheGeometry` from an outer and an inner profile curve (so walls have real thickness). Approximate sizes:

| Glass | Used by | Height | Top radius | Bottom radius | Wall | Notes |
|---|---|---|---|---|---|---|
| Highball | Honey, I'm Home; Pineapple Express | 14 | 3.6 | 3.2 | 0.25 | Slightly tapered |
| Rocks | Monkey on the Loose | 8.5 | 4.2 | 3.6 | 0.3 | Thick base (1.2) |
| Coupe | Rain Check | 14 | 5.5 | n/a | 0.2 | Bowl depth 4.5, stem, round base |

**Glass material.** `MeshPhysicalMaterial` with transmission, a little roughness, IOR 1.5, thin thickness, `transparent: true` so it can fade when switching drinks.

**Camera.** Perspective, FOV 35. Distance fitted so the tallest glass fills about 72% of the panel height. Target is the middle of the glass.

**Lighting.**
- Environment map from three's built-in `RoomEnvironment` through PMREM (no download).
- One key spot light whose colour follows the active drink's accent colour, one white rim light behind, low ambient.

**Surroundings.**
- A dark counter: a circular plane, low roughness, reflecting the environment.
- Soft contact shadow: a blurred dark texture plane under the glass (no shadow maps).
- Bokeh: about 30 additive soft circles in the background, warm, slowly drifting.
- Mint leaves: about 6 low-poly floating leaves drifting in the air at the edges.

The scene background is transparent so the page's dark background and the existing CSS glow show through.

## 6. Physics

- **World:** cannon-es, gravity set from a tunable constant (starting value −300 cm/s², tuned by eye), fixed timestep 1/60 with at most 3 substeps, body sleeping enabled.
- **Glass colliders:** a floor plane at the inner base, plus a ring of 20 thin box colliders placed along `inner.radiusAt(y)` so the taper and the coupe bowl are respected. The glass is static.
- **Body cap:** at most 24 bodies live at once. The directors only spawn what the current drink needs, so this is a safety limit.

**Pieces**

| Kind | Mesh | Shape | Mass | Buoyancy |
|---|---|---|---|---|
| ice | Rounded box 2.2 cm, transmission material | Box | 1 | float (sits low, bobs) |
| lemon | Thin cylinder r 1.8, h 0.35, canvas-drawn segment texture | Cylinder | 0.6 | neutral (hangs mid-liquid) |
| mint / basil | Curved leaf, double-sided green | Thin box 2.0 × 0.1 × 1.2 | 0.15 | float (rests at the surface) |
| pineapple | Box 1.6 cm with hatch texture | Box | 0.9 | sink |
| honey | Gold drop, mass 0.3 | Sphere r 0.5 | 0.3 | sink, then fades into the liquid |
| splash | 14 small drops of the drink colour, not physics bodies (simple falling integration) | n/a | n/a | n/a |

**Buoyancy.** Every step, for each body with its centre below the surface `y_s`: apply an upward force `k × clamp(y_s − y, 0, depthMax)` scaled by its buoyancy type (float: strong, neutral: balances gravity at mid depth, sink: weak), and raise linear and angular damping while submerged. Starting constants are tuned visually.

**Spawning.** A piece spawns at `glassTop + 8 cm`, within 50% of the inner radius, with a random rotation and a small angular velocity.

## 7. Liquid, foam, bubbles

- **Volume:** a mesh built from the inner profile, clipped by a horizontal clipping plane at the current level, coloured and see-through.
- **Surface:** a subdivided disc at the level, with radius from `inner.radiusAt(level)`. Vertex displacement uses up to 6 live ripples (position, strength, age), each decaying in about 1.2 s. `ripple(x, z, strength)` is called when a piece enters the liquid or the glass is nudged.
- **Level:** `setLevel(f)` sets a target; the actual level follows with a critically damped spring so it settles smoothly. Maximum fill is 0.85 of the inner height (same as the SVG).
- **Colour:** pale tint at first, the drink's full colour by the end of the section (same idea as the SVG).
- **Foam (Rain Check):** a cream disc at the surface that scales in.
- **Bubbles (Pineapple Express):** an `InstancedMesh` of about 40 small spheres that rise inside the liquid and recycle at the surface.

## 8. Interaction

- **Rotate:** a drag that starts on the glass orbits the camera around the glass. Azimuth is free; elevation is limited to 5°–40° above the horizon. Pan and zoom are off. Momentum with damping 0.08. Orbiting the camera keeps the physics and liquid correct and looks the same as spinning the glass.
- **Idle:** after 3 s without input, a slow auto-rotate (about 0.4°/s) resumes.
- **Nudge:** a tap or click on the glass (movement under 6 px, under 250 ms) applies a small random impulse to every body and triggers a ripple.
- **Scrolling:** the mouse wheel and vertical touch swipes always scroll the page (`touch-action: pan-y` on the canvas; no wheel listener). Only a drag that starts on the glass rotates.

## 9. Scroll integration

The same four `.drink` sections and the same ScrollTrigger range as today (`top 50%` to `bottom 80%`). Each section's trigger reports a progress value `p` from 0 to 1 to `director.update(i, p)`.

For a drink with `n` ingredients, let `T = n + 1.6` and `x = p × T`:

- **Spawn:** ingredient `j` is present when `x ≥ j + 0.3`. Crossing the threshold forward spawns it; crossing it backward removes it (scale to zero over 0.25 s, then the body is removed).
- **Level:** `level(p) = 0.85 × clamp((x − 0.5) / n, 0, 1)`, fed to `setLevel`.
- **List lines:** the matching `li` lights up at the same threshold (same look as the SVG).
- **Effect:** triggers when `x ≥ n + 0.4` and is undone below it.

Physics is not reversible, so scrolling back removes the objects and scrolling forward drops them again. Dropped objects will land slightly differently each time.

**Drink switching** reuses today's `activate(i)` timing (the next drink starts when its section's top reaches 50% of the viewport). The outgoing glass fades via material opacity while scaling to 0.85, and its bodies are removed; the incoming glass fades in from 0.9. The key light colour and the page `--accent` change as today.

**Effects**

| Drink | Effect |
|---|---|
| Honey, I'm Home | A honey strand grows down the inner wall (tube mesh) and a short honey stream pours in when the honey piece spawns. |
| Monkey on the Loose | Three ice cubes drop in and collide for real; a lemon wheel spins onto the rim. |
| Rain Check | The glass group shakes for 0.8 s with a surface ripple storm, then the foam layer scales in. |
| Pineapple Express | Bubbles start rising. |

## 10. Fallback and performance

**Use the SVG stage (the 3D import is not attempted or its result is discarded) when any of these hold:**
- WebGL2 is unavailable.
- `prefers-reduced-motion: reduce` is set.
- `navigator.hardwareConcurrency < 4` or `navigator.deviceMemory < 4` (when those values exist).
- The URL has `?3d=0`. (`?3d=1` forces 3D for testing.)
- The module import, WebGL setup or physics setup throws or does not finish within the preloader's 6 s failsafe.

**Budgets and adaptation**
- Pixel ratio capped at 2 on desktop and 1.5 on phones.
- The render loop runs only while the stage is on screen and the tab is visible. Physics steps only while rendering.
- Frame-time check: if the average frame time over 2 s exceeds 28 ms, drop the pixel ratio to 1 and switch glass and ice to a simple transparent material (no transmission). This happens once and is not undone.
- Added download: about 650 KB (Three.js plus cannon-es, gzip; the glass, pieces and textures are generated in code).

## 11. Preloader handoff

The preloader continues to run the same ice-cube animation. When the page is ready, `Bar.try3D()` must have resolved. The loader glass glides to `stage.glassRect()` (the glass's current rectangle on screen, projected from the 3D bounds) instead of the SVG element, then cross-fades into the 3D glass. If the stage is SVG, the existing handoff is used unchanged.

## 12. Accessibility

The canvas is `aria-hidden`. All drink text (names, taglines, ingredient lists) stays in the page as real text, so the menu reads the same without the 3D. Reduced-motion users get the SVG fallback (which already has the no-motion behaviour).

## 13. Testing

At each build stage, check in the in-app browser, console clean (0 errors):

1. **Stage:** the glass renders with reflections; drag rotates with momentum; idle auto-rotate starts; wheel and vertical swipe scroll the page; at 375 px width a drag on the glass rotates while a swipe beside it scrolls.
2. **Physics:** pieces fall, collide, float; no piece escapes the glass; `bodyCount()` never exceeds 24.
3. **Scroll:** at each section's start `bodyCount()` is 0; at its end it equals the drink's piece count (plus effect bodies); scrolling back to the hero brings it back to 0; scrolling forward again repeats it.
4. **Fallbacks:** `?3d=0` shows the unchanged SVG menu; a forced import failure falls back without errors; the adaptive quality drop works (simulated by forcing slow frames).
5. **Handoff and layout:** the preloader glides onto the 3D glass; 1440 px and 375 px layouts show no horizontal scroll.
6. **Performance check:** note the average frame time while scrolling through all four drinks and report it.
