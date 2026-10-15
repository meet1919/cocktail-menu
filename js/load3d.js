(function () {
  const param = new URLSearchParams(location.search).get('3d');

  function webgl2() {
    try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
  }

  function allowed(reduced) {
    if (param === '0') return false;
    if (param === '1') return webgl2();
    if (reduced) return false;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return false;
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
    return webgl2();
  }

  // Resolves to a 3D stage, or null when the SVG glass should be used instead.
  Bar.try3D = async function (container, opts) {
    if (!allowed(opts && opts.reduced)) return null;
    let timer;
    try {
      const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('3D load timed out')), 6000); });
      const run = import('./stage3d/index.js').then(m => m.createStage3D(container, Bar.COCKTAILS));
      return await Promise.race([run, timeout]);
    } catch (err) {
      console.warn('3D stage unavailable, using the SVG glass.', err);
      const c = container.querySelector('canvas.stage3d');
      if (c) c.remove();
      const svg = document.getElementById('stage-glass');
      if (svg) svg.style.display = '';
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
})();
