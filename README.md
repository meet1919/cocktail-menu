# Sip Happens

A single-page cocktail menu. An ice-cube preloader leads into a scroll-driven page where each drink builds itself in one pinned glass.

Plain HTML, CSS and JavaScript, with GSAP and ScrollTrigger loaded from a CDN. No build step.

## Run locally

```bash
python -m http.server 5188
```

Then open http://localhost:5188.

## 3D glass

On most devices the glass is a real-time 3D scene (Three.js for rendering, cannon-es for physics). Scroll to drop each ingredient in, and drag on the glass to rotate it. Tap the glass to nudge what's inside.

The original SVG glass is the automatic fallback: it is used when WebGL2 is unavailable, when the visitor prefers reduced motion, on low-power devices, or if the 3D libraries fail to load.

Useful URL switches:

- `?3d=0` forces the SVG glass.
- `?3d=1` forces the 3D glass.
- `?hq=1` turns off the automatic quality drop (for testing).
