# Cocktail Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page, dark-themed cocktail menu. It has an "ice cubes drop into a glass" preloader and a scroll-driven section that builds each of the 4 cocktails inside one pinned SVG glass.

**Architecture:** A static site with no build step. Plain `<script>` files share one global namespace, `window.Bar`. ES modules are not used, so the page also works when opened from `file://`. One data array drives everything. A stage module owns the pinned SVG: four pre-built glass groups, one per drink. A scroll module creates one scrubbed GSAP ScrollTrigger timeline per drink section.

**Tech Stack:** HTML5, CSS3 (custom properties, sticky positioning), vanilla JS (ES2020), GSAP 3.12 + ScrollTrigger from cdnjs, Google Fonts (Cormorant Garamond, Inter).

**Spec:** `docs/superpowers/specs/2026-10-02-cocktail-menu-design.md`

## Global Constraints

- Drink names and taglines are used verbatim: **Honey Garden** ("Gin, honey and fresh mint"), **Whiskey Kick** ("Whiskey with a fresh lemon kick"), **Basil Breeze** ("Gin, basil and lemon, shaken cold"), **Pineapple Sunset** ("Tequila, pineapple and ginger fizz").
- Colors: background `#0E0C0B`, text `#F3E9DC`, honey `#E8A93B`, amber `#C2691F`, basil `#7FB43A`, sunset `#F2A33A`.
- Preloader: minimum duration 2.5s, failsafe reveal at 6s, cube 2 drops about 0.6s after cube 1.
- Glasses: highball (Honey Garden, Pineapple Sunset), rocks (Whiskey Kick), coupe (Basil Breeze).
- External scripts load only from `cdnjs.cloudflare.com`. Fonts load only from Google Fonts. There are no image files; all graphics are inline SVG.
- `prefers-reduced-motion: reduce` gives a 0.5s preloader fade and no falling or shaking.
- Layouts must work at 375px and 1440px wide, with no horizontal scroll.
- Out of scope: prices, ordering, sound, multiple pages.

## Testing approach

This is a visual page with no logic worth unit-testing, so every task is verified in the browser:
open `index.html` in the in-app browser, check the console for errors, and run the listed checks.
The console must show **0 errors** at the end of every task.

---

## File structure

```
index.html          markup: preloader overlay, hero, stage, 4 drink sections, footer
styles.css          theme tokens, layout (desktop split / mobile stacked), preloader, effects
js/data.js          Bar.COCKTAILS: the single source of truth for drinks
js/svg.js           Bar.svg: glass geometry + ingredient SVG factories (pure, no GSAP)
js/stage.js         Bar.createStage(svgEl): builds 4 glass groups, returns per-drink handles
js/scroll.js        Bar.initScroll(stage): one ScrollTrigger timeline per section
js/preloader.js     Bar.runPreloader(targetEl): returns a Promise that resolves after the reveal
js/main.js          entry point: wire everything together, reduced-motion switch
```

Script order in `index.html`: gsap → ScrollTrigger → data → svg → stage → scroll → preloader → main.

---

### Task 1: Page skeleton, theme and data

**Files:**
- Create: `index.html`, `styles.css`, `js/data.js`, `js/main.js` (stub)

**Interfaces:**
- Produces: `Bar.COCKTAILS: Array<Cocktail>`

