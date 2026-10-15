# Browse All Cocktails ("Pour the menu") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A hero button that "pours" a liquid wave over the page and opens a full-screen browse view of all ten cocktails, six of them new.

**Architecture:** `data.js` gains `spirit` and `featured` fields and a derived `Bar.FEATURED` list. The scroll menu, SVG stage and 3D stage read only `Bar.FEATURED`; a new `js/browse.js` reads `Bar.COCKTAILS`. The wave is one SVG path with two wavy edges (top edge rises, then bottom edge rises), driven by GSAP. The 3D glass tips via a new `director.tilt(on)`.

**Tech Stack:** Vanilla JS, GSAP 3.12 (already loaded), inline SVG, CSS. No build step, no test runner (verification is manual in the browser).

**Spec:** the approved design in chat on 2026-10-15 (no separate spec file; the Architecture and Global Constraints below carry it).

## Global Constraints

- Scroll menu stays the four featured drinks (`featured: true`); it must not grow.
- Reuse glass types `highball`, `rocks`, `coupe`; effects `honeyDrip`, `iceClink`, `shakeFoam`, `bubbles`; pieces `ice`, `lemon`, `mint`, `basil`, `pineapple`, `honey`, `splash`.
- Fonts, colours and grain come from the existing CSS variables (`--bg`, `--text`, `--muted`, `--accent`, `--serif`, `--sans`).
- Do not touch the user's uncommitted 3D work other than the one `tilt` hook in `director.js`; do not commit.
- `prefers-reduced-motion`: no wave, plain fade. GSAP missing: overlay still opens (no animation).
- Dialog a11y: `role="dialog"`, `aria-modal`, Esc closes, `inert` on page content while open, focus returns to the button.

## Review Focus

- Open, close, then open again quickly (double-click, Esc mid-transition) must not leave the overlay or body lock stuck.
- A featured drink's "Watch it being made" must jump to its scroll section and leave the page scrollable.
- A filter with one result, and switching filters repeatedly, must not leave cards hidden or half-faded.
- Phone width (375px): grid and detail sheet fit with no horizontal scroll.
- Escape inside the detail sheet closes only the sheet, not the whole overlay.

---

### Task 1: Data — fields, six new drinks, FEATURED

**Files:** Modify `js/data.js`, `js/main.js:8`, `js/scroll.js:10,14,50,110`, `js/stage.js:13`, `js/load3d.js:23`.

**Interfaces:** Produces `Bar.COCKTAILS` (10 items, each with `spirit: string`, `featured?: true`) and `Bar.FEATURED = Bar.COCKTAILS.filter(c => c.featured)`.

- [ ] Add `spirit` to the four existing drinks (Gin, Whiskey, Gin, Tequila) and `featured: true`.
- [ ] Append the six drinks: Wide Awake (Vodka, coupe), Mint Condition (Rum, highball), Side Hustle (Brandy, coupe), Spritz Happens (Prosecco, highball), Smoke Signal (Mezcal, rocks), Old Faithful (Whiskey, rocks).
- [ ] Define `Bar.FEATURED` at the bottom of `data.js`.
- [ ] Replace `Bar.COCKTAILS` with `Bar.FEATURED` in `main.js`, `scroll.js`, `stage.js`, `load3d.js`.
- [ ] Verify in the browser: scroll menu still has exactly 4 sections and works; console has no errors.

### Task 2: Markup — hero button, overlay, wave

**Files:** Modify `index.html`.

- [ ] Add `<div class="hero-cta"><button id="browse-open" class="browse-btn" type="button" aria-haspopup="dialog">…</button></div>` between `.hero-tag` and `.scroll-hint`.
- [ ] Add `#browse` dialog (header with title + close button, `#browse-filters`, `#browse-grid`, `#browse-detail`) and `#pour` wave container before the footer.
- [ ] Add `<script src="js/browse.js"></script>` before `js/main.js`.

### Task 3: Styles

**Files:** Modify `styles.css` (append a new section; do not edit existing rules).

- [ ] Button: outline pill, liquid fill rising on hover/focus with an animated wave edge, count badge.
- [ ] `#pour` (fixed, `z-index: 45`, `pointer-events: none`), `#browse` (fixed, `z-index: 40`, scrolls, hidden by default), chips, card grid (`auto-fill, minmax(210px, 1fr)`), card glass slosh animation, detail sheet.
- [ ] `body.is-browsing { overflow: hidden }`, phone rules (2 then 1 columns), reduced-motion rules.

### Task 4: `js/browse.js`

**Files:** Create `js/browse.js`.

**Interfaces:** Produces `Bar.browse = { init({ reduced }), open(), close() }`. Consumes `Bar.COCKTAILS`, `Bar.stage` (optional), `gsap` (optional).

- [ ] `glassSVG(c, size)`: returns SVG for the three glass shapes with a clipped, wavy liquid in `c.color`.
- [ ] Render chips (unique `spirit` values in data order) and cards; filter with a quick fade.
- [ ] Detail sheet: name, tagline, method, ingredients, big glass; featured drinks get "Watch it being made".
- [ ] Wave timeline: `open()` raises top edge, shows overlay, raises bottom edge, staggers cards in; `close()` runs it in reverse. Guard with an `animating` flag; queue the latest request.
- [ ] Keyboard: Esc closes the detail first, then the overlay. `inert` on `.menu` and `.footer` while open; focus the title on open, restore on close.
- [ ] Tilt the glass (3D: `director.tilt`, SVG: GSAP rotate) when opening, right it on close.

### Task 5: 3D tilt hook

**Files:** Modify `js/stage3d/director.js` (add `api.tilt`, before `api.nudge`).

**Interfaces:** Produces `director.tilt(on: boolean)`.

- [ ] Tween the active glass group `rotation.z` to `0.55` (on) or `0` (off).

### Task 6: Verify

- [ ] Desktop (1440px): hover the button, open, filter, open a detail, close; jump to a featured drink; check the scroll menu is intact.
- [ ] Phone (375px): no horizontal scroll, grid readable, detail sheet fits.
- [ ] Reduced motion and `?3d=0` (SVG stage) both open and close cleanly.
- [ ] Console has no errors.
