(function () {
  // The footer finale: two 3D glasses clink when the footer scrolls into view.
  // The scene is built the first time it is needed, and only when the page runs in 3D.
  const cheers = (Bar.cheers = {});

  cheers.init = function (opts) {
    const reduced = !!(opts && opts.reduced);
    const footer = document.querySelector('.footer');
    const box = document.getElementById('cheers-stage');
    const again = document.getElementById('cheers-again');
    if (!footer || !box || !('IntersectionObserver' in window)) return;

    let stage = null, loading = null;

    function ensure() {
      if (stage) return Promise.resolve(stage);
      if (reduced || !window.gsap || !Bar.stage || Bar.stage.kind !== '3d') return Promise.resolve(null);
      if (!loading) {
        box.hidden = false;                   // it needs a size before the scene is built
        loading = import('./stage3d/cheers.js')
          .then(m => m.createCheers(box))
          .then(s => { stage = s; return s; })
          .catch(err => {
            console.warn('The Cheers scene is unavailable.', err);
            box.hidden = true;
            return null;
          });
      }
      return loading;
    }

    function play() {
      ensure().then(s => {
        if (!s) return;
        s.clink();
        if (again) again.hidden = false;
      });
    }

    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) play();
    }, { threshold: 0.45 }).observe(footer);

    box.addEventListener('click', play);
    if (again) again.addEventListener('click', play);
  };
})();