```js
// js/data.js
window.Bar = window.Bar || {};
Bar.COCKTAILS = [
  { id: 'honey-garden', name: 'Honey Garden', tagline: 'Gin, honey and fresh mint',
    glass: 'highball', color: '#E8A93B', method: 'Muddle mint, build over ice',
    effect: 'honeyDrip',
    ingredients: [
      { label: 'Fresh mint', amount: '', piece: 'mint' },
      { label: 'Honey', amount: '', piece: 'honey' },
      { label: 'Gin', amount: '', piece: 'splash' },
      { label: 'Ice', amount: '', piece: 'ice' } ] },
  { id: 'whiskey-kick', name: 'Whiskey Kick', tagline: 'Whiskey with a fresh lemon kick',
    glass: 'rocks', color: '#C2691F', method: 'Build over ice',
    effect: 'iceClink',
    ingredients: [
      { label: 'Mint', amount: '', piece: 'mint' },
      { label: 'Lemon juice', amount: '30ml', piece: 'lemon' },
      { label: 'Simple syrup', amount: '30ml', piece: 'splash' },
      { label: 'Whiskey', amount: '60ml', piece: 'splash' } ] },
  { id: 'basil-breeze', name: 'Basil Breeze', tagline: 'Gin, basil and lemon, shaken cold',
    glass: 'coupe', color: '#7FB43A', method: 'Muddle basil, shake with ice, strain',
    effect: 'shakeFoam',
    ingredients: [
      { label: 'Basil', amount: '', piece: 'basil' },
      { label: 'Lemon', amount: '', piece: 'lemon' },
      { label: 'Simple syrup', amount: '15ml', piece: 'splash' },
      { label: 'Gin', amount: '', piece: 'splash' },
      { label: 'Ice (shaken)', amount: '', piece: 'ice' } ] },
  { id: 'pineapple-sunset', name: 'Pineapple Sunset', tagline: 'Tequila, pineapple and ginger fizz',
    glass: 'highball', color: '#F2A33A', method: 'Muddle pineapple, lemon & mint; top with soda',
    effect: 'bubbles',
    ingredients: [
      { label: 'Pineapple', amount: '', piece: 'pineapple' },
      { label: 'Lemon', amount: '', piece: 'lemon' },
      { label: 'Mint', amount: '', piece: 'mint' },
      { label: 'Tequila', amount: '', piece: 'splash' },
      { label: 'Ginger lemon soda', amount: '', piece: 'splash' } ] }
];
```

- [ ] **Step 1:** Write `js/data.js` exactly as shown above.
- [ ] **Step 2:** Write `index.html`:
  - `<head>`: meta viewport, title "The Ice Cube Bar", Google Fonts link (Cormorant Garamond 500/600 italic, Inter 400/500), `styles.css`.
  - `<body class="is-loading">`:
    - `#preloader` with `<svg id="loader-glass" viewBox="0 0 200 300" aria-hidden="true">` and `<p class="loader-label">Pouring… <span id="loader-pct">0</span>%</p>`.
    - `header.hero` with `h1` "The Ice Cube Bar", a tagline `p` and a `.scroll-hint`.
    - `main.menu` containing `.stage` (`<svg id="stage-glass" viewBox="0 0 200 300" aria-hidden="true">` plus `.glow`) and `.drinks`.
    - `footer` with "Cheers!".
  - Scripts at the end of `<body>`: `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js`, `.../ScrollTrigger.min.js`, then the local `js/*` files in the order listed above.
- [ ] **Step 3:** In `js/main.js`, render the drink sections from data. Each section is `section.drink[data-index=i]` containing `h2` (name), `p.tagline`, `p.method`, and `ul.ingredients > li[data-step=j]` holding `<span class="amt">` + label. Leave the amount span out when the amount is empty.
- [ ] **Step 4:** Write `styles.css`:
  - `:root` tokens for the colors above plus `--accent` (set from JS per drink).
  - `body { background:#0E0C0B; color:#F3E9DC; font-family: Inter }`; `h1, h2` use Cormorant Garamond.
  - Grain overlay: `body::after` with an inline SVG `feTurbulence` data-URI at opacity 0.06, `pointer-events:none`.
  - Desktop (≥ 768px): `.menu` is a 2-column grid (`.drinks` on the left, `.stage` on the right). `.stage { position: sticky; top: 0; height: 100vh }`. Each `.drink { min-height: 150vh; display:flex; align-items:center }`.
  - Mobile (< 768px): single column. `.stage` is sticky with `height: 50vh` and `z-index: 1`, and `.drink` content sits below it with a solid background card.
  - `.glow`: a radial-gradient using `var(--accent)` at 35% opacity, with `transition: background 0.8s`.
  - `#preloader`: fixed full-screen, background `#0E0C0B`, flex-centered, `z-index: 100`.
  - `li` default `opacity: .35`; `li.is-in { opacity: 1; color: var(--accent) }`.
