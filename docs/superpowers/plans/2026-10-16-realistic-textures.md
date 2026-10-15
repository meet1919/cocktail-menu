# Realistic Textures for 3D Ingredients — Handoff Plan

Written for a coding agent (Codex) picking this up cold. Everything you need is in this file; read it fully before editing.

## Goal

Make the 3D cocktail ingredients (lemon, lime, orange, pineapple, mint, basil, coffee bean, sugar, honey, ice) look like the real thing instead of flat-colour primitives, **without** breaking physics, performance, or the existing SVG fallback.

Success looks like: a lemon wheel has visible rind, pith ring and juicy segmented flesh; mint/basil have veins and a soft waxy sheen; pineapple has fibrous flesh and (optionally) skin; coffee bean has a matte rough surface. Everything still floats, collides and animates exactly as before, and the page still loads inside its 6 s budget.

## Project context (verified by reading the code)

- Static site, **no build step, no package.json, no test framework**. Plain ES modules.
- three.js **0.170.0** from CDN via an import map in `index.html:11-15` (`three` and `three/addons/`). Addons such as `GLTFLoader` are therefore available as `three/addons/loaders/GLTFLoader.js` with no install.
- 3D stage is lazy-loaded by `js/load3d.js`: `import('./stage3d/index.js')` raced against a **6000 ms timeout**; on failure/timeout it falls back to the SVG glass. Any asset preloading must fit inside this budget or be non-blocking with a graceful fallback.
- `js/stage3d/pieces.js` — **the main file to change.** `createPiece(kind, color)` returns `{ mesh, shape, half | radius, mass, buoy }`. Kinds: `ice, lemon, lime, orange, bean, sugar, mint, basil, pineapple, honey` (`splash` returns null on purpose). It is called **synchronously** from `js/stage3d/director.js:57` and `:99`.
- Current look of each piece (all `MeshStandardMaterial` unless noted):
  - citrus wheels: `CylinderGeometry` with a 256px **canvas-drawn** top texture (`citrusTop`), flat-colour side
  - pineapple: `RoundedBoxGeometry` 1.6 with a 128px canvas grid texture
  - mint/basil: `leafGeometry()` (bezier shape, cupped), flat colour, DoubleSide
  - bean: squashed sphere + dark crease box
  - sugar: rounded cube, roughness 0.95
  - honey: small emissive sphere
  - ice: `glassMaterial()` (custom Fresnel shader in `materials.js`)
- `js/stage3d/scene.js`: ACES filmic tone mapping (exposure 1.05), `RoomEnvironment` PMREM as `scene.environment` at **intensity 0.4**, one SpotLight (key), one DirectionalLight (rim), ambient 0.08. Transparent canvas (`alpha: true`).
- `scene.js` `degrade()` kicks in when frames are slow: sets pixel ratio 1 and strips `transmission`. **Do not use `transmission` on new materials** (it is also expensive and breaks on the transparent canvas); use opacity/emissive/sheen tricks instead.
- Physics uses the `half`/`radius` values in each piece definition, **not** the mesh bounds. Whatever you render must stay visually inside those boxes, or update them deliberately.

## Working-tree warning

`git status` shows many **uncommitted modified/untracked files** (index.html, styles.css, most of `js/`, `js/stage3d/*`, plus new `js/browse.js`, `js/cheers.js`, `js/sound.js`, `js/stage3d/cheers.js`). That is the user's in-progress work. **Do not revert, stash, or reformat any of it.** Make your changes surgically, on a new branch (`git switch -c realistic-textures`), and commit only the files you touched.

## Decision to confirm with the user first

Ask (one message) before big downloads:

1. Which pieces first? Default: lemon, lime, orange, pineapple, mint, basil (the visible hero garnishes); bean/sugar/honey/ice are phase 4.
2. Are free CC0 assets from the web OK to download? (Poly Haven, ambientCG, Quaternius are CC0; check the licence of anything else, including Sketchfab.) If not, use the procedural-texture path only (Phase 2 fallback generators) and skip GLB models.

Record the answers at the top of this file under "Decisions".

## Approach

Two layers, so nothing can regress:

1. **Procedural/image PBR textures on the existing primitives** (default, small, low risk).
2. **Optional real `.glb` models** for hero pieces, normalised to the existing `half` extents so physics is untouched.

