(function () {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function renderDrinks() {
    document.getElementById('drinks').innerHTML = Bar.FEATURED.map((c, i) => `
      <section class="drink" data-index="${i}" id="${c.id}" style="--c:${c.color}">
        <div class="drink-inner">
          <span class="num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <div class="title-wrap"><h2>${c.name}</h2><span class="wipe" aria-hidden="true"></span></div>
          <p class="tagline">${c.tagline}</p>
          <p class="method">${c.method}</p>
          <span class="rule" aria-hidden="true"></span>
          <ul class="ingredients">
            ${c.ingredients.map((ing, j) => `
              <li data-step="${j}">${ing.amount ? `<span class="amt">${ing.amount}</span>` : ''}<span>${ing.label}</span></li>`).join('')}
          </ul>
        </div>
      </section>`).join('');
  }

  renderDrinks();
  Bar.sound.init();
  Bar.browse.init({ reduced });
  Bar.cheers.init({ reduced });

  // If the animation library could not load, still show a readable menu.
  if (!window.gsap || !window.ScrollTrigger || !Bar.createStage) {
    const pre = document.getElementById('preloader');
    if (pre) pre.remove();
    document.body.classList.remove('is-loading');
    return;
  }

  // split the headings and set their hidden start states before the preloader lifts
  Bar.type.init({ reduced });

  const container = document.querySelector('.stage');
  const stageSvg = document.getElementById('stage-glass');
  let stage = null;
  const stageReady = Bar.try3D(container, { reduced })
    .then(s => s || Bar.createStage(stageSvg, { reduced }))
    .then(s => { stage = s; Bar.stage = s; Bar.initScroll(s, { reduced }); return s; });

  Bar.runPreloader({
    target: () => (stage.kind === '3d' ? stage.glassRect() : stageSvg),
    waitFor: stageReady,
    reduced
  }).then(() => Bar.type.playIntro());
})();
