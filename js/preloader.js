(function () {
  const { el, piece, GLASSES, halfWidth, levelY } = Bar.svg;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // Two ice cubes drop into a glass that fills up as the page loads.
  // Resolves once the overlay is gone and scrolling is enabled again.
  Bar.runPreloader = function (opts) {
    const waitFor = opts.waitFor || null;
    const reduced = !!opts.reduced;
    const overlay = document.getElementById('preloader');
    const loader = document.getElementById('loader-glass');
    const label = overlay.querySelector('.loader-label');
    const pctEl = document.getElementById('loader-pct');

    const ready = Promise.all([
      waitFor,
      document.fonts ? document.fonts.ready : null,
      document.readyState === 'complete' ? null : new Promise(r => addEventListener('load', r, { once: true }))
    ]);
    const finish = () => {
      overlay.remove();
      document.body.classList.remove('is-loading');
      ScrollTrigger.refresh();
    };

    if (reduced) {
      return Promise.race([ready, wait(2000)])
        .then(() => gsap.to(overlay, { opacity: 0, duration: 0.5 }))
        .then(finish);
    }

    const G = GLASSES.highball;
    const color = Bar.COCKTAILS[0].color;
    const hw = y => halfWidth('highball', y);

    // --- build the loader glass (same artwork as the stage glass) ---
    const defs = el('defs');
    const clip = el('clipPath', { id: 'loader-clip' });
    clip.appendChild(el('path', { d: G.inner }));
    defs.appendChild(clip);
    const wet = el('g', { 'clip-path': 'url(#loader-clip)' });
    const liquid = el('rect', { x: 0, width: 200, y: G.bottom, height: 10, fill: color, opacity: 0.88 });
    const surface = el('ellipse', { cx: 100, cy: G.bottom, rx: 0, ry: 4, fill: 'rgba(255,255,255,.22)' });
    wet.append(liquid, surface);

    const fxLayer = el('g');
    // six cubes that pile up in the glass (x, resting y, tilt)
    const cubes = [
      [85, 257, -6], [111, 257, 8],
      [91, 232, 10], [117, 232, -9],
      [88, 207, -12], [114, 207, 6]
    ].map(([x, y, rot]) => {
      const node = piece('ice');
      gsap.set(node, { x, y: -60, scale: 1.15, rotation: rot, opacity: 0 });
      return { node, x, y };
    });

    const body = el('g', { fill: 'rgba(255,255,255,.05)', stroke: 'rgba(255,255,255,.55)', 'stroke-width': 2, 'stroke-linejoin': 'round' });
    body.appendChild(el('path', { d: G.outline }));
    const shine = el('path', { d: G.shine, stroke: '#fff', 'stroke-opacity': 0.25, 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none' });
    loader.append(defs, wet, ...cubes.map(c => c.node), fxLayer, body, shine);

    // --- progress -> liquid level ---
    const state = { p: 0 };
    function render() {
      const f = 0.1 + 0.75 * state.p;
      const y = levelY(G, f);
      liquid.setAttribute('y', y);
      liquid.setAttribute('height', G.bottom - y + 10);
      surface.setAttribute('cy', y);
      surface.setAttribute('rx', hw(y));
      pctEl.textContent = Math.round(Math.min(1, state.p) * 100);
    }
    render();

    function surfaceY() { return parseFloat(surface.getAttribute('cy')); }

    function splash(cx, power) {
      const sy = surfaceY();
      const ripple = el('ellipse', { cx: 100, cy: sy, rx: 4, ry: 2, fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 1.5, opacity: 0.8 });
      fxLayer.appendChild(ripple);
      gsap.to(ripple, { attr: { rx: hw(sy) * 0.9, ry: 4 }, opacity: 0, duration: 0.7, ease: 'power1.out', onComplete: () => ripple.remove() });
      for (let k = 0; k < 6; k++) {
        const drop = el('circle', { r: 2.4, fill: color });
        fxLayer.appendChild(drop);
        const dx = (k - 2.5) * 7 * power;
        const up = (16 + (k % 3) * 8) * power;
        gsap.timeline({ onComplete: () => drop.remove() })
          .fromTo(drop, { x: cx, y: sy, opacity: 1 }, { x: cx + dx / 2, y: sy - up, duration: 0.25, ease: 'power2.out' })
          .to(drop, { x: cx + dx, y: sy, opacity: 0, duration: 0.25, ease: 'power2.in' });
      }
    }

    // cubes drop one after another; each splashes the moment it reaches the surface
    const tl = gsap.timeline();
    cubes.forEach((cube, k) => {
      const start = 0.2 + k * 0.33;
      let hit = false;
      tl.fromTo(cube.node, { y: -60, opacity: 0 }, {
        y: cube.y, opacity: 1, duration: 0.7, ease: 'power2.in',
        onUpdate() {
          if (!hit && gsap.getProperty(cube.node, 'y') >= surfaceY() - 4) {
            hit = true;
            splash(cube.x, Math.max(0.5, 1 - k * 0.1));
          }
        }
      }, start);
      if (k > 0) {
        // the cube below gets nudged when the next one lands
        tl.to(cubes[k - 1].node, { rotation: '+=5', duration: 0.1, yoyo: true, repeat: 1 }, start + 0.7);
      }
    });

    const climb = gsap.to(state, { p: 0.9, duration: 2.5, ease: 'power1.out', onUpdate: render });

    // --- wait for the page, but never less than 2.5s or more than 6s ---
    const gate = Promise.race([Promise.all([ready, wait(2500)]), wait(6000)]);

    return gate.then(() => new Promise(resolve => {
      climb.kill();
      gsap.to(state, { p: 1, duration: 0.4, ease: 'none', onUpdate: render, onComplete: resolve });
    })).then(() => wait(250)).then(() => {
      // Clear the loader in place so the stage glass is revealed without a handoff.
      return new Promise(resolve => {
        gsap.timeline({ onComplete: resolve })
          .to(label, { opacity: 0, duration: 0.25 }, 0)
          .to(loader, { opacity: 0, duration: 0.45 }, 0.05)
          .to(overlay, { backgroundColor: 'rgba(14,12,11,0)', duration: 0.7 }, 0.1);
      });
    }).then(finish);
  };
})();
