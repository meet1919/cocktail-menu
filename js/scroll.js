(function () {
  // One scrubbed timeline per drink section. Scrolling forward builds the drink,
  // scrolling back takes it apart again.
  // 3D stage: each section reports its scroll progress to the director, which
  // decides which ingredients are in the glass.
  function initScroll3D(stage) {
    gsap.registerPlugin(ScrollTrigger);
    const sections = gsap.utils.toArray('.drink');
    const d = stage.director;
    const accent = i => document.documentElement.style.setProperty('--accent', Bar.COCKTAILS[i].color);

    d.onIngredient = (i, j, on) => {
      const li = sections[i].querySelectorAll('li')[j];
      if (li) gsap.to(li, { opacity: on ? 1 : 0.35, color: on ? Bar.COCKTAILS[i].color : '#F3E9DC', duration: 0.3, overwrite: 'auto' });
    };
    const triggers = [];
    // switch drinks, then apply the current progress straight away (a fast jump can
    // deliver the progress update before the switch)
    const activate = i => { d.setActive(i); accent(i); if (triggers[i]) d.update(i, triggers[i].progress); };

    sections.forEach((section, i) => {
      triggers[i] = ScrollTrigger.create({
        trigger: section, start: 'top 50%', end: 'bottom 80%',
        onEnter: () => activate(i),
        onEnterBack: () => activate(i),
        onLeaveBack: () => activate(Math.max(0, i - 1)),
        onUpdate: self => d.update(i, self.progress)
      });
    });
    accent(0);
  }

  Bar.initScroll = function (stage, opts) {
    const reduced = !!(opts && opts.reduced);
    if (stage.kind === '3d') return initScroll3D(stage);
    gsap.registerPlugin(ScrollTrigger);

    const sections = gsap.utils.toArray('.drink');
    let current = -1;

    function activate(i) {
      if (i === current) return;
      current = i;
      stage.groups.forEach((d, k) => {
        const on = k === i;
        gsap.to(d.g, { opacity: on ? 1 : 0, scale: on ? 1 : 0.92, duration: reduced ? 0 : 0.5, overwrite: 'auto' });
        d.setBubbles(on && !reduced);
      });
      document.documentElement.style.setProperty('--accent', Bar.COCKTAILS[i].color);
    }

    function build(d, c, section) {
      const G = d.glass;
      const lis = section.querySelectorAll('li');
      const n = c.ingredients.length;
      const lvl = j => G.bottom - (0.85 * j / n) * (G.bottom - G.top);
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

      // liquid colour: pale at first, full colour once everything is in
      tl.fromTo(d.liquid, { fill: d.tint }, { fill: c.color, duration: n }, 0);
      tl.fromTo(d.surface, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.8);

      c.ingredients.forEach((ing, j) => {
        const p = d.pieces[j];
        const rest = d.rest[j];
        tl.fromTo(p, { y: -40, rotation: -40 }, { y: rest.y, rotation: rest.rot, duration: 0.8, ease: 'power2.in' }, j);
        tl.fromTo(p, { opacity: 0 }, { opacity: 1, duration: 0.15 }, j);
        if (ing.piece === 'splash' || ing.piece === 'honey') {
          tl.to(p, { opacity: 0, duration: 0.3 }, j + 0.8);
        }

        const y0 = lvl(j), y1 = lvl(j + 1);
        tl.fromTo(d.liquid,
          { attr: { y: y0, height: G.bottom - y0 + 10 } },
          { attr: { y: y1, height: G.bottom - y1 + 10 }, duration: 0.5, ease: 'power1.inOut', immediateRender: j === 0 },
          j + 0.8);
        tl.fromTo(d.surface,
          { attr: { cy: y0, rx: d.halfWidth(y0) } },
          { attr: { cy: y1, rx: d.halfWidth(y1) }, duration: 0.5, ease: 'power1.inOut', immediateRender: j === 0 },
          j + 0.8);

        if (lis[j]) {
          tl.fromTo(lis[j], { opacity: 0.35, color: '#F3E9DC' }, { opacity: 1, color: c.color, duration: 0.2 }, j + 0.8);
        }
      });

      // signature effect
      const T = n + 0.4;
      if (c.effect === 'honeyDrip') {
        tl.fromTo(d.fx.drip, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2 }, T);
      } else if (c.effect === 'iceClink') {
        d.fx.cubes.forEach((cube, k) => {
          const y = gsap.getProperty(cube, 'y');
          tl.fromTo(cube, { y: y - 90, opacity: 0 }, { y, opacity: 1, duration: 0.5, ease: 'bounce.out' }, T + k * 0.15);
          tl.to(cube, { rotation: '+=8', duration: 0.12, yoyo: true, repeat: 3, ease: 'sine.inOut' }, T + 0.7 + k * 0.05);
        });
        tl.fromTo(d.fx.rimLemon, { scale: 0, rotation: -200 }, { scale: 1.5, rotation: 0, duration: 0.8, ease: 'back.out(1.6)' }, T + 0.5);
      } else if (c.effect === 'shakeFoam') {
        if (!reduced) tl.to(d.g, { x: 6, duration: 0.08, yoyo: true, repeat: 9, ease: 'sine.inOut' }, T);
        tl.fromTo(d.foam, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.6 }, T + (reduced ? 0 : 0.8));
      } else if (c.effect === 'bubbles') {
        tl.fromTo(d.bubblesG, { opacity: 0 }, { opacity: 1, duration: 0.8 }, T);
      }
      tl.to({}, { duration: 0.4 }); // short hold at the end
      return tl;
    }

    sections.forEach((section, i) => {
      const tl = build(stage.groups[i], Bar.COCKTAILS[i], section);
      ScrollTrigger.create({
        trigger: section,
        start: 'top 50%',
        end: 'bottom 80%',
        animation: reduced ? null : tl,
        scrub: reduced ? false : 0.6,
        onEnter: () => { activate(i); if (reduced) tl.progress(1); },
        onEnterBack: () => { activate(i); if (reduced) tl.progress(1); },
        onLeaveBack: () => { activate(Math.max(0, i - 1)); if (reduced) tl.progress(0); }
      });
    });

    activate(0);
  };
})();