Every upgrade must have a **fallback to today's look** if an asset fails to load. The page already degrades to SVG when 3D fails; this should degrade piece-by-piece.

### Phase 0 — Baseline (no code changes)

- Serve the repo: `python -m http.server 8080` from the repo root.
- Open `http://localhost:8080/?3d=1&hq` (`3d=1` forces 3D, `hq` disables adaptive quality). Scroll to each drink so each garnish spawns. Take a screenshot of every ingredient as "before" and save under `docs/superpowers/plans/assets/before/` (create the folder; keep images small).
- Note the frame rate / any console warnings. Check `FEATURED` drinks in `js/data.js` to see which garnishes actually appear (`d.c.garnish`, plus ingredient kinds).

### Phase 1 — Texture/asset infrastructure (`js/stage3d/textures.js`, new)

Create one small module that owns texture creation and caching:

- `loadTex(url, { srgb })` using `THREE.TextureLoader`; sets `colorSpace = SRGBColorSpace` for albedo only (normal/roughness/AO stay linear), `anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())` (pass the renderer in, or read it lazily), `wrapS/T = RepeatWrapping` where tiling.
- Cache by URL so lemon/lime/orange share loader work.
- A `preloadTextures(urls)` that resolves when all are done **or** a ~2.5 s internal timeout hits (resolve with whatever loaded). Never reject.
- Call it from `js/stage3d/index.js` before the stage resolves, so `createPiece` stays synchronous. Check `index.js` first to find the right await point; keep the total well under the 6 s race in `load3d.js`.
- `createPiece` must use a loaded texture if present, otherwise the existing canvas texture. Keep the old canvas functions as the fallback.
- Asset budget: **<= ~1.5 MB total** for all textures. 512x512 (1024 only for a hero face) JPG/WebP for albedo, JPG for roughness/normal. Store under `assets/textures/<piece>/` (new folder, committed).
- Dispose nothing shared; check how `index.js`/`director.js` clean up pieces so you don't dispose cached textures twice.

### Phase 2 — Citrus (lemon, lime, orange) — biggest visible win

In `pieces.js`:

