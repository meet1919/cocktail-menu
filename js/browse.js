(function () {
  // "Browse the full bar": a liquid wave rises over the page, and when it passes the
  // screen is left showing every cocktail. Closing pours the wave back down.
  const browse = (Bar.browse = {});

  let reduced = false;
  let overlay, grid, filters, detail, inner, btn, title, pourEl, front, back;
  let isOpen = false, busy = false, pending = null, detailOpen = false;
  let filter = 'All';
  let lastFocus = null, lastCard = null;

  const hasGsap = () => !!window.gsap;
  const byId = id => Bar.COCKTAILS.find(c => c.id === id);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ---------- little glass drawings ---------- */
  const SHAPES = {
    highball: { d: 'M28,18 H72 L67,138 Q66,142 62,142 H38 Q34,142 33,138 Z', level: 56, shine: 'M34,30 L37,122' },
    rocks: { d: 'M22,66 H78 L73,138 Q72,142 68,142 H32 Q28,142 27,138 Z', level: 88, shine: 'M30,76 L33,126' },
    coupe: {
      d: 'M16,28 H84 C84,66 64,84 50,84 C36,84 16,66 16,28 Z', level: 40, shine: 'M24,34 C25,52 33,66 42,74',
      extra: 'M48.5,84 H51.5 V133 H48.5Z M32,142 Q50,130 68,142 Z'
    }
  };

  function glassSVG(c, uid, cls) {
    const s = SHAPES[c.glass] || SHAPES.highball;
    const extra = s.extra ? `<path class="g-glass" d="${s.extra}"/>` : '';
    return `<svg class="${cls || ''}" viewBox="0 0 100 150" aria-hidden="true" focusable="false">
      <defs><clipPath id="cp-${uid}"><path d="${s.d}"/></clipPath></defs>
      ${extra}
      <path class="g-glass" d="${s.d}"/>
      <g clip-path="url(#cp-${uid})"><g transform="translate(0 ${s.level})">
        <path class="g-wave" fill="${c.color}" d="M-80,0 q20,-5 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 V150 H-80Z"/>
      </g></g>
      <path class="g-glass" style="fill:none" d="${s.d}"/>
      <path class="g-shine" d="${s.shine}"/>
    </svg>`;
  }

  /* ---------- cards, filters, detail ---------- */
  function cardHTML(c) {
    return `<button class="card" type="button" data-id="${c.id}" style="--c:${c.color}">
      ${c.featured ? '<span class="star">Scroll-built</span>' : ''}
      ${glassSVG(c, 'card-' + c.id, 'card-glass')}
      <span class="spirit">${esc(c.spirit)}</span>
      <span class="name">${esc(c.name)}</span>
      <span class="tag">${esc(c.tagline)}</span>
    </button>`;
  }

  function buildFilters() {
    const spirits = ['All', ...new Set(Bar.COCKTAILS.map(c => c.spirit))];
    filters.innerHTML = spirits.map(s =>
      `<button class="chip" type="button" aria-pressed="${s === filter}" data-spirit="${esc(s)}">${esc(s)}</button>`).join('') +
      `<button class="pill surprise" type="button" data-act="surprise">
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><rect x="2" y="2" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="7" r="1.3" fill="currentColor"/><circle cx="10" cy="10" r="1.3" fill="currentColor"/><circle cx="13" cy="13" r="1.3" fill="currentColor"/></svg>
        Surprise me</button>`;
  }

  /* ---------- "Surprise me": the cards flash past like a slot machine and one is picked ---------- */
  let spinning = false;

  function surprise() {
    if (spinning || detailOpen) return;
    const cards = visibleCards();
    if (!cards.length) return;
    const target = Math.floor(Math.random() * cards.length);
    const open = () => showDetail(cards[target].dataset.id, cards[target]);
    if (reduced || !hasGsap()) { open(); return; }

    const btnEl = filters.querySelector('.surprise');
    spinning = true;
    btnEl.disabled = true;
    const steps = cards.length * 2 + target + 1;      // two laps, then land on the pick
    let i = 0, prev = null;
    const end = el => {
      if (prev) prev.classList.remove('spin');
      if (el) el.classList.remove('land');
      spinning = false;
      btnEl.disabled = false;
    };
    const step = () => {
      if (overlay.hidden) { end(null); return; }        // the view was closed mid-spin
      if (prev) prev.classList.remove('spin');
      const el = cards[i % cards.length];
      el.classList.add('spin');
      el.scrollIntoView({ block: 'nearest' });
      prev = el;
      i++;
      if (Bar.sound) Bar.sound.play('tick');
      if (i < steps) {
        const k = i / steps;
        setTimeout(step, 55 + 260 * k * k * k);         // slows down as it nears the pick
      } else {
        el.classList.add('land');
        if (Bar.sound) Bar.sound.play('clink');
        setTimeout(() => {
          end(el);
          if (!overlay.hidden) open();
        }, 900);
      }
    };
    step();
  }

  const visibleCards = () => [...grid.children].filter(el => !el.hidden);

  function applyFilter(s, animate) {
    filter = s;
    filters.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.spirit === s)));
    [...grid.children].forEach(el => {
      el.hidden = !(s === 'All' || byId(el.dataset.id).spirit === s);
    });
    if (!hasGsap()) return;
    gsap.killTweensOf(grid.children);
    if (animate && !reduced) {
      gsap.fromTo(visibleCards(), { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.04, ease: 'power3.out', clearProps: 'transform,opacity' });
    } else {
      gsap.set(grid.children, { clearProps: 'transform,opacity' });
    }
  }

  /* ---------- the 3D glass in the detail sheet ---------- */
  // A small extra 3D stage builds the drink on a timer (the scroll menu does the same
  // from scroll progress). The page's SVG glass stays as the fallback.
  let mini = null, miniTween = null, miniToken = 0;
  const use3D = () => !reduced && hasGsap() && Bar.stage && Bar.stage.kind === '3d';

  function playBuild() {
    if (!mini) return;
    const d = mini.director, n = byId(detail.dataset.id).ingredients.length;
    if (miniTween) miniTween.kill();
    d.update(0, 0);                      // empties the glass and un-lights every ingredient
    const o = { p: 0 };
    miniTween = gsap.to(o, { p: 1, duration: (n + 1.6) * 1.05, delay: 0.6, ease: 'none', onUpdate: () => d.update(0, o.p) });
  }

  async function mount3D(c, token) {
    const box = detail.querySelector('.dt-3d');
    if (!box) return;
    box.hidden = false;
    let stage = null;
    try {
      const m = await import('./stage3d/index.js');
      stage = await m.createStage3D(box, [c], { embedded: true });
    } catch (err) {
      console.warn('3D glass unavailable in the detail sheet, keeping the flat glass.', err);
      box.hidden = true;
      box.replaceChildren();
      return;
    }
    if (token !== miniToken) { stage.dispose(); return; }   // the sheet was closed or changed meanwhile
    mini = stage;
    detail.querySelector('.dt').classList.add('is-3d');
    detail.querySelectorAll('[data-3d]').forEach(el => { el.hidden = false; });
    mini.director.onIngredient = (i, j, on) => {
      const li = detail.querySelectorAll('.dt-list li')[j];
      if (li) li.classList.toggle('lit', on);
      if (on && Bar.sound) Bar.sound.ingredient(c.ingredients[j].piece);
    };
    gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    playBuild();
  }

  function unmount3D() {
    miniToken++;
    if (miniTween) { miniTween.kill(); miniTween = null; }
    if (mini) { mini.dispose(); mini = null; }
  }

  // the page's own 3D stage sits behind the overlay, so it stops rendering meanwhile
  function pauseMain(on) {
    const s = Bar.stage;
    if (s && s.kind === '3d' && s.scene && s.scene.setPaused) s.scene.setPaused(on);
  }

  function showDetail(id, card) {
    const c = byId(id);
    if (!c) return;
    lastCard = card || null;
    unmount3D();
    const token = miniToken;
    const three = use3D();
    detail.innerHTML = `<article class="dt" style="--c:${c.color}">
      <div class="dt-art"><div class="dt-3d" hidden></div>${glassSVG(c, 'dt-' + c.id)}<p class="dt-hint" data-3d hidden>Drag the glass to spin it</p></div>
      <div>
        <p class="spirit">${esc(c.spirit)}</p>
        <h3 id="dt-title" tabindex="-1">${esc(c.name)}</h3>
        <p class="tag">${esc(c.tagline)}</p>
        <p class="method">${esc(c.method)}</p>
        <ul class="dt-list">${c.ingredients.map(i =>
          `<li>${i.amount ? `<span class="amt">${esc(i.amount)}</span>` : ''}<span>${esc(i.label)}</span></li>`).join('')}</ul>
        <div class="dt-actions">
          <button class="pill" type="button" data-act="back">← All cocktails</button>
          <button class="pill" type="button" data-act="replay" data-3d hidden>↻ Replay</button>
          ${c.featured ? '<button class="pill solid" type="button" data-act="watch">Watch it being made ↓</button>' : ''}
        </div>
      </div>
    </article>`;
    detail.dataset.id = id;
    detail.hidden = false;
    detailOpen = true;
    inner.inert = true;
    if (hasGsap() && !reduced) {
      gsap.fromTo(detail, { opacity: 0 }, { opacity: 1, duration: 0.3, overwrite: 'auto' });
      if (!three) {
        gsap.fromTo(detail.querySelector('.dt-art svg'), { y: 60, rotate: -8, opacity: 0 },
          { y: 0, rotate: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.5)' });
      }
      // with the 3D glass the rows are lit by the build itself, so only the flat glass slides them in
      if (!three) {
        gsap.fromTo(detail.querySelectorAll('.dt-list li'), { x: -24, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, stagger: 0.07, delay: 0.2, ease: 'power3.out' });
      }
    }
    detail.querySelector('#dt-title').focus({ preventScroll: true });
    if (three) mount3D(c, token);
  }

  function hideDetail() {
    if (!detailOpen) return;
    unmount3D();
    detailOpen = false;
    detail.hidden = true;
    inner.inert = false;
    if (hasGsap()) gsap.killTweensOf(detail);
    if (lastCard && lastCard.isConnected && !lastCard.hidden) lastCard.focus({ preventScroll: true });
  }

  /* ---------- the glass tips over as the wave starts ---------- */
  function tilt(on) {
    const s = Bar.stage;
    if (!s) return;
    if (s.kind === '3d') {
      if (s.director && s.director.tilt) s.director.tilt(on);
    } else if (hasGsap()) {
      gsap.to('#stage-glass', {
        rotation: on ? -28 : 0, transformOrigin: '50% 100%',
        duration: on ? 0.8 : 0.6, ease: on ? 'power2.inOut' : 'back.out(1.4)', overwrite: 'auto'
      });
    }
  }

  /* ---------- the wave: one path with two wavy edges ---------- */
  const w = { a: 0, b: 0 };                 // a = top edge, b = bottom edge (0 = below the screen, 1 = above it)
  const Y = p => 112 - p * 136;
  function band(pa, pb, t, k) {
    const N = 20;
    let d = '';
    for (let i = 0; i <= N; i++) {
      const x = i * (100 / N);
      d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + (Y(pa) + k * 4.5 * Math.sin(x * 0.094 + t)).toFixed(2);
    }
    for (let i = N; i >= 0; i--) {
      const x = i * (100 / N);
      d += 'L' + x.toFixed(1) + ',' + (Y(pb) + k * 4.5 * Math.sin(x * 0.113 + t * 1.3 + 1.7)).toFixed(2);
    }
    return d + 'Z';
  }
  function draw() {
    const t = performance.now() / 320;
    front.setAttribute('d', band(w.a, w.b, t, 1));
    back.setAttribute('d', band(Math.min(1.04, w.a + 0.05), Math.max(0, w.b - 0.05), t + 1.2, 1.15));
  }
  function waveOn(a, b) {
    w.a = a; w.b = b;
    pourEl.classList.add('on');
    draw();
    gsap.ticker.add(draw);
  }
  function waveOff() {
    gsap.ticker.remove(draw);
    pourEl.classList.remove('on');
  }

  /* ---------- open / close ---------- */
  function showOverlay(animated) {
    overlay.hidden = false;
    overlay.scrollTop = 0;
    document.body.classList.add('is-browsing');
    document.querySelector('.menu').inert = true;
    document.querySelector('.footer').inert = true;
    if (animated) gsap.set(visibleCards(), { y: 50, opacity: 0 });
    title.focus({ preventScroll: true });
    pauseMain(true);
  }

  function hideOverlay() {
    hideDetail();
    pauseMain(false);
    overlay.hidden = true;
    document.body.classList.remove('is-browsing');
    document.querySelector('.menu').inert = false;
    document.querySelector('.footer').inert = false;
  }

  // jump to a featured drink's scroll-built section (done while the wave covers the screen)
  function jump(id) {
    const sec = document.getElementById(id);
    if (!sec) return;
    window.scrollTo(0, sec.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.45);
  }

  function finish(open) {
    busy = false;
    isOpen = open;
    if (open) {
      btn.setAttribute('aria-expanded', 'true');
    } else {
      btn.setAttribute('aria-expanded', 'false');
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    }
    const p = pending;
    pending = null;
    if (!p) return;
    if (p.action === 'open' && !isOpen) browse.open();
    else if (p.action === 'close' && isOpen) browse.close(p.jumpId);
  }

  browse.open = function () {
    if (busy) { pending = { action: 'open' }; return; }
    if (isOpen) return;
    busy = true;
    lastFocus = document.activeElement;
    tilt(true);
    if (!hasGsap() || reduced) {
      showOverlay(false);
      if (hasGsap()) gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      finish(true);
      return;
    }
    waveOn(0, 0);
    if (Bar.sound) Bar.sound.play('whoosh', true);
    gsap.timeline({ onComplete: () => { waveOff(); finish(true); } })
      .to(w, { a: 1, duration: 0.95, ease: 'power2.in' }, 0.25)
      .add(() => showOverlay(true))
      .to(w, { b: 1, duration: 1.0, ease: 'power2.out' }, '+=0.05')
      .to(visibleCards(), { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' }, '<0.3');
  };

  browse.close = function (jumpId) {
    if (busy) { pending = { action: 'close', jumpId }; return; }
    if (!isOpen) return;
    busy = true;
    const done = () => { hideOverlay(); if (jumpId) jump(jumpId); tilt(false); };
    if (!hasGsap() || reduced) {
      done();
      finish(false);
      return;
    }
    waveOn(1, 1);
    if (Bar.sound) Bar.sound.play('whoosh', false);
    gsap.timeline({ onComplete: () => { waveOff(); finish(false); } })
      .to(w, { b: 0, duration: 0.75, ease: 'power2.in' })
      .add(done)
      .to(w, { a: 0, duration: 0.85, ease: 'power2.out' }, '+=0.05');
  };

  /* ---------- wiring ---------- */
  browse.init = function (opts) {
    reduced = !!(opts && opts.reduced);
    overlay = document.getElementById('browse');
    if (!overlay) return;
    grid = document.getElementById('browse-grid');
    filters = document.getElementById('browse-filters');
    detail = document.getElementById('browse-detail');
    inner = overlay.querySelector('.browse-inner');
    btn = document.getElementById('browse-open');
    title = document.getElementById('browse-title');
    pourEl = document.getElementById('pour');
    front = document.getElementById('pour-front');
    back = document.getElementById('pour-back');

    document.getElementById('browse-count').textContent = Bar.COCKTAILS.length;
    grid.innerHTML = Bar.COCKTAILS.map(cardHTML).join('');
    buildFilters();
    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', () => browse.open());
    document.getElementById('browse-close').addEventListener('click', () => browse.close());
    filters.addEventListener('click', e => {
      if (e.target.closest('[data-act="surprise"]')) { surprise(); return; }
      const chip = e.target.closest('.chip');
      if (chip && chip.dataset.spirit !== filter && !spinning) {
        if (Bar.sound) Bar.sound.play('tick');
        applyFilter(chip.dataset.spirit, true);
      }
    });
    grid.addEventListener('click', e => {
      const card = e.target.closest('.card');
      if (card && !spinning) {
        if (Bar.sound) Bar.sound.play('tick');
        showDetail(card.dataset.id, card);
      }
    });
    detail.addEventListener('click', e => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'back') hideDetail();
      else if (act.dataset.act === 'replay') playBuild();
      else if (act.dataset.act === 'watch') browse.close(detail.dataset.id);
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || (!isOpen && !busy)) return;
      if (detailOpen) hideDetail();
      else browse.close();
    });
  };
})();
