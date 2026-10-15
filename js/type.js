(function () {
  // Motion-graphics typography: letter reveals, liquid-filled hero word, big outlined
  // numbers, colour wipes, counting amounts and a scroll-speed marquee.
  const type = (Bar.type = { intro: null });
  let active = false;

  // Wraps every letter in a masked span so it can slide up out of nothing.
  function splitChars(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(' ').forEach((word, wi, words) => {
      const w = document.createElement('span');
      w.className = 'word';
      w.setAttribute('aria-hidden', 'true');
      [...word].forEach(ch => {
        const outer = document.createElement('span');
        outer.className = 'ch';
        const inner = document.createElement('span');
        inner.className = 'ci';
        inner.textContent = ch;
        outer.appendChild(inner);
        w.appendChild(outer);
      });
      el.appendChild(w);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return el.querySelectorAll('.ci');
  }

  function buildMarquee() {
    const track = document.getElementById('marquee');
    const one = Bar.COCKTAILS.map(c => `<span>${c.name}</span><i>✦</i>`).join('');
    track.innerHTML = one + one + one + one;
    return track;
  }

  function initMarquee() {
    const track = buildMarquee();
    let x = 0, speed = 40, dir = 1, vel = 0;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: self => { dir = self.direction || dir; vel = Math.abs(self.getVelocity()); }
    });
    gsap.ticker.add((_, dtMs) => {
      const dt = Math.min(dtMs, 100) / 1000;
      const target = 40 + Math.min(vel / 4, 900);   // px/s, faster when scrolling fast
      speed += (target - speed) * Math.min(1, dt * 6);
      vel *= 0.92;
      x -= speed * dir * dt;
      const half = track.scrollWidth / 2;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  function initHero() {
    const h1 = document.querySelector('.hero h1');
    const chars = splitChars(h1);
    h1.querySelectorAll('.word')[1].classList.add('liquid');
    const eyebrow = document.querySelector('.hero .eyebrow');
    const eyeChars = splitChars(eyebrow);
    gsap.set(chars, { yPercent: 115, rotate: 8 });
    gsap.set(eyeChars, { yPercent: 0, opacity: 0 });
    gsap.set('.hero-tag', { opacity: 0, y: 24 });
    gsap.set('.scroll-hint', { opacity: 0 });
    gsap.set('.hero-cta', { opacity: 0, y: 18 });
    gsap.set('.hero-bg', { opacity: 0, xPercent: -8 });

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } });
    tl.to('.hero-bg', { opacity: 1, xPercent: 0, duration: 1.8 }, 0)
      .to(eyeChars, { opacity: 1, duration: 0.01, stagger: 0.035, ease: 'none' }, 0.1)
      .to(chars, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.05 }, 0.25)
      .fromTo('.hero .liquid .ci', { '--f': '-10%' }, { '--f': '110%', duration: 1.5, stagger: 0.08, ease: 'power2.inOut' }, 1.0)
      .to('.hero-tag', { opacity: 1, y: 0, duration: 0.9 }, 1.1)
      .to('.hero-cta', { opacity: 1, y: 0, duration: 0.9 }, 1.4)
      .to('.scroll-hint', { opacity: 1, duration: 0.8 }, 1.7)
      .add(() => {
        // the liquid keeps gently sloshing inside the letters
        gsap.to('.hero .liquid .ci', { '--f': '82%', duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: { each: 0.15, from: 'start' } });
      });
    type.intro = tl;

    gsap.to('.hero-bg', {
      xPercent: -22, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  function initDrinks() {
    const items = [];
    const total = document.querySelectorAll('.drink').length;
    let shown = -1;

    // Only the drink that is currently in the glass shows its details.
    function show(i) {
      if (i === shown) return;
      const prev = shown;
      shown = i;
      if (prev >= 0) {
        const it = items[prev];
        gsap.to(it.inner, { opacity: 0, duration: 0.25, overwrite: true, onComplete: () => { if (shown !== prev) it.tl.pause(0); } });
      }
      if (i >= 0) {
        const it = items[i];
        gsap.killTweensOf(it.inner);
        gsap.set(it.inner, { opacity: 1 });
        it.tl.restart();
      }
    }

    document.querySelectorAll('.drink').forEach((sec, idx) => {
      const chars = splitChars(sec.querySelector('h2'));
      const tag = sec.querySelector('.tagline'), method = sec.querySelector('.method');
      const rule = sec.querySelector('.rule'), wipe = sec.querySelector('.wipe'), num = sec.querySelector('.num');
      const lis = sec.querySelectorAll('li');
      lis.forEach(li => {
        const amt = li.querySelector('.amt');
        if (amt) amt.dataset.full = amt.textContent;
      });

      const inner = sec.querySelector('.drink-inner');
      gsap.set(inner, { opacity: 0 });
      gsap.set(chars, { yPercent: 115, rotate: 6 });
      gsap.set(tag, { opacity: 0, y: 16 });
      gsap.set(method, { opacity: 0, letterSpacing: '0.6em' });
      gsap.set(rule, { scaleX: 0 });
      gsap.set(lis, { x: -30 });
      gsap.set(num, { opacity: 0, xPercent: -14 });

      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } });
      tl.fromTo(wipe, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 0.32, ease: 'power3.in' })
        .set(wipe, { transformOrigin: '100% 50%' })
        .to(wipe, { scaleX: 0, duration: 0.5, ease: 'power3.out' })
        .to(chars, { yPercent: 0, rotate: 0, duration: 0.9, stagger: 0.03 }, '<-0.25')
        .to(num, { opacity: 1, xPercent: 0, duration: 1.1 }, '<')
        .to(tag, { opacity: 1, y: 0, duration: 0.7 }, '<0.3')
        .to(method, { opacity: 1, letterSpacing: '0.2em', duration: 0.9 }, '<0.1')
        .to(rule, { scaleX: 1, duration: 0.8 }, '<')
        .to(lis, { x: 0, duration: 0.7, stagger: 0.08 }, '<0.1');

      items[idx] = { inner, tl };
      // same range as the glass, so the text and the glass always switch together
      ScrollTrigger.create({
        trigger: sec, start: 'top 50%', end: 'bottom 80%',
        onEnter: () => show(idx),
        onEnterBack: () => show(idx),
        onLeaveBack: () => show(idx - 1),
        // past the last drink the details go away, so they never show in the Cheers section
        onLeave: () => { if (idx === total - 1) show(-1); }
      });
      gsap.fromTo(num, { yPercent: 14 }, {
        yPercent: -6, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  type.init = function (opts) {
    if (opts && opts.reduced) return;       // reduced motion: leave everything static
    gsap.registerPlugin(ScrollTrigger);
    active = true;
    document.documentElement.classList.add('has-type');
    initHero();
    initDrinks();
    initMarquee();
  };

  type.playIntro = function () {
    if (active && type.intro) type.intro.play();
  };

  // An ingredient lands in the glass: its line pops and its amount counts up.
  type.lit = function (i, j, on) {
    if (!active) return;
    const li = document.querySelectorAll('.drink')[i].querySelectorAll('li')[j];
    if (!li) return;
    const amt = li.querySelector('.amt');
    if (on) {
      gsap.fromTo(li, { x: -12 }, { x: 0, duration: 0.55, ease: 'back.out(2.2)', overwrite: 'auto' });
      if (amt) {
        const m = amt.dataset.full.match(/^(\d+)(.*)$/);
        if (m) {
          const o = { v: 0 };
          if (amt._count) amt._count.kill();
          amt._count = gsap.fromTo(o, { v: 0 }, {
            v: +m[1], duration: 0.9, ease: 'power2.out',
            onUpdate: () => { amt.textContent = Math.round(o.v) + m[2]; }
          });
        }
      }
    } else if (amt) {
      if (amt._count) amt._count.kill();
      amt.textContent = amt.dataset.full;
    }
  };
})();