- [ ] **Step 5: Verify.** Open `index.html` in the browser. Confirm that the 4 drink sections render with the exact names and ingredients, that the console shows 0 errors, and that at 375px wide there is no horizontal scroll.

---

### Task 2: SVG library (glasses and ingredient pieces)

**Files:**
- Create: `js/svg.js`

**Interfaces:**
- Produces:
  - `Bar.svg.GLASSES[type] → { outline: string(path d), inner: string(path d), top: number, bottom: number, extra?: string(svg markup) }` for `'highball' | 'rocks' | 'coupe'`. Coordinates use viewBox `0 0 200 300`. `top`/`bottom` are the liquid's y range.
  - `Bar.svg.el(tag, attrs) → SVGElement` (a `createElementNS` helper).
  - `Bar.svg.piece(kind, color) → SVGGElement` for `'mint' | 'basil' | 'lemon' | 'honey' | 'pineapple' | 'ice' | 'splash'`. The group is drawn centered on (0,0), about 24px in size.

```js
Bar.svg.GLASSES = {
  highball: { outline: 'M60 50 L140 50 L135 272 Q134 280 126 280 L74 280 Q66 280 65 272 Z',
              inner:   'M64 54 L136 54 L131 270 L69 270 Z', top: 60, bottom: 270 },
  rocks:    { outline: 'M45 140 L155 140 L149 272 Q148 280 140 280 L60 280 Q52 280 51 272 Z',
              inner:   'M49 144 L151 144 L145 268 L55 268 Z', top: 150, bottom: 268 },
  coupe:    { outline: 'M35 100 Q100 215 165 100 Z', inner: 'M40 104 Q100 205 160 104 Z',
              top: 106, bottom: 158,
              extra: '<path d="M100 157 L100 262" /><ellipse cx="100" cy="266" rx="38" ry="7" />' }
};
```

- [ ] **Step 1:** Write `Bar.svg.el` and `GLASSES` as shown.
- [ ] **Step 2:** Write `piece(kind, color)`:
  - mint and basil: a leaf path `M0 -12 C10 -6 10 6 0 12 C-10 6 -10 -6 0 -12Z` with a center vein. Mint uses fill `#5DBB63`, basil uses `#3F8F3A` and is drawn 1.3× larger.
  - lemon: a circle r=12 with fill `#F4D35E`, plus 6 segment lines and a pale rim stroke.
  - honey: a teardrop path filled `#E8A93B`.
  - pineapple: a rounded square with fill `#F7C948` and a cross-hatch pattern.
  - ice: a rounded rect 22×22 with fill `rgba(220,240,255,.35)`, stroke `rgba(255,255,255,.7)` and a highlight line.
  - splash: 3 small drops filled with `color`.
- [ ] **Step 3: Verify.** In the browser console, run `document.body.append(Object.assign(Bar.svg.el('svg',{viewBox:'-20 -20 240 40',width:480}), {}))`, then append each piece at x offsets of 30 and look at the screenshot. All 7 pieces should be recognizable. Remove the test SVG afterwards.

---

### Task 3: The stage (pinned glass with 4 drink groups)

**Files:**
- Create: `js/stage.js`

**Interfaces:**
- Consumes: `Bar.svg.*`, `Bar.COCKTAILS`
- Produces: `Bar.createStage(svgEl) → { groups: Array<DrinkGroup>, glowEl: HTMLElement }`, where

```js
DrinkGroup = {
  g: SVGGElement,          // whole glass group, starts at opacity 0
  liquid: SVGRectElement,  // clipped to glass inner; animate attr y/height
  surface: SVGEllipseElement,
  pieces: SVGGElement[],   // one per ingredient, parked at y=-60 (above view)
  restPoints: {x,y}[],     // where each piece lands
  levelY: (fraction) => number,  // fraction 0..1 → liquid top y
  fx: { drip?, cubes?, foam?, bubbles? } // effect elements, by drink effect
}
```

