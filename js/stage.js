(function () {
  const { el, piece, GLASSES, halfWidth, levelY, tint } = Bar.svg;

  const GLASS_ATTRS = { fill: 'rgba(255,255,255,.05)', stroke: 'rgba(255,255,255,.55)', 'stroke-width': 2, 'stroke-linejoin': 'round' };

  // Builds one glass group per cocktail inside `svg`.
  // Returns { groups: DrinkGroup[], glowEl }.
  Bar.createStage = function (svg, opts) {
    const reduced = !!(opts && opts.reduced);
    const defs = el('defs');
    svg.appendChild(defs);

    const groups = Bar.COCKTAILS.map((c, i) => {
      const G = GLASSES[c.glass];
      const fy = f => levelY(G, f);
      const hw = y => halfWidth(c.glass, y);
      const g = el('g', { class: 'glass-set', 'data-index': i });

      const clip = el('clipPath', { id: 'clip-' + i });
      clip.appendChild(el('path', { d: G.inner }));
      defs.appendChild(clip);

      // --- liquid (clipped to the inside of the glass) ---
      const wet = el('g', { 'clip-path': `url(#clip-${i})` });
      const tintColor = tint(c.color, 0.55);
      const liquid = el('rect', { x: 0, width: 200, y: G.bottom, height: 10 });
      liquid.style.fill = tintColor;
      liquid.style.opacity = 0.88;
      const surface = el('ellipse', { cx: 100, cy: G.bottom, rx: hw(G.bottom - 1), ry: 4, fill: 'rgba(255,255,255,.22)', opacity: 0 });
      wet.append(liquid, surface);

      const fullY = fy(0.85);
      let foam = null;
      if (c.effect === 'shakeFoam') {
        foam = el('ellipse', { cx: 100, cy: fullY, rx: hw(fullY), ry: 6, fill: '#F6F1E1', opacity: 0 });
        wet.appendChild(foam);
      }

      const bubbleTweens = [];
      let bubblesG = null;
      if (c.effect === 'bubbles') {
        bubblesG = el('g', { opacity: 0 });
        const span = (G.bottom - fullY) - 6;
        for (let b = 0; b < 10; b++) {
          const r = 1.5 + (b % 3) * 0.75;
          const bubble = el('circle', { cx: 80 + ((b * 37) % 40), cy: G.bottom - 8, r, fill: 'rgba(255,255,255,.7)' });
          bubblesG.appendChild(bubble);
          bubbleTweens.push(gsap.fromTo(bubble,
            { y: 0, opacity: 0.8 },
            { y: -span, opacity: 0, duration: 1.6 + (b % 4) * 0.45, delay: (b * 0.37) % 2, ease: 'none', repeat: -1, paused: true }));
        }
        wet.appendChild(bubblesG);
      }
      g.appendChild(wet);

      // --- falling ingredient pieces ---
      const piecesG = el('g');
      const n = c.ingredients.length;
      const step = (G.bottom - G.top) * 0.45 / n;
      const spread = c.glass === 'coupe' ? 9 : 15;
      const pieces = [];
      const rest = [];
      c.ingredients.forEach((ing, j) => {
        const p = piece(ing.piece, c.color);
        const r = { x: 100 + (j % 2 ? spread : -spread), y: G.bottom - 14 - j * step, rot: ((j * 47) % 50) - 25 };
        gsap.set(p, { x: r.x, y: -40, rotation: -40, opacity: 0 });
        piecesG.appendChild(p);
        pieces.push(p);
        rest.push(r);
      });
      g.appendChild(piecesG);

      // --- signature effect elements ---
      const fx = {};
      if (c.effect === 'honeyDrip') {
        fx.drip = el('path', {
          d: 'M66 56 C66 76 69 92 68 112', pathLength: 1, fill: 'none',
          stroke: '#FFD27A', 'stroke-width': 5, 'stroke-linecap': 'round',
          'stroke-dasharray': 1, 'stroke-dashoffset': 1
        });
        g.appendChild(fx.drip);
      }
      if (c.effect === 'iceClink') {
        fx.cubes = [[80, 256, -8], [112, 250, 10], [96, 232, 4]].map(pt => {
          const cube = piece('ice');
          gsap.set(cube, { x: pt[0], y: pt[1], rotation: pt[2], opacity: 0 });
          g.appendChild(cube);
          return cube;
        });
        fx.rimLemon = piece('lemon');
        gsap.set(fx.rimLemon, { x: 150, y: 142, scale: 0, opacity: 1 });
        g.appendChild(fx.rimLemon);
      }

      // --- glass body on top ---
      const body = el('g', GLASS_ATTRS);
      body.appendChild(el('path', { d: G.outline }));
      if (G.extra) {
        const extra = el('g');
        extra.innerHTML = G.extra;
        body.appendChild(extra);
      }
      g.appendChild(body);
      g.appendChild(el('path', { d: G.shine, stroke: '#fff', 'stroke-opacity': 0.25, 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none' }));

      // condensation droplets
      [G.top + 30, G.top + 85, G.top + 135].forEach((y, k) => {
        if (y > G.bottom - 10) return;
        const d = el('ellipse', { class: 'drop', cx: 100 + hw(y) - 5, cy: y, rx: 1.8, ry: 2.6 });
        d.style.animationDelay = (-k * 2.3) + 's';
        g.appendChild(d);
      });

      svg.appendChild(g);
      gsap.set(g, { svgOrigin: '100 285', opacity: i === 0 ? 1 : 0 });

      // gentle wobble of the liquid surface
      if (!reduced) {
        gsap.to(surface, { attr: { ry: 5.5 }, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      }

      return {
        g, liquid, surface, foam, bubblesG, fx, pieces, rest,
        glass: G, color: c.color, tint: tintColor,
        levelY: fy, halfWidth: hw,
        setBubbles(on) { bubbleTweens.forEach(t => (on ? t.play() : t.pause())); }
      };
    });

    return { kind: 'svg', groups, glowEl: document.querySelector('.stage .glow') };
  };
})();
