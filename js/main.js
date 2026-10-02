(function () {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function renderDrinks() {
    document.getElementById('drinks').innerHTML = Bar.COCKTAILS.map((c, i) => `
      <section class="drink" data-index="${i}" id="${c.id}">
        <div class="drink-inner">
          <h2>${c.name}</h2>
          <p class="tagline">${c.tagline}</p>
          <p class="method">${c.method}</p>
          <ul class="ingredients">
            ${c.ingredients.map((ing, j) => `
              <li data-step="${j}">${ing.amount ? `<span class="amt">${ing.amount}</span>` : ''}<span>${ing.label}</span></li>`).join('')}
          </ul>
        </div>
      </section>`).join('');
  }

  renderDrinks();

  // If the animation library could not load, still show a readable menu.
  if (!window.gsap || !window.ScrollTrigger || !Bar.createStage) {
    const pre = document.getElementById('preloader');
    if (pre) pre.remove();
    document.body.classList.remove('is-loading');
    return;
  }

  const stageSvg = document.getElementById('stage-glass');
  const stage = Bar.createStage(stageSvg, { reduced });
  Bar.initScroll(stage, { reduced });
  Bar.runPreloader({ target: stageSvg, reduced });
})();