- [ ] **Step 1:** For each cocktail i, build `<g class="glass-set" data-index=i opacity="0">` containing:
  - a `clipPath#clip-i` using the glass `inner` path;
  - a liquid `rect` (x 0, width 200, y = bottom, height 0) filled with the drink color at 0.85 opacity and clipped;
  - a surface ellipse (rx 0 until it is filled);
  - the ingredient pieces, also clipped;
  - the glass `outline` path (fill `rgba(255,255,255,.05)`, stroke `rgba(255,255,255,.55)`, stroke-width 2) plus `extra`;
  - a shine path (a white line at opacity .25 along the left inner edge);
  - 3 condensation droplets (small ellipses at opacity .4).
- [ ] **Step 2:** `levelY(f) = bottom - f * (bottom - top)`. Rest points are staggered upward from the bottom: `y = bottom - 14 - j * ((bottom - top) * 0.5 / n)`, with x alternating ±15 around 100.
- [ ] **Step 3:** Build the effect elements:
  - honeyDrip: a path along the inner left rim with `stroke-dasharray`/`dashoffset` set to its length.
  - iceClink: 3 ice pieces placed in the liquid.
  - shakeFoam: a cream-colored ellipse (`#F6F1E1`) at the liquid top, `scaleY 0`.
  - bubbles: 10 small circles (r 1.5–3) at the bottom, opacity 0.
- [ ] **Step 4: Verify.** From main.js, call `Bar.createStage(document.getElementById('stage-glass'))` and temporarily set group 0's opacity to 1 and its liquid to `levelY(0.7)`. The screenshot should show a highball glass with gold liquid that stays inside the glass outline. Then revert the temporary code.

---

### Task 4: Scroll-to-build timelines

**Files:**
- Create: `js/scroll.js`
- Modify: `js/main.js` (call `Bar.initScroll(stage)`)

**Interfaces:**
- Consumes: the `DrinkGroup` objects from Task 3 and the `section.drink` elements from Task 1
- Produces: `Bar.initScroll(stage, { reduced: boolean }) → void`

- [ ] **Step 1:** Run `gsap.registerPlugin(ScrollTrigger)`. For each section i, create `gsap.timeline({ scrollTrigger: { trigger: section, start: 'top center', end: 'bottom center', scrub: 0.6, onToggle: self => self.isActive && activate(i) } })`.
- [ ] **Step 2:** `activate(i)` does three things:
  - fades the other groups to opacity 0 with scale 0.9, and fades group i to opacity 1 with scale 1 (0.5s; `transformOrigin: '50% 100%'`);
  - sets `--accent` on `document.documentElement` to the drink color;
  - starts the bubbles loop when the effect is `bubbles`, and pauses it otherwise.
- [ ] **Step 3:** Timeline content per ingredient j, at position `j`:
  - `fromTo(piece, { y: -60, rotation: -30 }, { x: rest.x, y: rest.y, rotation: random(-20, 20), ease: 'power2.in', duration: 0.8 })`;
  - `to(liquid, { attr: { y: levelY((j+1)/n * 0.85), height: ... }, duration: 0.8 }, '<')`;
  - `to(li[j], { opacity: 1, color: drink.color, duration: 0.2 }, '<0.6')`.
- [ ] **Step 4:** Add the signature effect at the end of the timeline:
  - honeyDrip: animate `strokeDashoffset` to 0.
  - iceClink: `rotation: ±6` with `yoyo` and `repeat: 3` on the cubes.
  - shakeFoam: `x: ±6` with `repeat: 7` and `yoyo` on the group, then foam `scaleY: 1`.
  - bubbles: the loop `gsap.to(bubble, { y: -(bottom - top), opacity: 0, repeat: -1, delay: random, duration: random(1.5, 3) })` is created paused and controlled by `activate`.
