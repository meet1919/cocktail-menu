(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    return n;
  }

  // Glass geometry in a 200 x 300 viewBox. top/bottom = liquid y range.
  const GLASSES = {
    highball: {
      outline: 'M60 50 L140 50 L135 272 Q134 280 126 280 L74 280 Q66 280 65 272 Z',
      inner: 'M64 54 L136 54 L131 270 L69 270 Z',
      top: 60, bottom: 270,
      shine: 'M72 62 L76 230'
    },
    rocks: {
      outline: 'M45 140 L155 140 L149 272 Q148 280 140 280 L60 280 Q52 280 51 272 Z',
      inner: 'M49 144 L151 144 L145 268 L55 268 Z',
      top: 150, bottom: 268,
      shine: 'M58 152 L61 252'
    },
    coupe: {
      outline: 'M35 100 Q100 215 165 100 Z',
      inner: 'M40 104 Q100 205 160 104 Z',
      top: 106, bottom: 158,
      extra: '<path d="M100 157 L100 262" /><ellipse cx="100" cy="266" rx="38" ry="7" />',
      shine: 'M48 112 Q62 140 84 152'
    }
  };

  // Half the inner width of a glass at height y.
  function halfWidth(type, y) {
    if (type === 'highball') return 36 - (y - 54) * 5 / 216;
    if (type === 'rocks') return 51 - (y - 144) * 6 / 124;
    const k = Math.max(0, 1 - 4 * (y - 104) / 202);
    const t = (1 - Math.sqrt(k)) / 2;
    return 60 - 120 * t;
  }

  // y for a fill fraction 0..1
  function levelY(glass, f) {
    return glass.bottom - f * (glass.bottom - glass.top);
  }

  // Mix a #rrggbb colour with white.
  function tint(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.round(c + (255 - c) * amt);
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  const LEAF = 'M0 -12 C10 -6 10 6 0 12 C-10 6 -10 -6 0 -12Z';

  // Ingredient pieces, drawn around (0,0), roughly 24px across.
  function piece(kind, color) {
    const g = el('g', { class: 'piece piece-' + kind });
    const inner = el('g');
    g.appendChild(inner);
    const add = n => inner.appendChild(n);

    if (kind === 'mint' || kind === 'basil') {
      const basil = kind === 'basil';
      if (basil) inner.setAttribute('transform', 'scale(1.3)');
      add(el('path', { d: LEAF, fill: basil ? '#3F8F3A' : '#5DBB63' }));
      add(el('path', { d: 'M0 -10 L0 10 M0 -3 L5 -7 M0 3 L-5 -1', stroke: 'rgba(0,50,0,.45)', 'stroke-width': 1, fill: 'none', 'stroke-linecap': 'round' }));
    } else if (kind === 'lemon') {
      add(el('circle', { r: 12, fill: '#F4D35E', stroke: '#FFF3B0', 'stroke-width': 2 }));
      add(el('circle', { r: 9, fill: '#F9E27A' }));
      let d = '';
      for (let a = 0; a < 6; a++) {
        const r = a * Math.PI / 3;
        d += `M0 0 L${(9 * Math.cos(r)).toFixed(2)} ${(9 * Math.sin(r)).toFixed(2)} `;
      }
      add(el('path', { d, stroke: 'rgba(255,255,255,.6)', 'stroke-width': 1.2, fill: 'none' }));
    } else if (kind === 'honey') {
      add(el('path', { d: 'M0 -12 C7 -3 10 3 5 8 C2 11 -2 11 -5 8 C-10 3 -7 -3 0 -12Z', fill: '#E8A93B', stroke: '#FFD27A', 'stroke-width': 1 }));
    } else if (kind === 'pineapple') {
      add(el('rect', { x: -10, y: -10, width: 20, height: 20, rx: 4, fill: '#F7C948' }));
      add(el('path', { d: 'M-10 -3 L10 -3 M-10 3 L10 3 M-3 -10 L-3 10 M3 -10 L3 10', stroke: '#C98F10', 'stroke-width': 1, fill: 'none' }));
    } else if (kind === 'ice') {
      add(el('rect', { x: -11, y: -11, width: 22, height: 22, rx: 5, fill: 'rgba(220,240,255,.35)', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 1.5 }));
      add(el('path', { d: 'M-6 -6 L-6 2', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 1.5, 'stroke-linecap': 'round', fill: 'none' }));
    } else {
      // splash: three drops of the drink's colour
      [[-6, 0], [6, -3], [0, 6]].forEach(p => add(el('circle', { cx: p[0], cy: p[1], r: 3.5, fill: color || '#fff' })));
    }
    return g;
  }

  window.Bar = window.Bar || {};
  Bar.svg = { el, GLASSES, halfWidth, levelY, tint, piece };
})();