- **Cut face (cap):** replace the flat canvas wheel with a proper albedo texture: outer rind ring, white pith ring, translucent segment flesh with membranes, slight radial fibres, juice vesicle speckle. Add a normal/bump map for segment relief and a roughness map (wet flesh = low roughness, pith = high). If no image asset is available, improve the canvas generator: 512px, radial gradients, per-segment colour variation, noise grain.
- **Side wall (rind):** use a tiled rind albedo + normal map with pore bumps (fine noise normal map is fine). `MeshPhysicalMaterial` with `clearcoat ~0.3`, `clearcoatRoughness ~0.4` for the waxy look.
- Flesh juiciness without transmission: low roughness (0.25-0.35), `clearcoat` on the cap, a tiny `emissive` of the flesh colour (`emissiveIntensity ~0.08`) to fake subsurface glow.
- Keep the cylinder dimensions and `half`/`mass`/`buoy` identical. Material array order is `[side, top, bottom]` (three's cylinder groups); the existing code passes `[side, top, top]`, keep that order.
- Per-fruit params only: colours, segment count (lemon 8, lime 8, orange 10), pith thickness.

### Phase 3 — Mint and basil

- Procedural leaf albedo: darker midrib and side veins radiating from it, slight colour gradient base to tip, tiny speckle. Draw on a canvas (256x512) mapped via the geometry's UVs. **`ShapeGeometry` UVs are the raw shape coordinates, not 0..1**; set them explicitly in `leafGeometry()` (x: -0.75..0.75 -> 0..1, y/z: -1..1 -> 0..1) or the texture will smear. `leafGeometry()` is also exported and used elsewhere (check with `grep -rn leafGeometry js/`), so keep its signature; adding a `uv` attribute is safe.
- Add a vein normal/bump map from the same drawing, `MeshPhysicalMaterial` with `sheen: 0.6`, `sheenColor` a pale green, `roughness ~0.55`, `side: DoubleSide`.
- Add a few more vertices to the cupped leaf (`ShapeGeometry` curve segments are already 10, fine) and a slightly crinkled normal map for basil.

### Phase 4 — Pineapple, bean, sugar, honey, ice

- **Pineapple chunk:** fibrous yellow flesh albedo (soft vertical fibre streaks, subtle darker core on one face), normal/bump for fibres, roughness ~0.4, light emissive for juiciness. Optionally one face with the eye pattern/skin. `RoundedBoxGeometry` UVs are per-face 0..1, so one texture applies to every face; vary with `texture.offset`/`rotation` per clone if repeated pieces look identical.
- **Coffee bean:** bump/normal map for the surface grain, roughness 0.5-0.7, a deeper crease (replace the box with a thin dark curved groove or just a darker texture stripe).
- **Sugar:** cube with fine sparkle: noise normal map, roughness 0.8, tiny `sheen`/`specularIntensity` boost so it glints under the key spotlight.
- **Honey:** keep the sphere; raise `clearcoat` to 1, roughness 0.08, warmer `attenuation`-free amber via colour and emissive (no transmission).
- **Ice:** leave `glassMaterial` alone; optionally add a subtle noise normal map or an internal "crack" plane for realism. Lowest priority.

### Phase 5 — Optional: real GLB models

Only if the user approved downloads and the procedural result still isn't convincing.

- Add `js/stage3d/models.js` with `GLTFLoader` (`three/addons/loaders/GLTFLoader.js`), cache by URL, preload alongside textures with the same timeout-and-fallback rule.
- For each model: get its `Box3`, **scale uniformly so its bounding box fits the piece's existing `half`**, centre it on the origin, and wrap in a `Group` (as the bean already does). Physics definitions stay unchanged.
- Keep models under ~300 KB each (decimate in Blender, Draco/meshopt only if you also add the decoder paths). Total asset budget above still applies.
- Record the source URL and licence of every downloaded file in `assets/CREDITS.md`.

### Phase 6 — Lighting tune

PBR textures live or die on lighting. After pieces look right in isolation, tune in `scene.js`, **changing the minimum** and re-checking the glass/liquid still look right:

- `scene.environmentIntensity` (currently 0.4) — try 0.5-0.7; fruit may look dull otherwise. Check the glass Fresnel doesn't blow out (`glassMaterial` has its own `envMapIntensity`).
- Optionally replace `RoomEnvironment` with a small studio HDR (Poly Haven, 1k, ~200-400 KB) for nicer highlights on the rind. Skip if it threatens the load budget.
- Tone mapping/exposure only as a last resort.

## Verification (no test suite exists — verify in the browser)

For each phase:

1. Serve with `python -m http.server 8080`; open `/?3d=1&hq`. No console errors or 404s for any asset.
2. Scroll through every drink; confirm every garnish/ingredient renders, floats, and collides like before (compare against the Phase 0 screenshots).
3. **Fallback test:** temporarily rename one texture file; the piece must fall back to its old canvas look, the stage must still load, and there must be no unhandled promise rejection.
4. **Budget test:** throttle the network in DevTools to "Fast 3G" and confirm the stage either loads within 6 s or cleanly falls back (no half-loaded stage).
5. **Perf test:** open without `hq` and watch that adaptive `degrade()` doesn't trigger on a normal desktop; check the frame time with the Performance tab or the existing quality monitor. If textures cause a regression, reduce resolution before removing features.
6. Also check `/?3d=0` (SVG fallback) still works unchanged, and a narrow/mobile viewport.
7. Save "after" screenshots to `docs/superpowers/plans/assets/after/` and compare.

## Definition of done

- [ ] Phase 0 screenshots saved
- [ ] `textures.js` with preload (timeout-safe, never rejects) wired into `index.js`
- [ ] Lemon, lime, orange upgraded; physics values unchanged
- [ ] Mint, basil upgraded (UVs set, sheen + vein map)
- [ ] Pineapple (and phase-4 extras the user wants) upgraded
- [ ] Every upgraded piece falls back to the old look when its asset is missing
- [ ] Total new assets <= ~1.5 MB (or user-approved larger), credits recorded
- [ ] Lighting tuned, glass/liquid still look right
- [ ] Before/after screenshots committed; changes committed on a feature branch touching only the intended files

## Out of scope

Liquid/foam/bubble shaders, glass material, physics, page typography/scroll work, the browse view, and sound. Don't refactor them.