- [ ] **Step 5:** If `reduced` is true, give the scroll triggers no scrub: each `onToggle` jumps its timeline to `progress(1)`, and the shake effect is skipped.
- [ ] **Step 6: Verify.** Scroll slowly through all four sections and check that:
  - the pieces fall in order;
  - the matching list items light up;
  - the liquid rises and changes color;
  - each signature effect plays.

  Then scroll back up and confirm everything reverses with no leftover pieces. The console must show 0 errors.

---

### Task 5: Preloader ("drop and fill")

**Files:**
- Create: `js/preloader.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `Bar.svg.GLASSES.highball`, `Bar.svg.piece('ice')`
- Produces: `Bar.runPreloader({ target: SVGElement, reduced: boolean }) → Promise<void>`. The promise resolves once the overlay is removed and `body.is-loading` is cleared.

- [ ] **Step 1:** Build the loader glass in `#loader-glass`: a highball with liquid in the honey color (the first drink's color) and two ice pieces parked at y = -80.
- [ ] **Step 2:** Run a GSAP timeline:
  - cube 1 drops to rest (0.7s, `power2.in`), then splashes: 5 droplets fan out over 0.4s and fade, and a ripple ellipse grows `rx` 0→40 and fades;
  - at +0.6s, cube 2 drops; on impact, cube 1 nudges with `x: 4` (yoyo), followed by a smaller splash.
- [ ] **Step 3:** Progress:
  - `const ready = Promise.all([document.fonts.ready, new Promise(r => addEventListener('load', r, { once: true }))])`. Resolve immediately when `document.readyState === 'complete'`.
  - `const minTime = wait(2500)`.
  - `const gate = Promise.race([Promise.all([ready, minTime]), wait(6000)])`.
  - Tween a proxy `{ p: 0 }` to 0.9 over 2.5s. On each update, set the liquid level and `#loader-pct`. After `gate` resolves, tween to 1.
- [ ] **Step 4:** The reveal: measure `target.getBoundingClientRect()` and `loaderSvg.getBoundingClientRect()`. Tween `loaderSvg` with `x/y/scale` to match the target (0.9s, `power3.inOut`) while the overlay background fades. Then remove `#preloader`, remove `body.is-loading`, and run `ScrollTrigger.refresh()`.
- [ ] **Step 5:** When `reduced` is true, skip the cubes and the morph: fade the overlay out over 0.5s once `ready` resolves.
- [ ] **Step 6:** In main.js, `body.is-loading` sets `overflow: hidden` in CSS. Initialization order:
  1. `const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches`
  2. render the sections
  3. `const stage = Bar.createStage(...)`
  4. `Bar.initScroll(stage, { reduced })`
  5. `await Bar.runPreloader({ target: stageSvg, reduced })`
- [ ] **Step 7: Verify.** Reload and check that:
  - the cubes drop one after the other with splashes;
  - the percentage counts to 100;
  - the full preloader takes at least 2.5s;
  - the glass glides into the stage glass position before the page appears;
  - the page cannot scroll while loading.

  Then emulate reduced motion and confirm the overlay simply fades.

---

### Task 6: Polish and final QA

**Files:**
- Modify: `styles.css`, `js/stage.js` (only small tweaks found during QA)

- [ ] **Step 1:** Add a gentle wobble to the liquid surface: a looping GSAP tween of the surface ellipse's `ry` between 3 and 5 (`yoyo`, `sine.inOut`). It is disabled when `reduced` is true.
- [ ] **Step 2:** Hero styling: large italic serif `h1` sized with `clamp(3rem, 9vw, 7rem)`, and a "Scroll" hint with a bouncing chevron (CSS keyframes, disabled under reduced motion).
- [ ] **Step 3:** Run through the QA checklist:
  - [ ] 1440px: two-column layout; the glass stays pinned on the right; text is readable.
  - [ ] 375px: glass pinned in the top half; cards scroll beneath it; no horizontal scroll.
  - [ ] Scroll top→bottom→top twice and confirm no stuck states.
  - [ ] Console shows 0 errors.
  - [ ] Reduced motion shows all the content without falling or shaking.
  - [ ] All 4 names and taglines match the Global Constraints verbatim.
