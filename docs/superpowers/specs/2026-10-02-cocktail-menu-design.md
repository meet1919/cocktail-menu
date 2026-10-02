# Cocktail Menu — Design Spec

**Date:** 2026-10-02
**Deliverable:** A single-page animated cocktail menu (HTML + CSS + JS)

## 1. Goal

A one-page cocktail menu with a dark bar mood. It starts with a preloader in which ice cubes drop into a glass. After that, scrolling through the page builds each cocktail inside one fixed glass. It should feel smooth and polished on desktop and on phones.

## 2. The cocktails

| # | Name | Tagline | Ingredients (in order they drop) | Method | Glass | Liquid color | Signature effect |
|---|---|---|---|---|---|---|---|
| 1 | **Honey Garden** | Gin, honey and fresh mint | Mint leaves → honey → gin → ice | Muddle mint, build over ice | Highball | Honey gold `#E8A93B` | Honey drips slowly down the inside of the rim |
| 2 | **Whiskey Kick** | Whiskey with a fresh lemon kick | Mint → 30ml lemon → 30ml simple syrup → 60ml whiskey | Build over ice | Rocks glass | Amber `#C2691F` | Ice cubes clink, lemon wheel spins onto the rim |
| 3 | **Basil Breeze** | Gin, basil and lemon, shaken cold | Basil leaves → lemon → 15ml simple syrup → gin → ice | Muddle basil, shake with ice, strain | Coupe | Basil green `#7FB43A` | Glass shakes briefly, then a soft foam layer forms on top |
| 4 | **Pineapple Sunset** | Tequila, pineapple and ginger fizz | Pineapple chunks → lemon → mint → tequila → ginger lemon soda | Muddle pineapple, lemon, mint; top with soda | Highball | Sunset orange `#F2A33A` | Bubbles rise and pop at the surface |

Amounts are shown only where the recipe gives them. Ingredients without an amount are shown without one.

## 3. Preloader — "drop and fill"

- A full-screen dark overlay with an empty SVG glass in the center.
- **Cube 1** drops with gravity easing, makes a small splash (4–6 droplets) and a ripple ellipse.
- **Cube 2** follows about 0.6s later, bumps cube 1 slightly, and makes a smaller splash.
- The liquid rises from the bottom as a progress indicator. It is tied to `document.fonts.ready` and `window.load`, with a **minimum duration of 2.5s** so the animation always finishes.
- Under the glass, a small "Pouring…" label shows the percentage.
- When the glass is full, the preloader glass moves into the position of the main page's fixed glass, then the overlay fades out. The two read as one continuous glass.
- Failsafe: if loading takes longer than 6s, finish and reveal the page anyway.

## 4. Main page — "scroll to build"

### Structure (top to bottom)
1. **Hero:** The bar name (placeholder: "The Ice Cube Bar", easy to change), a short tagline, a soft colored glow behind the glass, and a "scroll" hint.
2. **Four cocktail sections:** About 150vh each, so there is room for the ingredients to drop as you scroll.
3. **Footer:** A short closing line ("Cheers!").

### The fixed glass
- One SVG glass stays fixed (pinned) on screen. On desktop it sits on the right with the text on the left. On phones it sits in the top half of the screen with the text scrolling below it.
- At the start of each section the glass changes shape (highball → rocks → coupe → highball). The old glass fades and scales down while the new one fades and scales up, and the liquid empties.
- Inside each section, scroll progress drives the following:
  - Each ingredient falls into the glass as an SVG piece, one after another.
  - The matching line in the ingredient list on the side lights up as its ingredient lands.
  - The liquid level rises step by step, and its color shifts to the cocktail's color.
  - The drink's signature effect (see the table above) plays near the end of the section.
- The background glow behind the glass changes to the current cocktail's color.

### Ingredient pieces (inline SVG)
Mint leaf, basil leaf, lemon wheel, honey drop, pineapple chunk, ice cube, and a generic "liquid splash" for poured spirits and syrups.

## 5. Look and feel

- **Background:** near-black `#0E0C0B`, with a soft radial spotlight behind the glass and a light grain texture (CSS noise).
- **Type:** *Cormorant Garamond* for headings, *Inter* for body text (Google Fonts).
- **Accent:** warm cream text `#F3E9DC`. Each cocktail's color is used for highlights.
- **Details:** Condensation drops on the glass, a gentle wobble in the liquid surface, and a subtle shine on the glass.

## 6. Tech

- Files: `index.html`, `styles.css`, `script.js`. No build step.
- Libraries: **GSAP + ScrollTrigger** from cdnjs. Everything else is vanilla JS and inline SVG. No image files.
- The cocktail data lives in one JS array (name, tagline, glass, color, ingredients, effect), so drinks are easy to edit or add.
- **Reduced motion:** If `prefers-reduced-motion` is set, the preloader becomes a quick 0.5s fade and ingredients appear without falling or shaking.
- **Accessibility:** Each section holds real text (name, tagline, ingredient list), so the menu still makes sense without the animations. Decorative SVGs use `aria-hidden`.

## 7. Testing

- Check it in a browser at desktop width (1440px) and phone width (375px).
- Confirm that the preloader always finishes, that scrolling forward and backward animates correctly in both directions, and that the console has no errors.
- Check that reduced-motion mode shows all the content.

## 8. Out of scope

Prices, ordering, multiple pages, a CMS, and sound.
